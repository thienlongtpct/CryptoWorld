import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { G, H2G, P, Q, bytesHex, decStr, enc, fmtBytes, h32, hex, minv, mod, mpow, okvsDecode, okvsEncode, okvsRow, rnd, shuffled, type Okvs } from '../lib/crypto';
import { Kv, Lab, LogBars, Msg, Pv, S, Seg, Steps, useNonce } from '../components/ui';

// ---------- 1-out-of-2 OT (Chou–Orlandi style) ----------
export function ObliviousTransfer() {
  const [m0, setM0] = useState('LEFT door'), [m1, setM1] = useState('RIGHT door');
  const [c, setC] = useState(0), [step, setStep] = useState(3);
  const [nonce, bump] = useNonce();
  const [a, b] = useMemo(() => [rnd(2, Q - 1), rnd(2, Q - 1)], [nonce]);
  const A = mpow(G, a, P), gb = mpow(G, b, P), B = c ? (A * gb) % P : gb;
  const k0 = 'k' + mpow(B, a, P), k1 = 'k' + mpow((B * minv(A, P)) % P, a, P), kc = 'k' + mpow(A, b, P);
  const e0 = enc(m0, k0), e1 = enc(m1, k1), ec = c ? e1 : e0, eo = c ? e0 : e1;
  return (
    <Lab title="DH-based 1-out-of-2 OT, p = 1019" toy secret>
      <div className="controls">
        <label>m₀ <input type="text" value={m0} onChange={e => setM0(e.target.value)} style={{ width: '9em' }} /></label>
        <label>m₁ <input type="text" value={m1} onChange={e => setM1(e.target.value)} style={{ width: '9em' }} /></label>
        <span>Bob's choice c</span><Seg value={c} onChange={setC} options={[[0, '0'], [1, '1']]} />
        <button className="btn ghost" onClick={bump}>New randomness</button>
      </div>
      <Steps names={['Alice sends A', 'Bob sends B', 'Alice encrypts both', 'Bob decrypts one']} cur={step} onChange={setStep} />
      <div className="parties three">
        <Pv who="alice" title="Alice (sender)">
          <Kv k="m₀" who="a">{m0}</Kv><Kv k="m₁" who="a">{m1}</Kv><Kv k="secret a" who="a">{a}</Kv>
          {step >= 2 && <><Kv k="k₀ = H(Bᵃ)" who="a">{hex(h32(k0))}</Kv><Kv k="k₁ = H((B/A)ᵃ)" who="a">{hex(h32(k1))}</Kv></>}
          {step >= 3 && <div className="note">Alice saw only B, which is uniformly random whatever c is. She has no idea which message Bob opened.</div>}
        </Pv>
        <Pv who="wire" title="Wire">
          <Msg dir="Alice → Bob">A = gᵃ = <span className="val">{A}</span></Msg>
          {step >= 1 && <Msg dir="Bob → Alice">B = <span className="val">{B}</span><span className="note">uniform in the group either way</span></Msg>}
          {step >= 2 && <Msg dir="Alice → Bob">e₀ = <span className="val">{bytesHex(e0)}</span>e₁ = <span className="val">{bytesHex(e1)}</span></Msg>}
        </Pv>
        <Pv who="bob" title="Bob (receiver)">
          <Kv k="choice c" who="b">{c}</Kv>
          {step >= 1 && <><Kv k="secret b" who="b">{b}</Kv><div className="note">B = {c ? 'A·gᵇ' : 'gᵇ'}</div></>}
          {step >= 3 && <>
            <Kv k={<>k<sub>c</sub> = H(Aᵇ)</>} who="b">{hex(h32(kc))}</Kv>
            <Msg dir={<>decrypt e<sub>{c}</sub></>}><span className="val ok">"{decStr(ec, kc)}"</span></Msg>
            <Msg dir={<>try e<sub>{1 - c}</sub> with the same key</>}><span className="val bad">"{decStr(eo, kc)}"</span></Msg>
          </>}
        </Pv>
      </div>
    </Lab>
  );
}

