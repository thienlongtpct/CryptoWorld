// TinyFish beyond the Research Desk: tutors citing gathered sources, and the shared news watch.
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { createMemoryStore } from '../server/store.mjs';
import { learnerSources, researchSuggestion, tutorTopics, TUTOR_SOURCE_MAX } from '../server/tutor-sources.mjs';
import { citedSources } from '../server/npc.mjs';
import {
  getNews, NEWS_OWNER, NEWS_RETRY_MS, NEWS_SOURCES, newsJobId, TOPIC_KEYWORDS, validateNews,
} from '../server/news.mjs';
import { TOPIC_BY_ID } from '../src/vis/registry.ts';

const allowed = loadAllowed();
const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);
const DAY = '2026-11-15';
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function researchJob(over = {}) {
  return {
    id: 'rj1',
    userId: 'u1',
    subjectId: 'hash',
    subjectKind: 'topic',
    fingerprint: 'fp1',
    status: 'completed',
    relatedVisualizations: ['hash', 'commit'],
    resources: [
      { title: 'FIPS 180-4', publisher: 'NIST', url: 'https://csrc.nist.gov/pubs/fips/180-4', excerpt: 'SHA-256 produces a 256-bit digest.' },
      { title: 'RFC 6234', publisher: 'IETF', url: 'https://www.rfc-editor.org/rfc/rfc6234', excerpt: 'US Secure Hash Algorithms.' },
    ],
    updatedAt: '2026-11-15T10:00:00.000Z',
    expiresAt: T0 + 3_600_000,
    ...over,
  };
}

function fakeTinyFish({ configured = true, start, run } = {}) {
  const calls = { start: 0, get: 0 };
  return {
    calls,
    get configured() { return configured; },
    async startAutomation(body) {
      calls.start += 1;
      return start ? start(body) : { ok: true, status: 200, runId: `run${calls.start}`, data: { run_id: `run${calls.start}` } };
    },
    async getRun(id) {
      calls.get += 1;
      return run ? run(id) : { ok: true, status: 200, data: { status: 'RUNNING' } };
    },
  };
}

async function signIn(handle, username = 'ada') {
  const res = await handle({
    method: 'POST',
    path: '/api/register',
    headers: {},
    body: Buffer.from(JSON.stringify({ username, password: 'correct-horse' })),
  });
  return /sid=([^;]*)/.exec(res.headers['set-cookie'])[1];
}

const get = (handle, path, sid) => handle({ method: 'GET', path, headers: { cookie: `sid=${sid}` }, body: Buffer.alloc(0) });
const post = (handle, path, sid, body) => handle({ method: 'POST', path, headers: { cookie: `sid=${sid}` }, body: Buffer.from(JSON.stringify(body)) });

// ---- Tutors cite research ----

test('tutor topics come from the region plus the open challenge lesson', () => {
  assert.deepEqual(tutorTopics({ regionId: 'grove' }), ['hash']);
  assert.ok(tutorTopics({ regionId: 'nowhere' }).length === 0);
  assert.equal(researchSuggestion(['hash']), 'research?topic=hash');
  assert.equal(researchSuggestion(['psi']), 'research?topic=cuckoo');
  assert.equal(researchSuggestion(['caesar']), null);
});

test('learnerSources keeps completed, related, own, unexpired jobs, dedupes URLs, and caps the list', async () => {
  const store = createMemoryStore();
  await store.saveResearchJob(researchJob());
  await store.saveResearchJob(researchJob({ id: 'rj2', fingerprint: 'fp2', updatedAt: '2026-11-15T11:00:00.000Z' })); // same URLs
  await store.saveResearchJob(researchJob({ id: 'rj3', fingerprint: 'fp3', status: 'running' }));
  await store.saveResearchJob(researchJob({ id: 'rj4', fingerprint: 'fp4', userId: 'u2' }));
  await store.saveResearchJob(researchJob({ id: 'rj5', fingerprint: 'fp5', expiresAt: T0 - 1 }));
  await store.saveResearchJob(researchJob({ id: 'rj6', fingerprint: 'fp6', subjectId: 'cuckoo', relatedVisualizations: ['cuckoo', 'psi'] }));
  const sources = await learnerSources(store, 'u1', ['hash'], T0);
  assert.deepEqual(sources.map(s => [s.n, s.publisher]), [[1, 'NIST'], [2, 'IETF']]);
  assert.equal(sources[0].excerpt, 'SHA-256 produces a 256-bit digest.');
  assert.deepEqual(await learnerSources(store, 'u1', ['caesar'], T0), []);
  assert.deepEqual(await learnerSources(store, 'u1', [], T0), []);

  const many = researchJob({
    id: 'rj9',
    fingerprint: 'fp9',
    resources: Array.from({ length: 9 }, (_, i) => ({ title: `T${i}`, publisher: 'P', url: `https://x.test/${i}`, excerpt: 'e' })),
  });
  const big = createMemoryStore();
  await big.saveResearchJob(many);
  assert.equal((await learnerSources(big, 'u1', ['hash'], T0)).length, TUTOR_SOURCE_MAX);
});

