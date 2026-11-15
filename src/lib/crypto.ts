// Toy cryptography used by the demos. Parameters are deliberately tiny so every number is readable.
// Nothing here is secure.

export const mod = (a: number, m: number) => ((a % m) + m) % m;

/** b^e mod m for m < 2^26 (products stay below 2^53). */
export function mpow(b: number, e: number, m: number): number {
  b = mod(b, m);
  let r = 1;
  while (e > 0) {
    if (e % 2) r = (r * b) % m;
    b = (b * b) % m;
    e = Math.floor(e / 2);
  }
  return r;
}

/** Modular inverse by the extended Euclidean algorithm. */
export function minv(a: number, m: number): number {
  let r0 = mod(a, m), r1 = m, s0 = 1, s1 = 0;
  while (r1) {
    const q = Math.floor(r0 / r1);
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  return mod(s0, m);
}

export function bigPow(b: bigint, e: bigint, m: bigint): bigint {
  let r = 1n;
  b %= m;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return r;
}

/** 32-bit FNV-1a with a final mix: a stand-in for a real hash in the demos. */
export function h32(s: string | number): number {
  const str = String(s);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return h >>> 0;
}

export const rnd = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
export const hex = (n: number, w = 6) => (n >>> 0).toString(16).padStart(w, '0').slice(-w);
export function shuffled<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Group of quadratic residues modulo the safe prime P = 2Q + 1.
export const P = 1019, Q = 509, G = 4;
export const H2G = (x: string) => mpow(G, 1 + (h32('g|' + x) % (Q - 1)), P);

// Tiny stream cipher: XOR each byte with a hash of (key, position).
export const enc = (msg: string, key: string) => [...msg].map((ch, i) => (ch.charCodeAt(0) & 0xff) ^ (h32(key + ':' + i) & 0xff));
export const bytesHex = (bs: number[]) => bs.map(b => b.toString(16).padStart(2, '0')).join('');
export const decStr = (bs: number[], key: string) =>
  bs.map((b, i) => { const c = b ^ (h32(key + ':' + i) & 0xff); return c >= 32 && c < 127 ? String.fromCharCode(c) : '·'; }).join('');

export const parseSet = (s: string) => [...new Set(s.split(/[,\n]/).map(x => x.trim().toLowerCase()).filter(Boolean))].slice(0, 12);

/** What a set box silently changed: duplicates are kept once, and only 12 items are used. */
export function setInputNotes(raw: string): string {
  const parts = raw.split(/[,\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
  const notes: string[] = [];
  if (parts.length > new Set(parts).size) notes.push('Repeated items are kept once.');
  if (new Set(parts).size > 12) notes.push('Only the first 12 distinct items are used.');
  return notes.join(' ');
}

/** Number of bits that differ between two byte strings. */
export function differingBits(a: Uint8Array, b: Uint8Array): number {
  const n = Math.max(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i++) {
    let x = (a[i] ?? 0) ^ (b[i] ?? 0);
    while (x) { d += x & 1; x >>>= 1; }
  }
  return d;
}

export const utf8 = (s: string) => new TextEncoder().encode(s);

/** Flip exactly one bit of the UTF-8 encoding. Null when the text has no bytes or the index is not a whole number. */
export function flipUtf8Bit(text: string, bit: number): Uint8Array | null {
  const src = utf8(text);
  if (!src.length || !Number.isInteger(bit)) return null;
  const out = new Uint8Array(src);
  const n = out.length * 8;
  const i = ((bit % n) + n) % n;
  out[i >> 3] ^= 1 << (7 - (i & 7));
  return out;
}

/** Secret exponent for the educational subgroup of squares mod 1019 (order 509). */
export function dhExponent(n: number): number | null {
  return Number.isInteger(n) && n >= 1 && n <= Q - 1 ? n : null;
}
export const short = (n: string | number) => hex(h32('t' + n), 6);

export function fmtBytes(b: number): string {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return (b < 10 ? b.toFixed(1) : Math.round(b)) + ' ' + u[i];
}

// ---------- OKVS: 3-sparse random rows over F_p, solved by Gaussian elimination ----------
export interface Okvs { P: number[]; seed: number }

export function okvsRow(key: string, m: number, p: number, seed: number): [number, number][] {
  const pos: number[] = [];
  for (let t = 1; pos.length < 3; t++) {
    const i = h32(seed + '|' + key + '|' + t) % m;
    if (!pos.includes(i)) pos.push(i);
  }
  return pos.map((i, t) => [i, 1 + (h32('c' + seed + '|' + key + '|' + t) % (p - 1))]);
}

export const okvsDecode = (Pv: number[], key: string, p: number, seed: number) =>
  okvsRow(key, Pv.length, p, seed).reduce((s, [i, c]) => mod(s + c * Pv[i], p), 0);

export function okvsEncode(pairs: [string, number][], m: number, p: number, seed0 = 1): Okvs | null {
  for (let seed = seed0; seed < seed0 + 50; seed++) {
    let rows = pairs.map(([k, v]) => {
      const r = new Array<number>(m).fill(0);
      okvsRow(k, m, p, seed).forEach(([i, c]) => (r[i] = c));
      r.push(mod(v, p));
      return r;
    });
    const piv: number[] = [];
    let rr = 0;
    for (let col = 0; col < m && rr < rows.length; col++) {
      let sel = -1;
      for (let i = rr; i < rows.length; i++) if (rows[i][col]) { sel = i; break; }
      if (sel < 0) continue;
      [rows[rr], rows[sel]] = [rows[sel], rows[rr]];
      const inv = minv(rows[rr][col], p);
      rows[rr] = rows[rr].map(v => (v * inv) % p);
      const pivotRow = rows[rr];
      rows = rows.map((row, i) => (i !== rr && row[col] ? row.map((v, j) => mod(v - row[col] * pivotRow[j], p)) : row));
      piv.push(col);
      rr++;
    }
    if (rr < rows.length) continue; // dependent rows: try another hash seed
    const Pv = Array.from({ length: m }, () => rnd(0, p - 1));
    piv.forEach((col, i) => {
      let s = rows[i][m];
      for (let j = 0; j < m; j++) if (j !== col && !piv.includes(j)) s = mod(s - rows[i][j] * Pv[j], p);
      Pv[col] = s;
    });
    if (pairs.every(([k, v]) => okvsDecode(Pv, k, p, seed) === mod(v, p))) return { P: Pv, seed };
  }
  return null;
}

// ---------- toy 16-bit SPN (PRESENT S-box), shared by the block-cipher and modes demos ----------
const SBOX = [0xc, 0x5, 0x6, 0xb, 0x9, 0x0, 0xa, 0xd, 0x3, 0xe, 0xf, 0x8, 0x4, 0x7, 0x1, 0x2];
const PERM = Array.from({ length: 16 }, (_, i) => (i === 15 ? 15 : (i * 4) % 15));
const rotl16 = (x: number, r: number) => ((x << r) | (x >>> (16 - r))) & 0xffff;
const roundKeys = (k: number) => Array.from({ length: 5 }, (_, r) => (rotl16(k, (3 * r) % 16) ^ (0x9e37 * (r + 1))) & 0xffff);

/** State after each round: [plaintext, r1, r2, r3, r4, ciphertext]. */
export function spnTrace(x: number, k: number): number[] {
  const rk = roundKeys(k), tr = [x];
  for (let r = 0; r < 4; r++) {
    x ^= rk[r];
    let s = 0;
    for (let n = 0; n < 4; n++) s |= SBOX[(x >>> (4 * n)) & 0xf] << (4 * n);
    let p = 0;
    for (let b = 0; b < 16; b++) if ((s >>> b) & 1) p |= 1 << PERM[b];
    x = r === 3 ? s : p;
    tr.push(x);
  }
  tr.push(x ^ rk[4]);
  return tr;
}
export const spn = (x: number, k: number) => spnTrace(x, k)[5];

// ---------- classical-cipher helpers ----------
export const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** English letter frequencies (%), A–Z. */
export const EN = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4, 6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074];
export const EN_ORDER = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';
export const letters = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '');
export function counts(s: string): number[] {
  const c = new Array<number>(26).fill(0);
  for (const ch of letters(s)) c[ch.charCodeAt(0) - 65]++;
  return c;
}
export function shiftCh(ch: string, k: number): string {
  const u = ch.toUpperCase();
  if (u < 'A' || u > 'Z') return ch;
  const r = String.fromCharCode(65 + mod(u.charCodeAt(0) - 65 + k, 26));
  return ch === u ? r : r.toLowerCase();
}
/** χ² distance of a text's letter counts from English; lower means more English-like. */
export function chi2(s: string): number {
  const c = counts(s), n = c.reduce((a, b) => a + b, 0) || 1;
  return c.reduce((a, o, i) => { const e = (EN[i] / 100) * n; return a + (o - e) ** 2 / e; }, 0);
}
