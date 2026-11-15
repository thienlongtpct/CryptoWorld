// "What's new in cryptography": one shared TinyFish run per allowlisted source per UTC day,
// cached in the research-job table under a system owner and served to every signed-in learner.
// A learner never starts a run directly; GET /api/news starts today's run when none exists.
import { recordEvidence } from './evidence.mjs';

export const NEWS_OWNER = 'system:news';
export const NEWS_TTL_MS = 4 * 24 * 60 * 60 * 1000;
export const NEWS_RETRY_MS = 60 * 60 * 1000;
export const NEWS_POLL_MS = 20 * 1000;
export const NEWS_FALLBACK_DAYS = 3;
export const NEWS_ITEM_MAX = 6;
export const NEWS_NOTE =
  'Headlines and summaries were extracted by TinyFish browser automation from the listed pages once a day. They are not independently verified. Open the source before relying on them.';

/** Allowlisted pages. Item URLs must stay on the listed hosts. */
export const NEWS_SOURCES = [
  {
    id: 'nist-csrc',
    title: 'NIST Computer Security Resource Center',
    url: 'https://csrc.nist.gov/news',
    hosts: ['csrc.nist.gov', 'www.nist.gov', 'nist.gov'],
    focus: 'news, announcements, draft and final publications about cryptographic standards (for example post-quantum cryptography, hash functions, block ciphers, key establishment)',
  },
  {
    id: 'iacr-eprint',
    title: 'IACR Cryptology ePrint Archive (last 7 days)',
    url: 'https://eprint.iacr.org/days/7',
    hosts: ['eprint.iacr.org'],
    focus: 'recent papers; prefer ones about private set intersection, oblivious transfer, OPRF, VOLE, secret sharing, zero knowledge, garbled circuits, or hash functions',
  },
];

/** Lesson topics a headline can point to. Ids must exist in src/vis/registry.ts. */
export const TOPIC_KEYWORDS = [
  ['psi', /private set intersection|\bpsi\b/i],
  ['psu', /private set union|\bpsu\b/i],
  ['ot', /oblivious transfer/i],
  ['oprf', /\boprf\b|oblivious pseudo-?random/i],
  ['vole', /\bvole\b|vector oblivious linear/i],
  ['okvs', /\bokvs\b|key-?value store/i],
  ['zk', /zero[- ]knowledge|\bzk-?(snark|stark)?\b|\bsnarks?\b/i],
  ['ss', /secret[- ]sharing|threshold/i],
  ['gc', /garbled|two-party computation|\b2pc\b|\bmpc\b|multi-?party computation/i],
  ['hash', /\bhash|\bsha-?[0-9]|sha3|keccak|collision/i],
  ['commit', /commitment/i],
  ['rsa', /\brsa\b/i],
  ['dh', /diffie|key exchange|key establishment|\bkem\b|ml-kem|kyber/i],
  ['blockcipher', /\baes\b|block cipher|rijndael/i],
  ['modes', /mode of operation|\bgcm\b|\bcbc\b/i],
];

export const NEWS_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          date: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['title', 'url', 'summary'],
      },
    },
  },
  required: ['items'],
};

const dayKey = ms => new Date(ms).toISOString().slice(0, 10);
export const newsJobId = (sourceId, day) => `news_${sourceId}_${day}`;

function clip(text, max) {
  const value = String(text ?? '').trim().replace(/\s+/g, ' ');
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export function relatedTopics(text) {
  return TOPIC_KEYWORDS.filter(([, re]) => re.test(text)).map(([id]) => id).slice(0, 3);
}

/** Keep well-formed items whose links stay on the source's hosts. */
export function validateNews(raw, source) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : null;
  if (!list) return { ok: false, error: 'TinyFish returned a malformed headline list.' };
  const items = [];
  const seen = new Set();
  for (const item of list) {
    if (items.length >= NEWS_ITEM_MAX) break;
    if (!item || typeof item !== 'object') continue;
    const title = clip(item.title, 200);
    const summary = clip(item.summary, 320);
    let url;
    try {
      url = new URL(String(item.url ?? '').trim(), source.url);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' || !source.hosts.includes(url.hostname)) continue;
    if (!title || !summary || seen.has(url.href)) continue;
    seen.add(url.href);
    const date = typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.date.trim()) ? item.date.trim().slice(0, 10) : null;
    items.push({ title, url: url.href, date, summary, topics: relatedTopics(`${title} ${summary}`) });
  }
  if (!items.length) return { ok: false, error: 'TinyFish returned no usable headlines.' };
  return { ok: true, items };
}

function goalFor(source) {
  return [
    `List up to ${NEWS_ITEM_MAX} of the most recent items on this page: ${source.focus}.`,
    'For each item give the exact title shown, its absolute link on the same site, its date as YYYY-MM-DD when shown, and a one or two sentence plain-language summary grounded only in what the page says.',
    'Do not follow links to other sites. Do not invent items, dates, or links.',
  ].join(' ');
}

function mapStatus(status) {
  if (status === 'PENDING') return 'queued';
  if (status === 'RUNNING') return 'running';
  if (status === 'COMPLETED') return 'completed';
  if (status === 'FAILED' || status === 'CANCELLED') return 'failed';
  return null;
}

