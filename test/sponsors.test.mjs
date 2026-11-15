import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { createMemoryStore } from '../server/store.mjs';
import {
  PLACEHOLDER_MARITIME,
  PLACEHOLDER_TINYFISH,
  maritimeKeyFromEnv,
  readiness,
  resolveSecret,
  tinyfishKeyFromEnv,
} from '../server/sponsors.mjs';
import { createTinyFish } from '../server/tinyfish.mjs';
import { createMaritime } from '../server/maritime.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = loadAllowed(root);

test('placeholder and blank secrets count as unconfigured', () => {
  assert.equal(resolveSecret('', PLACEHOLDER_TINYFISH), '');
  assert.equal(resolveSecret('   ', PLACEHOLDER_TINYFISH), '');
  assert.equal(resolveSecret(PLACEHOLDER_TINYFISH, PLACEHOLDER_TINYFISH), '');
  assert.equal(resolveSecret(PLACEHOLDER_MARITIME, PLACEHOLDER_MARITIME), '');
  assert.equal(resolveSecret('real-key', PLACEHOLDER_TINYFISH), 'real-key');
  assert.equal(tinyfishKeyFromEnv({ TINYFISH_API_KEY: PLACEHOLDER_TINYFISH }), '');
  assert.equal(maritimeKeyFromEnv({ MARITIME_API_KEY: PLACEHOLDER_MARITIME }), '');
  assert.equal(tinyfishKeyFromEnv({ TINYFISH_API_KEY: 'tf-live' }), 'tf-live');
});

test('readiness exposes only booleans', () => {
  const off = readiness({
    gemini: '',
    tinyfish: createTinyFish({ apiKey: PLACEHOLDER_TINYFISH }),
    maritime: createMaritime({ apiKey: PLACEHOLDER_MARITIME }),
  });
  assert.deepEqual(off, { gemini: false, tinyfish: false, maritime: false, tigerdata: false });

  const on = readiness({
    gemini: 'g',
    tinyfish: createTinyFish({ apiKey: 'tf-live' }),
    maritime: createMaritime({ apiKey: 'mk-live' }),
  });
  assert.deepEqual(on, { gemini: true, tinyfish: true, maritime: true, tigerdata: false });
  assert.equal(JSON.stringify(on).includes('tf-live'), false);
});

test('TinyFish adapter refuses work without a live key and calls async automation with fetch', async () => {
  const disabled = createTinyFish({ apiKey: PLACEHOLDER_TINYFISH });
  assert.equal(disabled.configured, false);
  const blocked = await disabled.startAutomation({
    url: 'https://example.com',
    goal: 'Extract the title',
  });
  assert.equal(blocked.status, 503);
  assert.equal(blocked.configured, false);

  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    if (String(url).includes('/v1/runs/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ run_id: 'run-1', status: 'COMPLETED', result: { title: 'Example' } }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ run_id: 'run-1', error: null }),
    };
  };
  const live = createTinyFish({ apiKey: 'tf-test-key', fetchImpl: fakeFetch, baseUrl: 'https://agent.example' });
  assert.equal(live.configured, true);
  const started = await live.startAutomation({
    url: 'https://example.com',
    goal: 'Extract the title',
    outputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  });
  assert.equal(started.ok, true);
  assert.equal(started.runId, 'run-1');
  assert.equal(calls[0].url, 'https://agent.example/v1/automation/run-async');
  assert.equal(calls[0].init.headers['X-API-Key'], 'tf-test-key');
  const polled = await live.getRun('run-1');
  assert.equal(polled.ok, true);
  assert.equal(polled.data.status, 'COMPLETED');
  assert.equal(JSON.stringify(started).includes('tf-test-key'), false);
});

test('Maritime adapter refuses work without a live key and creates ephemeral sandboxes with fetch', async () => {
  const disabled = createMaritime({ apiKey: PLACEHOLDER_MARITIME });
  assert.equal(disabled.configured, false);
  const blocked = await disabled.createEphemeral({ idleMinutes: 5 });
  assert.equal(blocked.status, 503);
  assert.equal(blocked.configured, false);

  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    if (String(url).includes('/commands') || String(url).includes('/files')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ exitCode: 0, stdout: 'ok', stderr: '' }),
      };
    }
    return {
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 'sbx-1', state: 'running', dataPlaneUrl: 'https://plane.example/v1', secret: 'tok' }),
    };
  };
  const live = createMaritime({ apiKey: 'mk-test-key', fetchImpl: fakeFetch, baseUrl: 'https://api.example' });
  const created = await live.createEphemeral({ idleMinutes: 5, timeLimitMinutes: 30, size: 'small' });
  assert.equal(created.ok, true);
  assert.equal(created.data.id, 'sbx-1');
  assert.equal(calls[0].url, 'https://api.example/api/sandboxes/ephemeral');
  assert.equal(calls[0].init.headers.authorization, 'Bearer mk-test-key');
  const ran = await live.runCommand({
    dataPlaneUrl: 'https://plane.example/v1',
    secret: 'tok',
    cmd: 'python3 /tmp/learner.py',
  });
  assert.equal(ran.ok, true);
  assert.equal(calls.some(c => String(c.url).endsWith('/commands')), true);
  const cmdCall = calls.find(c => String(c.url).endsWith('/commands'));
  assert.equal(JSON.parse(cmdCall.init.body).cmd, 'python3 /tmp/learner.py');
  assert.equal(JSON.stringify(created).includes('mk-test-key'), false);
});

test('health reflects injectable sponsor providers without leaking secrets', async () => {
  const handle = createHandler({
    store: createMemoryStore(),
    allowed,
    gemini: 'g-key',
    tinyfish: createTinyFish({ apiKey: 'tf-live' }),
    maritime: createMaritime({ apiKey: PLACEHOLDER_MARITIME }),
  });
  const result = await handle({ method: 'GET', path: '/api/health', headers: {}, body: Buffer.alloc(0) });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { ok: true, gemini: true, tinyfish: true, maritime: false, tigerdata: false });
  const raw = JSON.stringify(result.body);
  assert.equal(raw.includes('g-key'), false);
  assert.equal(raw.includes('tf-live'), false);
  assert.equal(raw.includes(PLACEHOLDER_MARITIME), false);
});
