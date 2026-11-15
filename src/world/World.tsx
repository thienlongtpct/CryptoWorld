import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { useAccount } from '../account';
import { accessReason, LIBRARY_SECTIONS, SHELVES } from '../access';
import { CATACOMB_GATES, CHALLENGE_BY_ID, challengeItemId } from '../dungeon/challenges';
import { ChallengePanel } from '../dungeon/ChallengePanel';
import {
  SOLVED_COUNT,
  canEnter,
  loadMotion,
  loadPlace,
  loadResume,
  markWelcome,
  nextGoal,
  homePlace,
  resolvePlace,
  roomOf,
  ROOM_LIST,
  ROOMS,
  saveMotion,
  savePlace,
  saveResume,
  saveDrafts,
  loadDrafts,
  stand,
  step,
  welcomePending,
  type Place,
  type Room,
} from '../dungeon/rooms';
import { TOPIC_BY_ID, type Topic } from '../vis/registry';
import { Directory, Portrait, Talk } from './dialogue';
import { Landing } from './Landing';
import { paint } from './draw';
import type { Spot } from './map';
import './world.css';

type Direction = 'up' | 'down' | 'left' | 'right';

function PadArrow({ dir }: { dir: Direction }) {
  const turn = dir === 'right' ? 90 : dir === 'down' ? 180 : dir === 'left' ? 270 : 0;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ transform: `rotate(${turn}deg)` }}>
      <path d="M9 3v12M9 3L4 8M9 3l5 5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const STEP: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEY_DIR: Record<string, Direction> = {
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
  arrowup: 'up', w: 'up',
  arrowdown: 'down', s: 'down',
};


function typingTarget(target: EventTarget | null): boolean {
  return !!(target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]');
}

/**
 * The game shell. `layer` is a Library page (visualization, dictionary, path, …) opened from the world.
 * The world stays mounted and paused underneath it, so closing the layer returns to the same room,
 * position, and open gate.
 */
