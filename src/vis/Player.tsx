import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Eyes, Html } from '../components/ui';
import { SunhacksMark } from '../components/SunhacksMark';
import { ENTRY_BY_ID } from '../data/entries';
import { PAGES } from '../data/pages';
import { EntryView } from '../pages/TermPage';
import { TOPIC_BY_ID, TOPICS, type Topic } from './registry';
import { AccountButton, useAccount } from '../account';

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
  /** Play from the first frame whenever `frames` changes (after an action's Go). */
  autoplay?: boolean;
}

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3, 4];

export function VisPage({ topicId, code, frames, stage, actions = [], autoplay = true }: VisProps) {
  const topic = TOPIC_BY_ID[topicId];
  const { user, progress, openAuth, track } = useAccount();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(2);
  const [drawer, setDrawer] = useState(true);
  const [active, setActive] = useState<number | null>(null);
  const [panel, setPanel] = useState(true);
  const [lecture, setLecture] = useState(false);
  const prevFrames = useRef(frames);
  const n = frames?.length ?? 0;

  // New trace (e.g. after "Go"): rewind and play. The first trace waits for the user to press play.
  useEffect(() => {
    if (prevFrames.current === frames) return;
    prevFrames.current = frames;
    setI(0);
    setPlaying(autoplay && n > 1);
  }, [frames]);

  useEffect(() => {
    if (!playing) return;
    if (i >= n - 1) { setPlaying(false); return; }
    const t = window.setTimeout(() => setI(x => Math.min(x + 1, n - 1)), 1100 / SPEEDS[speedIdx]);
    return () => window.clearTimeout(t);
  }, [playing, i, n, speedIdx]);

  // Keyboard: space play/pause, ← → step, as in VisuAlgo.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('input, textarea, select, button, [contenteditable]') || !n) return;
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => (i >= n - 1 ? (setI(0), true) : !p)); }
      if (e.key === 'ArrowRight') { setPlaying(false); setI(x => Math.min(x + 1, n - 1)); }
      if (e.key === 'ArrowLeft') { setPlaying(false); setI(x => Math.max(x - 1, 0)); }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [n, i]);

  useEffect(() => { void track(topicId, 'seen'); }, [topicId, track]);

  const frame = frames?.[Math.min(i, n - 1)];
  const lines = frame?.line === undefined ? [] : Array.isArray(frame.line) ? frame.line : [frame.line];
  const group = TOPICS.filter(t => t.group === topic.group);
  const play = () => { if (i >= n - 1) setI(0); setPlaying(true); };

  return (
    <div className="vis" style={{ ['--tc' as string]: topic.color }}>
      <header className="vis-top">
        <div className="vis-brand">
          <a className="vis-logo" href="#top" aria-label="VisuCrypto home">VISU<span>CRYPTO</span></a>
          <SunhacksMark tone="dark" />
        </div>
        <nav className="vis-tabs" aria-label={`${topic.group} topics`}>
          <a href="#top">Home</a>
          {group.map(t => (
            <a key={t.id} href={`#${t.id}`} className={t.id === topicId ? 'on' : ''} title={t.title}>{t.id === topicId ? t.title : t.abbr}</a>
          ))}
        </nav>
        <div className="vis-right">
          <Eyes />
          <AccountButton tone="dark" />
          <button type="button" className={`vis-learn ${progress[topicId] === 'done' ? 'done' : ''}`} disabled={progress[topicId] === 'done'}
            onClick={() => { if (!user) openAuth(); else void track(topicId, 'done'); }}>
            {progress[topicId] === 'done' ? 'Learned' : 'Mark learned'}
          </button>
          <button type="button" className={`vis-lec ${lecture ? 'on' : ''}`} onClick={() => setLecture(x => !x)}>e-Lecture</button>
        </div>
      </header>

      <main className="vis-stage">
        <div className="vis-stage-inner">{frame ? frame.stage : stage}</div>
      </main>

      {actions.length > 0 && (
        <div className={`vis-drawer ${drawer ? 'open' : ''}`}>
          <button type="button" className="vis-drawer-tog" aria-label={drawer ? 'Hide actions' : 'Show actions'} onClick={() => setDrawer(d => !d)}>{drawer ? '‹' : '›'}</button>
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
          <button type="button" className="vis-panel-tog" aria-label={panel ? 'Hide code trace' : 'Show code trace'} onClick={() => setPanel(p => !p)}>{panel ? '›' : '‹'}</button>
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
              <button type="button" onClick={() => { setPlaying(false); setI(0); }} aria-label="First step" title="First step">⏮</button>
              <button type="button" onClick={() => { setPlaying(false); setI(x => Math.max(x - 1, 0)); }} aria-label="Previous step" title="Previous step (←)">◀</button>
              {playing
                ? <button type="button" className="big" onClick={() => setPlaying(false)} aria-label="Pause" title="Pause (space)">⏸</button>
                : <button type="button" className="big" onClick={play} aria-label="Play" title="Play (space)">▶</button>}
              <button type="button" onClick={() => { setPlaying(false); setI(x => Math.min(x + 1, n - 1)); }} aria-label="Next step" title="Next step (→)">▶|</button>
              <button type="button" onClick={() => { setPlaying(false); setI(n - 1); }} aria-label="Last step" title="Last step">⏭</button>
            </div>
            <input className="vis-scrub" type="range" min={0} max={n - 1} value={Math.min(i, n - 1)} aria-label="Step"
              style={{ ['--p' as string]: `${(100 * Math.min(i, n - 1)) / Math.max(1, n - 1)}%` }}
              onChange={e => { setPlaying(false); setI(+e.target.value); }} />
            <span className="vis-count">{Math.min(i, n - 1) + 1} / {n}</span>
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
