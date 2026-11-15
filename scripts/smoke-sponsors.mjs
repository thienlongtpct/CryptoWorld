#!/usr/bin/env node
/**
 * Opt-in live sponsor smoke AFTER real keys are configured on the account API.
 * Not run by ordinary CI (paid TinyFish / Maritime calls).
 *
 * Usage:
 *   SITE_URL=https://<distribution> node scripts/smoke-sponsors.mjs
 *   # or: node scripts/smoke-sponsors.mjs https://<distribution>
 *
 * Requires a throwaway account; prints job ids/status only — never API keys.
 */
import { randomBytes } from 'node:crypto';

const base = (process.env.SITE_URL || process.argv[2] || '').replace(/\/$/, '');
if (!base) {
  console.error('Set SITE_URL or pass the CloudFront SiteUrl.');
  process.exit(2);
}

function cookieFrom(res) {
  const raw = res.headers.getSetCookie?.() || [];
  if (raw.length) return raw.map(c => c.split(';')[0]).join('; ');
  const single = res.headers.get('set-cookie');
  return single ? single.split(';')[0] : '';
}

async function json(method, path, { cookie = '', body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data, cookie: cookieFrom(res) || cookie };
}

const health = await json('GET', '/api/health');
if (!health.data.ok) throw new Error('health failed');
console.log(`health gemini=${Boolean(health.data.gemini)} tinyfish=${Boolean(health.data.tinyfish)} maritime=${Boolean(health.data.maritime)}`);

if (!health.data.tinyfish && !health.data.maritime) {
  console.error('Neither TinyFish nor Maritime is configured on this deployment. Live sponsor smoke pending.');
  process.exit(1);
}

const user = `smoke_${randomBytes(3).toString('hex')}`;
const password = `Smoke-${randomBytes(6).toString('hex')}-9`;
const reg = await json('POST', '/api/register', { body: { username: user, password } });
if (reg.res.status !== 201) throw new Error(`register ${reg.res.status}: ${reg.data.error || ''}`);
const sid = reg.cookie;
console.log(`account ok (${user})`);

if (health.data.tinyfish) {
  const start = await json('POST', '/api/research', {
    cookie: sid,
    body: {
      topicId: 'hash',
      goal: 'Smoke: one SHA-256 digest check source for VisuCrypto deploy verification.',
    },
  });
  if (start.res.status !== 202) throw new Error(`research start ${start.res.status}: ${start.data.error || ''}`);
  console.log(`tinyfish job ${start.data.id} status=${start.data.status}`);
  let job = start.data;
  for (let i = 0; i < 40; i += 1) {
    await new Promise(r => setTimeout(r, 3000));
    const polled = await json('GET', `/api/research/${encodeURIComponent(start.data.id)}`, { cookie: sid });
    job = polled.data;
    console.log(`tinyfish poll ${job.status}`);
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'expired') break;
  }
  if (job.status !== 'completed') throw new Error(`TinyFish job ended as ${job.status}: ${job.error || ''}`);
  console.log(`tinyfish ok resources=${(job.resources || []).length}`);
} else {
  console.log('tinyfish skipped (not configured)');
}

if (health.data.maritime) {
  const code = [
    'print("smoke")',
    'print("same_seal FLEA")',
  ].join('\n');
  const start = await json('POST', '/api/lab-runs', {
    cookie: sid,
    body: { challengeId: 'seal', code },
  });
  if (start.res.status !== 202) throw new Error(`lab start ${start.res.status}: ${start.data.error || ''}`);
  console.log(`maritime job ${start.data.id} status=${start.data.status} executor=${start.data.executor || '?'}`);
  let job = start.data;
  for (let i = 0; i < 40; i += 1) {
    await new Promise(r => setTimeout(r, 3000));
    const polled = await json('GET', `/api/lab-runs/${encodeURIComponent(start.data.id)}`, { cookie: sid });
    job = polled.data;
    console.log(`maritime poll ${job.status}`);
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'expired') break;
  }
  if (job.status !== 'completed') throw new Error(`Maritime job ended as ${job.status}: ${job.error || ''}`);
  console.log(`maritime ok exit=${job.exitCode} cleanup=${job.cleanupError || 'ok'}`);
} else {
  console.log('maritime skipped (not configured)');
}

console.log('sponsor smoke finished (no keys printed)');
