import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';

export type LearnStatus = 'seen' | 'done';

interface AccountState {
  /** Null until the first /api/me response. */
  ready: boolean;
  /** False when the account server cannot be reached. */
  online: boolean;
  user: string | null;
  progress: Record<string, LearnStatus>;
  authOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  register: (username: string, password: string) => Promise<string>;
  login: (username: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  /** Record that the signed-in learner opened or finished an item. Returns false when nothing was saved. */
  track: (itemId: string, status: LearnStatus) => Promise<boolean>;
}

const Ctx = createContext<AccountState | null>(null);

async function post(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: body === undefined ? 'POST' : path === '/api/progress' ? 'PUT' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'The account server could not do that.');
  return data as { user?: { username: string }; progress?: { itemId: string; status: LearnStatus }[] };
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [user, setUser] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, LearnStatus>>({});
  const [authOpen, setAuthOpen] = useState(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const apply = useCallback((data: { user?: { username: string } | null; progress?: { itemId: string; status: LearnStatus }[] }) => {
    setUser(data.user?.username ?? null);
    setProgress(Object.fromEntries((data.progress ?? []).map(p => [p.itemId, p.status])));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('offline');
      setOnline(true);
      apply(await res.json());
      return true;
    } catch {
      setOnline(false);
      return false;
    }
  }, [apply]);

  useEffect(() => {
    let live = true;
    refresh().finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [refresh]);

  const register = useCallback(async (username: string, password: string) => {
    const data = await post('/api/register', { username, password });
    const me = await fetch('/api/me', { credentials: 'same-origin' }).then(r => r.json());
    apply({ user: data.user, progress: me.progress });
    setAuthOpen(false);
    return data.user?.username ?? username;
  }, [apply]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await post('/api/login', { username, password });
    const me = await fetch('/api/me', { credentials: 'same-origin' }).then(r => r.json());
    apply({ user: data.user, progress: me.progress });
    setAuthOpen(false);
    return data.user?.username ?? username;
  }, [apply]);

  const logout = useCallback(async () => {
    await post('/api/logout');
    setUser(null);
    setProgress({});
  }, []);

  const track = useCallback(async (itemId: string, status: LearnStatus) => {
    if (!user) return false;
    const cur = progressRef.current[itemId];
    if (cur === 'done' || cur === status) return true;
    setProgress(p => ({ ...p, [itemId]: status }));
    try {
      await post('/api/progress', { itemId, status });
      return true;
    } catch {
      setProgress(p => {
        const next = { ...p };
        if (cur) next[itemId] = cur; else delete next[itemId];
        return next;
      });
      return false;
    }
  }, [user]);

  const value = useMemo<AccountState>(() => ({
    ready, online, user, progress, authOpen,
    openAuth: () => { setAuthOpen(true); void refresh(); },
    closeAuth: () => setAuthOpen(false),
    register, login, logout, track,
  }), [ready, online, user, progress, authOpen, register, login, logout, track, refresh]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {authOpen && <AuthDialog />}
    </Ctx.Provider>
  );
}

export function useAccount(): AccountState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAccount must be used inside <AccountProvider>');
  return v;
}

function AuthDialog() {
  const { closeAuth, login, register, online } = useAccount();
  const [mode, setMode] = useState<'signin' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuth(); };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [closeAuth]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await (mode === 'register' ? register : login)(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the account server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="acct-dialog" role="dialog" aria-label={mode === 'register' ? 'Create an account' : 'Sign in'} onClick={closeAuth} onKeyDown={e => e.stopPropagation()}>
      <form className="acct-card" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="acct-h">
          <b>{mode === 'register' ? 'Create an account' : 'Sign in'}</b>
          <button type="button" onClick={closeAuth} aria-label="Close">✕</button>
        </div>
        <p>Your account keeps the lessons and visualizations you have started and finished.</p>
        {!online && <p className="acct-error" role="alert">The account server is not running. Start it with <b>npm run server</b>.</p>}
        <label>Username<input autoFocus autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>
        {mode === 'register' && <p className="acct-hint">3–20 letters, digits or underscores. Password of at least 8 characters.</p>}
        {error && <p className="acct-error" role="alert">{error}</p>}
        <button type="submit" className="btn" disabled={busy || !online}>{busy ? 'Saving…' : mode === 'register' ? 'Create account' : 'Sign in'}</button>
        <button type="button" className="acct-switch" onClick={() => { setMode(mode === 'register' ? 'signin' : 'register'); setError(''); }}>
          {mode === 'register' ? 'Already registered? Sign in' : 'New here? Create an account'}
        </button>
      </form>
    </div>
  );
}

export function AccountButton({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { ready, user, progress, openAuth, logout } = useAccount();
  const done = Object.values(progress).filter(s => s === 'done').length;
  if (!ready) return null;
  if (!user) {
    return <button type="button" className={`acct-btn ${tone === 'dark' ? 'on-dark' : ''}`} onClick={openAuth}>Sign in</button>;
  }
  return (
    <span className={`acct-who ${tone === 'dark' ? 'on-dark' : ''}`}>
      <a href="#paths">{user}{done ? ` · ${done} learned` : ''}</a>
      <button type="button" onClick={() => { void logout(); }}>Sign out</button>
    </span>
  );
}