test('citedSources returns only the [n] markers that match a listed source', () => {
  const list = [{ n: 1, title: 'a' }, { n: 2, title: 'b' }, { n: 3, title: 'c' }];
  assert.deepEqual(citedSources('SHA-256 is 256 bits [1]. See also [3] and [7].', list).map(s => s.n), [1, 3]);
  assert.deepEqual(citedSources('No citations here.', list), []);
});

test('/api/npc gives Gemini the learner’s gathered sources and returns the cited ones', async () => {
  const store = createMemoryStore();
  const handle = createHandler({ store, allowed, gemini: 'g-key', now: () => T0 });
  const sid = await signIn(handle);
  const user = await store.sessionUser(sid);
  await store.saveResearchJob(researchJob({ userId: user.id }));
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'A SHA-256 digest is 256 bits long [1].' }] } }],
    }), { status: 200 });
  };
  const res = await post(handle, '/api/npc', sid, { characterId: 'alice', regionId: 'grove', mode: 'explain', question: 'How long is a SHA-256 digest?' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const view = sent.contents[0].parts[0].text;
  assert.match(view, /learnerSources/);
  assert.match(view, /FIPS 180-4/);
  assert.match(sent.systemInstruction.parts[0].text, /untrusted quoted material/);
  assert.deepEqual(res.body.sources.map(s => s.title), ['FIPS 180-4']);
  assert.equal(res.body.sourcesAvailable, 2);
  assert.equal(res.body.research, null);
});

