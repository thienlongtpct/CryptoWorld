import { useMemo, useState } from 'react';
import { AZ, EN, EN_ORDER, chi2, counts, letters, mod, rnd, shiftCh, shuffled } from '../lib/crypto';
import { Kv, Lab, Pv } from '../components/ui';

export function Timeline({ items }: { items: [string, string, string][] }) {
  return <div className="tline">{items.map(([y, t, d]) => <div key={y + t} className="tl-item"><span className="tl-y">{y}</span><b>{t}</b><span>{d}</span></div>)}</div>;
}

export const CLASSICAL_TIMELINE: [string, string, string][] = [
  ['c. 50 BC', 'Caesar cipher', 'Julius Caesar shifts letters by three in military messages.'],
  ['c. 850', 'Al-Kindi', 'Describes frequency analysis, the first general attack on substitution ciphers.'],
  ['1467', 'Alberti', 'Invents the cipher disk and the first polyalphabetic cipher.'],
  ['1553', 'Bellaso', 'Publishes the keyword cipher later misattributed to Vigenère.'],
  ['1863', 'Kasiski', 'Finds the Vigenère key length from repeated fragments.'],
  ['1883', 'Kerckhoffs', 'Only the key may be secret; the system itself should be assumed known.'],
  ['1917', 'Vernam', 'XOR teleprinter cipher; with a random, never-reused tape it becomes the one-time pad.'],
  ['1930s–45', 'Enigma', 'Rotor machines broken by Polish and then British cryptanalysts at Bletchley Park.'],
  ['1949', 'Shannon', 'Communication Theory of Secrecy Systems: perfect secrecy, confusion and diffusion.'],
];

// ---------- Caesar cipher wheel + brute force ----------
const TH = 360 / 26;
const ring = (r: number, cls: string) => AZ.split('').map((L, i) => {
  const a = ((i * TH - 90) * Math.PI) / 180;
  return <text key={L} className={cls} x={150 + r * Math.cos(a)} y={150 + r * Math.sin(a)} textAnchor="middle" dominantBaseline="central">{L}</text>;
});
export function Caesar() {
  const [k, setK] = useState(3), [p, setP] = useState('Attack at dawn, meet at the old bridge');
  const c = [...p].map(ch => shiftCh(ch, k)).join('');
  const ranked = Array.from({ length: 26 }, (_, s) => { const t = [...c].map(ch => shiftCh(ch, -s)).join(''); return { s, t, x: chi2(t) }; }).sort((a, b) => a.x - b.x);
  return (
    <Lab>
      <div className="controls">
        <label>shift <input type="range" min={0} max={25} value={k} onChange={e => setK(+e.target.value)} /><span className="val">{k}</span></label>
        <label style={{ flex: 1 }}>plaintext <input type="text" value={p} onChange={e => setP(e.target.value)} style={{ width: '100%' }} /></label>
      </div>
      <div className="parties">
        <div className="cwheel">
          <svg viewBox="0 0 300 300" role="img" aria-label="Cipher wheel">
            <circle cx={150} cy={150} r={145} fill="var(--sunk)" /><circle cx={150} cy={150} r={113} fill="var(--surface)" />
            {ring(130, 'cz-out')}
            <g style={{ transformOrigin: '150px 150px', transform: `rotate(${-k * TH}deg)`, transition: 'transform .45s cubic-bezier(.2,.8,.2,1)' }}>{ring(96, 'cz-inr')}</g>
            <circle cx={150} cy={150} r={78} fill="var(--sunk)" />
            <text x={150} y={140} textAnchor="middle" className="cz-lab">plain outside</text>
            <text x={150} y={160} textAnchor="middle" className="cz-lab">cipher inside</text>
            <path d="M150 2 l-7 0 l7 14 l7 -14z" fill="var(--accent)" />
          </svg>
        </div>
        <Pv who="wire" title="Ciphertext">
          <div className="val mono-big">{c}</div>
          <h4 style={{ marginTop: 12 }}>Brute force: all 26 shifts</h4>
          <p className="note">Rows are ranked by how closely their letter counts match English (χ² score, lower is better).</p>
          <div className="bf">
            {ranked.slice(0, 8).map((r, i) => <div key={r.s} className={`bf-row ${i === 0 ? 'best' : ''}`}><span>shift {r.s}</span><span className="bf-t">{r.t}</span><span className="muted">χ² {r.x.toFixed(0)}</span></div>)}
            <div className="note">… 18 more shifts, all scoring worse.</div>
          </div>
        </Pv>
      </div>
    </Lab>
  );
}

