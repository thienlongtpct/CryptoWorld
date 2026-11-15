import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { isRestricted } from './access';
import { ENTRY_BY_ID } from './data/entries';

export type LearnStatus = 'seen' | 'done';
export type AuthMode = 'signin' | 'register';

interface Intent {
  route: string;
  reason: string;
}

interface AccountState {
  /** Null until the first /api/me response. */
  ready: boolean;
  /** False when the account server cannot be reached. */
  online: boolean;
  user: string | null;
  progress: Record<string, LearnStatus>;
  authOpen: boolean;
  authMode: AuthMode;
  intent: Intent | null;
  openAuth: (mode?: AuthMode, reason?: string) => void;
  /** Close the dialog. A restricted page returns to the world without moving the character. */
  cancelAuth: () => void;
  /** Open a lesson when signed in, or the same login dialog when not. */
  requestAccess: (route: string, reason: string) => void;
  register: (username: string, password: string) => Promise<string>;
  login: (username: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  /** Record that the signed-in learner opened or finished an item. Returns false when nothing was saved. */
  track: (itemId: string, status: LearnStatus) => Promise<boolean>;
  /** Reload the signed-in progress map from the account server. */
  reload: () => Promise<boolean>;
}

const Ctx = createContext<AccountState | null>(null);

interface ProgressRow { itemId: string; status: LearnStatus }
interface ApiResult {
  user?: { username: string };
  progress?: ProgressRow[];
  status?: LearnStatus;
}

function readHash() {
  const raw = location.hash.replace(/^#/, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function post(path: string, body?: unknown): Promise<ApiResult> {
  const res = await fetch(path, {
    method: body === undefined ? 'POST' : path === '/api/progress' ? 'PUT' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'The account server could not do that.');
  return data as ApiResult;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [user, setUser] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, LearnStatus>>({});
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [intent, setIntentState] = useState<Intent | null>(null);
  const progressRef = useRef(progress);
  const userRef = useRef(user);
  const intentRef = useRef(intent);
  const generation = useRef(0);
  progressRef.current = progress;
  userRef.current = user;

  const setIntent = useCallback((next: Intent | null) => {
    intentRef.current = next;
    setIntentState(next);
  }, []);

  const apply = useCallback((data: { user?: { username: string } | null; progress?: ProgressRow[] }) => {
    const map = Object.fromEntries((data.progress ?? []).map(row => [row.itemId, row.status]));
    progressRef.current = map;
    userRef.current = data.user?.username ?? null;
    setUser(data.user?.username ?? null);
    setProgress(map);
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

  const finishAuth = useCallback(async (data: ApiResult) => {
    const dest = intentRef.current?.route ?? null;
    let rows: ProgressRow[] = [];
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('offline');
      const me = await res.json() as ApiResult;
      rows = me.progress ?? [];
      setOnline(true);
    } catch {
      rows = [];
    }
    const still = (intentRef.current?.route ?? null) === dest;
    generation.current += 1;
    apply({ user: data.user ?? null, progress: rows });
    setAuthOpen(false);
    setIntent(null);
    if (still && dest && readHash() !== dest) location.hash = dest;
  }, [apply, setIntent]);

  const register = useCallback(async (username: string, password: string) => {
    const data = await post('/api/register', { username, password });
    await finishAuth(data);
    return data.user?.username ?? username;
  }, [finishAuth]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await post('/api/login', { username, password });
    await finishAuth(data);
    return data.user?.username ?? username;
  }, [finishAuth]);

  const logout = useCallback(async () => {
    await post('/api/logout');
    generation.current += 1;
    userRef.current = null;
    progressRef.current = {};
    setUser(null);
    setProgress({});
    setAuthOpen(false);
    setIntent(null);
    if (isRestricted(readHash(), !!ENTRY_BY_ID[readHash()])) location.hash = 'world';
  }, [setIntent]);

  const track = useCallback(async (itemId: string, status: LearnStatus) => {
    const who = userRef.current;
    if (!who) return false;
    const gen = generation.current;
    const cur = progressRef.current[itemId];
    if (cur === 'done' || cur === status) return true;
    try {
      const saved = await post('/api/progress', { itemId, status });
      if (userRef.current !== who || generation.current !== gen) return false;
      const next = saved.status === 'done' || saved.status === 'seen' ? saved.status : status;
      const merged = { ...progressRef.current, [itemId]: next };
      progressRef.current = merged;
      setProgress(merged);
      return true;
    } catch {
      return false;
    }
  }, []);

  const openAuth = useCallback((mode: AuthMode = 'signin', reason?: string) => {
    setIntent(reason ? { route: '', reason } : null);
    setAuthMode(mode);
    setAuthOpen(true);
    void refresh();
  }, [refresh, setIntent]);

  const cancelAuth = useCallback(() => {
    setAuthOpen(false);
    setIntent(null);
    if (isRestricted(readHash(), !!ENTRY_BY_ID[readHash()])) location.hash = 'world';
  }, [setIntent]);

  const requestAccess = useCallback((dest: string, reason: string) => {
    if (userRef.current) {
      if (readHash() !== dest) location.hash = dest;
      return;
    }
    setIntent({ route: dest, reason });
    setAuthMode('signin');
    setAuthOpen(true);
  }, [setIntent]);

  const value = useMemo<AccountState>(() => ({
    ready, online, user, progress, authOpen, authMode, intent,
    openAuth, cancelAuth, requestAccess, register, login, logout, track, reload: refresh,
  }), [ready, online, user, progress, authOpen, authMode, intent, openAuth, cancelAuth, requestAccess, register, login, logout, track, refresh]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {authOpen && <AuthDialog />}
    </Ctx.Provider>
  );
}

export function useAccount(): AccountState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useAccount must be used inside <AccountProvider>');
  return value;
}

function AuthDialog() {
  const { cancelAuth, login, register, online, authMode, intent } = useAccount();
  const [mode, setMode] = useState<AuthMode>(authMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMode(authMode); }, [authMode]);

  useEffect(() => {
    const on = (event: KeyboardEvent) => { if (event.key === 'Escape') cancelAuth(); };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [cancelAuth]);

  async function submit(event: FormEvent) {
    event.preventDefault();
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
    <div className="acct-dialog" role="dialog" aria-modal="true" aria-labelledby="acct-title" aria-describedby="acct-reason" onClick={cancelAuth} onKeyDown={event => event.stopPropagation()}>
      <form className="acct-card" onClick={event => event.stopPropagation()} onSubmit={submit}>
        <div className="acct-h">
          <b id="acct-title">{mode === 'register' ? 'Sign up' : 'Log in'}</b>
          <button type="button" onClick={cancelAuth} aria-label="Close">✕</button>
        </div>
        <p id="acct-reason">{intent?.reason ?? 'Your account keeps the lessons and visualizations you have started and finished.'}</p>
        {!online && <p className="acct-error" role="alert">The account server is not running. Start it with <b>npm run server</b>.</p>}
        <label>Username<input autoFocus autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} /></label>
        {mode === 'register' && <p className="acct-hint">3–20 letters, digits or underscores. Password of at least 8 characters.</p>}
        {error && <p className="acct-error" role="alert">{error}</p>}
        <button type="submit" className="btn" disabled={busy || !online}>{busy ? 'Please wait…' : mode === 'register' ? 'Sign up' : 'Log in'}</button>
        <button type="button" className="acct-switch" onClick={() => { setMode(mode === 'register' ? 'signin' : 'register'); setError(''); }}>
          {mode === 'register' ? 'Log in' : 'Sign up'}
        </button>
        <button type="button" className="btn ghost" onClick={cancelAuth}>Continue exploring</button>
      </form>
    </div>
  );
}

export function AccountButton({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { ready, user, progress, openAuth, logout } = useAccount();
  const done = Object.values(progress).filter(status => status === 'done').length;
  if (!ready) return null;
  if (!user) {
    return <button type="button" className={`acct-btn ${tone === 'dark' ? 'on-dark' : ''}`} onClick={() => openAuth('signin')}>Log in</button>;
  }
  return (
    <span className={`acct-who ${tone === 'dark' ? 'on-dark' : ''}`}>
      <a href="#paths">{user}{done ? ` · ${done} learned` : ''}</a>
      <button type="button" onClick={() => { void logout(); }}>Sign out</button>
    </span>
  );
}
