import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { answerNpc } from './npc.mjs';
import { grade, walkthroughFor } from './dungeon.mjs';
import { SESSION_MS } from './tokens.mjs';
import { readiness } from './sponsors.mjs';
import { buildActivity } from './activity.mjs';
import { getNews, noteNewsRead } from './news.mjs';
import { learnerSources, researchSuggestion, tutorTopics } from './tutor-sources.mjs';
import { createTinyFish } from './tinyfish.mjs';
import { createMaritime } from './maritime.mjs';
import { getResearchRequest, startResearchRequest } from './research.mjs';
import { getLabRun, startLabRun } from './lab.mjs';
import { LAB_CODE_MAX } from './lab-template.mjs';
import { gradeAssessment, isAssessmentTask, publicAssessment } from './assessments.mjs';
import { recordEvidence } from './evidence.mjs';
import { buildSkillsRecord } from './skills.mjs';

const scrypt = promisify(scryptCb);
const JSON_MAX = 4096;
const LAB_JSON_MAX = LAB_CODE_MAX + 2048;
/** Requests per minute, per instance. */
const REGISTER_PER_MINUTE = 5;
const LOGIN_PER_MINUTE = 20;
const LOGIN_PER_NAME_PER_MINUTE = 8;
const TUTOR_PER_MINUTE = 10;

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

