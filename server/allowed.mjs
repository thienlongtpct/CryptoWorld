import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Lesson, topic, practice, and challenge ids the client is allowed to save. */
export function loadAllowed(from = root) {
  const catalog = JSON.parse(readFileSync(join(from, 'src/data/catalog.json'), 'utf8'));
  const entries = readFileSync(join(from, 'src/data/entries.ts'), 'utf8');
  const entryIds = [...entries.matchAll(/"id": "([a-z0-9-]+)"/g)].map(match => match[1]);
  // Practical-path assessment/lab/research/summary ids are not progress items —
  // assessed skills come only from server-checked evidence.
  const progressSteps = catalog.paths.flatMap(path => path.steps
    .filter(step => step.kind === 'lesson' || step.kind === 'topic')
    .map(step => step.id));
  const ctfIds = catalog.paths
    .filter(path => path.kind !== 'practical')
    .map(path => `ctf-${path.id}`);
  return new Set([
    ...catalog.lessons.map(lesson => lesson.id),
    ...progressSteps,
    ...entryIds.map(id => `px-${id}`),
    ...ctfIds,
  ]);
}
