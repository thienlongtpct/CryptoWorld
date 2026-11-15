import { TOPIC_BY_ID, TOPICS } from './vis/registry.ts';

/** Routes a guest can open without an account. Everything else in the app is a lesson or a library page. */
const PUBLIC_ROUTES = new Set(['', 'top', 'world']);

const LIBRARY_ROUTES = new Set(['library', 'terms', 'classical', 'modern', 'lib-psi', 'lib-psu', 'bib', 'paths']);

const LESSON_PREFIX = /^(lesson-|path-|tour-|def-|L-|cl-|mo-|psu-|psi-|pp-|ip-)/;

export function isRestricted(route: string, entry = false): boolean {
  if (PUBLIC_ROUTES.has(route)) return false;
  if (LIBRARY_ROUTES.has(route)) return true;
  if (TOPIC_BY_ID[route]) return true;
  if (entry) return true;
  return LESSON_PREFIX.test(route);
}

export function accessReason(route: string): string {
  const topic = TOPIC_BY_ID[route];
  if (topic) return `Log in to explore ${topic.title} and save your learning progress.`;
  if (route.startsWith('lesson-')) return 'Log in to open this lesson and save your learning progress.';
  if (route.startsWith('path-')) return 'Log in to open this learning path and save your learning progress.';
  if (route.startsWith('tour-')) return 'Log in to start the tour and save your learning progress.';
  if (route === 'terms' || route.startsWith('L-') || route.startsWith('def-')) {
    return 'Log in to open the dictionary and save your learning progress.';
  }
  if (route === 'paths') return 'Log in to open the learning paths and save your learning progress.';
  if (route === 'bib') return 'Log in to open the bibliography and save your learning progress.';
  if (route === 'library') return 'Log in to open the library and save your learning progress.';
  return 'Log in to open this part of the library and save your learning progress.';
}

const SYMMETRIC = ['hash', 'blockcipher', 'modes', 'otp', 'commit'];
const PUBLIC_KEY = ['dh', 'rsa', 'ecc', 'he'];
const CLAIMED = new Set([...SYMMETRIC, ...PUBLIC_KEY]);

function inGroup(group: string): string[] {
  return TOPICS.filter(topic => topic.group === group && !CLAIMED.has(topic.id)).map(topic => topic.id);
}

export interface ShelfDef {
  id: string;
  /** Name shown on the shelf and in the catalog. */
  title: string;
  /** One line that says what the topics on this shelf teach. */
  blurb: string;
  /** Short label drawn above the shelf in the sanctuary. */
  mark: string;
  topics: string[];
}

/** Existing topics, grouped for the library. The ids are the visualization routes. */
export const SHELVES: ShelfDef[] = [
  {
    id: 'foundations',
    title: 'Ciphers, shares, and proofs',
    blurb: 'Shift and transposition ciphers, splitting a secret into shares, and zero-knowledge proofs.',
    mark: 'CIPHERS',
    topics: [...inGroup('Foundations'), ...inGroup('Classical ciphers')],
  },
  {
    id: 'symmetric',
    title: 'Hashes and secret-key encryption',
    blurb: 'One-time pads, hash functions, block ciphers, modes, and commitments.',
    mark: 'HASHES',
    topics: SYMMETRIC,
  },
  {
    id: 'public',
    title: 'Public keys and encrypted math',
    blurb: 'Diffie–Hellman, RSA, elliptic curves, and adding numbers that stay encrypted.',
    mark: 'KEYS',
    topics: PUBLIC_KEY,
  },
  {
    id: 'mpc',
    title: 'Computing without showing inputs',
    blurb: 'Oblivious transfer, garbled circuits, and the tools those protocols are built from.',
    mark: 'COMPUTE',
    topics: [...inGroup('Oblivious primitives'), ...inGroup('Secure computation')],
  },
  {
    id: 'sets',
    title: 'Private lists and their overlap',
    blurb: 'Private set intersection and union: what both people hold, and what stays hidden.',
    mark: 'SETS',
    topics: inGroup('Set operations'),
  },
];

export interface LibrarySection {
  route: string;
  title: string;
  blurb: string;
}

/** The library pages that already exist outside the topic grid. */
export const LIBRARY_SECTIONS: LibrarySection[] = [
  { route: 'library', title: 'All visualizations', blurb: 'Search, filters, playback, and pseudocode for every protocol.' },
  { route: 'paths', title: 'Learning paths and quizzes', blurb: 'Lessons in order, with a CTF flag at the end of each path.' },
  { route: 'terms', title: 'Dictionary', blurb: 'Definitions, explanations, and the practice questions on each entry.' },
  { route: 'classical', title: 'Classical cryptography', blurb: 'The classical cipher notes that sit beside the visualizations.' },
  { route: 'modern', title: 'Modern cryptography', blurb: 'Hashes, block ciphers, RSA, and elliptic curves in long form.' },
  { route: 'lib-psi', title: 'PSI library', blurb: 'Private set intersection protocols and variants.' },
  { route: 'lib-psu', title: 'PSU library', blurb: 'Private set union, benchmarks, and what an early stop leaks.' },
  { route: 'bib', title: 'Bibliography', blurb: 'Papers and references for the protocols.' },
];

export const QUESTS = [
  { id: 'grove', topic: 'hash', title: 'Hash Forest' },
  { id: 'bridge', topic: 'dh', title: 'Key Exchange Bridge' },
  { id: 'garden', topic: 'psi', title: 'Private Set Gardens' },
] as const;

export type QuestTopic = (typeof QUESTS)[number]['topic'];
