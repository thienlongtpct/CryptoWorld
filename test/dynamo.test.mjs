import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDynamoStore } from '../server/dynamo-store.mjs';

/** Enough of the document client to exercise the conditions the store relies on. */
function memoryTable() {
  const items = new Map();
  const keyOf = item => `${item.pk}\0${item.sk}`;
  return {
    async send(command) {
      const input = command.input;
      switch (command.constructor.name) {
        case 'GetCommand': {
          const item = items.get(keyOf(input.Key));
          return { Item: item && structuredClone(item) };
        }
        case 'PutCommand':
          items.set(keyOf(input.Item), structuredClone(input.Item));
          return {};
        case 'DeleteCommand':
          items.delete(keyOf(input.Key));
          return {};
        case 'QueryCommand': {
          const pk = input.ExpressionAttributeValues[':pk'];
          const prefix = input.ExpressionAttributeValues[':prefix'];
          const found = [...items.values()].filter(item => item.pk === pk && String(item.sk).startsWith(prefix));
          return { Items: found.map(item => structuredClone(item)) };
        }
        case 'TransactWriteCommand': {
          for (const entry of input.TransactItems) {
            if (entry.Put?.ConditionExpression && items.has(keyOf(entry.Put.Item))) {
              const err = new Error('cancelled');
              err.name = 'TransactionCanceledException';
              err.CancellationReasons = [{ Code: 'ConditionalCheckFailed' }];
              throw err;
            }
          }
          for (const entry of input.TransactItems) {
            items.set(keyOf(entry.Put.Item), structuredClone(entry.Put.Item));
          }
          return {};
        }
        case 'UpdateCommand': {
          const existing = items.get(keyOf(input.Key));
          const values = input.ExpressionAttributeValues || {};
          if (values[':done'] !== undefined && existing?.status === values[':done']) {
            const err = new Error('condition');
            err.name = 'ConditionalCheckFailedException';
            throw err;
          }
          if (input.UpdateExpression?.includes('ADD #count')) {
            const next = {
              ...existing,
              ...input.Key,
              count: (existing?.count ?? 0) + (values[':one'] ?? 1),
              userId: values[':userId'] ?? existing?.userId,
              day: values[':day'] ?? existing?.day,
            };
            items.set(keyOf(next), next);
            return { Attributes: { count: next.count } };
          }
          const next = {
            ...existing,
            ...input.Key,
            itemId: values[':itemId'],
            status: values[':status'],
            at: values[':at'],
            userId: values[':userId'],
          };
          items.set(keyOf(next), next);
          return {};
        }
        default:
          throw new Error(`unexpected ${command.constructor.name}`);
      }
    },
  };
}

function storeAt(now, client = memoryTable()) {
  return createDynamoStore('accounts', { client, now: () => now.t, sessionMs: 1000 });
}

const user = {
  id: 'u1',
  username: 'Ada',
  passHash: 'ab',
  salt: 'cd',
  createdAt: '2026-11-14T00:00:00.000Z',
};

test('Dynamo registration keeps the username unique and the session readable', async () => {
  const client = memoryTable();
  const now = { t: Date.parse('2026-11-14T12:00:00Z') };
  const store = storeAt(now, client);
  const created = await store.registerUser(user);
  assert.equal(created.username, 'Ada');
  assert.equal(await store.registerUser({ ...user, id: 'u2' }), null);
  assert.equal((await store.userByName('ada')).id, 'u1');
  assert.equal((await store.sessionUser(created.token)).username, 'Ada');
  now.t += 1000;
  assert.equal(await store.sessionUser(created.token), null);
});

test('Dynamo progress stays finished, and logout removes the session', async () => {
  const now = { t: Date.parse('2026-11-14T12:00:00Z') };
  const store = storeAt(now);
  const created = await store.registerUser(user);
  const seen = await store.saveProgress('u1', 'mod', 'seen');
  now.t += 500;
  const done = await store.saveProgress('u1', 'mod', 'done');
  const stuck = await store.saveProgress('u1', 'mod', 'seen');
  assert.equal(seen.status, 'seen');
  assert.equal(done.status, 'done');
  assert.equal(stuck.status, 'done');
  assert.equal(stuck.at, done.at);
  const rows = await store.progressFor('u1');
  assert.deepEqual(rows.map(row => row.status), ['done']);
  await store.revokeSession(created.token);
  assert.equal(await store.sessionUser(created.token), null);
});

test('Dynamo stores skills evidence separately from progress', async () => {
  const now = { t: Date.parse('2026-11-14T12:00:00Z') };
  const store = storeAt(now);
  await store.registerUser(user);
  const row = await store.appendEvidence({
    id: 'ev_1',
    userId: 'u1',
    taskId: 'vd-assess-1',
    version: 1,
    at: new Date(now.t).toISOString(),
    type: 'assessment',
    assistance: 'unknown',
    result: { passed: true, correctCount: 3, total: 3 },
  });
  assert.equal(row.taskId, 'vd-assess-1');
  const listed = await store.evidenceFor('u1');
  assert.equal(listed.length, 1);
  assert.equal(listed[0].type, 'assessment');
  assert.deepEqual(await store.progressFor('u1'), []);
});

test('Dynamo lists a learner’s unexpired research jobs newest first', async () => {
  const now = { t: Date.parse('2026-11-15T12:00:00Z') };
  const store = storeAt(now);
  const base = { userId: 'u1', status: 'completed', resources: [] };
  await store.saveResearchJob({ ...base, id: 'a', fingerprint: 'fa', updatedAt: '2026-11-15T10:00:00.000Z', expiresAt: now.t + 1000 });
  await store.saveResearchJob({ ...base, id: 'b', fingerprint: 'fb', updatedAt: '2026-11-15T11:00:00.000Z', expiresAt: now.t + 1000 });
  await store.saveResearchJob({ ...base, id: 'c', fingerprint: 'fc', updatedAt: '2026-11-15T11:30:00.000Z', expiresAt: now.t - 1 });
  await store.saveResearchJob({ ...base, id: 'd', fingerprint: 'fd', userId: 'u2', updatedAt: '2026-11-15T11:00:00.000Z', expiresAt: now.t + 1000 });
  assert.deepEqual((await store.researchJobsFor('u1')).map(job => job.id), ['b', 'a']);
  assert.deepEqual(await store.researchJobsFor('nobody'), []);
});
