import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../../state';
import { bytesHex, enc, h32, hex, parseSet, shuffled } from '../../lib/crypto';
import { List, S, Seg } from '../../components/ui';
import { buildProto, Playground, Variants, type ProtoId } from '../../demos/sets';
import { Aon } from '../../demos/libraries';
import { VisPage, type Frame } from '../Player';
import { Go, Party, SMsg, Wire } from '../kit';

const setStr = (xs: string[]) => `{${xs.join(', ')}}`;

/** Compact Venn row for the stage. */
function Venn({ A, B, hideA, hideB }: { A: string[]; B: string[]; hideA?: boolean; hideB?: boolean }) {
  const I = A.filter(x => B.includes(x));
  const chips = (xs: string[], cls: string, s?: 'a' | 'b') => xs.map(x => <span key={x} className={`chip ${cls}`}>{s ? <S a={s === 'a'} b={s === 'b'}>{x}</S> : x}</span>);
  return (
    <div className="venn">
      <div className="va-only"><span className="cap">A only</span>{chips(A.filter(x => !B.includes(x)), 'a-chip', hideA ? 'a' : undefined)}</div>
      <div className="vboth"><span className="cap">A ∩ B ({I.length})</span>{chips(I, 'both', 'a')}</div>
      <div className="vb-only"><span className="cap">B only</span>{chips(B.filter(x => !A.includes(x)), 'b-chip', hideB ? 'b' : undefined)}</div>
    </div>
  );
}

function SetsForm({ onGo }: { onGo?: () => void }) {
  const { setA, setB, setSetA, setSetB } = useApp();
  const [a, setLa] = useState(setA), [b, setLb] = useState(setB);
  return <>A <input type="text" value={a} onChange={e => setLa(e.target.value)} style={{ width: '14em' }} /> B <input type="text" value={b} onChange={e => setLb(e.target.value)} style={{ width: '12em' }} /><Go onClick={() => { setSetA(a); setSetB(b); onGo?.(); }} /></>;
}

const ledger = (items: ReactNode[]) => <ul style={{ margin: 0, paddingLeft: 18 }}>{items.length ? items.map((x, i) => <li key={i}>{x}</li>) : <li className="muted">nothing yet</li>}</ul>;

// ---------- PSI ----------
const PSI_CODE: Record<ProtoId, string[]> = {
  naive: ['Naive hash PSI:', 'A: send H(a) for every a ∈ A', 'B: compare with H(b) for b ∈ B', 'B: report matches', 'attack: B hashes a dictionary and inverts H'],
  dh: ['DH-PSI:', 'A: α ← random; send H(a)^α for a ∈ A', 'B: β ← random; send (H(a)^α)^β and H(b)^β (shuffled)', 'A: compute (H(b)^β)^α and compare with H(a)^(αβ)'],
  oprf: ['OPRF-PSI:', 'for each a ∈ A: A obtains F_k(a) via OPRF with B', 'B: send F_k(b) for all b ∈ B (shuffled)', 'A: a ∈ A ∩ B  iff  F_k(a) is in the list'],
  vole: ['VOLE + OKVS PSI (RS21-style):', 'silent VOLE:  B = C + A·Δ', 'A: P ← OKVS{a ↦ H(a)};  send D = P − A', 'B: K = B + D·Δ;  send H(Decode(K,b) − Δ·H(b)) for b ∈ B', 'A: a ∈ A ∩ B  iff  H(Decode(C,a)) is in the list'],
  circuit: ['Circuit-PSI:', 'A: cuckoo-hash A into bins;  B: simple-hash B', 'OPPRF per bin (B programs the targets)', 'parties hold XOR shares of [bin item ∈ B]', '2PC on the shares, e.g. count = |A ∩ B|'],
};
export function PsiVis() {
  const { A, B } = useApp();
  const [proto, setProto] = useState<ProtoId>('dh');
  const frames = useMemo<Frame[]>(() => {
    const P_ = buildProto(proto, A, B);
    return P_.steps.map((s, k) => ({
      line: k + 1,
      status: k === 0 ? <><b>{s.n}.</b> {P_.desc}</> : <b>{s.n}.</b>,
      stage: (
        <>
          <Venn A={A} B={B} hideA hideB />
          <div className="st-row">
            <Party who="alice" title="Alice">{s.a}</Party>
            <Wire>{s.w}</Wire>
            <Party who="bob" title="Bob">{s.b}</Party>
          </div>
          <div className="st-row">
            <div className="st-party alice"><h4>Alice has learned</h4>{ledger(P_.steps.slice(0, k + 1).flatMap(x => x.la))}</div>
            <div className="st-party bob"><h4>Bob has learned</h4>{ledger(P_.steps.slice(0, k + 1).flatMap(x => x.lb))}</div>
          </div>
        </>
      ),
    }));
  }, [proto, A.join(), B.join()]);
  return (
    <VisPage topicId="psi" code={PSI_CODE[proto]} frames={frames} actions={[
      { label: 'Protocol', form: <Seg value={proto} onChange={setProto} options={[['naive', 'Naive'], ['dh', 'DH'], ['oprf', 'OPRF'], ['vole', 'VOLE+OKVS'], ['circuit', 'Circuit']]} /> },
      { label: 'Sets A, B', form: <SetsForm /> },
    ]} />
  );
}