// ---------- frequency analysis of a substitution cipher ----------
const PT = 'CRYPTOGRAPHY IS THE ART AND SCIENCE OF KEEPING MESSAGES SECRET. FOR CENTURIES IT WAS PRACTISED BY DIPLOMATS, SOLDIERS AND LOVERS WHO TRUSTED THAT A CLEVER ALPHABET WOULD HIDE THEIR WORDS. THE WEAKNESS WAS ALWAYS THE SAME: LANGUAGE IS NOT RANDOM. THE LETTER E APPEARS MORE OFTEN THAN ANY OTHER, THE WORD THE IS EVERYWHERE, AND A PATIENT READER WITH A PENCIL CAN COUNT HER WAY TO THE KEY. THAT IS WHY MODERN CIPHERS ARE DESIGNED SO THAT THEIR OUTPUT LOOKS LIKE NOISE.';
export function Frequency() {
  const [key, setKey] = useState(() => shuffled(AZ.split('')));
  const [guess, setGuess] = useState<Record<string, string>>({});
  const CT = useMemo(() => [...PT].map(ch => (/[A-Z]/.test(ch) ? key[ch.charCodeAt(0) - 65] : ch)).join(''), [key]);
  const real = useMemo(() => Object.fromEntries(key.map((c, i) => [c, AZ[i]])), [key]);
  const c = counts(CT), n = c.reduce((a, b) => a + b, 0);
  const order = AZ.split('').map((L, i) => [L, c[i]] as const).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const mx = Math.max(...order.map(o => (o[1] / n) * 100), 12.7);
  const X = (i: number) => 30 + i * 28, H = (v: number) => (v / mx) * 85;
  const right = order.filter(([L]) => guess[L] === real[L]).length;
  return (
    <Lab>
      <div className="controls">
        <button className="btn" onClick={() => setGuess(Object.fromEntries(order.map(([L], i) => [L, EN_ORDER[i]])))}>Guess by frequency rank</button>
        <button className="btn ghost" onClick={() => setGuess({})}>Clear guesses</button>
        <button className="btn ghost" onClick={() => setGuess(real)}>Reveal key</button>
        <button className="btn ghost" onClick={() => { setKey(shuffled(AZ.split(''))); setGuess({}); }}>New random key</button>
        <span className="note">{right} of {order.length} letters correct</span>
      </div>
      <div className="scroll-x">
        <svg viewBox="0 0 780 220" style={{ width: '100%', minWidth: 620, height: 'auto' }} role="img" aria-label="Letter frequencies">
          <text x={4} y={14} className="fq-cap">ciphertext letters, most frequent first</text>
          <text x={4} y={214} className="fq-cap">English letters, most frequent first</text>
          {order.map(([L], i) => {
            const gp = guess[L], j = gp ? EN_ORDER.indexOf(gp) : -1;
            return j < 0 ? null : <line key={'l' + L} x1={X(i) + 11} y1={103} x2={X(j) + 11} y2={117} stroke={real[L] === gp ? 'var(--ok)' : 'var(--bad)'} strokeWidth={1.6} />;
          })}
          {order.map(([L, v], i) => { const h = H((v / n) * 100); return <g key={'c' + L}><rect x={X(i)} y={100 - h} width={22} height={h} rx={3} fill="var(--bob-main)" opacity={0.85} /><text x={X(i) + 11} y={96 - h} className="fq-l">{L}</text></g>; })}
          {EN_ORDER.split('').map((L, j) => { const h = H(EN[L.charCodeAt(0) - 65]); return <g key={'e' + L}><rect x={X(j)} y={120} width={22} height={h} rx={3} fill="var(--alice-main)" opacity={0.75} /><text x={X(j) + 11} y={132 + h} className="fq-l">{L}</text></g>; })}
        </svg>
      </div>
      <div>
        <span className="eyebrow">Your mapping: ciphertext letter → plaintext guess</span>
        <div className="map-grid">
          {order.map(([L, v]) => (
            <label key={L} className={`mcell ${guess[L] ? (real[L] === guess[L] ? 'right' : 'wrong') : ''}`}>
              <span>{L}<i>{v}</i></span>
              <input type="text" maxLength={1} value={guess[L] ?? ''} aria-label={`plaintext guess for ${L}`}
                onChange={e => { const g = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); setGuess(old => { const nx = { ...old }; if (g) nx[L] = g; else delete nx[L]; return nx; }); }} />
            </label>
          ))}
        </div>
      </div>
      <Pv who="wire" title="Decryption so far">
        <p className="note">Guessed letters in green, unknown ones shown as grey ciphertext.</p>
        <div className="fq-out">
          {[...CT].map((ch, i) => /[A-Z]/.test(ch)
            ? guess[ch] ? <span key={i} className={real[ch] === guess[ch] ? 'g-ok' : 'g-bad'}>{guess[ch].toLowerCase()}</span> : <span key={i} className="g-un">{ch}</span>
            : ch)}
        </div>
      </Pv>
    </Lab>
  );
}

