import { useEffect, useState, type ReactNode } from 'react';
import { Eyes, Html } from '../components/ui';
import { SunhacksMark } from '../components/SunhacksMark';
import { MissionRail } from '../components/MissionRail';
import { ENTRY_BY_ID } from '../data/entries';
import { PAGES } from '../data/pages';
import { EntryView } from '../pages/TermPage';
import { TOPIC_BY_ID, TOPICS, type Topic } from './registry';
import { AccountButton, useAccount } from '../account';
import { useTour } from './tour';

/** One animation step: what the stage shows, what the status box says, which pseudo-code line runs. */
export interface Frame { stage: ReactNode; status: ReactNode; line?: number | number[] }

/** An entry in the bottom-left action drawer. `form` appears beside it when the action is chosen. */
export interface Action { label: string; form?: ReactNode }

interface VisProps {
  topicId: string;
  /** Pseudo-code shown in the code-trace panel. */
  code?: string[];
  /** Animated topics pass frames; interactive-only topics pass `stage` instead. */
  frames?: Frame[];
  stage?: ReactNode;
  actions?: Action[];
  /** Play from the first frame whenever the trace changes (after an action's Go). */
  autoplay?: boolean;
  /**
   * Identity of the inputs that produced `frames`. Playback resets only when this changes,
   * so a late result (a hash digest arriving) can fill the current frames without rewinding.
   * When omitted, any new `frames` array is a new trace.
   */
  trace?: string;
}

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3, 4];
const narrowQuery = '(max-width: 860px)';

