import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRestricted } from '../src/access.ts';
import {
  MISSION,
  MISSION_ID,
  nextMissionStep,
  parseWorldMission,
  prevMissionStep,
} from '../src/data/mission.ts';

test('verify-download mission orders research → viz → lab → challenge → skills', () => {
  assert.deepEqual(MISSION.steps.map(s => s.id), ['research', 'visualize', 'lab', 'challenge', 'skills']);
  assert.equal(MISSION.id, MISSION_ID);
  assert.match(MISSION.steps[0].href, /^#research\?/);
  assert.equal(MISSION.steps[1].href, '#hash');
  assert.match(MISSION.steps[2].href, /gate=seal/);
  assert.match(MISSION.steps[4].href, /journal=skills/);
  assert.equal(nextMissionStep('research')?.id, 'visualize');
  assert.equal(prevMissionStep('skills')?.id, 'challenge');
  assert.equal(nextMissionStep('skills'), null);
});

test('world mission deep links parse gate and journal intents', () => {
  assert.equal(parseWorldMission('library'), null);
  assert.deepEqual(parseWorldMission(`world?mission=${MISSION_ID}&gate=seal`), {
    mission: MISSION_ID,
    gate: 'seal',
    journal: '',
  });
  assert.deepEqual(parseWorldMission(`world?mission=${MISSION_ID}&journal=skills`), {
    mission: MISSION_ID,
    gate: '',
    journal: 'skills',
  });
});

test('mission research stays guest-readable; hash and path stay gated', () => {
  assert.equal(isRestricted('research'), false);
  assert.equal(isRestricted(MISSION.steps[0].href.slice(1)), false);
  assert.equal(isRestricted('hash'), true);
  assert.equal(isRestricted('path-verify-download'), true);
});