export function World({ layer }: { layer?: ReactNode } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const catalogSearchRef = useRef<HTMLInputElement>(null);
  const account = useAccount();
  const { ready, online, user, progress, authOpen, openAuth, logout, requestAccess } = account;
  const initial = homePlace();
  const pos = useRef({ x: initial.x, y: initial.y });
  const roomRef = useRef(initial.room);
  const progressRef = useRef(progress);
  const userRef = useRef(user);
  const facing = useRef<Direction>('down');
  const keys = useRef(new Set<Direction>());
  const nearRef = useRef<Spot | null>(null);
  const nearId = useRef('');
  const uiLock = useRef(false);
  const authOpenRef = useRef(false);
  const interactRef = useRef<(spot: Spot) => void>(() => {});
  const stepRef = useRef<(dir: Direction) => void>(() => {});
  const pendingRef = useRef<null | (() => void)>(null);
  const booted = useRef(false);

  const [roomId, setRoomId] = useState(initial.room);
  const [near, setNear] = useState<Spot | null>(null);
  const [talk, setTalk] = useState<Spot | null>(null);
  const [challengeId, setChallengeId] = useState('');
  const [drafts, setDrafts] = useState(loadDrafts);
  const [listOpen, setListOpen] = useState(false);
  const [journal, setJournal] = useState(false);
  const [directory, setDirectory] = useState(false);
  const [settings, setSettings] = useState(false);
  const [catalog, setCatalog] = useState(false);
  const [summary, setSummary] = useState(false);
  const [preview, setPreview] = useState<Spot | null>(null);
  const [welcome, setWelcome] = useState(welcomePending);
  const [shelfId, setShelfId] = useState('');
  const [query, setQuery] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [status, setStatus] = useState('');
  const [motion, setMotion] = useState(loadMotion);
  const [reducedSystem, setReducedSystem] = useState(false);
  const [extra, setExtra] = useState<Record<string, 'done'>>({});

  const merged = useMemo(() => ({ ...progress, ...extra }), [progress, extra]);
  progressRef.current = merged;
  userRef.current = user;
  authOpenRef.current = authOpen;
  const room = roomOf(roomId);
  const modal = welcome || !!talk || !!challengeId || listOpen || journal || directory || settings || !!preview || summary;
  const layered = !!layer;
  layerRef.current = layered;
  uiLock.current = modal || authOpen || layered;
  const reduced = motion === 'reduce' || (motion === 'system' && reducedSystem);
  const solved = SOLVED_COUNT(merged);
  const goal = nextGoal(roomId, user, merged);
  const goalSpotRef = useRef<Spot | null>(null);
  goalSpotRef.current = goal.target ? room.spots.find(spot => spot.id === goal.target) ?? null : null;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedSystem(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.inert = modal || authOpen;
  }, [modal, authOpen]);

  useEffect(() => {
    if (welcome || talk || challengeId || listOpen || journal || authOpen || preview || summary || settings || layered) keys.current.clear();
  }, [welcome, talk, challengeId, listOpen, journal, authOpen, preview, summary, settings, layered]);

  // Leaving a Library page: save nothing new, restore the room's objective, and put focus back in the world.
  const wasLayered = useRef(layered);
  useEffect(() => {
    if (wasLayered.current && !layered) {
      setStatus(challengeId ? `Back at ${CHALLENGE_BY_ID[challengeId]?.title ?? 'the gate'}.` : `Back in ${roomOf(roomRef.current).name}.`);
      if (!challengeId) requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLButtonElement>('.cw-prompt-btn, .cw-bottom .btn')?.focus());
    }
    if (!wasLayered.current && layered) remember();
    wasLayered.current = layered;
  }, [layered]);

  function applyPlace(place: Place) {
    roomRef.current = place.room;
    pos.current = { x: place.x, y: place.y };
    setRoomId(place.room);
    savePlace(place);
  }

  function remember() {
    if (!booted.current) return;
    savePlace({ room: roomRef.current, x: pos.current.x, y: pos.current.y });
  }

  useEffect(() => {
    if (!ready) return;
    if (!booted.current) {
      booted.current = true;
      applyPlace(resolvePlace(loadPlace(), user, progress));
      const resume = loadResume();
      if (resume && user && CHALLENGE_BY_ID[resume]) setChallengeId(resume);
      return;
    }
    if (!user && !canEnter(roomRef.current, null, progressRef.current)) applyPlace(homePlace());
    if (user && pendingRef.current) {
      const run = pendingRef.current;
      pendingRef.current = null;
      run();
    }
    if (!authOpen && !user) pendingRef.current = null;
  }, [ready, user, progress, authOpen]);

  function afterLogin(reason: string, action: () => void) {
    if (userRef.current) {
      action();
      return;
    }
    pendingRef.current = action;
    openAuth('signin', reason);
  }

  function goTo(target: string, arrive?: { x: number; y: number }) {
    if (!canEnter(target, userRef.current, progressRef.current)) return;
    const next = roomOf(target);
    const at = arrive ?? next.spawn;
    applyPlace({ room: next.id, x: at.x, y: at.y });
    setListOpen(false);
    setPreview(null);
    setTalk(null);
    setStatus(next.objective);
  }

  function cleared(id: string) {
    const itemId = challengeItemId(id);
    setExtra(prev => ({ ...prev, [itemId]: 'done' }));
    const overlay = { ...progressRef.current, [itemId]: 'done' as const };
    progressRef.current = overlay;
    const current = roomOf(roomRef.current);
    const gate = current.spots.find(spot => spot.challengeId === id);
    const dest = gate?.to && canEnter(gate.to, userRef.current, overlay) ? roomOf(gate.to) : null;
    window.setTimeout(() => {
      saveResume('');
      setChallengeId('');
      if (!dest) {
        if (gate) setStatus(`${gate.name} is open. Walk through when you are ready.`);
        return;
      }
      applyPlace({ room: dest.id, x: dest.spawn.x, y: dest.spawn.y });
      if (dest.id === 'vault') setSummary(true);
      setStatus(dest.id === 'vault' ? 'The treasure room is open.' : `${dest.name} is open.`);
    }, reduced ? 0 : 500);
  }

  function interact(spot: Spot) {
    if (spot.kind === 'person') {
      setTalk(spot);
      return;
    }
    if (spot.kind === 'shelf') {
      setShelfId(spot.shelfId ?? '');
      setQuery('');
      setCatalog(true);
      catalogSearchRef.current?.focus();
      return;
    }
    if (spot.kind === 'future') {
      setPreview(spot);
      return;
    }
    if (spot.kind === 'chest') {
      setSummary(true);
      return;
    }
    if (spot.kind === 'door' && spot.to) {
      if (canEnter(spot.to, userRef.current, progressRef.current)) {
        goTo(spot.to, spot.arrive);
        return;
      }
      if (!userRef.current && roomOf(spot.to).entry === 'auth') {
        afterLogin(`Log in to enter ${spot.name} and save solved gates. You can keep reading the entrance.`, () => goTo(spot.to!, spot.arrive));
        return;
      }
      setPreview(spot);
      return;
    }
    if (spot.kind === 'gate') {
      const open = spot.requires?.every(id => progressRef.current[challengeItemId(id)] === 'done');
      if (open && spot.to) {
        goTo(spot.to);
        return;
      }
      if (spot.challengeId) setChallengeId(spot.challengeId);
    }
  }

  interactRef.current = interact;
  stepRef.current = stepOnce;

  function ask(route: string) {
    if (challengeId) saveResume(challengeId);
    remember();
    setTalk(null);
    setListOpen(false);
    setJournal(false);
    setDirectory(false);
    setSummary(false);
    requestAccess(route, accessReason(route));
  }

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Paused under a Library page: no movement, no painting.
      if (layerRef.current) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const current = roomOf(roomRef.current);
      const held = [...keys.current];
      if (!uiLock.current && held.length && !typingTarget(document.activeElement)) {
        let dx = 0;
        let dy = 0;
        for (const dir of held) {
          dx += STEP[dir].x;
          dy += STEP[dir].y;
          facing.current = dir;
        }
        const length = Math.hypot(dx, dy) || 1;
        pos.current = step(current, pos.current.x, pos.current.y, (dx / length) * 5.2 * dt, (dy / length) * 5.2 * dt, progressRef.current);
      }
      const spot = stand(current, pos.current.x, pos.current.y);
      // Walking onto an edge exit travels at once, without pressing a key.
      if (spot?.auto && !uiLock.current && Math.max(Math.abs(spot.x - pos.current.x), Math.abs(spot.y - pos.current.y)) < 0.6) {
        interactRef.current(spot);
        frame = requestAnimationFrame(tick);
        return;
      }
      if ((spot?.id ?? '') !== nearId.current) {
        nearId.current = spot?.id ?? '';
        nearRef.current = spot;
        setNear(spot);
        setStatus(spot ? promptFor(spot, userRef.current, progressRef.current) : current.objective);
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const nextW = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const nextH = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== nextW || canvas.height !== nextH) {
          canvas.width = nextW;
          canvas.height = nextH;
        }
        const stage = canvas.parentElement as HTMLElement | null;
        const insetTop = stage?.querySelector('.cw-top')?.getBoundingClientRect().height ?? 0;
        const insetBottom = stage?.querySelector('.cw-bottom')?.getBoundingClientRect().height ?? 0;
        if (stage) {
          stage.style.setProperty('--cw-hud-top', `${insetTop}px`);
          stage.style.setProperty('--cw-hud-bottom', `${insetBottom}px`);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          paint(ctx, canvas.width, canvas.height, dpr, {
            map: current.map,
            x: pos.current.x,
            y: pos.current.y,
            facing: facing.current,
            spots: current.spots,
            openCells: openCellsOf(current, progressRef.current),
            insetTop,
            insetBottom,
            time: now,
            reduced,
            goal: goalSpotRef.current,
            near: nearRef.current,
            walking: !uiLock.current && keys.current.size > 0,
          });
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const saver = window.setInterval(remember, 2000);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(saver);
      remember();
    };
  }, [reduced]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      // A Library page owns the keyboard (playback arrows, space, Escape).
      if (layerRef.current) return;
      const dir = KEY_DIR[event.key.toLowerCase()];
      if (dir) {
        if (typingTarget(event.target)) return;
        event.preventDefault();
        if (uiLock.current) return;
        const fresh = !keys.current.has(dir);
        keys.current.add(dir);
        if (fresh) stepRef.current(dir);
        return;
      }
      if (event.key === 'Escape') {
        if (authOpenRef.current) return;
        if (uiLock.current) {
          event.preventDefault();
          setTalk(null);
          saveResume('');
          setChallengeId('');
          setListOpen(false);
          setJournal(false);
          setDirectory(false);
          setSettings(false);
          setPreview(null);
          setSummary(false);
          if (welcome) {
            markWelcome();
            setWelcome(false);
          }
        }
        return;
      }
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
        if (typingTarget(event.target) || (event.target as HTMLElement).closest?.('button, a, [role="dialog"]')) return;
        if (uiLock.current || !nearRef.current) return;
        event.preventDefault();
        interactRef.current(nearRef.current);
      }
    };
    const up = (event: KeyboardEvent) => {
      const dir = KEY_DIR[event.key.toLowerCase()];
      if (dir) keys.current.delete(dir);
    };
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, [welcome]);

  function hold(dir: Direction, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const fresh = !keys.current.has(dir);
    keys.current.add(dir);
    facing.current = dir;
    if (fresh) stepOnce(dir);
  }

  function stepOnce(dir: Direction) {
    const current = roomOf(roomRef.current);
    pos.current = step(current, pos.current.x, pos.current.y, STEP[dir].x * 0.45, STEP[dir].y * 0.45, progressRef.current);
    facing.current = dir;
  }

  const draft = drafts[challengeId] ?? { answer: '', hints: 0 };
  function writeDraft(id: string, patch: Partial<{ answer: string; hints: number }>) {
    setDrafts(prev => {
      const current = prev[id] ?? { answer: '', hints: 0 };
      const next = { ...prev, [id]: { ...current, ...patch } };
      saveDrafts(next);
      return next;
    });
  }

  const backLabel = challengeId ? `Back to ${CHALLENGE_BY_ID[challengeId]?.title ?? 'the gate'}` : `Back to ${room.name}`;
  const bridgeOpen = merged[challengeItemId('wire')] === 'done';
  const sealOpen = merged[challengeItemId('seal')] === 'done';
  const overlapOpen = merged[challengeItemId('overlap')] === 'done';
  const progressBits = [
    { id: 'catacombs', label: 'Catacombs', done: solved, total: 3 },
    { id: 'bridge', label: 'Bridge', done: bridgeOpen ? 1 : 0, total: 1 },
    { id: 'forest', label: 'Forest', done: sealOpen ? 1 : 0, total: 1 },
    { id: 'gardens', label: 'Gardens', done: overlapOpen ? 1 : 0, total: 1 },
  ];
  return (
    <>
    {layered && (
      <nav className="cw-strip" aria-label="Crypto Dungeon">
        <span className="cw-strip-mark" aria-hidden="true">CRYPTO DUNGEON</span>
        <button type="button" className="cw-strip-back" onClick={() => { location.hash = 'world'; }}>
          <span aria-hidden="true">◂ </span>{backLabel}
        </button>
        <span className="cw-strip-where">{room.wing}{room.wing === 'Cipher Catacombs' ? ` · Gates ${solved}/3` : ''}</span>
      </nav>
    )}
    {layered && <div className="cw-layer">{layer}</div>}
    <div className={`cw${challengeId ? ' cw-encounter' : ''}${reduced ? ' cw-reduced' : ''}`} hidden={layered}>
      <div className="cw-body" ref={bodyRef}>
        <div className="cw-stage">
          <canvas ref={canvasRef} aria-hidden="true" />
          <header className="cw-top">
            <div className="cw-identity">
              <Portrait id="player" size={44} />
              <div className="cw-where">
                <p className="cw-kicker">Crypto Dungeon</p>
                <h1 className="cw-title">{room.name}</h1>
                <p className="cw-place">
                  {room.wing !== room.name && room.wing !== 'Outside' && <span>{room.wing}</span>}
                  {user
                    ? <span className="cw-pill">Gates {solved}/3</span>
                    : <span className="cw-pill guest">Guest</span>}
                </p>
              </div>
            </div>
            <div className="cw-progress" aria-label="Quest progress">
              {progressBits.map(bit => (
                <span key={bit.id} className={`cw-quest${bit.done >= bit.total ? ' done' : ''}`} title={`${bit.label}: ${bit.done}/${bit.total}`}>
                  <i aria-hidden="true" />
                  <b>{bit.label}</b>
                  <em>{bit.done}/{bit.total}</em>
                </span>
              ))}
            </div>
            <div className="cw-actions cw-inline">
              <button type="button" className="btn ghost" onClick={() => { setTalk(null); setJournal(false); setListOpen(true); }}>Map</button>
              <button type="button" className="btn ghost" onClick={() => setWelcome(true)}>Guide</button>
              <button type="button" className="btn ghost cw-icon-btn" aria-label="Settings" onClick={() => setSettings(true)}>⚙</button>
              {ready && !user && <button type="button" className="btn" onClick={() => openAuth('signin')}>Log in</button>}
              {ready && !user && <button type="button" className="btn ghost" onClick={() => openAuth('register')}>Sign up</button>}
              {ready && user && <button type="button" className="btn ghost" onClick={() => { void logout(); }}>Sign out</button>}
            </div>
          </header>
          {!modal && (
            <>
              <p className="cw-goal-banner" role="status">
                <span>Next</span>
                <b>{goal.text}</b>
              </p>
              {near && (
                <div className="cw-prompt">
                  <button type="button" className="cw-prompt-btn" onClick={() => interact(near)}>
                    <kbd>Space</kbd>
                    <span>{buttonFor(near, user, merged)}</span>
                  </button>
                </div>
              )}
              <footer className="cw-bottom">
                <p className="cw-status">{status || room.objective}</p>
                {!near && (
                  <p className="cw-keys" aria-hidden="true">
                    <kbd>WASD</kbd> walk · <kbd>Space</kbd> use · <kbd>Map</kbd> jump
                  </p>
                )}
                <div className="cw-actions cw-inline">
                  <button type="button" className="btn ghost" onClick={() => { setConfirmReset(false); setJournal(true); }}>Journal</button>
                  <button type="button" className="btn ghost" onClick={() => setCatalog(open => !open)}>Catalog</button>
                  {user && <button type="button" className="btn" onClick={() => ask('library')}>Library</button>}
                </div>
              </footer>
            </>
          )}
          <div className="cw-pad" aria-label="Movement">
            {(['up', 'left', 'down', 'right'] as Direction[]).map(dir => (
              <button
                key={dir}
                type="button"
                className={`btn ${dir}`}
                aria-label={`Walk ${dir}`}
                onPointerDown={event => hold(dir, event)}
                onPointerUp={() => keys.current.delete(dir)}
                onPointerCancel={() => keys.current.delete(dir)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    stepOnce(dir);
                  }
                }}
              >
                <PadArrow dir={dir} />
              </button>
            ))}
          </div>
        </div>
        {catalog && (
          <Catalog
            query={query}
            setQuery={setQuery}
            shelfId={shelfId}
            setShelfId={setShelfId}
            searchRef={catalogSearchRef}
            ready={ready}
            user={user}
            onOpen={ask}
            onClose={() => setCatalog(false)}
            onDirectory={() => setDirectory(true)}
          />
        )}
      </div>
      <p className="cw-live" aria-live="polite">{status}</p>
      {ready && !online && !user && <p className="cw-offline" role="status">The account server is not running. Start it with npm run server.</p>}
      {welcome && (
        <Landing
          user={user}
          ready={ready}
          onStart={() => { markWelcome(); setWelcome(false); setStatus(goal.text); }}
          onLogin={() => { markWelcome(); setWelcome(false); openAuth('signin'); }}
          onRegister={() => { markWelcome(); setWelcome(false); openAuth('register'); }}
          onBrowse={() => { markWelcome(); setWelcome(false); setShelfId(''); setQuery(''); setCatalog(true); }}
        />
      )}
      {talk && (
        <Talk
          spot={talk}
          user={user}
          onClose={() => setTalk(null)}
          onOpen={ask}
          onDirectory={() => { setTalk(null); setDirectory(true); }}
        />
      )}
      {challengeId && (
        <ChallengePanel
          id={challengeId}
          answer={draft.answer}
          hints={draft.hints}
          onAnswer={value => writeDraft(challengeId, { answer: value })}
          onHints={count => writeDraft(challengeId, { hints: count })}
          onClose={() => { saveResume(''); setChallengeId(''); }}
          onSolved={() => cleared(challengeId)}
          onLesson={ask}
        />
      )}
      {directory && <Directory onClose={() => setDirectory(false)} onOpen={ask} />}
      {listOpen && (
        <RoomList
          user={user}
          progress={merged}
          onClose={() => setListOpen(false)}
          onGo={goTo}
          onFuture={spot => { setListOpen(false); setPreview(spot); }}
          onOpen={ask}
        />
      )}
      {journal && (
        <Journal
          user={user}
          progress={merged}
          confirmReset={confirmReset}
          onAskConfirm={() => setConfirmReset(true)}
          onCancelReset={() => setConfirmReset(false)}
          onReset={() => {
            setExtra({});
            applyPlace(homePlace());
            setConfirmReset(false);
            setJournal(false);
            setStatus('Checkpoint reset. Solved gates stay on your account.');
          }}
          onOpen={ask}
          onClose={() => setJournal(false)}
        />
      )}
      {settings && (
        <Panel title="Settings" onClose={() => setSettings(false)}>
          <label className="cw-search">Motion
            <select value={motion} onChange={event => { const value = event.target.value as 'system' | 'reduce' | 'full'; setMotion(value); saveMotion(value); }}>
              <option value="system">Follow the system setting</option>
              <option value="reduce">Reduce motion</option>
              <option value="full">Allow motion</option>
            </select>
          </label>
          <p>Reduced motion keeps the torches still and skips the gate-opening pause. Paths and objects also have text labels.</p>
          <p>Tiles are from Anokolisa’s free Pixel Crawler pack. Every character is drawn by the game from one shared pixel template, so the cast and the player match.</p>
        </Panel>
      )}
      {preview && (
        <Panel title={preview.name} onClose={() => setPreview(null)}>
          <p>{user ? preview.signed : preview.guest}</p>
          {preview.summary && <p>{preview.summary}</p>}
          {preview.lesson && (
            <button type="button" className="btn" onClick={() => ask(preview.lesson!)}>
              {user ? 'Open the related lesson' : 'Log in to open the related lesson'}
            </button>
          )}
        </Panel>
      )}
      {summary && <VaultSummary progress={merged} onReplay={() => { setSummary(false); goTo('caesar'); }} onHub={() => { setSummary(false); goTo('sanctuary'); }} onOpen={ask} onClose={() => setSummary(false)} />}
    </div>
    </>
  );
}

