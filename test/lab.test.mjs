import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { createMemoryStore } from '../server/store.mjs';
import { createInlineLabQueue } from '../server/lab-queue.mjs';
import { createLocalLabRunner, processLabJob } from '../server/lab-worker.mjs';
import { SEAL_LAB_TEMPLATE } from '../server/lab-template.mjs';
import { grade } from '../server/dungeon.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = loadAllowed(root);
const password = 'correct-horse';

function sidOf(setCookie = '') {
  return /(?:^|;\s*)sid=([^;]*)/.exec(setCookie)?.[1] ?? '';
}

function fakeMaritime(options = {}) {
  const boxes = new Map();
  let seq = 0;
  return {
    configured: options.configured !== false,
    createCalls: [],
    writeCalls: [],
    runCalls: [],
    killCalls: [],
    async createEphemeral(body) {
      this.createCalls.push(body);
      if (options.failCreate) {
        return { ok: false, status: 502, configured: true, error: options.failCreate };
      }
      seq += 1;
      const id = `sbx_${seq}`;
      const box = {
        id,
        dataPlaneUrl: `https://plane.example/${id}/v1`,
        secret: `secret-${id}`,
        state: 'running',
      };
      boxes.set(id, box);
      return { ok: true, status: 201, configured: true, data: box };
    },
    async writeFile({ path, content }) {
      this.writeCalls.push({ path, content });
      if (options.failWrite) return { ok: false, status: 500, configured: true, error: 'write failed' };
      return { ok: true, status: 200, configured: true, data: { ok: true } };
    },
    async runCommand({ cmd }) {
      this.runCalls.push(cmd);
      if (options.timeout) {
        return { ok: false, status: 504, configured: true, error: 'Maritime data plane did not answer in time.' };
      }
      if (options.syntaxError) {
        return {
          ok: true,
          status: 200,
          configured: true,
          data: { exitCode: 1, stdout: '', stderr: 'SyntaxError: invalid syntax' },
        };
      }
      const out = options.stdout || 'target LEAF seal 24\ncandidate flea seal 24\nsame_seal flea\n';
      return {
        ok: true,
        status: 200,
        configured: true,
        data: { exitCode: 0, stdout: out, stderr: options.stderr || '' },
      };
    },
    async killEphemeral(id) {
      this.killCalls.push(id);
      if (options.failCleanup) return { ok: false, status: 500, configured: true, error: 'cleanup failed' };
      boxes.delete(id);
      return { ok: true, status: 200, configured: true, data: {} };
    },
  };
}

