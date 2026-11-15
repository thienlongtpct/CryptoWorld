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

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`dist/index.html is a self-contained page (${Math.round(bytes / 1024)} KB)`);
