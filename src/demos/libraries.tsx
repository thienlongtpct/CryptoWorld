import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../state';
import { bytesHex, enc, h32, hex, parseSet, rnd, shuffled } from '../lib/crypto';
import { PAPER_BY_ID } from '../data/papers';
import {
  OUT_LABEL, PSI_FAMILIES, PSI_PAPERS, PSU_FAMILIES, PSU_PAPERS, SEC_LABEL, SET_LABEL,
  type Bench4, type Family, type PsiPaper, type PsuPaper,
} from '../data/libraries';
import { Html, Lab, List, Msg, Pv, S, Seg, Steps } from '../components/ui';

type AnyPaper = PsuPaper | PsiPaper;
const isPsu = (p: AnyPaper): p is PsuPaper => 'sec' in p;

// ---------- shared: family cards and filterable paper catalogue ----------
export function FamilyCards({ fams, papers, prefix }: { fams: Record<string, Family>; papers: AnyPaper[]; prefix: string }) {
  return (
    <div className="fams">
      {Object.entries(fams).map(([k, [name, col, txt]]) => (
        <div key={k} className="fam" style={{ ['--fc' as string]: col }}>
          <h3>{name}</h3><Html as="p" html={txt} />
          <div className="legend">{papers.filter(p => p.fam === k).map(p => <a key={p.id} className="chip" href={`#${prefix}-${p.id}`}>{p.label}</a>)}</div>
        </div>
      ))}
    </div>
  );
}