// ---------- IKNP OT extension ----------
const K = 6, M = 10;
const bitsRandom = (n: number) => Array.from({ length: n }, () => rnd(0, 1));
function Bit({ v, cls = '', onClick, title }: { v: number; cls?: string; onClick?: () => void; title?: string }) {
  return <span className={`bit ${v ? 'one' : ''} ${cls}`} onClick={onClick} title={title} style={onClick ? { cursor: 'pointer' } : undefined}>{v}</span>;
}
const HeadBit = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) =>
  <span className="bit" style={{ background: 'none', cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>{children}</span>;

export function Iknp() {
  const [T, setT] = useState(() => Array.from({ length: M }, () => bitsRandom(K)));
  const [r, setR] = useState(() => bitsRandom(M));
  const [s, setS] = useState(() => bitsRandom(K));
  const [mode, setMode] = useState<'col' | 'row'>('col');
  const [selC, setSelC] = useState(0), [selR, setSelR] = useState(0);
  const Qm = T.map((row, i) => row.map((t, j) => t ^ (r[i] & s[j])));
  const hl = (i: number, j: number) => (mode === 'col' ? (j === selC ? 'colhl' : '') : (i === selR ? 'rowhl' : ''));
  const pickCell = (i: number, j: number) => (mode === 'row' ? setSelR(i) : setSelC(j));
  const qi = Qm[selR], ti = T[selR], qs = qi.map((v, k) => v ^ s[k]);
  const Hrow = (a: number[]) => hex(h32('ot' + a.join('')), 4);
  return (
    <Lab title={`κ = ${K} base OTs → m = ${M} extended OTs`} secret>
      <div className="controls">
        <span>Click bits of Bob's choice vector r or Alice's s.</span>
        <button className="btn ghost" onClick={() => setT(Array.from({ length: M }, () => bitsRandom(K)))}>New T</button>
        <Seg value={mode} onChange={setMode} options={[['col', 'Read columns'], ['row', 'Read rows']]} />
      </div>
      <div className="parties three">
        <Pv who="bob" title="Bob: matrix T and choices r">
          <div className="scroll-x"><div className="bits sb">
            <div className="bitrow"><HeadBit>r</HeadBit><span style={{ width: 6 }} />{Array.from({ length: K }, (_, j) => <HeadBit key={j} onClick={() => setSelC(j)}>{j}</HeadBit>)}</div>
            {T.map((row, i) => (
              <div key={i} className="bitrow">
                <Bit v={r[i]} title={`toggle r${i}`} onClick={() => { setR(x => x.map((v, k) => (k === i ? v ^ 1 : v))); setSelR(i); }} />
                <span style={{ width: 6 }} />
                {row.map((v, j) => <Bit key={j} v={v} cls={hl(i, j)} onClick={() => pickCell(i, j)} />)}
              </div>
            ))}
          </div></div>
        </Pv>
        <Pv who="wire" title="Base OTs on columns">
          <div className="note">
            {mode === 'col'
              ? <><b>Base OT #{selC}</b> (Bob sends, Alice receives).<br />Bob offers t<sup>{selC}</sup> or t<sup>{selC}</sup> ⊕ r. Alice's choice s<sub>{selC}</sub> = <S a className="val">{s[selC]}</S>, so she gets {s[selC] ? 't ⊕ r' : 't'}.<br /><br />Only κ = {K} public-key OTs ever run, no matter how many rows.</>
              : <><b>Row view.</b> Each row i is now an OT: Alice holds q<sub>i</sub>, Bob holds t<sub>i</sub>, and q<sub>i</sub> = t<sub>i</sub> ⊕ r<sub>i</sub>·s.<br /><br />Toggle r bits on the left to see rows flip by exactly s.</>}
          </div>
        </Pv>
        <Pv who="alice" title="Alice: s and received Q">
          <div className="scroll-x"><div className="bits sa">
            <div className="bitrow"><HeadBit>s</HeadBit><span style={{ width: 6 }} />{s.map((v, j) => <Bit key={j} v={v} title={`toggle s${j}`} onClick={() => { setS(x => x.map((w, k) => (k === j ? w ^ 1 : w))); setSelC(j); }} />)}</div>
            {Qm.map((row, i) => (
              <div key={i} className="bitrow"><HeadBit>{i}</HeadBit><span style={{ width: 6 }} />{row.map((v, j) => <Bit key={j} v={v} cls={hl(i, j)} onClick={() => pickCell(i, j)} />)}</div>
            ))}
          </div></div>
        </Pv>
      </div>
      <Pv who="wire" title={`Extended OT for row ${selR} (click any row in Read rows mode)`}>
        <Kv k={`q${selR} (Alice)`} who="a">{qi.join('')}</Kv>
        <Kv k={`t${selR} (Bob)`} who="b">{ti.join('')}</Kv>
        <Kv k={`r${selR}`} who="b">{r[selR]}</Kv>
        <Kv k="Alice's two OT pads" who="a">x₀ = H(q) = {Hrow(qi)}, x₁ = H(q ⊕ s) = {Hrow(qs)}</Kv>
        <Kv k="Bob's pad H(t)" who="b">{Hrow(ti)} = x<sub>{r[selR]}</sub> <span className="ok">✓</span></Kv>
        <div className="note">All {M} rows satisfy the relation: <span className="ok">✓</span>. Bob can't compute the other pad without s.</div>
      </Pv>
    </Lab>
  );
}

// ---------- PCG / silent OT communication ----------
export function Pcg() {
  const [e, setE] = useState(20);
  const m = 2 ** e;
  return (
    <Lab title="Communication to produce m random OTs">
      <div className="controls"><label>m = <input type="range" min={10} max={27} value={e} onChange={x => setE(+x.target.value)} /><span className="val">2^{e} = {m.toLocaleString()}</span></label></div>
      <LogBars fmt={fmtBytes} rows={[['Public-key OT each', 64 * m, 'var(--c6)'], ['IKNP extension', 128 * 64 + 16 * m, 'var(--c3)'], ['Silent OT (PCG)', 128 * 64 + 2048 * e, 'var(--c2)']]} />
      <p className="note">Model: base OTs ≈ 64 B each (one curve point per side); IKNP ≈ 16 B per OT plus 128 base OTs; silent ≈ seed size growing like κ·log m (tens of KB). Order of magnitude only.</p>
    </Lab>
  );
}

// ---------- OPRF by blind exponentiation ----------
type OprfRun = [r: number, a: number, b: number, out: number];
export function Oprf() {
  const [x, setX] = useState('alice@example.com'), [k, setK] = useState(77);
  const run = (): OprfRun => { const hx = H2G(x), r = rnd(2, Q - 1), a = mpow(hx, r, P), b = mpow(a, k, P); return [r, a, b, mpow(b, minv(r, Q), P)]; };
  const [hist, setHist] = useState<OprfRun[]>([]);
  // Changing x or k starts a fresh history of three runs.
  useEffect(() => { setHist([run(), run(), run()]); }, [x, k]);
  const cur = hist[0];
  if (!cur) return null;
  const hx = H2G(x);
  return (
    <Lab title="Blind exponentiation in squares mod 1019" toy secret>
      <div className="controls">
        <label>Alice's input x <input type="text" value={x} onChange={e => setX(e.target.value)} style={{ width: '13em' }} /></label>
        <label>Bob's key k <input type="range" min={2} max={508} value={k} onChange={e => setK(+e.target.value)} /></label>
        <button className="btn" onClick={() => setHist(h => [run(), ...h].slice(0, 6))}>Run again (new blind r)</button>
      </div>
      <div className="parties three">
        <Pv who="alice" title="Alice (client)">
          <Kv k="x" who="a">{x}</Kv><Kv k="H(x)" who="a">{hx}</Kv><Kv k="blind r" who="a">{cur[0]}</Kv><Kv k="unblind b^(1/r)" who="a">{cur[3]}</Kv>
          <div className="note">{cur[3] === mpow(hx, k, P) && <span className="ok">✓ equals H(x)ᵏ</span>}</div>
        </Pv>
        <Pv who="wire" title="Wire">
          <Msg dir="Alice → Bob">a = H(x)ʳ = <span className="val">{cur[1]}</span></Msg>
          <Msg dir="Bob → Alice">b = aᵏ = <span className="val">{cur[2]}</span></Msg>
        </Pv>
        <Pv who="bob" title="Bob (server)">
          <Kv k="key k" who="b">{k}</Kv>
          <div className="note">Bob sees only a, a random-looking group element. A fresh r makes every query unlinkable, even repeats of the same x.</div>
        </Pv>
      </div>
      <Pv who="wire" title="Transcript history">
        <p className="note">Same x, same k, every run: the messages change, the output doesn't.</p>
        <div className="scroll-x"><table className="tbl">
          <thead><tr><th>run</th><th>r (Alice)</th><th>a (wire)</th><th>b (wire)</th><th>F_k(x)</th></tr></thead>
          <tbody>{hist.map((h, i) => <tr key={hist.length - i}><td>{hist.length - i}</td><td className="num"><S a>{h[0]}</S></td><td className="num">{h[1]}</td><td className="num">{h[2]}</td><td className="num"><S a>{h[3]}</S></td></tr>)}</tbody>
        </table></div>
      </Pv>
    </Lab>
  );
}

// ---------- OKVS ----------
const SAMPLE: [string, number][] = [['alice', 12], ['bob', 71], ['carol', 5], ['erin', 90]];
const encodePairs = (pairs: [string, number][]) => okvsEncode(pairs, Math.max(5, pairs.length + 3), 97, rnd(1, 9999))!;
export function OkvsDemo() {
  const p = 97;
  const [pairs, setPairs] = useState<[string, number][]>(SAMPLE);
  const [enc0, setEnc] = useState<Okvs>(() => encodePairs(SAMPLE));
  const [k, setK] = useState('dave'), [v, setV] = useState(44), [q, setQ] = useState('alice');
  const update = (np: [string, number][]) => { setPairs(np); setEnc(encodePairs(np)); };
  const qk = q.trim(), row = okvsRow(qk, enc0.P.length, p, enc0.seed), on = new Map(row);
  const val = okvsDecode(enc0.P, qk, p, enc0.seed), hit = pairs.find(([kk]) => kk === qk);
  return (
    <Lab title="3-sparse random-row OKVS over 𝔽₉₇" toy>
      <div className="controls">
        <label>key <input type="text" value={k} onChange={e => setK(e.target.value)} style={{ width: '7em' }} /></label>
        <label>value <input type="number" min={0} max={96} value={v} onChange={e => setV(+e.target.value)} /></label>
        <button className="btn" onClick={() => {
          const kk = k.trim(); if (!kk) return;
          const vv = mod(v || 0, p), i = pairs.findIndex(([x]) => x === kk);
          if (i >= 0) update(pairs.map((x, j) => (j === i ? [kk, vv] : x)));
          else if (pairs.length < 10) update([...pairs, [kk, vv]]);
          setQ(kk);
        }}>Insert</button>
        <button className="btn ghost" onClick={() => update(SAMPLE)}>Reset sample</button>
        <span className="note">P size: <span className="val">{enc0.P.length} cells for {pairs.length} pairs</span></span>
      </div>
      <div className="grid-cells">{pairs.map(([kk, vv], i) => <button key={kk} className="chip" title="remove" onClick={() => update(pairs.filter((_, j) => j !== i))}>{kk} ↦ {vv} ✕</button>)}</div>
      <div>
        <span className="eyebrow">Encoded vector P (this is all that gets sent)</span>
        <div className="grid-cells" style={{ marginTop: 6 }}>{enc0.P.map((x, i) => <span key={i} className={`cell ${on.has(i) ? 'hl' : ''}`}><span className="ix">{i}</span>{x}</span>)}</div>
      </div>
      <div className="controls"><label>Decode any key <input type="text" value={q} onChange={e => setQ(e.target.value)} style={{ width: '9em' }} /></label></div>
      <Pv who="wire" title={`Decode(P, "${qk}")`}>
        <div className="mono">{row.map(([i, c]) => `${c}·P[${i}]`).join(' + ')} = {row.map(([i, c]) => `${c}·${enc0.P[i]}`).join(' + ')} ≡ <span className="val">{val}</span> (mod 97)</div>
        <div>{hit ? <span className="ok">✓ "{qk}" was inserted with value {hit[1]}</span> : <span className="muted">"{qk}" was never inserted: the result is just a random-looking field element. Nothing in P marks the difference.</span>}</div>
        <div className="note">Try the inserted keys, then any other word. Click a pair chip to remove it.</div>
      </Pv>
    </Lab>
  );
}

// ---------- VOLE ----------
export function Vole() {
  const p = 97, n = 8;
  const [D, setD] = useState(13), [g, setG] = useState(50);
  const [nonce, bump] = useNonce();
  const [A, C] = useMemo(() => [Array.from({ length: n }, () => rnd(1, p - 1)), Array.from({ length: n }, () => rnd(0, p - 1))], [nonce]);
  const B = A.map((a, i) => mod(C[i] + a * D, p));
  const S_ = 280 / 97, X = (x: number) => 30 + x * S_, Y = (y: number) => 300 - y * S_;
  const g2 = mod(g || 0, p), Bf = A.map((a, i) => mod(C[i] + a * g2, p));
  return (
    <Lab title="VOLE of length 8 over 𝔽₉₇" toy secret>
      <div className="controls">
        <label>Bob's Δ <input type="range" min={1} max={96} value={D} onChange={e => setD(+e.target.value)} /><S b className="val">{D}</S></label>
        <button className="btn" onClick={bump}>Regenerate vectors</button>
        <label>Alice guesses Δ <input type="number" min={0} max={96} value={g} onChange={e => setG(+e.target.value)} /></label>
      </div>
      <div className="parties">
        <div className="scroll-x">
          <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: 360, height: 'auto' }}>
            <rect x={30} y={20} width={280} height={280} fill="none" stroke="var(--line)" />
            {Array.from({ length: p }, (_, x) => <circle key={x} cx={X(x)} cy={Y(mod(D * x, p))} r={1.3} fill="var(--muted)" opacity={0.5} />)}
            {A.map((a, i) => <circle key={'p' + i} className="sb" cx={X(a)} cy={Y(mod(B[i] - C[i], p))} r={5} fill="var(--accent)" />)}
            <text x={170} y={316} fontSize={10} textAnchor="middle" fill="var(--muted)">Aᵢ (Alice)</text>
            <text x={12} y={160} fontSize={10} textAnchor="middle" fill="var(--muted)" transform="rotate(-90 12 160)">Bᵢ − Cᵢ</text>
            <text x={36} y={34} fontSize={10} fill="var(--muted)">grey dots: y = Δ·x mod 97</text>
          </svg>
        </div>
        <div className="scroll-x"><table className="tbl">
          <thead><tr><th>i</th><th className="a">Aᵢ</th><th className="a">Cᵢ</th><th className="b">Bᵢ</th><th>Bᵢ = Cᵢ + Aᵢ·Δ ?</th></tr></thead>
          <tbody>{A.map((a, i) => <tr key={i}><td>{i}</td><td className="num"><S a>{a}</S></td><td className="num"><S a>{C[i]}</S></td><td className="num"><S b>{B[i]}</S></td><td><span className="ok">✓</span> <S a b className="note">{C[i]} + {a}·{D} ≡ {B[i]}</S></td></tr>)}</tbody>
        </table></div>
      </div>
      <Pv who="wire" title="Can Alice learn Δ?">
        <div>If Δ were <span className="val">{g2}</span>, Bob's vector would be B′ = ({Bf.join(', ')}).</div>
        <div>Alice never sees B, and every Δ′ gives some consistent B′, so all 97 values of Δ remain possible. Bob, for his part, sees B alone, which is uniform because C is uniform. {g2 === D && <S a>(Your guess happens to be right, but Alice could never confirm it.)</S>}</div>
      </Pv>
    </Lab>
  );
}