function openCellsOf(room: Room, progress: Record<string, string>) {
  const cells = new Set<string>();
  for (const spot of room.spots) {
    if (spot.kind === 'gate' && spot.gate && spot.requires?.every(id => progress[challengeItemId(id)] === 'done')) {
      cells.add(`${spot.gate.x},${spot.gate.y}`);
    }
  }
  return cells;
}

function promptFor(spot: Spot, user: string | null, progress: Record<string, string>): string {
  if (spot.kind === 'person') return `${spot.name} is nearby. Press Space to talk.`;
  if (spot.kind === 'gate' && spot.requires?.every(id => progress[challengeItemId(id)] === 'done')) return `${spot.name} is open. Walk through or press Space.`;
  if (spot.kind === 'gate') return `${spot.name} blocks the way. Press Space to inspect it.`;
  if (spot.kind === 'door' && spot.to && !canEnter(spot.to, user, progress)) return `${spot.name} is locked.`;
  if (spot.kind === 'door') return `${spot.name} is ahead. Press Space to enter.`;
  if (spot.kind === 'shelf') return `${spot.name}. Press Space to browse.`;
  if (spot.kind === 'chest') return 'The treasure chest. Press Space to open it.';
  if (spot.kind === 'future') return `${spot.name} is not open yet.`;
  return `Near ${spot.name}. Press Space to use.`;
}

