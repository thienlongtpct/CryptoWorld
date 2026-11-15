import { useId, useState, type FormEvent, type ReactNode } from 'react';
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
  type Portrait as PortraitColors,
  type Scenario,
} from '../characters/cast';
import { TOPIC_BY_ID } from '../vis/registry';
import type { Spot } from './map';

const ROWS = [
  '..hhh..',
  '.hhhhh.',
  '..sss..',
  '.sssss.',
  'sssssss',
  '.ss.ss.',
  '..p.p..',
  '.pp.pp.',
];

export function Portrait({ portrait }: { portrait: PortraitColors }) {
  return (
    <span className="cw-portrait" aria-hidden="true">
      {ROWS.map((row, y) => [...row].map((cell, x) => {
        const glasses = portrait.glasses && y === 2 && (x === 2 || x === 4);
        const color = glasses ? '#111' : cell === 'h' ? portrait.hair : cell === 's' ? portrait.shirt : cell === 'p' ? portrait.pants : 'transparent';
        return <i key={`${x}-${y}`} style={{ background: color }} />;
      }))}
    </span>
  );
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
        <Portrait portrait={character.portrait} />
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
  const character = spot.characterId ? CHARACTER_BY_ID[spot.characterId] : undefined;
  const appearance = APPEARANCES.find(item => item.id === spot.id);
  const text = user ? spot.signed : spot.guest;
  const title = spot.place && character ? `${character.name} · ${spot.place}` : spot.name;
  return (
    <Panel title={title} closeLabel="Continue exploring" onClose={onClose} backdrop cardClass="cw-talk">
      {character && (
        <div className="cw-who">
          <Portrait portrait={character.portrait} />
          <div>
            <b>{character.role}</b>
            {character.type === 'portrayal' && <span className="cw-badge">{PORTRAYAL_BADGE}</span>}
          </div>
        </div>
      )}
      {character?.type === 'portrayal' && <p>{portrayalNotice(character.name)}</p>}
      <p>{text}</p>
      {character && user && appearance && (
        <Ask
          character={character}
          regionId={appearance.regionId}
          questions={appearance.questions}
        />
      )}
      {character && !user && (
        <button type="button" className="btn" onClick={() => openAuth('signin', `Log in to ask ${character.name} a question. The introduction stays available without an account.`)}>
          Log in to ask a question
        </button>
      )}
      <div className="cw-actions">
        {spot.characterId === 'shannon' && <button type="button" className="btn" autoFocus onClick={onDirectory}>Meet the cryptographers</button>}
        {spot.topic && user && <button type="button" className="btn" autoFocus onClick={() => onOpen(spot.topic!)}>Open the lesson</button>}
        {spot.topic && !user && <button type="button" className="btn" autoFocus onClick={() => onOpen(spot.topic!)}>Log in to open this lesson</button>}
      </div>
    </Panel>
  );
}

function Ask({ character, regionId, questions }: { character: Character; regionId: string; questions: string[] }) {
  const [mode, setMode] = useState<AskMode>('explain');
  const [attack, setAttack] = useState(false);
  const [question, setQuestion] = useState(questions[0] ?? '');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bridge = regionId === 'bridge';
  const scenario: Scenario = bridge && attack && character.id !== 'eve' ? 'active' : 'passive';
  const malloryWaiting = character.id === 'mallory' && !attack;
  const roleAllowed = character.type === 'protocol';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !question.trim()) return;
    setBusy(true);
    setError('');
    setAnswer('');
    try {
      const res = await fetch('/api/npc', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ characterId: character.id, regionId, mode, question, scenario }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'The question could not be sent.');
        return;
      }
      setAnswer(typeof data.answer === 'string' ? data.answer : '');
    } catch {
      setError('The account server could not be reached.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="cw-ask" onSubmit={submit}>
      {character.id === 'eve' && <p>Eve is watching the public messages. She does not change them.</p>}
      {bridge && character.id !== 'eve' && !attack && (
        <button type="button" className="btn" onClick={() => setAttack(true)}>Activate the attack simulation</button>
      )}
      {bridge && attack && character.id !== 'eve' && <p className="cw-attack">{BRIDGE_ATTACK}</p>}
      {malloryWaiting && <p>Mallory stays out of the passive exchange until the attack simulation is on.</p>}
      {!malloryWaiting && (
        <>
          <div className="cw-actions">
            <button type="button" className="btn" aria-pressed={mode === 'explain'} onClick={() => setMode('explain')}>Explain the protocol</button>
            {roleAllowed && (
              <button type="button" className="btn" aria-pressed={mode === 'role'} onClick={() => { setMode('role'); setQuestion('What can you know at this step?'); }}>
                What can you know at this step?
              </button>
            )}
          </div>
          <p>{mode === 'role' ? 'This asks only for the view assigned to this character.' : 'This asks for a teaching overview, which is separate from one participant’s knowledge.'}</p>
          <div className="cw-actions">
            {questions.map(item => (
              <button key={item} type="button" className="btn ghost" onClick={() => setQuestion(item)}>{item}</button>
            ))}
          </div>
          <div className="cw-question-label">
            <span>Question</span>
            <span className="cw-question">
              <textarea
                aria-label="Question"
                value={question}
                maxLength={400}
                onChange={event => setQuestion(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button type="submit" className="btn cw-send" disabled={busy || !question.trim()}>{busy ? '…' : 'Send'}</button>
            </span>
          </div>
          <p>Enter sends the question.</p>
        </>
      )}
      {error && <p className="cw-attack" role="alert">{error}</p>}
      {answer && <p className="cw-answer">{answer}</p>}
    </form>
  );
}

export function guideSpot(spots: Spot[], regionId: string) {
  return spots.find(spot => spot.regionId === regionId && spot.characterId === 'alice');
}
