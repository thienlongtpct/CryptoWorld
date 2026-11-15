import { useMemo, useState } from 'react';
import { bigPow, minv, mod, rnd, spn, spnTrace } from '../../lib/crypto';
import { Kv, Seg } from '../../components/ui';
import { EP, GEN, HashInputs, HashReadout, POINTS, Pixels, add, orderOf, slope, sourceImage, useShaPair, type Pt } from '../../demos/modern';
import { VisPage, type Frame } from '../Player';
import { Go, Hl, Party, SMsg, Wire, useDraft } from '../kit';

const popcount = (x: number) => x.toString(2).split('1').length - 1;

// ---------- block-cipher avalanche ----------
const SPN_CODE = ['Encrypt(x, key):   // toy 16-bit SPN', '  for round r = 1 … 4:', '    x ← x ⊕ K_r            // add round key', '    x ← S-box on each 4-bit nibble   // confusion', '    x ← bit permutation (not in round 4)   // diffusion', '  return x ⊕ K_5'];
const NAMES = ['plaintext', 'round 1', 'round 2', 'round 3', 'round 4', 'ciphertext'];
export function BlockVis() {
  const [key, setKey] = useState(() => rnd(0, 0xffff)), [a, setA] = useState(() => rnd(0, 0xffff));
  const [flip, fD, setFD, commitF] = useDraft(3);
  const frames = useMemo<Frame[]>(() => {
    const ta = spnTrace(a, key), tb = spnTrace(a ^ (1 << flip), key);
    const row = (v: number, d: number) => <span className="bitrow">{Array.from({ length: 16 }, (_, i) => { const b = 15 - i, on = (v >>> b) & 1; return <span key={i} className={`bit ${on ? 'one' : ''} ${(d >>> b) & 1 ? 'diff' : ''}`}>{on}</span>; })}</span>;
    const table = (upto: number) => (
      <div className="scroll-x" style={{ display: 'grid', placeItems: 'center' }}><table className="spn"><thead><tr><th /><th>A</th><th>B (bit {flip} flipped)</th><th>differ</th></tr></thead>
        <tbody>{ta.slice(0, upto + 1).map((va, r) => { const d = va ^ tb[r], cnt = popcount(d); return <tr key={r} className={r === upto ? 'st-new' : ''}><th>{NAMES[r]}</th><td>{row(va, d)}</td><td>{row(tb[r], d)}</td><td><span className="dbar"><span style={{ width: `${(cnt / 16) * 100}%` }} /></span> <b>{cnt}</b>/16</td></tr>; })}</tbody>
      </table></div>
    );
    return ta.map((_, r) => {
      const cnt = popcount(ta[r] ^ tb[r]);
      return { stage: table(r), status: r === 0 ? <>Two plaintexts that differ in one bit (bit {flip}).</> : r === 5 ? <>After the final key: {cnt} of 16 bits differ. A good cipher flips about half.</> : <>After round {r}: the difference has spread to {cnt} bit{cnt === 1 ? '' : 's'}.</>, line: r === 0 ? 0 : r === 5 ? 5 : [1, 2, 3, 4] };
    });
  }, [key, a, flip]);
  return (
    <VisPage topicId="blockcipher" code={SPN_CODE} frames={frames} actions={[
      { label: 'Flip bit (0–15)', form: <><input type="number" min={0} max={15} value={fD} onChange={e => setFD(Math.max(0, Math.min(15, +e.target.value)))} /><Go onClick={commitF} /></> },
      { label: 'New key / plaintext', form: <><Go onClick={() => setKey(rnd(0, 0xffff))}>New key</Go><Go onClick={() => setA(rnd(0, 0xffff))}>New plaintext</Go></> },
    ]} />
  );
}

