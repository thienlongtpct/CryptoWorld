import { useEffect, useState, type FormEvent } from 'react';
import { useAccount } from '../account';
import { LESSON_BY_ID, PATHS } from '../data/paths';

export function Lesson({ id }: { id: string }) {
  const lesson = LESSON_BY_ID[id];
  const { user, progress, openAuth, track } = useAccount();
  const [local, setLocal] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle');
  const correct = local || progress[id] === 'done';

  useEffect(() => { void track(id, 'seen'); }, [id, track]);
  useEffect(() => { setLocal(false); }, [id]);

  if (!lesson) return <p className="noresult">That lesson is not in the catalog. <a href="#paths">Learning paths</a></p>;

  async function finish() {
    setLocal(true);
    if (!user) return;
    setSaveState('saving');
    const ok = await track(id, 'done');
    setSaveState(ok ? 'idle' : 'error');
  }

  const usedBy = PATHS.filter(p => p.steps.some(s => s.id === id && s.kind === 'lesson'));
  return (
    <section className="lesson">
      <nav className="crumbs"><a href="#library">Library</a> › <a href="#paths">Learning paths</a> › {lesson.title}</nav>
      <p className="lesson-kicker">Foundation</p>
      <h1>{lesson.title}</h1>
      <p className="paths-lead">{lesson.blurb}</p>
      {id === 'mod' && <Modulo onCorrect={finish} solved={correct} />}
      {id === 'primes' && <Primes onCorrect={finish} solved={correct} />}
      {id === 'xor' && <Xor onCorrect={finish} solved={correct} />}
      {correct && user && progress[id] === 'done' && <p className="lesson-ok" role="status">Saved. This lesson counts on every path that includes it.</p>}
      {correct && user && progress[id] !== 'done' && saveState === 'saving' && <p role="status">Saving…</p>}
      {correct && user && progress[id] !== 'done' && saveState === 'error' && <p className="acct-error" role="alert">Could not save this lesson. <button type="button" className="btn" onClick={() => { void finish(); }}>Retry</button></p>}
      {correct && !user && <p className="paths-signin">That answer is right. <button type="button" className="btn" onClick={() => openAuth()}>Sign in</button> to save it on your path.</p>}
      <p className="lesson-used">On {usedBy.map(p => p.title).join(', ')}.</p>
    </section>
  );
}

function Check({ prompt, answer, success, solved, onCorrect }: { prompt: string; answer: number; success: string; solved: boolean; onCorrect: () => void }) {
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (Number(value) === answer) { setWrong(false); onCorrect(); }
    else setWrong(true);
  }
  if (solved) return <p className="lesson-ok" role="status">Correct. {success}</p>;
  return (
    <form className="lesson-check" onSubmit={submit}>
      <label>{prompt}<input inputMode="numeric" value={value} onChange={e => { setValue(e.target.value); setWrong(false); }} /></label>
      <button type="submit" className="btn">Check</button>
      {wrong && <p className="acct-error" role="alert">Not that number. Use the worked example above.</p>}
    </form>
  );
}

function Modulo({ solved, onCorrect }: { solved: boolean; onCorrect: () => void }) {
  return (
    <div className="lesson-body">
      <p>A number modulo <b>m</b> is the remainder after dividing by <b>m</b>. On a clock with 7 hours, counting 23 steps lands on the same hour as counting 2.</p>
      <p className="lesson-eq">23 = 3 × 7 + <b>?</b></p>
      <div className="lesson-clock" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map(n => <span key={n} className={solved && n === 2 ? 'on' : ''}>{n}</span>)}
      </div>
      <Check prompt="What is 23 mod 7?" answer={2} success="23 mod 7 is 2." solved={solved} onCorrect={onCorrect} />
    </div>
  );
}

function Primes({ solved, onCorrect }: { solved: boolean; onCorrect: () => void }) {
  return (
    <div className="lesson-body">
      <p>A prime has no divisors except 1 and itself. The greatest common divisor of two numbers is the last non-zero remainder in Euclid’s algorithm. RSA later needs two primes, and an exponent that shares no divisor with φ(n).</p>
      <ol className="lesson-eqs">
        <li>48 = 2 × 18 + 12</li>
        <li>18 = 1 × 12 + 6</li>
        <li>12 = 2 × 6 + 0</li>
      </ol>
      <Check prompt="What is gcd(48, 18)?" answer={6} success="gcd(48, 18) is 6." solved={solved} onCorrect={onCorrect} />
    </div>
  );
}

function Xor({ solved, onCorrect }: { solved: boolean; onCorrect: () => void }) {
  return (
    <div className="lesson-body">
      <p>XOR adds bits without a carry: 1⊕1 = 0 and 1⊕0 = 1. Doing it twice with the same key returns the original bits, which is why the one-time pad encrypts by XOR.</p>
      <pre className="lesson-bits">{`  0 1 1 0    6
⊕ 0 0 1 1    3
  0 1 0 1    ?`}</pre>
      <Check prompt="What is 6 XOR 3, as a decimal number?" answer={5} success="6 XOR 3 is 5." solved={solved} onCorrect={onCorrect} />
    </div>
  );
}
