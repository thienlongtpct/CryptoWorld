// Local account server: registration, sessions, and learning progress.
// The Vite dev server proxies /api here. Accounts stay in data/accounts.json.

import http from 'node:http';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const PORT = Number(process.env.PORT || 8787);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, 'data', 'accounts.json');
const catalog = JSON.parse(readFileSync(join(root, 'src/data/catalog.json'), 'utf8'));
const ALLOWED = new Set([
  ...catalog.lessons.map(l => l.id),
  ...catalog.paths.flatMap(p => p.steps.map(s => s.id)),
]);
const SESSION_MS = 14 * 24 * 60 * 60 * 1000;

function empty() {
  return { users: [], sessions: [], progress: [] };
}

function load() {
  try {
    const db = JSON.parse(readFileSync(dbPath, 'utf8'));
    return { users: db.users ?? [], sessions: db.sessions ?? [], progress: db.progress ?? [] };
  } catch {
    return empty();
  }
}

function save(db) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const tmp = dbPath + '.tmp';
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, dbPath);
}

let chain = Promise.resolve();
function update(fn) {
  const run = chain.then(async () => {
    const db = load();
    const result = await fn(db);
    if (result.write !== false) save(db);
    return result.value;
  });
  chain = run.then(() => {}, () => {});
  return run;
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function sessionUser(db, req) {
  const now = Date.now();
  db.sessions = db.sessions.filter(s => s.expires > now);
  const token = cookies(req).sid;
  if (!token) return null;
  const session = db.sessions.find(s => s.tokenHash === hashToken(token));
  if (!session) return null;
  return db.users.find(u => u.id === session.userId) ?? null;
}

function publicProgress(db, userId) {
  return db.progress
    .filter(p => p.userId === userId)
    .map(p => ({ itemId: p.itemId, status: p.status, at: p.at }));
}

function cookie(token) {
  const maxAge = Math.floor(SESSION_MS / 1000);
  const value = token ? `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}` : 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
  return value;
}

async function readJson(req) {
  const chunks = [];
  let n = 0;
  for await (const chunk of req) {
    n += chunk.length;
    if (n > 4096) throw Object.assign(new Error('Request is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  if (!n) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Send JSON.'), { status: 400 });
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
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

async function passwordHash(password, salt) {
  const key = await scrypt(password, salt, 32);
  return key.toString('hex');
}

function issueSession(db, userId) {
  const token = randomBytes(24).toString('hex');
  db.sessions.push({ tokenHash: hashToken(token), userId, expires: Date.now() + SESSION_MS });
  return token;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      send(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/me') {
      const me = await update(db => {
        const user = sessionUser(db, req);
        return { write: true, value: user ? { user: { username: user.username }, progress: publicProgress(db, user.id) } : { user: null, progress: [] } };
      });
      send(res, 200, me);
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/api/register' || url.pathname === '/api/login')) {
      const body = await readJson(req);
      const username = typeof body.username === 'string' ? body.username.trim() : '';
      const nameError = checkName(username);
      const passError = checkPassword(body.password);
      if (nameError || passError) {
        send(res, 400, { error: nameError || passError });
        return;
      }
      const key = username.toLowerCase();
      if (url.pathname === '/api/register') {
        const salt = randomBytes(16).toString('hex');
        const passHash = await passwordHash(body.password, salt);
        const created = await update(db => {
          if (db.users.some(u => u.username.toLowerCase() === key)) return { write: false, value: null };
          const user = { id: randomBytes(8).toString('hex'), username, passHash, salt, createdAt: new Date().toISOString() };
          db.users.push(user);
          const token = issueSession(db, user.id);
          return { value: { token, username } };
        });
        if (!created) {
          send(res, 409, { error: 'That username is taken.' });
          return;
        }
        send(res, 201, { user: { username: created.username } }, { 'set-cookie': cookie(created.token) });
        return;
      }
      const found = load().users.find(u => u.username.toLowerCase() === key);
      const passHash = found ? await passwordHash(body.password, found.salt) : await passwordHash(body.password, '0'.repeat(32));
      const passOk = found && passHash.length === found.passHash.length && timingSafeEqual(Buffer.from(passHash), Buffer.from(found.passHash));
      if (!found || !passOk) {
        send(res, 401, { error: 'Wrong username or password.' });
        return;
      }
      const token = await update(db => ({ value: issueSession(db, found.id) }));
      send(res, 200, { user: { username: found.username } }, { 'set-cookie': cookie(token) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
      await update(db => {
        const token = cookies(req).sid;
        if (token) db.sessions = db.sessions.filter(s => s.tokenHash !== hashToken(token));
        return { value: null };
      });
      send(res, 200, { ok: true }, { 'set-cookie': cookie('') });
      return;
    }

    if (req.method === 'PUT' && url.pathname === '/api/progress') {
      const body = await readJson(req);
      const itemId = body.itemId;
      const status = body.status === 'done' ? 'done' : body.status === 'seen' ? 'seen' : '';
      if (typeof itemId !== 'string' || !ALLOWED.has(itemId) || !status) {
        send(res, 400, { error: 'Unknown lesson or topic.' });
        return;
      }
      const saved = await update(db => {
        const user = sessionUser(db, req);
        if (!user) return { write: false, value: null };
        const row = db.progress.find(p => p.userId === user.id && p.itemId === itemId);
        if (!row) db.progress.push({ userId: user.id, itemId, status, at: new Date().toISOString() });
        else if (row.status !== 'done') {
          row.status = status;
          row.at = new Date().toISOString();
        }
        return { value: publicProgress(db, user.id).find(p => p.itemId === itemId) };
      });
      if (!saved) {
        send(res, 401, { error: 'Sign in to save what you learn.' });
        return;
      }
      send(res, 200, saved);
      return;
    }

    send(res, 404, { error: 'Not found.' });
  } catch (err) {
    send(res, err.status || 500, { error: err.status ? err.message : 'The account server hit an error.' });
  }
});

server.listen(PORT, () => {
  if (!existsSync(dbPath)) save(empty());
  console.log(`account server http://localhost:${PORT}`);
});
