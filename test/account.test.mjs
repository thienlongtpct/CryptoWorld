import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { apigwRequest, apigwResponse, handler as lambdaHandler } from '../server/lambda.mjs';
import { createFileStore, createMemoryStore } from '../server/store.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = loadAllowed(root);
const password = 'correct-horse';

function sidOf(setCookie = '') {
  return /(?:^|;\s*)sid=([^;]*)/.exec(setCookie)?.[1] ?? '';
}

async function call(store, { method = 'GET', path = '/', cookie = '', body, secureCookie = false } = {}) {
  const handle = createHandler({ store, allowed, secureCookie });
  const result = await handle({
    method,
    path,
    headers: cookie ? { cookie: `sid=${cookie}` } : {},
    body: body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body)),
  });
  const setCookie = result.headers['set-cookie'] || '';
  return { ...result, setCookie, sid: sidOf(setCookie) };
}

async function register(store, username = 'ada', secureCookie = false) {
  const result = await call(store, {
    method: 'POST',
    path: '/api/register',
    body: { username, password },
    secureCookie,
  });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result;
}

test('health answers without an account', async () => {
  const result = await call(createMemoryStore(), { path: '/api/health' });
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.gemini, false);
  assert.equal(result.body.tinyfish, false);
  assert.equal(result.body.maritime, false);
  assert.equal(result.body.tigerdata, false);
  assert.equal(result.headers['cache-control'], 'no-store');
});

test('a visitor with no cookie is signed out', async () => {
  const result = await call(createMemoryStore(), { path: '/api/me' });
  assert.deepEqual(result.body, { user: null, progress: [] });
});

test('registration rejects a short name and a short password', async () => {
  const store = createMemoryStore();
  const name = await call(store, { method: 'POST', path: '/api/register', body: { username: 'ab', password } });
  assert.equal(name.status, 400);
  assert.match(name.body.error, /3–20/);
  const pass = await call(store, { method: 'POST', path: '/api/register', body: { username: 'ada', password: 'short' } });
  assert.equal(pass.status, 400);
  assert.match(pass.body.error, /8–72/);
});

test('registration trims the name, signs the learner in, and refuses a duplicate', async () => {
  const store = createMemoryStore();
  const created = await register(store, '  Ada  ');
  assert.equal(created.body.user.username, 'Ada');
  assert.match(created.setCookie, /HttpOnly/);
  assert.match(created.setCookie, /SameSite=Lax/);
  assert.doesNotMatch(created.setCookie, /Secure/);

  const me = await call(store, { path: '/api/me', cookie: created.sid });
  assert.equal(me.body.user.username, 'Ada');

  const again = await call(store, {
    method: 'POST',
    path: '/api/register',
    body: { username: 'ada', password },
  });
  assert.equal(again.status, 409);
});

test('the production cookie is marked Secure', async () => {
  const created = await register(createMemoryStore(), 'ada', true);
  assert.match(created.setCookie, /Secure/);
});

test('login accepts the name in any case and rejects a wrong password with the same error', async () => {
  const store = createMemoryStore();
  await register(store, 'Ada');
  const wrongUser = await call(store, {
    method: 'POST',
    path: '/api/login',
    body: { username: 'nobody', password },
  });
  const wrongPass = await call(store, {
    method: 'POST',
    path: '/api/login',
    body: { username: 'ada', password: 'not-the-password' },
  });
  assert.equal(wrongUser.status, 401);
  assert.equal(wrongPass.status, 401);
  assert.equal(wrongUser.body.error, wrongPass.body.error);

  const loggedIn = await call(store, {
    method: 'POST',
    path: '/api/login',
    body: { username: 'ADA', password },
  });
  assert.equal(loggedIn.status, 200);
  const me = await call(store, { path: '/api/me', cookie: loggedIn.sid });
  assert.equal(me.body.user.username, 'Ada');
});

