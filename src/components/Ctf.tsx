import { useEffect, useState, type FormEvent } from 'react';
import { useAccount } from '../account';
import { CTF_BY_PATH, ctfId, flagMatches } from '../data/ctf';

export function Ctf({ pathId }: { pathId: string }) {
  const challenge = CTF_BY_PATH[pathId];
  const itemId = ctfId(pathId);
  const { user, progress, track, openAuth } = useAccount();
  const saved = progress[itemId] === 'done';
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const [hint, setHint] = useState(false);
  const [local, setLocal] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle');
  const solved = local || saved;

  useEffect(() => {
    setValue('');
    setWrong(false);
    setHint(false);
    setLocal(false);
  }, [pathId]);

  if (!challenge) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (flagMatches(value, challenge.flag)) {
      setWrong(false);
      setLocal(true);
      if (!user) return;
      setSaveState('saving');
      const ok = await track(itemId, 'done');
      setSaveState(ok ? 'idle' : 'error');
    } else setWrong(true);
  }

  return (
    <section className="ctf" aria-labelledby="ctf-h">
      <p className="practice-kicker" id="ctf-h">Final challenge</p>
      <h2>{challenge.title}</h2>
      <p className="ctf-brief">{challenge.briefing}</p>
      {solved ? (
        <p className="lesson-ok" role="status">Flag captured. {challenge.why}</p>
      ) : (
        <form className="ctf-form" onSubmit={submit}>
          <label>Flag
            <input value={value} onChange={e => { setValue(e.target.value); setWrong(false); }} autoComplete="off" spellCheck={false} placeholder="sunhacks{…}" aria-label="Flag" />
          </label>
          <div className="ctf-actions">
            <button type="submit" className="btn">Submit flag</button>
            <button type="button" className="btn ghost" onClick={() => setHint(h => !h)}>{hint ? 'Hide hint' : 'Hint'}</button>
          </div>
          {hint && <p className="ctf-hint">{challenge.hint}</p>}
          {wrong && <p className="acct-error" role="alert">That flag does not match. Work the problem again, or open the hint.</p>}
        </form>
      )}
      {solved && !user && <p className="paths-signin">Flag captured. <button type="button" className="btn" onClick={() => openAuth()}>Sign in</button> to save it on your account.</p>}
      {solved && user && saved && <p className="lesson-used" role="status">Saved on your account.</p>}
      {solved && user && !saved && saveState === 'saving' && <p role="status">Saving…</p>}
      {solved && user && !saved && saveState === 'error' && <p className="acct-error" role="alert">Could not save this on your account. <button type="button" className="btn" onClick={() => { setSaveState('saving'); void track(itemId, 'done').then(ok => setSaveState(ok ? 'idle' : 'error')); }}>Retry</button></p>}
    </section>
  );
}
