import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseResearchRoute, researchHref, RESEARCH_PAPER_IDS, RESEARCH_TOPICS } from '../src/data/research.ts';
import { isRestricted } from '../src/access.ts';

test('research deep links encode topic, paper, goal, and job', () => {
  assert.equal(researchHref({ topic: 'hash' }), 'research?topic=hash');
  assert.equal(researchHref({ paper: 'pagh01', goal: 'Learn bins' }), 'research?paper=pagh01&goal=Learn+bins');
  const parsed = parseResearchRoute('research?topic=hash&job=rj_1&goal=Avalanche');
  assert.deepEqual(parsed, { topicId: 'hash', paperId: '', goal: 'Avalanche', jobId: 'rj_1' });
  assert.equal(parseResearchRoute('library'), null);
});

test('research desk stays guest-previewable while hashing lessons stay gated', () => {
  assert.equal(isRestricted('research'), false);
  assert.equal(isRestricted('research?topic=hash'), false);
  assert.equal(isRestricted('hash'), true);
  assert.equal(isRestricted('modern'), true);
  assert.ok(RESEARCH_TOPICS.some(t => t.id === 'hash'));
  assert.ok(RESEARCH_PAPER_IDS.has('pagh01'));
  assert.ok(RESEARCH_PAPER_IDS.has('psz14'));
});
