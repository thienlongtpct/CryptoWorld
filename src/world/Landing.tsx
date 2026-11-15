import { useEffect, useId, useRef, type ReactNode } from 'react';
import { SunhacksMark } from '../components/SunhacksMark';

/** Small pixel icons for the four steps, drawn on an 8 × 8 grid. */
const ICONS: Record<'explore' | 'learn' | 'solve' | 'unlock', { rows: string[]; colors: Record<string, string> }> = {
  explore: {
    rows: ['...gg...', '..gggg..', '.gggggg.', '...bb...', '...bb...', '.pp..pp.', 'pp....pp', '........'],
    colors: { g: '#5f9a3c', b: '#6d4c41', p: '#b98552' },
  },
  learn: {
    rows: ['........', 'bbbb.bbb', 'bwwb.bwb', 'bwwb.bwb', 'bwwb.bwb', 'bwwbbbwb', 'bbbbbbbb', '........'],
    colors: { b: '#3949ab', w: '#fdf6e3' },
  },
  solve: {
    rows: ['..kkk...', '.k...k..', '.k...k..', '..kkk...', '...k....', '...kk...', '...k....', '...kk...'],
    colors: { k: '#d4a017' },
  },
  unlock: {
    rows: ['.ssssss.', 'sddddds.', 'sd.gg.ds', 'sd.gg.ds', 'sd....ds', 'sd....ds', 'sd....ds', 'ssssssss'],
    colors: { s: '#5b6573', d: '#2b2f36', g: '#81c784' },
  },
};

function PixelIcon({ name }: { name: keyof typeof ICONS }) {
  const icon = ICONS[name];
  return (
    <span className="lp-icon" aria-hidden="true">
      {icon.rows.map((row, y) => [...row].map((cell, x) => (
        <i key={`${x}-${y}`} style={{ background: icon.colors[cell] ?? 'transparent' }} />
      )))}
    </span>
  );
}

const STEPS: { icon: keyof typeof ICONS; title: string; text: string }[] = [
  { icon: 'explore', title: 'Explore', text: 'Walk the grounds and meet Trent, Peggy, Victor, Alice, Bob, Eve, and portrayals of the people behind the ideas.' },
  { icon: 'learn', title: 'Learn', text: 'Step into a building to play animated, line-by-line visualizations of real protocols.' },
  { icon: 'solve', title: 'Solve', text: 'Crack the cipher on a gate with the tools you just learned. Hints and retries are free.' },
  { icon: 'unlock', title: 'Unlock', text: 'Each solved gate opens the next room and is saved to your account.' },
];

const PLACES: { name: string; what: string; color: string }[] = [
  { name: 'Library Sanctuary', what: 'The hub, and the way into the dungeon', color: '#4f6086' },
  { name: 'Cipher Catacombs', what: 'Three gates and a treasure room', color: '#2f434c' },
  { name: 'Key Exchange Bridge', what: 'Public or private? Sort what Eve can see', color: '#4f8ccf' },
  { name: 'Cipher court', what: 'Caesar, Vigenère, secret sharing', color: '#b4552f' },
  { name: 'Hash crypt', what: 'Hashes, block ciphers, modes', color: '#45606b' },
  { name: 'Key citadel', what: 'Diffie–Hellman, RSA, elliptic curves', color: '#8a95a5' },
  { name: 'Circuit shop', what: 'Oblivious transfer, garbled circuits', color: '#527c3b' },
  { name: 'Overlap garden', what: 'Private set intersection and union', color: '#6fa8ae' },
];

/**
 * The first screen a visitor sees: what this is, how a session goes, what is inside, and how to move.
 * It sits over the live world, which keeps moving behind it.
 */
export function Landing({ user, ready, onStart, onLogin, onRegister, onBrowse }: {
  user: string | null;
  ready: boolean;
  onStart: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onBrowse: () => void;
}) {
  const titleId = useId();
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { startRef.current?.focus(); }, []);
  return (
    <div className="lp" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="lp-card">
        <div className="lp-top">
          <SunhacksMark />
          <span className="lp-tag">Toy parameters · nothing here is secure</span>
        </div>
        <p className="lp-kicker">A cryptography adventure</p>
        <h1 id={titleId} className="lp-title">Crypto Dungeon</h1>
        <p className="lp-lede">
          <b>Explore cryptography. Learn how it works. Solve challenges to unlock the dungeon.</b>{' '}
          Every building is a library of animated lessons, from Caesar ciphers to private set intersection,
          and every locked gate is a puzzle you crack with what you learned.
        </p>

        <ol className="lp-steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <PixelIcon name={step.icon} />
              <div>
                <b><span className="lp-n">{index + 1}</span>{step.title}</b>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="lp-cta">
          <button ref={startRef} type="button" className="lp-btn primary" onClick={onStart}>
            {user ? `Continue as ${user}` : 'Start exploring'}
          </button>
          {!user && <button type="button" className="lp-btn" disabled={!ready} onClick={onRegister}>Create an account</button>}
          {!user && <button type="button" className="lp-btn ghost" disabled={!ready} onClick={onLogin}>Log in</button>}
          <button type="button" className="lp-btn ghost" onClick={onBrowse}>Browse the library</button>
        </div>
        {!user && (
          <p className="lp-note">
            Guests can walk around and read every introduction. An account opens the lessons, the gates, and the Gemini tutors, and saves your progress.
          </p>
        )}

        <details className="lp-more">
          <summary>What is inside, and how to move</summary>
          <ul className="lp-places">
            {PLACES.map(place => (
              <li key={place.name}>
                <span className="lp-swatch" style={{ background: place.color }} aria-hidden="true" />
                <b>{place.name}</b>
                <span>{place.what}</span>
              </li>
            ))}
          </ul>
          <ul className="lp-keys">
            <Key k="WASD / arrows / pad">walk</Key>
            <Key k="Walk up">talk to someone</Key>
            <Key k="Space">use a door or gate</Key>
            <Key k="Map">jump to any open room</Key>
            <Key k="Esc">close a panel</Key>
          </ul>
        </details>
      </div>
    </div>
  );
}

function Key({ k, children }: { k: string; children: ReactNode }) {
  return <li><kbd>{k}</kbd> {children}</li>;
}