test('/api/npc without gathered sources sends no learnerSources and suggests the Research Desk', async () => {
  const store = createMemoryStore();
  const handle = createHandler({ store, allowed, gemini: 'g-key', now: () => T0 });
  const sid = await signIn(handle);
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Answer.' }] } }] }), { status: 200 });
  };
  const res = await post(handle, '/api/npc', sid, { characterId: 'alice', regionId: 'grove', mode: 'explain', question: 'What is a hash?' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.doesNotMatch(sent.contents[0].parts[0].text, /learnerSources/);
  assert.doesNotMatch(sent.systemInstruction.parts[0].text, /learnerSources/);
  assert.deepEqual(res.body.sources, []);
  assert.equal(res.body.research, 'research?topic=hash');
});

// ---- News watch ----

test('every news topic keyword points at a real lesson', () => {
  for (const [id] of TOPIC_KEYWORDS) assert.ok(TOPIC_BY_ID[id], `unknown topic ${id}`);
});

test('validateNews keeps same-host https items, resolves relative links, tags topics, and caps the list', () => {
  const nist = NEWS_SOURCES.find(s => s.id === 'nist-csrc');
  const out = validateNews({
    items: [
      { title: 'NIST releases ML-KEM key establishment standard', url: '/news/2026/ml-kem', date: '2026-11-12', summary: 'Final FIPS for a KEM.' },
      { title: 'Off-site', url: 'https://evil.example/x', summary: 'nope' },
      { title: 'Plain http', url: 'http://csrc.nist.gov/a', summary: 'nope' },
      { title: '', url: 'https://csrc.nist.gov/b', summary: 'missing title' },
      { title: 'Dup', url: 'https://csrc.nist.gov/news/2026/ml-kem', summary: 'duplicate link' },
      { title: 'SHA-3 derived functions', url: 'https://csrc.nist.gov/c', date: 'soon', summary: 'Hash update.' },
    ],
  }, nist);
  assert.equal(out.ok, true);
  assert.deepEqual(out.items.map(i => i.url), ['https://csrc.nist.gov/news/2026/ml-kem', 'https://csrc.nist.gov/c']);
  assert.deepEqual(out.items[0].topics, ['dh']);
  assert.equal(out.items[0].date, '2026-11-12');
  assert.equal(out.items[1].date, null);
  assert.deepEqual(out.items[1].topics, ['hash']);
  assert.equal(validateNews({ items: [] }, nist).ok, false);
  assert.equal(validateNews('junk', nist).ok, false);
});

test('news needs a session and reports unconfigured without TinyFish', async () => {
  const store = createMemoryStore();
  const handle = createHandler({ store, allowed, tinyfish: fakeTinyFish({ configured: false }), now: () => T0 });
  const anon = await handle({ method: 'GET', path: '/api/news', headers: {}, body: Buffer.alloc(0) });
  assert.equal(anon.status, 401);
  const sid = await signIn(handle);
  const res = await get(handle, '/api/news', sid);
  assert.equal(res.status, 200);
  assert.equal(res.body.configured, false);
  assert.deepEqual(res.body.sources.map(s => s.status), ['unconfigured', 'unconfigured']);
});

test('one shared run per source per day: learners reuse it, polling is throttled, results are validated', async () => {
  const store = createMemoryStore();
  let clock = T0;
  let done = false;
  const tinyfish = fakeTinyFish({
    run: () => (done
      ? { ok: true, status: 200, data: { status: 'COMPLETED', result: { items: [{ title: 'New PSI protocol from VOLE', url: 'https://eprint.iacr.org/2026/101', summary: 'Private set intersection using VOLE.' }] } } }
      : { ok: true, status: 200, data: { status: 'RUNNING' } }),
  });
  const handle = createHandler({ store, allowed, tinyfish, now: () => clock });
  const ada = await signIn(handle, 'ada');
  const bob = await signIn(handle, 'bob');

  const first = await get(handle, '/api/news', ada);
  assert.equal(tinyfish.calls.start, NEWS_SOURCES.length);
  assert.ok(first.body.sources.every(s => s.status === 'queued' && s.items.length === 0));

  await get(handle, '/api/news', bob);
  assert.equal(tinyfish.calls.start, NEWS_SOURCES.length, 'a second learner shares the same runs');
  assert.equal(tinyfish.calls.get, 0, 'polls wait at least 20 seconds');

  clock += 25_000;
  done = true;
  const later = await get(handle, '/api/news', bob);
  const eprint = later.body.sources.find(s => s.id === 'iacr-eprint');
  const nist = later.body.sources.find(s => s.id === 'nist-csrc');
  assert.equal(eprint.status, 'completed');
  assert.deepEqual(eprint.items[0].topics, ['psi', 'vole']);
  assert.equal(eprint.stale, false);
  assert.equal(nist.status, 'failed', 'an eprint link is off-host for NIST');

  const saved = await store.getResearchJob(newsJobId('iacr-eprint', DAY));
  assert.equal(saved.userId, NEWS_OWNER);

  const read = await post(handle, '/api/news/read', ada, { sourceId: 'iacr-eprint', url: 'https://eprint.iacr.org/2026/101' });
  assert.equal(read.status, 200);
  const user = await store.sessionUser(ada);
  const ev = await store.evidenceFor(user.id);
  assert.equal(ev.at(-1).taskId, 'news-iacr-eprint');
  const bogus = await post(handle, '/api/news/read', ada, { sourceId: 'iacr-eprint', url: 'https://eprint.iacr.org/other' });
  assert.equal(bogus.status, 404);
});

test('a failed day falls back to the latest completed digest and retries after an hour', async () => {
  const store = createMemoryStore();
  const source = NEWS_SOURCES[0];
  await store.saveResearchJob({
    id: newsJobId(source.id, '2026-11-14'),
    userId: NEWS_OWNER,
    fingerprint: 'x',
    day: '2026-11-14',
    status: 'completed',
    items: [{ title: 'Yesterday', url: 'https://csrc.nist.gov/y', date: null, summary: 's', topics: [] }],
    updatedAt: '2026-11-14T12:00:00.000Z',
    expiresAt: T0 + 86_400_000,
  });
  let clock = T0;
  const tinyfish = fakeTinyFish({ start: () => ({ ok: false, status: 502, error: 'down' }) });
  const inflight = new Map();
  const first = await getNews({ store, tinyfish, nowMs: clock, inflight });
  const shown = first.sources.find(s => s.id === source.id);
  assert.equal(shown.status, 'failed');
  assert.equal(shown.stale, true);
  assert.equal(shown.items[0].title, 'Yesterday');
  const starts = tinyfish.calls.start;

  clock += 10 * 60_000;
  await getNews({ store, tinyfish, nowMs: clock, inflight });
  assert.equal(tinyfish.calls.start, starts, 'no retry inside the hour');

  clock = T0 + NEWS_RETRY_MS;
  await getNews({ store, tinyfish, nowMs: clock, inflight });
  assert.equal(tinyfish.calls.start, starts + NEWS_SOURCES.length, 'retries after an hour');
});
