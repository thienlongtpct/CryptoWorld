import { useEffect, useMemo, useState } from 'react';
import { G, P, bigPow, hex, h32, minv, mod, mpow, rnd } from '../lib/crypto';
import { Kv, Lab, Msg, Pv, S, Seg, useNonce } from '../components/ui';

// ---------- Shamir secret sharing over F_97 ----------
export function SecretSharing() {
  const p = 97;
  const [s, setS] = useState(42), [n, setN] = useState(5), [t, setT] = useState(3);
  const [nonce, bump] = useNonce();
  const [sel, setSel] = useState<Set<number>>(new Set([1, 2]));
  // Random coefficients for x^1 … x^(t-1), redrawn when t, n or the nonce change; the constant term is the secret.
  const tail = useMemo(() => Array.from({ length: t - 1 }, () => rnd(0, p - 1)), [t, n, nonce]);
  const coef = [s, ...tail];
  const f = (x: number) => coef.reduce((acc, c, i) => mod(acc + c * mpow(x, i, p), p), 0);
  const shares = Array.from({ length: n }, (_, i) => [i + 1, f(i + 1)] as [number, number]);
  const pts = shares.filter(([x]) => sel.has(x));
  const ok = pts.length >= t;
  const lagrange0 = (ps: [number, number][]) => ps.reduce((acc, [xj, yj]) => {
    let num = 1, den = 1;
    ps.forEach(([xm]) => { if (xm !== xj) { num = (num * mod(-xm, p)) % p; den = (den * mod(xj - xm, p)) % p; } });
    return mod(acc + yj * num * minv(den, p), p);
  }, 0);
  const rec = ok ? lagrange0(pts.slice(0, t)) : null;
  const toggle = (x: number) => setSel(old => { const nx = new Set(old); nx.has(x) ? nx.delete(x) : nx.add(x); return nx; });
  const Xc = (x: number) => 50 + x * (560 / n), Yc = (y: number) => 190 - y * 1.7;

  return (
    <Lab title="Shamir over 𝔽₉₇" toy>
      <div className="controls">
        <label>secret s <input type="range" min={0} max={96} value={s} onChange={e => setS(+e.target.value)} /><span className="val">{s}</span></label>
        <label>parties n <input type="range" min={2} max={7} value={n} onChange={e => { const v = +e.target.value; setN(v); setT(x => Math.min(x, v)); setSel(o => new Set([...o].filter(x => x <= v))); }} /><span className="val">{n}</span></label>
        <label>threshold t <input type="range" min={1} max={n} value={t} onChange={e => setT(+e.target.value)} /><span className="val">{t}</span></label>
        <button className="btn ghost" onClick={bump}>New random polynomial</button>
      </div>
      <p className="note">Click shares to hand them to the reconstruction box.</p>
      <div className="scroll-x">
        <svg viewBox="0 0 640 220" style={{ width: '100%', minWidth: 480, height: 'auto' }}>
          <line x1={40} y1={190} x2={630} y2={190} stroke="var(--line)" /><line x1={40} y1={20} x2={40} y2={190} stroke="var(--line)" />
          {[0, 48, 96].map(v => <text key={v} x={34} y={Yc(v) + 3} fontSize={10} textAnchor="end" fill="var(--muted)">{v}</text>)}
          {Array.from({ length: n + 1 }, (_, x) => <text key={x} x={Xc(x)} y={206} fontSize={10} textAnchor="middle" fill="var(--muted)">{x === 0 ? 'x=0 (secret)' : 'party ' + x}</text>)}
          {shares.map(([x, y]) => {
            const on = sel.has(x);
            return (
              <g key={x} style={{ cursor: 'pointer' }} onClick={() => toggle(x)}>
                <line x1={Xc(x)} y1={190} x2={Xc(x)} y2={Yc(y)} stroke={on ? 'var(--accent)' : 'var(--line)'} strokeWidth={3} />
                <circle cx={Xc(x)} cy={Yc(y)} r={7} fill={on ? 'var(--accent)' : 'var(--surface)'} stroke="var(--accent)" strokeWidth={2} />
                <text x={Xc(x)} y={Yc(y) - 12} fontSize={11} textAnchor="middle" fill="var(--ink)">{y}</text>
              </g>
            );
          })}
          {rec !== null
            ? <><circle cx={Xc(0)} cy={Yc(rec)} r={8} fill="var(--ok)" /><text x={Xc(0) + 12} y={Yc(rec) + 4} fontSize={12} fill="var(--ok)">{rec}</text></>
            : <text x={Xc(0)} y={100} fontSize={22} textAnchor="middle" fill="var(--muted)">?</text>}
        </svg>
      </div>
      <div className="grid-cells">
        {shares.map(([x, y]) => <button key={x} className="chip" aria-pressed={sel.has(x)} onClick={() => toggle(x)}>share {x}: ({x}, {y})</button>)}
      </div>
      <Pv who="wire" title={`Reconstruction box: ${pts.length} share(s) ${ok ? '≥' : '<'} t = ${t}`}>
        {ok ? (
          <>
            <div>Lagrange interpolation at x = 0 gives <span className="val ok">{rec}</span> {rec === s && <span className="ok">✓ the secret</span>}</div>
            <div className="note">Polynomial f(x) = {coef.map((c, i) => i === 0 ? c : `${c}·x${i > 1 ? '^' + i : ''}`).join(' + ')} mod 97</div>
          </>
        ) : (
          <div>For every candidate secret s′ ∈ {'{0,…,96}'} there is exactly one degree-{t - 1} polynomial through (0, s′) and your {pts.length} point(s). All 97 secrets remain equally likely, so the shares reveal <b>nothing</b>.</div>
        )}
      </Pv>
    </Lab>
  );
}

