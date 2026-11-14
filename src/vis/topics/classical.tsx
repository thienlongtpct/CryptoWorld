import { useMemo, useState } from 'react';
import { AZ, chi2, letters, rnd, shiftCh } from '../../lib/crypto';
import { Frequency } from '../../demos/classical';
import { VisPage, type Frame } from '../Player';
import { Go, useDraft } from '../kit';

const MAXL = 24; // animate at most this many letters; the rest are filled in on the last frame

// ---------- Caesar ----------
const TH = 360 / 26;
function Wheel({ k, hl }: { k: number; hl?: number }) {
  const ring = (r: number, cls: string, mark?: number) => AZ.split('').map((L, i) => {
    const a = ((i * TH - 90) * Math.PI) / 180;
    return <text key={L} className={cls} x={150 + r * Math.cos(a)} y={150 + r * Math.sin(a)} textAnchor="middle" dominantBaseline="central" style={i === mark ? { fill: 'var(--vis-progress)', fontSize: 17 } : undefined}>{L}</text>;
  });
  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 320 }}>
      <circle cx={150} cy={150} r={145} fill="#fff" /><circle cx={150} cy={150} r={113} fill="var(--sunk)" />
      {ring(130, 'cz-out', hl)}
      <g style={{ transformOrigin: '150px 150px', transform: `rotate(${-k * TH}deg)`, transition: 'transform .5s' }}>{ring(96, 'cz-inr', hl === undefined ? undefined : (hl + k) % 26)}</g>
      <circle cx={150} cy={150} r={76} fill="#fff" /><text x={150} y={146} textAnchor="middle" className="cz-lab">plain outside</text><text x={150} y={162} textAnchor="middle" className="cz-lab">cipher inside</text>
    </svg>
  );
}
const CZ_CODE = ['Encrypt(p, k):', '  for each letter ℓ of p:', '    output letter at position (ℓ + k) mod 26', 'Break(c):', '  for s = 0 … 25: score Decrypt(c, s) against English (χ²)', '  return the best-scoring shift'];
export function CaesarVis() {
  const [k, kD, setKD, commitK, setK] = useDraft(3);
  const [p, pD, setPD, commitP] = useDraft('Attack at dawn');
  const frames = useMemo<Frame[]>(() => {
    const c = [...p].map(ch => shiftCh(ch, k)).join(''), idx = [...p].map((ch, i) => (/[a-z]/i.test(ch) ? i : -1)).filter(i => i >= 0).slice(0, MAXL);
    const ranked = Array.from({ length: 26 }, (_, s) => { const t = [...c].map(ch => shiftCh(ch, -s)).join(''); return { s, t, x: chi2(t) }; }).sort((a, b) => a.x - b.x);
    const text = (upto: number) => <div className="st-big" style={{ letterSpacing: '.08em' }}>{[...c].map((ch, i) => <span key={i} style={{ opacity: i <= upto ? 1 : 0.15 }}>{ch}</span>)}</div>;
    const out: Frame[] = [{ stage: <div className="st-row"><Wheel k={k} />{text(-1)}</div>, status: <>Turn the inner wheel by {k}: every plaintext letter now sits over its ciphertext letter.</>, line: 0 }];
    idx.forEach((i, n) => {
      const L = p[i].toUpperCase().charCodeAt(0) - 65;
      out.push({ stage: <div className="st-row"><Wheel k={k} hl={L} />{text(i)}</div>, status: <>{p[i].toUpperCase()} → {c[i].toUpperCase()} (letter {n + 1})</>, line: [1, 2] });
    });
    out.push({
      stage: <div className="st-row" style={{ flexDirection: 'column' }}>{text(c.length)}<div className="bf">{ranked.slice(0, 6).map((r, i) => <div key={r.s} className={`bf-row ${i === 0 ? 'best' : ''}`}><span>shift {r.s}</span><span className="bf-t">{r.t}</span><span className="muted">χ² {r.x.toFixed(0)}</span></div>)}</div></div>,
      status: <>An attacker tries all 26 shifts. The most English-looking one is shift {ranked[0].s}{ranked[0].s === k ? ', the real key' : ''}.</>, line: [3, 4, 5],
    });
    return out;
  }, [k, p]);
  return (
    <VisPage topicId="caesar" code={CZ_CODE} frames={frames} actions={[
      { label: 'Shift k', form: <><input type="number" min={0} max={25} value={kD} onChange={e => setKD(+e.target.value)} /><Go onClick={commitK} /></> },
      { label: 'Plaintext', form: <><input type="text" value={pD} onChange={e => setPD(e.target.value)} style={{ width: '16em' }} /><Go onClick={commitP} /></> },
      { label: 'Random shift', form: <Go onClick={() => setK(rnd(1, 25))}>Pick</Go> },
    ]} />
  );
}

