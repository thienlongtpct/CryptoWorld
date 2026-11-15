import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useAccount } from '../account';
import {
  APPEARANCES,
  BRIDGE_ATTACK,
  CHARACTER_BY_ID,
  CHARACTERS,
  PORTRAYAL_BADGE,
  REGIONS,
  portrayalNotice,
  type AskMode,
  type Character,
  type Scenario,
} from '../characters/cast';
import { TOPIC_BY_ID } from '../vis/registry';
import { sprite } from '../characters/sprites';
import type { Spot } from './map';

/** Head and shoulders of the character's world sprite, so the dialogue and the world match. */
export function Portrait({ id, size = 40 }: { id: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Rows 0 to 15 of the 16 × 22 sprite: from the top of the hat down to the hands.
    ctx.drawImage(sprite(id, 'down', 0), 0, 0, 16, 16, 0, 0, canvas.width, canvas.height);
  }, [id]);
  return <canvas ref={ref} className="cw-portrait" width={64} height={64} style={{ width: size, height: size }} aria-hidden="true" />;
}

function Panel({ title, closeLabel, onClose, focusClose = false, backdrop = false, cardClass = '', children }: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  focusClose?: boolean;
  backdrop?: boolean;
  cardClass?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <div
      className="cw-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={event => { if (backdrop && event.target === event.currentTarget) onClose(); }}
    >
      <div className={`cw-card${cardClass ? ` ${cardClass}` : ''}`}>
        <h2 id={titleId}>{title}</h2>
        {children}
        <button type="button" className="btn ghost" onClick={onClose} autoFocus={focusClose}>{closeLabel}</button>
      </div>
    </div>
  );
}

export function Directory({ onClose, onOpen }: { onClose: () => void; onOpen: (route: string) => void }) {
  return (
    <Panel title="Meet the cryptographers" closeLabel="Close" onClose={onClose}>
      <p>Protocol characters are roles in a demonstration. Real people are AI educational portrayals of published work. A region marked not open has no tutoring yet. Its lessons are already in the Library.</p>
      <div className="cw-actions">
        {CHARACTERS.map(character => (
          <CharacterCard key={character.id} character={character} onOpen={onOpen} />
        ))}
      </div>
    </Panel>
  );
}

function CharacterCard({ character, onOpen }: { character: Character; onOpen: (route: string) => void }) {
  const regions = REGIONS.filter(region => character.regions.includes(region.id));
  return (
    <article className="cw-topic">
      <div className="cw-who">
        <Portrait id={character.id} />
        <div>
          <b>{character.name}</b>
          {character.type === 'portrayal' && <span className="cw-badge">{PORTRAYAL_BADGE}</span>}
        </div>
      </div>
      {character.type === 'portrayal' && <p>{portrayalNotice(character.name)}</p>}
      <p>{character.role}</p>
      {regions.length > 0 && <p>{regions.map(region => `${region.name}${region.open ? '' : ' (not open yet)'}`).join(' · ')}</p>}
      {character.biography && (
        <>
          <p>{character.biography.fullName}. {character.biography.contribution}</p>
          <p>{character.biography.note}</p>
          <ul className="cw-sources">
            {character.biography.sources.map(source => (
              <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>
            ))}
          </ul>
        </>
      )}
      <div className="cw-actions">
        {character.topics.map(id => {
          const topic = TOPIC_BY_ID[id];
          if (!topic) return null;
          return <button key={id} type="button" className="btn" onClick={() => onOpen(id)}>{topic.title}</button>;
        })}
      </div>
    </article>
  );
}

export function Talk({ spot, user, onClose, onOpen, onDirectory }: {
  spot: Spot;
  user: string | null;
  onClose: () => void;
  onOpen: (route: string) => void;
  onDirectory: () => void;
}) {
  const { openAuth } = useAccount();
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  // Focus the box itself: the dialogue can open as you walk up, and a held Space or Enter must not press a button.
  useEffect(() => { boxRef.current?.focus(); }, [spot.id]);
  const character = spot.characterId ? CHARACTER_BY_ID[spot.characterId] : undefined;
  // Room spots reuse the cast's appearance for the same character and region.
  const appearance = APPEARANCES.find(item => item.id === spot.id)
    ?? APPEARANCES.find(item => item.characterId === spot.characterId && item.regionId === spot.regionId);
  const text = user ? spot.signed : spot.guest;
  const portrayal = character?.type === 'portrayal';
  // The portrayal notice is shown once, as a caption, instead of repeated inside the speech.
  const notice = character && portrayal ? portrayalNotice(character.name) : '';
  const speech = notice && text.startsWith(notice) ? text.slice(notice.length).trim() : text;
  const lesson = spot.topic ? TOPIC_BY_ID[spot.topic] : undefined;
  return (
    <div
      className="cw-modal cw-talk-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="cw-dialog" ref={boxRef} tabIndex={-1}>
        <header className="cw-dialog-head">
          {character && <Portrait id={character.id} />}
          <div className="cw-dialog-name">
            <h2 id={titleId}>{character?.name ?? spot.name}</h2>
            <p>
              {spot.place ?? ''}
              {portrayal && <span className="cw-badge" title={notice}>{PORTRAYAL_BADGE}</span>}
            </p>
          </div>
          <button type="button" className="cw-x" aria-label="Close and keep exploring" onClick={onClose}>✕</button>
        </header>
        <p className="cw-speech">{speech}</p>
        {portrayal && <p className="cw-caption">{notice}</p>}
        {(spot.characterId === 'shannon' || lesson || (character && !user)) && (
          <div className="cw-chips">
            {lesson && (
              <button type="button" className="btn" onClick={() => onOpen(spot.topic!)}>
                {user ? `Open ${lesson.title}` : `Log in to open ${lesson.title}`}
              </button>
            )}
            {spot.characterId === 'shannon' && <button type="button" className="btn" onClick={onDirectory}>Meet the cryptographers</button>}
            {character && !user && (
              <button type="button" className="btn ghost" onClick={() => openAuth('signin', `Log in to ask ${character.name} a question. The introduction stays available without an account.`)}>
                Log in to ask
              </button>
            )}
          </div>
        )}
        {character && user && appearance && (
          <Ask character={character} regionId={appearance.regionId} questions={appearance.questions} />
        )}
      </div>
    </div>
  );
}