test('logout drops the session', async () => {
  const store = createMemoryStore();
  const created = await register(store);
  const loggedOut = await call(store, { method: 'POST', path: '/api/logout', cookie: created.sid });
  assert.equal(loggedOut.status, 200);
  assert.match(loggedOut.setCookie, /Max-Age=0/);
  const me = await call(store, { path: '/api/me', cookie: created.sid });
  assert.equal(me.body.user, null);
});

test('progress requires a session, a known item, and does not undo a finished item', async () => {
  let now = Date.parse('2026-11-14T12:00:00Z');
  const store = createMemoryStore({ now: () => now });
  const created = await register(store);
  const anon = await call(store, { method: 'PUT', path: '/api/progress', body: { itemId: 'mod', status: 'seen' } });
  assert.equal(anon.status, 401);
  const unknown = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: created.sid,
    body: { itemId: 'not-a-lesson', status: 'seen' },
  });
  assert.equal(unknown.status, 400);

  const seen = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: created.sid,
    body: { itemId: 'mod', status: 'seen' },
  });
  assert.equal(seen.body.status, 'seen');
  now += 60_000;
  const done = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: created.sid,
    body: { itemId: 'px-aon', status: 'done' },
  });
  assert.equal(done.body.status, 'done');
  const challenge = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: created.sid,
    body: { itemId: 'ctf-foundations', status: 'done' },
  });
  assert.equal(challenge.status, 200);
  now += 60_000;
  const rewind = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: created.sid,
    body: { itemId: 'px-aon', status: 'seen' },
  });
  assert.equal(rewind.body.status, 'done');
  assert.equal(rewind.body.at, done.body.at);

  const me = await call(store, { path: '/api/me', cookie: created.sid });
  const saved = Object.fromEntries(me.body.progress.map(row => [row.itemId, row.status]));
  assert.equal(saved.mod, 'seen');
  assert.equal(saved['px-aon'], 'done');
  assert.equal(saved['ctf-foundations'], 'done');
});

test('one account cannot read or replace another account’s progress', async () => {
  const store = createMemoryStore();
  const ada = await register(store, 'ada');
  const bob = await register(store, 'bob');
  const saved = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: ada.sid,
    body: { itemId: 'hash', status: 'done' },
  });
  assert.equal(saved.status, 200);
  const bobView = await call(store, { path: '/api/me', cookie: bob.sid });
  assert.deepEqual(bobView.body.progress, []);
  const bobWrite = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: bob.sid,
    body: { itemId: 'hash', status: 'seen' },
  });
  assert.equal(bobWrite.status, 200);
  const adaView = await call(store, { path: '/api/me', cookie: ada.sid });
  assert.equal(adaView.body.progress.find(row => row.itemId === 'hash').status, 'done');
  const bobAgain = await call(store, { path: '/api/me', cookie: bob.sid });
  assert.equal(bobAgain.body.progress.find(row => row.itemId === 'hash').status, 'seen');
});

test('a huge or unreadable body is refused', async () => {
  const store = createMemoryStore();
  const handle = createHandler({ store, allowed });
  const huge = await handle({
    method: 'POST',
    path: '/api/login',
    headers: {},
    body: Buffer.alloc(4097, 0x78),
  });
  assert.equal(huge.status, 413);
  const bad = await handle({
    method: 'POST',
    path: '/api/login',
    headers: {},
    body: Buffer.from('{'),
  });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, 'Send JSON.');
});

test('an expired session can no longer save progress', async () => {
  let now = Date.parse('2026-11-14T12:00:00Z');
  const store = createMemoryStore({ now: () => now, sessionMs: 1000 });
  const created = await register(store);
  now += 1000;
  const saved = await call(store, {
    method: 'PUT',
    path: '/api/progress',
    cookie: created.sid,
    body: { itemId: 'mod', status: 'seen' },
  });
  assert.equal(saved.status, 401);
});

