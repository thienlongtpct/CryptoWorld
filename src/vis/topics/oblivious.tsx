import { useMemo, useState, type ReactNode } from 'react';
import { G, H2G, P, Q, bytesHex, decStr, enc, h32, hex, minv, mod, mpow, okvsDecode, okvsEncode, okvsRow, rnd } from '../../lib/crypto';
import { Kv, S, Seg } from '../../components/ui';
import { Pcg, Vole } from '../../demos/oblivious';
import { VisPage } from '../Player';
import { Go, Hl, Party, SMsg, Wire, framesFrom, useDraft } from '../kit';

// ---------- 1-out-of-2 OT ----------
const OT_CODE = ['Sender(m0, m1)            Receiver(c)', 'S: a ← random;  A ← g^a', 'S → R: A', 'R: b ← random', 'R: B ← g^b if c = 0,  else A·g^b', 'R → S: B', 'S: k0 ← H(B^a);  k1 ← H((B/A)^a)', 'S: e0 ← Enc(k0, m0);  e1 ← Enc(k1, m1)', 'S → R: e0, e1', 'R: kc ← H(A^b)', 'R: output Dec(kc, e_c)'];
export function OtVis() {
  const [msgs, mD, setMD, commitM] = useDraft<[string, string]>(['LEFT door', 'RIGHT door']);
  const [c, setC] = useState(0), [nonce, setNonce] = useState(0);
  const frames = useMemo(() => {
    const [m0, m1] = msgs, a = rnd(2, Q - 1), b = rnd(2, Q - 1);
    const A = mpow(G, a, P), gb = mpow(G, b, P), B = c ? (A * gb) % P : gb;
    const k0 = 'k' + mpow(B, a, P), k1 = 'k' + mpow((B * minv(A, P)) % P, a, P), kc = 'k' + mpow(A, b, P);
    const e0 = enc(m0, k0), e1 = enc(m1, k1), ec = c ? e1 : e0, eo = c ? e0 : e1;
    const view = (k: number) => (
      <div className="st-row">
        <Party who="alice" title="Alice (sender)">
          <Kv k="m₀" who="a">{m0}</Kv><Kv k="m₁" who="a">{m1}</Kv>
          {k >= 1 && <Kv k="secret a" who="a"><Hl on={k === 1}>{a}</Hl></Kv>}
          {k >= 6 && <><Kv k="k₀ = H(Bᵃ)" who="a"><Hl on={k === 6}>{hex(h32(k0))}</Hl></Kv><Kv k="k₁ = H((B/A)ᵃ)" who="a"><Hl on={k === 6}>{hex(h32(k1))}</Hl></Kv></>}
          {k >= 10 && <div className="note">Alice only ever saw B, which is uniform whatever c is.</div>}
        </Party>
        <Wire>
          {k >= 2 && <SMsg dir="Alice → Bob" fresh={k === 2}>A = gᵃ = {A}</SMsg>}
          {k >= 5 && <SMsg dir="Bob → Alice" fresh={k === 5}>B = {B}</SMsg>}
          {k >= 8 && <SMsg dir="Alice → Bob" fresh={k === 8}>e₀ = {bytesHex(e0)}<br />e₁ = {bytesHex(e1)}</SMsg>}
        </Wire>
        <Party who="bob" title="Bob (receiver)">
          <Kv k="choice c" who="b">{c}</Kv>
          {k >= 3 && <Kv k="secret b" who="b"><Hl on={k === 3}>{b}</Hl></Kv>}
          {k >= 4 && <div className="note"><Hl on={k === 4}>B = {c ? 'A·gᵇ' : 'gᵇ'}</Hl></div>}
          {k >= 9 && <Kv k="k_c = H(Aᵇ)" who="b"><Hl on={k === 9}>{hex(h32(kc))}</Hl></Kv>}
          {k >= 10 && <><Kv k={`Dec e${c}`} who="b"><span className="ok">"{decStr(ec, kc)}"</span></Kv><Kv k={`Dec e${1 - c}`} who="b"><span className="bad">"{decStr(eo, kc)}"</span></Kv></>}
        </Party>
      </div>
    );
    return framesFrom([
      { status: <>Alice holds two messages; Bob wants message number {c} without Alice learning which.</>, line: 0 },
      { status: <>Alice picks a secret exponent a and computes A = gᵃ.</>, line: 1 },
      { status: <>She sends A to Bob.</>, line: 2 },
      { status: <>Bob picks a secret exponent b.</>, line: 3 },
      { status: c ? <>Because c = 1, Bob multiplies by A: B = A·gᵇ.</> : <>Because c = 0, Bob sends plain B = gᵇ.</>, line: 4 },
      { status: <>B is a uniformly random group element either way, so it reveals nothing about c.</>, line: 5 },
      { status: <>Alice derives one key per message. Exactly one of them equals H(Aᵇ).</>, line: 6 },
      { status: <>She encrypts each message under its key.</>, line: 7 },
      { status: <>Both ciphertexts go to Bob.</>, line: 8 },
      { status: <>Bob can compute only the key for his choice.</>, line: 9 },
      { status: <>He opens e{c} and gets "{c ? m1 : m0}"; the other ciphertext decrypts to garbage.</>, line: 10 },
    ], view);
  }, [msgs, c, nonce]);
  return (
    <VisPage topicId="ot" code={OT_CODE} frames={frames} actions={[
      { label: 'Messages m₀, m₁', form: <><input type="text" value={mD[0]} onChange={e => setMD([e.target.value, mD[1]])} style={{ width: '8em' }} /><input type="text" value={mD[1]} onChange={e => setMD([mD[0], e.target.value])} style={{ width: '8em' }} /><Go onClick={commitM} /></> },
      { label: "Bob's choice c", form: <Seg value={c} onChange={setC} options={[[0, 'c = 0'], [1, 'c = 1']]} /> },
      { label: 'New randomness', form: <Go onClick={() => setNonce(x => x + 1)}>Randomize</Go> },
    ]} />
  );
}

