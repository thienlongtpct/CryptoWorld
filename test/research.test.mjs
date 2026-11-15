import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { createMemoryStore } from '../server/store.mjs';
import { createDynamoStore } from '../server/dynamo-store.mjs';
import {
  RESEARCH_DAILY_LIMIT,
  RESEARCH_TTL_MS,
  validateResources,
} from '../server/research.mjs';
import { resolveSubject } from '../server/research-catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = loadAllowed(root);
const password = 'correct-horse';

function sidOf(setCookie = '') {
  return /(?:^|;\s*)sid=([^;]*)/.exec(setCookie)?.[1] ?? '';
}

/** Fake TinyFish provider for automated tests — no live network. */
function fakeTinyFish(options = {}) {
  const runs = new Map();
  let seq = 0;
  return {
    configured: options.configured !== false,
    startCalls: [],
    getCalls: [],
    async startAutomation(body) {
      this.startCalls.push(body);
      if (options.failStart) {
        return {
          ok: false,
          status: options.failStart.status || 502,
          configured: true,
          error: options.failStart.error || 'provider down',
          rateLimited: options.failStart.status === 429,
        };
      }
      seq += 1;
      const runId = `run_${seq}`;
      runs.set(runId, {
        status: options.initialStatus || 'PENDING',
        result: options.result ?? null,
        error: null,
      });
      if (typeof options.afterStart === 'function') options.afterStart(runs.get(runId), runId);
      return { ok: true, status: 200, configured: true, runId, data: { run_id: runId, error: null } };
    },
    async getRun(runId) {
      this.getCalls.push(runId);
      if (options.failGet) {
        return {
          ok: false,
          status: options.failGet.status || 502,
          configured: true,
          error: options.failGet.error || 'poll failed',
          rateLimited: options.failGet.status === 429,
        };
      }
      const run = runs.get(runId);
      if (!run) return { ok: false, status: 404, configured: true, error: 'missing run' };
      if (typeof options.onGet === 'function') options.onGet(run, runId);
      return {
        ok: true,
        status: 200,
        configured: true,
        data: {
          run_id: runId,
          status: run.status,
          result: run.result,
          error: run.error,
        },
      };
    },
    _runs: runs,
  };
}

