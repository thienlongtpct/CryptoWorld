/** Public dungeon challenges. Secret flags and answer keys stay in server/dungeon.mjs. */

import { G, P, mpow } from '../lib/crypto.ts';
import { L } from '../world/locations.ts';

export type ChallengeId = 'caesar' | 'xor' | 'vault' | 'wire' | 'seal' | 'overlap';
export type ToolId = 'shift' | 'frequency' | 'convert' | 'xor' | 'seal';

export type ChallengeParams =
  | { kind: 'shift'; ciphertext: string; forward: number }
  | { kind: 'xor'; bytes: number[]; pad: number }
  | { kind: 'xor-shift'; bytes: number[]; pad: number; forward: number }
  | { kind: 'classify'; question: string; choices: ClassifyChoice[]; items: ClassifyItem[] }
  | { kind: 'seal'; word: string; modulus: number };

/** One answer the player can give for a value in a classification board. */
export interface ClassifyChoice {
  id: string;
  label: string;
}

/** One value on a classification board. The correct choice is only on the server. */
export interface ClassifyItem {
  id: string;
  label: string;
  value: string;
}

export interface Challenge {
  id: ChallengeId;
  title: string;
  /** Display name of the location that holds the gate (from `world/locations.ts`). Only the Labyrinth gates lead to the treasure room. */
  wing: string;
  difficulty: 'Intro' | 'Practice' | 'Final';
  objective: string;
  evidence: string;
  flagFormat: string;
  tools: ToolId[];
  hints: string[];
  lesson: string;
  concepts: string[];
  params: ChallengeParams;
}

const FLAG_FORMAT = 'Submit the resulting lowercase word as sunhacks{word}. The sunhacks{ } wrapper is optional. Spaces are ignored. Letter case does not matter.';

function hexBytes(bytes: number[]): string {
  return bytes.map(byte => byte.toString(16).padStart(2, '0')).join(' ');
}

/**
 * The toy Diffie–Hellman exchange on the Bridge of Shared Secrets. The bridge NPCs and the
 * Public or Private? board use the same numbers. P = 1019 is far too small to be secure.
 */
export const BRIDGE_DH = (() => {
  const a = 123;
  const b = 321;
  const A = mpow(G, a, P);
  const B = mpow(G, b, P);
  return { p: P, g: G, a, b, A, B, key: mpow(B, a, P) };
})();

const CLASSIFY_FORMAT = 'Choose one answer for every value, then submit. The server checks the whole board and names the rows to look at again. Wrong tries cost nothing.';

const XOR_BYTES = [0x47, 0x45, 0x5e, 0x44, 0x5a];
const XOR_PAD = 0x17;
const VAULT_BYTES = [0x5a, 0x41, 0x52, 0x45, 0x5d];
const VAULT_PAD = 0x11;

/** The courier's seal in the Fountain of Hash: letter values A = 1 … Z = 26, added up, modulo 26. */
export function sealOf(word: string, modulus = 26): number {
  return [...word.toUpperCase()].reduce((sum, ch) => (/[A-Z]/.test(ch) ? sum + ch.charCodeAt(0) - 64 : sum), 0) % modulus;
}

/** The two gardens in the Gardens of Hidden Overlap. Both lists are public evidence on the board. */
export const GARDENS = {
  carol: ['rose', 'iris', 'lily', 'sage', 'mint', 'fern'],
  dave: ['iris', 'mint', 'oak', 'sage', 'yew'],
};

