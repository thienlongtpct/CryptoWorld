import { createHash, randomBytes } from 'node:crypto';
import {
  LAB_CHALLENGE_ID,
  LAB_CODE_MAX,
  LAB_CONCURRENCY,
  LAB_DAILY_LIMIT,
  LAB_TTL_MS,
  SEAL_LAB_TEMPLATE,
} from './lab-template.mjs';
import { processLabJob } from './lab-worker.mjs';

export function newLabJobId() {
  return `lab_${randomBytes(12).toString('hex')}`;
}

export function labFingerprint(code) {
  return createHash('sha256').update(code).digest('hex');
}

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function publicLabJob(job, { executor } = {}) {
  const kind = job.executor || executor || '';
  return {
    id: job.id,
    status: job.status,
    challengeId: job.challengeId,
    cacheHit: Boolean(job.cacheHit),
    executor: kind || undefined,
    stdout: job.stdout || '',
    stderr: job.stderr || '',
    exitCode: job.exitCode ?? null,
    timedOut: Boolean(job.timedOut),
    error: job.error || undefined,
    cleanupError: job.cleanupError || undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
    // Teaching note only — never awards the gate.
    note: 'Running code here does not open the gate. Submit a candidate word through the Forged seal form. The toy seal is weak; a hash alone does not authenticate a sender.',
  };
}

export async function startLabRun({
  store,
  queue,
  maritime,
  runner,
  user,
  body,
  now = Date.now(),
}) {
  const challengeId = typeof body?.challengeId === 'string' ? body.challengeId.trim() : LAB_CHALLENGE_ID;
  if (challengeId !== LAB_CHALLENGE_ID) {
    return { status: 400, body: { error: 'Only the Forged seal lab is available right now.' } };
  }

  const useLocal = runner?.kind === 'local';
  if (!useLocal && !maritime?.configured) {
    return {
      status: 503,
      body: {
        error: 'Maritime is not configured on the account server. Set MARITIME_API_KEY (or LAB_EXECUTOR=local) to enable the workbench.',
        configured: false,
      },
    };
  }

  const code = typeof body?.code === 'string' ? body.code : '';
  if (!code.trim()) return { status: 400, body: { error: 'Send Python source for the lab.' } };
  if (code.length > LAB_CODE_MAX) {
    return { status: 400, body: { error: `Keep lab code under ${LAB_CODE_MAX} characters.` } };
  }

  const fingerprint = labFingerprint(code);
  const existing = await store.findLabJobByFingerprint(user.id, fingerprint, now);
  if (existing && existing.expiresAt > now && ['queued', 'running', 'completed'].includes(existing.status)) {
    return {
      status: 202,
      body: publicLabJob({ ...existing, cacheHit: true }),
    };
  }

  const active = await store.countActiveLabJobs(user.id, now);
  if (active >= LAB_CONCURRENCY) {
    return {
      status: 429,
      body: { error: 'You already have lab runs in progress. Wait for one to finish.', limit: LAB_CONCURRENCY },
    };
  }

  const usage = await store.labUsageFor(user.id, dayKey(now));
  if (usage >= LAB_DAILY_LIMIT) {
    return {
      status: 429,
      body: { error: 'Daily lab limit reached. Try again tomorrow.', limit: LAB_DAILY_LIMIT },
    };
  }

  const id = newLabJobId();
  const createdAt = new Date(now).toISOString();
  const executor = useLocal ? 'local' : 'maritime';
  const job = {
    id,
    userId: user.id,
    challengeId,
    fingerprint,
    code,
    status: 'queued',
    stdout: '',
    stderr: '',
    exitCode: null,
    timedOut: false,
    error: '',
    cleanupError: '',
    sandboxId: '',
    cacheHit: false,
    executor,
    createdAt,
    updatedAt: createdAt,
    expiresAt: now + LAB_TTL_MS,
  };
  await store.saveLabJob(job);
  await store.incrementLabUsage(user.id, dayKey(now));

  if (queue) {
    await queue.enqueue(id);
  } else {
    // No queue injected: process inline (tests may call processLabJob themselves).
    queueMicrotask(() => {
      void processLabJob({ store, maritime, runner, jobId: id }).catch(() => {});
    });
  }

  return { status: 202, body: publicLabJob(job, { executor }) };
}

export async function getLabRun({
  store,
  queue,
  maritime,
  runner,
  user,
  jobId,
  now = Date.now(),
}) {
  const id = typeof jobId === 'string' ? jobId.trim() : '';
  if (!id) return { status: 400, body: { error: 'Send a lab run id.' } };

  let job = await store.getLabJob(id);
  if (!job || job.userId !== user.id) return { status: 404, body: { error: 'Lab run not found.' } };

  if (job.expiresAt <= now) {
    if (job.status !== 'expired') {
      job = {
        ...job,
        status: 'expired',
        error: job.error || 'This lab run expired.',
        updatedAt: new Date(now).toISOString(),
      };
      await store.saveLabJob(job);
    }
    return { status: 410, body: publicLabJob(job) };
  }

  // Local/dev resilience: if the inline worker missed a queued job, process on poll.
  if (job.status === 'queued' && queue?.kind === 'inline') {
    await queue.enqueue(job.id);
  }

  return { status: 200, body: publicLabJob(job) };
}

export { SEAL_LAB_TEMPLATE };
