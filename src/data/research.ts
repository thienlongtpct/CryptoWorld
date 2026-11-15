/** Approved Research Desk subjects — must stay aligned with server/research-catalog.mjs. */

export interface ResearchTopicOption {
  id: string;
  title: string;
  blurb: string;
  defaultGoal: string;
}

export interface ResearchPaperOption {
  id: string;
  label: string;
  title: string;
  blurb: string;
  defaultGoal: string;
}

export const RESEARCH_TOPICS: ResearchTopicOption[] = [
  {
    id: 'hash',
    title: 'Hash Functions',
    blurb: 'SHA-2 digests, collision resistance, and avalanche — tied to the Hash crypt visualization.',
    defaultGoal: 'Explain what SHA-256 guarantees and why changing one input bit flips about half the digest.',
  },
  {
    id: 'commit',
    title: 'Commitment',
    blurb: 'Hash-based commitments: hiding a value now and opening it later.',
    defaultGoal: 'Explain how a hash-based commitment is hiding and binding.',
  },
  {
    id: 'cuckoo',
    title: 'Cuckoo Hashing',
    blurb: 'Two-choice hashing and eviction chains used inside modern PSI.',
    defaultGoal: 'Explain how cuckoo hashing places items into candidate bins with eviction.',
  },
];

export const RESEARCH_PAPERS: ResearchPaperOption[] = [
  {
    id: 'pagh01',
    label: 'PR01',
    title: 'Cuckoo Hashing',
    blurb: 'Pagh & Rodler — the classic two-choice hashing paper.',
    defaultGoal: 'Summarize cuckoo hashing and why two choices reduce collisions.',
  },
  {
    id: 'psz14',
    label: 'PSZ14',
    title: 'Faster Private Set Intersection Based on OT Extension',
    blurb: 'Pinkas–Schneider–Zohner PSI that bins with cuckoo hashing.',
    defaultGoal: 'Explain how OT-extension PSI uses cuckoo hashing for binning.',
  },
];

export const RESEARCH_PAPER_IDS = new Set(RESEARCH_PAPERS.map(p => p.id));

export function researchHref(opts: { topic?: string; paper?: string; goal?: string; job?: string } = {}) {
  const qs = new URLSearchParams();
  if (opts.topic) qs.set('topic', opts.topic);
  if (opts.paper) qs.set('paper', opts.paper);
  if (opts.goal) qs.set('goal', opts.goal);
  if (opts.job) qs.set('job', opts.job);
  const q = qs.toString();
  return q ? `research?${q}` : 'research';
}

export function parseResearchRoute(route: string) {
  if (route !== 'research' && !route.startsWith('research?')) return null;
  const qs = route.startsWith('research?')
    ? new URLSearchParams(route.slice('research?'.length))
    : new URLSearchParams();
  return {
    topicId: qs.get('topic')?.trim() || '',
    paperId: qs.get('paper')?.trim() || '',
    goal: qs.get('goal')?.trim() || '',
    jobId: qs.get('job')?.trim() || '',
  };
}
