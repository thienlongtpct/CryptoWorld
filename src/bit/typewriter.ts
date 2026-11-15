/**
 * Typewriter and advance rules for Bit's dialogue, kept free of React so tests can drive them.
 *
 * - Text is revealed one grapheme at a time (an emoji with a skin tone or a flag is one step),
 *   about 30 ms each, with longer pauses after punctuation.
 * - While text is appearing, a press reveals the whole message. Only the next press advances.
 * - A message with choices never advances on a press: a choice must be picked.
 */

export const CHAR_MS = 30;

interface SegmenterLike {
  segment(input: string): Iterable<{ segment: string }>;
}

let segmenter: SegmenterLike | null | undefined;

/** Splits text into user-perceived characters. Falls back to code points without Intl.Segmenter. */
export function graphemes(text: string): string[] {
  if (segmenter === undefined) {
    const Ctor = (Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: 'grapheme' }) => SegmenterLike }).Segmenter;
    segmenter = Ctor ? new Ctor(undefined, { granularity: 'grapheme' }) : null;
  }
  if (!segmenter) return Array.from(text);
  return Array.from(segmenter.segment(text), part => part.segment);
}

const LONG = new Set(['.', '!', '?', '…', '。', '！', '？']);
const SHORT = new Set([',', ';', ':', '—', '–', '、', '，']);

/** Milliseconds to wait after showing `current` before showing `next`. */
export function delayAfter(current: string, next: string | undefined, base = CHAR_MS): number {
  if (next === undefined) return 0;
  if (current === '\n') return base + 200;
  // Pause only at the end of a clause: "3.14" and "e.g." keep going.
  const breaks = /^\s$/.test(next) || next === '"' || next === '”' || next === ')';
  if (LONG.has(current) && breaks) return base + 260;
  if (SHORT.has(current) && breaks) return base + 120;
  return base;
}

/** The delay before each grapheme after the first. `delays[i]` is the wait between step i and step i + 1. */
export function revealDelays(parts: string[], base = CHAR_MS): number[] {
  return parts.slice(0, -1).map((part, index) => delayAfter(part, parts[index + 1], base));
}

/** Total time to reveal `text` at `base` ms per character, punctuation pauses included. */
export function revealDuration(text: string, base = CHAR_MS): number {
  const parts = graphemes(text);
  return parts.length ? base + revealDelays(parts, base).reduce((sum, ms) => sum + ms, 0) : 0;
}

export interface Reveal {
  /** Message currently on screen. */
  key: string;
  /** Graphemes shown so far. */
  shown: number;
  /** Graphemes in the message. */
  total: number;
}

export type RevealEvent =
  | { type: 'start'; key: string; total: number; instant?: boolean }
  | { type: 'tick' }
  | { type: 'finish' };

export function reveal(state: Reveal, event: RevealEvent): Reveal {
  switch (event.type) {
    case 'start':
      return { key: event.key, total: event.total, shown: event.instant || event.total === 0 ? event.total : 1 };
    case 'tick':
      return state.shown >= state.total ? state : { ...state, shown: state.shown + 1 };
    case 'finish':
      return state.shown >= state.total ? state : { ...state, shown: state.total };
  }
}

export const isComplete = (state: Reveal) => state.shown >= state.total;

/**
 * What one press (a click on the text, Enter, or Space) does now.
 * 'reveal' finishes the message, 'advance' goes on, 'wait' means a choice must be picked instead.
 */
export function pressOutcome(state: Reveal, hasChoices: boolean): 'reveal' | 'advance' | 'wait' {
  if (!isComplete(state)) return 'reveal';
  return hasChoices ? 'wait' : 'advance';
}

/** Splits a message into the shown part and the hidden rest, so wrapping never jumps while typing. */
export function splitShown(parts: string[], shown: number): [string, string] {
  return [parts.slice(0, shown).join(''), parts.slice(shown).join('')];
}

/** Breaks a longer answer into short messages of about one sentence each. */
export function sentences(text: string, max = 4): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const parts = clean.match(/[^.!?…]+(?:[.!?…]+["”')\]]*|$)\s*/g)?.map(part => part.trim()).filter(Boolean) ?? [clean];
  // Fold the extra sentences into the last message instead of dropping them.
  if (parts.length > max) return [...parts.slice(0, max - 1), parts.slice(max - 1).join(' ')];
  return parts;
}
