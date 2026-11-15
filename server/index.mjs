// Local account server. The Vite dev server proxies /api here.
// Accounts stay in data/accounts.json, or in TigerData when TIGER_DATABASE_URL is set. AWS runs server/lambda.mjs with the same routes.
// Lab runs use an inline queue locally (LAB_QUEUE_URL unset). Set LAB_EXECUTOR=local to run
// Python on this machine instead of Maritime while developing.

import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from './app.mjs';
import { loadAllowed } from './allowed.mjs';
import { createFileStore, emptyDb, saveDb } from './store.mjs';
import { createTinyFish } from './tinyfish.mjs';
import { createMaritime } from './maritime.mjs';
import { createLabQueueFromEnv } from './lab-queue.mjs';
import { createLocalLabRunner, processLabJob } from './lab-worker.mjs';
import { LAB_CODE_MAX } from './lab-template.mjs';
import { loadSponsorConfig } from './secrets.mjs';
import { selectStore } from './store-select.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BODY_MAX = LAB_CODE_MAX + 4096;

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const split = trimmed.indexOf('=');
    if (split < 1) continue;
    const key = trimmed.slice(0, split).trim();
    let value = trimmed.slice(split + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv(join(root, '.env'));

const port = Number(process.env.PORT || 8787);
const dbPath = process.env.ACCOUNTS_PATH || join(root, 'data', 'accounts.json');
const cfg = await loadSponsorConfig();
const store = await selectStore(cfg, () => createFileStore(dbPath));
const maritime = createMaritime({ apiKey: cfg.maritime });
const labRunner = process.env.LAB_EXECUTOR === 'local' ? createLocalLabRunner() : null;
const labQueue = await createLabQueueFromEnv({
  processJob: jobId => processLabJob({ store, maritime, runner: labRunner, jobId }),
});

const handle = createHandler({
  store,
  allowed: loadAllowed(root),
  secureCookie: process.env.COOKIE_SECURE === '1',
  gemini: cfg.gemini,
  model: cfg.model,
  tinyfish: createTinyFish({ apiKey: cfg.tinyfish }),
  maritime,
  labQueue,
  labRunner,
});

const server = http.createServer(async (req, res) => {
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of req) {
      size += chunk.length;
      chunks.push(chunk);
      if (size > BODY_MAX) break;
    }
  } catch {
    // The client closed the connection while the body was still arriving.
  }
  const url = new URL(req.url || '/', 'http://localhost');
  const result = await handle({
    method: req.method,
    path: url.pathname,
    headers: req.headers,
    body: Buffer.concat(chunks),
    ip: req.socket.remoteAddress || '',
  });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.body));
});

// Loopback only by default: with LAB_EXECUTOR=local, any account here can run Python on this
// machine. Set HOST=0.0.0.0 only on a network you trust.
server.listen(port, process.env.HOST || '127.0.0.1', () => {
  if (store.kind !== 'tigerdata' && !existsSync(dbPath)) saveDb(dbPath, emptyDb());
  const mode = labRunner ? 'local-python' : maritime.configured ? 'maritime+inline-queue' : 'lab-disabled';
  const db = store.kind === 'tigerdata' ? 'tigerdata' : 'json-file';
  console.log(`account server http://localhost:${server.address().port} (${mode}, ${db})`);
});
