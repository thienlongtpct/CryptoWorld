// End-to-end harness: serves the built single-page site and the real account API on one origin,
// with an in-memory store and fake Gemini, TinyFish and Maritime endpoints at the HTTP boundary.
// The real adapters (npc.mjs, tinyfish.mjs, maritime.mjs) and the lab worker run unchanged.
// The fake Maritime sandbox runs the learner's Python on this machine with python3.
//
//   npm run build && node --experimental-strip-types e2e/server.mjs
//
// GET /__e2e/calls returns which sponsor endpoints were hit, so tests can check the wiring.
// POST /__e2e/advance?ms=N moves the server clock forward, so throttled polls (the daily news watch
// polls TinyFish at most every 20 s) run without real waiting.

import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from '../server/app.mjs';
import { loadAllowed } from '../server/allowed.mjs';
import { createMemoryStore } from '../server/store.mjs';
import { createTinyFish } from '../server/tinyfish.mjs';
import { createMaritime } from '../server/maritime.mjs';
import { createInlineLabQueue } from '../server/lab-queue.mjs';
import { processLabJob } from '../server/lab-worker.mjs';
import { LAB_CODE_MAX } from '../server/lab-template.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.E2E_PORT || 8799);
const page = readFileSync(join(root, 'dist', 'index.html'));

/** Every sponsor request the fakes answered: { sponsor, method, path, detail }. */
const calls = [];

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

// ---- Gemini -------------------------------------------------------------------------------------
async function fakeGemini(url, init) {
  const body = JSON.parse(String(init?.body || '{}'));
  const parts = body.contents?.[0]?.parts ?? [];
  const view = parts.find(part => part.text?.startsWith('Permitted view:'))?.text ?? '';
  const question = (parts.find(part => part.text?.startsWith('Question:'))?.text ?? '').replace(/^Question:\n/, '');
  calls.push({ sponsor: 'gemini', method: 'POST', path: new URL(url).pathname, detail: { question, view } });
  return json(200, {
    candidates: [{
      finishReason: 'STOP',
      content: { parts: [{ text: `[fake Gemini tutor] Good question about "${question.slice(0, 80)}". Think about who sent each value across the bridge, and who could hear it.` }] },
    }],
  });
}

// ---- TinyFish -----------------------------------------------------------------------------------
const runs = new Map();
async function fakeTinyFish(url, init) {
  const { pathname } = new URL(url);
  if (pathname === '/v1/automation/run-async') {
    const body = JSON.parse(String(init?.body || '{}'));
    const id = `run_e2e_${runs.size + 1}`;
    const news = Array.isArray(body.output_schema?.required) && body.output_schema.required.includes('items');
    runs.set(id, { body, news, polls: 0 });
    calls.push({ sponsor: 'tinyfish', method: 'POST', path: pathname, detail: { kind: news ? 'news' : 'research', url: body.url } });
    return json(200, { run_id: id });
  }
  const match = /^\/v1\/runs\/([A-Za-z0-9_-]+)$/.exec(pathname);
  const run = match && runs.get(match[1]);
  if (!run) return json(404, { error: { message: 'Unknown run.' } });
  calls.push({ sponsor: 'tinyfish', method: 'GET', path: pathname, detail: { kind: run.news ? 'news' : 'research' } });
  run.polls += 1;
  // First poll reports RUNNING so the UI's in-progress state is exercised too.
  if (run.polls === 1) return json(200, { run_id: match[1], status: 'RUNNING', result: null });
  const origin = new URL(run.body.url).origin;
  const result = run.news
    ? { items: [
      { title: 'E2E headline: new hash function guidance', url: `${origin}/e2e/hash-guidance`, date: '2026-11-14', summary: 'A fake headline from the e2e TinyFish so the news watch has something to show.' },
      { title: 'E2E headline: private set intersection at scale', url: `${origin}/e2e/psi-scale`, date: '2026-11-13', summary: 'A second fake headline about PSI so related topics link up.' },
    ] }
    : { resources: [{
      title: 'Secure Hash Standard (FIPS 180-4)',
      publisher: 'NIST',
      url: run.body.url,
      summary: 'Defines SHA-256 and the other SHA-2 hash functions used to check downloads.',
      excerpt: 'A hash function produces a condensed representation of a message, called a message digest.',
    }] };
  return json(200, { run_id: match[1], status: 'COMPLETED', result });
}