interface Dim<T> { key: string; label: string; opts: [string, string][]; test: (p: T, v: string) => boolean }
function Catalogue<T extends AnyPaper>({ papers, fams, prefix, dims }: { papers: T[]; fams: Record<string, Family>; prefix: string; dims: Dim<T>[] }) {
  const { cite } = useApp();
  const [st, setSt] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const rows = papers
    .filter(p => dims.every(d => !st[d.key] || d.test(p, st[d.key])) && (!s || `${p.title}${p.authors}${p.label}${p.venue}`.toLowerCase().includes(s)))
    .sort((a, b) => b.year - a.year);
  return (
    <Lab>
      <div className="controls">
        {dims.map(d => (
          <span key={d.key} className="fgroup">
            <span className="muted">{d.label}</span>
            {[['', 'All'] as [string, string], ...d.opts].map(([v, l]) => (
              <button key={v} className="chip" aria-pressed={(st[d.key] ?? '') === v} onClick={() => setSt(o => ({ ...o, [d.key]: v }))}>{l}</button>
            ))}
          </span>
        ))}
        <label>search <input type="search" placeholder="title, author" value={q} onChange={e => setQ(e.target.value)} /></label>
      </div>
      <div className="pgrid">
        {rows.length ? rows.map(p => {
          const [famName, col] = fams[p.fam];
          const tags = isPsu(p) ? [OUT_LABEL[p.out], SEC_LABEL[p.sec], SET_LABEL[p.set], p.prim] : p.tags;
          return (
            <article key={p.id} className="pc" id={`${prefix}-${p.id}`} style={{ ['--fc' as string]: col }}>
              <div className="pc-top"><span className="pc-l">{p.label}</span><span className="muted">{p.venue} {p.year}</span></div>
              <b className="pc-t">{p.title}</b><span className="muted">{p.authors}</span>
              <Html as="p" html={p.sum} />
              <div className="tags"><span className="tag">{famName}</span>{tags.filter(Boolean).map(t => <span key={t} className="tag">{t}</span>)}</div>
              {isPsu(p) && p.cx && <div className="mono note">public-key {p.cx[0]} · symmetric {p.cx[1]} · comm. {p.cx[2]}</div>}
              <div className="pc-links">
                {PAPER_BY_ID[p.id] && <a className="cite" href="#bib" onClick={e => { e.preventDefault(); e.stopPropagation(); cite(p.id); }}>Lineage in bibliography</a>}
                <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`} target="_blank" rel="noopener noreferrer">Google Scholar ↗</a>
              </div>
            </article>
          );
        }) : <p className="muted">No paper matches these filters.</p>}
      </div>
    </Lab>
  );
}

// ---------- PSU library ----------
interface Row { p: PsuPaper; name: string; small?: Bench4[]; big?: [number, number | string]; unbal?: boolean }
const PSU_ROWS: Row[] = PSU_PAPERS.flatMap(p => (p.variants ?? [{ name: p.label, small: p.small, big: p.big, unbal: p.set === 'unbal' }]).map(v => ({ p, ...v })));
const NETS = ['LAN', 'WAN1', 'WAN2', 'Comm.'];
const SEC_COL = { sh: 'var(--c1)', aon: 'var(--c4)', mal: 'var(--c6)', '': 'var(--muted)' } as const;

export const PsuFamilies = () => <FamilyCards fams={PSU_FAMILIES} papers={PSU_PAPERS} prefix="pp" />;
export const PsuPapers = () => (
  <Catalogue papers={PSU_PAPERS} fams={PSU_FAMILIES} prefix="pp" dims={[
    { key: 'fam', label: 'Family', opts: [['rpmt', 'RPMT-based'], ['mcrg', 'MCRG-based'], ['poly', 'Polynomial-based'], ['other', 'Bloom']], test: (p, v) => p.fam === v },
    { key: 'sec', label: 'Security', opts: [['sh', 'Semi-honest'], ['aon', 'AON-compatible'], ['mal', 'Malicious']], test: (p, v) => p.sec === v },
    { key: 'out', label: 'Output', opts: [['one', 'One-sided'], ['two', 'Two-sided']], test: (p, v) => p.out === v },
    { key: 'set', label: 'Sets', opts: [['bal', 'Balanced'], ['unbal', 'Unbalanced']], test: (p, v) => p.set === v || p.set === 'both' },
  ]} />
);

const OPEN: [string, string][] = [
  ['Towards PSI-level efficiency', 'Modern PSI handles 2²⁰ items in well under a second; the fastest one-sided PSU still takes tens of seconds. Can IBLT peeling, which makes two-sided PSU fast, be adapted to one-sided output?'],
  ['Malicious two-sided PSU from symmetric-key techniques', 'Practical malicious two-sided PSU (PGT26) relies on DH and zero-knowledge arguments; PSI made the jump from public-key to OT-based constructions, and PSU has not yet.'],
  ['PSU for small universes', "When the item universe is small, the output itself reveals more and the simulator cannot fully extract the sender's set, which may make one-sided malicious PSU meaningful."],
  ['AON security against malicious adversaries', 'All known AON-compatible protocols are semi-honest; the two malicious PSU protocols (HN12, PGT26) leak the intersection cardinality in intermediate steps.'],
  ['Intermediate security models', 'Input-committed one-sided PSU, where the receiver is bound to its input but may otherwise deviate.'],
  ['Third-party-assisted PSU', 'Trusted hardware, cloud or auxiliary servers are well studied for PSI but largely unexplored for PSU.'],
  ['Beyond exact union', 'Fuzzy PSU, authenticated PSU, and circuit-based PSU that feeds the union into further secure computation.'],
];
export const PsuOpenProblems = () => <ol className="senses">{OPEN.map(([h, t]) => <li key={h}><b>{h}.</b> {t}</li>)}</ol>;

// Framework explorer: run RPMT / MCRG / polynomial PSU and cut the connection after any step.
type FwStep = [name: string, sender: ReactNode, wire: ReactNode, receiver: ReactNode, learned: string[]];
export function PsuFramework() {
  const [fam, setFam] = useState<'rpmt' | 'mcrg' | 'poly'>('rpmt');
  const [xs_, setX] = useState('evil.com, 10.0.0.7, bad.exe, phish.net, c2.io'), [ys_, setY] = useState('bad.exe, spam.biz, c2.io, mal.org');
  const [step, setStep] = useState(0), [cut, setCut] = useState(false);
  const X = parseSet(xs_), Y = parseSet(ys_), key = X.join('|');
  const pi = useMemo(() => shuffled(X.map((_, i) => i)), [key]);
  const xs = pi.map(i => X[i]), mem = xs.map(x => (Y.includes(x) ? 1 : 0)), diff = xs.filter((_, i) => !mem[i]);
  const r = xs.map(x => hex(h32('r' + x + key), 4)), rp = xs.map((x, i) => (mem[i] ? hex(h32('rp' + x + key), 4) : r[i]));
  const U = [...new Set(Y.concat(diff))], setStr = `{${U.join(', ')}}`;
  const shuffledList = <><div className="note">P<sub>S</sub> applies a random permutation π to X.</div><List items={xs.map((x, i) => <>pos {i}: <S b>{x}</S></>)} /></>;
  const F: Record<typeof fam, FwStep[]> = {
    rpmt: [
      ['Shuffle', shuffledList, <div className="note">no messages yet</div>, <div className="note">waiting</div>, []],
      ['Batched RPMT', <div className="note">learns nothing</div>, <Msg dir="OPRF / OKVS / switching messages">membership test per position</Msg>,
        <><div className="note">characteristic vector b</div><List items={mem.map((b, i) => <>pos {i}: b = <S a>{b}</S></>)} /></>, [`|X ∩ Y| = ${mem.filter(Boolean).length} (count the 1s in b)`]],
      ['OT per position', <div className="note">inputs (x<sub>π(i)</sub>, ⊥) to each OT</div>, <>{xs.map((x, i) => <Msg key={i} dir={<>OT #{i}, choice b<sub>{i}</sub></>}>{mem[i] ? '⊥' : <S a>{x}</S>}</Msg>)}</>,
        <List items={xs.map((x, i) => (mem[i] ? <span className="muted">⊥</span> : <S a>{x}</S>))} />, ['X ∖ Y']],
      ['Output union', null, null, <S a>X ∪ Y = {setStr}</S>, ['X ∪ Y']],
    ],
    mcrg: [
      ['Shuffle', shuffledList, <div className="note">no messages yet</div>, <div className="note">waiting</div>, []],
      ['Batched MCRG', <><div className="note">randomness rᵢ</div><List items={r.map((v, i) => <>pos {i}: <S b>{v}</S></>)} /></>, <Msg dir="PMT + ECRG / pnMCRG messages">no membership bits produced</Msg>,
        <><div className="note">randomness rᵢ′ (equal to rᵢ only for non-members, but P<sub>R</sub> can't tell)</div><List items={rp.map((v, i) => <>pos {i}: <S a>{v}</S></>)} /></>, ['random-looking strings only']],
      ['Encrypt & send', <div className="note">cᵢ = Enc(rᵢ, x<sub>π(i)</sub>)</div>, <>{xs.map((x, i) => <Msg key={i} dir={<>c<sub>{i}</sub></>}>{bytesHex(enc(x, r[i])).slice(0, 14)}…</Msg>)}</>, null, []],
      ['Decrypt & output', null, null, <><List items={xs.map((x, i) => (mem[i] ? <span className="muted">invalid → ⊥</span> : <S a>{x}</S>))} /><S a>X ∪ Y = {setStr}</S></>, ['X ∖ Y, hence X ∪ Y (and |X ∩ Y| only now, implied by the output)']],
    ],
    poly: [
      ['Encode Y', null, <Msg dir={<>P<sub>R</sub> → P<sub>S</sub></>}>Enc(f<sub>Y</sub>), f<sub>Y</sub>(z) = {Y.map(y => `(z − ${y})`).join('')}</Msg>, <div className="note">holds the HE secret key</div>, []],
      ['Evaluate & shuffle', <div className="note">computes Enc(x·f<sub>Y</sub>(x)), Enc(f<sub>Y</sub>(x)) for each x, then permutes</div>, <>{xs.map((x, i) => <Msg key={i} dir={`tuple ${i}`}>{bytesHex(enc('ct' + x, 'he' + i)).slice(0, 14)}…</Msg>)}</>, null, []],
      ['Decrypt', null, null, <List items={xs.map((x, i) => (mem[i] ? <>(0, 0) → <span className="muted">⊥</span></> : <>x·f/f → <S a>{x}</S></>))} />, ['which tuples are (0,0): |X ∩ Y|, then X ∖ Y']],
      ['Output union', null, null, <S a>X ∪ Y = {setStr}</S>, ['X ∪ Y']],
    ],
  };
  const steps = F[fam], cur = Math.min(step, steps.length - 1), [, s, w, rr] = steps[cur];
  const learned = steps.slice(0, cur + 1).flatMap(f => f[4]);
  const cutNow = cut && cur < steps.length - 1;
  const leaks = cutNow && learned.some(l => l.includes('|X ∩ Y|') && !l.includes('implied'));
  return (
    <Lab secret>
      <div className="controls"><Seg value={fam} onChange={v => { setFam(v); setStep(0); }} options={[['rpmt', 'RPMT-based'], ['mcrg', 'MCRG-based'], ['poly', 'Polynomial-based']]} /></div>
      <div className="parties">
        <label className="pv bob"><h4>Sender P<sub>S</sub>: set X</h4><input type="text" value={xs_} onChange={e => setX(e.target.value)} /></label>
        <label className="pv alice"><h4>Receiver P<sub>R</sub>: set Y</h4><input type="text" value={ys_} onChange={e => setY(e.target.value)} /></label>
      </div>
      <Steps names={steps.map(f => f[0])} cur={cur} onChange={setStep} />
      <div className="controls"><label><input type="checkbox" checked={cut} onChange={e => setCut(e.target.checked)} /> Connection drops right after the selected step</label></div>
      <div className="parties three">
        <Pv who="bob" title={<>Sender P<sub>S</sub></>}>{s}</Pv>
        <Pv who="wire" title="Wire">{w}</Pv>
        <Pv who="alice" title={<>Receiver P<sub>R</sub></>}>{rr}</Pv>
      </div>
      <Pv who="wire" title={cutNow ? `Connection dropped after step ${cur + 1}: receiver keeps…` : 'Receiver has learned so far'}>
        <ul className="ledger" style={{ margin: 0, padding: 0 }}>{learned.length ? learned.map((l, i) => <li key={i}>{l}</li>) : <li className="muted">nothing</li>}</ul>
        {cutNow && (leaks
          ? <div className="bad">Output-dependent leakage: no union was delivered, but the intersection size is already known. Repeating runs with one item changed turns this into a membership oracle.</div>
          : <div className="ok">Nothing output-dependent leaked: this run is all-or-nothing so far.</div>)}
      </Pv>
    </Lab>
  );
}

// AON encoding of the sender's final message: c_i = m_i ⊕ H(0‖r‖i), d = r ⊕ H(1‖ℓ‖c…).
export function Aon() {
  const [r, setR] = useState(() => hex(rnd(0, 0xffffffff), 8));
  const [dropped, setDropped] = useState<Set<number>>(new Set([1]));
  const m = ['evil.com', '10.0.0.7', 'phish.net'].map(x => x.slice(0, 8).padEnd(8, '_'));
  const H = (s: string) => parseInt(hex(h32(s), 8), 16);
  const mi = m.map(s => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7));
  const c = mi.map((v, i) => (v ^ H('0|' + r + '|' + i)) >>> 0), d = (parseInt(r, 16) ^ H('1|' + m.length + '|' + c.join(','))) >>> 0;
  const atoms: [string, string][] = [...c.map((v, i) => [`c${i + 1}`, hex(v, 8)] as [string, string]), ['d (unlock)', hex(d, 8)]];
  const toggle = (i: number) => setDropped(o => { const n = new Set(o); n.has(i) ? n.delete(i) : n.add(i); return n; });
  return (
    <Lab title="AON encoding of a final message" toy="TOY HASH" secret>
      <div className="controls"><span>Click atoms to drop them in transit.</span><button className="btn ghost" onClick={() => setR(hex(rnd(0, 0xffffffff), 8))}>New randomness r</button><button className="btn ghost" onClick={() => setDropped(new Set())}>Deliver everything</button></div>
      <Pv who="bob" title="Sender's last message m (set-difference items)"><div className="grid-cells">{m.map((s, i) => <span key={i} className="cell"><span className="ix">m{i + 1}</span><S b>{s}</S></span>)}</div></Pv>
      <Pv who="wire" title="Atoms on the wire">
        <div className="grid-cells">{atoms.map(([n, v], i) => <button key={n} className={`cell atom ${dropped.has(i) ? 'drop' : ''}`} title={`Click to ${dropped.has(i) ? 'deliver' : 'drop'}`} onClick={() => toggle(i)}><span className="ix">{n}</span>{dropped.has(i) ? '✕ dropped' : v}</button>)}</div>
      </Pv>
      <Pv who="alice" title={dropped.size ? 'Receiver output: ⊥' : 'Receiver recovers m'}>
        {dropped.size
          ? <div>{dropped.size} of {atoms.length} atoms missing. Without every cᵢ the receiver cannot recompute H(1‖ℓ‖c₁‖…‖c<sub>ℓ</sub>), so r and therefore every mᵢ stay hidden, even the atoms that did arrive.</div>
          : <div>r = d ⊕ H(1‖ℓ‖c…) = <S a className="val">{r}</S>, then mᵢ = cᵢ ⊕ H(0‖r‖i): <S a>{m.join(', ')}</S></div>}
      </Pv>
    </Lab>
  );
}

export function PsuBench() {
  const [ni, setNi] = useState(3), [k, setK] = useState(0);
  const rows = PSU_ROWS.filter(r => r.small).map(r => ({ name: r.name, v: r.small![ni][k], col: SEC_COL[r.p.sec] })).sort((a, b) => a.v - b.v);
  const mx = Math.max(...rows.map(r => r.v)), mn = Math.min(...rows.map(r => r.v)) / 2;
  const w = (v: number) => Math.max(1, (100 * Math.log(v / mn)) / Math.log(mx / mn));
  const [sortK, setSortK] = useState(1), [dir, setDir] = useState(1);
  const num = (v: number | string) => (typeof v === 'number' ? v : parseFloat(v));
  const big = PSU_ROWS.filter(r => r.big).map(r => ({ r, t: typeof r.big![0] === 'number' ? r.big![0] : NaN, c: r.big![1] }))
    .sort((a, b) => (sortK === 0 ? a.r.name.localeCompare(b.r.name) : sortK === 1 ? a.t - b.t : num(a.c) - num(b.c)) * dir);
  const th = (i: number, label: string, cls = '') => (
    <th className={cls} style={{ cursor: 'pointer' }} onClick={() => { setDir(i === sortK ? -dir : 1); setSortK(i); }}>{label} {sortK === i ? (dir > 0 ? '▲' : '▼') : ''}</th>
  );
  return (
    <>
      <Lab>
        <div className="controls">
          <span>n =</span><Seg value={ni} onChange={setNi} options={[[0, '2⁴'], [1, '2⁶'], [2, '2⁸'], [3, '2¹⁰']]} />
          <Seg value={k} onChange={setK} options={[[0, 'LAN 10 Gbps'], [1, 'WAN1 200 Mbps'], [2, 'WAN2 50 Mbps'], [3, 'Communication']]} />
        </div>
        <div className="legend">{(['sh', 'aon', 'mal'] as const).map(s => <span key={s} className="chip"><span className="sw" style={{ background: SEC_COL[s] }} />{SEC_LABEL[s]}</span>)}</div>
        <div>
          {rows.map((r, i) => (
            <div key={r.name} className="brow"><span>{r.name}</span>
              <span className="btrack"><span className="bfill" style={{ width: `${w(r.v)}%`, background: r.col }} /><span className="val">{r.v} {k === 3 ? 'MB' : 's'}</span>{i === 0 && <span className="ok">fastest</span>}</span>
            </div>
          ))}
          <p className="note">Log scale. {k === 3 ? 'Total communication' : 'Runtime on ' + NETS[k]}, n = 2^{[4, 6, 8, 10][ni]}. KS05 exceeded 3 hours and is omitted.</p>
        </div>
      </Lab>
      <p className="prose" style={{ marginTop: 24 }}>Large sets: n = 2²⁰ on LAN (Table 1). Unbalanced rows use |Y| = 2²⁰, |X| = 2¹⁰. Click a column header to sort.</p>
      <div className="scroll-x">
        <table className="tbl">
          <thead><tr>{th(0, 'Protocol')}<th>Family</th><th>Security · output</th>{th(1, 'Runtime (s)', 'num')}{th(2, 'Comm. (MB)', 'num')}</tr></thead>
          <tbody>{big.map(({ r, t, c }) => (
            <tr key={r.name}><td><b>{r.name}</b>{r.unbal && <> <span className="tag">unbalanced</span></>}</td><td>{PSU_FAMILIES[r.p.fam][0]}</td><td>{SEC_LABEL[r.p.sec]} · {OUT_LABEL[r.p.out]}</td>
              <td className="num">{t.toLocaleString()}</td><td className="num">{typeof c === 'number' ? c.toLocaleString() : c}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}

function Questions<K extends string>({ qs, ans, set }: { qs: [K, string, [string, string][]][]; ans: Record<K, string>; set: (k: K, v: string) => void }) {
  return (
    <div className="qgrid">
      {qs.map(([k, l, opts]) => <div key={k} className="q"><span className="muted">{l}</span><Seg value={ans[k]} onChange={v => set(k, v)} options={opts} /></div>)}
    </div>
  );
}

type PsuQ = 'size' | 'bal' | 'out' | 'sec' | 'aon' | 'net';
export function PsuChooser() {
  const [ans, setAns] = useState<Record<PsuQ, string>>({ size: 'small', bal: 'bal', out: 'one', sec: 'sh', aon: 'no', net: '0' });
  const rows = PSU_ROWS.filter(r => {
    const p = r.p;
    if (ans.bal === 'unbal' ? !r.unbal : r.unbal) return false;
    if (ans.out === 'two' && p.out !== 'two') return false;
    if (ans.sec === 'mal' && p.sec !== 'mal') return false;
    if (ans.aon === 'yes' && p.sec !== 'aon') return false;
    return true;
  });
  const metric = (r: Row) => (ans.size === 'small' ? (r.small ? r.small[3][+ans.net] : null) : (r.big && typeof r.big[0] === 'number' ? r.big[0] : null));
  const ranked = rows.map(r => ({ r, m: metric(r) })).sort((a, b) => (a.m ?? 1e12) - (b.m ?? 1e12));
  const unit = ans.size === 'small' ? `s at n = 2¹⁰, ${NETS[+ans.net]}` : 's at n = 2²⁰, LAN';
  const notes = [
    ans.size === 'large' && ans.net !== '0' && 'Large-set figures shown are LAN only.',
    ans.size === 'small' && ans.bal === 'unbal' && 'Unbalanced protocols target large databases and were only benchmarked at n_Y = 2²⁰.',
    ans.sec === 'mal' && ans.aon === 'yes' && 'Open problem: no known malicious PSU is AON-compatible (HN12 and PGT26 leak the cardinality mid-protocol).',
    ans.out === 'two' && ans.sec === 'sh' && 'PT26 (IBLT) is the fast semi-honest two-sided option at scale.',
  ].filter(Boolean) as string[];
  return (
    <Lab>
      <Questions<PsuQ> ans={ans} set={(k, v) => setAns(a => ({ ...a, [k]: v }))} qs={[
        ['size', 'Set size', [['small', 'Small (≤ 2¹⁰)'], ['large', 'Large (≈ 2²⁰)']]],
        ['bal', 'Sizes', [['bal', 'Similar'], ['unbal', 'One much smaller']]],
        ['out', 'Who gets the union?', [['one', 'Receiver only'], ['two', 'Both parties']]],
        ['sec', 'Threat model', [['sh', 'Semi-honest'], ['mal', 'Malicious']]],
        ['aon', 'Must an aborted run leak nothing?', [['no', 'Not required'], ['yes', 'Yes (AON)']]],
        ['net', 'Network', [['0', 'LAN'], ['1', 'WAN 200 Mbps'], ['2', 'WAN 50 Mbps']]],
      ]} />
      <Pv who="wire" title={ranked.length ? `${ranked.length} candidate${ranked.length > 1 ? 's' : ''}, fastest first` : 'No protocol in the SoK meets all of these'}>
        {ranked.length > 0 && <ol className="rank">{ranked.map(({ r, m }) => (
          <li key={r.name}><a href={`#pp-${r.p.id}`} className="rk">{r.name}</a> <span className="muted">{PSU_FAMILIES[r.p.fam][0]} · {r.p.venue} {r.p.year}</span> <span className="val">{m == null ? 'no measurement for this setting' : `${m} ${unit}`}</span></li>
        ))}</ol>}
        {notes.map(n => <div key={n} className="note">{n}</div>)}
      </Pv>
    </Lab>
  );
}

