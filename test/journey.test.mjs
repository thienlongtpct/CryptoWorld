/**
 * End-to-end Verify-a-download journey with a local account and fake providers.
 * Live TinyFish / Maritime / Gemini are not called.
 */
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { createMemoryStore } from '../server/store.mjs';
import { createLocalLabRunner } from '../server/lab-worker.mjs';
import { SEAL_LAB_TEMPLATE } from '../server/lab-template.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = loadAllowed(root);
const password = 'journey-horse-9';

function sidOf(setCookie = '') {
  return /(?:^|;\s*)sid=([^;]*)/.exec(setCookie)?.[1] ?? '';
}

function fakeTinyFish() {
  return {
    configured: true,
    async startAutomation() {
      return { ok: true, runId: 'run_fake_1', configured: true };
    },
    async getRun() {
      return {
        ok: true,
        data: {
          status: 'COMPLETED',
          result: {
            resources: [{
              title: 'FIPS 180-4',
              publisher: 'NIST',
              url: 'https://example.test/fips180-4',
              summary: 'SHA-256 digest definition for learning.',
              excerpt: 'A message digest is a fixed-length result.',
            }],
          },
        },
      };
    },
  };
}

async function call(handle, { method = 'GET', path = '/', cookie = '', body } = {}) {
  const result = await handle({
    method,
    path,
    headers: cookie ? { cookie: `sid=${cookie}` } : {},
    body: body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body)),
  });
  return { ...result, sid: sidOf(result.headers['set-cookie'] || '') };
}

test('fake-provider journey: research → lab → seal grade → skills record', async () => {
  const store = createMemoryStore();
  const handle = createHandler({
    store,
    allowed,
    tinyfish: fakeTinyFish(),
    maritime: { configured: false },
    labRunner: createLocalLabRunner({
      spawnImpl: () => {
        // Lab worker path uses runner.run directly for local kind — spawn unused when we override below.
        throw new Error('spawn unused');
      },
    }),
  });

  // Override with a deterministic local runner via a second handler that injects run().
  const handleJourney = createHandler({
    store,
    allowed,
    tinyfish: fakeTinyFish(),
    maritime: { configured: false },
    labRunner: {
      kind: 'local',
      async run() {
        return {
          stdout: 'same_seal FLEA\nPASS\n',
          stderr: '',
          exitCode: 0,
          timedOut: false,
          error: '',
        };
      },
    },
  });

  const guestSkills = await call(handleJourney, { path: '/api/skills' });
  assert.equal(guestSkills.status, 401);

  const reg = await call(handleJourney, {
    method: 'POST',
    path: '/api/register',
    body: { username: 'journey_ada', password },
  });
  assert.equal(reg.status, 201);
  const sid = reg.sid;

  // 1) TinyFish research (fake) on hash
  const research = await call(handleJourney, {
    method: 'POST',
    path: '/api/research',
    cookie: sid,
    body: {
      topicId: 'hash',
      goal: 'Explain what SHA-256 guarantees when checking a published software digest.',
    },
  });
  assert.equal(research.status, 202);
  assert.equal(research.body.cacheHit, false);

  const polled = await call(handleJourney, {
    path: `/api/research/${encodeURIComponent(research.body.id)}`,
    cookie: sid,
  });
  assert.equal(polled.status, 200);
  assert.equal(polled.body.status, 'completed');
  assert.ok(polled.body.resources?.length >= 1);

  // Cached research clearly marked
  const cached = await call(handleJourney, {
    method: 'POST',
    path: '/api/research',
    cookie: sid,
    body: {
      topicId: 'hash',
      goal: 'Explain what SHA-256 guarantees when checking a published software digest.',
    },
  });
  assert.equal(cached.body.cacheHit, true);

  // 2) Mark hash visualization as viewed (not assessed)
  const seen = await call(handleJourney, {
    method: 'PUT',
    path: '/api/progress',
    cookie: sid,
    body: { itemId: 'hash', status: 'seen' },
  });
  assert.equal(seen.status, 200);

  // 3) Maritime/local lab — PASS stdout must not assess the gate
  const lab = await call(handleJourney, {
    method: 'POST',
    path: '/api/lab-runs',
    cookie: sid,
    body: { challengeId: 'seal', code: SEAL_LAB_TEMPLATE.replace('CANDIDATE = ""', 'CANDIDATE = "FLEA"') },
  });
  assert.equal(lab.status, 202);
  assert.equal(lab.body.executor, 'local');

  let labDone = lab;
  for (let i = 0; i < 20; i += 1) {
    labDone = await call(handleJourney, {
      path: `/api/lab-runs/${encodeURIComponent(lab.body.id)}`,
      cookie: sid,
    });
    if (labDone.body.status === 'completed' || labDone.body.status === 'failed') break;
    await new Promise(r => setTimeout(r, 20));
  }
  assert.equal(labDone.body.status, 'completed');
  assert.match(labDone.body.stdout, /same_seal|PASS/);

  // 4) Server-checked seal (Gemini not involved)
  const npcMissing = await call(handleJourney, {
    method: 'POST',
    path: '/api/npc',
    cookie: sid,
    body: {
      characterId: 'faythe',
      regionId: 'grove',
      mode: 'explain',
      scenario: 'passive',
      question: 'What should I try first?',
      challengeId: 'seal',
    },
  });
  assert.equal(npcMissing.status, 503);
  assert.match(npcMissing.body.error, /Gemini/i);

  const grade = await call(handleJourney, {
    method: 'POST',
    path: '/api/dungeon/submit',
    cookie: sid,
    body: { challengeId: 'seal', answer: 'FLEA' },
  });
  assert.equal(grade.status, 200);
  assert.equal(grade.body.correct, true);

  // 5) Workplace assessment + skills record
  const workplace = await call(handleJourney, {
    method: 'POST',
    path: '/api/assessments',
    cookie: sid,
    body: {
      taskId: 'vd-workplace',
      version: 1,
      answers: { w1: 'integrity', w2: 'channel', w3: 'weak-seal' },
    },
  });
  assert.equal(workplace.body.passed, true);

  const skills = await call(handleJourney, { path: '/api/skills', cookie: sid });
  assert.equal(skills.status, 200);
  assert.match(skills.body.disclaimer, /not a professional certification/i);
  const byId = Object.fromEntries(skills.body.skills.map(s => [s.id, s]));
  assert.equal(byId['vd-research-hash'].status, 'practiced');
  assert.equal(byId['vd-toy-seal-lab'].status, 'practiced');
  assert.equal(byId['vd-collision-gate'].status, 'assessed');
  assert.equal(byId['vd-verify-download'].status, 'assessed');
  assert.ok(byId['vd-hash-visualization'].status === 'viewed' || byId['vd-hash-visualization'].status === 'practiced');
  assert.ok(skills.body.evidence.some(ev => ev.type === 'research'));
  assert.ok(skills.body.evidence.some(ev => ev.type === 'lab'));
  assert.ok(skills.body.evidence.some(ev => ev.type === 'graded' && ev.result?.correct === true));

  // Unused first handle kept for clarity that gemini-less config is fine
  assert.ok(handle);
});
