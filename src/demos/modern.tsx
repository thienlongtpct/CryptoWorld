import { useEffect, useMemo, useRef, useState } from 'react';
import { bigPow, hex, minv, mod, rnd, spn, spnTrace } from '../lib/crypto';
import { Kv, Lab, Pv, Seg } from '../components/ui';

export const MODERN_TIMELINE: [string, string, string][] = [
  ['1949', 'Shannon', 'Puts secrecy on an information-theoretic footing.'],
  ['1976', 'Diffie–Hellman', 'New Directions in Cryptography introduces public-key key exchange.'],
  ['1977', 'DES & RSA', 'DES becomes a US standard; Rivest, Shamir and Adleman publish RSA.'],
  ['1982', 'Provable security', 'Goldwasser–Micali define semantic security; Yao poses secure two-party computation.'],
  ['1985', 'ECC & zero knowledge', 'Miller and Koblitz propose elliptic-curve cryptography; Goldwasser, Micali and Rackoff define zero-knowledge proofs.'],
  ['2001', 'AES & SHA-2', 'Rijndael is standardised as AES; the SHA-2 hash family is published.'],
  ['2009', 'Gentry', 'First fully homomorphic encryption scheme.'],
  ['2018', 'TLS 1.3', "The web's main protocol drops legacy ciphers and requires forward secrecy."],
  ['2024', 'Post-quantum', 'NIST standardises lattice-based ML-KEM and ML-DSA.'],
];

const popcount = (x: number) => x.toString(2).split('1').length - 1;

// ---------- block cipher avalanche ----------
const ROUND_NAMES = ['plaintext', 'after round 1', 'after round 2', 'after round 3', 'after round 4', 'ciphertext'];
export function Avalanche() {
  const [key, setKey] = useState(() => rnd(0, 0xffff)), [a, setA] = useState(() => rnd(0, 0xffff)), [flip, setFlip] = useState(3);
  const ta = spnTrace(a, key), tb = spnTrace(a ^ (1 << flip), key);
  const Bits = ({ v, d, click }: { v: number; d: number; click?: boolean }) => (
    <span className="bitrow">
      {Array.from({ length: 16 }, (_, i) => {
        const bit = 15 - i, on = (v >>> bit) & 1, df = (d >>> bit) & 1;
        return <span key={i} className={`bit ${on ? 'one' : ''} ${df ? 'diff' : ''}`} style={click ? { cursor: 'pointer' } : undefined} title={click ? `flip bit ${bit}` : undefined} onClick={click ? () => setFlip(bit) : undefined}>{on}</span>;
      })}
    </span>
  );
  return (
    <Lab title="Toy 16-bit SPN, 4 rounds" toy>
      <div className="controls"><span>Click a bit of plaintext B to flip it.</span><button className="btn ghost" onClick={() => setKey(rnd(0, 0xffff))}>New key</button><button className="btn ghost" onClick={() => setA(rnd(0, 0xffff))}>New plaintext</button></div>
      <div className="scroll-x">
        <table className="spn"><thead><tr><th /><th>A</th><th>B (one bit flipped)</th><th>bits that differ</th></tr></thead>
          <tbody>{ta.map((va, r) => {
            const d = va ^ tb[r], cnt = popcount(d);
            return <tr key={r}><th>{ROUND_NAMES[r]}</th><td><Bits v={va} d={d} /></td><td><Bits v={tb[r]} d={d} click={r === 0} /></td><td><span className="dbar"><span style={{ width: `${(cnt / 16) * 100}%` }} /></span> <b>{cnt}</b>/16</td></tr>;
          })}</tbody>
        </table>
        <div className="note">Key {hex(key, 4)}. Averaged over many inputs a good cipher flips 8 of 16 bits; this toy gets close after 3–4 rounds.</div>
      </div>
    </Lab>
  );
}

