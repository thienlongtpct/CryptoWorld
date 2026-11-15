import { createHash, randomBytes } from 'node:crypto';
import { resolveSubject } from './research-catalog.mjs';
import { recordEvidence } from './evidence.mjs';

async function noteResearchPractice(store, job) {
  if (!job || job.status !== 'completed' || job.subjectId !== 'hash') return;
  await recordEvidence(store, {
    userId: job.userId,
    taskId: 'vd-research',
    version: 1,
    type: 'research',
    assistance: 'unknown',
    result: {
      status: 'completed',
      ok: true,
      subjectId: job.subjectId,
      jobId: job.id,
    },
    at: job.updatedAt || new Date().toISOString(),
  });
}

export const RESEARCH_TTL_MS = 24 * 60 * 60 * 1000;
export const RESEARCH_DAILY_LIMIT = 8;
export const RESEARCH_GOAL_MAX = 500;
export const RESEARCH_EXCERPT_MAX = 480;
export const RESEARCH_SUMMARY_MAX = 400;
export const PROVENANCE_NOTE =
  'Summaries and excerpts were extracted by automation from the listed pages for learning. They are not independently verified.';

/** Structured-output schema requested from TinyFish async automation. */
export const RESOURCE_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    resources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          publisher: { type: 'string' },
          url: { type: 'string' },
          summary: { type: 'string' },
          excerpt: { type: 'string' },
        },
        required: ['title', 'publisher', 'url', 'summary', 'excerpt'],
      },
    },
  },
  required: ['resources'],
};

export function newResearchJobId() {
  return `rj_${randomBytes(12).toString('hex')}`;
}

export function normalizeGoal(goal) {
  return typeof goal === 'string' ? goal.trim().replace(/\s+/g, ' ') : '';
}

export function researchFingerprint(subject, goal) {
  return createHash('sha256')
    .update(`${subject.kind}:${subject.id}\n${normalizeGoal(goal)}`)
    .digest('hex');
}

export function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function clip(text, max) {
  const value = String(text).trim().replace(/\s+/g, ' ');
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function bibliographyCards(subject) {
  return (subject.bibliography || []).map(paper => ({
    kind: 'bibliography',
    paperId: paper.id,
    title: paper.title,
    publisher: paper.venue,
    authors: paper.authors,
    year: paper.year,
    note: paper.note,
    relatedVisualizations: subject.relatedVisualizations.slice(),
  }));
}

export function validateResources(raw, { relatedVisualizations, retrievedAt }) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.resources) ? raw.resources : null;
  if (!list) return { ok: false, error: 'TinyFish returned a malformed resource list.' };
  const resources = [];
  for (const item of list.slice(0, 8)) {
    if (!item || typeof item !== 'object') continue;
    const title = typeof item.title === 'string' ? clip(item.title, 160) : '';
    const publisher = typeof item.publisher === 'string' ? clip(item.publisher, 120) : '';
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    const summary = typeof item.summary === 'string' ? clip(item.summary, RESEARCH_SUMMARY_MAX) : '';
    const excerpt = typeof item.excerpt === 'string' ? clip(item.excerpt, RESEARCH_EXCERPT_MAX) : '';
    if (!title || !publisher || !summary || !excerpt || !isHttpUrl(url)) continue;
    resources.push({
      kind: 'discovered',
      title,
      publisher,
      url,
      summary,
      excerpt,
      retrievedAt,
      relatedVisualizations: relatedVisualizations.slice(),
      provenance: 'automation-extraction',
      verified: false,
    });
  }
  if (!resources.length) return { ok: false, error: 'TinyFish returned no usable resource cards.' };
  return { ok: true, resources };
}

function buildGoal(subject, learningGoal) {
  const urls = subject.startingUrls.map(s => `- ${s.title} (${s.publisher}): ${s.url}`).join('\n');
  return [
    `Learning goal: ${learningGoal}`,
    `Subject: ${subject.title} (${subject.kind} ${subject.id}). Focus on ${subject.learningHint}.`,
    'Visit the starting page and, when helpful, the other listed published sources.',
    'Extract only source-grounded facts. Do not invent citations or claim independent verification.',
    'Return structured resources with title, publisher, canonical URL, a short source-grounded summary, and a short supporting excerpt copied or closely paraphrased from the page.',
    'Published sources to prefer:',
    urls,
  ].join('\n');
}

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    subject: { id: job.subjectId, kind: job.subjectKind, title: job.subjectTitle },
    goal: job.goal,
    cacheHit: Boolean(job.cacheHit),
    resources: job.resources || [],
    bibliography: job.bibliography || [],
    provenance: {
      note: PROVENANCE_NOTE,
      provider: 'tinyfish',
      providerRunId: job.providerRunId || null,
      startingUrl: job.startingUrl || null,
    },
    error: job.error || undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
  };
}

function mapProviderStatus(status) {
  if (status === 'PENDING') return 'queued';
  if (status === 'RUNNING') return 'running';
  if (status === 'COMPLETED') return 'completed';
  if (status === 'FAILED' || status === 'CANCELLED') return 'failed';
  return null;
}