type TutorSource = { n: number; title: string; publisher: string; url: string };

function isTutorSource(value: unknown): value is TutorSource {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.n === 'number' && typeof v.title === 'string' && typeof v.publisher === 'string'
    && typeof v.url === 'string' && /^https?:\/\//.test(v.url);
}

function Ask({ character, regionId, questions }: { character: Character; regionId: string; questions: string[] }) {
  const [mode, setMode] = useState<AskMode>('explain');
  const [attack, setAttack] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<TutorSource[]>([]);
  const [research, setResearch] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bridge = regionId === 'bridge';
  const scenario: Scenario = bridge && attack && character.id !== 'eve' ? 'active' : 'passive';
  const malloryWaiting = character.id === 'mallory' && !attack;
  const roleAllowed = character.type === 'protocol';
  const canAttack = bridge && character.id !== 'eve';

  async function send(text: string) {
    const q = text.trim();
    if (busy || !q) return;
    setQuestion(q);
    setBusy(true);
    setError('');
    setAnswer('');
    setSources([]);
    setResearch(null);
    try {
      const res = await fetch('/api/npc', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ characterId: character.id, regionId, mode, question: q, scenario }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'The question could not be sent.');
        return;
      }
      setAnswer(typeof data.answer === 'string' ? data.answer : '');
      setSources(Array.isArray(data.sources) ? data.sources.filter(isTutorSource) : []);
      setResearch(typeof data.research === 'string' && /^research\?topic=[a-z0-9-]+$/.test(data.research) ? data.research : null);
    } catch {
      setError('The account server could not be reached.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(question);
  }

  return (
    <form className="cw-dialog-ask" onSubmit={submit}>
      <div className="cw-dialog-row">
        {!malloryWaiting && roleAllowed && (
          <div className="cw-seg" role="group" aria-label="Kind of answer">
            <button type="button" aria-pressed={mode === 'explain'} title="A teaching overview of the whole protocol" onClick={() => setMode('explain')}>Overview</button>
            <button type="button" aria-pressed={mode === 'role'} title={`Only what ${character.name} can know`} onClick={() => setMode('role')}>{character.name}’s view</button>
          </div>
        )}
        {canAttack && (
          <button type="button" className="cw-toggle" aria-pressed={attack} onClick={() => { setAttack(on => !on); setAnswer(''); }}>
            {attack ? 'Attack on' : 'Simulate attack'}
          </button>
        )}
      </div>
      {attack && canAttack && <p className="cw-caption cw-warn">{BRIDGE_ATTACK}</p>}
      {malloryWaiting
        ? <p className="cw-caption">Mallory stays out of the passive exchange. Turn on the attack simulation to ask.</p>
        : (
          <>
            {!answer && !busy && questions.length > 0 && (
              <div className="cw-chips" aria-label="Suggested questions">
                {questions.map(item => (
                  <button key={item} type="button" className="cw-chip" onClick={() => void send(item)}>{item}</button>
                ))}
              </div>
            )}
            {(busy || answer || error) && (
              <div className="cw-reply" aria-live="polite">
                {busy && <p className="cw-caption">{character.name} is thinking…</p>}
                {error && <p className="cw-attack" role="alert">{error}</p>}
                {answer && <p><b>{question}</b></p>}
                {answer && <p>{answer}</p>}
                {answer && sources.length > 0 && (
                  <div className="cw-sources">
                    <p className="cw-caption">Sources you gathered at the Research Desk (found by TinyFish automation, not independently verified):</p>
                    <ol>
                      {sources.map(source => (
                        <li key={source.n} value={source.n}>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> · {source.publisher}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {answer && research && (
                  <p className="cw-caption">
                    Want {character.name} to cite real sources? <a href={`#${research}`}>Gather some at the Research Desk</a>, then ask again.
                  </p>
                )}
              </div>
            )}
            <div className="cw-input">
              <input
                aria-label={`Ask ${character.name}`}
                placeholder={`Ask ${character.name}…`}
                value={question}
                maxLength={400}
                onChange={event => setQuestion(event.target.value)}
              />
              <button type="submit" className="btn" disabled={busy || !question.trim()}>{busy ? '…' : 'Ask'}</button>
            </div>
          </>
        )}
    </form>
  );
}

export function guideSpot(spots: Spot[], regionId: string) {
  return spots.find(spot => spot.regionId === regionId && spot.characterId === 'alice');
}
