import { useEffect, useState, type FormEvent } from 'react';
import { useAccount } from '../account';
import { PRACTICE } from '../data/practice';

export function practiceId(entryId: string) {
  return `px-${entryId}`;
}

export function Practice({ entryId }: { entryId: string }) {
  const q = PRACTICE[entryId];
  const itemId = practiceId(entryId);
  const { user, progress, track, openAuth } = useAccount();
  const saved = progress[itemId] === 'done';
  const [pick, setPick] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const [local, setLocal] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle');
  const solved = local || saved;

  useEffect(() => {
    setPick(null);
    setWrong(false);
    setLocal(false);
  }, [entryId]);

  if (!q) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pick === null) { setWrong(true); return; }
    if (pick === q.answer) {
      setWrong(false);
      setLocal(true);
      if (!user) return;
      setSaveState('saving');
      const ok = await track(itemId, 'done');
      setSaveState(ok ? 'idle' : 'error');
    } else setWrong(true);
  }

  return (
    <section className="practice" aria-labelledby="practice-h">
      <p className="practice-kicker" id="practice-h">Practice</p>
      <p className="practice-prompt">{q.prompt}</p>
      {solved ? (
        <p className="lesson-ok" role="status">Correct. {q.why}</p>
      ) : (
        <form className="practice-form" onSubmit={submit}>
          <div className="practice-choices" role="radiogroup" aria-label="Answer">
            {q.choices.map((choice, i) => (
              <button key={choice} type="button" role="radio" aria-checked={pick === i} className={pick === i ? 'on' : ''} onClick={() => { setPick(i); setWrong(false); }}>{choice}</button>
            ))}
          </div>
          <button type="submit" className="btn">Check</button>
          {wrong && <p className="acct-error" role="alert">{pick === null ? 'Choose an answer first.' : 'Not that one. Read the entry again and try another.'}</p>}
        </form>
      )}
      {solved && !user && <p className="paths-signin">That answer is right. <button type="button" className="btn" onClick={() => openAuth()}>Sign in</button> to save it on your account.</p>}
      {solved && user && saved && <p className="lesson-used" role="status">Saved on your account.</p>}
      {solved && user && !saved && saveState === 'saving' && <p role="status">Saving…</p>}
      {solved && user && !saved && saveState === 'error' && <p className="acct-error" role="alert">Could not save this on your account. <button type="button" className="btn" onClick={() => { setSaveState('saving'); void track(itemId, 'done').then(ok => setSaveState(ok ? 'idle' : 'error')); }}>Retry</button></p>}
    </section>
  );
}