async function register(store, extras = {}, username = 'ada') {
  const maritime = extras.maritime || fakeMaritime();
  const runner = extras.runner || null;
  const processJob = jobId => processLabJob({
    store,
    maritime,
    runner,
    jobId,
  });
  const labQueue = extras.queue || createInlineLabQueue({ processJob });
  const handle = createHandler({
    store,
    allowed,
    maritime,
    labQueue,
    labRunner: runner,
    now: extras.now,
  });
  const created = await handle({
    method: 'POST',
    path: '/api/register',
    headers: {},
    body: Buffer.from(JSON.stringify({ username, password })),
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return { handle, sid: sidOf(created.headers['set-cookie']), maritime, store };
}

async function waitFor(handle, sid, jobId, pred, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    const res = await handle({
      method: 'GET',
      path: `/api/lab-runs/${jobId}`,
      headers: { cookie: `sid=${sid}` },
      body: Buffer.alloc(0),
    });
    if (pred(res)) return res;
    await new Promise(r => setTimeout(r, 25));
  }
  throw new Error('lab run did not settle');
}

test('lab success returns bounded stdout and never grades the seal gate', async () => {
  const maritime = fakeMaritime();
  const { handle, sid } = await register(createMemoryStore(), { maritime });
  const started = await handle({
    method: 'POST',
    path: '/api/lab-runs',
    headers: { cookie: `sid=${sid}` },
    body: Buffer.from(JSON.stringify({ challengeId: 'seal', code: SEAL_LAB_TEMPLATE.replace('CANDIDATE = "LEAF"', 'CANDIDATE = "flea"') })),
  });
  assert.equal(started.status, 202, JSON.stringify(started.body));
  assert.match(started.body.id, /^lab_/);
  assert.equal(JSON.stringify(started.body).includes('secret-'), false);

  const done = await waitFor(handle, sid, started.body.id, res => res.body.status === 'completed' || res.body.status === 'failed');
  assert.equal(done.body.status, 'completed');
  assert.match(done.body.stdout, /same_seal/);
  assert.equal(done.body.note.includes('does not authenticate'), true);
  assert.equal(maritime.killCalls.length >= 1, true);
  assert.equal(maritime.runCalls.every(cmd => cmd === 'python3 /tmp/learner.py' || cmd.includes('LAB_CODE_B64')), true);
  // Grading stays on dungeon.mjs — lab output alone is not enough.
  assert.equal(grade('seal', 'PASS').correct, false);
  assert.equal(grade('seal', 'flea').correct, true);
});

test('syntax errors surface on stderr; timeouts fail; cleanup still runs', async () => {
  const bad = fakeMaritime({ syntaxError: true });
  const a = await register(createMemoryStore(), { maritime: bad }, 'bea');
  const started = await a.handle({
    method: 'POST',
    path: '/api/lab-runs',
    headers: { cookie: `sid=${a.sid}` },
    body: Buffer.from(JSON.stringify({ challengeId: 'seal', code: 'def (\n' })),
  });
  const failed = await waitFor(a.handle, a.sid, started.body.id, res => res.body.status === 'failed' || res.body.status === 'completed');
  assert.equal(failed.body.status, 'completed');
  assert.equal(failed.body.exitCode, 1);
  assert.match(failed.body.stderr, /SyntaxError/);
  assert.equal(bad.killCalls.length >= 1, true);

  const slow = fakeMaritime({ timeout: true });
  const b = await register(createMemoryStore(), { maritime: slow }, 'cara');
  const timed = await b.handle({
    method: 'POST',
    path: '/api/lab-runs',
    headers: { cookie: `sid=${b.sid}` },
    body: Buffer.from(JSON.stringify({ challengeId: 'seal', code: SEAL_LAB_TEMPLATE })),
  });
  const timedOut = await waitFor(b.handle, b.sid, timed.body.id, res => res.body.status === 'failed');
  assert.equal(timedOut.body.timedOut, true);
  assert.equal(slow.killCalls.length >= 1, true);
});

test('duplicate code reuses the job; other users cannot read it', async () => {
  const maritime = fakeMaritime();
  const store = createMemoryStore();
  const a = await register(store, { maritime }, 'dana');
  const code = `${SEAL_LAB_TEMPLATE}\n# marker\n`;
  const first = await a.handle({
    method: 'POST',
    path: '/api/lab-runs',
    headers: { cookie: `sid=${a.sid}` },
    body: Buffer.from(JSON.stringify({ challengeId: 'seal', code })),
  });
  await waitFor(a.handle, a.sid, first.body.id, res => res.body.status === 'completed');
  const dup = await a.handle({
    method: 'POST',
    path: '/api/lab-runs',
    headers: { cookie: `sid=${a.sid}` },
    body: Buffer.from(JSON.stringify({ challengeId: 'seal', code })),
  });
  assert.equal(dup.status, 202);
  assert.equal(dup.body.id, first.body.id);
  assert.equal(dup.body.cacheHit, true);
  assert.equal(maritime.createCalls.length, 1);

  const b = await register(store, { maritime }, 'erin');
  const stolen = await b.handle({
    method: 'GET',
    path: `/api/lab-runs/${first.body.id}`,
    headers: { cookie: `sid=${b.sid}` },
    body: Buffer.alloc(0),
  });
  assert.equal(stolen.status, 404);
});

test('cleanup failures are reported without leaking sandbox secrets', async () => {
  const maritime = fakeMaritime({ failCleanup: true });
  const { handle, sid } = await register(createMemoryStore(), { maritime }, 'fay');
  const started = await handle({
    method: 'POST',
    path: '/api/lab-runs',
    headers: { cookie: `sid=${sid}` },
    body: Buffer.from(JSON.stringify({ challengeId: 'seal', code: SEAL_LAB_TEMPLATE })),
  });
  const done = await waitFor(handle, sid, started.body.id, res => res.body.status === 'completed');
  assert.match(done.body.cleanupError || '', /cleanup/i);
  assert.equal(JSON.stringify(done.body).includes('secret-'), false);
  assert.equal(JSON.stringify(done.body).includes('dataPlane'), false);
});

test('local executor path runs python without Maritime', async () => {
  const runner = createLocalLabRunner();
  // Skip if python3 missing on the machine.
  const probe = await runner.run('print("ok")');
  if (probe.error && /python3 is not available/.test(probe.error)) {
    return;
  }
  const maritime = fakeMaritime({ configured: false });
  const { handle, sid } = await register(createMemoryStore(), { maritime, runner }, 'gus');
  const started = await handle({
    method: 'POST',
    path: '/api/lab-runs',
    headers: { cookie: `sid=${sid}` },
    body: Buffer.from(JSON.stringify({
      challengeId: 'seal',
      code: 'print("target LEAF seal 24")\nprint("same_seal flea")\n',
    })),
  });
  assert.equal(started.status, 202);
  const done = await waitFor(handle, sid, started.body.id, res => res.body.status === 'completed' || res.body.status === 'failed');
  assert.equal(done.body.status, 'completed');
  assert.match(done.body.stdout, /same_seal/);
  assert.equal(maritime.createCalls.length, 0);
});

test('missing Maritime without local executor is a clear 503', async () => {
  const maritime = fakeMaritime({ configured: false });
  const store = createMemoryStore();
  const handle = createHandler({ store, allowed, maritime, labQueue: createInlineLabQueue({ processJob: async () => {} }) });
  const created = await handle({
    method: 'POST',
    path: '/api/register',
    headers: {},
    body: Buffer.from(JSON.stringify({ username: 'helen', password })),
  });
  const sid = sidOf(created.headers['set-cookie']);
  const res = await handle({
    method: 'POST',
    path: '/api/lab-runs',
    headers: { cookie: `sid=${sid}` },
    body: Buffer.from(JSON.stringify({ challengeId: 'seal', code: SEAL_LAB_TEMPLATE })),
  });
  assert.equal(res.status, 503);
  assert.equal(res.body.configured, false);
});