// ---------- hash commitment with SHA-256 ----------
async function sha256(s: string): Promise<string> {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  } catch {
    return [1, 2, 3, 4, 5, 6, 7, 8].map(i => hex(h32(i + s), 8)).join('');
  }
}
const newNonce = () => Array.from({ length: 4 }, () => hex(rnd(0, 0xffffffff), 8)).join('');

export function Commitment() {
  const [v, setV] = useState('heads');
  const [r, setR] = useState(newNonce);
  const [c, setC] = useState<string | null>(null);
  const [committed, setCommitted] = useState<{ v: string; r: string } | null>(null);
  const [v2, setV2] = useState('heads');
  const [res, setRes] = useState<{ h: string; ok: boolean } | null>(null);
  const commit = async () => {
    const nr = newNonce();
    setR(nr); setCommitted({ v, r: nr }); setC(await sha256(v + '|' + nr)); setV2(v); setRes(null);
  };
  useEffect(() => { commit(); }, []);
  const open = async () => {
    if (!committed || !c) return;
    const h = await sha256(v2 + '|' + committed.r);
    setRes({ h, ok: h === c });
  };
  return (
    <Lab title="Hash commitment with SHA-256" secret>
      <div className="parties three">
        <Pv who="alice" title="Alice">
          <label className="kv"><span>value v</span><input type="text" value={v} onChange={e => setV(e.target.value)} style={{ width: '9em' }} /></label>
          <Kv k="nonce r" who="a">{r}</Kv>
          <button className="btn" onClick={commit}>Commit</button>
        </Pv>
        <Pv who="wire" title="Channel"><Msg dir="Alice → Bob"><span className="val">{c ? 'c = ' + c : '—'}</span></Msg></Pv>
        <Pv who="bob" title="Bob">
          <div className="note">Alice now tries to open. Change the value to try cheating.</div>
          <label className="kv"><span>claimed v</span><input type="text" value={v2} onChange={e => setV2(e.target.value)} style={{ width: '9em' }} /></label>
          <button className="btn" onClick={open}>Open &amp; verify</button>
          <div className="val">
            {!res ? <span className="note">Commitment received. Bob can't tell what is inside.</span> : (
              <>
                <div className="note">H("{v2}" ‖ r) = {res.h.slice(0, 24)}…</div>
                {res.ok ? <span className="ok">✓ Opens correctly to "{v2}"</span> : <span className="bad">✗ Rejected: doesn't match c. Binding stopped the cheat.</span>}
              </>
            )}
          </div>
        </Pv>
      </div>
    </Lab>
  );
}