function buttonFor(spot: Spot, user: string | null, progress: Record<string, string>): string {
  if (spot.kind === 'person') return `Talk to ${spot.name}`;
  if (spot.kind === 'shelf') return `Browse ${spot.name}`;
  if (spot.kind === 'future') return `Inspect ${spot.name}`;
  if (spot.kind === 'chest') return 'Open the chest';
  if (spot.kind === 'gate') {
    const open = spot.requires?.every(id => progress[challengeItemId(id)] === 'done');
    if (open) return spot.to ? `Enter ${spot.name}` : `Review ${spot.name}`;
    return user ? `Inspect ${spot.name}` : `Read ${spot.name}`;
  }
  if (spot.kind === 'door' && spot.to && !user && roomOf(spot.to).entry === 'auth') return `Log in to enter ${spot.name}`;
  return `Enter ${spot.name}`;
}

/** A titled panel with a close button in the header, a body, and an ordered row of actions at the bottom. */
function Panel({ title, onClose, footer, wide = false, children }: { title: string; onClose: () => void; footer?: ReactNode; wide?: boolean; children: ReactNode }) {
  const titleId = useId();
  return (
    <div className="cw-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={`cw-card cw-panel${wide ? ' wide' : ''}`}>
        <header className="cw-panel-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="cw-x" aria-label={`Close ${title}`} onClick={onClose}>✕</button>
        </header>
        <div className="cw-panel-body">{children}</div>
        {footer && <footer className="cw-panel-foot">{footer}</footer>}
      </div>
    </div>
  );
}

