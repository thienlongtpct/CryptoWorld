import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { createMemoryStore } from '../server/store.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = loadAllowed(root);
const password = 'correct-horse';

function sidOf(setCookie = '') {
  return /(?:^|;\s*)sid=([^;]*)/.exec(setCookie)?.[1] ?? '';
}

function handler() {
  return createHandler({ store: createMemoryStore(), allowed });
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

async function register(handle, username) {
  const result = await call(handle, { method: 'POST', path: '/api/register', body: { username, password } });
  assert.equal(result.status, 201);
  return result.sid;
}

test('guests cannot submit a scored gate', async () => {
  const result = await call(handler(), {
    method: 'POST',
    path: '/api/dungeon/submit',
    body: { challengeId: 'caesar', answer: 'hello' },
  });
  assert.equal(result.status, 401);
});

test('the client cannot mark a dungeon gate done through the lesson route', async () => {
  const handle = handler();
  const sid = await register(handle, 'ada');
  const saved = await call(handle, {
    method: 'PUT',
    path: '/api/progress',
    cookie: sid,
    body: { itemId: 'dungeon-caesar', status: 'done' },
  });
  assert.equal(saved.status, 400);
});

test('answers are normalized, wrong tries stay neutral, and a repeat does not add a reward', async () => {
  const handle = handler();
  const sid = await register(handle, 'ada');
  const wrong = await call(handle, {
    method: 'POST',
    path: '/api/dungeon/submit',
    cookie: sid,
    body: { challengeId: 'caesar', answer: 'nope' },
  });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.body.correct, false);
  assert.doesNotMatch(JSON.stringify(wrong.body), /hello|prism|glyph/);

  const right = await call(handle, {
    method: 'POST',
    path: '/api/dungeon/submit',
    cookie: sid,
    body: { challengeId: 'caesar', answer: '  Sunhacks{ hello } ' },
  });
  assert.equal(right.status, 200);
  assert.equal(right.body.correct, true);
  assert.equal(right.body.already, false);

  const again = await call(handle, {
    method: 'POST',
    path: '/api/dungeon/submit',
    cookie: sid,
    body: { challengeId: 'caesar', answer: 'hello' },
  });
  assert.equal(again.body.correct, true);
  assert.equal(again.body.already, true);
  const me = await call(handle, { path: '/api/me', cookie: sid });
  assert.equal(me.body.progress.filter(row => row.itemId === 'dungeon-caesar').length, 1);
});

test('one account cannot read another account’s solved gate', async () => {
  const handle = handler();
  const ada = await register(handle, 'ada');
  const bob = await register(handle, 'bob');
  await call(handle, {
    method: 'POST',
    path: '/api/dungeon/submit',
    cookie: ada,
    body: { challengeId: 'xor', answer: 'prism' },
  });
  const mine = await call(handle, { path: '/api/me', cookie: bob });
  assert.equal(mine.body.progress.some(row => row.itemId === 'dungeon-xor'), false);
});

test('too many submissions are limited and the walkthrough is authenticated', async () => {
  const handle = handler();
  const sid = await register(handle, 'ada');
  const guest = await call(handle, { method: 'POST', path: '/api/dungeon/walkthrough', body: { challengeId: 'vault' } });
  assert.equal(guest.status, 401);
  let limited = 0;
  for (let i = 0; i < 9; i += 1) {
    const result = await call(handle, {
      method: 'POST',
      path: '/api/dungeon/submit',
      cookie: sid,
      body: { challengeId: 'vault', answer: 'nope' },
    });
    if (result.status === 429) limited += 1;
  }
  assert.equal(limited, 1);
  const shown = await call(handle, {
    method: 'POST',
    path: '/api/dungeon/walkthrough',
    cookie: sid,
    body: { challengeId: 'vault' },
  });
  assert.equal(shown.status, 200);
  assert.match(shown.body.walkthrough, /glyph/);
});

const BOARD_RIGHT = { p: 'everyone', g: 'everyone', a: 'alice', A: 'everyone', b: 'bob', B: 'everyone', key: 'pair', note: 'everyone' };

test('the Public or Private? board is graded whole on the server', async () => {
  const handle = handler();
  const sid = await register(handle, 'ada');
  const submit = answer => call(handle, { method: 'POST', path: '/api/dungeon/submit', cookie: sid, body: { challengeId: 'wire', answer } });

  const missing = await submit({ p: 'everyone' });
  assert.equal(missing.status, 400);
  const bogus = await submit({ ...BOARD_RIGHT, key: 'eve' });
  assert.equal(bogus.status, 400);
  const text = await submit('everyone');
  assert.equal(text.status, 400);

  const wrong = await submit({ ...BOARD_RIGHT, key: 'everyone', a: 'pair' });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.body.correct, false);
  assert.deepEqual(wrong.body.wrong.sort(), ['a', 'key']);
  assert.deepEqual(Object.keys(wrong.body.nudges).sort(), ['a', 'key']);
  assert.equal(wrong.body.explanation, undefined);
  // A wrong board names the rows, not the choices that belong in them.
  assert.doesNotMatch(JSON.stringify(wrong.body), /"(everyone|alice|bob|pair)"/);
  const before = await call(handle, { path: '/api/me', cookie: sid });
  assert.equal(before.body.progress.some(row => row.itemId === 'dungeon-wire'), false);

  const right = await submit(BOARD_RIGHT);
  assert.equal(right.body.correct, true);
  assert.equal(right.body.already, false);
  assert.match(right.body.explanation, /passive/);
  const again = await submit(BOARD_RIGHT);
  assert.equal(again.body.already, true);
  const me = await call(handle, { path: '/api/me', cookie: sid });
  assert.equal(me.body.progress.filter(row => row.itemId === 'dungeon-wire').length, 1);
});

test('a won flag cannot open the bridge gate', async () => {
  const handle = handler();
  const sid = await register(handle, 'ada');
  const forged = await call(handle, { method: 'PUT', path: '/api/progress', cookie: sid, body: { itemId: 'dungeon-wire', status: 'done' } });
  assert.equal(forged.status, 400);
  const claimed = await call(handle, { method: 'POST', path: '/api/dungeon/submit', cookie: sid, body: { challengeId: 'wire', answer: { won: true } } });
  assert.equal(claimed.status, 400);
});