// ---------- Diffie–Hellman in the squares mod 1019 ----------
export function DiffieHellman() {
  const [a, setA] = useState(123), [b, setB] = useState(321);
  const A = mpow(G, a, P), B = mpow(G, b, P);
  return (
    <Lab title="Group: squares mod p = 1019, q = 509, g = 4" toy secret>
      <div className="parties three">
        <Pv who="alice" title="Alice">
          <label className="kv"><span>secret a</span><input type="range" min={1} max={508} value={a} onChange={e => setA(+e.target.value)} /></label>
          <Kv k="a" who="a">{a}</Kv>
          <Kv k={<>key (g<sup>b</sup>)<sup>a</sup></>} who="a">{mpow(B, a, P)}</Kv>
        </Pv>
        <Pv who="wire" title="Public wire">
          <Msg dir="A → B"><span>g<sup>a</sup> = <span className="val">{A}</span></span></Msg>
          <Msg dir="B → A"><span>g<sup>b</sup> = <span className="val">{B}</span></span></Msg>
        </Pv>
        <Pv who="bob" title="Bob">
          <label className="kv"><span>secret b</span><input type="range" min={1} max={508} value={b} onChange={e => setB(+e.target.value)} /></label>
          <Kv k="b" who="b">{b}</Kv>
          <Kv k={<>key (g<sup>a</sup>)<sup>b</sup></>} who="b">{mpow(A, b, P)}</Kv>
        </Pv>
      </div>
    </Lab>
  );
}

// ---------- Paillier with n = 17 × 19 ----------
const PN = 323n, PN2 = PN * PN, PG = PN + 1n, LAM = 144n;
const MU = BigInt(minv(Number(LAM % PN), Number(PN)));
const pDec = (c: bigint) => (((bigPow(c, LAM, PN2) - 1n) / PN) * MU) % PN;
const pickR = () => { let r: bigint; do { r = BigInt(rnd(2, 322)); } while (r % 17n === 0n || r % 19n === 0n); return r; };
const pEnc = (m: number) => (bigPow(PG, BigInt(m), PN2) * bigPow(pickR(), PN, PN2)) % PN2;

export function Paillier() {
  const [m1, setM1] = useState(25), [m2, setM2] = useState(17), [k, setK] = useState(3);
  const [nonce, bump] = useNonce();
  const a = mod(m1 || 0, 323), b = mod(m2 || 0, 323), kk = Math.max(0, k || 0);
  const [c1, c2] = useMemo(() => [pEnc(a), pEnc(b)], [a, b, nonce]); // fresh randomness per change
  const cs = (c1 * c2) % PN2, ck = bigPow(c1, BigInt(kk), PN2);
  return (
    <Lab title="Paillier with n = 17 × 19 = 323" toy secret>
      <div className="controls">
        <label>m₁ <input type="number" min={0} max={322} value={m1} onChange={e => setM1(+e.target.value)} /></label>
        <label>m₂ <input type="number" min={0} max={322} value={m2} onChange={e => setM2(+e.target.value)} /></label>
        <label>scalar k <input type="number" min={0} max={50} value={k} onChange={e => setK(+e.target.value)} /></label>
        <button className="btn ghost" onClick={bump}>Re-encrypt (new randomness)</button>
      </div>
      <div className="parties three">
        <Pv who="alice" title="Alice (key holder)">
          <Kv k="m₁, m₂" who="a">{a}, {b}</Kv>
          <Kv k="Dec(c₁·c₂)" who="a">{String(pDec(cs))} <span className="ok">= {a} + {b} mod 323</span></Kv>
          <Kv k="Dec(c₁ᵏ)" who="a">{String(pDec(ck))} <span className="ok">= {kk}·{a} mod 323</span></Kv>
        </Pv>
        <Pv who="wire" title="Ciphertexts (mod n²)">
          <Kv k="c₁">{String(c1)}</Kv><Kv k="c₂">{String(c2)}</Kv>
        </Pv>
        <Pv who="bob" title="Bob (no key)">
          <Kv k="c₁·c₂">{String(cs)}</Kv><Kv k="c₁ᵏ">{String(ck)}</Kv>
          <div className="note">Bob never decrypts; he only multiplies numbers.</div>
        </Pv>
      </div>
    </Lab>
  );
}