function RoomList({ user, progress, onClose, onGo, onFuture, onOpen }: {
  user: string | null;
  progress: Record<string, string>;
  onClose: () => void;
  onGo: (roomId: string) => void;
  onFuture: (spot: Spot) => void;
  onOpen: (route: string) => void;
}) {
  const future = ROOM_LIST.flatMap(id => ROOMS[id].spots.filter(spot => spot.kind === 'future'));
  const wings = [...new Set(ROOM_LIST.map(id => ROOMS[id].wing))];
  return (
    <Panel title="Map" onClose={onClose} wide>
      <p className="cw-panel-lede">Jump to any room you have unlocked. You do not have to walk there.</p>
      {wings.map(wing => (
        <section key={wing} className="cw-group">
          <h3>{wing}</h3>
          {ROOM_LIST.filter(id => ROOMS[id].wing === wing).map(id => {
            const room = ROOMS[id];
            const allowed = canEnter(id, user, progress);
            return (
              <div key={id} className={`cw-item${allowed ? '' : ' locked'}`}>
                <div>
                  <b>{room.name}</b>
                  <p>{allowed ? room.objective : user ? 'Locked: solve the gate before it first.' : 'Log in to enter.'}</p>
                </div>
                <button type="button" className="btn" disabled={!allowed} onClick={() => onGo(id)}>{allowed ? 'Go' : 'Locked'}</button>
              </div>
            );
          })}
        </section>
      ))}
      {future.length > 0 && (
        <section className="cw-group">
          <h3>Coming later</h3>
          {future.map(spot => (
            <div key={spot.id} className="cw-item locked">
              <div>
                <b>{spot.name}</b>
                <p>{spot.summary}</p>
              </div>
              <div className="cw-item-actions">
                <button type="button" className="btn ghost" onClick={() => onFuture(spot)}>Read</button>
                {spot.lesson && <button type="button" className="btn ghost" onClick={() => onOpen(spot.lesson!)}>Lesson</button>}
              </div>
            </div>
          ))}
        </section>
      )}
    </Panel>
  );
}

