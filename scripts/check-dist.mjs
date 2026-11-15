// Confirms the production build is one self-contained page, which is what S3 serves.
import { readFileSync, statSync } from 'node:fs';

const path = 'dist/index.html';
const html = readFileSync(path, 'utf8');
const bytes = statSync(path).size;
const problems = [];

if (!html.includes('id="root"')) problems.push('dist/index.html has no #root');
if (!html.includes('VisuCrypto')) problems.push('dist/index.html lost the VisuCrypto title');
if (html.includes('/src/main.tsx')) problems.push('dist/index.html still points at the dev entry');
if (!/<script[\s>]/.test(html)) problems.push('dist/index.html has no inlined script');
if (bytes < 20_000) problems.push(`dist/index.html is only ${bytes} bytes`);
if (bytes > 5_000_000) problems.push(`dist/index.html is ${bytes} bytes, over the 5 MB ceiling`);
// Secrets and .env.example sentinels must never ship in the single-file page.
for (const needle of [
  'sk-tinyfish-ax6dY9EleIaxUHC9iK_uhIXuujAJifPc',
  'mk_ij3xDtOAKgHmErrC4qS8WraWgEoo9v6jvDpnKDQ4ZCw',
  'GEMINI_API_KEY=',
  'TINYFISH_API_KEY=',
  'MARITIME_API_KEY=',
  'SPONSOR_SECRET_ARN=',
]) {
  if (html.includes(needle)) problems.push(`dist/index.html must not contain ${needle.split('=')[0]}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`dist/index.html is a self-contained page (${Math.round(bytes / 1024)} KB)`);
