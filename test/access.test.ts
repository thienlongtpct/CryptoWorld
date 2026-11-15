import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIBRARY_SECTIONS, QUESTS, SHELVES, accessReason, isRestricted } from '../src/access.ts';
import { TOPIC_BY_ID, TOPICS } from '../src/vis/registry.ts';
import { loadAllowed } from '../server/allowed.mjs';

test('the world is public and lessons are not', () => {
  for (const route of ['', 'top', 'world']) assert.equal(isRestricted(route), false, route);
  for (const topic of TOPICS) assert.equal(isRestricted(topic.id), true, topic.id);
  for (const route of ['library', 'terms', 'classical', 'modern', 'lib-psi', 'lib-psu', 'bib', 'paths', 'lesson-mod', 'path-foundations', 'tour-1', 'tour-done', 'L-A', 'cl-caesar', 'mo-hash', 'psi-dh', 'psu-rpmt']) {
    assert.equal(isRestricted(route), true, route);
  }
  assert.equal(isRestricted('def-hash'), true);
  assert.equal(isRestricted('shamir', true), true);
  assert.equal(isRestricted('not-a-page'), false);
  assert.equal(isRestricted('not-a-page', false), false);
});

test('a lesson explains why login is needed', () => {
  assert.match(accessReason('hash'), /Hash Functions/);
  assert.match(accessReason('hash'), /save your learning progress/);
  assert.match(accessReason('library'), /library/i);
  assert.match(accessReason('tour-1'), /tour/i);
});

test('library shelves use each existing topic once', () => {
  const ids = SHELVES.flatMap(shelf => shelf.topics);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), TOPICS.map(topic => topic.id).sort());
  for (const section of LIBRARY_SECTIONS) assert.equal(isRestricted(section.route), true, section.route);
});

test('the three quests open lessons the account server can save', () => {
  const allowed = loadAllowed();
  assert.deepEqual(QUESTS.map(quest => quest.topic), ['hash', 'dh', 'psi']);
  for (const quest of QUESTS) {
    assert.ok(TOPIC_BY_ID[quest.topic], quest.topic);
    assert.equal(allowed.has(quest.topic), true, quest.topic);
    assert.equal(isRestricted(quest.topic), true);
  }
});
