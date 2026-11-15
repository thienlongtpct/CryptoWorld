import { useMemo, useState } from 'react';
import { G, P, bigPow, dhExponent, hex, h32, minv, mod, mpow, rnd } from '../../lib/crypto';
import { Kv, S, Seg } from '../../components/ui';
import { VisPage } from '../Player';
import { Go, Hl, Party, SMsg, Wire, framesFrom, useDraft } from '../kit';

// ---------- Shamir secret sharing ----------
const SS_CODE = [
  'Share(s, t, n):',
  '  pick random a1 … a(t-1)',
  '  f(x) = s + a1·x + … + a(t-1)·x^(t-1)  mod 97',
  '  for i = 1 … n: give party i the share (i, f(i))',
  '',
  'Reconstruct(shares S):',
  '  if |S| < t: every secret is still possible',
  '  s = Σ y_j · Π (0 − x_m)/(x_j − x_m)   (Lagrange at 0)',
  '  return s',
];
export function SecretSharingVis() {
  const p = 97;
  const [s, sD, setSD, commitS] = useDraft(42);
  const [n, nD, setND, commitN] = useDraft(5);
  const [t, tD, setTD, commitT] = useDraft(3);
  const [pick, pickD, setPickD, commitPick] = useDraft('1, 3, 5');
  const [nonce, setNonce] = useState(0);
  const frames = useMemo(() => {
    const tail = Array.from({ length: t - 1 }, () => rnd(0, p - 1)), coef = [s, ...tail];
    const f = (x: number) => coef.reduce((a, c, i) => mod(a + c * mpow(x, i, p), p), 0);
    const shares = Array.from({ length: n }, (_, i) => [i + 1, f(i + 1)] as [number, number]);
    const chosen = [...new Set(pick.split(/[ ,]+/).map(Number).filter(x => x >= 1 && x <= n))];
    const pts = shares.filter(([x]) => chosen.includes(x));
    const lag = (ps: [number, number][]) => ps.reduce((acc, [xj, yj]) => {
      let num = 1, den = 1;
      ps.forEach(([xm]) => { if (xm !== xj) { num = (num * mod(-xm, p)) % p; den = (den * mod(xj - xm, p)) % p; } });
      return mod(acc + yj * num * minv(den, p), p);
    }, 0);
    const rec = pts.length >= t ? lag(pts.slice(0, t)) : null;
    const X = (x: number) => 50 + x * (560 / n), Y = (y: number) => 190 - y * 1.7;
    const view = (k: number) => {
      const shown = k >= 2 ? Math.min(n, k - 1) : 0, collecting = k >= n + 2, done = k >= n + 3;
      return (
        <div className="st-row" style={{ flexDirection: 'column' }}>
          <div className="st-party" style={{ flex: 'none' }}>
            <h4>Dealer's polynomial {k >= 1 && <span className="muted">f(x) = {coef.map((c, i) => (i ? `${c}·x${i > 1 ? '^' + i : ''}` : c)).join(' + ')} mod 97</span>}</h4>
            <svg viewBox="0 0 640 215" style={{ width: '100%', height: 'auto' }}>
              <line x1={40} y1={190} x2={630} y2={190} stroke="var(--line)" /><line x1={40} y1={20} x2={40} y2={190} stroke="var(--line)" />
              {Array.from({ length: n + 1 }, (_, x) => <text key={x} x={X(x)} y={206} fontSize={11} textAnchor="middle" fill="var(--muted)">{x === 0 ? 'x = 0' : 'party ' + x}</text>)}
              {shares.slice(0, shown).map(([x, y]) => {
                const used = collecting && chosen.includes(x);
                return <g key={x} className="st-new"><line x1={X(x)} y1={190} x2={X(x)} y2={Y(y)} stroke={used ? 'var(--vis-progress)' : 'var(--line)'} strokeWidth={3} /><circle cx={X(x)} cy={Y(y)} r={8} fill={used ? 'var(--vis-progress)' : '#fff'} stroke="var(--vis-progress)" strokeWidth={2} /><text x={X(x)} y={Y(y) - 13} fontSize={12} textAnchor="middle" fill="var(--ink)">{y}</text></g>;
              })}
              <circle cx={X(0)} cy={Y(s)} r={9} fill={done && rec !== null ? 'var(--ok)' : k === 0 ? 'var(--ink)' : 'none'} stroke="var(--ink)" strokeDasharray={done || k === 0 ? undefined : '3 3'} />
              <text x={X(0) + 14} y={Y(s) + 4} fontSize={12} fill="var(--ink)">{k === 0 || (done && rec !== null) ? `s = ${done && rec !== null ? rec : s}` : '?'}</text>
            </svg>
          </div>
          <div className="st-cells">{shares.slice(0, shown).map(([x, y]) => <span key={x} className={`st-cell ${collecting && chosen.includes(x) ? 'on' : ''}`}><span className="ix">party {x}</span>({x}, {y})</span>)}</div>
          {done && <div className="st-big">{rec !== null ? <>Reconstructed s = {rec} {rec === s ? '✓' : ''}</> : <>Only {pts.length} of t = {t} shares: all 97 secrets remain possible</>}</div>}
        </div>
      );
    };
    const steps = [
      { status: <>The dealer holds secret s = {s} and wants a {t}-out-of-{n} sharing.</>, line: 0 },
      { status: <>Pick {t - 1} random coefficient{t - 1 === 1 ? '' : 's'}; the secret is f(0).</>, line: [1, 2] },
      ...shares.map(([x, y]) => ({ status: <>Party {x} receives the share ({x}, {y}).</>, line: 3 })),
      { status: <>Collect the shares of parties {chosen.join(', ') || '(none)'}.</>, line: 5 },
      rec !== null
        ? { status: <>{pts.length} ≥ t shares: Lagrange interpolation at x = 0 gives {rec}.</>, line: [7, 8] }
        : { status: <>Only {pts.length} share(s), fewer than t = {t}. For every candidate s′ there is exactly one polynomial through them, so nothing is learned.</>, line: 6 },
    ];
    return framesFrom(steps, view);
  }, [s, n, t, pick, nonce]);
  return (
    <VisPage topicId="ss" code={SS_CODE} frames={frames} actions={[
      { label: 'Secret, n, t', form: <>s <input type="number" min={0} max={96} value={sD} onChange={e => setSD(+e.target.value)} /> n <input type="number" min={2} max={7} value={nD} onChange={e => setND(+e.target.value)} /> t <input type="number" min={1} max={7} value={tD} onChange={e => setTD(+e.target.value)} /><Go onClick={() => { commitS(); commitN(); commitT(); }} /></> },
      { label: 'Reconstruct from…', form: <>parties <input type="text" value={pickD} onChange={e => setPickD(e.target.value)} style={{ width: '8em' }} /><Go onClick={commitPick} /></> },
      { label: 'New polynomial', form: <Go onClick={() => setNonce(x => x + 1)}>Randomize</Go> },
    ]} />
  );
}

