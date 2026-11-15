import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import {
  LAB_CMD_TIMEOUT_MS,
  LAB_OUTPUT_MAX,
  LAB_REMOTE_CMD,
} from './lab-template.mjs';
import { recordEvidence } from './evidence.mjs';

export function clip(text, max = LAB_OUTPUT_MAX) {
  const value = typeof text === 'string' ? text : text == null ? '' : String(text);
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n…[truncated]`;
}

/** Local Python runner for LAB_EXECUTOR=local — fixed argv, no shell. */
export function createLocalLabRunner({ spawnImpl = spawn, timeoutMs = LAB_CMD_TIMEOUT_MS } = {}) {
  return {
    kind: 'local',
    async run(code) {
      const dir = mkdtempSync(join(tmpdir(), 'cryptoworld-lab-'));
      const file = join(dir, 'learner.py');
      writeFileSync(file, code, 'utf8');
      try {
        const result = await new Promise(resolve => {
          // No inherited environment: the server's API keys and database URL must not be readable
          // from learner code (os.environ). PATH stays so python3 can be found.
          const child = spawnImpl('python3', [file], {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: dir,
            env: { PATH: process.env.PATH || '/usr/bin:/bin', LANG: 'C.UTF-8', PYTHONIOENCODING: 'utf-8' },
          });
          let stdout = '';
          let stderr = '';
          let settled = false;
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill('SIGKILL');
            resolve({ stdout, stderr, exitCode: null, timedOut: true, error: 'The lab command timed out.' });
          }, timeoutMs);
          child.stdout.on('data', chunk => { stdout += chunk; });
          child.stderr.on('data', chunk => { stderr += chunk; });
          child.on('error', err => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({
              stdout,
              stderr,
              exitCode: null,
              timedOut: false,
              error: err.code === 'ENOENT' ? 'python3 is not available on this server.' : 'Could not start python3.',
            });
          });
          child.on('close', code => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ stdout, stderr, exitCode: code, timedOut: false, error: '' });
          });
        });
        return result;
      } finally {
        try {
          rmSync(dir, { recursive: true, force: true });
        } catch {
          // Local temp cleanup is best-effort.
        }
      }
    },
  };
}

/**
 * Run one durable lab job. Always attempts sandbox cleanup when a box was created.
 * Successful execution / printed PASS text does not award dungeon progress.
 */
export async function processLabJob({ store, maritime, runner, jobId, now = Date.now() }) {
  const job = await store.getLabJob(jobId);
  if (!job) return null;
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'expired') return job;
  if (job.expiresAt <= now) {
    const expired = {
      ...job,
      status: 'expired',
      error: job.error || 'This lab run expired.',
      updatedAt: new Date(now).toISOString(),
    };
    await store.saveLabJob(stripSecrets(expired));
    return expired;
  }

  const started = {
    ...job,
    status: 'running',
    updatedAt: new Date(now).toISOString(),
    error: '',
  };
  await store.saveLabJob(stripSecrets(started));

  let sandboxId = '';
  let cleanupError = '';
  try {
    let stdout = '';
    let stderr = '';
    let exitCode = null;
    let timedOut = false;
    let error = '';

    if (runner?.kind === 'local') {
      const local = await runner.run(job.code);
      stdout = local.stdout;
      stderr = local.stderr;
      exitCode = local.exitCode;
      timedOut = local.timedOut;
      error = local.error || (timedOut ? 'The lab command timed out.' : '');
    } else {
      if (!maritime?.configured) {
        throw Object.assign(new Error('Maritime is not configured.'), { status: 503 });
      }
      const box = await maritime.createEphemeral({
        name: `cryptoworld-lab-${job.id.slice(0, 12)}`,
        idleMinutes: 2,
        timeLimitMinutes: 10,
        size: 'small',
        from: 'python',
        idempotencyKey: job.id,
        env: {
          // Encoded transfer — not interpolated into a shell string by the worker.
          LAB_CODE_B64: Buffer.from(job.code, 'utf8').toString('base64'),
        },
      });
      if (!box.ok) {
        throw Object.assign(new Error(box.error || 'Could not create a Maritime sandbox.'), { status: box.status });
      }
      const data = box.data || {};
      sandboxId = data.id || '';
      const dataPlaneUrl = data.dataPlaneUrl || data.data_plane_url || '';
      const secret = data.secret || '';
      started.sandboxId = sandboxId;

      let written = await maritime.writeFile({
        dataPlaneUrl,
        secret,
        path: '/tmp/learner.py',
        content: job.code,
      });
      if (!written.ok) {
        // Fallback: decode LAB_CODE_B64 with a fixed command (no learner text in the cmd string).
        const decodeCmd = 'python3 -c "import base64,os,pathlib; pathlib.Path(\'/tmp/learner.py\').write_bytes(base64.standard_b64decode(os.environ[\'LAB_CODE_B64\']))"';
        written = await maritime.runCommand({ dataPlaneUrl, secret, cmd: decodeCmd, timeoutMs: LAB_CMD_TIMEOUT_MS });
        if (!written.ok) {
          throw Object.assign(new Error(written.error || 'Could not write learner code into the sandbox.'), { status: written.status });
        }
      }

      const ran = await maritime.runCommand({
        dataPlaneUrl,
        secret,
        cmd: LAB_REMOTE_CMD,
        timeoutMs: LAB_CMD_TIMEOUT_MS,
      });
      if (!ran.ok && ran.status === 504) {
        timedOut = true;
        error = 'The lab command timed out.';
      } else if (!ran.ok) {
        error = ran.error || 'Maritime could not run the lab command.';
      } else {
        const out = ran.data || {};
        stdout = out.stdout ?? out.Stdout ?? '';
        stderr = out.stderr ?? out.Stderr ?? '';
        exitCode = Number.isFinite(out.exitCode) ? out.exitCode
          : Number.isFinite(out.exit_code) ? out.exit_code
            : null;
      }
    }

    const finished = {
      ...started,
      status: timedOut || error ? 'failed' : 'completed',
      stdout: clip(stdout),
      stderr: clip(stderr),
      exitCode,
      timedOut,
      error,
      sandboxId: '',
      dataPlaneUrl: '',
      secret: '',
      cleanupError: '',
      updatedAt: new Date(Date.now()).toISOString(),
    };

    if (sandboxId && maritime?.configured) {
      const killed = await maritime.killEphemeral(sandboxId);
      if (!killed.ok && killed.status !== 404) {
        finished.cleanupError = 'Sandbox cleanup did not finish cleanly.';
        cleanupError = finished.cleanupError;
      }
    }

    await store.saveLabJob(stripSecrets(finished));
    // Lab evidence is practice only — stdout PASS text never awards assessed skills.
    await recordEvidence(store, {
      userId: finished.userId,
      taskId: 'vd-lab',
      version: 1,
      type: 'lab',
      assistance: 'unknown',
      result: {
        status: finished.status,
        exitCode: finished.exitCode,
        timedOut: finished.timedOut === true,
        ok: finished.status === 'completed',
        challengeId: finished.challengeId || 'seal',
      },
      at: finished.updatedAt,
    });
    return { ...finished, cleanupError };
  } catch (err) {
    if (sandboxId && maritime?.configured) {
      try {
        const killed = await maritime.killEphemeral(sandboxId);
        if (!killed.ok && killed.status !== 404) cleanupError = 'Sandbox cleanup did not finish cleanly.';
      } catch {
        cleanupError = 'Sandbox cleanup did not finish cleanly.';
      }
    }
    const failed = {
      ...started,
      status: 'failed',
      error: err?.message || 'Lab run failed.',
      sandboxId: '',
      dataPlaneUrl: '',
      secret: '',
      cleanupError,
      updatedAt: new Date(Date.now()).toISOString(),
    };
    await store.saveLabJob(stripSecrets(failed));
    return failed;
  }
}

function stripSecrets(job) {
  const copy = { ...job };
  delete copy.secret;
  delete copy.dataPlaneUrl;
  // Keep sandboxId only while running for rare debug; never return to clients.
  if (copy.status === 'completed' || copy.status === 'failed' || copy.status === 'expired') {
    copy.sandboxId = '';
  }
  return copy;
}