// ---------- Vigenère with the tabula recta ----------
const ic = (s: string) => { const c = counts(s), n = s.length; return n > 1 ? c.reduce((a, v) => a + v * (v - 1), 0) / (n * (n - 1)) : 0; };
export function Vigenere() {
  const [pt, setPt] = useState('DEFEND THE EAST WALL OF THE CASTLE'), [kw, setKw] = useState('FORTIFY'), [idx, setIdx] = useState(0);
  const Pl = letters(pt), K = letters(kw) || 'A';
  const C = [...Pl].map((ch, i) => shiftCh(ch, K.charCodeAt(i % K.length) - 65)).join('');
  const i = Math.min(idx, Math.max(0, Pl.length - 1));
  const p = Pl[i] || 'A', k = K[i % K.length], c = C[i] || 'A', pi = p.charCodeAt(0) - 65, ki = k.charCodeAt(0) - 65;
  const row = (lab: string, s: string, cls: string) => (
    <div className="vs-row"><span className="vs-lab">{lab}</span>{[...s].map((ch, j) => <span key={j} className={`vs-c ${cls} ${j === i ? 'on' : ''}`} onClick={() => setIdx(j)}>{ch}</span>)}</div>
  );
  return (
    <Lab>
      <div className="controls">
        <label>plaintext <input type="text" value={pt} onChange={e => setPt(e.target.value)} style={{ width: '18em' }} /></label>
        <label>keyword <input type="text" value={kw} onChange={e => setKw(e.target.value)} style={{ width: '8em' }} /></label>
        <label>letter <input type="range" min={0} max={Math.max(0, Pl.length - 1)} value={i} onChange={e => setIdx(+e.target.value)} /><span className="val">{i + 1} / {Pl.length}</span></label>
      </div>
      <div className="vg-strip"><div className="scroll-x">{row('plain', Pl, 'vp')}{row('key', [...Pl].map((_, j) => K[j % K.length]).join(''), 'vk')}{row('cipher', C, 'vc')}</div></div>
      <div className="parties">
        <div className="scroll-x">
          <div className="tabula">
            <div className="tb-row"><span className="tb-c tb-h" />{AZ.split('').map((L, x) => <span key={L} className={`tb-c tb-h ${x === pi ? 'col' : ''}`}>{L}</span>)}</div>
            {AZ.split('').map((R, y) => (
              <div key={R} className="tb-row">
                <span className={`tb-c tb-h ${y === ki ? 'row' : ''}`}>{R}</span>
                {AZ.split('').map((_, x) => <span key={x} className={`tb-c ${y === ki && x === pi ? 'hit' : y === ki ? 'row' : x === pi ? 'col' : ''}`}>{AZ[(x + y) % 26]}</span>)}
              </div>
            ))}
          </div>
        </div>
        <Pv who="wire" title={`Letter ${i + 1}`}>
          <div>Plain <b>{p}</b> + key <b>{k}</b> (shift {ki}) → row {k}, column {p} → <span className="val">{c}</span></div>
          <h4 style={{ marginTop: 12 }}>Index of coincidence</h4>
          <Kv k="plaintext">{ic(Pl).toFixed(3)}</Kv><Kv k="ciphertext">{ic(C).toFixed(3)}</Kv>
          <div className="note">English text scores about 0.066 and uniformly random letters about 0.038. A longer keyword pushes the ciphertext towards random; Friedman used this to estimate key length.</div>
        </Pv>
      </div>
    </Lab>
  );
}