// ---------- commitment ----------
const COM_CODE = ['Commit(v):', '  r ← random 128-bit nonce', '  c ← SHA-256(v ‖ r)', '  send c', '', 'Open:', '  send (v′, r)', '  accept iff SHA-256(v′ ‖ r) = c'];
const toyHash = (s: string) => [1, 2, 3, 4].map(i => hex(h32(i + '|' + s), 8)).join('');
export function CommitmentVis() {
  const [v, vD, setVD, commitV] = useDraft('heads');
  const [v2, v2D, setV2D, commitV2] = useDraft('heads');
  const [nonce, setNonce] = useState(0);
  const frames = useMemo(() => {
    const r = Array.from({ length: 4 }, () => hex(rnd(0, 0xffffffff), 8)).join(''), c = toyHash(v + '|' + r), c2 = toyHash(v2 + '|' + r), ok = c === c2;
    const view = (k: number) => (
      <div className="st-row">
        <Party who="alice" title="Alice (committer)">
          <Kv k="value v" who="a">{v}</Kv>
          {k >= 1 && <Kv k="nonce r" who="a"><Hl on={k === 1}>{r}</Hl></Kv>}
          {k >= 2 && <Kv k="c = H(v ‖ r)" who="a"><Hl on={k === 2}>{c.slice(0, 16)}…</Hl></Kv>}
        </Party>
        <Wire>
          {k >= 3 && <SMsg dir="Alice → Bob" fresh={k === 3}>c = {c.slice(0, 24)}…</SMsg>}
          {k >= 4 && <SMsg dir="Alice → Bob (later)" fresh={k === 4}>v′ = "{v2}", r = {r.slice(0, 12)}…</SMsg>}
        </Wire>
        <Party who="bob" title="Bob (verifier)">
          {k >= 3 && <Kv k="stored c">{c.slice(0, 16)}…</Kv>}
          {k < 4 && <div className="note">{k >= 3 ? "Bob can't tell what is inside." : 'Waiting for the commitment.'}</div>}
          {k >= 5 && <><Kv k="H(v′ ‖ r)">{c2.slice(0, 16)}…</Kv><div className={ok ? 'ok' : 'bad'}>{ok ? `✓ Accept: opens to "${v2}"` : '✗ Reject: binding stopped the cheat'}</div></>}
        </Party>
      </div>
    );
    return framesFrom([
      { status: <>Alice wants to commit to "{v}" without revealing it.</>, line: 0 },
      { status: <>She samples a fresh random nonce r, so Bob can't just hash guesses.</>, line: 1 },
      { status: <>The commitment is the hash of v and r together.</>, line: 2 },
      { status: <>She sends c. It hides v.</>, line: 3 },
      { status: <>Later Alice opens by sending a value and the nonce{v2 !== v ? ': she is trying to cheat with a different value' : ''}.</>, line: [5, 6] },
      { status: ok ? <>The hashes match, so Bob accepts.</> : <>The hash of the claimed value doesn't match c. A commitment is binding.</>, line: 7 },
    ], view);
  }, [v, v2, nonce]);
  return (
    <VisPage topicId="commit" code={COM_CODE} frames={frames} actions={[
      { label: 'Commit to v', form: <>v <input type="text" value={vD} onChange={e => setVD(e.target.value)} style={{ width: '8em' }} /><Go onClick={() => { commitV(); setNonce(x => x + 1); }} /></> },
      { label: 'Open as v′ (cheat?)', form: <>v′ <input type="text" value={v2D} onChange={e => setV2D(e.target.value)} style={{ width: '8em' }} /><Go onClick={commitV2} /></> },
    ]} />
  );
}

// ---------- Diffie–Hellman ----------
const DH_CODE = ['public: prime p = 1019, generator g = 4', 'Alice: a ← random;  A ← g^a', 'send A', 'Bob:   b ← random;  B ← g^b', 'send B', 'Alice: K ← B^a', 'Bob:   K ← A^b', 'both hold K = g^(ab)'];
function DhSecrets({ a, b, setA, setB, onApply }: { a: number; b: number; setA: (n: number) => void; setB: (n: number) => void; onApply: (ab: [number, number]) => void }) {
  const bad = dhExponent(a) === null || dhExponent(b) === null;
  return (
    <>
      a <input type="number" min={1} max={508} value={Number.isNaN(a) ? '' : a} onChange={e => setA(e.target.value === '' ? Number.NaN : +e.target.value)} />
      b <input type="number" min={1} max={508} value={Number.isNaN(b) ? '' : b} onChange={e => setB(e.target.value === '' ? Number.NaN : +e.target.value)} />
      <Go onClick={() => { const ae = dhExponent(a), be = dhExponent(b); if (ae !== null && be !== null) onApply([ae, be]); }} />
      {bad && <div className="bad">Use a whole number from 1 to 508 for each secret. This educational group has order 509, so those are the nonzero exponents.</div>}
    </>
  );
}
export function DiffieHellmanVis() {
  const [ab, setAb] = useState<[number, number]>([123, 321]);
  const [aD, setAD] = useState(123), [bD, setBD] = useState(321);
  const frames = useMemo(() => {
    const [a, b] = ab, A = mpow(G, a, P), B = mpow(G, b, P), Ka = mpow(B, a, P), Kb = mpow(A, b, P);
    const view = (k: number) => (
      <div className="st-row">
        <Party who="alice" title="Alice">
          {k >= 1 && <><Kv k="secret a" who="a">{a}</Kv><Kv k="A = gᵃ">{A}</Kv></>}
          {k >= 5 && <Kv k="K = Bᵃ" who="a"><Hl on={k === 5}>{Ka}</Hl></Kv>}
        </Party>
        <Wire>
          <div className="note" style={{ textAlign: 'center' }}>Educational group only: g = 4, safe prime p = 1019. Not a secure size.</div>
          {k >= 2 && <SMsg dir="Alice → Bob" fresh={k === 2}>A = {A}</SMsg>}
          {k >= 4 && <SMsg dir="Bob → Alice" fresh={k === 4}>B = {B}</SMsg>}
          {k >= 7 && <div className="note">An eavesdropper sees only A and B. {Ka === Kb ? `Both derive K = ${Ka}.` : `The two results differ (${Ka} and ${Kb}).`}</div>}
        </Wire>
        <Party who="bob" title="Bob">
          {k >= 3 && <><Kv k="secret b" who="b">{b}</Kv><Kv k="B = gᵇ">{B}</Kv></>}
          {k >= 6 && <Kv k="K = Aᵇ" who="b"><Hl on={k === 6}>{Kb}</Hl></Kv>}
        </Party>
      </div>
    );
    return framesFrom([
      { status: <>Both agree publicly on p = 1019 and g = 4.</>, line: 0 },
      { status: <>Alice picks a secret a = {a} and computes A = gᵃ = {A}.</>, line: 1 },
      { status: <>She sends A in the clear.</>, line: 2 },
      { status: <>Bob picks b = {b} and computes B = {B}.</>, line: 3 },
      { status: <>He sends B in the clear.</>, line: 4 },
      { status: <>Alice raises B to her secret: K = {Ka}.</>, line: 5 },
      { status: <>Bob raises A to his secret: K = {Kb}.</>, line: 6 },
      { status: Ka === Kb ? <>Both hold the same key K = {Ka}, because (gᵇ)ᵃ = (gᵃ)ᵇ. These parameters are educational, not secure.</> : <>The two calculations disagree: Alice got {Ka} and Bob got {Kb}.</>, line: 7 },
    ], view);
  }, [ab]);
  return (
    <VisPage topicId="dh" code={DH_CODE} frames={frames} actions={[
      { label: 'Choose secrets', form: <DhSecrets a={aD} b={bD} setA={setAD} setB={setBD} onApply={setAb} /> },
      { label: 'Random secrets', form: <Go onClick={() => { const a = rnd(2, 508), b = rnd(2, 508); setAD(a); setBD(b); setAb([a, b]); }}>Randomize</Go> },
    ]} />
  );
}

// ---------- Paillier ----------
const PN = 323n, PN2 = PN * PN, LAM = 144n, MU = BigInt(minv(Number(LAM % PN), Number(PN)));
const pDec = (c: bigint) => (((bigPow(c, LAM, PN2) - 1n) / PN) * MU) % PN;
const pickR = () => { let r: bigint; do { r = BigInt(rnd(2, 322)); } while (r % 17n === 0n || r % 19n === 0n); return r; };
const pEnc = (m: number) => (bigPow(PN + 1n, BigInt(m), PN2) * bigPow(pickR(), PN, PN2)) % PN2;
const HE_CODE = ['KeyGen: n = 17·19 = 323, λ = 144', 'Enc(m) = (n+1)^m · r^n  mod n²', 'Alice sends c1 = Enc(m1), c2 = Enc(m2)', 'Bob: c_sum ← c1 · c2  mod n²', 'Bob: c_k ← c1^k  mod n²', 'Bob sends c_sum, c_k', 'Alice: Dec(c_sum) = m1 + m2', 'Alice: Dec(c_k) = k · m1'];
export function PaillierVis() {
  const [vals, setVals] = useState<[number, number, number]>([25, 17, 3]);
  const [d, setD] = useState<[number, number, number]>([25, 17, 3]);
  const frames = useMemo(() => {
    const [m1, m2, k] = vals, c1 = pEnc(m1), c2 = pEnc(m2), cs = (c1 * c2) % PN2, ck = bigPow(c1, BigInt(k), PN2);
    const view = (st: number) => (
      <div className="st-row">
        <Party who="alice" title="Alice (key holder)">
          <Kv k="m₁, m₂" who="a">{m1}, {m2}</Kv>
          {st >= 1 && <><Kv k="c₁">{String(c1)}</Kv><Kv k="c₂">{String(c2)}</Kv></>}
          {st >= 6 && <Kv k="Dec(c₁·c₂)" who="a"><Hl on={st === 6}>{String(pDec(cs))}</Hl></Kv>}
          {st >= 7 && <Kv k="Dec(c₁ᵏ)" who="a"><Hl on={st === 7}>{String(pDec(ck))}</Hl></Kv>}
        </Party>
        <Wire title="Ciphertexts">
          {st >= 2 && <SMsg dir="Alice → Bob" fresh={st === 2}>c₁ = {String(c1)}, c₂ = {String(c2)}</SMsg>}
          {st >= 5 && <SMsg dir="Bob → Alice" fresh={st === 5}>c₁·c₂ = {String(cs)}, c₁ᵏ = {String(ck)}</SMsg>}
        </Wire>
        <Party who="bob" title="Bob (no key)">
          {st >= 3 && <Kv k="c₁·c₂ mod n²"><Hl on={st === 3}>{String(cs)}</Hl></Kv>}
          {st >= 4 && <Kv k={`c₁^${k} mod n²`}><Hl on={st === 4}>{String(ck)}</Hl></Kv>}
          <div className="note">Bob only multiplies numbers; he never sees m₁ or m₂.</div>
        </Party>
      </div>
    );
    return framesFrom([
      { status: <>Alice has a toy Paillier key with n = 323.</>, line: 0 },
      { status: <>She encrypts m₁ = {m1} and m₂ = {m2}; fresh randomness r makes each ciphertext look random.</>, line: 1 },
      { status: <>She sends both ciphertexts to Bob.</>, line: 2 },
      { status: <>Multiplying ciphertexts adds the plaintexts underneath.</>, line: 3 },
      { status: <>Raising a ciphertext to k multiplies its plaintext by k = {k}.</>, line: 4 },
      { status: <>Bob returns the results, still encrypted.</>, line: 5 },
      { status: <>Alice decrypts the product: {String(pDec(cs))} = {m1} + {m2} mod 323.</>, line: 6 },
      { status: <>And the power: {String(pDec(ck))} = {k}·{m1} mod 323.</>, line: 7 },
    ], view);
  }, [vals]);
  return (
    <VisPage topicId="he" code={HE_CODE} frames={frames} actions={[
      { label: 'Messages and k', form: <>m₁ <input type="number" value={d[0]} onChange={e => setD([+e.target.value, d[1], d[2]])} /> m₂ <input type="number" value={d[1]} onChange={e => setD([d[0], +e.target.value, d[2]])} /> k <input type="number" value={d[2]} onChange={e => setD([d[0], d[1], +e.target.value])} /><Go onClick={() => setVals([mod(d[0], 323), mod(d[1], 323), Math.max(0, Math.min(50, d[2]))])} /></> },
    ]} />
  );
}

// ---------- zero-knowledge cave ----------
const ZK_CODE = ['repeat N rounds:', '  Peggy enters side A or B at random (hidden)', '  Victor shouts a random side', '  if Peggy knows the password: she opens the door if needed', '  Victor checks she exits on the shouted side', '  a cheater fails with probability 1/2', 'accept if all N rounds passed'];
export function ZkVis() {
  const [mode, setMode] = useState<'honest' | 'cheat'>('honest');
  const [N, setN] = useState(8), [nD, setND] = useState(8), [nonce, setNonce] = useState(0);
  const frames = useMemo(() => {
    const rounds: { side: 'A' | 'B'; ch: 'A' | 'B'; ok: boolean }[] = [];
    for (let i = 0; i < N; i++) {
      const side = Math.random() < 0.5 ? 'A' : 'B', ch = Math.random() < 0.5 ? 'A' : 'B';
      rounds.push({ side, ch, ok: mode === 'honest' || side === ch });
      if (!rounds[i].ok) break;
    }
    const cave = (r?: (typeof rounds)[number], phase = 0) => {
      const pos = !r ? [150, 185] : phase === 0 ? (r.side === 'A' ? [95, 70] : [205, 70]) : r.ok ? (r.ch === 'A' ? [120, 175] : [180, 175]) : (r.side === 'A' ? [95, 70] : [205, 70]);
      return (
        <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: 380 }}>
          <path d="M150 190 L150 160 M150 160 C60 160 50 30 150 30 C250 30 240 160 150 160" fill="none" stroke="#cfd6de" strokeWidth={26} strokeLinecap="round" />
          <rect x={143} y={18} width={14} height={24} fill="var(--bad)" rx={2} />
          <text x={40} y={100} fontSize={13} fill="var(--muted)">A</text><text x={252} y={100} fontSize={13} fill="var(--muted)">B</text>
          <circle cx={pos[0]} cy={pos[1]} r={10} fill="var(--alice-main)" style={{ transition: 'all .5s' }} />
          <rect x={128} y={186} width={44} height={12} rx={3} fill="var(--bob-main)" /><text x={150} y={195} fontSize={9} textAnchor="middle" fill="#fff">Victor</text>
          {r && phase === 1 && <text x={150} y={110} fontSize={14} textAnchor="middle" fill="var(--ink)">“Come out of {r.ch}!”</text>}
          {r && phase === 2 && <text x={150} y={115} fontSize={20} textAnchor="middle" fill={r.ok ? 'var(--ok)' : 'var(--bad)'}>{r.ok ? '✓' : '✗ caught'}</text>}
        </svg>
      );
    };
    const steps: { status: React.ReactNode; line: number | number[]; stage: React.ReactNode }[] = [];
    const tally = (k: number, alive: boolean) => <div className="st-party" style={{ flex: '0 1 280px' }}><h4>Victor's tally</h4><Kv k="rounds passed">{k}</Kv><Kv k="chance a cheater gets this far">{(2 ** -k).toPrecision(3)}</Kv>{!alive && <div className="bad">Cheater caught.</div>}</div>;
    steps.push({ status: <>Peggy claims to know the password. {mode === 'cheat' ? '(She is actually cheating.)' : ''}</>, line: 0, stage: <div className="st-row">{cave()}{tally(0, true)}</div> });
    rounds.forEach((r, i) => {
      const passed = rounds.slice(0, i).length;
      steps.push({ status: <>Round {i + 1}: Peggy walks in on side <S a>{r.side}</S> while Victor waits outside.</>, line: 1, stage: <div className="st-row">{cave(r, 0)}{tally(passed, true)}</div> });
      steps.push({ status: <>Victor shouts “{r.ch}”.</>, line: 2, stage: <div className="st-row">{cave(r, 1)}{tally(passed, true)}</div> });
      steps.push({ status: r.ok ? <>She comes out of {r.ch}{mode === 'honest' && r.side !== r.ch ? ' by unlocking the door' : ''}.</> : <>She entered {r.side} and can't pass the door: caught.</>, line: r.ok ? [3, 4] : 5, stage: <div className="st-row">{cave(r, 2)}{tally(passed + (r.ok ? 1 : 0), r.ok)}</div> });
    });
    const all = rounds.every(r => r.ok);
    steps.push({ status: all ? <>All {rounds.length} rounds passed. A cheater would have survived with probability {(2 ** -rounds.length).toPrecision(3)}.</> : <>Victor rejects. An honest prover never fails a round.</>, line: 6, stage: steps[steps.length - 1].stage });
    return steps;
  }, [mode, N, nonce]);
  return (
    <VisPage topicId="zk" code={ZK_CODE} frames={frames} actions={[
      { label: 'Prover', form: <><Seg value={mode} onChange={setMode} options={[['honest', 'Knows password'], ['cheat', 'Cheating']]} /><Go onClick={() => setNonce(x => x + 1)}>Run</Go></> },
      { label: 'Rounds N', form: <><input type="number" min={1} max={20} value={nD} onChange={e => setND(+e.target.value)} /><Go onClick={() => setN(Math.max(1, Math.min(20, nD)))} /></> },
    ]} />
  );
}
