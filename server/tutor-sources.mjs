// Sources a learner already gathered with TinyFish at the Research Desk, offered to NPC tutors
// so answers can cite them. Reads cached research jobs only: no TinyFish run is started here.
import { REGION_BY_ID } from '../src/characters/cast.ts';
import { CHALLENGE_BY_ID } from '../src/dungeon/challenges.ts';
import { researchTopicFor } from './research-catalog.mjs';

export const TUTOR_SOURCE_MAX = 4;
const EXCERPT_MAX = 300;

function clip(text, max) {
  const value = String(text ?? '').trim().replace(/\s+/g, ' ');
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Lesson topics an NPC question is about: the region's topics plus the open challenge's lesson. */
export function tutorTopics({ regionId, challengeId, topic } = {}) {
  const topics = [...(REGION_BY_ID[regionId]?.topics ?? [])];
  const lesson = CHALLENGE_BY_ID[challengeId]?.lesson;
  if (lesson && !topics.includes(lesson)) topics.push(lesson);
  // Bit passes the visualization being studied. It only filters the learner's own cached research.
  if (typeof topic === 'string' && /^[a-z0-9-]{1,40}$/.test(topic) && !topics.includes(topic)) topics.push(topic);
  return topics;
}

/**
 * Completed, unexpired TinyFish resources from this learner's research jobs that relate to
 * `topics`, newest first, de-duplicated by URL, numbered for [n] citations.
 */
export async function learnerSources(store, userId, topics, at = Date.now()) {
  if (!topics.length || typeof store.researchJobsFor !== 'function') return [];
  const jobs = await store.researchJobsFor(userId, at);
  const seen = new Set();
  const out = [];
  for (const job of jobs) {
    if (job.status !== 'completed' || job.userId !== userId) continue;
    const related = topics.includes(job.subjectId) || (job.relatedVisualizations ?? []).some(id => topics.includes(id));
    if (!related) continue;
    for (const res of job.resources ?? []) {
      if (out.length >= TUTOR_SOURCE_MAX) break;
      if (!res?.url || seen.has(res.url)) continue;
      seen.add(res.url);
      out.push({
        n: out.length + 1,
        title: clip(res.title, 160),
        publisher: clip(res.publisher, 120),
        url: res.url,
        excerpt: clip(res.excerpt, EXCERPT_MAX),
        retrievedAt: res.retrievedAt ?? job.updatedAt,
      });
    }
    if (out.length >= TUTOR_SOURCE_MAX) break;
  }
  return out;
}

/** Research Desk route to suggest when a learner has nothing to cite yet, or null. */
export function researchSuggestion(topics) {
  const id = researchTopicFor(topics);
  return id ? `research?topic=${id}` : null;
}