// ---------- OPPRF = OPRF + OKVS hint ----------
export function Opprf() {
  const p = 97, k = 191;
  const F = (x: string) => mpow(H2G(x), k, P) % p;
  const [pts, setPts] = useState<[string, number][]>([['bus', 7], ['car', 33], ['tram', 60]]);
  const hint = useMemo(() => okvsEncode(pts.map(([x, y]) => [x, mod(y - F(x), p)]), 6, p, rnd(1, 9999))!, [pts]);
  const [q, setQ] = useState('bus');
  const qq = q.trim(), fq = F(qq), d = okvsDecode(hint.P, qq, p, hint.seed), out = mod(fq + d, p), hit = pts.find(([x]) => x === qq);
  return (
    <Lab title="OPRF + OKVS hint over 𝔽₉₇" toy secret>
      <div className="parties three">
        <Pv who="bob" title="Bob's programmed points">
          {pts.map(([x, y], i) => (
            <label key={x} className="kv"><span>{x} ↦</span><input type="number" min={0} max={96} className="sb" value={y}
              onChange={e => setPts(ps => ps.map((pp, j) => (j === i ? [pp[0], mod(+e.target.value || 0, p)] : pp)))} /></label>
          ))}
          <div className="note">Bob also holds OPRF key k.</div>
        </Pv>
        <Pv who="wire" title="Public hint H"><div className="grid-cells">{hint.P.map((v, i) => <span key={i} className="cell"><span className="ix">{i}</span>{v}</span>)}</div></Pv>
        <Pv who="alice" title="Alice">
          <label className="kv"><span>query q</span><input type="text" value={q} onChange={e => setQ(e.target.value)} style={{ width: '7em' }} /></label>
          <Kv k="F_k(q) via OPRF" who="a">{fq}</Kv><Kv k="Decode(H, q)" who="a">{d}</Kv><Kv k="output" who="a">{out}</Kv>
          <div className="note">{hit ? <span className="ok">q is programmed: output = {hit[1]}</span> : 'q is not programmed: output is pseudorandom.'} Alice can't tell which case applies.</div>
        </Pv>
      </div>
    </Lab>
  );
}

