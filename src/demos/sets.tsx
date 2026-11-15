import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../state';
import { H2G, P, Q, bytesHex, enc, fmtBytes, h32, mod, mpow, okvsDecode, okvsEncode, rnd, setInputNotes, short, shuffled } from '../lib/crypto';
import { Kv, Lab, List, LogBars, Msg, Pv, S, Seg, Steps } from '../components/ui';

// ---------- shared playground sets + Venn diagram ----------
export function Playground() {
  const { setA, setB, setSetA, setSetB, A, B } = useApp();
  const I = A.filter(x => B.includes(x));
  const chips = (xs: string[], cls: string) => xs.map(x => <span key={x} className={`chip ${cls}`}>{x}</span>);
  return (
    <Lab title="Shared playground sets">
      <div className="parties">
        <label className="pv alice"><h4>Alice's set A</h4><input type="text" value={setA} onChange={e => setSetA(e.target.value)} /></label>
        <label className="pv bob"><h4>Bob's set B</h4><input type="text" value={setB} onChange={e => setSetB(e.target.value)} /></label>
      </div>
      <div className="venn">
        <div className="va-only"><span className="cap">A only</span>{chips(A.filter(x => !B.includes(x)), 'a-chip')}</div>
        <div className="vboth"><span className="cap">A ∩ B ({I.length})</span>{chips(I, 'both')}</div>
        <div className="vb-only"><span className="cap">B only</span>{chips(B.filter(x => !A.includes(x)), 'b-chip')}</div>
      </div>
      <p className="note">The Venn view is the ideal picture of the sets, not what a private protocol reveals. The private set union and PSI variants entries reuse these two sets.</p>
      {(setInputNotes(setA) || setInputNotes(setB)) && <p className="note">{[setInputNotes(setA) && `A: ${setInputNotes(setA)}`, setInputNotes(setB) && `B: ${setInputNotes(setB)}`].filter(Boolean).join(' ')}</p>}
    </Lab>
  );
}

// ---------- PSI protocol stepper ----------
interface PStep { n: string; a: ReactNode; w: ReactNode; b: ReactNode; la: ReactNode[]; lb: ReactNode[] }
interface Proto { desc: string; steps: PStep[] }
export type ProtoId = 'naive' | 'dh' | 'oprf' | 'vole' | 'circuit';
const DICT = ['ana', 'ben', 'cho', 'dev', 'eli', 'fay', 'gus', 'hal', 'ivy', 'jo', 'kai', 'lee', 'max', 'ned', 'oz', 'pat', 'quin', 'ray', 'sam', 'tom', 'uma', 'val', 'wes', 'xi', 'yan', 'zoe', 'alice', 'bob', 'carol', 'dave'];
const setStr = (xs: string[]) => `{${xs.join(', ')}}`;
/** Real string intersection, plus a warning when the toy hash reports something else. */
function intersectionReport(reported: string[], truth: string[]) {
  const extra = [...new Set(reported.filter(x => !truth.includes(x)))];
  const missed = truth.filter(x => !reported.includes(x));
  if (!extra.length && !missed.length) return `A ∩ B = ${setStr(truth)}`;
  return `Real intersection A ∩ B = ${setStr(truth)}. This simplified hash also ${extra.length ? `matched ${setStr(extra)}` : ''}${extra.length && missed.length ? ' and ' : ''}${missed.length ? `missed ${setStr(missed)}` : ''}, because two different strings can share one toy hash. A real protocol uses a collision-resistant hash.`;
}