function Journal({ user, progress, confirmReset, onAskConfirm, onCancelReset, onReset, onOpen, onClose }: {
  user: string | null;
  progress: Record<string, string>;
  confirmReset: boolean;
  onAskConfirm: () => void;
  onCancelReset: () => void;
  onReset: () => void;
  onOpen: (route: string) => void;
  onClose: () => void;
}) {
  const all = Object.values(CHALLENGE_BY_ID);
  const done = all.filter(challenge => progress[challengeItemId(challenge.id)] === 'done').length;
  return (
    <Panel
      title="Journal"
      onClose={onClose}
      wide
      footer={confirmReset
        ? <><button type="button" className="btn" onClick={onReset}>Yes, reset my position</button><button type="button" className="btn ghost" onClick={onCancelReset}>Keep it</button></>
        : <button type="button" className="btn ghost" onClick={onAskConfirm}>Reset position to the start</button>}
    >
      <p className="cw-panel-lede">{user ? `${done} of ${all.length} challenges solved on your account.` : 'Log in to save solved challenges. You can still read them here.'}</p>
      {[...new Set(all.map(challenge => challenge.wing))].map(wing => (
        <section key={wing} className="cw-group">
          <h3>{wing}</h3>
          {all.filter(challenge => challenge.wing === wing).map(challenge => {
            const solved = progress[challengeItemId(challenge.id)] === 'done';
            return (
              <div key={challenge.id} className="cw-item">
                <div>
                  <b>{challenge.title} <span className={`cw-state${solved ? ' done' : ''}`}>{solved ? 'Solved' : 'Not solved'}</span></b>
                  <p>{challenge.concepts.join(' · ')}</p>
                </div>
                <button type="button" className="btn ghost" onClick={() => onOpen(challenge.lesson)}>{TOPIC_BY_ID[challenge.lesson]?.title ?? 'Lesson'}</button>
              </div>
            );
          })}
        </section>
      ))}
      {confirmReset && <p className="cw-panel-lede">This moves you back to the start. Solved challenges stay on your account.</p>}
    </Panel>
  );
}

