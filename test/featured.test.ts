import assert from 'node:assert/strict';
import { test } from 'node:test';
import { G, H2G, P, Q, dhExponent, differingBits, flipUtf8Bit, mpow, parseSet, setInputNotes, utf8 } from '../src/lib/crypto.ts';

test('Diffie–Hellman both sides derive the same educational shared value', () => {
  const a = 123, b = 321;
  const A = mpow(G, a, P), B = mpow(G, b, P);
  assert.equal(mpow(B, a, P), mpow(A, b, P));
  assert.equal(mpow(B, a, P), 676);
});

test('the educational generator has order 509', () => {
  assert.equal(mpow(G, Q, P), 1);
  assert.notEqual(mpow(G, 1, P), 1);
  assert.equal(dhExponent(1), 1);
  assert.equal(dhExponent(508), 508);
  assert.equal(dhExponent(0), null);
  assert.equal(dhExponent(509), null);
  assert.equal(dhExponent(1.5), null);
  assert.equal(dhExponent(Number.NaN), null);
});

test('flipping one UTF-8 bit changes exactly that bit', () => {
  const text = 'Pay Bob 100 dollars';
  const flipped = flipUtf8Bit(text, 0);
  assert.ok(flipped);
  assert.equal(differingBits(utf8(text), flipped), 1);
  assert.equal(flipped[0], utf8(text)[0] ^ 0x80);
  assert.equal(flipUtf8Bit(text, 7)![0], utf8(text)[0] ^ 0x01);
  assert.equal(flipUtf8Bit('', 0), null);
  assert.equal(flipUtf8Bit(text, 1.5), null);
  // The default character change happens to be one bit; a different character is not.
  assert.equal(differingBits(utf8(text), utf8('Pay Bob 900 dollars')), 1);
  assert.ok(differingBits(utf8(text), utf8('Pay Bob 200 dollars')) > 1);
});

test('SHA-256 bit difference is the XOR popcount of the two digests', async () => {
  const a = utf8('Pay Bob 100 dollars');
  const b = flipUtf8Bit('Pay Bob 100 dollars', 3)!;
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', a).then(x => new Uint8Array(x)),
    crypto.subtle.digest('SHA-256', b).then(x => new Uint8Array(x)),
  ]);
  assert.equal(da.length, 32);
  let pop = 0;
  for (let i = 0; i < da.length; i++) {
    let x = da[i] ^ db[i];
    while (x) { pop += x & 1; x >>>= 1; }
  }
  assert.equal(differingBits(da, db), pop);
  assert.ok(pop > 0 && pop < 256);
  const empty = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array()));
  assert.equal([...empty].map(x => x.toString(16).padStart(2, '0')).join(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('set inputs keep duplicates once and cap at 12', () => {
  assert.deepEqual(parseSet('Dev, eli, DEV\nfay'), ['dev', 'eli', 'fay']);
  assert.equal(parseSet(Array.from({ length: 20 }, (_, i) => 'x' + i).join(',')).length, 12);
  assert.match(setInputNotes('a, a'), /Repeated items are kept once/);
  assert.match(setInputNotes('a,b,c,d,e,f,g,h,i,j,k,l,m'), /first 12/);
  assert.equal(setInputNotes('a, b'), '');
});

test('the tour interest sets share hiking and chess, and the toy hash keeps them apart', () => {
  const A = parseSet('music, hiking, chess');
  const B = parseSet('hiking, cooking, chess');
  assert.deepEqual(A.filter(x => B.includes(x)), ['hiking', 'chess']);
  const all = [...new Set([...A, ...B])];
  assert.equal(new Set(all.map(H2G)).size, all.length);
});

test('the toy hash can collide, so a PSI report must not trust it alone', () => {
  assert.equal(H2G('ivy'), H2G('wes'));
  const A = parseSet('ana, ben, cho, dev, eli, fay');
  const B = parseSet('dev, eli, fay, gus, hal, ivy');
  assert.deepEqual(A.filter(x => B.includes(x)), ['dev', 'eli', 'fay']);
  assert.equal(new Set([...A, ...B].map(H2G)).size, new Set([...A, ...B]).size);
});
