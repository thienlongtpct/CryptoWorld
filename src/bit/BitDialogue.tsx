import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { BitPortrait } from './BitArt';
import type { BitChoice, BitLine } from './script';
import { CHAR_MS, graphemes, isComplete, pressOutcome, reveal, revealDelays, splitShown, type Reveal } from './typewriter';

/** One message on screen. `serial` changes every time a message is shown, even the same one again. */
export interface Showing {
  line: BitLine;
  serial: number;
}

/** Reveals the message one grapheme at a time. `instant` shows it whole at once. */
export function useTypewriter(showing: Showing | null, instant: boolean) {
  const text = showing?.line.text ?? '';
  const key = showing ? String(showing.serial) : '';
  const parts = useMemo(() => graphemes(text), [text]);
  const delays = useMemo(() => revealDelays(parts, CHAR_MS), [parts]);
  const [state, setState] = useState<Reveal>({ key: '', shown: 0, total: 0 });
  // A new message starts in the same render, so the old text never flashes in full.
  const current = state.key === key ? state : reveal(state, { type: 'start', key, total: parts.length, instant });
  if (current !== state) setState(current);

  useEffect(() => {
    if (!key || isComplete(current)) return;
    const wait = delays[current.shown - 1] ?? CHAR_MS;
    const timer = window.setTimeout(() => setState(prev => (prev.key === key ? reveal(prev, { type: 'tick' }) : prev)), wait);
    return () => window.clearTimeout(timer);
  }, [key, current.shown, current.total, delays]);

  useEffect(() => {
    if (instant) setState(prev => reveal(prev, { type: 'finish' }));
  }, [instant]);

  const finish = useCallback(() => setState(prev => reveal(prev, { type: 'finish' })), []);
  return { parts, state: current, done: isComplete(current), finish };
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * The RPG dialogue panel: portrait on the left overlapping the panel, a "Bit" nameplate, the text,
 * a continuation mark, and the choices. While it is open, the keyboard belongs to it.
 */
export function BitDialogue({ showing, instant, still, waiting = false, onAdvance, onChoose, onClose, extra, footnote }: {
  showing: Showing;
  instant: boolean;
  still: boolean;
  /** The message waits for something other than a press, such as a typed question or an answer. */
  waiting?: boolean;
  onAdvance: () => void;
  onChoose: (choice: BitChoice) => void;
  onClose: () => void;
  /** Extra content under the text, such as the question box. */
  extra?: ReactNode;
  footnote?: ReactNode;
}) {
  const { line } = showing;
  const nameId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const { parts, state, done, finish } = useTypewriter(showing, instant);
  const choices = line.choices ?? [];
  const [said, rest] = splitShown(parts, state.shown);

  // One press does one thing: finish the message, or go on. A message with choices waits for one.
  const press = useCallback(() => {
    const outcome = pressOutcome(state, choices.length > 0 || waiting);
    if (outcome === 'reveal') finish();
    else if (outcome === 'advance') onAdvance();
  }, [state, choices.length, waiting, finish, onAdvance]);
  const pressRef = useRef(press);
  pressRef.current = press;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Screen readers hear each whole message once, from a region that stays mounted.
  const [announce, setAnnounce] = useState('');
  useEffect(() => {
    setAnnounce('');
    const timer = window.setTimeout(() => setAnnounce(`${line.tag ? `${line.tag}. ` : ''}${line.text}`), 60);
    return () => window.clearTimeout(timer);
  }, [showing.serial]);

  // Focus the text, not a button, so a held Enter or Space cannot pick a choice by accident.
  useEffect(() => {
    if (!boxRef.current?.contains(document.activeElement) || document.activeElement === document.body) textRef.current?.focus();
  }, [showing.serial]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const box = boxRef.current;
      if (!box) return;
      const target = event.target instanceof Element ? event.target : null;
      const inside = !!target && box.contains(target);
      const typing = inside && !!target?.closest('input, textarea, select');
      // Nothing behind Bit reacts while the dialogue is open: not world movement, not the player, not view keys.
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key === 'Tab') {
        const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (!inside) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && target === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && target === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (typing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        // A focused button (a choice or the close control) is activated by the browser as usual.
        if (inside && target?.closest('button, a')) return;
        event.preventDefault();
        if (!event.repeat) pressRef.current();
        return;
      }
      if (/^Arrow(Up|Down|Left|Right)$/.test(event.key)) {
        event.preventDefault();
        const items = [...box.querySelectorAll<HTMLButtonElement>('.bit-choice')];
        if (!items.length) return;
        const at = items.indexOf(document.activeElement as HTMLButtonElement);
        const back = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
        const next = at === -1 ? (back ? items.length - 1 : 0) : (at + (back ? -1 : 1) + items.length) % items.length;
        items[next].focus();
        return;
      }
      // Number keys pick a visible choice: still an explicit selection.
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        box.querySelectorAll<HTMLButtonElement>('.bit-choice')[Number(event.key) - 1]?.click();
        return;
      }
      // Movement letters and other shortcuts are swallowed so the world stays still.
      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.length === 1) event.preventDefault();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const mark = !done || waiting || choices.length ? null : line.next ? '▼' : '■';
  return (
    <div className={`bit-layer${still ? ' bit-still' : ''}`}>
      <div className="bit-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby={nameId}>
        <div className="bit-portrait-slot">
          <BitPortrait expression={line.expression} speaking={!done} still={still} size={0} />
        </div>
        <div className="bit-panel">
          <header className="bit-head">
            <h2 className="bit-name" id={nameId}>Bit</h2>
            <span className="bit-role">Your Cipher Companion</span>
            <button type="button" className="bit-x" aria-label="Close Bit" onClick={onClose}>✕</button>
          </header>
          {line.source && (
            <p className={`bit-source ${line.source}`}>
              {line.source === 'ai' ? 'AI explanation · Gemini · may be wrong' : `Curated hint${line.tag ? ` · ${line.tag}` : ''}`}
            </p>
          )}
          <div
            ref={textRef}
            className="bit-text"
            tabIndex={-1}
            onClick={press}
            data-done={done ? 'true' : 'false'}
          >
            <p aria-hidden="true">
              {said}
              <span className="bit-unsaid">{rest}</span>
            </p>
            {mark && <span className="bit-more" aria-hidden="true">{mark}</span>}
            <span className="bit-clip">{done && !waiting ? (line.next ? 'Press Enter to continue.' : choices.length ? 'Choose an answer.' : 'Press Enter to finish.') : ''}</span>
          </div>
          {footnote}
          {extra}
          {done && choices.length > 0 && (
            <div className="bit-choices" role="group" aria-label="Your answer">
              {choices.map((choice, index) => (
                <button key={choice.id} type="button" className="bit-choice" onClick={() => onChoose(choice)}>
                  <span className="bit-choice-n" aria-hidden="true">{index + 1}</span>
                  {choice.label}
                </button>
              ))}
            </div>
          )}
          <p className="bit-live" aria-live="polite" aria-atomic="true">{announce}</p>
        </div>
      </div>
    </div>
  );
}