function VaultSummary({ progress, onReplay, onHub, onOpen, onClose }: {
  progress: Record<string, string>;
  onReplay: () => void;
  onHub: () => void;
  onOpen: (route: string) => void;
  onClose: () => void;
}) {
  const gates = CATACOMB_GATES.map(id => CHALLENGE_BY_ID[id]);
  const solved = gates.filter(challenge => progress[challengeItemId(challenge.id)] === 'done').length;
  return (
    <Panel
      title="Treasure room"
      onClose={onClose}
      wide
      footer={<>
        <button type="button" className="btn" autoFocus onClick={onHub}>Return to the Sanctuary</button>
        <button type="button" className="btn ghost" onClick={onReplay}>Replay the gates</button>
      </>}
    >
      <p className="cw-panel-lede">{solved === gates.length ? 'All three gates are open. Here is what you used to open them.' : `Gates solved: ${solved} of ${gates.length}.`}</p>
      <section className="cw-group">
        {gates.map(challenge => {
          const done = progress[challengeItemId(challenge.id)] === 'done';
          return (
            <div key={challenge.id} className={`cw-item${done ? '' : ' locked'}`}>
              <span className={`cw-check${done ? ' done' : ''}`} aria-hidden="true">{done ? '✓' : '·'}</span>
              <div>
                <b>{challenge.title}</b>
                <p>{challenge.concepts.join(' · ')}</p>
              </div>
              <button type="button" className="btn ghost" onClick={() => onOpen(challenge.lesson)}>Review {TOPIC_BY_ID[challenge.lesson]?.title ?? 'lesson'}</button>
            </div>
          );
        })}
      </section>
    </Panel>
  );
}