function readJson(body, max = JSON_MAX) {
  if (body.length > max) throw Object.assign(new Error('Request is too large.'), { status: 413 });
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

export function createHandler({
  store,
  allowed,
  secureCookie = false,
  gemini = '',
  model = '',
  tinyfish = createTinyFish(),
  maritime = createMaritime(),
  labQueue = null,
  labRunner = null,
  now = () => Date.now(),
} = {}) {
  const submits = new Map();
  const newsInflight = new Map();
  const walks = new Map();
  // Sign-up, login and tutor limits. Counted per instance: a Lambda fleet allows a multiple of
  // these, so API Gateway also throttles the whole API.
  const auth = new Map();
  const tutor = new Map();
  function limited(bucket, userId, max) {
    const nowMs = now();
    // Drop stale keys now and then so one address per request cannot grow the map forever.
    if (bucket.size > 5_000) {
      for (const [key, times] of bucket) {
        if (!times.some(time => nowMs - time < 60_000)) bucket.delete(key);
      }
    }
    const prev = (bucket.get(userId) || []).filter(time => nowMs - time < 60_000);
    if (prev.length >= max) {
      bucket.set(userId, prev);
      return true;
    }
    prev.push(nowMs);
    bucket.set(userId, prev);
    return false;
  }
  return async function handle(req) {
    const method = req.method || 'GET';
    const path = req.path || '/';
    const headers = req.headers || {};
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    try {
      if (method === 'GET' && path === '/api/health') {
        return send(200, { ok: true, ...readiness({ gemini, tinyfish, maritime, store }) });
      }

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

        const ip = typeof req.ip === 'string' ? req.ip : '';
        const slow = { error: 'Too many attempts. Wait a minute and try again.' };
        if (path === '/api/register') {
          if (ip && limited(auth, `register:${ip}`, REGISTER_PER_MINUTE)) return send(429, slow);
        } else {
          // Per address and per account name, so guessing one password from many addresses is slowed too.
          if (ip && limited(auth, `login:${ip}`, LOGIN_PER_MINUTE)) return send(429, slow);
          if (limited(auth, `login-name:${username.toLowerCase()}`, LOGIN_PER_NAME_PER_MINUTE)) return send(429, slow);
        }

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
        if (limited(tutor, user.id, TUTOR_PER_MINUTE)) {
          return send(429, { error: 'The tutors need a breather. Wait a minute and ask again.' });
        }
        const payload = readJson(body);
        const topics = tutorTopics(payload ?? {});
        const answered = await answerNpc({
          gemini,
          model,
          body: payload,
          sources: () => learnerSources(store, user.id, topics, now()),
          researchHint: researchSuggestion(topics),
        });
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
          await recordEvidence(store, {
            userId: user.id,
            taskId: typeof challengeId === 'string' ? challengeId : '',
            version: 1,
            type: 'walkthrough',
            assistance: 'walkthrough',
            result: { ok: true },
            at: new Date(now()).toISOString(),
          });
          return send(200, { walkthrough: shown.walkthrough });
        }
        if (limited(submits, user.id, 8)) return send(429, { error: 'Too many submissions. Wait a moment and try again.' });
        const result = grade(challengeId, payload.answer);
        if (!result.ok) return send(result.status, { error: result.error });
        await recordEvidence(store, {
          userId: user.id,
          taskId: typeof challengeId === 'string' ? challengeId : '',
          version: 1,
          type: 'graded',
          assistance: 'unknown',
          result: {
            correct: result.correct === true,
            wrong: result.wrong ?? [],
          },
          at: new Date(now()).toISOString(),
        });
        if (!result.correct) return send(200, { correct: false, wrong: result.wrong ?? [], nudges: result.nudges ?? {} });
        const before = await store.progressFor(user.id);
        const already = before.some(row => row.itemId === result.itemId && row.status === 'done');
        const saved = await store.saveProgress(user.id, result.itemId, 'done');
        if (!saved) return send(401, { error: 'Log in to submit a dungeon challenge.' });
        return send(200, { correct: true, already, itemId: result.itemId, status: saved.status, explanation: result.explanation ?? '' });
      }

      if (method === 'GET' && path === '/api/skills') {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Log in to view your learning record.' });
        const record = await buildSkillsRecord(store, user.id);
        return send(200, record);
      }

      if (method === 'GET' && path === '/api/news') {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Log in to read the crypto news watch.' });
        return send(200, await getNews({ store, tinyfish, nowMs: now(), inflight: newsInflight }));
      }

      if (method === 'POST' && path === '/api/news/read') {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Log in to save reading.' });
        if (limited(submits, `news:${user.id}`, 30)) return send(429, { error: 'Too many requests. Wait a moment.' });
        const payload = readJson(body);
        const row = await noteNewsRead(store, user.id, {
          sourceId: typeof payload?.sourceId === 'string' ? payload.sourceId : '',
          url: typeof payload?.url === 'string' ? payload.url : '',
          nowMs: now(),
        });
        return row ? send(200, { ok: true }) : send(404, { error: 'That headline is not in the current news watch.' });
      }

      if (method === 'GET' && path === '/api/activity') {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Log in to view your activity.' });
        return send(200, await buildActivity(store, user.id, { at: now() }));
      }

      if (method === 'GET' && path.startsWith('/api/assessments/')) {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Log in to open an assessment.' });
        const taskId = decodeURIComponent(path.slice('/api/assessments/'.length));
        const pub = publicAssessment(taskId);
        if (!pub) return send(404, { error: 'Unknown assessment.' });
        return send(200, pub);
      }

      if (method === 'POST' && path === '/api/assessments') {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Log in to submit an assessment.' });
        if (limited(submits, `assess:${user.id}`, 20)) {
          return send(429, { error: 'Too many assessment submissions. Wait a moment and try again.' });
        }
        const payload = readJson(body);
        const taskId = typeof payload.taskId === 'string' ? payload.taskId.trim() : '';
        if (!isAssessmentTask(taskId)) return send(404, { error: 'Unknown assessment.' });
        const version = Number(payload.version);
        const graded = gradeAssessment(taskId, version, payload.answers);
        if (!graded.ok) return send(graded.status, { error: graded.error });
        await recordEvidence(store, {
          userId: user.id,
          taskId,
          version: graded.version,
          type: 'assessment',
          assistance: 'unknown',
          result: {
            passed: graded.passed,
            correctCount: graded.correctCount,
            total: graded.total,
            items: graded.items,
          },
          at: new Date(now()).toISOString(),
        });
        return send(200, {
          taskId: graded.taskId,
          version: graded.version,
          title: graded.title,
          passed: graded.passed,
          correctCount: graded.correctCount,
          total: graded.total,
          items: graded.items,
        });
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

      if (method === 'POST' && path === '/api/research') {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Log in to start research.' });
        if (limited(submits, `research:${user.id}`, 24)) {
          return send(429, { error: 'Too many research requests. Wait a moment and try again.' });
        }
        const payload = readJson(body);
        const started = await startResearchRequest({ store, tinyfish, user, body: payload, now: now() });
        return send(started.status, started.body);
      }

      {
        const researchMatch = /^\/api\/research\/([^/]+)$/.exec(path);
        if (method === 'GET' && researchMatch) {
          const user = await store.sessionUser(readCookie(headers));
          if (!user) return send(401, { error: 'Log in to view research.' });
          const looked = await getResearchRequest({
            store,
            tinyfish,
            user,
            jobId: decodeURIComponent(researchMatch[1]),
            now: now(),
          });
          return send(looked.status, looked.body);
        }
      }

      if (method === 'POST' && path === '/api/lab-runs') {
        const user = await store.sessionUser(readCookie(headers));
        if (!user) return send(401, { error: 'Log in to run the Maritime workbench.' });
        if (limited(submits, `lab:${user.id}`, 20)) {
          return send(429, { error: 'Too many lab requests. Wait a moment and try again.' });
        }
        const payload = readJson(body, LAB_JSON_MAX);
        const started = await startLabRun({
          store,
          queue: labQueue,
          maritime,
          runner: labRunner,
          user,
          body: payload,
          now: now(),
        });
        return send(started.status, started.body);
      }

      {
        const labMatch = /^\/api\/lab-runs\/([^/]+)$/.exec(path);
        if (method === 'GET' && labMatch) {
          const user = await store.sessionUser(readCookie(headers));
          if (!user) return send(401, { error: 'Log in to view a lab run.' });
          const looked = await getLabRun({
            store,
            queue: labQueue,
            maritime,
            runner: labRunner,
            user,
            jobId: decodeURIComponent(labMatch[1]),
            now: now(),
          });
          return send(looked.status, looked.body);
        }
      }

      return send(404, { error: 'Not found.' });
    } catch (err) {
      return send(err.status || 500, { error: err.status ? err.message : 'The account server hit an error.' });
    }
  };
}
