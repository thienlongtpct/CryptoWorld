// One behaviour suite for every account store. The memory store always runs. The TigerData
// (Postgres) store runs when TEST_TIGER_DATABASE_URL points at a database you can wipe:
//   TEST_TIGER_DATABASE_URL=postgres://localhost:5432/cryptoworld_test npm test
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import { createMemoryStore } from '../server/store.mjs';
import { createHandler } from '../server/app.mjs';
import { summarizeActivity } from '../server/activity.mjs';

const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);

function user(id, username) {
  return { id, username, passHash: 'h', salt: 's', createdAt: new Date(T0).toISOString() };
}

const TIGER_URL = (process.env.TEST_TIGER_DATABASE_URL || '').trim();

async function pgFactory() {
  const pg = (await import('pg')).default;
  const { createPgStore } = await import('../server/pg-store.mjs');
  const admin = new pg.Pool({ connectionString: TIGER_URL, max: 1 });
  const stores = [];
  after(async () => {
    await Promise.all(stores.map(store => store.close()));
    await admin.end();
  });
  return async options => {
    await admin.query(`DROP VIEW IF EXISTS activity_daily;
      DROP TABLE IF EXISTS evidence, usage, lab_jobs, research_jobs, progress, sessions, users CASCADE`);
    const store = createPgStore({ connectionString: TIGER_URL, ...options });
    stores.push(store);
    await store.ready();
    return store;
  };
}

const FACTORIES = [['memory', async () => options => createMemoryStore(options)]];
if (TIGER_URL) FACTORIES.push(['tigerdata', pgFactory]);

for (const [name, makeFactory] of FACTORIES) {
  describe(`${name} store`, async () => {
    const make = await makeFactory();
    let clock = T0;
    const now = () => clock;

    test('register, find, sessions, and duplicate names in any case', async () => {
      const store = await make({ now, sessionMs: 1000 });
      const made = await store.registerUser(user('u1', 'Ada'));
      assert.equal(made.username, 'Ada');
      assert.equal(await store.registerUser(user('u2', 'ada')), null);
      assert.deepEqual(await store.sessionUser(made.token), { id: 'u1', username: 'Ada' });
      assert.equal((await store.userByName('ADA')).passHash, 'h');
      assert.equal(await store.userByName('nobody'), null);
      const second = await store.createSession('u1');
      await store.revokeSession(made.token);
      assert.equal(await store.sessionUser(made.token), null);
      assert.equal((await store.sessionUser(second)).id, 'u1');
      clock = T0 + 5000;
      assert.equal(await store.sessionUser(second), null);
      clock = T0;
      assert.equal(await store.sessionUser(''), null);
    });

    test('progress is per user and never undoes done', async () => {
      const store = await make({ now });
      await store.registerUser(user('u1', 'ada'));
      assert.equal(await store.saveProgress('ghost', 'x', 'done'), null);
      assert.equal((await store.saveProgress('u1', 'a', 'started')).status, 'started');
      assert.equal((await store.saveProgress('u1', 'a', 'done')).status, 'done');
      assert.equal((await store.saveProgress('u1', 'a', 'started')).status, 'done');
      const rows = await store.progressFor('u1');
      assert.deepEqual(rows.map(r => [r.itemId, r.status]), [['a', 'done']]);
      assert.equal(rows[0].at, new Date(T0).toISOString());
      assert.deepEqual(await store.progressFor('u2'), []);
    });

    test('research and lab jobs: upsert, get, fingerprint, active count', async () => {
      const store = await make({ now });
      const job = { id: 'r1', userId: 'u1', fingerprint: 'fp', expiresAt: T0 + 10, updatedAt: '2026-11-15T12:00:00.000Z', status: 'running', nested: { a: [1, 2] } };
      await store.saveResearchJob(job);
      await store.saveResearchJob({ ...job, status: 'done', updatedAt: '2026-11-15T12:00:01.000Z' });
      await store.saveResearchJob({ ...job, id: 'r0', updatedAt: '2026-11-15T11:00:00.000Z' });
      assert.deepEqual(await store.getResearchJob('r1'), { ...job, status: 'done', updatedAt: '2026-11-15T12:00:01.000Z' });
      assert.equal(await store.getResearchJob('missing'), null);
      assert.equal((await store.findResearchJobByFingerprint('u1', 'fp', T0)).id, 'r1');
      assert.equal(await store.findResearchJobByFingerprint('u1', 'fp', T0 + 10), null);
      assert.equal(await store.findResearchJobByFingerprint('u2', 'fp', T0), null);
      assert.deepEqual((await store.researchJobsFor('u1', T0)).map(j => j.id), ['r1', 'r0']);
      assert.deepEqual(await store.researchJobsFor('u1', T0 + 10), []);
      assert.deepEqual(await store.researchJobsFor('u2', T0), []);

      await store.saveLabJob({ id: 'l1', userId: 'u1', fingerprint: 'f', expiresAt: T0 + 10, updatedAt: 'a', status: 'queued' });
      await store.saveLabJob({ id: 'l2', userId: 'u1', fingerprint: 'g', expiresAt: T0 + 10, updatedAt: 'b', status: 'running' });
      await store.saveLabJob({ id: 'l3', userId: 'u1', fingerprint: 'h', expiresAt: T0 + 10, updatedAt: 'c', status: 'done' });
      await store.saveLabJob({ id: 'l4', userId: 'u1', fingerprint: 'i', expiresAt: T0 - 1, updatedAt: 'd', status: 'queued' });
      assert.equal(await store.countActiveLabJobs('u1', T0), 2);
      assert.equal((await store.getLabJob('l2')).status, 'running');
      assert.equal((await store.findLabJobByFingerprint('u1', 'f', T0)).id, 'l1');
    });

    test('daily usage counters', async () => {
      const store = await make({ now });
      assert.equal(await store.researchUsageFor('u1', '2026-11-15'), 0);
      assert.equal(await store.incrementResearchUsage('u1', '2026-11-15'), 1);
      assert.equal(await store.incrementResearchUsage('u1', '2026-11-15'), 2);
      assert.equal(await store.researchUsageFor('u1', '2026-11-15'), 2);
      assert.equal(await store.labUsageFor('u1', '2026-11-15'), 0);
      assert.equal(await store.incrementLabUsage('u1', '2026-11-15'), 1);
      assert.equal(await store.researchUsageFor('u1', '2026-11-16'), 0);
    });

    test('concurrent usage increments do not lose counts', async () => {
      const store = await make({ now });
      const results = await Promise.all(Array.from({ length: 6 }, () => store.incrementLabUsage('u1', 'd')));
      assert.deepEqual([...results].sort(), [1, 2, 3, 4, 5, 6]);
    });

    test('evidence appends only for real users and keeps order', async () => {
      const store = await make({ now });
      await store.registerUser(user('u1', 'ada'));
      const row = { id: 'ev1', userId: 'u1', taskId: 't', version: 1, at: '2026-11-14T10:00:00.000Z', type: 'graded', result: { correct: true }, assistance: 'none' };
      assert.deepEqual(await store.appendEvidence(row), row);
      await store.appendEvidence({ ...row, id: 'ev2', at: '2026-11-15T09:00:00.000Z', type: 'lab', result: null });
      assert.equal(await store.appendEvidence({ ...row, id: 'ev3', userId: 'ghost' }), null);
      const rows = await store.evidenceFor('u1');
      assert.deepEqual(rows.map(r => r.id), ['ev1', 'ev2']);
      assert.deepEqual(rows[0], row);
      assert.equal(rows[1].result, null);
    });

    if (name === 'tigerdata') {
      test('activity_daily groups evidence by UTC day and type', async () => {
        const store = await make({ now });
        await store.registerUser(user('u1', 'ada'));
        const base = { userId: 'u1', taskId: 't', version: 1, result: null, assistance: 'none' };
        await store.appendEvidence({ ...base, id: 'a', at: '2026-11-15T00:30:00.000Z', type: 'graded' });
        await store.appendEvidence({ ...base, id: 'b', at: '2026-11-15T23:30:00.000Z', type: 'graded' });
        await store.appendEvidence({ ...base, id: 'c', at: '2026-11-14T08:00:00.000Z', type: 'lab' });
        await store.appendEvidence({ ...base, id: 'd', at: '2026-09-01T08:00:00.000Z', type: 'lab' });
        const rows = await store.activityFor('u1', { days: 30, at: T0 });
        assert.deepEqual(rows, [
          { day: '2026-11-14', type: 'lab', count: 1 },
          { day: '2026-11-15', type: 'graded', count: 2 },
        ]);
      });
    }
  });
}