// ---------- one garbled gate ----------
type Gate = 'AND' | 'OR' | 'XOR';
const GATE: Record<Gate, (x: number, y: number) => number> = { AND: (x, y) => x & y, OR: (x, y) => x | y, XOR: (x, y) => x ^ y };
const pads = (la: number, lb: number) => [h32('p1' + la + '|' + lb) & 0xffffff, h32('p2' + la + '|' + lb)];
const newLabels = () => ({ A: [rnd(0, 0xffffff), rnd(0, 0xffffff)], B: [rnd(0, 0xffffff), rnd(0, 0xffffff)], C: [rnd(0, 0xffffff), rnd(0, 0xffffff)] });
export function GarbledGate() {
  const [gate, setGate] = useState<Gate>('AND'), [a, setA] = useState(1), [b, setB] = useState(0);
  const [L, setL] = useState(newLabels), [order, setOrder] = useState(() => shuffled([0, 1, 2, 3]));
  const io: [number, number][] = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const rows = io.map(([x, y]) => { const [p1, p2] = pads(L.A[x], L.B[y]); return { c1: (L.C[GATE[gate](x, y)] ^ p1) & 0xffffff, c2: (0 ^ p2) >>> 0 }; });
  const la = L.A[a], lb = L.B[b], [p1, p2] = pads(la, lb);
  let opened = -1;
  const tried = order.map(i => { const r = rows[i], tag = (r.c2 ^ p2) >>> 0, lab = (r.c1 ^ p1) & 0xffffff; if (tag === 0) opened = lab; return { r, ok: tag === 0, lab }; });
  return (
    <Lab title="One garbled gate" toy secret>
      <div className="controls">
        <Seg value={gate} onChange={setGate} options={[['AND', 'AND'], ['OR', 'OR'], ['XOR', 'XOR']]} />
        <span>Alice's bit a</span><Seg value={a} onChange={setA} options={[[0, '0'], [1, '1']]} />
        <span>Bob's bit b</span><Seg value={b} onChange={setB} options={[[0, '0'], [1, '1']]} />
        <button className="btn ghost" onClick={() => { setL(newLabels()); setOrder(shuffled([0, 1, 2, 3])); }}>New labels</button>
      </div>
      <div className="parties">
        <Pv who="alice" title="Alice's wire labels">
          {(['A', 'B', 'C'] as const).map(w => <Kv key={w} k={`wire ${w}`} who="a">{w}⁰={hex(L[w][0])} · {w}¹={hex(L[w][1])}</Kv>)}
          <Kv k="Alice's bit a" who="a">{a}</Kv>
          <div className="note">Alice sends label A<sup>a</sup> directly. Bob gets B<sup>b</sup> through an OT, so Alice never learns b.</div>
          <div className="note">Truth table of {gate}: {io.map(([x, y]) => `${x}${y}→${GATE[gate](x, y)}`).join(', ')}</div>
        </Pv>
        <Pv who="bob" title="Bob evaluates the shuffled table">
          <Kv k={<>holds A<sup>a</sup></>}>{hex(la)}</Kv><Kv k={<>holds B<sup>b</sup> (via OT)</>}>{hex(lb)}</Kv><Kv k="Bob's bit b" who="b">{b}</Kv>
          <table className="tbl"><thead><tr><th>garbled row (shuffled)</th><th>try decrypt</th></tr></thead>
            <tbody>{tried.map((t, i) => <tr key={i}><td className="num">{hex(t.r.c1)}·{hex(t.r.c2, 8)}</td><td>{t.ok ? <span className="ok">✓ opens → {hex(t.lab)}</span> : <span className="muted">⊥ tag check fails</span>}</td></tr>)}</tbody>
          </table>
          <div>Output label {hex(opened)} → decoding table says <span className="val">{L.C.indexOf(opened)}</span> = {a} {gate} {b} <span className="ok">✓</span></div>
        </Pv>
      </div>
    </Lab>
  );
}

