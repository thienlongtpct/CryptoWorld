import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loadAllowed } from '../server/allowed.mjs';

test('the account API accepts every lesson, path step, practice item, and challenge', () => {
  const allowed = loadAllowed();
  const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url), 'utf8'));
  for (const lesson of catalog.lessons) assert.equal(allowed.has(lesson.id), true, lesson.id);
  for (const path of catalog.paths) {
    if (path.kind === 'practical') {
      assert.equal(allowed.has(`ctf-${path.id}`), false, path.id);
      for (const step of path.steps) {
        const progressOk = step.kind === 'lesson' || step.kind === 'topic';
        assert.equal(allowed.has(step.id), progressOk, `${path.id}:${step.id}`);
      }
      continue;
    }
    assert.equal(allowed.has(`ctf-${path.id}`), true, path.id);
    for (const step of path.steps) assert.equal(allowed.has(step.id), true, `${path.id}:${step.id}`);
  }
  assert.equal(allowed.has('px-aon'), true);
  assert.equal(allowed.has('not-a-real-item'), false);
});