// ---------- PSU: membership test + OT ----------
const PSU_CODE = ['PSU (receiver Alice holds A, sender Bob holds B):', '[optional] obliviously shuffle Bob\'s list', 'membership test: Alice learns e_j = [b_j ∈ A]', 'OT_j: Bob offers (b_j, ⊥); Alice chooses e_j', 'Alice outputs A ∪ {received b_j}'];
export function PsuVis() {
  const { A, B } = useApp();
  const [shuf, setShuf] = useState(true), [nonce, setNonce] = useState(0);
  const frames = useMemo<Frame[]>(() => {
    const order = shuf ? shuffled(B) : B.slice(), e = order.map(b => (A.includes(b) ? 1 : 0)), U = A.concat(order.filter((_, j) => !e[j]));
    const stage = (k: number) => (
      <>
        <Venn A={A} B={B} hideA hideB />
        <div className="st-row">
          <Party who="alice" title="Alice (receiver)">
            {k === 0 && <div className="note">sees {order.length} positions, contents hidden</div>}
            {k >= 1 && <List items={e.map((x, j) => <>pos {j}: e = <S a>{x}</S></>)} />}
            {k >= 2 && <><h4>received</h4><List items={order.map((b, j) => (e[j] ? <span className="muted">⊥</span> : <S a>{b}</S>))} /></>}
            {k >= 3 && <div className="st-big"><S a>{setStr(U)}</S></div>}
          </Party>
          <Wire>
            {k === 0 && <div className="note">{shuf ? 'Positions are shuffled so they can\'t be linked to Bob\'s order.' : "No shuffle: positions follow Bob's own order."}</div>}
            {k === 1 && <SMsg dir="reverse membership test" fresh>OPRF / OKVS messages</SMsg>}
            {k >= 2 && order.map((b, j) => <SMsg key={j} dir={`OT #${j}: (b, ⊥)`} fresh={k === 2}>{bytesHex(enc(b, 'k' + j)).slice(0, 12)} · {bytesHex(enc('⊥', 'q' + j))}</SMsg>)}
          </Wire>
          <Party who="bob" title="Bob (sender)"><List items={B.map(b => <S b>{b}</S>)} /></Party>
        </div>
      </>
    );
    const dup = e.flatMap((x, j) => (x ? [j] : []));
    return [
      { stage: stage(0), line: 1, status: shuf ? <>Bob's items are shuffled obliviously first.</> : <>No shuffle: Bob's items keep their order.</> },
      { stage: stage(1), line: 2, status: <>A reverse private membership test tells Alice, for each position, whether that item is already in A, without showing her the item.</> },
      { stage: stage(2), line: 3, status: <>One OT per position: Alice's bit eⱼ selects bⱼ (new item) or ⊥ (duplicate). Bob never learns e.</> },
      { stage: stage(3), line: 4, status: shuf ? <>Alice outputs the union. The ⊥ positions are random, so nothing about Bob's ordering leaks.</> : <>Alice outputs the union, but she also knows positions {setStr(dup.map(String))} were duplicates; if Bob's order means something, that leaks.</> },
    ];
  }, [shuf, nonce, A.join(), B.join()]);
  return (
    <VisPage topicId="psu" code={PSU_CODE} frames={frames} actions={[
      { label: 'Shuffle first?', form: <><Seg value={shuf ? 1 : 0} onChange={v => setShuf(!!v)} options={[[1, 'Shuffle-based'], [0, 'No shuffle']]} /><Go onClick={() => setNonce(x => x + 1)}>Reshuffle</Go></> },
      { label: 'Sets A, B', form: <SetsForm /> },
    ]} />
  );
}

// ---------- PSU frameworks with incomplete execution ----------
type Fam = 'rpmt' | 'mcrg' | 'poly';
const FW_CODE: Record<Fam, string[]> = {
  rpmt: ['RPMT-based PSU:', 'P_S: shuffle X by π', 'batched RPMT: P_R learns b_i = [x_π(i) ∈ Y]', 'OT_i: P_S offers (x_π(i), ⊥), P_R chooses b_i', 'P_R outputs Y ∪ {received}'],
  mcrg: ['MCRG-based PSU:', 'P_S: shuffle X by π', 'batched MCRG: r_i = r′_i  iff  x_π(i) ∉ Y', 'P_S sends c_i = Enc(r_i, x_π(i))', 'P_R decrypts with r′_i; outputs Y ∪ {valid}'],
  poly: ['Polynomial-based PSU:', 'P_R sends Enc(f_Y), f_Y(z) = Π (z − y)', 'P_S sends shuffled Enc(x·f_Y(x)), Enc(f_Y(x))', 'P_R decrypts; (0,0) means x ∈ Y', 'P_R outputs Y ∪ {x with f_Y(x) ≠ 0}'],
};
export function PsuFwVis() {
  const [fam, setFam] = useState<Fam>('rpmt');
  const [sets, setSets] = useState<[string, string]>(['evil.com, 10.0.0.7, bad.exe, phish.net, c2.io', 'bad.exe, spam.biz, c2.io, mal.org']);
  const [dX, setDX] = useState(sets[0]), [dY, setDY] = useState(sets[1]);
  const [cut, setCut] = useState(0); // 0 = run to completion; k = connection drops after step k
  const frames = useMemo<Frame[]>(() => {
    const X = parseSet(sets[0]), Y = parseSet(sets[1]), key = X.join('|');
    const xs = shuffled(X), mem = xs.map(x => (Y.includes(x) ? 1 : 0)), U = [...new Set(Y.concat(xs.filter((_, i) => !mem[i])))];
    const r = xs.map(x => hex(h32('r' + x + key), 4)), rp = xs.map((x, i) => (mem[i] ? hex(h32('rp' + x + key), 4) : r[i]));
    type St = { name: string; s: ReactNode; w: ReactNode; r: ReactNode; learn: string[] };
    const F: Record<Fam, St[]> = {
      rpmt: [
        { name: 'Shuffle', s: <List items={xs.map((x, i) => <>pos {i}: <S b>{x}</S></>)} />, w: null, r: <div className="note">waiting</div>, learn: [] },
        { name: 'Batched RPMT', s: <div className="note">learns nothing</div>, w: <SMsg dir="RPMT" fresh>membership test per position</SMsg>, r: <List items={mem.map((b, i) => <>pos {i}: b = <S a>{b}</S></>)} />, learn: [`|X ∩ Y| = ${mem.filter(Boolean).length}`] },
        { name: 'OT per position', s: <div className="note">offers (x, ⊥)</div>, w: <>{xs.map((x, i) => <SMsg key={i} dir={`OT #${i}`}>{mem[i] ? '⊥' : <S a>{x}</S>}</SMsg>)}</>, r: <List items={xs.map((x, i) => (mem[i] ? <span className="muted">⊥</span> : <S a>{x}</S>))} />, learn: ['X ∖ Y'] },
        { name: 'Output', s: null, w: null, r: <div className="st-big"><S a>{setStr(U)}</S></div>, learn: ['X ∪ Y'] },
      ],
      mcrg: [
        { name: 'Shuffle', s: <List items={xs.map((x, i) => <>pos {i}: <S b>{x}</S></>)} />, w: null, r: <div className="note">waiting</div>, learn: [] },
        { name: 'Batched MCRG', s: <List items={r.map((v, i) => <>r{i} = <S b>{v}</S></>)} />, w: <SMsg dir="PMT + ECRG" fresh>no membership bits produced</SMsg>, r: <List items={rp.map((v, i) => <>r′{i} = <S a>{v}</S></>)} />, learn: ['random-looking strings only'] },
        { name: 'Encrypt & send', s: <div className="note">cᵢ = Enc(rᵢ, xᵢ)</div>, w: <>{xs.map((x, i) => <SMsg key={i} dir={`c${i}`}>{bytesHex(enc(x, r[i])).slice(0, 14)}…</SMsg>)}</>, r: null, learn: [] },
        { name: 'Decrypt & output', s: null, w: null, r: <><List items={xs.map((x, i) => (mem[i] ? <span className="muted">invalid → ⊥</span> : <S a>{x}</S>))} /><div className="st-big"><S a>{setStr(U)}</S></div></>, learn: ['X ∪ Y (|X ∩ Y| only now, implied by the output)'] },
      ],
      poly: [
        { name: 'Encode Y', s: null, w: <SMsg dir="P_R → P_S" fresh>Enc(f_Y), f_Y(z) = {Y.map(y => `(z − ${y})`).join('')}</SMsg>, r: <div className="note">holds the HE key</div>, learn: [] },
        { name: 'Evaluate & shuffle', s: <div className="note">Enc(x·f(x)), Enc(f(x)) per x</div>, w: <>{xs.map((x, i) => <SMsg key={i} dir={`tuple ${i}`}>{bytesHex(enc('c' + x, 'he' + i)).slice(0, 14)}…</SMsg>)}</>, r: null, learn: [] },
        { name: 'Decrypt', s: null, w: null, r: <List items={xs.map((x, i) => (mem[i] ? <>(0,0) → <span className="muted">⊥</span></> : <S a>{x}</S>))} />, learn: ['which tuples are (0,0): |X ∩ Y|, then X ∖ Y'] },
        { name: 'Output', s: null, w: null, r: <div className="st-big"><S a>{setStr(U)}</S></div>, learn: ['X ∪ Y'] },
      ],
    };
    const steps = F[fam], last = cut > 0 ? Math.min(cut, steps.length) : steps.length;
    const out: Frame[] = steps.slice(0, last).map((s, k) => ({
      line: k + 1,
      status: <><b>{s.name}.</b> Receiver knows: {steps.slice(0, k + 1).flatMap(x => x.learn).join('; ') || 'nothing yet'}.</>,
      stage: (
        <div className="st-row">
          <Party who="bob" title="Sender P_S (set X)">{s.s}</Party>
          <Wire>{s.w}</Wire>
          <Party who="alice" title="Receiver P_R (set Y)">{s.r}</Party>
        </div>
      ),
    }));
    if (cut > 0 && cut < steps.length) {
      const learned = steps.slice(0, cut).flatMap(x => x.learn), leaks = learned.some(l => l.startsWith('|X ∩ Y|') || l.includes('(0,0)'));
      out.push({
        line: [],
        stage: <div className="st-row"><div className="st-party" style={{ maxWidth: 560 }}><h4>Connection dropped after step {cut}</h4><div>Receiver keeps: {learned.join('; ') || 'nothing'}</div>{leaks ? <div className="bad">Output-dependent leakage: no union was delivered, yet the intersection size is known. Repeated aborted runs act as a membership oracle.</div> : <div className="ok">Nothing output-dependent leaked: all-or-nothing so far.</div>}</div></div>,
        status: leaks ? <>The run stopped early but the receiver already learned something about the output.</> : <>The run stopped early and the receiver learned nothing about the output.</>,
      });
    }
    return out;
  }, [fam, sets, cut]);
  return (
    <VisPage topicId="psufw" code={FW_CODE[fam]} frames={frames} actions={[
      { label: 'Framework', form: <Seg value={fam} onChange={setFam} options={[['rpmt', 'RPMT'], ['mcrg', 'MCRG'], ['poly', 'Polynomial']]} /> },
      { label: 'Drop connection', form: <Seg value={cut} onChange={setCut} options={[[0, 'Never'], [1, 'After 1'], [2, 'After 2'], [3, 'After 3']]} /> },
      { label: 'Sets X, Y', form: <>X <input type="text" value={dX} onChange={e => setDX(e.target.value)} style={{ width: '14em' }} /> Y <input type="text" value={dY} onChange={e => setDY(e.target.value)} style={{ width: '12em' }} /><Go onClick={() => setSets([dX, dY])} /></> },
    ]} />
  );
}

export const AonVis = () => <VisPage topicId="aon" stage={<Aon />} code={['Compile the last sender → receiver message m = (m1 … mℓ):', '  r ← random', '  c_i ← m_i ⊕ H(0 ‖ r ‖ i)', '  d ← r ⊕ H(1 ‖ ℓ ‖ c_1 ‖ … ‖ c_ℓ)', '  send atoms c_1 … c_ℓ, d', 'receiver: if any atom is missing, output ⊥']} />;
export const VariantsVis = () => <VisPage topicId="variants" stage={<><Playground /><Variants /></>} />;