// ---------- cuckoo hashing ----------
const CM = 10, MAXLOOP = 12;
const WORDS = ['fig', 'lime', 'pear', 'plum', 'date', 'kiwi', 'yuzu', 'sloe', 'quince', 'guava', 'mango', 'apple', 'cherry', 'olive', 'melon', 'grape', 'lemon', 'peach'];
const hs = (x: string): [number, number] => { const a = h32('h1' + x) % CM; let b = h32('h2' + x) % CM; if (b === a) b = (b + 1) % CM; return [a, b]; };
function cuckooInsert(bins: (string | null)[], stash: string[], x: string) {
  const path: [string, number | null][] = [];
  let cur = x, b = hs(x)[0];
  for (let it = 0; it < MAXLOOP; it++) {
    const [h1, h2] = hs(cur);
    if (bins[h1] === null) b = h1; else if (bins[h2] === null) b = h2;
    if (bins[b] === null) { bins[b] = cur; path.push([`${cur} → bin ${b} (free)`, b]); return path; }
    const ev = bins[b]!; bins[b] = cur; path.push([`${cur} → bin ${b}, evicting ${ev}`, b]);
    const [e1, e2] = hs(ev); b = e1 === b ? e2 : e1; cur = ev;
  }
  stash.push(cur); path.push([`${cur} → stash (too many evictions)`, null]);
  return path;
}
function initialTable() {
  const bins: (string | null)[] = new Array(CM).fill(null), stash: string[] = [];
  ['fig', 'lime', 'pear', 'plum', 'date'].forEach(w => cuckooInsert(bins, stash, w));
  return { bins, stash };
}
export function Cuckoo() {
  const [table, setTable] = useState(initialTable);
  const [x, setX] = useState('kiwi');
  const [anim, setAnim] = useState<{ item: string; path: [string, number | null][]; k: number } | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (anim && anim.k < anim.path.length - 1) timer.current = window.setTimeout(() => setAnim({ ...anim, k: anim.k + 1 }), 450);
  }, [anim]);
  const insert = (w: string) => {
    if (!w || table.bins.includes(w) || table.stash.includes(w)) return;
    const bins = [...table.bins], stash = [...table.stash], path = cuckooInsert(bins, stash, w);
    setTable({ bins, stash }); setAnim({ item: w, path, k: 0 });
  };
  const hi = anim ? anim.path[anim.k][1] : null;
  const filled = table.bins.filter(Boolean).length;
  return (
    <Lab title="10 bins, 2 hash functions, stash">
      <div className="controls">
        <label>item <input type="text" value={x} onChange={e => setX(e.target.value)} style={{ width: '7em' }} /></label>
        <button className="btn" onClick={() => insert(x.trim().toLowerCase())}>Insert</button>
        <button className="btn ghost" onClick={() => { const left = WORDS.filter(w => !table.bins.includes(w) && !table.stash.includes(w)); if (left.length) insert(left[rnd(0, left.length - 1)]); }}>Insert random</button>
        <button className="btn ghost" onClick={() => { setTable({ bins: new Array(CM).fill(null), stash: [] }); setAnim(null); }}>Clear</button>
      </div>
      <div className="grid-cells">
        {table.bins.map((v, i) => (
          <span key={i} className={`cell ${hi === i ? 'hl' : ''}`} style={{ minWidth: '5.4em' }}>
            <span className="ix">bin {i}</span>{v ? <>{v}<span className="ix">{hs(v).join(' | ')}</span></> : <span className="ix">empty</span>}
          </span>
        ))}
        <span className="cell hl2" style={{ minWidth: '6em' }}><span className="ix">stash</span>{table.stash.join(', ') || '—'}</span>
      </div>
      <Pv who="wire">
        {anim ? <>
          <h4>Inserting {anim.item}: candidate bins {hs(anim.item).join(' and ')}</h4>
          {anim.path.slice(0, anim.k + 1).map(([s], i) => <div key={i}>{s}</div>)}
          <div className="note">load {filled}/{CM}{table.stash.length ? `, stash ${table.stash.length}` : ''}</div>
        </> : <div className="note">Five items already placed. Insert more and watch items get kicked to their alternate bin.</div>}
      </Pv>
    </Lab>
  );
}