// ---------- modes of operation ----------
const MODE_CODE = ['split the image into 16-bit blocks p_1 … p_n', 'ECB:  c_i ← E(p_i)', 'CBC:  c_0 ← IV;  c_i ← E(p_i ⊕ c_{i−1})', 'CTR:  c_i ← p_i ⊕ E(nonce + i)'];
export function ModesVis() {
  const [img, setImg] = useState<'lock' | 'text'>('lock'), [key, setKey] = useState(() => rnd(0, 0xffff));
  const frames = useMemo<Frame[]>(() => {
    const px = sourceImage(img), N = px.length, blocks: number[] = [];
    for (let i = 0; i < N; i += 2) blocks.push((px[i] << 8) | px[i + 1]);
    let prev = rnd(0, 0xffff); const nonce = rnd(0, 0xffff);
    const E = { ecb: blocks.map(b => spn(b, key)), cbc: blocks.map(b => (prev = spn(b ^ prev, key))), ctr: blocks.map((b, i) => b ^ spn((nonce + i) & 0xffff, key)) };
    const partial = (arr: number[], upto: number) => { const o = new Uint8Array(N).fill(0xf4); arr.slice(0, upto).forEach((b, i) => { o[2 * i] = b >>> 8; o[2 * i + 1] = b & 0xff; }); return o; };
    const STEPS = 8;
    return Array.from({ length: STEPS + 1 }, (_, s) => {
      const upto = Math.round((blocks.length * s) / STEPS);
      return {
        stage: <div className="modes"><Pixels px={px} caption="Plaintext" /><Pixels px={partial(E.ecb, upto)} caption="ECB" /><Pixels px={partial(E.cbc, upto)} caption="CBC" /><Pixels px={partial(E.ctr, upto)} caption="CTR" /></div>,
        status: s === 0 ? <>The image is cut into {blocks.length} blocks of two pixels each.</> : s < STEPS ? <>Encrypted {upto} of {blocks.length} blocks, row by row.</> : <>Done. ECB maps equal blocks to equal ciphertext, so the outline survives; CBC and CTR look like noise.</>,
        line: s === 0 ? 0 : [1, 2, 3],
      };
    });
  }, [img, key]);
  return (
    <VisPage topicId="modes" code={MODE_CODE} frames={frames} actions={[
      { label: 'Image', form: <Seg value={img} onChange={setImg} options={[['lock', 'Padlock'], ['text', 'Text']]} /> },
      { label: 'New key', form: <Go onClick={() => setKey(rnd(0, 0xffff))}>Randomize</Go> },
    ]} />
  );
}

const HASH_CODE = ['bytes ← UTF-8(input)', 'digest ← SHA-256(bytes)   // 256 bits', 'one-way and collision resistant', 'count output bits that differ; one input bit flips about half of them'];
export function HashVis() {
  const pair = useShaPair();
  const frames = useMemo<Frame[]>(() => [
    { line: 0, status: <>SHA-256 hashes the UTF-8 bytes, not the characters on screen. {pair.flip !== null ? 'B is A with exactly one of those bits flipped.' : 'B is a second text.'}</>, stage: <HashReadout pair={pair} step={0} /> },
    { line: 1, status: pair.dig === 'na' ? <>SHA-256 is unavailable in this browser.</> : pair.dig ? <>These are the real SHA-256 digests of those bytes.</> : <>Computing SHA-256…</>, stage: <HashReadout pair={pair} step={1} /> },
    { line: 3, status: pair.dig && pair.dig !== 'na'
      ? (pair.flip !== null
        ? <>One input bit changed. Orange squares are the output bits that flipped. Expect about 128 of 256.</>
        : pair.a === pair.b
          ? <>The inputs are identical, so every output bit matches. Hashing is deterministic.</>
          : <>The inputs differ. Orange squares are the output bits that flipped. Expect about 128 of 256.</>)
      : <>The bit count appears once both digests are ready.</>, stage: <HashReadout pair={pair} step={2} /> },
  ], [pair.a, pair.b, pair.flip, pair.dig, pair.aBytes, pair.bBytes]);
  return (
    <VisPage topicId="hash" code={HASH_CODE} frames={frames} trace={pair.trace} actions={[
      { label: 'Inputs', form: <HashInputs pair={pair} /> },
    ]} />
  );
}

