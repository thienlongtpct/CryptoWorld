import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The `src/` files the CDK stack copies into the API Lambda. */
function bundled() {
  const stack = readFileSync(join(root, 'infra/lib/visucrypto-stack.ts'), 'utf8');
  const list = stack.match(/export const API_SRC_FILES = \[([\s\S]*?)\];/);
  assert.ok(list, 'API_SRC_FILES is declared in the stack');
  return new Set([...list[1].matchAll(/'([^']+)'/g)].map(match => match[1]));
}

/** Relative imports of one file, resolved to repo paths. */
function importsOf(file) {
  const text = readFileSync(join(root, file), 'utf8');
  const specs = [...text.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+['"](\.[^'"]+)['"]/gm)].map(match => match[1]);
  return specs.map(spec => relative(root, normalize(join(root, dirname(file), spec))).split('\\').join('/'));
}

test('the API Lambda bundle holds every src file the server imports', () => {
  const copied = bundled();
  const todo = readdirSync(join(root, 'server')).filter(name => name.endsWith('.mjs')).map(name => `server/${name}`);
  const seen = new Set(todo);
  const missing = [];
  while (todo.length) {
    const file = todo.pop();
    for (const target of importsOf(file)) {
      if (seen.has(target)) continue;
      seen.add(target);
      if (target.startsWith('src/') && !copied.has(target)) missing.push(`${target} (imported by ${file})`);
      todo.push(target);
    }
  }
  assert.deepEqual(missing, [], 'add these to API_SRC_FILES in infra/lib/visucrypto-stack.ts');
});
