import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { createMemoryStore } from '../server/store.mjs';

const allowed = loadAllowed();

function sidOf(setCookie = '') {
  return /(?:^|;\s*)sid=([^;]*)/.exec(setCookie)?.[1] ?? '';
}

async function call(store, { method = 'GET', path = '/', cookie = '', body, gemini = '' } = {}) {
  const handle = createHandler({ store, allowed, gemini });
  const result = await handle({
    method,
    path,
    headers: cookie ? { cookie: `sid=${cookie}` } : {},
    body: body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body)),
  });
  return { ...result, sid: sidOf(result.headers['set-cookie'] || '') };
}

test('a guest cannot ask Gemini', async () => {
  const result = await call(createMemoryStore(), {
    method: 'POST',
    path: '/api/npc',
    body: { characterId: 'alice', regionId: 'plaza', mode: 'explain', question: 'Hello' },
    gemini: 'test-key',
  });
  assert.equal(result.status, 401);
  assert.match(result.body.error, /Log in/);
});

test('a signed-in learner gets a clear configuration state when Gemini is unset', async () => {
  const store = createMemoryStore();
  const created = await call(store, {
    method: 'POST',
    path: '/api/register',
    body: { username: 'ada', password: 'correct-horse' },
  });
  const result = await call(store, {
    method: 'POST',
    path: '/api/npc',
    cookie: created.sid,
    body: { characterId: 'alice', regionId: 'bridge', mode: 'role', question: 'What can you know?' },
  });
  assert.equal(result.status, 503);
  assert.equal(result.body.configured, false);
  assert.match(result.body.error, /GEMINI_API_KEY/);
  assert.equal(JSON.stringify(result.body).includes('321'), false);
  assert.equal(JSON.stringify(result.body).includes('123'), false);
});

test('Mallory is refused until the attack simulation is selected', async () => {
  const store = createMemoryStore();
  const created = await call(store, {
    method: 'POST',
    path: '/api/register',
    body: { username: 'bea', password: 'correct-horse' },
  });
  const result = await call(store, {
    method: 'POST',
    path: '/api/npc',
    cookie: created.sid,
    gemini: 'test-key',
    body: { characterId: 'mallory', regionId: 'bridge', mode: 'explain', question: 'Change the message' },
  });
  assert.equal(result.status, 400);
  assert.match(result.body.error, /attack simulation/);
});
