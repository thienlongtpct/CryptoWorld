import catalog from './catalog.json';
import { TOPIC_BY_ID } from '../vis/registry';
import { researchHref } from './research';

export type StepKind = 'lesson' | 'topic' | 'assessment' | 'research' | 'lab' | 'challenge' | 'scenario' | 'summary';
export interface Step { id: string; kind: StepKind }
export interface Lesson { id: string; title: string; blurb: string }
export interface PathDef {
  id: string;
  title: string;
  blurb: string;
  color: string;
  kind?: 'tree' | 'practical';
  steps: Step[];
}

export const LESSONS = catalog.lessons as Lesson[];
export const PATHS = catalog.paths as PathDef[];
export const TREE_PATHS = PATHS.filter(path => path.kind !== 'practical');
export const PRACTICAL_PATHS = PATHS.filter(path => path.kind === 'practical');
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map(l => [l.id, l]));
export const PATH_BY_ID: Record<string, PathDef> = Object.fromEntries(PATHS.map(p => [p.id, p]));

const PRACTICAL_TITLES: Record<string, string> = {
  'vd-assess-1': 'Initial assessment',
  'vd-research': 'Research Desk — hashing sources',
  'vd-lab': 'Maritime toy-seal experiment',
  seal: 'Forged seal challenge',
  'vd-workplace': 'Workplace download check',
  'vd-skills': 'Skills summary',
};

export function stepTitle(step: Step): string {
  if (step.kind === 'lesson') return LESSON_BY_ID[step.id]?.title ?? step.id;
  if (step.kind === 'topic') return TOPIC_BY_ID[step.id]?.title ?? step.id;
  return PRACTICAL_TITLES[step.id] ?? step.id;
}

export function stepHref(step: Step): string {
  if (step.kind === 'lesson') return `#lesson-${step.id}`;
  if (step.kind === 'topic') return `#${step.id}`;
  if (step.kind === 'research') {
    return `#${researchHref({
      topic: 'hash',
      goal: 'Explain what SHA-256 guarantees when checking a published software digest.',
    })}`;
  }
  if (step.kind === 'lab' || step.kind === 'challenge') return '#world';
  if (step.kind === 'assessment' || step.kind === 'scenario' || step.kind === 'summary') {
    return `#path-verify-download`;
  }
  return `#${step.id}`;
}

/** One learning tree. Branches share the foundation lessons instead of repeating them. */
export interface TreeNode {
  id: string;
  kind: StepKind;
  /** Caption drawn on the edge that enters this node. */
  branch?: string;
  /** Path page this branch opens. */
  path?: string;
  children?: TreeNode[];
}

export const PATH_TREE: TreeNode = {
  id: 'mod', kind: 'lesson', branch: 'Foundations', path: 'foundations',
  children: [
    {
      id: 'primes', kind: 'lesson', branch: 'Public-key', path: 'public-key',
      children: [{ id: 'dh', kind: 'topic', children: [{ id: 'rsa', kind: 'topic', children: [{ id: 'ecc', kind: 'topic' }] }] }],
    },
    {
      id: 'caesar', kind: 'topic', branch: 'Classical ciphers', path: 'ciphers',
      children: [{ id: 'freqan', kind: 'topic' }, { id: 'vigenere', kind: 'topic' }],
    },
    {
      id: 'xor', kind: 'lesson',
      children: [
        { id: 'otp', kind: 'topic' },
        {
          id: 'ss', kind: 'topic', branch: 'Oblivious computation', path: 'oblivious',
          children: [{ id: 'commit', kind: 'topic', children: [{ id: 'ot', kind: 'topic', children: [{ id: 'otext', kind: 'topic', children: [{ id: 'gc', kind: 'topic', children: [{ id: 'zk', kind: 'topic' }] }] }] }] }],
        },
        {
          id: 'hash', kind: 'topic', branch: 'Private sets', path: 'sets',
          children: [{ id: 'cuckoo', kind: 'topic', children: [{ id: 'oprf', kind: 'topic', children: [{ id: 'psi', kind: 'topic', children: [{ id: 'psu', kind: 'topic' }] }] }] }],
        },
      ],
    },
  ],
};