export async function startResearchRequest({ store, tinyfish, user, body, now = Date.now() }) {
  if (!tinyfish?.configured) {
    return {
      status: 503,
      body: {
        error: 'TinyFish is not configured on the account server. Set TINYFISH_API_KEY to enable research.',
        configured: false,
      },
    };
  }

  const resolved = resolveSubject({ topicId: body?.topicId, paperId: body?.paperId });
  if (!resolved.ok) return { status: 400, body: { error: resolved.error } };

  const goal = normalizeGoal(body?.goal);
  if (!goal) return { status: 400, body: { error: 'Send a learning goal.' } };
  if (goal.length > RESEARCH_GOAL_MAX) {
    return { status: 400, body: { error: `Keep the learning goal under ${RESEARCH_GOAL_MAX} characters.` } };
  }

  const subject = resolved.subject;
  const fingerprint = researchFingerprint(subject, goal);
  const existing = await store.findResearchJobByFingerprint(user.id, fingerprint, now);
  if (existing && existing.expiresAt > now && ['queued', 'running', 'completed'].includes(existing.status)) {
    if (existing.status === 'completed') await noteResearchPractice(store, existing);
    return {
      status: 202,
      body: publicJob({
        ...existing,
        cacheHit: true,
        updatedAt: new Date(now).toISOString(),
      }),
    };
  }

  const usage = await store.researchUsageFor(user.id, dayKey(now));
  if (usage >= RESEARCH_DAILY_LIMIT) {
    return {
      status: 429,
      body: { error: 'Daily research limit reached. Try again tomorrow.', limit: RESEARCH_DAILY_LIMIT },
    };
  }

  const id = newResearchJobId();
  const createdAt = new Date(now).toISOString();
  const expiresAt = now + RESEARCH_TTL_MS;
  const starting = subject.startingUrls[0];
  const job = {
    id,
    userId: user.id,
    subjectId: subject.id,
    subjectKind: subject.kind,
    subjectTitle: subject.title,
    goal,
    fingerprint,
    status: 'queued',
    providerRunId: '',
    startingUrl: starting.url,
    startingUrls: subject.startingUrls.map(s => s.url),
    relatedVisualizations: subject.relatedVisualizations.slice(),
    bibliography: bibliographyCards(subject),
    resources: [],
    error: '',
    createdAt,
    updatedAt: createdAt,
    expiresAt,
    cacheHit: false,
  };

  const started = await tinyfish.startAutomation({
    url: starting.url,
    goal: buildGoal(subject, goal),
    outputSchema: RESOURCE_OUTPUT_SCHEMA,
    browserProfile: 'lite',
    agentConfig: { max_steps: 40, max_duration_seconds: 180 },
  });

  if (!started.ok) {
    const status = started.rateLimited ? 429 : started.status === 503 ? 503 : started.status === 504 ? 504 : 502;
    return {
      status,
      body: {
        error: started.error || 'TinyFish could not start research.',
        configured: started.configured !== false,
      },
    };
  }

  job.providerRunId = started.runId || started.data?.run_id || '';
  job.status = 'queued';
  await store.saveResearchJob(job);
  await store.incrementResearchUsage(user.id, dayKey(now));
  return { status: 202, body: publicJob(job) };
}

export async function getResearchRequest({ store, tinyfish, user, jobId, now = Date.now() }) {
  const id = typeof jobId === 'string' ? jobId.trim() : '';
  if (!id) return { status: 400, body: { error: 'Send a research job id.' } };

  const job = await store.getResearchJob(id);
  if (!job || job.userId !== user.id) return { status: 404, body: { error: 'Research job not found.' } };

  if (job.expiresAt <= now) {
    if (job.status !== 'expired') {
      job.status = 'expired';
      job.updatedAt = new Date(now).toISOString();
      job.error = job.error || 'This research job expired.';
      await store.saveResearchJob(job);
    }
    return { status: 410, body: publicJob(job) };
  }

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'expired') {
    return { status: 200, body: publicJob(job) };
  }

  if (!tinyfish?.configured) {
    return {
      status: 503,
      body: {
        ...publicJob(job),
        error: 'TinyFish is not configured on the account server. Set TINYFISH_API_KEY to enable research.',
        configured: false,
      },
    };
  }

  if (!job.providerRunId) {
    job.status = 'failed';
    job.error = 'Research job is missing a provider run id.';
    job.updatedAt = new Date(now).toISOString();
    await store.saveResearchJob(job);
    return { status: 200, body: publicJob(job) };
  }

  const polled = await tinyfish.getRun(job.providerRunId);
  if (!polled.ok) {
    if (polled.status === 504) {
      return { status: 200, body: { ...publicJob(job), error: polled.error } };
    }
    if (polled.rateLimited) {
      return { status: 429, body: { ...publicJob(job), error: polled.error || 'TinyFish rate limit.' } };
    }
    job.status = 'failed';
    job.error = polled.error || 'TinyFish could not load this run.';
    job.updatedAt = new Date(now).toISOString();
    await store.saveResearchJob(job);
    return { status: 200, body: publicJob(job) };
  }

  const run = polled.data || {};
  const mapped = mapProviderStatus(run.status);
  job.updatedAt = new Date(now).toISOString();

  if (mapped === 'queued' || mapped === 'running') {
    job.status = mapped;
    await store.saveResearchJob(job);
    return { status: 200, body: publicJob(job) };
  }

  if (mapped === 'failed') {
    job.status = 'failed';
    job.error = run.error?.message || 'TinyFish automation failed.';
    await store.saveResearchJob(job);
    return { status: 200, body: publicJob(job) };
  }

  if (mapped !== 'completed') {
    job.status = 'failed';
    job.error = 'TinyFish returned an unknown run status.';
    await store.saveResearchJob(job);
    return { status: 200, body: publicJob(job) };
  }

  const validated = validateResources(run.result, {
    relatedVisualizations: job.relatedVisualizations || [],
    retrievedAt: new Date(now).toISOString(),
  });
  if (!validated.ok) {
    job.status = 'failed';
    job.error = validated.error;
    await store.saveResearchJob(job);
    return { status: 200, body: publicJob(job) };
  }

  job.status = 'completed';
  job.resources = validated.resources;
  job.error = '';
  await store.saveResearchJob(job);
  await noteResearchPractice(store, job);
  return { status: 200, body: publicJob(job) };
}