// ---------- IKNP OT extension ----------
const IK_CODE = ['Bob: choice bits r (m bits), random matrix T (m × κ)', 'for j = 1 … κ:   // κ base OTs, roles reversed', '  Bob offers (t^j, t^j ⊕ r); Alice chooses with s_j', '  Alice receives column q^j = t^j ⊕ s_j·r', 'read Q by rows: q_i = t_i ⊕ r_i · s', 'Alice pads: x0 = H(q_i), x1 = H(q_i ⊕ s)', 'Bob pad: H(t_i) = x_{r_i}'];
const Bit = ({ v, cls = '' }: { v: number; cls?: string }) => <span className={`bit ${v ? 'one' : ''} ${cls}`}>{v}</span>;
export function IknpVis() {
  const K = 6, M = 8;
  const [nonce, setNonce] = useState(0);
  const frames = useMemo(() => {
    const T = Array.from({ length: M }, () => Array.from({ length: K }, () => rnd(0, 1)));
    const r = Array.from({ length: M }, () => rnd(0, 1)), s = Array.from({ length: K }, () => rnd(0, 1));
    const Qm = T.map((row, i) => row.map((t, j) => t ^ (r[i] & s[j])));
    const Hrow = (a: number[]) => hex(h32('ot' + a.join('')), 4);
    const view = (k: number) => {
      const cols = k >= 1 ? Math.min(K, k) : 0, rowPhase = k > K, row = rowPhase ? Math.min(M - 1, k - K - 1) : -1;
      const hl = (i: number, j: number) => (!rowPhase && j === cols - 1 ? 'colhl' : rowPhase && i === row ? 'rowhl' : '');
      return (
        <div className="st-row">
          <Party who="bob" title="Bob: r and T">
            <div className="bits sb">{T.map((rw, i) => <div key={i} className="bitrow"><Bit v={r[i]} /><span style={{ width: 8 }} />{rw.map((v, j) => <Bit key={j} v={v} cls={hl(i, j)} />)}</div>)}</div>
          </Party>
          <Wire title={rowPhase ? 'Rows are OTs' : `Base OT #${cols || '–'}`}>
            {!rowPhase && cols > 0 && <SMsg dir={`column ${cols - 1}`} fresh>Alice's bit s{cols - 1} = <S a>{s[cols - 1]}</S> → she receives {s[cols - 1] ? 't ⊕ r' : 't'}</SMsg>}
            {rowPhase && <SMsg dir={`row ${row}`} fresh>q{row} = t{row} ⊕ r{row}·s = <S a>{Qm[row].join('')}</S><br />pads: <S a>x₀ = {Hrow(Qm[row])}, x₁ = {Hrow(Qm[row].map((v, j) => v ^ s[j]))}</S><br />Bob: <S b>H(t{row}) = {Hrow(T[row])} = x{r[row]}</S></SMsg>}
          </Wire>
          <Party who="alice" title="Alice: s and Q">
            <div className="bits sa">
              <div className="bitrow"><span className="bit" style={{ background: 'none' }}>s</span><span style={{ width: 8 }} />{s.map((v, j) => <Bit key={j} v={v} cls={!rowPhase && j === cols - 1 ? 'colhl' : ''} />)}</div>
              {Qm.map((rw, i) => <div key={i} className="bitrow"><span className="bit" style={{ background: 'none' }}>{i}</span><span style={{ width: 8 }} />{rw.map((v, j) => (j < cols ? <Bit key={j} v={v} cls={hl(i, j)} /> : <span key={j} className="bit" style={{ opacity: 0.3 }}>·</span>))}</div>)}
            </div>
          </Party>
        </div>
      );
    };
    return framesFrom([
      { status: <>Bob wants {M} OTs with choice bits r. He fills a random {M}×{K} bit matrix T.</>, line: 0 },
      ...Array.from({ length: K }, (_, j) => ({ status: <>Base OT #{j}: Alice's secret bit s{j} = {s[j]} picks column t{j}{s[j] ? ' ⊕ r' : ''}. Only κ = {K} public-key OTs run.</>, line: [1, 2, 3] })),
      ...Array.from({ length: Math.min(M, 4) }, (_, i) => ({ status: <>Row {i}: q{i} = t{i} ⊕ r{i}·s. Alice's pads are H(q) and H(q ⊕ s); Bob knows exactly the one indexed by r{i} = {r[i]}.</>, line: [4, 5, 6] })),
      { status: <>Every row is now an independent OT, made with hashing and XOR only.</>, line: 4 },
    ], view);
  }, [nonce]);
  return <VisPage topicId="otext" code={IK_CODE} frames={frames} actions={[{ label: 'New T, r, s', form: <Go onClick={() => setNonce(x => x + 1)}>Randomize</Go> }]} />;
}

// ---------- OPRF ----------
const OPRF_CODE = ['Client(x)                 Server(k)', 'C: h ← H(x)', 'C: r ← random;  a ← h^r', 'C → S: a', 'S: b ← a^k', 'S → C: b', 'C: y ← b^(1/r) = H(x)^k', 'output F_k(x) = y'];
export function OprfVis() {
  const [x, xD, setXD, commitX] = useDraft('alice@example.com');
  const [k, kD, setKD, commitK] = useDraft(77);
  const [nonce, setNonce] = useState(0);
  const frames = useMemo(() => {
    const h = H2G(x), r = rnd(2, Q - 1), a = mpow(h, r, P), b = mpow(a, k, P), y = mpow(b, minv(r, Q), P);
    const view = (st: number) => (
      <div className="st-row">
        <Party who="alice" title="Alice (client)">
          <Kv k="input x" who="a">{x}</Kv>
          {st >= 1 && <Kv k="H(x)" who="a"><Hl on={st === 1}>{h}</Hl></Kv>}
          {st >= 2 && <Kv k="blind r" who="a"><Hl on={st === 2}>{r}</Hl></Kv>}
          {st >= 6 && <Kv k="y = b^(1/r)" who="a"><Hl on={st === 6}>{y}</Hl></Kv>}
          {st >= 7 && <div className="ok">✓ equals H(x)ᵏ = {mpow(h, k, P)}</div>}
        </Party>
        <Wire>
          {st >= 3 && <SMsg dir="Alice → Bob" fresh={st === 3}>a = H(x)ʳ = {a}</SMsg>}
          {st >= 5 && <SMsg dir="Bob → Alice" fresh={st === 5}>b = aᵏ = {b}</SMsg>}
        </Wire>
        <Party who="bob" title="Bob (server)">
          <Kv k="key k" who="b">{k}</Kv>
          {st >= 4 && <Kv k="b = aᵏ"><Hl on={st === 4}>{b}</Hl></Kv>}
          <div className="note">Bob only sees a, a random-looking group element.</div>
        </Party>
      </div>
    );
    return framesFrom([
      { status: <>Alice wants F<sub>k</sub>(x) for her private x; Bob holds the key k.</>, line: 0 },
      { status: <>She hashes x into the group.</>, line: 1 },
      { status: <>She blinds it with a fresh random exponent r. Running again with a new r changes every message but not the result.</>, line: 2 },
      { status: <>The blinded value goes to Bob.</>, line: 3 },
      { status: <>Bob applies his key.</>, line: 4 },
      { status: <>He returns the result.</>, line: 5 },
      { status: <>Alice removes r by raising to 1/r mod q.</>, line: 6 },
      { status: <>She holds F<sub>k</sub>(x); Bob learned nothing about x and she learned nothing about k.</>, line: 7 },
    ], view);
  }, [x, k, nonce]);
  return (
    <VisPage topicId="oprf" code={OPRF_CODE} frames={frames} actions={[
      { label: "Alice's input x", form: <><input type="text" value={xD} onChange={e => setXD(e.target.value)} style={{ width: '12em' }} /><Go onClick={commitX} /></> },
      { label: "Bob's key k", form: <><input type="number" min={2} max={508} value={kD} onChange={e => setKD(+e.target.value)} /><Go onClick={commitK} /></> },
      { label: 'Run again (new r)', form: <Go onClick={() => setNonce(n => n + 1)}>Run</Go> },
    ]} />
  );
}

// ---------- OPPRF ----------
const OPPRF_CODE = ['Server points (x_i, y_i), OPRF key k', 'S: t_i ← y_i − F_k(x_i)', 'S: H ← OKVS.Encode{x_i ↦ t_i}', 'S → C: hint H', 'C: f ← F_k(q)   via OPRF', 'C: d ← OKVS.Decode(H, q)', 'C: output f + d   (= y_i if q = x_i)'];
export function OpprfVis() {
  const p = 97, key = 191;
  const F = (x: string) => mpow(H2G(x), key, P) % p;
  const [pts, ptsD, setPtsD, commitPts] = useDraft<[string, number][]>([['bus', 7], ['car', 33], ['tram', 60]]);
  const [q, qD, setQD, commitQ] = useDraft('bus');
  const frames = useMemo(() => {
    const tg = pts.map(([x, y]) => [x, mod(y - F(x), p)] as [string, number]);
    const H = okvsEncode(tg, 6, p, rnd(1, 9999))!;
    const f = F(q), row = okvsRow(q, 6, p, H.seed), d = okvsDecode(H.P, q, p, H.seed), out = mod(f + d, p), hit = pts.find(([x]) => x === q);
    const view = (st: number) => (
      <div className="st-row">
        <Party who="bob" title="Bob: programmed points">
          {pts.map(([x, y], i) => <Kv key={x} k={`${x} ↦ ${y}`} who="b">{st >= 1 ? <Hl on={st === 1}>t = {tg[i][1]}</Hl> : ''}</Kv>)}
        </Party>
        <Wire title="Public hint H">
          {st >= 3 && <div className="st-cells">{H.P.map((v, i) => <span key={i} className={`st-cell ${st >= 5 && row.some(([j]) => j === i) ? 'on' : ''}`}><span className="ix">{i}</span>{v}</span>)}</div>}
          {st === 2 && <div className="note">Encoding x_i ↦ t_i into an OKVS…</div>}
        </Wire>
        <Party who="alice" title="Alice">
          <Kv k="query q" who="a">{q}</Kv>
          {st >= 4 && <Kv k="F_k(q)" who="a"><Hl on={st === 4}>{f}</Hl></Kv>}
          {st >= 5 && <Kv k="Decode(H, q)" who="a"><Hl on={st === 5}>{d}</Hl></Kv>}
          {st >= 6 && <><Kv k="output" who="a"><Hl on={st === 6}>{out}</Hl></Kv><div className="note">{hit ? `q is programmed: output = ${hit[1]}` : 'q is not programmed: output looks random.'} Alice can't tell which.</div></>}
        </Party>
      </div>
    );
    return framesFrom([
      { status: <>Bob wants Alice's OPRF output to equal his chosen y at three points.</>, line: 0 },
      { status: <>He computes the correction tᵢ = yᵢ − F<sub>k</sub>(xᵢ) for each point.</>, line: 1 },
      { status: <>He encodes the corrections in an OKVS, which hides which keys it holds.</>, line: 2 },
      { status: <>The OKVS is published as the hint.</>, line: 3 },
      { status: <>Alice gets F<sub>k</sub>(q) through an ordinary OPRF.</>, line: 4 },
      { status: <>She decodes the hint at q (highlighted cells).</>, line: 5 },
      { status: hit ? <>The two add up to Bob's programmed value {hit[1]}.</> : <>q wasn't programmed, so the sum is just a pseudorandom number.</>, line: 6 },
    ], view);
  }, [pts, q]);
  return (
    <VisPage topicId="opprf" code={OPPRF_CODE} frames={frames} actions={[
      { label: "Alice's query q", form: <><input type="text" value={qD} onChange={e => setQD(e.target.value)} style={{ width: '7em' }} /><Go onClick={commitQ} /></> },
      { label: "Bob's values", form: <>{ptsD.map(([x, y], i) => <label key={x}>{x} <input type="number" value={y} onChange={e => setPtsD(ptsD.map((pp, j) => (j === i ? [pp[0], mod(+e.target.value, p)] : pp)))} /></label>)}<Go onClick={commitPts} /></> },
    ]} />
  );
}

// ---------- OKVS ----------
const OKVS_CODE = ['Encode(pairs, m):', '  for each key k_i: row(k_i) ← 3 hashed cells with random coefficients', '  solve  row(k_i) · P = v_i  for all i   (Gaussian elimination)', '  fill free cells of P at random', 'Decode(P, k):', '  return  Σ c_j · P[j]  over the 3 cells of row(k)', '  (a random-looking value if k was never inserted)'];
export function OkvsVis() {
  const p = 97;
  const [pairs, setPairs] = useState<[string, number][]>([['alice', 12], ['bob', 71], ['carol', 5], ['erin', 90]]);
  const [kD, setKD] = useState('dave'), [vD, setVD] = useState(44);
  const [q, qD, setQD, commitQ] = useDraft('alice');
  const frames = useMemo(() => {
    const m = Math.max(5, pairs.length + 3), E = okvsEncode(pairs, m, p, rnd(1, 9999))!;
    const rows = pairs.map(([k]) => okvsRow(k, m, p, E.seed)), qRow = okvsRow(q, m, p, E.seed), val = okvsDecode(E.P, q, p, E.seed), hit = pairs.find(([k]) => k === q);
    const cells = (filled: boolean, on: number[]) => <div className="st-cells">{E.P.map((v, i) => <span key={i} className={`st-cell ${on.includes(i) ? 'on' : ''}`}><span className="ix">P[{i}]</span>{filled ? v : '?'}</span>)}</div>;
    const pairChips = (hl: number) => <div className="st-cells">{pairs.map(([k, v], i) => <span key={k} className={`st-cell ${i === hl ? 'on' : ''}`}><span className="ix">key</span>{k} ↦ {v}</span>)}</div>;
    const steps: { status: ReactNode; line: number | number[]; stage: ReactNode }[] = [];
    steps.push({ status: <>{pairs.length} key–value pairs go into a vector of m = {m} cells.</>, line: 0, stage: <>{pairChips(-1)}{cells(false, [])}</> });
    rows.forEach((r, i) => steps.push({ status: <>“{pairs[i][0]}” hashes to cells {r.map(([j, c]) => `${j} (×${c})`).join(', ')}: one linear equation.</>, line: 1, stage: <>{pairChips(i)}{cells(false, r.map(([j]) => j))}<div className="note" style={{ textAlign: 'center' }}>{r.map(([j, c]) => `${c}·P[${j}]`).join(' + ')} = {pairs[i][1]} (mod 97)</div></> }));
    steps.push({ status: <>Solving the {pairs.length} equations fixes some cells; the rest are random.</>, line: [2, 3], stage: <>{pairChips(-1)}{cells(true, [])}<div className="note" style={{ textAlign: 'center' }}>Only P is sent. It doesn't show which keys were inserted.</div></> });
    steps.push({ status: <>Decode “{q}”: combine its 3 cells.</>, line: 5, stage: <>{pairChips(pairs.findIndex(([k]) => k === q))}{cells(true, qRow.map(([j]) => j))}<div className="st-big">{qRow.map(([j, c]) => `${c}·${E.P[j]}`).join(' + ')} ≡ {val}</div></> });
    steps.push({ status: hit ? <>“{q}” was inserted, so decoding returns its value {hit[1]} ✓.</> : <>“{q}” was never inserted: {val} is just a random-looking field element.</>, line: hit ? 5 : 6, stage: steps[steps.length - 1].stage });
    return steps;
  }, [pairs, q]);
  return (
    <VisPage topicId="okvs" code={OKVS_CODE} frames={frames} actions={[
      { label: 'Insert (key, value)', form: <><input type="text" value={kD} onChange={e => setKD(e.target.value)} style={{ width: '6em' }} /><input type="number" min={0} max={96} value={vD} onChange={e => setVD(+e.target.value)} /><Go onClick={() => { const k = kD.trim(); if (k && pairs.length < 9) setPairs(ps => [...ps.filter(([x]) => x !== k), [k, mod(vD, p)]]); }} /></> },
      { label: 'Remove a key', form: <>{pairs.map(([k]) => <button key={k} type="button" className="chip" onClick={() => setPairs(ps => ps.filter(([x]) => x !== k))}>{k} ✕</button>)}</> },
      { label: 'Decode key', form: <><input type="text" value={qD} onChange={e => setQD(e.target.value)} style={{ width: '7em' }} /><Go onClick={commitQ} /></> },
    ]} />
  );
}

// ---------- interactive-only topics ----------
export const PcgVis = () => <VisPage topicId="pcg" stage={<Pcg />} />;
export const VoleVis = () => <VisPage topicId="vole" stage={<Vole />} code={['Bob holds Δ and B; Alice holds A and C', 'B = C + A·Δ   (each coordinate, mod 97)', 'Alice never sees B, so every Δ′ is consistent', 'Bob sees B alone, which is uniform because C is']} />;