// ---------- rail fence ----------
export function RailFence() {
  const [msg, setMsg] = useState('WE ARE DISCOVERED FLEE AT ONCE'), [n, setN] = useState(3);
  const Pl = letters(msg);
  const rail = [...Pl].map((_, i) => { const cyc = 2 * (n - 1), r = i % cyc; return r < n ? r : cyc - r; });
  return (
    <Lab>
      <div className="controls">
        <label>message <input type="text" value={msg} onChange={e => setMsg(e.target.value)} style={{ width: '18em' }} /></label>
        <label>rails <input type="range" min={2} max={6} value={n} onChange={e => setN(+e.target.value)} /><span className="val">{n}</span></label>
      </div>
      <div className="scroll-x">
        <div className="rf-grid">
          {Array.from({ length: n }, (_, r) => (
            <div key={r} className="rf-row">{[...Pl].map((ch, i) => <span key={i} className={`rf-c ${rail[i] === r ? 'on' : ''}`} style={{ ['--rc' as string]: `var(--c${r + 1})` }}>{rail[i] === r ? ch : ''}</span>)}</div>
          ))}
        </div>
      </div>
      <Pv who="wire" title="Ciphertext (rail by rail)">
        <div className="val mono-big">{Array.from({ length: n }, (_, r) => <span key={r} style={{ color: `var(--c${r + 1})` }}>{[...Pl].filter((_, i) => rail[i] === r).join('')} </span>)}</div>
      </Pv>
    </Lab>
  );
}

// ---------- one-time pad ----------
const bits8 = (b: number) => b.toString(2).padStart(8, '0');
const BitRow = ({ v }: { v: number }) => <>{[...bits8(v)].map((b, i) => <i key={i} className={b === '1' ? 'b1' : 'b0'}>{b}</i>)}</>;
export function OneTimePad() {
  const [m, setM] = useState('ATTACK'), [alt, setAlt] = useState('RETIRE');
  const [pad, setPad] = useState<number[]>(() => Array.from({ length: 12 }, () => rnd(0, 255)));
  const mb = [...m].map(ch => ch.charCodeAt(0) & 0xff), k = pad.slice(0, mb.length), c = mb.map((v, i) => v ^ k[i]);
  const ab = [...alt].map(ch => ch.charCodeAt(0) & 0xff);
  return (
    <Lab>
      <div className="controls">
        <label>message <input type="text" value={m} maxLength={12} onChange={e => setM(e.target.value)} style={{ width: '9em' }} /></label>
        <button className="btn ghost" onClick={() => setPad(Array.from({ length: 12 }, () => rnd(0, 255)))}>New random key</button>
      </div>
      <div className="scroll-x">
        <table className="otp"><tbody>
          <tr><th>message</th>{mb.map((v, i) => <td key={i}><b>{String.fromCharCode(v)}</b><BitRow v={v} /></td>)}</tr>
          <tr><th>key ⊕</th>{k.map((v, i) => <td key={i} className="k"><BitRow v={v} /></td>)}</tr>
          <tr><th>cipher =</th>{c.map((v, i) => <td key={i} className="c"><BitRow v={v} /></td>)}</tr>
        </tbody></table>
      </div>
      <Pv who="wire" title="Perfect secrecy: pick any other message of the same length">
        <label className="kv"><span>claimed message</span><input type="text" value={alt} maxLength={12} onChange={e => setAlt(e.target.value)} style={{ width: '9em' }} /></label>
        {ab.length !== mb.length ? <div className="note">Enter exactly {mb.length} characters, the same length as the message.</div> : <>
          <div>The key <span className="val mono">{ab.map((v, i) => mod(v ^ c[i], 256).toString(16).padStart(2, '0')).join(' ')}</span> decrypts the same ciphertext to "<b>{alt}</b>".</div>
          <div className="note">Every key is equally likely, so an eavesdropper holding only the ciphertext has no reason to prefer "{m}" over "{alt}". That is perfect secrecy.</div>
        </>}
      </Pv>
    </Lab>
  );
}
