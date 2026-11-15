// Abuse limits and isolation: sign-up, login and tutor rate limits, the client address behind
// CloudFront, and the local lab runner's empty environment.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { clientIp } from '../server/lambda.mjs';
import { createLocalLabRunner } from '../server/lab-worker.mjs';
import { createMemoryStore } from '../server/store.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = loadAllowed(root);

function handlerWithClock() {
  let at = Date.parse('2026-11-15T12:00:00Z');
  const handle = createHandler({ store: createMemoryStore(), allowed, now: () => at });
  const post = (path, body, { ip = '203.0.113.7', cookie = '' } = {}) => handle({
    method: 'POST',
    path,
    headers: cookie ? { cookie } : {},
    body: Buffer.from(JSON.stringify(body)),
    ip,
  });
  return { post, tick: ms => { at += ms; } };
}

test('one address can register at most 5 accounts a minute', async () => {
  const { post, tick } = handlerWithClock();
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await post('/api/register', { username: `learner_${i}`, password: 'long-enough-1' })).status, 201);
  }
  const blocked = await post('/api/register', { username: 'learner_5', password: 'long-enough-1' });
  assert.equal(blocked.status, 429);
  assert.equal((await post('/api/register', { username: 'other_0', password: 'long-enough-1' }, { ip: '198.51.100.9' })).status, 201);
  tick(61_000);
  assert.equal((await post('/api/register', { username: 'learner_5', password: 'long-enough-1' })).status, 201);
});

test('password guessing is slowed per account name, even across addresses', async () => {
  const { post } = handlerWithClock();
  assert.equal((await post('/api/register', { username: 'ada', password: 'correct-horse-1' })).status, 201);
  for (let i = 0; i < 8; i += 1) {
    const res = await post('/api/login', { username: 'ada', password: `wrong-guess-${i}` }, { ip: `192.0.2.${i}` });
    assert.equal(res.status, 401);
  }
  // Case does not open a second bucket.
  const blocked = await post('/api/login', { username: 'ADA', password: 'correct-horse-1' }, { ip: '192.0.2.200' });
  assert.equal(blocked.status, 429);
});

test('a signed-in learner can ask the tutors 10 questions a minute', async () => {
  const { post, tick } = handlerWithClock();
  const reg = await post('/api/register', { username: 'grace', password: 'long-enough-1' });
  const cookie = String(reg.headers['set-cookie']).split(';')[0];
  const ask = () => post('/api/npc', { characterId: 'eve', regionId: 'bridge', mode: 'explain', question: 'Why?' }, { cookie });
  for (let i = 0; i < 10; i += 1) assert.notEqual((await ask()).status, 429);
  assert.equal((await ask()).status, 429);
  tick(61_000);
  assert.notEqual((await ask()).status, 429);
});

test('behind CloudFront the viewer address is used, not the edge or a forged entry', () => {
  const event = (xff, sourceIp) => ({ headers: { 'x-forwarded-for': xff }, requestContext: { http: { sourceIp } } });
  // Client forged 1.2.3.4; CloudFront appended the viewer; API Gateway appended the edge.
  assert.equal(clientIp(event('1.2.3.4, 203.0.113.7, 130.176.0.1', '130.176.0.1')), '203.0.113.7');
  assert.equal(clientIp(event('203.0.113.7', '130.176.0.1')), '203.0.113.7');
  assert.equal(clientIp({ headers: {}, requestContext: { http: { sourceIp: '198.51.100.2' } } }), '198.51.100.2');
});

const hasPython = spawnSync('python3', ['--version']).status === 0;

test('the local lab runner does not hand server secrets to learner code', { skip: !hasPython && 'python3 not installed' }, async () => {
  process.env.CW_TEST_SECRET = 'do-not-leak';
  try {
    const result = await createLocalLabRunner().run('import os\nprint(sorted(os.environ))\n');
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(result.stdout.includes('CW_TEST_SECRET'), false);
    assert.equal(result.stdout.includes('GEMINI_API_KEY'), false);
    assert.equal(result.stdout.includes('PATH'), true);
  } finally {
    delete process.env.CW_TEST_SECRET;
  }
});