// ---------- oblivious shuffle (permute + share) ----------
const XS: [string, number][] = [['ana', 12], ['ben', 47], ['cho', 5], ['dev', 88], ['eli', 30]];
export function Shuffle() {
  const p = 97;
  const [pi, setPi] = useState([0, 1, 2, 3, 4]);
  const [nonce, bump] = useNonce();
  const sA = useMemo(() => XS.map(() => rnd(0, p - 1)), [nonce, pi]);
  const swap = (i: number, j: number) => setPi(x => { const y = [...x]; [y[i], y[j]] = [y[j], y[i]]; return y; });
  return (
    <Lab title="Shares over 𝔽₉₇" toy secret>
      <div className="controls"><span>Bob reorders with the arrows.</span><button className="btn ghost" onClick={() => setPi(shuffled)}>Random π</button><button className="btn ghost" onClick={bump}>Fresh shares</button></div>
      <div className="parties three">
        <Pv who="alice" title="Alice's list">{XS.map(([nm, v], i) => <Kv key={nm} k={`x${i} (${nm})`} who="a">{v}</Kv>)}</Pv>
        <Pv who="bob" title="Bob's permutation π">
          {pi.map((src, i) => (
            <div key={i} className="kv">
              <span>slot {i} ← x<S b className="val">{src}</S></span>
              <span><button className="btn ghost" aria-label="move up" disabled={!i} onClick={() => swap(i - 1, i)}>↑</button> <button className="btn ghost" aria-label="move down" disabled={i === pi.length - 1} onClick={() => swap(i, i + 1)}>↓</button></span>
            </div>
          ))}
        </Pv>
        <Pv who="wire" title="Output shares">
          <table className="tbl"><thead><tr><th>slot</th><th className="a">Alice</th><th className="b">Bob</th><th>sum</th></tr></thead>
            <tbody>{pi.map((src, i) => { const v = XS[src][1]; return <tr key={i}><td>{i}</td><td className="num"><S a>{sA[i]}</S></td><td className="num"><S b>{mod(v - sA[i], p)}</S></td><td className="num"><S a b>{v}</S></td></tr>; })}</tbody>
          </table>
          <div className="note">Each share alone is uniform; only together do they give the permuted list.</div>
        </Pv>
      </div>
    </Lab>
  );
}
