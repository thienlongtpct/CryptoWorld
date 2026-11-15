import { useEffect, useId, useMemo, useState } from 'react';
import { useAccount } from '../account';
import { SEAL_LAB_TEMPLATE } from './labTemplate';
import { sealOf } from './challenges';

interface LabRun {
  id: string;
  status: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  timedOut?: boolean;
  error?: string;
  cleanupError?: string;
  note?: string;
  cacheHit?: boolean;
  executor?: string;
}

async function sha256Hex(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Maritime workbench beside the Forged seal gate. Execution never awards the gate. */
export function LabPanel({ onUseCandidate }: { onUseCandidate?: (word: string) => void }) {
  const titleId = useId();
  const { user, openAuth } = useAccount();
  const [code, setCode] = useState(SEAL_LAB_TEMPLATE);
  const [run, setRun] = useState<LabRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [compare, setCompare] = useState<{ a: string; b: string; ha: string; hb: string } | null>(null);
  const [health, setHealth] = useState<{ maritime?: boolean } | null>(null);

  const candidateGuess = useMemo(() => {
    const match = /same_seal\s+(\S+)/.exec(run?.stdout || '');
    return match?.[1] || '';
  }, [run?.stdout]);

  useEffect(() => {
    let live = true;
    fetch('/api/health', { credentials: 'same-origin' })
      .then(res => res.json())
      .then(body => { if (live) setHealth(body); })
      .catch(() => { if (live) setHealth({ maritime: false }); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!user || !run?.id) return;
    if (run.status !== 'queued' && run.status !== 'running') return;
    let live = true;
    const timer = window.setInterval(() => {
      void fetch(`/api/lab-runs/${encodeURIComponent(run.id)}`, { credentials: 'same-origin' })
        .then(async res => {
          const body = await res.json().catch(() => ({}));
          if (!live) return;
          if (res.status === 401) {
            openAuth('signin', 'Log in to view your lab run.');
            return;
          }
          if (!res.ok && res.status !== 410) {
            setError(typeof body.error === 'string' ? body.error : 'Could not refresh the lab run.');
            return;
          }
          setRun(body as LabRun);
        })
        .catch(() => {
          if (live) setError('Could not refresh the lab run.');
        });
    }, 1500);
    return () => { live = false; clearInterval(timer); };
  }, [user, run?.id, run?.status, openAuth]);

  async function startRun() {
    if (!user) {
      openAuth('signin', 'Log in to run the Maritime workbench. Your editor draft stays on this device.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/lab-runs', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ challengeId: 'seal', code }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        openAuth('signin', 'Log in to run the Maritime workbench.');
        return;
      }
      if (!res.ok) {
        setError(typeof body.error === 'string' ? body.error : 'Could not start the lab run.');
        return;
      }
      setRun(body as LabRun);
    } catch {
      setError('The account server could not be reached.');
    } finally {
      setBusy(false);
    }
  }

  async function compareDigests() {
    const a = 'LEAF';
    const b = candidateGuess || 'flea';
    const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
    setCompare({ a, b, ha, hb });
  }

  const maritimeOff = health && health.maritime === false;

  return (
    <section className="cw-lab" aria-labelledby={titleId}>
      <header className="cw-lab-head">
        <h3 id={titleId}>Maritime workbench</h3>
        <p>
          Open a fresh Python sandbox, search for another word with the same toy seal as LEAF, then
          inspect stdout. Running code here does <b>not</b> open the gate — submit a candidate below.
          The experiment shows the toy seal is weak: a hash alone does not authenticate a sender.
        </p>
      </header>

      {!user && (
        <p className="cw-lab-banner" role="status">
          Guests can read the template. Log in to execute it in a Maritime environment (or the local lab executor).
        </p>
      )}
      {maritimeOff && (
        <p className="cw-lab-banner" role="status">
          Maritime is not configured on this server. Ask an admin for MARITIME_API_KEY, or use LAB_EXECUTOR=local in development.
        </p>
      )}

      <label className="cw-lab-editor">
        Python editor
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          spellCheck={false}
          rows={16}
          aria-label="Toy seal Python template"
        />
      </label>

      <div className="cw-lab-actions">
        <button type="button" className="btn" disabled={busy} onClick={() => { void startRun(); }}>
          {!user ? 'Log in to run' : busy ? 'Starting…' : 'Run in fresh sandbox'}
        </button>
        <button type="button" className="btn ghost" onClick={() => setCode(SEAL_LAB_TEMPLATE)}>Reset template</button>
        <button type="button" className="btn ghost" onClick={() => { void compareDigests(); }}>
          Compare SHA-256 digests
        </button>
      </div>

      {error && <p className="cw-attack" role="alert">{error}</p>}

      {run && (
        <div className={`cw-lab-run status-${run.status}`} role="status" aria-live="polite">
          <p>
            <span className="cw-lab-pill">
              {run.cacheHit ? 'Cached result' : run.status}
              {run.executor === 'local' ? ' · local executor' : run.executor === 'maritime' ? ' · Maritime' : ''}
            </span>
            {run.timedOut && ' Timed out.'}
            {run.status === 'expired' && ' This run expired — start a new sandbox.'}
            {typeof run.exitCode === 'number' && ` Exit ${run.exitCode}.`}
          </p>
          {run.cacheHit && <p className="cw-lab-note">Cached — identical code reused your earlier run on this account (not a live re-execution).</p>}
          {run.executor === 'local' && !run.cacheHit && (
            <p className="cw-lab-note">Local development executor (LAB_EXECUTOR=local). Not a live Maritime sandbox.</p>
          )}
          {run.note && <p className="cw-lab-note">{run.note}</p>}
          {run.error && <p className="cw-attack">{run.error}</p>}
          {run.cleanupError && <p className="cw-hintline">{run.cleanupError}</p>}
          {(run.status === 'queued' || run.status === 'running') && (
            <p className="cw-lab-note">Waiting on the sandbox… authored hints and Submit stay available if this is slow or fails.</p>
          )}
          <label>
            stdout
            <pre className="cw-lab-out">{run.stdout || '…'}</pre>
          </label>
          <label>
            stderr
            <pre className="cw-lab-out">{run.stderr || '…'}</pre>
          </label>
          {candidateGuess && (
            <p>
              Detected candidate <b>{candidateGuess}</b>
              {onUseCandidate && (
                <>
                  {' '}
                  <button type="button" className="btn ghost" onClick={() => onUseCandidate(candidateGuess)}>
                    Copy into answer
                  </button>
                </>
              )}
              {sealOf(candidateGuess) === sealOf('LEAF') && candidateGuess.toUpperCase() !== 'LEAF'
                ? ' — same toy seal as LEAF.'
                : ''}
            </p>
          )}
        </div>
      )}

      {compare && (
        <div className="cw-lab-compare">
          <h4>SHA-256 of example messages</h4>
          <p><code>{compare.a}</code> → <code>{compare.ha}</code></p>
          <p><code>{compare.b}</code> → <code>{compare.hb}</code></p>
          <p>
            {compare.ha === compare.hb
              ? 'Digests match (unexpected for different messages).'
              : 'Digests differ — a real hash separates messages even when the toy seal collides.'}
          </p>
        </div>
      )}
    </section>
  );
}