function dynamoMemory() {
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

async function register(store, tinyfish, username = 'ada', now) {
  const handle = createHandler({ store, allowed, tinyfish, now });
  const created = await handle({
    method: 'POST',
    path: '/api/register',
    headers: {},
    body: Buffer.from(JSON.stringify({ username, password })),
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return { handle, sid: sidOf(created.headers['set-cookie']), store, tinyfish };
}

test('catalog resolves hashing topics and papers with starting URLs', () => {
  const hash = resolveSubject({ topicId: 'hash' });
  assert.equal(hash.ok, true);
  assert.ok(hash.subject.startingUrls.length >= 2);
  assert.ok(hash.subject.startingUrls.every(s => /^https:\/\//.test(s.url)));
  assert.ok(hash.subject.relatedVisualizations.includes('hash'));
  assert.equal(resolveSubject({ paperId: 'pagh01' }).ok, true);
  assert.equal(resolveSubject({ topicId: 'psi' }).ok, false);
});

test('resource validation keeps only well-formed http cards', () => {
  const ok = validateResources({
    resources: [
      {
        title: 'Secure Hash Standard',
        publisher: 'NIST',
        url: 'https://csrc.nist.gov/publications/detail/fips/180-4/final',
        summary: 'Defines SHA-2 family hashes.',
        excerpt: 'This Standard specifies secure hash algorithms.',
      },
      { title: 'Bad', publisher: 'X', url: 'not-a-url', summary: 's', excerpt: 'e' },
    ],
  }, { relatedVisualizations: ['hash'], retrievedAt: '2026-11-15T00:00:00.000Z' });
  assert.equal(ok.ok, true);
  assert.equal(ok.resources.length, 1);
  assert.equal(ok.resources[0].verified, false);
  assert.equal(ok.resources[0].relatedVisualizations[0], 'hash');
});

test('guests cannot start research; missing TinyFish is a clear 503', async () => {
  const store = createMemoryStore();
  const off = createHandler({ store, allowed, tinyfish: fakeTinyFish({ configured: false }) });
  const guest = await off({
    method: 'POST',
    path: '/api/research',
    headers: {},
    body: Buffer.from(JSON.stringify({ topicId: 'hash', goal: 'Learn SHA-256 avalanche' })),
  });
  assert.equal(guest.status, 401);

  const { handle, sid } = await register(store, fakeTinyFish({ configured: false }));
  const missing = await handle({
    method: 'POST',
    path: '/api/research',
    headers: { cookie: `sid=${sid}` },
    body: Buffer.from(JSON.stringify({ topicId: 'hash', goal: 'Learn SHA-256 avalanche' })),
  });
  assert.equal(missing.status, 503);
  assert.equal(missing.body.configured, false);
});

test('POST /api/research returns 202 with a job id and polls TinyFish only on GET', async () => {
  const tinyfish = fakeTinyFish({
    result: {
      resources: [{
        title: 'FIPS 180-4',
        publisher: 'NIST',
        url: 'https://csrc.nist.gov/publications/detail/fips/180-4/final',
        summary: 'Specifies SHA-224 through SHA-512.',
        excerpt: 'This Standard specifies secure hash algorithms, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512.',
      }],
    },
  });
  const { handle, sid } = await register(createMemoryStore(), tinyfish);
  const started = await handle({
    method: 'POST',
    path: '/api/research',
    headers: { cookie: `sid=${sid}` },
    body: Buffer.from(JSON.stringify({ topicId: 'hash', goal: 'Understand collision resistance' })),
  });
  assert.equal(started.status, 202, JSON.stringify(started.body));
  assert.match(started.body.id, /^rj_/);
  assert.equal(started.body.status, 'queued');
  assert.equal(started.body.bibliography.length >= 1, true);
  assert.equal(started.body.provenance.note.includes('not independently verified'), true);
  assert.equal(tinyfish.startCalls.length, 1);
  assert.equal(tinyfish.startCalls[0].url.includes('nist.gov'), true);
  assert.ok(tinyfish.startCalls[0].outputSchema);
  assert.equal(tinyfish.getCalls.length, 0);

  tinyfish._runs.get('run_1').status = 'COMPLETED';
  const done = await handle({
    method: 'GET',
    path: `/api/research/${started.body.id}`,
    headers: { cookie: `sid=${sid}` },
    body: Buffer.alloc(0),
  });
  assert.equal(done.status, 200);
  assert.equal(done.body.status, 'completed');
  assert.equal(done.body.resources.length, 1);
  assert.equal(done.body.resources[0].verified, false);
  assert.ok(done.body.resources[0].retrievedAt);
  assert.ok(done.body.bibliography.some(row => row.paperId === 'pagh01' || row.paperId === 'psz14'));
  assert.equal(tinyfish.getCalls.length, 1);
});

test('research jobs enforce ownership, duplicates, expiry, and durable limits', async () => {
  const now = { t: Date.parse('2026-11-15T12:00:00Z') };
  const store = createMemoryStore({ now: () => now.t });
  const tinyfish = fakeTinyFish({
    initialStatus: 'RUNNING',
    result: {
      resources: [{
        title: 'RFC 6234',
        publisher: 'IETF',
        url: 'https://www.rfc-editor.org/rfc/rfc6234',
        summary: 'Documents SHA and HMAC constructions.',
        excerpt: 'The purpose of this document is to make source code performing these functions conveniently available.',
      }],
    },
  });
  const clock = () => now.t;
  const a = await register(store, tinyfish, 'alice', clock);
  const b = await register(store, tinyfish, 'bob', clock);

  const first = await a.handle({
    method: 'POST',
    path: '/api/research',
    headers: { cookie: `sid=${a.sid}` },
    body: Buffer.from(JSON.stringify({ topicId: 'hash', goal: 'Compare SHA-2 digests' })),
  });
  assert.equal(first.status, 202);

  const dup = await a.handle({
    method: 'POST',
    path: '/api/research',
    headers: { cookie: `sid=${a.sid}` },
    body: Buffer.from(JSON.stringify({ topicId: 'hash', goal: 'Compare SHA-2 digests' })),
  });
  assert.equal(dup.status, 202);
  assert.equal(dup.body.id, first.body.id);
  assert.equal(dup.body.cacheHit, true);
  assert.equal(tinyfish.startCalls.length, 1);

  const stolen = await b.handle({
    method: 'GET',
    path: `/api/research/${first.body.id}`,
    headers: { cookie: `sid=${b.sid}` },
    body: Buffer.alloc(0),
  });
  assert.equal(stolen.status, 404);

  tinyfish._runs.get('run_1').status = 'COMPLETED';
  const completed = await a.handle({
    method: 'GET',
    path: `/api/research/${first.body.id}`,
    headers: { cookie: `sid=${a.sid}` },
    body: Buffer.alloc(0),
  });
  assert.equal(completed.body.status, 'completed');

  now.t += RESEARCH_TTL_MS + 1;
  const expired = await a.handle({
    method: 'GET',
    path: `/api/research/${first.body.id}`,
    headers: { cookie: `sid=${a.sid}` },
    body: Buffer.alloc(0),
  });
  assert.equal(expired.status, 410);
  assert.equal(expired.body.status, 'expired');

  // Durable daily limit after many distinct goals.
  now.t = Date.parse('2026-11-16T12:00:00Z');
  for (let i = 0; i < RESEARCH_DAILY_LIMIT; i += 1) {
    const res = await a.handle({
      method: 'POST',
      path: '/api/research',
      headers: { cookie: `sid=${a.sid}` },
      body: Buffer.from(JSON.stringify({ topicId: 'hash', goal: `Goal number ${i} about hashing` })),
    });
    assert.equal(res.status, 202, JSON.stringify(res.body));
  }
  const limited = await a.handle({
    method: 'POST',
    path: '/api/research',
    headers: { cookie: `sid=${a.sid}` },
    body: Buffer.from(JSON.stringify({ topicId: 'hash', goal: 'One more hashing goal' })),
  });
  assert.equal(limited.status, 429);
});

test('malformed TinyFish output and provider failures become failed jobs', async () => {
  const tinyfish = fakeTinyFish({
    result: { resources: [{ title: 'Nope', url: 'ftp://bad' }] },
  });
  const { handle, sid } = await register(createMemoryStore(), tinyfish, 'cara');
  const started = await handle({
    method: 'POST',
    path: '/api/research',
    headers: { cookie: `sid=${sid}` },
    body: Buffer.from(JSON.stringify({ paperId: 'pagh01', goal: 'Learn cuckoo hashing' })),
  });
  tinyfish._runs.get('run_1').status = 'COMPLETED';
  const bad = await handle({
    method: 'GET',
    path: `/api/research/${started.body.id}`,
    headers: { cookie: `sid=${sid}` },
    body: Buffer.alloc(0),
  });
  assert.equal(bad.body.status, 'failed');
  assert.match(bad.body.error, /usable resource/i);

  const failing = fakeTinyFish({ failStart: { status: 429, error: 'slow down' } });
  const again = await register(createMemoryStore(), failing, 'dana');
  const rate = await again.handle({
    method: 'POST',
    path: '/api/research',
    headers: { cookie: `sid=${again.sid}` },
    body: Buffer.from(JSON.stringify({ topicId: 'cuckoo', goal: 'See eviction chains' })),
  });
  assert.equal(rate.status, 429);
});

test('Dynamo store keeps research jobs, fingerprints, and usage', async () => {
  const now = { t: Date.parse('2026-11-15T12:00:00Z') };
  const store = createDynamoStore('accounts', { client: dynamoMemory(), now: () => now.t });
  await store.registerUser({
    id: 'u1',
    username: 'Ada',
    passHash: 'ab',
    salt: 'cd',
    createdAt: '2026-11-14T00:00:00.000Z',
  });
  const job = {
    id: 'rj_test',
    userId: 'u1',
    subjectId: 'hash',
    subjectKind: 'topic',
    subjectTitle: 'Hash Functions',
    goal: 'Learn digests',
    fingerprint: 'fp1',
    status: 'queued',
    providerRunId: 'run_x',
    startingUrl: 'https://example.com',
    bibliography: [],
    resources: [],
    error: '',
    createdAt: new Date(now.t).toISOString(),
    updatedAt: new Date(now.t).toISOString(),
    expiresAt: now.t + 60_000,
  };
  await store.saveResearchJob(job);
  assert.equal((await store.getResearchJob('rj_test')).providerRunId, 'run_x');
  assert.equal((await store.findResearchJobByFingerprint('u1', 'fp1', now.t)).id, 'rj_test');
  assert.equal(await store.researchUsageFor('u1', '2026-11-15'), 0);
  assert.equal(await store.incrementResearchUsage('u1', '2026-11-15'), 1);
  assert.equal(await store.incrementResearchUsage('u1', '2026-11-15'), 2);
  assert.equal(await store.researchUsageFor('u1', '2026-11-15'), 2);
});
