import { useEffect, useId, useState, type FormEvent } from 'react';
import { useAccount } from '../account';
import { CHALLENGE_BY_ID, challengeItemId, type Challenge, type ClassifyChoice, type ClassifyItem } from '../dungeon/challenges.ts';
import { CHARACTER_BY_ID, PORTRAYAL_BADGE, portrayalNotice } from '../characters/cast';
import { counts, shiftCh } from '../lib/crypto';
import { Portrait } from '../world/dialogue';

export function ChallengePanel({
  id,
  answer,
  hints,
  onAnswer,
  onHints,
  onClose,
  onSolved,
  onLesson,
}: {
  id: string;
  answer: string;
  hints: number;
  onAnswer: (value: string) => void;
  onHints: (count: number) => void;
  onClose: () => void;
  onSolved: () => void;
  onLesson: (route: string) => void;
}) {
  const challenge = CHALLENGE_BY_ID[id];
  const titleId = useId();
  const { user, progress, openAuth, reload } = useAccount();
  const [wrong, setWrong] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [walkthrough, setWalkthrough] = useState('');
  const [tutorQ, setTutorQ] = useState('What should I try first?');
  const [tried, setTried] = useState('');
  const [tutor, setTutor] = useState('');
  const [tutorError, setTutorError] = useState('');
  const [tutorBusy, setTutorBusy] = useState(false);
  const [wrongRows, setWrongRows] = useState<Record<string, string>>({});
  const [incomplete, setIncomplete] = useState(false);
  const [explanation, setExplanation] = useState('');
  const solved = progress[challengeItemId(id)] === 'done';
  const guide = guideFor(id);
  const board = challenge?.params.kind === 'classify' ? challenge.params : null;
  const picks = board ? readPicks(answer) : {};
  const left = board ? board.items.filter(item => !picks[item.id]).length : 0;

  function pick(itemId: string, choiceId: string) {
    onAnswer(JSON.stringify({ ...picks, [itemId]: choiceId }));
    setIncomplete(false);
    // Nudges stay until the next submit, so the board does not shift under the pointer.
  }

  useEffect(() => {
    setWrong(false);
    setError('');
    setWalkthrough('');
    setTutor('');
    setTutorError('');
    setWrongRows({});
    setIncomplete(false);
    setExplanation('');
  }, [id]);

  if (!challenge) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      openAuth('signin', 'Log in to submit this gate and save it on your account. Your typed answer stays on this device.');
      return;
    }
    if (board && left) {
      setIncomplete(true);
      return;
    }
    setBusy(true);
    setWrong(false);
    setError('');
    try {
      const res = await fetch('/api/dungeon/submit', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ challengeId: id, answer: board ? picks : answer }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        openAuth('signin', 'Log in to submit this gate and save it on your account. Your typed answer stays on this device.');
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'The account server could not check that answer.');
        return;
      }
      if (!data.correct) {
        setWrong(true);
        if (board && data.nudges && typeof data.nudges === 'object') setWrongRows(data.nudges as Record<string, string>);
        return;
      }
      setWrongRows({});
      const saved = await reload();
      if (!saved) {
        setError('The answer was accepted, but the account progress could not be reloaded. Submit again. A repeated success does not add a second reward.');
        return;
      }
      // A board stays open after a correct answer so the explanation can be read before crossing.
      if (board) {
        setExplanation(typeof data.explanation === 'string' ? data.explanation : '');
        return;
      }
      onSolved();
    } catch {
      setError('The account server could not be reached. The gate stays closed until a signed-in check succeeds.');
    } finally {
      setBusy(false);
    }
  }

  async function showWalkthrough() {
    if (!user) {
      openAuth('signin', 'Log in to open the labeled walkthrough. Authored hints stay available after you sign in.');
      return;
    }
    setTutorError('');
    try {
      const res = await fetch('/api/dungeon/walkthrough', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ challengeId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'The walkthrough could not be loaded.');
        return;
      }
      setWalkthrough(typeof data.walkthrough === 'string' ? data.walkthrough : '');
    } catch {
      setError('The account server could not be reached.');
    }
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!user || !guide) return;
    setTutorBusy(true);
    setTutor('');
    setTutorError('');
    const question = `What I have tried: ${tried || 'nothing yet'}\n${tutorQ}`.slice(0, 400);
    try {
      const res = await fetch('/api/npc', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          characterId: guide.id,
          regionId: guide.regionId,
          mode: 'explain',
          scenario: 'passive',
          question,
          challengeId: id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTutorError(typeof data.error === 'string' ? data.error : 'Gemini could not answer. The authored hints and the submit button still work.');
        return;
      }
      setTutor(typeof data.answer === 'string' ? data.answer : '');
    } catch {
      setTutorError('The account server could not be reached. The authored hints and the submit button still work.');
    } finally {
      setTutorBusy(false);
    }
  }

  return (
    <div className="cw-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="cw-card challenge">
        <p className="cw-kicker">{challenge.difficulty}</p>
        <h2 id={titleId}>{challenge.title}</h2>
        <p>{challenge.objective}</p>
        <p className="cw-evidence"><b>Evidence. </b>{challenge.evidence}</p>
        <p>{challenge.flagFormat}</p>
        {user && challenge.tools.length > 0 && <Tools challenge={challenge} />}
        {!user && <p>Log in to use the tools, submit an answer, and save the gate. You can read the evidence before that.</p>}
        <form onSubmit={submit}>
          {board
            ? <Board question={board.question} items={board.items} choices={board.choices} picks={picks} wrongRows={wrongRows} disabled={!user} onPick={pick} />
            : (
              <label className="cw-search">Answer
                <input value={answer} onChange={event => { onAnswer(event.target.value); setWrong(false); }} autoComplete="off" spellCheck={false} autoFocus />
              </label>
            )}
          <div className="cw-actions">
            <button type="submit" className="btn" disabled={busy}>{busy ? 'Please wait…' : user ? 'Submit' : 'Log in to submit'}</button>
            {board && user && Object.keys(picks).length > 0 && (
              <button type="button" className="btn ghost" onClick={() => { onAnswer(''); setWrongRows({}); setWrong(false); setIncomplete(false); }}>Clear the board</button>
            )}
            {user && hints < challenge.hints.length && (
              <button type="button" className="btn ghost" onClick={() => onHints(hints + 1)}>Hint {hints + 1}</button>
            )}
            {user && <button type="button" className="btn ghost" onClick={() => { void showWalkthrough(); }}>Show the walkthrough</button>}
          </div>
        </form>
        {challenge.hints.slice(0, hints).map((hint, index) => <p key={hint} className="cw-hintline">Hint {index + 1}. {hint}</p>)}
        {walkthrough && <p className="cw-hintline">Walkthrough. This states the solution. {walkthrough}</p>}
        {incomplete && <p className="cw-attack" role="alert">Choose an answer for every value first. {left === 1 ? 'One row is' : `${left} rows are`} still empty.</p>}
        {wrong && board && <p className="cw-attack" role="alert">{Object.keys(wrongRows).length === 1 ? 'One row needs' : `${Object.keys(wrongRows).length} rows need`} another look. They are marked “Look again” on the board. The gate is unchanged, and you can try again.</p>}
        {wrong && !board && <p className="cw-attack" role="alert">That answer does not match. The gate is unchanged, and you can try again.</p>}
        {explanation && <p className="cw-answer">Why. {explanation}</p>}
        {error && <p className="cw-attack" role="alert">{error}</p>}
        {solved && <p className="cw-answer" role="status">The gate is open. This reward is already on your account.</p>}
        <div className="cw-actions">
          <button type="button" className="btn" onClick={() => onLesson(challenge.lesson)}>Learn this concept</button>
          {solved && <button type="button" className="btn" onClick={onSolved}>{board ? 'Close and cross the bridge' : 'Go through'}</button>}
          <button type="button" className="btn ghost" onClick={onClose}>Return to dungeon</button>
        </div>
        {user && guide && (
          <form className="cw-ask" onSubmit={ask}>
            <div className="cw-who">
              <Portrait portrait={guide.portrait} />
              <div>
                <b>Ask {guide.name}</b>
                {guide.type === 'portrayal' && <span className="cw-badge">{PORTRAYAL_BADGE}</span>}
              </div>
            </div>
            {guide.type === 'portrayal' && <p>{portrayalNotice(guide.name)}</p>}
            <p>Gemini starts from a hint. It does not mark the gate complete. If Gemini is unavailable, the hints above and Submit still work.</p>
            <label className="cw-search">What have you tried?
              <textarea value={tried} maxLength={180} onChange={event => setTried(event.target.value)} />
            </label>
            <label className="cw-search">Question
              <textarea value={tutorQ} maxLength={180} onChange={event => setTutorQ(event.target.value)} />
            </label>
            <button type="submit" className="btn" disabled={tutorBusy || !tutorQ.trim()}>{tutorBusy ? 'Please wait…' : 'Ask Gemini'}</button>
            {tutorError && <p className="cw-attack" role="alert">{tutorError}</p>}
            {tutor && <p className="cw-answer">{tutor}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

function guideFor(id: string) {
  if (id === 'caesar') return { ...CHARACTER_BY_ID.caesar, regionId: 'catacombs' };
  if (id === 'xor') return { ...CHARACTER_BY_ID.eve, regionId: 'catacombs' };
  if (id === 'vault') return { ...CHARACTER_BY_ID.daemen, regionId: 'catacombs' };
  if (id === 'wire') return { ...CHARACTER_BY_ID.eve, regionId: 'bridge' };
  return undefined;
}

function readPicks(answer: string): Record<string, string> {
  try {
    const parsed = JSON.parse(answer || '{}') as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch {
    return {};
  }
}

/** One radio group per value. Wrong rows carry a text marker and a nudge, not only a colour. */
function Board({ question, items, choices, picks, wrongRows, disabled, onPick }: {
  question: string;
  items: ClassifyItem[];
  choices: ClassifyChoice[];
  picks: Record<string, string>;
  wrongRows: Record<string, string>;
  disabled: boolean;
  onPick: (itemId: string, choiceId: string) => void;
}) {
  const name = useId();
  return (
    <div className="cw-board">
      <p className="cw-board-q">{question}</p>
      {items.map((item, index) => {
        const nudge = wrongRows[item.id];
        return (
          <fieldset key={item.id} className={`cw-row${nudge ? ' again' : ''}`} disabled={disabled}>
            <legend>
              <span>{item.label}</span>
              <code>{item.value}</code>
            </legend>
            <div className="cw-choices">
              {choices.map((choice, choiceIndex) => (
                <label key={choice.id} className={picks[item.id] === choice.id ? 'on' : ''}>
                  <input
                    type="radio"
                    name={`${name}-${item.id}`}
                    value={choice.id}
                    checked={picks[item.id] === choice.id}
                    onChange={() => onPick(item.id, choice.id)}
                    autoFocus={index === 0 && choiceIndex === 0 && !picks[item.id]}
                  />
                  {choice.label}
                </label>
              ))}
            </div>
            {nudge && <p className="cw-nudge"><b>Look again.</b> {nudge}</p>}
          </fieldset>
        );
      })}
    </div>
  );
}

function Tools({ challenge }: { challenge: Challenge }) {
  return (
    <div className="cw-tools">
      {challenge.tools.includes('shift') && <ShiftTool seed={challenge.params.kind === 'shift' ? challenge.params.ciphertext : ''} />}
      {challenge.tools.includes('frequency') && <FrequencyTool />}
      {challenge.tools.includes('xor') && <XorTool />}
      {challenge.tools.includes('convert') && <ConvertTool />}
    </div>
  );
}

function ShiftTool({ seed }: { seed: string }) {
  const [text, setText] = useState(seed);
  const [shift, setShift] = useState(0);
  const out = [...text].map(ch => shiftCh(ch, shift)).join('');
  return (
    <fieldset className="cw-tool">
      <legend>Caesar shift</legend>
      <p>Type letters. A positive shift moves them forward. A negative shift moves them back. Characters outside A–Z stay as typed.</p>
      <label>Letters <input value={text} onChange={event => setText(event.target.value)} spellCheck={false} /></label>
      <label>Shift
        <input type="number" min={-25} max={25} value={shift} onChange={event => setShift(Number(event.target.value))} />
      </label>
      <p>Result: <b>{out || '…'}</b></p>
    </fieldset>
  );
}

function FrequencyTool() {
  const [text, setText] = useState('');
  const tally = counts(text);
  const max = Math.max(1, ...tally);
  return (
    <fieldset className="cw-tool">
      <legend>Letter frequency</legend>
      <p>Counts A–Z only. The number next to each letter is the count, so the result does not depend on color.</p>
      <label>Text <input value={text} onChange={event => setText(event.target.value)} spellCheck={false} /></label>
      <ul className="cw-freq">
        {tally.map((count, index) => (
          <li key={index}>
            <span>{String.fromCharCode(65 + index)}</span>
            <span className="cw-bar" style={{ width: `${(count / max) * 100}%` }} />
            <span>{count}</span>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

function XorTool() {
  const [bytes, setBytes] = useState('');
  const [pad, setPad] = useState('');
  const parsed = parseBytes(bytes);
  const padByte = parseByte(pad);
  const rows = parsed && padByte !== null
    ? parsed.map(byte => {
      const next = byte ^ padByte;
      const ascii = next >= 32 && next <= 126 ? String.fromCharCode(next) : 'not a printable ASCII character';
      return `${byte.toString(16).padStart(2, '0')} XOR ${padByte.toString(16).padStart(2, '0')} = ${next.toString(16).padStart(2, '0')} (${ascii})`;
    })
    : [];
  return (
    <fieldset className="cw-tool">
      <legend>XOR calculator</legend>
      <p>Enter ciphertext bytes as hex pairs separated by spaces, such as 47 45 5e. Enter the pad as a hex byte, such as 17. The result lists hex and ASCII.</p>
      <label>Ciphertext hex <input value={bytes} onChange={event => setBytes(event.target.value)} spellCheck={false} /></label>
      <label>Pad hex <input value={pad} onChange={event => setPad(event.target.value)} spellCheck={false} /></label>
      {rows.map(row => <p key={row}>{row}</p>)}
      {bytes && (!parsed || padByte === null) && <p role="status">Use hex bytes only, two digits each, separated by spaces.</p>}
    </fieldset>
  );
}

function ConvertTool() {
  const [text, setText] = useState('');
  const [hex, setHex] = useState('');
  const fromText = [...text].map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
  const parsed = parseBytes(hex);
  const fromHex = parsed ? parsed.map(byte => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')).join('') : '';
  return (
    <fieldset className="cw-tool">
      <legend>Text and hex</legend>
      <p>Text becomes one ASCII byte per character, written as hex. Hex becomes ASCII when each byte is two hex digits.</p>
      <label>Text <input value={text} onChange={event => setText(event.target.value)} spellCheck={false} /></label>
      <p>Hex: <b>{fromText || '…'}</b></p>
      <label>Hex bytes <input value={hex} onChange={event => setHex(event.target.value)} spellCheck={false} /></label>
      <p>Text: <b>{fromHex || '…'}</b></p>
    </fieldset>
  );
}

function parseByte(value: string): number | null {
  const cleaned = value.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{1,2}$/.test(cleaned)) return null;
  return Number.parseInt(cleaned, 16);
}

function parseBytes(value: string): number[] | null {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const bytes = parts.map(parseByte);
  if (bytes.some(byte => byte === null)) return null;
  return bytes as number[];
}