export function VisPage({ topicId, code, frames, stage, actions = [], autoplay = true, trace }: VisProps) {
  const topic = TOPIC_BY_ID[topicId];
  const tour = useTour();
  const { user, progress, openAuth, track } = useAccount();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(2);
  // On a phone the drawer and code panel stack over the diagram. A tour starts them closed.
  const [narrow, setNarrow] = useState(() => window.matchMedia(narrowQuery).matches);
  const [drawer, setDrawer] = useState(() => !(tour && window.matchMedia(narrowQuery).matches));
  const [active, setActive] = useState<number | null>(null);
  const [panel, setPanel] = useState(() => !(tour && window.matchMedia(narrowQuery).matches));
  const [lecture, setLecture] = useState(false);
  const reducedMotion = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)[0];
  const auto = autoplay && !(tour && reducedMotion);
  const n = frames?.length ?? 0;
  const token = trace ?? frames;
  // Store the previous trace in state, not a ref. A ref mutated during render survives the
  // restart React does for a render-phase update, so the restarted render would skip setI
  // and the step would stay on the old trace.
  const [prev, setPrev] = useState(token);
  if (prev !== token) {
    setPrev(token);
    setI(0);
    setPlaying(auto && n > 1);
  }

  useEffect(() => {
    if (!tour) return;
    const mq = window.matchMedia(narrowQuery);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [tour]);

  useEffect(() => {
    if (!playing) return;
    if (i >= n - 1) { setPlaying(false); return; }
    const t = window.setTimeout(() => setI(x => Math.min(x + 1, n - 1)), 1100 / SPEEDS[speedIdx]);
    return () => window.clearTimeout(t);
  }, [playing, i, n, speedIdx]);

  // Keyboard: space play/pause, ← → step, as in VisuAlgo.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const skip = tour
        ? 'input, textarea, select, button, a, [contenteditable]'
        : 'input, textarea, select, button, [contenteditable]';
      if ((e.target as HTMLElement).closest?.(skip) || !n) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (i >= n - 1) { setI(0); setPlaying(true); }
        else setPlaying(p => !p);
      }
      if (e.key === 'ArrowRight') { setPlaying(false); setI(x => Math.min(x + 1, n - 1)); }
      if (e.key === 'ArrowLeft') { setPlaying(false); setI(x => Math.max(x - 1, 0)); }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [n, i, tour]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => { void track(topicId, 'seen'); }, [topicId, track]);

  const step = n ? Math.min(Math.max(i, 0), n - 1) : 0;
  const frame = frames?.[step];
  const lines = frame?.line === undefined ? [] : Array.isArray(frame.line) ? frame.line : [frame.line];
  const group = TOPICS.filter(t => t.group === topic.group);
  const play = () => { if (step >= n - 1) setI(0); setPlaying(true); };

  const tourNarrow = !!tour && narrow;
  return (
    <div className={`vis${tour ? ' tour' : ''}`} style={{ ['--tc' as string]: topic.color }}>
      {topicId === 'hash' && !tour && (
        <div className="vis-mission">
          <MissionRail step="visualize" />
          <p className="vis-mission-note">Gemini tutors in Hash Forest explain concepts; they never mark the gate complete. Authored hints stay usable if Gemini is offline.</p>
        </div>
      )}
      <header className="vis-top">
        <div className="vis-brand">
          <a className="vis-logo" href="#world" aria-label="Return to Crypto Dungeon">VISU<span>CRYPTO</span></a>
          <SunhacksMark tone="dark" />
        </div>
        {!tour && (
          <nav className="vis-tabs" aria-label={`${topic.group} topics`}>
            <a href="#world">World</a>
            <a href="#library">Library</a>
            {group.map(t => (
              <a key={t.id} href={`#${t.id}`} className={t.id === topicId ? 'on' : ''} title={t.title}>{t.id === topicId ? t.title : t.abbr}</a>
            ))}
          </nav>
        )}
        <div className="vis-right">
          {topic.eyes && <Eyes />}
          <AccountButton tone="dark" />
          <button type="button" className={`vis-learn ${progress[topicId] === 'done' ? 'done' : ''}`} disabled={progress[topicId] === 'done' || saving}
            onClick={() => {
              if (!user) { openAuth(); return; }
              setSaving(true);
              setSaveError(false);
              void track(topicId, 'done').then(ok => { setSaving(false); setSaveError(!ok); });
            }}>
            {progress[topicId] === 'done' ? 'Learned' : saving ? 'Saving…' : 'Mark learned'}
          </button>
          <button type="button" className={`vis-lec ${lecture ? 'on' : ''}`} onClick={() => setLecture(x => !x)}>e-Lecture</button>
          {topicId === 'hash' && !tour && <a className="vis-lec" href="#research?topic=hash">Research</a>}
        </div>
      </header>
      {saveError && <p className="acct-error" role="alert">Could not save this on your account. Try Mark learned again.</p>}

      {tour && (
        <div className="tour-bar" role="region" aria-label={`Guided tour, stop ${tour.index} of ${tour.total}`}>
          <div className="tour-copy">
            <p className="tour-kicker">{tour.index} of {tour.total}</p>
            <h1 className="tour-title">{tour.title}</h1>
            <p className="tour-instruction">{tour.instruction}</p>
            <p className="tour-takeaway">{tour.takeaway}</p>
            {tour.aside && <p className="tour-aside">{tour.aside}</p>}
          </div>
          <div className="tour-nav">
            {tour.index > 1
              ? <a className="btn-l outline" href={`#tour-${tour.index - 1}`}>Back</a>
              : <button type="button" className="btn ghost" disabled>Back</button>}
            <a className="btn-l primary" href={tour.index === tour.total ? '#tour-done' : `#tour-${tour.index + 1}`}>Next</a>
            <a className="tour-exit" href="#world">Return to world</a>
          </div>
        </div>
      )}

      <main className="vis-stage">
        <div className="vis-stage-inner">{frame ? frame.stage : stage}</div>
      </main>

      {actions.length > 0 && (
        <div className={`vis-drawer ${drawer ? 'open' : ''}`}>
          <button type="button" className="vis-drawer-tog" aria-label={drawer ? 'Hide inputs' : 'Show inputs'} onClick={() => setDrawer(d => !d)}>{tourNarrow ? (drawer ? 'Hide inputs' : 'Show inputs') : (drawer ? '‹' : '›')}</button>
          {drawer && (
            <div className="vis-actions">
              {actions.map((a, k) => (
                <div key={a.label} className={`vis-act ${active === k ? 'on' : ''}`}>
                  <button type="button" onClick={() => setActive(active === k ? null : k)}>{a.label}</button>
                  {active === k && a.form && <div className="vis-form">{a.form}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(frame || code) && (
        <aside className={`vis-panel ${panel ? 'open' : ''}`}>
          <button type="button" className="vis-panel-tog" aria-label={panel ? 'Hide pseudocode' : 'Show pseudocode'} onClick={() => setPanel(p => !p)}>{tourNarrow ? (panel ? 'Hide pseudocode' : 'Show pseudocode') : (panel ? '›' : '‹')}</button>
          {panel && (
            <div className="vis-panel-body">
              <div className="vis-title">{topic.title}</div>
              {frame && <div className="vis-status" role="status">{frame.status}</div>}
              {code && <ol className="vis-code">{code.map((c, k) => <li key={k} className={lines.includes(k) ? 'on' : ''}>{c || ' '}</li>)}</ol>}
            </div>
          )}
        </aside>
      )}

      <footer className="vis-bar">
        {n > 1 ? (
          <>
            <label className="vis-speed">
              <span>{SPEEDS[speedIdx]}x</span>
              <input type="range" min={0} max={SPEEDS.length - 1} value={speedIdx} onChange={e => setSpeedIdx(+e.target.value)} aria-label="Animation speed" />
            </label>
            <div className="vis-ctrl">
              <button type="button" disabled={step <= 0} onClick={() => { setPlaying(false); setI(0); }} aria-label="First step" title="First step">⏮</button>
              <button type="button" disabled={step <= 0} onClick={() => { setPlaying(false); setI(x => Math.max(x - 1, 0)); }} aria-label="Previous step" title="Previous step (←)">◀</button>
              {playing
                ? <button type="button" className="big" onClick={() => setPlaying(false)} aria-label="Pause" title="Pause (space)">⏸</button>
                : <button type="button" className="big" onClick={play} aria-label="Play" title="Play (space)">▶</button>}
              <button type="button" disabled={step >= n - 1} onClick={() => { setPlaying(false); setI(x => Math.min(x + 1, n - 1)); }} aria-label="Next step" title="Next step (→)">▶|</button>
              <button type="button" disabled={step >= n - 1} onClick={() => { setPlaying(false); setI(n - 1); }} aria-label="Last step" title="Last step">⏭</button>
            </div>
            <input className="vis-scrub" type="range" min={0} max={n - 1} value={step} aria-label="Step"
              style={{ ['--p' as string]: `${(100 * step) / Math.max(1, n - 1)}%` }}
              onChange={e => { setPlaying(false); setI(+e.target.value); }} />
            <span className="vis-count">{step + 1} / {n}</span>
          </>
        ) : <span className="vis-hint">Interactive: change the inputs on the stage or in the actions menu.</span>}
        <a className="vis-dict" href="#terms">Dictionary</a>
      </footer>

      {lecture && <Lecture topic={topic} onClose={() => setLecture(false)} />}
    </div>
  );
}

/** e-Lecture: the dictionary entry and/or page section behind this topic. */
function Lecture({ topic, onClose }: { topic: Topic; onClose: () => void }) {
  const entry = topic.entry ? ENTRY_BY_ID[topic.entry] : undefined;
  const sec = topic.section ? Object.values(PAGES).flatMap(p => p.sections).find(s => s.id === topic.section) : undefined;
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [onClose]);
  return (
    <div className="vis-lecture" role="dialog" aria-label={`e-Lecture: ${topic.title}`} onClick={onClose}>
      <div className="vis-lecture-card" onClick={e => e.stopPropagation()}>
        <div className="vis-lecture-h"><span>e-Lecture</span><b>{topic.title}</b><button type="button" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="vis-lecture-body">
          {entry && <EntryView e={entry} lecture />}
          {sec && <div className="entry"><h3 dangerouslySetInnerHTML={{ __html: sec.title }} /><Html html={sec.intro} /></div>}
          {!entry && !sec && <p className="muted">No lecture notes for this topic yet.</p>}
          {entry && <p className="xref"><span><b>Dictionary</b><a href={`#def-${entry.id}`}>Open the full dictionary page for “{entry.headword}”</a></span></p>}
        </div>
      </div>
    </div>
  );
}