export const CHALLENGES: Challenge[] = [
  {
    id: 'caesar',
    title: 'Shifted engraving',
    wing: L.labyrinth,
    difficulty: 'Intro',
    objective: 'A stone gate carries a five-letter ciphertext. Each letter was shifted forward by 3. Shift each letter back by 3, wrapping from A to Z.',
    evidence: 'Ciphertext: KHOOR. Forward shift: 3.',
    flagFormat: FLAG_FORMAT,
    tools: ['shift', 'frequency'],
    hints: [
      'A forward shift of 3 is undone by subtracting 3 from each letter. After A, the alphabet wraps to Z.',
      'The first letter K moved back by 3 is H. Use that same shift on the other four letters.',
      'You now have all five letters. Submit that word in lowercase. The wrapper sunhacks{word} is optional.',
    ],
    lesson: 'caesar',
    concepts: ['Caesar shift', 'Modular wrap on the alphabet'],
    params: { kind: 'shift', ciphertext: 'KHOOR', forward: 3 },
  },
  {
    id: 'xor',
    title: 'Public byte pad',
    wing: L.labyrinth,
    difficulty: 'Practice',
    objective: 'The gate lists five ciphertext bytes in hexadecimal and one pad byte. XOR each ciphertext byte with the pad, then read the five result bytes as ASCII letters.',
    evidence: `Ciphertext bytes: ${hexBytes(XOR_BYTES)}. Pad byte: 0x${XOR_PAD.toString(16)}.`,
    flagFormat: FLAG_FORMAT,
    tools: ['xor', 'convert'],
    hints: [
      'XOR each ciphertext byte with 0x17. XOR is applied bit by bit and has no carry.',
      '0x47 XOR 0x17 is 0x50, which is the ASCII letter P. Convert the other four bytes the same way.',
      'Read the five ASCII letters as a lowercase word and submit that word.',
    ],
    lesson: 'otp',
    concepts: ['XOR', 'Explicit hexadecimal bytes'],
    params: { kind: 'xor', bytes: XOR_BYTES, pad: XOR_PAD },
  },
  {
    id: 'vault',
    title: 'Combined inscription',
    wing: L.labyrinth,
    difficulty: 'Final',
    objective: 'XOR each listed byte with the pad first. Read those results as uppercase ASCII letters. Those letters are a Caesar ciphertext that was shifted forward by 4. Shift each letter back by 4.',
    evidence: `Hex bytes: ${hexBytes(VAULT_BYTES)}. Pad byte: 0x${VAULT_PAD.toString(16)}. Caesar forward shift after the XOR: 4.`,
    flagFormat: FLAG_FORMAT,
    tools: ['xor', 'shift'],
    hints: [
      'Do the XOR before the Caesar shift. The pad byte is 0x11.',
      '0x5A XOR 0x11 is 0x4B, the letter K. Undo a forward Caesar shift of 4 on each of the five letters.',
      'The five letters after the backward shift are the word to submit, in lowercase.',
    ],
    lesson: 'caesar',
    concepts: ['XOR', 'Caesar shift', 'Doing the steps in the stated order'],
    params: { kind: 'xor-shift', bytes: VAULT_BYTES, pad: VAULT_PAD, forward: 4 },
  },
  {
    id: 'wire',
    title: 'Public or Private?',
    wing: L.bridge,
    difficulty: 'Intro',
    objective: `Alice and Bob just agreed on a key with Diffie–Hellman while Eve listened to every message on the bridge. Eve is passive: she reads messages and changes nothing. For each value below, choose who was handed it during the exchange. Count only what each person chose, was sent, or computed from what they hold. Do not count guessing.`,
    evidence: `Public group: p = ${BRIDGE_DH.p}, g = ${BRIDGE_DH.g}. Alice picks a = ${BRIDGE_DH.a} and sends A = g^a mod p = ${BRIDGE_DH.A}. Bob picks b = ${BRIDGE_DH.b} and sends B = g^b mod p = ${BRIDGE_DH.B}. Both compute the key ${BRIDGE_DH.key}. Alice then sends Bob a note encrypted under that key.`,
    flagFormat: CLASSIFY_FORMAT,
    tools: [],
    hints: [
      'Start with what crossed the bridge. Anything sent over the bridge, or agreed on before the exchange, is something Eve saw too.',
      'Each exponent is chosen by one person and never sent. The values sent are g raised to those exponents, not the exponents themselves.',
      'Alice computes B^a and Bob computes A^b. Both get the same number. Eve has A and B but neither exponent, so in a real-size group she cannot compute it.',
    ],
    lesson: 'dh',
    concepts: ['Public versus private values', 'What a passive eavesdropper sees', 'Diffie–Hellman shared key'],
    params: {
      kind: 'classify',
      question: 'Who was handed this value?',
      choices: [
        { id: 'everyone', label: 'Everyone, Eve included' },
        { id: 'alice', label: 'Only Alice' },
        { id: 'bob', label: 'Only Bob' },
        { id: 'pair', label: 'Alice and Bob, not Eve' },
      ],
      items: [
        { id: 'p', label: 'The modulus p', value: String(BRIDGE_DH.p) },
        { id: 'g', label: 'The generator g', value: String(BRIDGE_DH.g) },
        { id: 'a', label: 'Alice’s exponent a', value: String(BRIDGE_DH.a) },
        { id: 'A', label: 'Alice’s message A = g^a mod p', value: String(BRIDGE_DH.A) },
        { id: 'b', label: 'Bob’s exponent b', value: String(BRIDGE_DH.b) },
        { id: 'B', label: 'Bob’s message B = g^b mod p', value: String(BRIDGE_DH.B) },
        { id: 'key', label: 'The shared key', value: String(BRIDGE_DH.key) },
        { id: 'note', label: 'Alice’s encrypted note', value: 'ciphertext bytes' },
      ],
    },
  },
  {
    id: 'seal',
    title: 'Forged seal',
    wing: L.fountain,
    difficulty: 'Practice',
    objective: 'The courier seals every parcel with a checksum: add the letter values (A = 1 … Z = 26) and keep the remainder after dividing by 26. Oscar says he can swap a parcel without the seal changing. Show that the seal is weak: give a different word with the same seal as LEAF.',
    evidence: `Parcel: LEAF. L = 12, E = 5, A = 1, F = 6. The sum is 24, and the seal is 24 mod 26 = ${sealOf('LEAF')}.`,
    flagFormat: 'Submit one word of 3 to 12 letters that is not LEAF. The sunhacks{ } wrapper is optional. Letter case does not matter.',
    tools: ['seal'],
    hints: [
      'The seal only adds the letter values. It never looks at their order.',
      'A word made of exactly the letters L, E, A, and F in another order has the same sum.',
      'Any word whose letter values add up to 24, 50, or 76 also works, because those sums leave 24 after dividing by 26.',
    ],
    lesson: 'hash',
    concepts: ['Collisions', 'A checksum is not a cryptographic hash'],
    params: { kind: 'seal', word: 'LEAF', modulus: 26 },
  },
  {
    id: 'overlap',
    title: 'Shared beds',
    wing: L.gardens,
    difficulty: 'Practice',
    objective: 'Carol and Dave each keep a garden. They run private set intersection (PSI): Carol learns which of her plants Dave also grows, and nothing else about his garden. For each plant, choose what Carol learns when PSI finishes.',
    evidence: `Carol grows: ${GARDENS.carol.join(', ')}. Dave grows: ${GARDENS.dave.join(', ')}. Only Carol receives the output.`,
    flagFormat: CLASSIFY_FORMAT,
    tools: [],
    hints: [
      'Carol receives the intersection: the plants both of them grow.',
      'Carol already knows her own plants. One of hers that is not in the intersection is one Dave does not grow.',
      'Plants only Dave grows never reach Carol.',
    ],
    lesson: 'psi',
    concepts: ['What PSI reveals', 'What stays hidden from each side'],
    params: {
      kind: 'classify',
      question: 'After PSI, what does Carol learn about this plant?',
      choices: [
        { id: 'shared', label: 'Dave grows it too' },
        { id: 'absent', label: 'Dave does not grow it' },
        { id: 'nothing', label: 'Nothing about it' },
      ],
      items: ['rose', 'iris', 'lily', 'sage', 'mint', 'fern', 'oak', 'yew'].map(plant => ({ id: plant, label: plant[0].toUpperCase() + plant.slice(1), value: '' })),
    },
  },
];

/** The gates between the Hall of Banners and the treasure room. */
export const CATACOMB_GATES: ChallengeId[] = ['caesar', 'xor', 'vault'];

export const CHALLENGE_BY_ID: Record<string, Challenge> = Object.fromEntries(CHALLENGES.map(challenge => [challenge.id, challenge]));

export function challengeItemId(id: string): string {
  return `dungeon-${id}`;
}