// ---------- PSI library ----------
export const PsiFamilies = () => <FamilyCards fams={PSI_FAMILIES} papers={PSI_PAPERS} prefix="ip" />;
export const PsiPapers = () => (
  <Catalogue papers={PSI_PAPERS} fams={PSI_FAMILIES} prefix="ip" dims={[
    { key: 'fam', label: 'Family', opts: Object.entries(PSI_FAMILIES).map(([k, v]) => [k, v[0].split(' ')[0].replace(/[,&/]/g, '')]), test: (p, v) => p.fam === v },
    { key: 'tag', label: 'Property', opts: [['Malicious', 'Malicious'], ['Unbalanced', 'Unbalanced'], ['Circuit', 'Circuit output']], test: (p, v) => p.tags.some(t => t.includes(v)) },
  ]} />
);

type PsiQ = 'bal' | 'size' | 'outp' | 'sec' | 'net';
const PSI_BY_ID = Object.fromEntries(PSI_PAPERS.map(p => [p.id, p]));
export function PsiChooser() {
  const [ans, setAns] = useState<Record<PsiQ, string>>({ bal: 'bal', size: 'large', outp: 'set', sec: 'sh', net: 'fast' });
  let fam: string, ids: string[], why: string;
  if (ans.outp === 'label') { fam = 'he'; ids = ['chlr18', 'clr17']; why = 'Labeled PSI is typically built from FHE, where the server attaches a label to each item.'; }
  else if (ans.outp === 'func') { fam = 'circuit'; ids = ans.size === 'small' ? ['ion20', 'psty19'] : ['rs21', 'gmrss21', 'psty19']; why = 'Keep the intersection secret-shared and compute only the function you need.'; }
  else if (ans.bal === 'unbal') { fam = 'he'; ids = ['clr17', 'chlr18', 'krs19']; why = 'With a small client set, HE-based protocols make communication depend on the client side only.'; }
  else if (ans.size === 'small') { fam = 'dh'; ids = ans.sec === 'mal' ? ['rt21'] : ['hfh99', 'rt21']; why = 'For small sets the fixed cost of base OTs and VOLE setup dominates, so DH-style protocols are simple and competitive.'; }
  else if (ans.sec === 'mal') { fam = 'vole'; ids = ['rr22', 'rs21', 'prty20']; why = 'OKVS + VOLE protocols offer malicious security with modest overhead.'; }
  else if (ans.net === 'slow') { fam = 'vole'; ids = ['rr22', 'cm20', 'prty19']; why = 'Low-communication designs matter most on slow links.'; }
  else { fam = 'vole'; ids = ['rr22', 'rs21', 'kkrt16']; why = 'For large balanced sets, OKVS + silent VOLE is the current state of the art.'; }
  return (
    <Lab>
      <Questions<PsiQ> ans={ans} set={(k, v) => setAns(a => ({ ...a, [k]: v }))} qs={[
        ['bal', 'Set sizes', [['bal', 'Similar'], ['unbal', 'One much smaller']]],
        ['size', 'Scale', [['small', 'Hundreds of items'], ['large', 'Millions']]],
        ['outp', 'Output', [['set', 'The intersection'], ['func', 'Only a function of it (size, sum…)'], ['label', 'Data attached to matches']]],
        ['sec', 'Threat model', [['sh', 'Semi-honest'], ['mal', 'Malicious']]],
        ['net', 'Network', [['fast', 'Fast'], ['slow', 'Slow / metered']]],
      ]} />
      <Pv who="wire" title={`Start with: ${PSI_FAMILIES[fam][0]}`}>
        <div>{why}</div>
        <ol className="rank">{ids.map(i => <li key={i}><a className="rk" href={`#ip-${i}`}>{PSI_BY_ID[i].label}</a> <span className="muted">{PSI_BY_ID[i].title} · {PSI_BY_ID[i].venue} {PSI_BY_ID[i].year}</span></li>)}</ol>
        <div className="note">Rule of thumb only; it isn't a benchmark.</div>
      </Pv>
    </Lab>
  );
}
