import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { createMemoryStore } from '../server/store.mjs';
import { processLabJob, createLocalLabRunner } from '../server/lab-worker.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = loadAllowed(root);
const password = 'correct-horse';

function sidOf(setCookie = '') {
  return /(?:^|;\s*)sid=([^;]*)/.exec(setCookie)?.[1] ?? '';
}

async function call(store, { method = 'GET', path = '/', cookie = '', body, extras = {} } = {}) {
  const handle = createHandler({
    store,
    allowed,
    labRunner: createLocalLabRunner({
      spawnImpl: () => {
        throw new Error('unused');
      },
    }),
    ...extras,
  });
  const result = await handle({
    method,
    path,
    headers: cookie ? { cookie: `sid=${cookie}` } : {},
    body: body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body)),
  });
  return { ...result, sid: sidOf(result.headers['set-cookie'] || '') };
}

async function register(store, username = 'ada') {
  const result = await call(store, {
    method: 'POST',
    path: '/api/register',
    body: { username, password },
  });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result;
}

test('GET /api/skills requires login and returns a learning-record disclaimer', async () => {
  const store = createMemoryStore();
  const guest = await call(store, { path: '/api/skills' });
  assert.equal(guest.status, 401);
  const created = await register(store);
  const skills = await call(store, { path: '/api/skills', cookie: created.sid });
  assert.equal(skills.status, 200);
  assert.match(skills.body.disclaimer, /not a professional certification/i);
  assert.equal(skills.body.path?.id, 'verify-download');
  assert.ok(skills.body.skills.some(row => row.id === 'vd-verify-download'));
  assert.ok(skills.body.assessments.some(row => row.taskId === 'vd-assess-1'));
  assert.equal(skills.body.assessments[0].items[0].answer, undefined);
});

test('assessment answers stay on the server and create assessed evidence when passed', async () => {
  const store = createMemoryStore();
  const created = await register(store, 'bea');
  const form = await call(store, { path: '/api/assessments/vd-assess-1', cookie: created.sid });
  assert.equal(form.status, 200);
  assert.equal(form.body.items.length, 3);
  assert.equal(form.body.items[0].answer, undefined);

  const wrong = await call(store, {
    method: 'POST',
    path: '/api/assessments',
    cookie: created.sid,
    body: { taskId: 'vd-assess-1', version: 1, answers: { a1: 'false', a2: 'match', a3: 'hard' } },
  });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.body.passed, false);
  assert.equal(wrong.body.correctCount, 2);

  const right = await call(store, {
    method: 'POST',
    path: '/api/assessments',
    cookie: created.sid,
    body: { taskId: 'vd-assess-1', version: 1, answers: { a1: 'true', a2: 'match', a3: 'hard' } },
  });
  assert.equal(right.body.passed, true);

  const skills = await call(store, { path: '/api/skills', cookie: created.sid });
  const basics = skills.body.skills.find(row => row.id === 'vd-hash-basics');
  assert.equal(basics.status, 'assessed');
  assert.equal(basics.evidence.some(ev => ev.type === 'assessment' && ev.result?.passed === true), true);
});

test('PUT /api/progress cannot forge assessed skills for the seal gate or workplace task', async () => {
  const store = createMemoryStore();
  const created = await register(store, 'cia');

  const forgeSeal = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: created.sid,
    body: { itemId: 'dungeon-seal', status: 'done' },
  });
  assert.equal(forgeSeal.status, 400);

  const forgeAssess = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: created.sid,
    body: { itemId: 'vd-workplace', status: 'done' },
  });
  assert.equal(forgeAssess.status, 400);

  const forgeCtf = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: created.sid,
    body: { itemId: 'ctf-verify-download', status: 'done' },
  });
  assert.equal(forgeCtf.status, 400);

  const markHash = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: created.sid,
    body: { itemId: 'hash', status: 'done' },
  });
  assert.equal(markHash.status, 200);

  const skills = await call(store, { path: '/api/skills', cookie: created.sid });
  const collision = skills.body.skills.find(row => row.id === 'vd-collision-gate');
  const workplace = skills.body.skills.find(row => row.id === 'vd-verify-download');
  const viz = skills.body.skills.find(row => row.id === 'vd-hash-visualization');
  assert.equal(collision.status, 'none');
  assert.equal(workplace.status, 'none');
  assert.ok(viz.status === 'viewed' || viz.status === 'practiced');
  assert.notEqual(viz.status, 'assessed');
});