test('summarizeActivity fills the window and counts a streak back from today or yesterday', () => {
  const rows = [
    { day: '2026-11-13', type: 'graded', count: 1 },
    { day: '2026-11-14', type: 'lab', count: 2 },
    { day: '2026-11-14', type: 'graded', count: 1 },
    { day: '2026-11-10', type: 'lab', count: 1 },
  ];
  const out = summarizeActivity(rows, { days: 7, at: T0 });
  assert.equal(out.days.length, 7);
  assert.equal(out.days[0].day, '2026-11-09');
  assert.equal(out.days[6].day, '2026-11-15');
  assert.deepEqual(out.days[5], { day: '2026-11-14', total: 3, byType: { lab: 2, graded: 1 } });
  assert.equal(out.streak, 2);
  assert.equal(out.total, 5);
  assert.equal(out.activeDays, 3);
  assert.equal(summarizeActivity([], { days: 3, at: T0 }).streak, 0);
  assert.equal(summarizeActivity([{ day: '2026-11-15', type: 'lab', count: 1 }], { days: 3, at: T0 }).streak, 1);
});

test('GET /api/activity needs a session and reports disabled on non-TigerData stores', async () => {
  const store = createMemoryStore();
  const handle = createHandler({ store, allowed: new Set() });
  const anon = await handle({ method: 'GET', path: '/api/activity', headers: {}, body: Buffer.alloc(0) });
  assert.equal(anon.status, 401);
  const { token } = await store.registerUser(user('u1', 'ada'));
  const res = await handle({ method: 'GET', path: '/api/activity', headers: { cookie: `sid=${token}` }, body: Buffer.alloc(0) });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { enabled: false, days: [], streak: 0, total: 0, activeDays: 0 });
});

test('GET /api/activity summarizes a store that has activityFor', async () => {
  const base = createMemoryStore();
  const store = { ...base, kind: 'tigerdata', activityFor: async () => [{ day: '2026-11-15', type: 'graded', count: 2 }] };
  const handle = createHandler({ store, allowed: new Set(), now: () => T0 });
  const { token } = await base.registerUser(user('u1', 'ada'));
  const res = await handle({ method: 'GET', path: '/api/activity', headers: { cookie: `sid=${token}` }, body: Buffer.alloc(0) });
  assert.equal(res.status, 200);
  assert.equal(res.body.enabled, true);
  assert.equal(res.body.days.length, 30);
  assert.equal(res.body.streak, 1);
  const health = await handle({ method: 'GET', path: '/api/health', headers: {}, body: Buffer.alloc(0) });
  assert.equal(health.body.tigerdata, true);
});
