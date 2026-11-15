// Local account server. The Vite dev server proxies /api here.
// Accounts stay in data/accounts.json. AWS runs server/lambda.mjs with the same routes.

import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from './app.mjs';
import { loadAllowed } from './allowed.mjs';
import { createFileStore, emptyDb, saveDb } from './store.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
const handle = createHandler({
  store: createFileStore(dbPath),
  allowed: loadAllowed(root),
  secureCookie: process.env.COOKIE_SECURE === '1',
  gemini: process.env.GEMINI_API_KEY || '',
  model: process.env.GEMINI_MODEL || '',
});

const server = http.createServer(async (req, res) => {
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of req) {
      size += chunk.length;
      chunks.push(chunk);
      if (size > 4096) break;
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
  });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.body));
});

server.listen(port, () => {
  if (!existsSync(dbPath)) saveDb(dbPath, emptyDb());
  console.log(`account server http://localhost:${server.address().port}`);
});