test('graded seal success assesses the collision skill; walkthrough marks assistance', async () => {
  const store = createMemoryStore();
  const created = await register(store, 'dee');

  const walk = await call(store, {
    method: 'POST',
    path: '/api/dungeon/walkthrough',
    cookie: created.sid,
    body: { challengeId: 'seal' },
  });
  assert.equal(walk.status, 200);

  const wrong = await call(store, {
    method: 'POST',
    path: '/api/dungeon/submit',
    cookie: created.sid,
    body: { challengeId: 'seal', answer: 'LEAF' },
  });
  assert.equal(wrong.body.correct, false);

  const ok = await call(store, {
    method: 'POST',
    path: '/api/dungeon/submit',
    cookie: created.sid,
    body: { challengeId: 'seal', answer: 'FLEA' },
  });
  assert.equal(ok.body.correct, true);

  const skills = await call(store, { path: '/api/skills', cookie: created.sid });
  const collision = skills.body.skills.find(row => row.id === 'vd-collision-gate');
  assert.equal(collision.status, 'assessed');
  assert.equal(collision.assistance, 'walkthrough');
  assert.ok(skills.body.evidence.some(ev => ev.type === 'graded' && ev.taskId === 'seal'));
  assert.ok(skills.body.evidence.some(ev => ev.type === 'walkthrough' && ev.taskId === 'seal'));
});

test('lab completion is practiced evidence only, even with PASS-like stdout', async () => {
  const store = createMemoryStore();
  const created = await register(store, 'eve');
  const me = await call(store, { path: '/api/me', cookie: created.sid });
  const userId = (await store.userByName('eve')).id;

  const job = {
    id: 'lab_test_pass',
    userId,
    challengeId: 'seal',
    fingerprint: 'abc',
    code: 'print("PASS")\n',
    status: 'queued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: Date.now() + 60_000,
    stdout: '',
    stderr: '',
    exitCode: null,
    timedOut: false,
    error: '',
  };
  await store.saveLabJob(job);
  await processLabJob({
    store,
    maritime: { configured: false },
    runner: {
      kind: 'local',
      async run() {
        return { stdout: 'PASS\nsame_seal FLEA\n', stderr: '', exitCode: 0, timedOut: false, error: '' };
      },
    },
    jobId: job.id,
  });

  const skills = await call(store, { path: '/api/skills', cookie: created.sid });
  const lab = skills.body.skills.find(row => row.id === 'vd-toy-seal-lab');
  const collision = skills.body.skills.find(row => row.id === 'vd-collision-gate');
  assert.equal(lab.status, 'practiced');
  assert.notEqual(collision.status, 'assessed');
  assert.ok(skills.body.evidence.some(ev => ev.type === 'lab' && ev.result?.ok === true));
  assert.equal(me.body.user.username, 'eve');
});

test('workplace assessment is distinct from the initial check', async () => {
  const store = createMemoryStore();
  const created = await register(store, 'fay');
  const a = await call(store, { path: '/api/assessments/vd-assess-1', cookie: created.sid });
  const b = await call(store, { path: '/api/assessments/vd-workplace', cookie: created.sid });
  assert.notDeepEqual(a.body.items.map(i => i.prompt), b.body.items.map(i => i.prompt));
  const graded = await call(store, {
    method: 'POST',
    path: '/api/assessments',
    cookie: created.sid,
    body: {
      taskId: 'vd-workplace',
      version: 1,
      answers: { w1: 'integrity', w2: 'channel', w3: 'weak-seal' },
    },
  });
  assert.equal(graded.body.passed, true);
  const skills = await call(store, { path: '/api/skills', cookie: created.sid });
  assert.equal(skills.body.skills.find(row => row.id === 'vd-verify-download').status, 'assessed');
});

test('practical path steps are not markable progress ids except shared topics', async () => {
  const set = loadAllowed(root);
  assert.equal(set.has('hash'), true);
  assert.equal(set.has('vd-assess-1'), false);
  assert.equal(set.has('vd-lab'), false);
  assert.equal(set.has('vd-research'), false);
  assert.equal(set.has('vd-workplace'), false);
  assert.equal(set.has('seal'), false);
  assert.equal(set.has('ctf-verify-download'), false);
  assert.equal(set.has('ctf-foundations'), true);
});
