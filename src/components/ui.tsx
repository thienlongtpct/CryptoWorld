import { useState, type CSSProperties, type ReactNode } from 'react';
import { useApp, type View } from '../state';

/** Render trusted, hand-written HTML from the content files. */
export function Html({ html, as: Tag = 'div', className, style }: { html: string; as?: 'div' | 'span' | 'p' | 'li'; className?: string; style?: CSSProperties }) {
  return <Tag className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A value only Alice (a) or only Bob (b) knows; hidden when viewing as the other party. */
export function S({ a, b, children, className = '' }: { a?: boolean; b?: boolean; children: ReactNode; className?: string }) {
  const cls = [a && 'sa', b && 'sb', className].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}

export function Kv({ k, children, who }: { k: ReactNode; children: ReactNode; who?: 'a' | 'b' }) {
  return (
    <div className="kv">
      <span>{k}</span>
      <span className={['val', who === 'a' && 'sa', who === 'b' && 'sb'].filter(Boolean).join(' ')}>{children}</span>
    </div>
  );
}

export const Toy = ({ children = 'TOY' }: { children?: ReactNode }) => <span className="toy">{children}</span>;

/** Segmented control (MUI-style tabs with a pill indicator). */
export function Seg<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: readonly (readonly [T, ReactNode])[]; onChange: (v: T) => void; label?: string;
}) {
  return (
    <span className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>
      ))}
    </span>
  );
}

const EYES: [View, string, string][] = [['all', 'Everything', 'dall'], ['alice', 'Alice sees', 'da'], ['bob', 'Bob sees', 'db']];

/** The perspective switch. Every copy reads and writes the same app-wide state. */
export function Eyes() {
  const { view, setView } = useApp();
  const move = (dir: number) => setView(EYES[(EYES.findIndex(e => e[0] === view) + dir + 3) % 3][0]);
  return (
    <div className="eyes" role="radiogroup" aria-label="Whose view to show"
      onKeyDown={e => { if (e.key === 'ArrowRight') { move(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { move(-1); e.preventDefault(); } }}>
      {EYES.map(([v, l, dot]) => (
        <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
          title={v === 'all' ? 'Show every value (key E)' : `Show only what ${v === 'alice' ? 'Alice' : 'Bob'} sees (key ${v[0].toUpperCase()})`}>
          <span className={`dot ${dot}`} />{l}
        </button>
      ))}
    </div>
  );
}

/** A demo bench. `secret` adds the per-demo perspective switch. */
export function Lab({ title, toy, secret, children, className }: { title?: ReactNode; toy?: ReactNode; secret?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`lab ${className ?? ''}`}>
      {(title || toy || secret) && (
        <div className="lab-h">
          {title ? <span className="eyebrow">{title}</span> : <span />}
          {toy && <Toy>{toy === true ? 'TOY' : toy}</Toy>}
          {secret && <div className="lab-eyes"><span className="note">Whose view?</span><Eyes /></div>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Party panel: Alice, Bob, or the public wire. */
export function Pv({ who, title, children, className = '' }: { who: 'alice' | 'bob' | 'wire'; title?: ReactNode; children?: ReactNode; className?: string }) {
  return <div className={`pv ${who} ${className}`}>{title && <h4>{title}</h4>}{children}</div>;
}

export function Steps({ names, cur, onChange }: { names: string[]; cur: number; onChange: (i: number) => void }) {
  return (
    <div className="steps">
      {names.map((n, i) => (
        <button key={i} type="button" className={i === cur ? 'on' : i < cur ? 'done' : ''} onClick={() => onChange(i)}>{i + 1}. {n}</button>
      ))}
      <button type="button" disabled={cur >= names.length - 1} onClick={() => onChange(Math.min(cur + 1, names.length - 1))} aria-label="next step">Next →</button>
    </div>
  );
}

export function List({ items, className }: { items: ReactNode[]; className?: string }) {
  return <>{items.length ? items.map((x, i) => <div key={i} className={className}>{x}</div>) : <div className="muted">∅</div>}</>;
}

export function Msg({ dir, children }: { dir: ReactNode; children: ReactNode }) {
  return <div className="msg"><span className="dir">{dir}</span>{children}</div>;
}

/** Horizontal bars on a log scale. */
export function LogBars({ rows, fmt }: { rows: [label: string, value: number, color: string][]; fmt: (v: number) => string }) {
  const mx = Math.max(...rows.map(r => r[1]));
  const mn = Math.max(1, Math.min(...rows.map(r => r[1] || 1)) / 10);
  const w = (v: number) => (v <= 0 ? 0 : Math.max(1, (100 * (Math.log(v) - Math.log(mn))) / (Math.log(mx) - Math.log(mn))));
  return (
    <div>
      {rows.map(([l, v, c]) => (
        <div key={l} className="brow">
          <span>{l}</span>
          <span className="btrack"><span className="bfill" style={{ width: `${w(v)}%`, background: c }} /><span className="val">{fmt(v)}</span></span>
        </div>
      ))}
    </div>
  );
}

/** Force a re-randomisation: returns [nonce, bump]. */
export function useNonce(): [number, () => void] {
  const [n, setN] = useState(0);
  return [n, () => setN(x => x + 1)];
}

export function Cite({ id, children }: { id: string; children: ReactNode }) {
  const { cite } = useApp();
  return <a className="cite" href="#bib" onClick={e => { e.preventDefault(); cite(id); }}>{children}</a>;
}