export const FreqVis = () => <VisPage topicId="freqan" stage={<Frequency />} code={['count each ciphertext letter', 'sort by frequency', 'map ranks to English: E T A O I N S H R D L …', 'fix mistakes using common words (THE, AND …)']} />;

// ---------- Vigenère ----------
const VG_CODE = ['for i = 0 … len(p) − 1:', '  k_i ← keyword[i mod |keyword|]', '  c_i ← p_i + k_i  (mod 26)', '      = tabula recta row k_i, column p_i'];
function Tabula({ row, col }: { row: number; col: number }) {
  return (
    <div className="tabula">
      <div className="tb-row"><span className="tb-c tb-h" />{AZ.split('').map((L, x) => <span key={L} className={`tb-c tb-h ${x === col ? 'col' : ''}`}>{L}</span>)}</div>
      {AZ.split('').map((R, y) => <div key={R} className="tb-row"><span className={`tb-c tb-h ${y === row ? 'row' : ''}`}>{R}</span>{AZ.split('').map((_, x) => <span key={x} className={`tb-c ${y === row && x === col ? 'hit' : y === row ? 'row' : x === col ? 'col' : ''}`}>{AZ[(x + y) % 26]}</span>)}</div>)}
    </div>
  );
}
export function VigenereVis() {
  const [pt, pD, setPD, commitP] = useDraft('DEFEND THE EAST WALL');
  const [kw, kD, setKD, commitK] = useDraft('FORT');
  const frames = useMemo<Frame[]>(() => {
    const P_ = letters(pt).slice(0, MAXL), K = letters(kw) || 'A', C = [...P_].map((ch, i) => shiftCh(ch, K.charCodeAt(i % K.length) - 65)).join('');
    const strip = (i: number) => (
      <div className="vg-strip"><div className="scroll-x">
        {[['plain', P_, 'vp'], ['key', [...P_].map((_, j) => K[j % K.length]).join(''), 'vk'], ['cipher', C, 'vc']].map(([lab, s, cls]) => (
          <div key={lab} className="vs-row"><span className="vs-lab">{lab}</span>{[...s].map((ch, j) => <span key={j} className={`vs-c ${cls} ${j === i ? 'on' : ''}`} style={{ opacity: lab === 'cipher' && j > i ? 0.15 : 1 }}>{ch}</span>)}</div>
        ))}
      </div></div>
    );
    return [...P_].map((p, i) => {
      const k = K[i % K.length];
      return { stage: <>{strip(i)}<div className="scroll-x" style={{ display: 'grid', placeItems: 'center' }}><Tabula row={k.charCodeAt(0) - 65} col={p.charCodeAt(0) - 65} /></div></>, status: <>Letter {i + 1}: plain {p} + key {k} → row {k}, column {p} → {C[i]}.</>, line: [1, 2, 3] };
    });
  }, [pt, kw]);
  return (
    <VisPage topicId="vigenere" code={VG_CODE} frames={frames} actions={[
      { label: 'Plaintext', form: <><input type="text" value={pD} onChange={e => setPD(e.target.value)} style={{ width: '16em' }} /><Go onClick={commitP} /></> },
      { label: 'Keyword', form: <><input type="text" value={kD} onChange={e => setKD(e.target.value)} style={{ width: '8em' }} /><Go onClick={commitK} /></> },
    ]} />
  );
}

// ---------- rail fence ----------
const RF_CODE = ['write letters in a zigzag over n rails:', '  rail goes 0, 1, …, n−1, n−2, …, 1, 0, …', 'ciphertext = rail 0, then rail 1, …, then rail n−1'];
export function RailFenceVis() {
  const [msg, mD, setMD, commitM] = useDraft('WE ARE DISCOVERED FLEE AT ONCE');
  const [n, nD, setND, , setN] = useDraft(3);
  const frames = useMemo<Frame[]>(() => {
    const P_ = letters(msg), rail = [...P_].map((_, i) => { const cyc = 2 * (n - 1), r = i % cyc; return r < n ? r : cyc - r; });
    const grid = (upto: number, readRail = -1) => (
      <div className="scroll-x"><div className="rf-grid" style={{ margin: '0 auto' }}>
        {Array.from({ length: n }, (_, r) => <div key={r} className="rf-row">{[...P_].map((ch, i) => <span key={i} className={`rf-c ${rail[i] === r && i <= upto ? 'on' : ''}`} style={{ ['--rc' as string]: `var(--c${r + 1})`, outline: readRail === r && rail[i] === r ? '2px solid var(--vis-progress)' : undefined }}>{rail[i] === r && i <= upto ? ch : ''}</span>)}</div>)}
      </div></div>
    );
    const cipher = (rails: number) => <div className="st-big" style={{ fontFamily: 'var(--f-mono)' }}>{Array.from({ length: rails }, (_, r) => <span key={r} style={{ color: `var(--c${r + 1})` }}>{[...P_].filter((_, i) => rail[i] === r).join('')} </span>)}</div>;
    const out: Frame[] = [];
    const stepEvery = Math.max(1, Math.ceil(P_.length / 16));
    for (let i = 0; i < P_.length; i += stepEvery) out.push({ stage: grid(i), status: <>Write {P_.slice(Math.max(0, i - stepEvery + 1), i + 1)} on the zigzag.</>, line: [0, 1] });
    for (let r = 0; r < n; r++) out.push({ stage: <>{grid(P_.length, r)}{cipher(r + 1)}</>, status: <>Read rail {r} left to right.</>, line: 2 });
    return out;
  }, [msg, n]);
  return (
    <VisPage topicId="railfence" code={RF_CODE} frames={frames} actions={[
      { label: 'Message', form: <><input type="text" value={mD} onChange={e => setMD(e.target.value)} style={{ width: '16em' }} /><Go onClick={commitM} /></> },
      { label: 'Rails n', form: <><input type="number" min={2} max={6} value={nD} onChange={e => setND(+e.target.value)} /><Go onClick={() => setN(Math.max(2, Math.min(6, nD || 3)))} /></> },
    ]} />
  );
}

