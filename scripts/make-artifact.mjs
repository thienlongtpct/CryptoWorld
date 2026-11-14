// Turn dist/index.html (a full HTML document) into dist/artifact.html, the fragment form the
// Claude artifact host expects: it supplies <!doctype>, <html>, <head> and <body> itself.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const keep = head
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
writeFileSync('dist/artifact.html', `${keep.trim()}\n${body.trim()}\n`);
console.log(`dist/artifact.html written (${Math.round((keep.length + body.length) / 1024)} KB)`);
