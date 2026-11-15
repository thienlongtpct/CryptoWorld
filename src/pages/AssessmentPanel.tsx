import { useEffect, useState, type FormEvent } from 'react';
import { useAccount } from '../account';

interface Choice { id: string; label: string }
interface Item { id: string; prompt: string; choices: Choice[] }
interface Assessment {
  taskId: string;
  version: number;
  title: string;
  items: Item[];
}
interface GradeItem { id: string; correct: boolean; choice: string | null }
interface Grade {
  taskId: string;
  version: number;
  title: string;
  passed: boolean;
  correctCount: number;
  total: number;
  items: GradeItem[];
}

export function AssessmentPanel({ taskId, intro }: { taskId: string; intro: string }) {
  const { user, openAuth } = useAccount();
  const [form, setForm] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<Grade | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(null);
    setAnswers({});
    setGrade(null);
    setError('');
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/assessments/${encodeURIComponent(taskId)}`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof data.error === 'string' ? data.error : 'Could not load the assessment.');
          return;
        }
        setForm(data as Assessment);
      } catch {
        if (!cancelled) setError('Could not load the assessment.');
      }
    })();
    return () => { cancelled = true; };
  }, [taskId, user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form || !user) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId: form.taskId, version: form.version, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not grade the assessment.');
        return;
      }
      setGrade(data as Grade);
    } catch {
      setError('Could not grade the assessment.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <section className="practical-block" id={taskId}>
        <p className="practice-kicker">Assessment</p>
        <p>{intro}</p>
        <p className="paths-signin">Sign in to take this check. Answers stay on the server. <button type="button" className="btn" onClick={() => openAuth()}>Sign in</button></p>
      </section>
    );
  }

  return (
    <section className="practical-block" id={taskId}>
      <p className="practice-kicker">Assessment</p>
      <h2>{form?.title ?? 'Loading…'}</h2>
      <p>{intro}</p>
      {error && <p className="acct-error" role="alert">{error}</p>}
      {form && !grade && (
        <form className="practical-form" onSubmit={submit}>
          {form.items.map(item => (
            <fieldset key={item.id} className="practical-q">
              <legend>{item.prompt}</legend>
              {item.choices.map(choice => (
                <label key={choice.id}>
                  <input
                    type="radio"
                    name={item.id}
                    value={choice.id}
                    checked={answers[item.id] === choice.id}
                    onChange={() => setAnswers(prev => ({ ...prev, [item.id]: choice.id }))}
                  />
                  {choice.label}
                </label>
              ))}
            </fieldset>
          ))}
          <button type="submit" className="btn" disabled={busy || form.items.some(item => !answers[item.id])}>
            {busy ? 'Checking…' : 'Submit answers'}
          </button>
        </form>
      )}
      {grade && (
        <div className="lesson-ok" role="status">
          <p>
            Result: {grade.correctCount} of {grade.total} correct
            {grade.passed ? ' — all items matched the server key.' : ' — review the missed items and try again from this page.'}
          </p>
          <ul className="practical-grade">
            {grade.items.map(item => (
              <li key={item.id}>{item.correct ? 'Correct' : 'Not correct'} on item {item.id}.</li>
            ))}
          </ul>
          {!grade.passed && (
            <button type="button" className="btn ghost" onClick={() => setGrade(null)}>Try again</button>
          )}
        </div>
      )}
    </section>
  );
}