export function buildProto(id: ProtoId, SA: string[], SB: string[]): Proto {
  const I = SA.filter(a => SB.includes(a));
  if (id === 'naive') {
    const hA = SA.map(a => [a, short(a)] as const);
    const hashHits = SB.filter(b => hA.some(([, h]) => h === short(b)));
    const recovered = hA.filter(([, h]) => DICT.concat(SB).some(w => short(w) === h)).map(([a]) => a);
    return {
      desc: 'Alice just hashes her items and sends the hashes. Simple, and broken: if items come from a small or guessable domain (names, phone numbers), Bob can hash a dictionary and invert everything.',
      steps: [
        { n: 'Alice hashes', a: <List items={hA.map(([a, h]) => <><S a>{a}</S> → {h}</>)} />, w: <div className="muted">nothing yet</div>, b: null, la: [], lb: [] },
        { n: 'Send hashes', a: <div className="note">waiting</div>, w: <Msg dir="Alice → Bob">{shuffled(hA).map(x => x[1]).join(' ')}</Msg>, b: <div className="note">receives |A| hashes</div>, la: [], lb: [`|A| = ${SA.length}`, 'H(a) for each a'] },
        { n: 'Bob compares', a: null, w: <Msg dir="Bob → Alice">matches: {hashHits.map(short).join(' ') || '∅'}</Msg>, b: <List items={SB.map(b => {
          const hit = hA.find(([, h]) => h === short(b));
          if (hit && SA.includes(b)) return <><S b>{b}</S> → {short(b)} <span className="ok">match</span></>;
          if (hit) return <><S b>{b}</S> → {short(b)} <span className="bad">toy hash collision with {hit[0]}</span></>;
          return <><S b>{b}</S> → {short(b)}</>;
        })} />, la: [intersectionReport(I, I)], lb: [intersectionReport(SB.flatMap(b => { const hit = hA.find(([, h]) => h === short(b)); return hit ? [SA.includes(b) ? b : hit[0]] : []; }), I)] },
        { n: 'Dictionary attack', a: <div className="bad">Her non-matching items were exposed too.</div>, w: <div className="muted">offline, no messages</div>, b: <><div className="note">hashes {DICT.length} common names and compares</div><List items={recovered.map(a => <><span className="bad">{a}</span> recovered</>)} /></>, la: [], lb: [<span className="bad">recovered {recovered.length}/{SA.length} of Alice's items: {setStr(recovered)}</span>] },
      ],
    };
  }
  if (id === 'dh') {
    const al = rnd(2, Q - 1), be = rnd(2, Q - 1);
    const XA = SA.map(a => [a, mpow(H2G(a), al, P)] as const), XAB = XA.map(([a, v]) => [a, mpow(v, be, P)] as const);
    const YB = shuffled(SB).map(b => mpow(H2G(b), be, P)), YBA = YB.map(v => mpow(v, al, P));
    const found = XAB.filter(([, v]) => YBA.includes(v)).map(([a]) => a);
    return {
      desc: 'Meadows (1986) and Huberman–Franklin–Hogg (1999): because exponentiation commutes, H(x)^(αβ) = H(x)^(βα). This is a simplified trace with a toy hash into a 10-bit group, not a complete secure protocol. A real deployment needs a collision-resistant hash into a large group.',
      steps: [
        { n: 'Alice blinds', a: <><Kv k="α" who="a">{al}</Kv><List items={XA.map(([a, v]) => <><S a>{a}</S>: H(a)<sup>α</sup> = {v}</>)} /></>, w: <Msg dir="Alice → Bob">{XA.map(x => x[1]).join(' ')}</Msg>, b: null, la: [], lb: [`|A| = ${SA.length}`] },
        { n: 'Bob re-blinds', a: null, w: <><Msg dir="Bob → Alice (same order)">H(a)<sup>αβ</sup>: {XAB.map(x => x[1]).join(' ')}</Msg><Msg dir="Bob → Alice (shuffled)">H(b)<sup>β</sup>: {YB.join(' ')}</Msg></>, b: <><Kv k="β" who="b">{be}</Kv><div className="note">raises each received value to β and sends his own items blinded with β</div></>, la: [`|B| = ${SB.length}`], lb: [] },
        { n: 'Alice compares', a: <><div className="note">computes (H(b)<sup>β</sup>)<sup>α</sup>. Simplified DH-PSI: a match of group elements, not a proof the strings are equal.</div><List items={YBA.map(v => {
          const hit = XAB.find(([, w]) => w === v);
          return <>{v} {hit && (SB.includes(hit[0]) ? <span className="ok">match</span> : <span className="bad">toy collision</span>)}</>;
        })} /></>, w: null, b: <div className="note">done; learned nothing else</div>, la: [intersectionReport(found, I)], lb: [] },
      ],
    };
  }
  if (id === 'oprf') {
    const k = rnd(2, Q - 1), F = (x: string) => mpow(H2G(x), k, P);
    const runs = SA.map(a => { const r = rnd(2, Q - 1), bl = mpow(H2G(a), r, P); return { a, bl, rs: mpow(bl, k, P), f: F(a) }; });
    const FB = shuffled(SB).map(F);
    return {
      desc: 'Bob holds an OPRF key. Alice obliviously evaluates F_k on each of her items, then Bob simply sends F_k(b) for all his items. KKRT16 and later protocols do the same thing with OT extension and cuckoo hashing in place of exponentiation.',
      steps: [
        { n: 'Oblivious evaluation', a: <List items={runs.map(r => <><S a>{r.a}</S> → F<sub>k</sub> = <S a>{r.f}</S></>)} />, w: <>{runs.map((r, i) => <Msg key={i} dir="blinded ⇄ response">{r.bl} ⇄ {r.rs}</Msg>)}</>, b: <><Kv k="key k" who="b">{k}</Kv><div className="note">only sees blinded values</div></>, la: [], lb: [`|A| = ${SA.length}`] },
        { n: 'Bob sends PRF values', a: null, w: <Msg dir="Bob → Alice (shuffled)">{FB.join(' ')}</Msg>, b: <List items={SB.map(b => <><S b>{b}</S> → {F(b)}</>)} />, la: [`|B| = ${SB.length}`], lb: [] },
        { n: 'Alice compares', a: <List items={runs.map(r => {
          const hit = FB.includes(r.f);
          const real = SB.includes(r.a);
          return <>{r.a}: {hit && real ? <span className="ok">in B</span> : hit ? <span className="bad">toy hash collision</span> : <span className="muted">not in B</span>}</>;
        })} />, w: null, b: null, la: [intersectionReport(SA.filter(a => FB.includes(F(a))), I)], lb: [] },
      ],
    };
  }
  if (id === 'vole') {
    const p = 65521, Hf = (x: string) => h32('H|' + x) % p, D = rnd(1, p - 1);
    const encP = okvsEncode(SA.map(a => [a, Hf(a)]), Math.max(5, SA.length + 3), p, rnd(1, 9999))!, m = encP.P.length;
    const Av = Array.from({ length: m }, () => rnd(0, p - 1)), Cv = Array.from({ length: m }, () => rnd(0, p - 1));
    const Bv = Av.map((a, i) => mod(Cv[i] + mod(a * D, p), p));
    const Dv = encP.P.map((v, i) => mod(v - Av[i], p)), Kv_ = Bv.map((b, i) => mod(b + mod(Dv[i] * D, p), p));
    const dec = (V: number[], x: string) => okvsDecode(V, x, p, encP.seed);
    const fb = (b: string) => short(mod(dec(Kv_, b) - mod(D * Hf(b), p), p)), fa = (a: string) => short(dec(Cv, a));
    const FB = shuffled(SB).map(fb);
    const cut = (v: number[]) => v.slice(0, 6).join(' ') + (v.length > 6 ? ' …' : '');
    return {
      desc: 'Rindal–Schoppmann (2021) style, over 𝔽₆₅₅₂₁. Alice encodes her set into an OKVS P with Decode(P, a) = H(a), masks it with her VOLE vector A and sends it. Linearity of Decode turns the VOLE into an OPRF: Decode(K, x) − Δ·H(x) equals Decode(C, x) exactly when x ∈ A.',
      steps: [
        { n: 'Silent VOLE', a: <><Kv k="A" who="a">{cut(Av)}</Kv><Kv k="C" who="a">{cut(Cv)}</Kv></>, w: <div className="note">PCG seeds only; length-{m} VOLE expands locally</div>, b: <><Kv k="Δ" who="b">{D}</Kv><Kv k="B = C + A·Δ" who="b">{cut(Bv)}</Kv></>, la: [], lb: [] },
        { n: 'Alice sends OKVS', a: <Kv k="P = Encode{a ↦ H(a)}" who="a">{cut(encP.P)}</Kv>, w: <><Msg dir="Alice → Bob">D = P − A: {cut(Dv)}</Msg><div className="note">D is masked by uniform A, so it looks random.</div></>, b: null, la: [], lb: ["an OKVS-sized vector, nothing about A's contents"] },
        { n: 'Bob evaluates', a: null, w: <Msg dir="Bob → Alice (shuffled)">{FB.join(' ')}</Msg>, b: <><Kv k="K = B + D·Δ" who="b">{cut(Kv_)}</Kv><List items={SB.map(b => <><S b>{b}</S> → H(Decode(K,b) − Δ·H(b)) = {fb(b)}</>)} /></>, la: [`|B| = ${SB.length}`], lb: [] },
        { n: 'Alice compares', a: <List items={SA.map(a => {
          const hit = FB.includes(fa(a));
          return <>{a}: H(Decode(C,a)) = {fa(a)} {hit && SB.includes(a) ? <span className="ok">match</span> : hit ? <span className="bad">toy hash collision</span> : null}</>;
        })} />, w: null, b: null, la: [intersectionReport(SA.filter(a => FB.includes(fa(a))), I)], lb: [] },
      ],
    };
  }
  const bits = SA.map(a => { const z = SB.includes(a) ? 1 : 0, sa = rnd(0, 1); return [a, sa, sa ^ z] as const; });
  const card = bits.reduce((s, [, x, y]) => s + (x ^ y), 0);
  return {
    desc: "Circuit-PSI (e.g. PSTY19, RS21) never reveals the intersection itself. The parties end up with XOR shares of the membership bit for each of Alice's cuckoo bins, then feed those shares into any 2PC circuit: cardinality, sum, threshold, a join.",
    steps: [
      { n: 'Hash into bins', a: <><div className="note">cuckoo-hashes A, one item per bin</div><List items={SA.map((a, i) => <>bin {i}: <S a>{a}</S></>)} /></>, w: null, b: <div className="note">simple-hashes each b into all its candidate bins</div>, la: [], lb: [] },
      { n: 'OPPRF per bin', a: <div className="note">queries the OPPRF with her bin's item</div>, w: <Msg dir="Bob → Alice">one OKVS hint for all bins</Msg>, b: <div className="note">programs, for each bin, a random target t at all items he placed in it</div>, la: [], lb: [] },
      { n: 'Shared membership bits', a: <List items={bits.map(([, x], i) => <>bin {i}: <S a>{x}</S></>)} />, w: <><div className="note">Combined (nobody sees this)</div><List items={bits.map(([, x, y], i) => <>bin {i}: <S a b>{x ^ y}</S></>)} /></>, b: <List items={bits.map(([, , y], i) => <>bin {i}: <S b>{y}</S></>)} />, la: ['a random-looking bit per bin'], lb: ['a random-looking bit per bin'] },
      { n: '2PC: count', a: <Kv k="output">{card}</Kv>, w: <div className="note">garbled circuit / GMW adds the XORed bits</div>, b: <Kv k="output">{card}</Kv>, la: [`|A ∩ B| = ${card} (not which items)`], lb: [`|A ∩ B| = ${card}`] },
    ],
  };
}

export function PsiStepper() {
  const { A, B } = useApp();
  const [proto, setProto] = useState<ProtoId>('naive');
  const [step, setStep] = useState(0);
  const P_ = useMemo(() => buildProto(proto, A, B), [proto, A.join(), B.join()]);
  const cur = Math.min(step, P_.steps.length - 1), s = P_.steps[cur];
  const acc = (k: 'la' | 'lb') => P_.steps.slice(0, cur + 1).flatMap(x => x[k]);
  const ledger = (items: ReactNode[]) => <ul>{items.length ? items.map((x, i) => <li key={i}>{x}</li>) : <li className="muted">nothing yet</li>}</ul>;
  return (
    <Lab title="Protocol stepper" secret>
      <div className="controls">
        <Seg value={proto} onChange={v => { setProto(v); setStep(0); }} options={[['naive', 'Naive hash'], ['dh', 'DH-PSI'], ['oprf', 'OPRF-PSI'], ['vole', 'VOLE + OKVS'], ['circuit', 'Circuit-PSI']]} />
      </div>
      <p className="note">{P_.desc}</p>
      <Steps names={P_.steps.map(x => x.n)} cur={cur} onChange={setStep} />
      <div className="parties three">
        <Pv who="alice" title="Alice">{s.a}</Pv>
        <Pv who="wire" title="Wire">{s.w}</Pv>
        <Pv who="bob" title="Bob">{s.b}</Pv>
      </div>
      <Pv who="wire" title="Ledger: what each party has learned">
        <div className="parties">
          <div className="ledger"><b className="a">Alice</b>{ledger(acc('la'))}</div>
          <div className="ledger"><b className="b">Bob</b>{ledger(acc('lb'))}</div>
        </div>
      </Pv>
    </Lab>
  );
}

// ---------- PSI cost comparator (illustrative) ----------
const COST: [string, (n: number) => number, (n: number) => number, string][] = [
  ['DH-PSI (ECC)', n => n * 3 * 33, n => 4 * n, 'var(--c6)'],
  ['KKRT16 (OT ext.)', n => n * 120, () => 256, 'var(--c3)'],
  ['CM20', n => n * 70, () => 256, 'var(--c4)'],
  ['VOLE-PSI (RS21)', n => n * 55, () => 256, 'var(--c1)'],
  ['RR22', n => n * 35, () => 256, 'var(--c2)'],
];
export function CostChart() {
  const [e, setE] = useState(20), [metric, setMetric] = useState<'comm' | 'pk'>('comm');
  const n = 2 ** e;
  return (
    <Lab title="What does it cost? (coarse model, not benchmarks)">
      <p className="note">Public-key work grows with n for DH-PSI but stays fixed at the base OTs for OT/VOLE-based protocols. Communication numbers are illustrative orders of magnitude; see each paper for measured results.</p>
      <div className="controls">
        <label>n = 2<sup>{e}</sup> <input type="range" min={8} max={24} value={e} onChange={x => setE(+x.target.value)} /></label>
        <Seg value={metric} onChange={setMetric} options={[['comm', 'Communication'], ['pk', 'Public-key ops']]} />
      </div>
      <LogBars rows={COST.map(([l, c, pk, col]) => [l, metric === 'comm' ? c(n) : pk(n), col])} fmt={metric === 'comm' ? fmtBytes : v => Math.round(v).toLocaleString() + ' ops'} />
    </Lab>
  );
}

/** The PSI entry's demo: shared sets, the protocol stepper and the cost model. */
export function PsiDemo() {
  return <><Playground /><PsiStepper /><CostChart /></>;
}

// ---------- PSU: membership test + OT, optionally after a shuffle ----------
export function PsuDemo() {
  const { A, B } = useApp();
  const [shuf, setShuf] = useState(true), [step, setStep] = useState(0), [nonce, setNonce] = useState(0);
  const order = useMemo(() => (shuf ? shuffled(B) : B.slice()), [shuf, B.join(), nonce]);
  const e = order.map(b => (A.includes(b) ? 1 : 0)), got = order.filter((_, j) => !e[j]), U = A.concat(got);
  return (
    <Lab title="Membership test + OT PSU" secret>
      <div className="controls">
        <label><input type="checkbox" checked={shuf} onChange={x => setShuf(x.target.checked)} /> Oblivious shuffle first (shuffle-based PSU)</label>
        <button className="btn ghost" onClick={() => setNonce(x => x + 1)}>Reshuffle</button>
      </div>
      <Steps names={["Bob's list", 'Membership test', 'OT per item', 'Alice outputs union']} cur={step} onChange={setStep} />
      <div className="parties three">
        <Pv who="alice" title="Alice (receiver)">
          {step === 0 && <div className="note">sees {order.length} positions, contents hidden</div>}
          {step >= 1 && <><div className="note">membership bits eⱼ = [bⱼ ∈ A]</div><List items={e.map((x, j) => <>pos {j}: e = <S a>{x}</S></>)} /></>}
          {step >= 3 && <>
            <h4 style={{ marginTop: 6 }}>Received</h4><List items={order.map((b, j) => (e[j] ? <span className="muted">⊥</span> : <S a>{b}</S>))} />
            <h4 style={{ marginTop: 6 }}>A ∪ B</h4><S a>{setStr(U)}</S>
          </>}
        </Pv>
        <Pv who="wire" title="Wire">
          {step === 0 && <div className="note">{shuf ? "Oblivious shuffle: Bob's items are re-ordered by a permutation neither side can link back to Bob's original list." : "No shuffle: positions follow Bob's own order."}</div>}
          {step === 1 && <Msg dir="reverse private membership test">OPRF / OKVS messages</Msg>}
          {step >= 2 && order.map((b, j) => <Msg key={j} dir={<>OT #{j}: (m₀ = bⱼ, m₁ = ⊥)</>}>{bytesHex(enc(b, 'k0|' + j + b)).slice(0, 12)} · {bytesHex(enc('⊥', 'k1|' + j + b))}</Msg>)}
        </Pv>
        <Pv who="bob" title="Bob (sender)">
          <List items={B.map(b => <S b>{b}</S>)} />
          {step >= 2 && <div className="note">Bob never learns the choice bits e, so he doesn't know which items were delivered.</div>}
        </Pv>
      </div>
      <Pv who="wire">
        {step < 3 ? <span className="note">Step through to the end to see what Alice can infer.</span>
          : shuf ? <><b>With the shuffle</b>, the ⊥ positions are random, so Alice learns the union and its size, and nothing about how Bob's original list was arranged.</>
            : <><b>Without the shuffle</b>, Alice learns that Bob's items at positions {setStr(e.flatMap((x, j) => (x ? [String(j)] : [])))} are duplicates. If Bob's order is meaningful (sorted by date, by customer ID), that leaks extra information. Toggle the shuffle to compare.</>}
      </Pv>
    </Lab>
  );
}

// ---------- PSI functionality variants ----------
const VARIANTS: Record<string, [string, (I: string[], val: (b: string) => number, A: string[], B: string[]) => string, string]> = {
  'PSI': ['A ∩ B', I => setStr(I), 'Contact discovery, ad-conversion matching.'],
  'PSI-CA': ['|A ∩ B| only', I => `${I.length}`, 'Cardinality: how many customers overlap, without revealing who.'],
  'PSI-Sum': ['Σ values over A ∩ B', (I, val) => `${I.reduce((s, b) => s + val(b), 0)} (from ${I.length} matches)`, "Google's ad-attribution style: total spend of users who saw an ad."],
  'Labeled PSI': ['label of each matched item', (I, val) => I.map(b => `${b} → label ${val(b)}`).join(', ') || '∅', 'Server attaches data to each item; client learns labels only for matches. Common in unbalanced PSI with HE.'],
  'Threshold PSI': ['A ∩ B only if |A ∩ B| ≥ t (t = 3)', I => (I.length >= 3 ? setStr(I) : `nothing (only ${I.length} < 3 matches)`), 'Ride-sharing/dating: reveal only when the overlap is large enough.'],
  'PSU': ['A ∪ B', (_I, _v, A, B) => setStr([...new Set(A.concat(B))]), 'Merging blocklists, IP threat feeds, aggregating logs.'],
};
export function Variants() {
  const { A, B } = useApp();
  const [cur, setCur] = useState('PSI');
  const I = A.filter(a => B.includes(a)), val = (b: string) => 10 + (h32('$' + b) % 90);
  const [what, f, why] = VARIANTS[cur];
  return (
    <Lab secret>
      <div className="controls">{Object.keys(VARIANTS).map(k => <button key={k} className="chip" aria-pressed={k === cur} onClick={() => setCur(k)}>{k}</button>)}</div>
      <div className="parties">
        <Pv who="wire" title={`${cur}: Alice receives ${what}`}>
          <div className="val">{f(I, val, A, B)}</div>
          <div className="note">Bob's values: {B.map(b => <S b key={b}>{b}={val(b)} </S>)}</div>
        </Pv>
        <Pv who="wire" title="Typical use"><div>{why}</div></Pv>
      </div>
    </Lab>
  );
}