// ---------- modes of operation on a picture ----------
const N = 64;
export function sourceImage(kind: 'lock' | 'text'): Uint8Array {
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, N, N);
  if (kind === 'lock') {
    g.strokeStyle = '#7a7a7a'; g.lineWidth = 7; g.beginPath(); g.arc(32, 28, 13, Math.PI, 0); g.lineTo(45, 34); g.moveTo(19, 28); g.lineTo(19, 34); g.stroke();
    g.fillStyle = '#262626'; g.fillRect(12, 32, 40, 26); g.fillStyle = '#e6e6e6'; g.fillRect(29, 40, 6, 10);
  } else {
    g.fillStyle = '#262626'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('ECB', 32, 30);
    g.fillStyle = '#7a7a7a'; g.fillText('MODE', 32, 56);
  }
  const d = g.getImageData(0, 0, N, N).data, px = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) { const v = d[i * 4]; px[i] = v < 80 ? 0x26 : v < 170 ? 0x7a : 0xe6; } // 3 grey levels so equal blocks really repeat
  return px;
}
export function Pixels({ px, caption }: { px: Uint8Array; caption: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current!.getContext('2d')!, im = g.createImageData(N, N);
    px.forEach((v, i) => im.data.set([v, v, v, 255], i * 4));
    g.putImageData(im, 0, 0);
  }, [px]);
  return <figure><canvas ref={ref} width={N} height={N} /><figcaption>{caption}</figcaption></figure>;
}
export function Modes() {
  const [key, setKey] = useState(() => rnd(0, 0xffff)), [img, setImg] = useState<'lock' | 'text'>('lock');
  const out = useMemo(() => {
    const px = sourceImage(img), blocks: number[] = [];
    for (let i = 0; i < px.length; i += 2) blocks.push((px[i] << 8) | px[i + 1]);
    const toPx = (arr: number[]) => { const o = new Uint8Array(N * N); arr.forEach((b, i) => { o[2 * i] = b >>> 8; o[2 * i + 1] = b & 0xff; }); return o; };
    let prev = rnd(0, 0xffff);
    const nonce = rnd(0, 0xffff);
    return {
      px,
      ecb: toPx(blocks.map(b => spn(b, key))),
      cbc: toPx(blocks.map(b => (prev = spn(b ^ prev, key)))),
      ctr: toPx(blocks.map((b, i) => b ^ spn((nonce + i) & 0xffff, key))),
    };
  }, [key, img]);
  return (
    <Lab>
      <div className="controls"><button className="btn ghost" onClick={() => setKey(rnd(0, 0xffff))}>New key</button><Seg value={img} onChange={setImg} options={[['lock', 'Padlock'], ['text', 'Text']]} /></div>
      <div className="modes">
        <Pixels px={out.px} caption="Plaintext image" />
        <Pixels px={out.ecb} caption="ECB: outline leaks" />
        <Pixels px={out.cbc} caption="CBC (random IV)" />
        <Pixels px={out.ctr} caption="CTR (random nonce)" />
      </div>
    </Lab>
  );
}

// ---------- SHA-256 avalanche ----------
async function sha256Bytes(s: string) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
const toHex = (u: Uint8Array) => [...u].map(x => x.toString(16).padStart(2, '0')).join('');
export function HashAvalanche() {
  const [a, setA] = useState('Pay Bob 100 dollars'), [b, setB] = useState('Pay Bob 900 dollars');
  const [h, setH] = useState<[Uint8Array, Uint8Array] | null | 'na'>(null);
  useEffect(() => {
    let live = true;
    Promise.all([sha256Bytes(a), sha256Bytes(b)]).then(r => live && setH(r as [Uint8Array, Uint8Array])).catch(() => live && setH('na'));
    return () => { live = false; };
  }, [a, b]);
  const bit = (u: Uint8Array, i: number) => (u[i >> 3] >> (7 - (i & 7))) & 1;
  const diff = h && h !== 'na' ? Array.from({ length: 256 }, (_, i) => bit(h[0], i) !== bit(h[1], i)) : [];
  const nd = diff.filter(Boolean).length;
  return (
    <Lab>
      <div className="parties">
        <label className="pv wire"><h4>Input A</h4><input type="text" value={a} onChange={e => setA(e.target.value)} /></label>
        <label className="pv wire"><h4>Input B</h4><input type="text" value={b} onChange={e => setB(e.target.value)} /></label>
      </div>
      {h === 'na' ? <div className="note">SHA-256 is unavailable in this browser context.</div> : h && <>
        <div className="parties">
          <Pv who="wire" title="SHA-256(A)"><div className="mono hexout">{toHex(h[0])}</div></Pv>
          <Pv who="wire" title="SHA-256(B)"><div className="mono hexout">{toHex(h[1])}</div></Pv>
        </div>
        <div className="hash-wrap">
          <div className="hgrid" aria-label="256 output bits; differing bits highlighted">{diff.map((d, i) => <span key={i} className={d ? 'hd' : bit(h[0], i) ? 'h1' : ''} />)}</div>
          <Pv who="wire" title={`${nd} of 256 bits differ`}>
            <div className="dbar big"><span style={{ width: `${(nd / 256) * 100}%` }} /></div>
            <div className="note">{a === b ? 'Identical inputs give identical digests: hashing is deterministic.' : `That is ${(nd / 2.56).toFixed(1)}%; an ideal hash flips each bit with probability ½, so expect about 128.`} Orange squares mark differing bits.</div>
          </Pv>
        </div>
      </>}
    </Lab>
  );
}

