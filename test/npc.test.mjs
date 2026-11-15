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

test('Gemini gets a low thinking level, and a cut-off answer is reported instead of shown', async () => {
  const { answerNpc } = await import('../server/npc.mjs');
  const body = { characterId: 'peggy', regionId: 'sanctuary', mode: 'explain', scenario: 'passive', question: 'What does zero knowledge hide?' };
  const realFetch = globalThis.fetch;
  let sent;
  const reply = (finishReason, parts) => async (_url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ candidates: [{ finishReason, content: { parts } }] }), { status: 200 });
  };
  try {
    globalThis.fetch = reply('MAX_TOKENS', [{ text: ' view? Yes. own: null' }]);
    const cut = await answerNpc({ gemini: 'test-key', model: 'test-model', body });
    assert.equal(cut.status, 502);
    assert.match(cut.body.error, /cut off/);
    assert.equal(sent.generationConfig.thinkingConfig.thinkingLevel, 'low');
    assert.match(sent.systemInstruction.parts[0].text, /at most three short sentences/);

    globalThis.fetch = reply('STOP', [{ text: 'private notes', thought: true }, { text: 'A private input stays with its owner.' }]);
    const ok = await answerNpc({ gemini: 'test-key', model: 'test-model', body });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.answer, 'A private input stays with its owner.');
  } finally {
    globalThis.fetch = realFetch;
  }
});
