import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state';
import { PAPERS, PAPER_BY_ID, PAPER_CATS, type Paper, type PaperCat } from '../data/papers';
import { Seg } from './ui';

const LANES = Object.keys(PAPER_CATS) as PaperCat[];
const children = (id: string) => PAPERS.filter(p => p.buildsOn.includes(id)).map(p => p.id);
function closure(id: string, next: (c: string) => string[]): Set<string> {
  const out = new Set<string>(), st = [id];
  while (st.length) next(st.pop()!).forEach(n => { if (!out.has(n)) { out.add(n); st.push(n); } });
  return out;
}

// Timeline geometry: years before 2000 are compressed.
const L = 120, W1 = 200, W2 = 1000, TOP = 26, LH = 80;
const X = (y: number) => (y < 2000 ? L + (y - 1978) * (W1 / 22) : L + W1 + (y - 2000) * (W2 / 27));
const TOTAL_W = L + W1 + W2 + 40, TOTAL_H = TOP + LANES.length * LH + 24;
const LAYOUT = (() => {
  const pos: Record<string, [number, number]> = {}, above: Record<string, boolean> = {}, used: Record<string, number> = {}, laneCount: Record<number, number> = {};
  PAPERS.forEach(p => {
    const lane = LANES.indexOf(p.cat), key = lane + '|' + p.year;
    used[key] = (used[key] || 0) + 1;
    laneCount[lane] = (laneCount[lane] || 0) + 1;
    above[p.id] = laneCount[lane] % 2 === 0; // alternate label placement so neighbours don't collide
    pos[p.id] = [X(p.year), TOP + lane * LH + 24 + (used[key] - 1) * 16];
  });
  return { pos, above };
})();
const matches = (p: Paper, q: string) => !q || `${p.label} ${p.title} ${p.authors} ${p.venue} ${p.year}`.toLowerCase().includes(q);