// ---------- textbook RSA ----------
const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const rpow = (b: number, e: number, m: number) => Number(bigPow(BigInt(b), BigInt(e), BigInt(m)));
export function Rsa() {
  const [p, setP] = useState(61), [q, setQ] = useState(53), [e0, setE] = useState(17), [mIn, setM] = useState(65), [tIn, setT] = useState<number | null>(null);
  const n = p * q, phi = (p - 1) * (q - 1);
  const es = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37].filter(x => x < phi && gcd(x, phi) === 1);
  const e = es.includes(e0) ? e0 : es.includes(17) ? 17 : es[0];
  const d = minv(e, phi), m = mod(mIn || 0, n), c = rpow(m, e, n), m2 = rpow(c, d, n), s = rpow(m, d, n);
  const t = mod(tIn ?? m, n), v = rpow(s, e, n);
  const select = (val: number, set: (x: number) => void, opts: number[]) => (
    <select value={val} onChange={x => { set(+x.target.value); setT(null); }}>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select>
  );
  return (
    <Lab title="Textbook RSA" toy="TOY · NO PADDING" secret>
      <div className="controls">
        <label>p {select(p, setP, PRIMES)}</label><label>q {select(q, setQ, PRIMES)}</label><label>e {select(e, setE, es)}</label>
        <label>message m <input type="number" min={0} value={mIn} onChange={x => { setM(+x.target.value); setT(null); }} /></label>
      </div>
      {p === q ? <Pv who="alice" title="Key generation"><div className="bad">Choose two different primes; p = q makes n a square and φ(n) wrong.</div></Pv> : (
        <div className="parties three">
          <Pv who="alice" title="Key generation">
            <Kv k="n = p·q">{n}</Kv><Kv k="φ(n) = (p−1)(q−1)" who="a">{phi}</Kv><Kv k="public key">(n = {n}, e = {e})</Kv><Kv k="private d = e⁻¹ mod φ" who="a">{d}</Kv>
            <div className="note">Check: e·d = {e * d} ≡ 1 (mod {phi}).</div>
          </Pv>
          <Pv who="wire" title="Encrypt with the public key">
            <Kv k="message m">{m}</Kv><Kv k={`c = m^${e} mod ${n}`}>{c}</Kv>
            <h4 style={{ marginTop: 10 }}>Decrypt with the private key</h4>
            <Kv k={`c^${d} mod ${n}`}>{m2} {m2 === m ? '✓' : '✗'}</Kv>
            {mIn >= n && <div className="note">m was reduced mod n = {n}.</div>}
          </Pv>
          <Pv who="bob" title="Sign with the private key">
            <Kv k={`s = m^${d} mod ${n}`}>{s}</Kv>
            <h4 style={{ marginTop: 10 }}>Anyone verifies with (n, e)</h4>
            <label className="kv"><span>message received</span><input type="number" value={t} onChange={x => setT(+x.target.value)} style={{ width: '6em' }} /></label>
            <Kv k={`s^${e} mod ${n}`}>{v}</Kv>
            <div className={v === t ? 'ok' : 'bad'}>{v === t ? '✓ Signature valid for this message' : '✗ Invalid: the message was altered'}</div>
            <div className="note">Change "message received" to simulate tampering. Real RSA hashes and pads the message first.</div>
          </Pv>
        </div>
      )}
    </Lab>
  );
}

// ---------- elliptic curve y² = x³ + 2x + 3 over F_97 ----------
export type Pt = [number, number] | null;
export const EP = 97, EA = 2, EB = 3;
export const POINTS: [number, number][] = [];
for (let x = 0; x < EP; x++) for (let y = 0; y < EP; y++) if (mod(y * y - (x * x * x + EA * x + EB), EP) === 0) POINTS.push([x, y]);
const same = (a: Pt, b: Pt) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
export const slope = (p: [number, number], q: [number, number]) => same(p, q)
  ? mod((3 * p[0] * p[0] + EA) * minv(2 * p[1], EP), EP)
  : mod((q[1] - p[1]) * minv(q[0] - p[0], EP), EP);
export function add(p: Pt, q: Pt): Pt {
  if (!p) return q; if (!q) return p;
  if (p[0] === q[0] && mod(p[1] + q[1], EP) === 0) return null;
  const l = slope(p, q), x = mod(l * l - p[0] - q[0], EP);
  return [x, mod(l * (p[0] - x) - p[1], EP)];
}
export const orderOf = (t: [number, number]) => { let n = 1, u: Pt = t; while (u && n < 200) { u = add(u, t); n++; } return n; };
export const GEN = POINTS.reduce((best, t) => (orderOf(t) > orderOf(best) ? t : best), POINTS[0]);