function Catalog({ query, setQuery, shelfId, setShelfId, searchRef, ready, user, onOpen, onClose, onDirectory }: {
  query: string;
  setQuery: (value: string) => void;
  shelfId: string;
  setShelfId: (id: string) => void;
  searchRef: RefObject<HTMLInputElement>;
  ready: boolean;
  user: string | null;
  onOpen: (route: string) => void;
  onClose: () => void;
  onDirectory: () => void;
}) {
  const needle = query.trim().toLowerCase();
  const topics = useMemo(() => {
    return SHELVES.flatMap(shelf => {
      if (shelfId && !needle && shelf.id !== shelfId) return [];
      return shelf.topics
        .map(id => TOPIC_BY_ID[id])
        .filter((topic): topic is Topic => !!topic && (!needle || `${topic.title} ${topic.abbr} ${topic.blurb} ${topic.tags.join(' ')} ${shelf.title} ${shelf.blurb}`.toLowerCase().includes(needle)))
        .map(topic => ({ shelf, topic }));
    });
  }, [needle, shelfId]);
  const browsing = needle.length > 0 || shelfId !== '';
  return (
    <aside className="cw-catalog" aria-label="Library catalog">
      <h2>Library</h2>
      <button type="button" className="btn ghost" onClick={onClose}>Hide catalog</button>
      <button type="button" className="btn ghost" onClick={onDirectory}>Meet the cryptographers</button>
      <p>{user ? 'Open a shelf, or search the existing visualizations.' : 'You can read the categories. Log in to open a visualization, quiz, or path.'}</p>
      <form className="cw-search" role="search" onSubmit={event => event.preventDefault()}>
        <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search the library" placeholder="Search topics" />
      </form>
      <div className="cw-shelf-row">
        <button type="button" className="btn ghost" aria-pressed={shelfId === ''} onClick={() => setShelfId('')}>All shelves</button>
        {SHELVES.map(shelf => (
          <article key={shelf.id} className="cw-topic">
            <button type="button" className="btn ghost" aria-pressed={shelfId === shelf.id} onClick={() => { setShelfId(shelf.id); setQuery(''); }}>
              {shelf.title}
            </button>
            <p>{shelf.blurb}</p>
          </article>
        ))}
      </div>
      {browsing && topics.map(({ shelf, topic }) => (
        <article key={topic.id} className="cw-topic">
          <b>{topic.title}</b>
          <p>{shelf.title}</p>
          <p>{topic.blurb}</p>
          <button type="button" className="btn" disabled={!ready} onClick={() => onOpen(topic.id)}>
            {user ? 'Open' : 'Log in to open'}
            <span className="cw-clip"> {topic.title}</span>
          </button>
        </article>
      ))}
      {!browsing && <p>Choose a category to read its topics, or search across the library.</p>}
      {browsing && !topics.length && <p>No topic matches that search.</p>}
      <h2>Library sections</h2>
      {LIBRARY_SECTIONS.map(section => (
        <article key={section.route} className="cw-topic">
          <b>{section.title}</b>
          <p>{section.blurb}</p>
          <button type="button" className="btn" disabled={!ready} onClick={() => onOpen(section.route)}>
            {user ? 'Open' : 'Log in to open'}
            <span className="cw-clip"> {section.title}</span>
          </button>
        </article>
      ))}
    </aside>
  );
}