test('the file store keeps an account after it is opened again', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cryptoworld-'));
  const path = join(dir, 'accounts.json');
  const created = await createFileStore(path).registerUser({
    id: 'u1',
    username: 'Ada',
    passHash: 'ab',
    salt: 'cd',
    createdAt: '2026-11-14T00:00:00.000Z',
  });
  assert.ok(created.token);
  const reopened = createFileStore(path);
  const user = await reopened.userByName('ada');
  assert.equal(user.username, 'Ada');
  assert.equal((await reopened.sessionUser(created.token)).id, 'u1');
});

test('unknown routes are a 404', async () => {
  const result = await call(createMemoryStore(), { method: 'POST', path: '/api/health' });
  assert.equal(result.status, 404);
});

test('API Gateway events keep the body and the session cookie', () => {
  const request = apigwRequest({
    rawPath: '/api/me',
    cookies: ['sid=abc'],
    headers: { cookie: 'sid=ignored' },
    requestContext: { http: { method: 'GET' } },
  });
  assert.equal(request.path, '/api/me');
  assert.equal(request.headers.cookie, 'sid=abc');

  const encoded = apigwRequest({
    rawPath: '/api/login',
    isBase64Encoded: true,
    body: Buffer.from('{"username":"ada"}').toString('base64'),
    headers: {},
    requestContext: { http: { method: 'POST' } },
  });
  assert.equal(encoded.body.toString(), '{"username":"ada"}');

  const response = apigwResponse({
    status: 201,
    headers: { 'content-type': 'application/json; charset=utf-8', 'set-cookie': 'sid=abc; HttpOnly' },
    body: { user: { username: 'ada' } },
  });
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.cookies, ['sid=abc; HttpOnly']);
  assert.equal(response.headers['set-cookie'], undefined);
  assert.equal(response.body, '{"user":{"username":"ada"}}');
});

test('the Lambda entry answers health before it touches an account', async () => {
  const response = await lambdaHandler({
    rawPath: '/api/health',
    headers: {},
    requestContext: { http: { method: 'GET' } },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).ok, true);
});

test('the local server registers a learner over HTTP', { timeout: 30_000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cryptoworld-'));
  const proc = spawn(process.execPath, ['--experimental-strip-types', 'server/index.mjs'], {
    cwd: root,
    // Empty values win over a developer's .env (index.mjs only fills unset variables),
    // so the sponsors stay off and the store stays on the temp JSON file.
    env: {
      ...process.env,
      PORT: '0',
      ACCOUNTS_PATH: join(dir, 'accounts.json'),
      TINYFISH_API_KEY: '',
      MARITIME_API_KEY: '',
      TIGER_DATABASE_URL: '',
      SPONSOR_SECRET_ARN: '',
    },
  });
  let log = '';
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`server did not start\n${log}`)), 10_000);
      proc.stdout.on('data', chunk => {
        log += chunk;
        const match = log.match(/localhost:(\d+)/);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
      proc.stderr.on('data', chunk => { log += chunk; });
      proc.on('exit', code => {
        clearTimeout(timer);
        reject(new Error(`server exited ${code}\n${log}`));
      });
    });

    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    const healthBody = await health.json();
    assert.equal(healthBody.ok, true);
    assert.equal(typeof healthBody.gemini, 'boolean');
    assert.equal(typeof healthBody.tinyfish, 'boolean');
    assert.equal(typeof healthBody.maritime, 'boolean');
    assert.equal(healthBody.tinyfish, false);
    assert.equal(healthBody.maritime, false);
    assert.equal(JSON.stringify(healthBody).includes('sk-'), false);
    assert.equal(JSON.stringify(healthBody).includes('mk_'), false);
    const registered = await fetch(`http://127.0.0.1:${port}/api/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'ada', password }),
    });
    assert.equal(registered.status, 201);
    const setCookie = registered.headers.get('set-cookie') || '';
    assert.match(setCookie, /HttpOnly/);
    const me = await fetch(`http://127.0.0.1:${port}/api/me`, { headers: { cookie: setCookie.split(';')[0] } });
    assert.equal((await me.json()).user.username, 'ada');
  } finally {
    proc.kill('SIGTERM');
  }
});