export function EllipticCurve() {
  const [mode, setMode] = useState<'add' | 'mul'>('add');
  const [P, setP] = useState<[number, number]>(GEN), [Q, setQ] = useState<[number, number]>(POINTS[Math.floor(POINTS.length / 2)]);
  const [next, setNext] = useState<'P' | 'Q'>('P'), [k, setK] = useState(7);
  const S = 300 / EP, X = (x: number) => 25 + x * S, Y = (y: number) => 315 - y * S;
  const pick = (t: [number, number]) => { if (mode === 'mul') setP(t); else if (next === 'P') { setP(t); setNext('Q'); } else { setQ(t); setNext('P'); } };
  const mark = (t: Pt, col: string, r: number, lab: string) => t && <g><circle cx={X(t[0])} cy={Y(t[1])} r={r} fill={col} /><text x={X(t[0]) + 8} y={Y(t[1]) - 8} className="ec-lab" fill={col}>{lab}</text></g>;
  const R = add(P, Q), negR: Pt = R && [R[0], mod(-R[1], EP)], vertical = P[0] === Q[0] && mod(P[1] + Q[1], EP) === 0;
  const path: Pt[] = []; let T: Pt = null; for (let i = 1; i <= k; i++) { T = add(T, P); path.push(T); }
  const seq = path.filter((x): x is [number, number] => !!x);
  return (
    <Lab title="y² = x³ + 2x + 3 over 𝔽₉₇" toy>
      <div className="controls">
        <Seg value={mode} onChange={setMode} options={[['add', 'P + Q'], ['mul', 'Scalar k·P']]} />
        <span className="note">{mode === 'add' ? `Click points to choose ${next}.` : 'Click a point to choose P.'}</span>
        {mode === 'mul' && <label>k <input type="range" min={1} max={40} value={k} onChange={e => setK(+e.target.value)} /><span className="val">{k}</span></label>}
      </div>
      <div className="parties">
        <div className="scroll-x">
          <svg viewBox="0 0 340 340" style={{ width: '100%', maxWidth: 420, height: 'auto' }} role="img" aria-label="Points of the curve">
            <rect x={25} y={15} width={300} height={300} fill="var(--sunk)" rx={8} />
            <text x={175} y={334} textAnchor="middle" className="ec-ax">x</text><text x={10} y={165} className="ec-ax">y</text>
            {mode === 'add' && !vertical && Array.from({ length: EP }, (_, x) => <circle key={'l' + x} cx={X(x)} cy={Y(mod(slope(P, Q) * (x - P[0]) + P[1], EP))} r={1.4} fill="var(--accent)" opacity={0.45} />)}
            {mode === 'mul' && <polyline points={seq.map(t => `${X(t[0])},${Y(t[1])}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth={1.2} opacity={0.6} />}
            {POINTS.map(t => <circle key={t.join()} className="ec-pt" cx={X(t[0])} cy={Y(t[1])} r={3.4} onClick={() => pick(t)} />)}
            {mode === 'add' ? <>{mark(negR, 'var(--disabled)', 5, '−R')}{mark(P, 'var(--alice-main)', 6, 'P')}{mark(Q, 'var(--bob-main)', 6, 'Q')}{mark(R, 'var(--accent)', 7, 'P+Q')}</>
              : <>{seq.slice(0, -1).map((t, i) => <text key={i} x={X(t[0]) + 5} y={Y(t[1]) - 5} className="ec-small">{path.indexOf(t) + 1}</text>)}{mark(P, 'var(--alice-main)', 6, 'P')}{mark(path[k - 1], 'var(--accent)', 7, `${k}P`)}</>}
          </svg>
        </div>
        {mode === 'add' ? (
          <Pv who="wire" title="Point addition">
            <Kv k="P">({P.join(',')})</Kv><Kv k="Q">({Q.join(',')})</Kv>
            {R ? <><Kv k="slope λ">{slope(P, Q)}</Kv><Kv k="third point −R on the line">({negR!.join(',')})</Kv><Kv k="P + Q = R">({R.join(',')})</Kv></> : <Kv k="P + Q">O (point at infinity)</Kv>}
            <div className="note">Green dots are the "line" y = λ(x − x<sub>P</sub>) + y<sub>P</sub> mod 97. It meets the curve at P, Q and one more point; reflecting that point gives P + Q. Choose Q = P to double.</div>
          </Pv>
        ) : (
          <Pv who="wire" title="Scalar multiplication">
            <Kv k="P">({P.join(',')})</Kv><Kv k={`${k}·P`}>{path[k - 1] ? `(${path[k - 1]!.join(',')})` : 'O'}</Kv>
            <Kv k="order of P">{orderOf(P)}</Kv><Kv k="points on the curve">{POINTS.length + 1} (incl. O)</Kv>
            <div className="note">Computing kP takes about log k doublings and additions. Going back from kP to k means searching the path, which for a 256-bit curve has about 2²⁵⁶ steps.</div>
          </Pv>
        )}
      </div>
    </Lab>
  );
}