export function PapersExplorer() {
  const { paper: sel, setPaper, scrollToCard, clearScrollToCard } = useApp();
  const [view, setView] = useState<'tl' | 'tbl'>('tl');
  const [q, setQ] = useState('');
  const [edges, setEdges] = useState(true);
  const card = useRef<HTMLDivElement>(null);
  const s = q.trim().toLowerCase();
  const A = useMemo(() => closure(sel, c => PAPER_BY_ID[c]?.buildsOn ?? []), [sel]);
  const D = useMemo(() => closure(sel, children), [sel]);

  // Arriving from a citation: bring the selected paper's card into view.
  useEffect(() => {
    if (scrollToCard) { card.current?.scrollIntoView({ block: 'center' }); clearScrollToCard(); }
  }, [scrollToCard, clearScrollToCard]);

  const p = PAPER_BY_ID[sel];
  const kids = children(sel);
  return (
    <div className="lab" id="w-pap">
      <div className="controls">
        <Seg value={view} onChange={setView} options={[['tl', 'Timeline + lineage'], ['tbl', 'Table']]} />
        <label>search <input type="text" placeholder="title, author, venue" style={{ width: '14em' }} value={q} onChange={e => setQ(e.target.value)} /></label>
        <label><input type="checkbox" checked={edges} onChange={e => setEdges(e.target.checked)} /> show lineage edges</label>
      </div>
      <div className="legend">
        {LANES.map(k => <span key={k} className="chip"><span className="sw" style={{ background: PAPER_CATS[k][1] }} />{PAPER_CATS[k][0]}</span>)}
      </div>

      {view === 'tl' ? (
        <div className="pap-tl scroll-x">
          <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} style={{ minWidth: 1100 }} role="img" aria-label="Timeline of papers">
            {LANES.map((k, i) => (
              <g key={k}>
                <rect x={L - 10} y={TOP + i * LH} width={TOTAL_W - L} height={LH} fill={i % 2 ? 'var(--sunk)' : 'transparent'} opacity={0.5} />
                <text className="lane-l" x={8} y={TOP + i * LH + 22}>{PAPER_CATS[k][0]}</text>
              </g>
            ))}
            {[1980, 1985, 1990, 1995, 2000, 2004, 2008, 2012, 2016, 2020, 2024, 2027].map(y => (
              <g key={y}>
                <line x1={X(y)} y1={TOP} x2={X(y)} y2={TOTAL_H - 18} stroke="var(--line)" strokeDasharray="2 3" />
                <text x={X(y)} y={TOTAL_H - 4} fontSize={10} textAnchor="middle" fill="var(--muted)">{y}</text>
              </g>
            ))}
            <text x={X(1989)} y={16} fontSize={9} fill="var(--muted)" textAnchor="middle">(compressed before 2000)</text>
            {edges && PAPERS.flatMap(t => t.buildsOn.filter(src => LAYOUT.pos[src]).map(src => {
              const [x1, y1] = LAYOUT.pos[src], [x2, y2] = LAYOUT.pos[t.id], mx = (x1 + x2) / 2;
              const on = (t.id === sel || D.has(t.id)) && (src === sel || D.has(src)) || (src === sel || A.has(src)) && (t.id === sel || A.has(t.id));
              return <path key={src + t.id} className={`pedge ${on ? 'on' : 'dim'}`} d={`M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} />;
            }))}
            {PAPERS.map(t => {
              const [x, y] = LAYOUT.pos[t.id], dim = !matches(t, s) || (t.id !== sel && !A.has(t.id) && !D.has(t.id));
              const ring = t.id === sel ? 'var(--ink)' : A.has(t.id) ? 'var(--alice)' : D.has(t.id) ? 'var(--bob)' : 'var(--surface)';
              const up = LAYOUT.above[t.id];
              return (
                <g key={t.id}>
                  <circle className={`pdot ${dim ? 'dim' : ''} ${t.id === sel ? 'sel' : ''}`} cx={x} cy={y} r={6.5} fill={PAPER_CATS[t.cat][1]}
                    style={{ stroke: ring, strokeWidth: ring === 'var(--surface)' ? 1.5 : 3 }} tabIndex={0} role="button" aria-label={t.title}
                    onClick={() => setPaper(t.id)} onKeyDown={e => { if (e.key === 'Enter') setPaper(t.id); }}>
                    <title>{t.title} ({t.year})</title>
                  </circle>
                  <text className={`plabel ${dim ? 'dim' : ''}`} x={up ? x : x + 9} y={up ? y - 10 : y + 3} textAnchor={up ? 'middle' : 'start'}>{t.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>Year</th><th>Paper</th><th>Authors</th><th>Venue</th><th>Topic</th></tr></thead>
            <tbody>
              {PAPERS.filter(t => matches(t, s)).map(t => (
                <tr key={t.id} style={{ cursor: 'pointer', background: t.id === sel ? 'var(--accent-soft)' : undefined }} onClick={() => setPaper(t.id)}>
                  <td>{t.year}</td><td><b>{t.label}</b> · {t.title}</td><td>{t.authors}</td><td>{t.venue}</td>
                  <td><span className="sw" style={{ background: PAPER_CATS[t.cat][1] }} />{PAPER_CATS[t.cat][0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pcard" ref={card}>
        {p ? (
          <>
            <span className="eyebrow"><span className="sw" style={{ background: PAPER_CATS[p.cat][1] }} />{PAPER_CATS[p.cat][0]} · {p.venue} {p.year}</span>
            <span className="t">{p.title}</span>
            <span className="muted">{p.authors}</span>
            <span>{p.note}</span>
            <div className="kv" style={{ justifyContent: 'flex-start' }}><span>builds on</span>
              <span className="legend">{p.buildsOn.length ? p.buildsOn.filter(i => PAPER_BY_ID[i]).map(i => <button key={i} className="chip" onClick={() => setPaper(i)}>{PAPER_BY_ID[i].label}</button>) : <span className="muted">—</span>}</span></div>
            <div className="kv" style={{ justifyContent: 'flex-start' }}><span>built upon by</span>
              <span className="legend">{kids.length ? kids.map(i => <button key={i} className="chip" onClick={() => setPaper(i)}>{PAPER_BY_ID[i].label}</button>) : <span className="muted">—</span>}</span></div>
            <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`} target="_blank" rel="noopener noreferrer">Find on Google Scholar ↗</a>
          </>
        ) : <span className="muted">Select a paper.</span>}
      </div>
    </div>
  );
}
