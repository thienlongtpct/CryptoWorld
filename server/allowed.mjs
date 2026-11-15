import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Lesson, topic, practice, and challenge ids the client is allowed to save. */
export function loadAllowed(from = root) {
  const catalog = JSON.parse(readFileSync(join(from, 'src/data/catalog.json'), 'utf8'));
  const entries = readFileSync(join(from, 'src/data/entries.ts'), 'utf8');
  const entryIds = [...entries.matchAll(/"id": "([a-z0-9-]+)"/g)].map(match => match[1]);
  return new Set([
    ...catalog.lessons.map(lesson => lesson.id),
    ...catalog.paths.flatMap(path => path.steps.map(step => step.id)),
    ...entryIds.map(id => `px-${id}`),
    ...catalog.paths.map(path => `ctf-${path.id}`),
  ]);
}