// ---------- RSA ----------
const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const rpow = (b: number, e: number, m: number) => Number(bigPow(BigInt(b), BigInt(e), BigInt(m)));
const RSA_CODE = ['KeyGen: pick primes p ≠ q', '  n ← p·q;   φ ← (p−1)(q−1)', '  pick e with gcd(e, φ) = 1;   d ← e⁻¹ mod φ', 'Encrypt(m):  c ← m^e mod n', 'Decrypt(c):  m ← c^d mod n', 'Sign(m):     s ← m^d mod n', 'Verify(m′, s): accept iff s^e mod n = m′'];
export function RsaVis() {
  const [cfg, setCfg] = useState({ p: 61, q: 53, e: 17, m: 65, t: 65 });
  const [d0, setD0] = useState(cfg);
  const frames = useMemo<Frame[]>(() => {
    let { p, q, e } = cfg;
    if (p === q) q = PRIMES.find(x => x !== p)!;
    const n = p * q, phi = (p - 1) * (q - 1);
    if (gcd(e, phi) !== 1 || e >= phi) e = [3, 5, 7, 11, 13, 17, 19, 23].find(x => gcd(x, phi) === 1 && x < phi)!;
    const d = minv(e, phi), m = mod(cfg.m, n), t = mod(cfg.t, n), c = rpow(m, e, n), m2 = rpow(c, d, n), s = rpow(m, d, n), v = rpow(s, e, n);
    const view = (k: number) => (
      <div className="st-row">
        <Party who="alice" title="Alice (key owner)">
          <Kv k="p, q" who="a">{p}, {q}</Kv>
          {k >= 1 && <><Kv k="n = p·q"><Hl on={k === 1}>{n}</Hl></Kv><Kv k="φ(n)" who="a"><Hl on={k === 1}>{phi}</Hl></Kv></>}
          {k >= 2 && <><Kv k="public e"><Hl on={k === 2}>{e}</Hl></Kv><Kv k="private d" who="a"><Hl on={k === 2}>{d}</Hl></Kv></>}
          {k >= 4 && <Kv k={`c^d mod n`} who="a"><Hl on={k === 4}>{m2} {m2 === m ? '✓' : ''}</Hl></Kv>}
          {k >= 5 && <Kv k="signature s = m^d" who="a"><Hl on={k === 5}>{s}</Hl></Kv>}
        </Party>
        <Wire>
          {k >= 2 && <SMsg dir="public key">(n = {n}, e = {e})</SMsg>}
          {k >= 3 && <SMsg dir="Bob → Alice" fresh={k === 3}>c = {c}</SMsg>}
          {k >= 5 && <SMsg dir="Alice → anyone" fresh={k === 5}>message {t}{t !== m ? ' (tampered!)' : ''}, s = {s}</SMsg>}
        </Wire>
        <Party who="bob" title="Bob (anyone)">
          <Kv k="message m">{m}</Kv>
          {k >= 3 && <Kv k={`c = m^${e} mod ${n}`}><Hl on={k === 3}>{c}</Hl></Kv>}
          {k >= 6 && <><Kv k={`s^${e} mod ${n}`}><Hl on={k === 6}>{v}</Hl></Kv><div className={v === t ? 'ok' : 'bad'}>{v === t ? '✓ signature valid' : '✗ invalid: the message was altered'}</div></>}
        </Party>
      </div>
    );
    return [
      { stage: view(0), status: <>Alice chooses two primes, p = {p} and q = {q}.</>, line: 0 },
      { stage: view(1), status: <>n = {n} is public; φ(n) = {phi} stays secret.</>, line: 1 },
      { stage: view(2), status: <>e = {e} is public; d = {d} satisfies e·d = {e * d} ≡ 1 (mod {phi}).</>, line: 2 },
      { stage: view(3), status: <>Bob encrypts m = {m} with the public key: c = {c}.</>, line: 3 },
      { stage: view(4), status: <>Only Alice, holding d, decrypts: {m2}.</>, line: 4 },
      { stage: view(5), status: <>Signing runs the maths the other way: s = m^d = {s}.</>, line: 5 },
      { stage: view(6), status: v === t ? <>Anyone verifies with (n, e): s^e = {v} matches the message.</> : <>The received message {t} doesn't match s^e = {v}: tampering detected.</>, line: 6 },
    ];
  }, [cfg]);
  const sel = (k: 'p' | 'q') => <select value={d0[k]} onChange={e => setD0({ ...d0, [k]: +e.target.value })}>{PRIMES.map(x => <option key={x} value={x}>{x}</option>)}</select>;
  return (
    <VisPage topicId="rsa" code={RSA_CODE} frames={frames} actions={[
      { label: 'Primes and e', form: <>p {sel('p')} q {sel('q')} e <input type="number" value={d0.e} onChange={e => setD0({ ...d0, e: +e.target.value })} /><Go onClick={() => setCfg(d0)} /></> },
      { label: 'Message m', form: <><input type="number" value={d0.m} onChange={e => setD0({ ...d0, m: +e.target.value, t: +e.target.value })} /><Go onClick={() => setCfg(d0)} /></> },
      { label: 'Tamper signed message', form: <>received <input type="number" value={d0.t} onChange={e => setD0({ ...d0, t: +e.target.value })} /><Go onClick={() => setCfg(d0)} /></> },
    ]} />
  );
}

// ---------- elliptic curves ----------
const ECC_ADD = ['Add(P, Q) on y² = x³ + 2x + 3 over F_97:', '  λ ← (y_Q − y_P)/(x_Q − x_P)   (tangent slope if P = Q)', '  draw the line through P and Q', '  it meets the curve again at −R', '  reflect over the x-axis: R = P + Q'];
const ECC_MUL = ['Mul(k, P):', '  T ← O', '  repeat k times: T ← T + P', '  return T   // fast versions use double-and-add', 'recovering k from kP is the discrete-log problem'];
export function EccVis() {
  const [mode, setMode] = useState<'add' | 'mul'>('add');
  const [P, setP] = useState<[number, number]>(GEN), [Q, setQ] = useState<[number, number]>(POINTS[Math.floor(POINTS.length / 2)]);
  const [next, setNext] = useState<'P' | 'Q'>('Q');
  const [k, kD, setKD, commitK] = useDraft(7);
  const S = 300 / EP, X = (x: number) => 25 + x * S, Y = (y: number) => 315 - y * S;
  const pick = (t: [number, number]) => { if (mode === 'mul' || next === 'P') { setP(t); setNext('Q'); } else { setQ(t); setNext('P'); } };
  const frames = useMemo<Frame[]>(() => {
    const mark = (t: Pt, col: string, r: number, lab: string) => t && <g><circle cx={X(t[0])} cy={Y(t[1])} r={r} fill={col} /><text x={X(t[0]) + 8} y={Y(t[1]) - 8} className="ec-lab" fill={col}>{lab}</text></g>;
    const plot = (extra: JSX.Element | null, marks: JSX.Element) => (
      <svg viewBox="0 0 340 340" style={{ width: '100%', maxWidth: 460, margin: '0 auto', display: 'block' }}>
        <rect x={25} y={15} width={300} height={300} fill="#fff" rx={8} />
        {extra}
        {POINTS.map(t => <circle key={t.join()} className="ec-pt" cx={X(t[0])} cy={Y(t[1])} r={3.6} onClick={() => pick(t)} />)}
        {marks}
      </svg>
    );
    if (mode === 'add') {
      const R = add(P, Q), negR: Pt = R && [R[0], mod(-R[1], EP)], vertical = P[0] === Q[0] && mod(P[1] + Q[1], EP) === 0;
      const l = vertical ? 0 : slope(P, Q);
      const line = vertical ? null : <>{Array.from({ length: EP }, (_, x) => <circle key={x} cx={X(x)} cy={Y(mod(l * (x - P[0]) + P[1], EP))} r={1.5} fill="var(--vis-progress)" opacity={0.6} />)}</>;
      return [
        { stage: plot(null, <>{mark(P, 'var(--alice-main)', 7, 'P')}{mark(Q, 'var(--bob-main)', 7, 'Q')}</>), status: <>P = ({P.join(',')}), Q = ({Q.join(',')}). Click points on the curve to change them.</>, line: 0 },
        { stage: plot(null, <>{mark(P, 'var(--alice-main)', 7, 'P')}{mark(Q, 'var(--bob-main)', 7, 'Q')}</>), status: vertical ? <>P and Q are mirror images: the line is vertical.</> : <>Slope λ = {l}{P[0] === Q[0] ? ' (tangent, since P = Q)' : ''}.</>, line: 1 },
        { stage: plot(line, <>{mark(P, 'var(--alice-main)', 7, 'P')}{mark(Q, 'var(--bob-main)', 7, 'Q')}</>), status: <>Over a finite field the "line" y = λ(x − x<sub>P</sub>) + y<sub>P</sub> wraps around (orange dots).</>, line: 2 },
        { stage: plot(line, <>{mark(P, 'var(--alice-main)', 7, 'P')}{mark(Q, 'var(--bob-main)', 7, 'Q')}{mark(negR, 'var(--disabled)', 6, '−R')}</>), status: negR ? <>It hits the curve once more at ({negR.join(',')}).</> : <>It never meets the curve again: the sum is the point at infinity O.</>, line: 3 },
        { stage: plot(line, <>{mark(P, 'var(--alice-main)', 7, 'P')}{mark(Q, 'var(--bob-main)', 7, 'Q')}{mark(negR, 'var(--disabled)', 6, '−R')}{mark(R, 'var(--ok)', 8, 'P+Q')}</>), status: R ? <>Reflect: P + Q = ({R.join(',')}).</> : <>P + Q = O.</>, line: 4 },
      ];
    }
    const path: Pt[] = []; let T: Pt = null; for (let i = 1; i <= k; i++) { T = add(T, P); path.push(T); }
    const ord = orderOf(P);
    return path.map((cur, i) => {
      const seq = path.slice(0, i + 1).filter((x): x is [number, number] => !!x);
      return {
        stage: plot(<polyline points={seq.map(t => `${X(t[0])},${Y(t[1])}`).join(' ')} fill="none" stroke="var(--vis-progress)" strokeWidth={1.4} opacity={0.7} />, <>{mark(P, 'var(--alice-main)', 7, 'P')}{mark(cur, 'var(--ok)', 8, `${i + 1}P`)}</>),
        status: <>{i + 1}·P = {cur ? `(${cur.join(',')})` : 'O'}. {i === path.length - 1 ? `P has order ${ord}; the walk looks random, which is why recovering k is hard.` : ''}</>,
        line: i === path.length - 1 ? [3, 4] : 2,
      };
    });
  }, [mode, P, Q, k]);
  return (
    <VisPage topicId="ecc" code={mode === 'add' ? ECC_ADD : ECC_MUL} frames={frames} actions={[
      { label: 'Operation', form: <Seg value={mode} onChange={setMode} options={[['add', 'P + Q'], ['mul', 'k · P']]} /> },
      { label: 'Scalar k', form: <><input type="number" min={1} max={60} value={kD} onChange={e => setKD(+e.target.value)} /><Go onClick={commitK} /></> },
      { label: 'Reset points', form: <Go onClick={() => { setP(GEN); setQ(POINTS[Math.floor(POINTS.length / 2)]); }}>Reset</Go> },
    ]} />
  );
}

