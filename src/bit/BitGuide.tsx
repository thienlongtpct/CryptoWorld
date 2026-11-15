import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CHALLENGE_BY_ID } from '../dungeon/challenges';
import { loadBit, saveBit, type BitPrefs } from '../dungeon/rooms';
import { BitSprite } from './BitArt';
import { BitDialogue, type Showing } from './BitDialogue';
import {
  AUTO_OPEN,
  NUDGES,
  STARTS,
  celebration,
  hintLines,
  scriptFor,
  tutorialFor,
  type BitChoice,
  type BitLine,
  type Place,
  type Script,
  type Tutorial,
} from './script';
import { sentences } from './typewriter';
import './bit.css';

type Source = { n: number; title: string; publisher: string; url: string };

export interface BitCommand {
  start: 'welcome' | 'demo' | 'menu';
  n: number;
}

/**
 * Bit as one piece: the guide button, short nudges beside it, and the dialogue.
 * World mounts it once, outside the world's own layout, so it works on the map and on every Library page.
 */
export function BitGuide({ place, user, ready, blocked, reduced, hintsShown, onHint, onOpen, onLogin, onOpenChange, celebrate, command, layered }: {
  place: Place;
  user: string | null;
  ready: boolean;
  /** Another dialogue (the landing, the login box) is up: no automatic introductions. */
  blocked: boolean;
  reduced: boolean;
  hintsShown: number;
  onHint: (next: number) => void;
  onOpen: (route: string) => void;
  onLogin: () => void;
  onOpenChange: (open: boolean) => void;
  /** A gate just opened. */
  celebrate: { id: string; n: number } | null;
  /** Opens a sequence from outside, for example Settings → Replay the introduction. */
  command: BitCommand | null;
  layered: boolean;
}) {
  const [prefs, setPrefs] = useState<BitPrefs>(loadBit);
  const [showing, setShowing] = useState<Showing | null>(null);
  const [extra, setExtra] = useState<Script>({});
  const [nudge, setNudge] = useState<{ text: string; start: string } | null>(null);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<Record<string, Source[]>>({});
  const serial = useRef(0);
  const fabRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const instant = prefs.instant || reduced;
  const open = !!showing;

  const script = useMemo(
    () => ({ ...scriptFor(place, { hintsShown, loggedIn: !!user, instant: prefs.instant }), ...extra }),
    [place.kind, place.name, place.topicId, place.challengeId, hintsShown, user, prefs.instant, extra],
  );

  useEffect(() => { onOpenChange(open); }, [open]);

  function remember(next: BitPrefs) {
    setPrefs(next);
    saveBit(next);
  }
  function markSeen(id: Tutorial) {
    setPrefs(prev => {
      if (prev.seen.includes(id)) return prev;
      const next = { ...prev, seen: [...prev.seen, id] };
      saveBit(next);
      return next;
    });
  }

  function show(id: string, lines: Script = script) {
    const line = lines[id];
    if (!line) {
      close();
      return;
    }
    if (!showing) returnFocus.current = document.activeElement as HTMLElement | null;
    serial.current += 1;
    setNudge(null);
    setShowing({ line, serial: serial.current });
  }

  function close() {
    setShowing(null);
    setBusy(false);
    const back = returnFocus.current;
    returnFocus.current = null;
    requestAnimationFrame(() => {
      if (back && back !== document.body && document.contains(back) && !back.closest('[hidden], [inert]')) back.focus();
      else fabRef.current?.focus();
    });
  }

  /** Adds runtime messages (a hint snapshot, an AI answer) and shows the first. */
  function showExtra(lines: BitLine[]) {
    const added = Object.fromEntries(lines.map(item => [item.id, item]));
    setExtra(prev => ({ ...prev, ...added }));
    show(lines[0].id, { ...script, ...added });
  }

  function giveHint() {
    const challenge = place.challengeId ? CHALLENGE_BY_ID[place.challengeId] : undefined;
    if (!challenge) {
      show(STARTS.place);
      return;
    }
    if (!user) {
      show('hint-guest');
      return;
    }
    // Snapshot the hint under its own id, so moving the shared hint counter does not change the text on screen.
    const [hint] = hintLines(challenge, hintsShown);
    const id = `hint-${challenge.id}-${hintsShown}`;
    if (hintsShown < challenge.hints.length) onHint(hintsShown + 1);
    showExtra([{ ...hint, id }]);
  }

  function run(choice: BitChoice) {
    const action = choice.action;
    if (!action) {
      if (choice.next) show(choice.next);
      else close();
      return;
    }
    switch (action.kind) {
      case 'route':
        close();
        onOpen(action.route);
        return;
      case 'ask':
        show(user ? STARTS.ask : 'ask-guest');
        return;
      case 'hint':
        giveHint();
        return;
      case 'intro':
        show(STARTS.welcome);
        return;
      case 'demo':
        show(STARTS.demo);
        return;
      case 'place':
        show(STARTS.place);
        return;
      case 'menu':
        show(STARTS.menu);
        return;
      case 'instant': {
        const on = !prefs.instant;
        remember({ ...prefs, instant: on });
        show(on ? 'instant-on' : 'instant-off');
        return;
      }
      case 'login':
        close();
        onLogin();
        return;
      case 'close':
        close();
    }
  }

  function advance() {
    if (!showing) return;
    if (showing.line.next) show(showing.line.next);
    else close();
  }

  // Automatic introductions: the welcome once, then one per kind of place. Gates only get a nudge.
  useEffect(() => {
    if (!ready || blocked || open) return;
    const timer = window.setTimeout(() => {
      if (!prefs.seen.includes('welcome')) {
        if (layered) return;
        markSeen('welcome');
        show(STARTS.welcome);
        return;
      }
      const tutorial = tutorialFor(place);
      if (!tutorial || prefs.seen.includes(tutorial)) return;
      markSeen(tutorial);
      if (AUTO_OPEN[tutorial]) show(STARTS.place);
      else setNudge({ text: NUDGES[tutorial], start: STARTS.place });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [ready, blocked, open, place.kind, place.name, layered, prefs.seen]);

  // A gate opened: celebrate beside the button, without covering what comes next.
  useEffect(() => {
    if (!celebrate) return;
    const text = celebration(celebrate.id);
    const line: BitLine = {
      id: `celebrate-${celebrate.n}`,
      speaker: 'bit',
      expression: 'happy',
      text,
      choices: [{ id: 'next', label: 'What’s next?', action: { kind: 'place' } }, { id: 'thanks', label: 'Thanks, Bit' }],
    };
    setExtra(prev => ({ ...prev, [line.id]: line }));
    setNudge({ text, start: line.id });
  }, [celebrate?.n]);

  useEffect(() => {
    if (!command) return;
    show(command.start === 'welcome' ? STARTS.welcome : command.start === 'demo' ? STARTS.demo : STARTS.menu);
  }, [command?.n]);

  // Nudges fade on their own.
  useEffect(() => {
    if (!nudge) return;
    const timer = window.setTimeout(() => setNudge(null), 9000);
    return () => window.clearTimeout(timer);
  }, [nudge]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    const n = serial.current + 1;
    const wait: BitLine = { id: `ai-wait-${n}`, speaker: 'bit', expression: 'thinking', text: 'Let me think about that…' };
    showExtra([wait]);
    let lines: BitLine[];
    try {
      const res = await fetch('/api/npc', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          characterId: 'bit',
          mode: 'explain',
          question: q,
          location: place.kind,
          place: place.name,
          ...(place.topicId ? { topic: place.topicId } : {}),
          ...(place.regionId ? { regionId: place.regionId } : {}),
          ...(place.challengeId ? { challengeId: place.challengeId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({})) as { answer?: unknown; error?: unknown; configured?: unknown; sources?: unknown };
      if (res.status === 401) {
        lines = [{ ...script['ask-guest'], id: `ai-login-${n}` }];
      } else if (res.status === 503 || data.configured === false) {
        lines = [{
          id: `ai-off-${n}`, speaker: 'bit', expression: 'surprised',
          text: 'My AI helper isn’t switched on for this server. My guided tips and curated hints still work.',
          choices: [{ id: 'menu', label: 'Back to options', next: 'menu' }, { id: 'ok', label: 'OK' }],
        }];
      } else if (!res.ok || typeof data.answer !== 'string' || !data.answer.trim()) {
        lines = [{
          id: `ai-error-${n}`, speaker: 'bit', expression: 'surprised',
          text: 'I couldn’t reach my AI helper just now. Try again in a moment.',
          choices: [{ id: 'again', label: 'Try again', next: 'ask' }, { id: 'menu', label: 'Back to options', next: 'menu' }],
        }];
      } else {
        const parts = sentences(data.answer, 4);
        lines = parts.map((text, index): BitLine => ({
          id: `ai-${n}-${index}`,
          speaker: 'bit',
          expression: index === 0 ? 'curious' : index === parts.length - 1 ? 'encouraging' : 'neutral',
          text,
          source: 'ai',
          tag: parts.length > 1 ? `${index + 1} of ${parts.length}` : undefined,
          ...(index < parts.length - 1
            ? { next: `ai-${n}-${index + 1}` }
            : { choices: [{ id: 'again', label: 'Ask another', next: 'ask' }, { id: 'menu', label: 'Back to options', next: 'menu' }, { id: 'thanks', label: 'Thanks, Bit' }] }),
        }));
        const cited = Array.isArray(data.sources) ? data.sources.filter(isSource) : [];
        if (cited.length) setSources(prev => ({ ...prev, [lines[lines.length - 1].id]: cited }));
        setQuestion('');
      }
    } catch {
      lines = [{
        id: `ai-error-${n}`, speaker: 'bit', expression: 'surprised',
        text: 'The account server could not be reached. My guided tips still work.',
        choices: [{ id: 'menu', label: 'Back to options', next: 'menu' }, { id: 'ok', label: 'OK' }],
      }];
    }
    setBusy(false);
    showExtra(lines);
  }

  const asking = showing?.line.action?.kind === 'ask';
  const cited = showing ? sources[showing.line.id] : undefined;

  return (
    <>
      <div className={`bit-dock${layered ? ' layered' : ''}${open ? ' hidden' : ''}`}>
        {nudge && !open && (
          <div className="bit-nudge" role="status">
            <button type="button" className="bit-nudge-text" onClick={() => show(nudge.start)}>{nudge.text}</button>
            <button type="button" className="bit-nudge-x" aria-label="Dismiss Bit’s tip" onClick={() => setNudge(null)}>✕</button>
          </div>
        )}
        <button
          ref={fabRef}
          type="button"
          className="bit-fab"
          aria-label="Talk to Bit, your cipher companion"
          aria-haspopup="dialog"
          title="Bit · your cipher companion"
          onClick={() => show(STARTS.menu)}
        >
          <BitSprite size={44} still={reduced} />
          <span className="bit-fab-label" aria-hidden="true">Bit</span>
        </button>
      </div>
      {showing && (
        <BitDialogue
          showing={showing}
          instant={instant}
          still={reduced}
          waiting={asking || busy}
          onAdvance={advance}
          onChoose={run}
          onClose={close}
          footnote={cited?.length ? (
            <div className="bit-sources">
              <p>Sources you gathered at the Research Desk (found by TinyFish automation, not independently verified):</p>
              <ol>
                {cited.map(source => (
                  <li key={source.n} value={source.n}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> · {source.publisher}</li>
                ))}
              </ol>
            </div>
          ) : null}
          extra={asking ? (
            <form className="bit-ask" onSubmit={ask}>
              <label className="bit-clip" htmlFor="bit-question">Your question for Bit</label>
              <input
                id="bit-question"
                value={question}
                maxLength={400}
                placeholder={place.topicId ? 'e.g. Why can’t Eve undo this?' : 'e.g. What does Eve see?'}
                autoComplete="off"
                autoFocus
                onChange={event => setQuestion(event.target.value)}
              />
              <button type="submit" className="bit-choice" disabled={busy || !question.trim()}>{busy ? '…' : 'Ask'}</button>
              <button type="button" className="bit-choice ghost" onClick={() => show(STARTS.menu)}>Back</button>
            </form>
          ) : null}
        />
      )}
    </>
  );
}

function isSource(value: unknown): value is Source {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.n === 'number' && typeof v.title === 'string' && typeof v.publisher === 'string' && typeof v.url === 'string' && /^https?:\/\//.test(v.url);
}
