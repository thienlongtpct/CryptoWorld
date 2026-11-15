import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { answerNpc } from './npc.mjs';
import { grade, walkthroughFor } from './dungeon.mjs';
import { SESSION_MS } from './tokens.mjs';

const scrypt = promisify(scryptCb);

function cookie(token, secure) {
  const flags = `HttpOnly; SameSite=Lax; Path=/${secure ? '; Secure' : ''}`;
  if (!token) return `sid=; ${flags}; Max-Age=0`;
  return `sid=${token}; ${flags}; Max-Age=${Math.floor(SESSION_MS / 1000)}`;
}

function readCookie(headers) {
  const raw = headers.cookie ?? headers.Cookie ?? '';
  const header = Array.isArray(raw) ? raw.join('; ') : String(raw);
  for (const part of header.split(';')) {
    const split = part.indexOf('=');
    if (split > 0 && part.slice(0, split).trim() === 'sid') {
      return decodeURIComponent(part.slice(split + 1).trim());
    }
  }
  return '';
}

function checkName(username) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return 'Use 3–20 letters, digits or underscores.';
  }
  return '';
}

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return 'Use a password of 8–72 characters.';
  }
  return '';
}

function passwordHash(password, salt) {
  return scrypt(password, salt, 32).then(key => key.toString('hex'));
}

function readJson(body) {
  if (body.length > 4096) throw Object.assign(new Error('Request is too large.'), { status: 413 });
  if (!body.length) return {};
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    throw Object.assign(new Error('Send JSON.'), { status: 400 });
  }
}

function send(status, body, extra = {}) {
  return {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
    body,
  };
}

export function createHandler({ store, allowed, secureCookie = false, gemini = '', model = '' }) {
  const submits = new Map();
  const walks = new Map();
  function limited(bucket, userId, max) {
    const now = Date.now();
    const prev = (bucket.get(userId) || []).filter(time => now - time < 60_000);
    if (prev.length >= max) {
      bucket.set(userId, prev);
      return true;
    }
    prev.push(now);
    bucket.set(userId, prev);
    return false;
  }
  return async function handle(req) {
    const method = req.method || 'GET';
    const path = req.path || '/';
    const headers = req.headers || {};
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    try {
      if (method === 'GET' && path === '/api/health') return send(200, { ok: true, gemini: Boolean(gemini) });

      if (method === 'GET' && path === '/api/me') {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(200, { user: null, progress: [] });
        return send(200, { user: { username: user.username }, progress: await store.progressFor(user.id) });
      }

      if (method === 'POST' && (path === '/api/register' || path === '/api/login')) {
        const payload = readJson(body);
        const username = typeof payload.username === 'string' ? payload.username.trim() : '';
        const nameError = checkName(username);
        const passError = checkPassword(payload.password);
        if (nameError || passError) return send(400, { error: nameError || passError });

        if (path === '/api/register') {
          const salt = randomBytes(16).toString('hex');
          const passHash = await passwordHash(payload.password, salt);
          const created = await store.registerUser({
            id: randomBytes(8).toString('hex'),
            username,
            passHash,
            salt,
            createdAt: new Date().toISOString(),
          });
          if (!created) return send(409, { error: 'That username is taken.' });
          return send(201, { user: { username: created.username } }, { 'set-cookie': cookie(created.token, secureCookie) });
        }

        const found = await store.userByName(username);
        // Hash even when the user is missing so the two failures take the same path.
        const passHash = await passwordHash(payload.password, found ? found.salt : '0'.repeat(32));
        const passOk = Boolean(found)
          && passHash.length === found.passHash.length
          && timingSafeEqual(Buffer.from(passHash), Buffer.from(found.passHash));
        if (!passOk) return send(401, { error: 'Wrong username or password.' });
        const token = await store.createSession(found.id);
        return send(200, { user: { username: found.username } }, { 'set-cookie': cookie(token, secureCookie) });
      }

      if (method === 'POST' && path === '/api/logout') {
        await store.revokeSession(readCookie(headers));
        return send(200, { ok: true }, { 'set-cookie': cookie('', secureCookie) });
      }

      if (method === 'POST' && path === '/api/npc') {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Log in to ask a character a question.' });
        const payload = readJson(body);
        const answered = await answerNpc({ gemini, model, body: payload });
        return send(answered.status, answered.body);
      }

      if (method === 'POST' && (path === '/api/dungeon/submit' || path === '/api/dungeon/walkthrough')) {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Log in to submit a dungeon challenge.' });
        const payload = readJson(body);
        const challengeId = payload.challengeId;
        if (path === '/api/dungeon/walkthrough') {
          if (limited(walks, user.id, 12)) return send(429, { error: 'Too many walkthrough requests. Wait a moment and try again.' });
          const shown = walkthroughFor(challengeId);
          if (!shown.ok) return send(shown.status, { error: shown.error });
          return send(200, { walkthrough: shown.walkthrough });
        }
        if (limited(submits, user.id, 8)) return send(429, { error: 'Too many submissions. Wait a moment and try again.' });
        const result = grade(challengeId, payload.answer);
        if (!result.ok) return send(result.status, { error: result.error });
        if (!result.correct) return send(200, { correct: false, wrong: result.wrong ?? [], nudges: result.nudges ?? {} });
        const before = await store.progressFor(user.id);
        const already = before.some(row => row.itemId === result.itemId && row.status === 'done');
        const saved = await store.saveProgress(user.id, result.itemId, 'done');
        if (!saved) return send(401, { error: 'Log in to submit a dungeon challenge.' });
        return send(200, { correct: true, already, itemId: result.itemId, status: saved.status, explanation: result.explanation ?? '' });
      }

      if (method === 'PUT' && path === '/api/progress') {
        const payload = readJson(body);
        const itemId = payload.itemId;
        const status = payload.status === 'done' ? 'done' : payload.status === 'seen' ? 'seen' : '';
        if (typeof itemId !== 'string' || !allowed.has(itemId) || !status) {
          return send(400, { error: 'Unknown lesson or topic.' });
        }
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Sign in to save what you learn.' });
        const saved = await store.saveProgress(user.id, itemId, status);
        if (!saved) return send(401, { error: 'Sign in to save what you learn.' });
        return send(200, saved);
      }

      return send(404, { error: 'Not found.' });
    } catch (err) {
      return send(err.status || 500, { error: err.status ? err.message : 'The account server hit an error.' });
    }
  };
}
