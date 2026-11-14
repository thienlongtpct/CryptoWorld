import { useMemo, useState, type ReactNode } from 'react';
import { h32, hex, rnd, shuffled } from '../../lib/crypto';
import { Kv, Seg } from '../../components/ui';
import { Shuffle } from '../../demos/oblivious';
import { VisPage } from '../Player';
import { Go, Hl, Party, SMsg, Wire } from '../kit';

// ---------- garbled gate ----------
type Gate = 'AND' | 'OR' | 'XOR';
const GATE: Record<Gate, (x: number, y: number) => number> = { AND: (x, y) => x & y, OR: (x, y) => x | y, XOR: (x, y) => x ^ y };
const pads = (la: number, lb: number) => [h32('p1' + la + '|' + lb) & 0xffffff, h32('p2' + la + '|' + lb)];
const GC_CODE = ['Garbler (Alice):', '  pick labels W⁰, W¹ for wires A, B, C', '  for each (a, b): row ← Enc(A^a, B^b; C^{g(a,b)} ‖ 0…0)', '  shuffle the 4 rows; send table and A^a', 'Bob gets B^b by oblivious transfer', 'Evaluator (Bob): for each row:', '  try to decrypt with (A^a, B^b); keep the one whose tag is 0', 'decode the output label to a bit'];
export function GcVis() {
  const [gate, setGate] = useState<Gate>('AND'), [a, setA] = useState(1), [b, setB] = useState(0), [nonce, setNonce] = useState(0);
  const frames = useMemo(() => {
    const L = { A: [rnd(0, 0xffffff), rnd(0, 0xffffff)], B: [rnd(0, 0xffffff), rnd(0, 0xffffff)], C: [rnd(0, 0xffffff), rnd(0, 0xffffff)] };
    const io: [number, number][] = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const rows = io.map(([x, y]) => { const [p1, p2] = pads(L.A[x], L.B[y]); return { x, y, c1: (L.C[GATE[gate](x, y)] ^ p1) & 0xffffff, c2: (0 ^ p2) >>> 0 }; });
    const order = shuffled([0, 1, 2, 3]), la = L.A[a], lb = L.B[b], [q1, q2] = pads(la, lb);
    const tries = order.map(i => { const r = rows[i], tag = (r.c2 ^ q2) >>> 0, lab = (r.c1 ^ q1) & 0xffffff; return { r, ok: tag === 0, lab }; });
    const opened = tries.find(t => t.ok)!;
    const view = (k: number, tried = -1) => (
      <div className="st-row">
        <Party who="alice" title="Alice (garbler)">
          {k >= 1 && (['A', 'B', 'C'] as const).map(w => <Kv key={w} k={`wire ${w}`} who="a">{w}⁰ = {hex(L[w][0])}, {w}¹ = {hex(L[w][1])}</Kv>)}
          <Kv k="bit a" who="a">{a}</Kv>
          <div className="note">{gate}: {io.map(([x, y]) => `${x}${y}→${GATE[gate](x, y)}`).join(', ')}</div>
        </Party>
        <Wire title="Garbled table">
          {k >= 2 && <table className="tbl"><tbody>{(k >= 3 ? order.map(i => rows[i]) : rows).map((r, i) => {
            const t = k >= 3 ? tries[i] : null;
            return <tr key={i} className={i === tried ? 'st-new' : ''}><td className="num">{hex(r.c1)}·{hex(r.c2, 8)}</td><td>{k < 3 ? <span className="muted">row ({r.x},{r.y})</span> : i <= tried ? (t!.ok ? <span className="ok">✓ → {hex(t!.lab)}</span> : <span className="muted">⊥</span>) : ''}</td></tr>;
          })}</tbody></table>}
          {k >= 3 && <SMsg dir="Alice → Bob">table + A^a = {hex(la)}</SMsg>}
          {k >= 4 && <SMsg dir="OT" fresh={k === 4}>Bob receives B^b = {hex(lb)}</SMsg>}
        </Wire>
        <Party who="bob" title="Bob (evaluator)">
          <Kv k="bit b" who="b">{b}</Kv>
          {k >= 3 && <Kv k="holds A^a">{hex(la)}</Kv>}
          {k >= 4 && <Kv k="holds B^b">{hex(lb)}</Kv>}
          {k >= 6 && <><Kv k="output label"><Hl on>{hex(opened.lab)}</Hl></Kv><div className="st-big">{a} {gate} {b} = {L.C.indexOf(opened.lab)}</div></>}
        </Party>
      </div>
    );
    const steps: { status: ReactNode; line: number | number[]; stage: ReactNode }[] = [
      { status: <>Alice will garble one {gate} gate; Alice holds a = {a}, Bob holds b = {b}.</>, line: 0, stage: view(0) },
      { status: <>Each wire gets two random labels, one meaning 0 and one meaning 1.</>, line: 1, stage: view(1) },
      { status: <>Each row hides the right output label under the pair of input labels.</>, line: 2, stage: view(2) },
      { status: <>The rows are shuffled so their order reveals nothing; Alice sends the table and her label.</>, line: 3, stage: view(3) },
      { status: <>Bob gets the label for his bit by OT, so Alice never learns b.</>, line: 4, stage: view(4) },
      ...tries.map((t, i) => ({ status: t.ok ? <>Row {i + 1} decrypts with a zero tag: this is the one.</> : <>Row {i + 1}: the tag isn't zero, so this row stays sealed.</>, line: [5, 6], stage: view(5, i) })),
      { status: <>The decoding table maps the output label to the bit {L.C.indexOf(opened.lab)}. Bob never saw any other row's contents.</>, line: 7, stage: view(6, 3) },
    ];
    return steps;
  }, [gate, a, b, nonce]);
  return (
    <VisPage topicId="gc" code={GC_CODE} frames={frames} actions={[
      { label: 'Gate', form: <Seg value={gate} onChange={setGate} options={[['AND', 'AND'], ['OR', 'OR'], ['XOR', 'XOR']]} /> },
      { label: 'Inputs a, b', form: <><Seg value={a} onChange={setA} options={[[0, 'a = 0'], [1, 'a = 1']]} /><Seg value={b} onChange={setB} options={[[0, 'b = 0'], [1, 'b = 1']]} /></> },
      { label: 'New labels', form: <Go onClick={() => setNonce(x => x + 1)}>Randomize</Go> },
    ]} />
  );
}

// ---------- cuckoo hashing ----------
const CM = 10, MAXLOOP = 12;
const WORDS = ['fig', 'lime', 'pear', 'plum', 'date', 'kiwi', 'yuzu', 'sloe', 'quince', 'guava', 'mango', 'apple', 'cherry', 'olive', 'melon', 'grape', 'lemon', 'peach'];
const hs = (x: string): [number, number] => { const a = h32('h1' + x) % CM; let b = h32('h2' + x) % CM; if (b === a) b = (b + 1) % CM; return [a, b]; };
type Snap = { bins: (string | null)[]; stash: string[]; hl: number | null; text: string };
function insertTrace(bins0: (string | null)[], stash0: string[], x: string): Snap[] {
  const bins = [...bins0], stash = [...stash0], out: Snap[] = [];
  const snap = (hl: number | null, text: string) => out.push({ bins: [...bins], stash: [...stash], hl, text });
  let cur = x, b = hs(x)[0];
  snap(null, `Insert “${x}”: its candidate bins are ${hs(x).join(' and ')}.`);
  for (let it = 0; it < MAXLOOP; it++) {
    const [h1, h2] = hs(cur);
    if (bins[h1] === null) b = h1; else if (bins[h2] === null) b = h2;
    if (bins[b] === null) { bins[b] = cur; snap(b, `“${cur}” goes into free bin ${b}.`); return out; }
    const ev = bins[b]!; bins[b] = cur; snap(b, `Both bins of “${cur}” are full: it takes bin ${b} and evicts “${ev}”.`);
    const [e1, e2] = hs(ev); b = e1 === b ? e2 : e1; cur = ev;
  }
  stash.push(cur); snap(null, `Too many evictions: “${cur}” goes to the stash.`);
  return out;
}
const CK_CODE = ['Insert(x):', '  for up to MAX times:', '    if h1(x) or h2(x) is free: put x there; done', '    else: put x in its bin, evicting y', '    x ← y   (y moves to its other bin)', '  put x in the stash'];
export function CuckooVis() {
  const init = useMemo(() => { let bins: (string | null)[] = new Array(CM).fill(null), stash: string[] = []; ['fig', 'lime', 'pear', 'plum', 'date'].forEach(w => { const t = insertTrace(bins, stash, w); bins = t[t.length - 1].bins; stash = t[t.length - 1].stash; }); return { bins, stash }; }, []);
  const [table, setTable] = useState(init);
  const [trace, setTrace] = useState<Snap[] | null>(null);
  const [x, setX] = useState('kiwi');
  const insert = (w: string) => {
    if (!w || table.bins.includes(w) || table.stash.includes(w)) return;
    const t = insertTrace(table.bins, table.stash, w);
    setTrace(t); setTable({ bins: t[t.length - 1].bins, stash: t[t.length - 1].stash });
  };
  const frames = useMemo(() => {
    const snaps = trace ?? [{ ...table, hl: null, text: 'Five items are already placed. Insert another from the actions menu.' }];
    const stage = (s: Snap) => (
      <div className="st-cells" style={{ gap: 10 }}>
        {s.bins.map((v, i) => <span key={i} className={`st-cell ${s.hl === i ? 'on' : ''}`} style={{ minWidth: 76 }}><span className="ix">bin {i}</span>{v ?? '—'}{v && <span className="ix">{hs(v).join(' | ')}</span>}</span>)}
        <span className="st-cell bad" style={{ minWidth: 90 }}><span className="ix">stash</span>{s.stash.join(', ') || '—'}</span>
      </div>
    );
    return snaps.map((s, i) => ({ stage: stage(s), status: s.text, line: i === 0 ? 0 : s.text.includes('free') ? 2 : s.text.includes('stash') ? 5 : [3, 4] }));
  }, [trace]); // table changes only together with trace
  return (
    <VisPage topicId="cuckoo" code={CK_CODE} frames={frames} actions={[
      { label: 'Insert(x)', form: <><input type="text" value={x} onChange={e => setX(e.target.value)} style={{ width: '7em' }} /><Go onClick={() => insert(x.trim().toLowerCase())} /></> },
      { label: 'Insert random', form: <Go onClick={() => { const left = WORDS.filter(w => !table.bins.includes(w) && !table.stash.includes(w)); if (left.length) insert(left[rnd(0, left.length - 1)]); }}>Go</Go> },
      { label: 'Clear table', form: <Go onClick={() => { setTable({ bins: new Array(CM).fill(null), stash: [] }); setTrace([{ bins: new Array(CM).fill(null), stash: [], hl: null, text: 'Empty table.' }]); }}>Clear</Go> },
    ]} />
  );
}

export const ShuffleVis = () => <VisPage topicId="shuffle" stage={<Shuffle />} code={['Alice: list x_1 … x_n;  Bob: permutation π', 'run an OT-based switching network', 'Alice gets r_i (random)', 'Bob gets x_{π(i)} − r_i', 'neither learns π applied to x alone']} />;
