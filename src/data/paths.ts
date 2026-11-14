import catalog from './catalog.json';
import { TOPIC_BY_ID } from '../vis/registry';

export type StepKind = 'lesson' | 'topic';
export interface Step { id: string; kind: StepKind }
export interface Lesson { id: string; title: string; blurb: string }
export interface PathDef { id: string; title: string; blurb: string; color: string; steps: Step[] }

export const LESSONS = catalog.lessons as Lesson[];
export const PATHS = catalog.paths as PathDef[];
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map(l => [l.id, l]));
export const PATH_BY_ID: Record<string, PathDef> = Object.fromEntries(PATHS.map(p => [p.id, p]));

export function stepTitle(step: Step): string {
  return step.kind === 'lesson' ? LESSON_BY_ID[step.id]?.title ?? step.id : TOPIC_BY_ID[step.id]?.title ?? step.id;
}

export function stepHref(step: Step): string {
  return step.kind === 'lesson' ? `#lesson-${step.id}` : `#${step.id}`;
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