// ---------- zero-knowledge cave ----------
type Round = { side: 'L' | 'R'; ch: 'L' | 'R'; ok: boolean };
export function ZkCave() {
  const [mode, setMode] = useState<'honest' | 'cheat'>('honest');
  const [log, setLog] = useState<Round[]>([]);
  const alive = log.every(r => r.ok);
  const last = log[log.length - 1];
  const run = (times: number) => setLog(old => {
    const out = [...old];
    for (let i = 0; i < times && out.every(r => r.ok); i++) {
      const side = Math.random() < 0.5 ? 'L' : 'R', ch = Math.random() < 0.5 ? 'L' : 'R';
      out.push({ side, ch, ok: mode === 'honest' || side === ch });
    }
    return out;
  });
  const passed = log.filter(r => r.ok).length, pr = Math.pow(2, -log.length);
  const pos = last ? (last.ok ? (last.ch === 'L' ? [120, 175] : [180, 175]) : (last.side === 'L' ? [95, 70] : [205, 70])) : [150, 185];
  const name = (x: 'L' | 'R') => (x === 'L' ? 'A' : 'B');
  return (
    <Lab title="Interactive proof, one round per click">
      <div className="controls">
        <Seg value={mode} onChange={m => { setMode(m); setLog([]); }} options={[['honest', 'Peggy knows password'], ['cheat', 'Peggy is cheating']]} />
        <button className="btn" onClick={() => run(1)}>Run 1 round</button>
        <button className="btn ghost" onClick={() => run(10)}>Run 10</button>
        <button className="btn ghost" onClick={() => setLog([])}>Reset</button>
      </div>
      <div className="parties">
        <div className="scroll-x">
          <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: 340, height: 'auto' }}>
            <path d="M150 190 L150 160 M150 160 C60 160 50 30 150 30 C250 30 240 160 150 160" fill="none" stroke="var(--line)" strokeWidth={26} strokeLinecap="round" />
            <rect x={143} y={18} width={14} height={24} fill="var(--bad)" rx={2} />
            <text x={150} y={12} fontSize={10} textAnchor="middle" fill="var(--muted)">locked door</text>
            <text x={40} y={100} fontSize={12} fill="var(--muted)">A</text><text x={252} y={100} fontSize={12} fill="var(--muted)">B</text>
            <circle cx={pos[0]} cy={pos[1]} r={9} fill="var(--alice-main)" style={{ transition: 'all .4s' }} />
            <rect x={128} y={186} width={44} height={12} rx={3} fill="var(--bob-main)" /><text x={150} y={195} fontSize={9} textAnchor="middle" fill="#fff">Victor</text>
            {last && <text x={150} y={128} fontSize={16} textAnchor="middle" fill={last.ok ? 'var(--ok)' : 'var(--bad)'}>{last.ok ? '✓' : '✗ caught'}</text>}
          </svg>
        </div>
        <Pv who="wire" title="Victor's verdict">
          <Kv k="rounds passed">{passed}</Kv>
          <Kv k="chance a cheater survives this far">{alive ? (pr < 1e-4 ? pr.toExponential(2) : pr.toFixed(4)) : '—'}</Kv>
          <div>{alive ? (log.length ? `Victor is ${(100 * (1 - pr)).toFixed(log.length > 9 ? 2 : 1)}% convinced.` : 'Run a round.') : <span className="bad">Cheater caught. A real prover never fails.</span>}</div>
          <div className="note">Victor's transcript is just random A/B challenges and matching exits, which he could have produced alone. That's why he learns nothing about the password.</div>
          <div style={{ maxHeight: '9em', overflow: 'auto' }}>
            {[...log].reverse().map((r, i) => (
              <div key={log.length - i}>Round {log.length - i}: Peggy entered <S a>{name(r.side)}</S>, Victor shouts <b>{name(r.ch)}</b> → {r.ok ? <span className="ok">came out of {name(r.ch)}</span> : <span className="bad">stuck behind the door</span>}</div>
            ))}
          </div>
        </Pv>
      </div>
    </Lab>
  );
}