// ---------- one-time pad ----------
const OTP_CODE = ['k ← uniformly random bytes, |k| = |m|', 'for each byte i:  c_i ← m_i ⊕ k_i', 'perfect secrecy: for any m′ with |m′| = |m|', '  the key k′ = c ⊕ m′ maps c to m′'];
const bits8 = (b: number) => b.toString(2).padStart(8, '0');
const Bits = ({ v }: { v: number }) => <>{[...bits8(v)].map((b, i) => <i key={i} className={b === '1' ? 'b1' : 'b0'}>{b}</i>)}</>;
export function OtpVis() {
  const [m, mD, setMD, commitM] = useDraft('ATTACK');
  const [alt, aD, setAD, commitA] = useDraft('RETIRE');
  const [nonce, setNonce] = useState(0);
  const frames = useMemo<Frame[]>(() => {
    const mb = [...m.slice(0, 10)].map(ch => ch.charCodeAt(0) & 0xff), k = mb.map(() => rnd(0, 255)), c = mb.map((v, i) => v ^ k[i]);
    const table = (upto: number) => (
      <div className="scroll-x" style={{ display: 'grid', placeItems: 'center' }}><table className="otp"><tbody>
        <tr><th>message</th>{mb.map((v, i) => <td key={i}><b>{String.fromCharCode(v)}</b><Bits v={v} /></td>)}</tr>
        <tr><th>key ⊕</th>{k.map((v, i) => <td key={i} className="k" style={{ opacity: i <= upto ? 1 : 0.2 }}><Bits v={v} /></td>)}</tr>
        <tr><th>cipher =</th>{c.map((v, i) => <td key={i} className="c" style={{ opacity: i <= upto ? 1 : 0.2 }}><Bits v={v} /></td>)}</tr>
      </tbody></table></div>
    );
    const ab = [...alt].map(ch => ch.charCodeAt(0) & 0xff);
    const out: Frame[] = mb.map((v, i) => ({ stage: table(i), status: <>Byte {i + 1}: “{String.fromCharCode(v)}” ⊕ random key byte.</>, line: [0, 1] }));
    out.push({
      stage: <>{table(mb.length)}<div className="st-party" style={{ maxWidth: 640, margin: '0 auto' }}>{ab.length === mb.length
        ? <><h4>Another message fits too</h4><div>The key <code>{ab.map((v, i) => (v ^ c[i]).toString(16).padStart(2, '0')).join(' ')}</code> decrypts the same ciphertext to “<b>{alt}</b>”. Every key is equally likely, so the ciphertext says nothing about which message was sent.</div></>
        : <div className="note">Set a claimed message of exactly {mb.length} characters to see perfect secrecy.</div>}</div></>,
      status: <>Perfect secrecy: the ciphertext is equally consistent with every message of this length.</>, line: [2, 3],
    });
    return out;
  }, [m, alt, nonce]);
  return (
    <VisPage topicId="otp" code={OTP_CODE} frames={frames} actions={[
      { label: 'Message', form: <><input type="text" maxLength={10} value={mD} onChange={e => setMD(e.target.value)} style={{ width: '9em' }} /><Go onClick={commitM} /></> },
      { label: 'Claimed other message', form: <><input type="text" maxLength={10} value={aD} onChange={e => setAD(e.target.value)} style={{ width: '9em' }} /><Go onClick={commitA} /></> },
      { label: 'New key', form: <Go onClick={() => setNonce(x => x + 1)}>Randomize</Go> },
    ]} />
  );
}

