// Hits the delivered site. Used at the end of the AWS deploy.
// Prints readiness booleans only — never key material. Does not call paid providers.
import { readFileSync } from 'node:fs';

function siteUrl() {
  if (process.argv[2]) return process.argv[2];
  const outputs = JSON.parse(readFileSync('infra/outputs.json', 'utf8'));
  const url = outputs.VisuCrypto?.SiteUrl;
  if (!url) throw new Error('SiteUrl is missing from infra/outputs.json');
  return url;
}

const base = siteUrl().replace(/\/$/, '');

async function probe(name, fn) {
  let last = new Error(`${name} did not run`);
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      await fn();
      console.log(`${name} ok (${base})`);
      return;
    } catch (err) {
      last = err;
      console.log(`${name} attempt ${attempt} failed: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  throw last;
}

await probe('site', async () => {
  const res = await fetch(`${base}/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes('id="root"')) throw new Error('the page has no #root');
  if (html.includes('/src/main.tsx')) throw new Error('the page still points at the dev entry');
  for (const needle of ['sk-tinyfish-', 'mk_ij3xDtOAKgHmErrC4qS8WraWgEoo9v6jvDpnKDQ4ZCw', 'GEMINI_API_KEY=']) {
    if (html.includes(needle)) throw new Error('the published page appears to contain a secret placeholder or key name');
  }
});

await probe('account API', async () => {
  const res = await fetch(`${base}/api/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (body.ok !== true) throw new Error(JSON.stringify(body));
  // Booleans only — missing keys are expected until SPONSOR_SECRET_ARN / env are configured.
  console.log(`readiness gemini=${Boolean(body.gemini)} tinyfish=${Boolean(body.tinyfish)} maritime=${Boolean(body.maritime)} tigerdata=${Boolean(body.tigerdata)}`);
});