function newJob(source, day, nowMs) {
  const at = new Date(nowMs).toISOString();
  return {
    id: newsJobId(source.id, day),
    userId: NEWS_OWNER,
    subjectId: `news:${source.id}`,
    subjectKind: 'news',
    subjectTitle: source.title,
    fingerprint: `news:${source.id}:${day}`,
    day,
    status: 'queued',
    providerRunId: '',
    startingUrl: source.url,
    items: [],
    error: '',
    createdAt: at,
    updatedAt: at,
    polledAt: nowMs, // the first poll waits NEWS_POLL_MS after the start
    expiresAt: nowMs + NEWS_TTL_MS,
  };
}

/** Start, poll, or reuse today's run for one source. Returns the job (or null when unconfigured). */
async function refreshSource({ store, tinyfish, source, nowMs, inflight }) {
  const day = dayKey(nowMs);
  const id = newsJobId(source.id, day);
  let job = await store.getResearchJob(id);
  const retry = job?.status === 'failed' && nowMs - Date.parse(job.updatedAt) >= NEWS_RETRY_MS;

  if ((!job || retry) && tinyfish?.configured) {
    if (inflight.has(id)) return inflight.get(id);
    const starting = (async () => {
      const fresh = newJob(source, day, nowMs);
      await store.saveResearchJob(fresh); // claim the day before the paid call
      const started = await tinyfish.startAutomation({
        url: source.url,
        goal: goalFor(source),
        outputSchema: NEWS_OUTPUT_SCHEMA,
        browserProfile: 'lite',
        agentConfig: { max_steps: 25, max_duration_seconds: 150 },
      });
      if (started.ok) fresh.providerRunId = started.runId || started.data?.run_id || '';
      else {
        fresh.status = 'failed';
        fresh.error = started.error || 'TinyFish could not start the news run.';
      }
      fresh.updatedAt = new Date(nowMs).toISOString();
      await store.saveResearchJob(fresh);
      return fresh;
    })().finally(() => inflight.delete(id));
    inflight.set(id, starting);
    return starting;
  }
  if (!job) return null;

  const pending = job.status === 'queued' || job.status === 'running';
  if (pending && job.providerRunId && tinyfish?.configured && nowMs - (job.polledAt || 0) >= NEWS_POLL_MS) {
    const polled = await tinyfish.getRun(job.providerRunId);
    job.polledAt = nowMs;
    job.updatedAt = new Date(nowMs).toISOString();
    if (!polled.ok) {
      if (polled.status !== 504 && !polled.rateLimited) {
        job.status = 'failed';
        job.error = polled.error || 'TinyFish could not load the news run.';
      }
    } else {
      const mapped = mapStatus(polled.data?.status);
      if (mapped === 'queued' || mapped === 'running') job.status = mapped;
      else if (mapped === 'completed') {
        const checked = validateNews(polled.data?.result, source);
        if (checked.ok) {
          job.status = 'completed';
          job.items = checked.items;
          job.error = '';
        } else {
          job.status = 'failed';
          job.error = checked.error;
        }
      } else {
        job.status = 'failed';
        job.error = polled.data?.error?.message || 'TinyFish news run failed.';
      }
    }
    await store.saveResearchJob(job);
  }
  return job;
}

async function latestCompleted(store, source, nowMs) {
  for (let back = 1; back <= NEWS_FALLBACK_DAYS; back++) {
    const job = await store.getResearchJob(newsJobId(source.id, dayKey(nowMs - back * 86_400_000)));
    if (job?.status === 'completed' && job.expiresAt > nowMs) return job;
  }
  return null;
}

/**
 * @returns {Promise<{ configured: boolean, note: string, sources: Array<object> }>}
 */
export async function getNews({ store, tinyfish, nowMs = Date.now(), inflight = new Map() }) {
  const sources = [];
  for (const source of NEWS_SOURCES) {
    const today = await refreshSource({ store, tinyfish, source, nowMs, inflight });
    const shown = today?.status === 'completed' ? today : await latestCompleted(store, source, nowMs);
    sources.push({
      id: source.id,
      title: source.title,
      url: source.url,
      status: today?.status ?? (tinyfish?.configured ? 'queued' : 'unconfigured'),
      day: shown?.day ?? null,
      stale: Boolean(shown && shown !== today),
      retrievedAt: shown?.updatedAt ?? null,
      items: shown?.items ?? [],
    });
  }
  return { configured: Boolean(tinyfish?.configured), note: NEWS_NOTE, sources };
}

/** Record that a learner opened a headline tied to a lesson (practice evidence, not assessed). */
export async function noteNewsRead(store, userId, { sourceId, url, nowMs = Date.now() }) {
  const source = NEWS_SOURCES.find(item => item.id === sourceId);
  if (!source) return null;
  const job = await store.getResearchJob(newsJobId(source.id, dayKey(nowMs)))
    ?? await latestCompleted(store, source, nowMs);
  const item = job?.items?.find(entry => entry.url === url);
  if (!item) return null;
  return recordEvidence(store, {
    userId,
    taskId: `news-${source.id}`,
    type: 'research',
    assistance: 'unknown',
    result: { ok: true, sourceId: source.id, url: item.url, topics: item.topics },
    at: new Date(nowMs).toISOString(),
  });
}