// ---- Maritime -----------------------------------------------------------------------------------
const sandboxes = new Map();
function runPython(code) {
  const dir = mkdtempSync(join(tmpdir(), 'cryptoworld-e2e-'));
  const file = join(dir, 'learner.py');
  writeFileSync(file, code, 'utf8');
  return new Promise(resolve => {
    const child = spawn('python3', [file], { stdio: ['ignore', 'pipe', 'pipe'], cwd: dir, env: { PATH: process.env.PATH || '/usr/bin:/bin', LANG: 'C.UTF-8' } });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 10_000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => {
      clearTimeout(timer);
      rmSync(dir, { recursive: true, force: true });
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

async function fakeMaritime(url, init) {
  const parsed = new URL(url);
  const method = init?.method || 'GET';
  if (parsed.hostname === 'api.maritime.sh') {
    if (parsed.pathname === '/api/sandboxes/ephemeral' && method === 'POST') {
      const id = `sbx_e2e_${sandboxes.size + 1}`;
      sandboxes.set(id, { files: new Map() });
      calls.push({ sponsor: 'maritime', method, path: parsed.pathname, detail: { id } });
      return json(201, { id, dataPlaneUrl: `https://${id}.sandbox.maritime.e2e`, secret: `secret_${id}` });
    }
    const kill = /^\/api\/sandboxes\/ephemeral\/([^/]+)$/.exec(parsed.pathname);
    if (kill && method === 'DELETE') {
      sandboxes.delete(kill[1]);
      calls.push({ sponsor: 'maritime', method, path: parsed.pathname, detail: {} });
      return json(200, { ok: true });
    }
    return json(404, { message: 'Unknown Maritime route.' });
  }
  const id = parsed.hostname.split('.')[0];
  const box = sandboxes.get(id);
  if (!box || init?.headers?.['X-Maritime-Token'] !== `secret_${id}`) return json(401, { message: 'Bad sandbox token.' });
  if (parsed.pathname === '/files' && method === 'PUT') {
    box.files.set(parsed.searchParams.get('path'), String(init.body ?? ''));
    calls.push({ sponsor: 'maritime', method, path: '/files', detail: { path: parsed.searchParams.get('path') } });
    return json(200, { ok: true });
  }
  if (parsed.pathname === '/commands' && method === 'POST') {
    const { cmd } = JSON.parse(String(init.body || '{}'));
    calls.push({ sponsor: 'maritime', method, path: '/commands', detail: { cmd } });
    const code = box.files.get('/tmp/learner.py');
    if (!code) return json(200, { stdout: '', stderr: 'learner.py missing', exitCode: 1 });
    return json(200, await runPython(code));
  }
  return json(404, { message: 'Unknown data plane route.' });
}

// ---- Route outbound fetches -------------------------------------------------------------------------
const realFetch = globalThis.fetch;
async function sponsorFetch(input, init) {
  const url = typeof input === 'string' ? input : input.url;
  const host = new URL(url).hostname;
  if (host === 'generativelanguage.googleapis.com') return fakeGemini(url, init);
  if (host === 'agent.tinyfish.ai') return fakeTinyFish(url, init);
  if (host === 'api.maritime.sh' || host.endsWith('.sandbox.maritime.e2e')) return fakeMaritime(url, init);
  return json(599, { error: { message: `e2e harness blocked an unexpected outbound request to ${host}` } });
}
// npc.mjs calls the global fetch, so route it through the fakes; nothing leaves this machine.
globalThis.fetch = sponsorFetch;
void realFetch;

let clockOffset = 0;
const now = () => Date.now() + clockOffset;

const store = createMemoryStore();
const maritime = createMaritime({ apiKey: 'mk_e2e_fake', fetchImpl: sponsorFetch });
const labQueue = createInlineLabQueue({ processJob: jobId => processLabJob({ store, maritime, runner: null, jobId }) });
const handle = createHandler({
  store,
  allowed: loadAllowed(root),
  secureCookie: false,
  gemini: 'e2e-fake-gemini-key',
  model: 'gemini-e2e',
  tinyfish: createTinyFish({ apiKey: 'tf_e2e_fake', fetchImpl: sponsorFetch }),
  maritime,
  labQueue,
  labRunner: null,
  now,
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname === '/__e2e/calls') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(calls));
    return;
  }
  if (url.pathname === '/__e2e/advance' && req.method === 'POST') {
    clockOffset += Math.max(0, Number(url.searchParams.get('ms')) || 0);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ offset: clockOffset }));
    return;
  }
  if (!url.pathname.startsWith('/api/')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(page);
    return;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > LAB_CODE_MAX + 4096) break;
    chunks.push(chunk);
  }
  const result = await handle({ method: req.method, path: url.pathname, headers: req.headers, body: Buffer.concat(chunks) });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.body));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`e2e harness http://127.0.0.1:${port} (fake Gemini, TinyFish, Maritime; memory store)`);
});
