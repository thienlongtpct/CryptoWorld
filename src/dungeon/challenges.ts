/** Public dungeon challenges. Secret flags and answer keys stay in server/dungeon.mjs. */

import { G, P, mpow } from '../lib/crypto.ts';

export type ChallengeId = 'caesar' | 'xor' | 'vault' | 'wire';
export type ToolId = 'shift' | 'frequency' | 'convert' | 'xor';

export type ChallengeParams =
  | { kind: 'shift'; ciphertext: string; forward: number }
  | { kind: 'xor'; bytes: number[]; pad: number }
  | { kind: 'xor-shift'; bytes: number[]; pad: number; forward: number }
  | { kind: 'classify'; question: string; choices: ClassifyChoice[]; items: ClassifyItem[] };

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
  /** Wing that holds the gate. The Catacombs gates lead to the treasure room. */
  wing: 'Cipher Catacombs' | 'Key Exchange Bridge';
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
 * The toy Diffie–Hellman exchange on the Key Exchange Bridge. The bridge NPCs and the
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

export const CHALLENGES: Challenge[] = [
  {
    id: 'caesar',
    title: 'Shifted engraving',
    wing: 'Cipher Catacombs',
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
    wing: 'Cipher Catacombs',
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
    wing: 'Cipher Catacombs',
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
    wing: 'Key Exchange Bridge',
    difficulty: 'Intro',
    objective: `Alice and Bob just agreed on a key with Diffie–Hellman while Eve listened to every message on the bridge. Eve is passive: she reads messages and changes nothing. For each value below, choose who was handed it during the exchange. Count only what each person chose, was sent, or computed from what they hold. Do not count guessing.`,
    evidence: `Public group: p = ${BRIDGE_DH.p}, g = ${BRIDGE_DH.g}. Alice picks a = ${BRIDGE_DH.a} and sends A = g^a mod p = ${BRIDGE_DH.A}. Bob picks b = ${BRIDGE_DH.b} and sends B = g^b mod p = ${BRIDGE_DH.B}. Both compute the key ${BRIDGE_DH.key}. Alice then sends Bob a note encrypted under that key. These are toy numbers: with p this small, anyone could recover a or b by trying every exponent. Real exchanges use groups where that search is out of reach.`,
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
];

/** The gates between the Catacomb hall and the treasure room. */
export const CATACOMB_GATES: ChallengeId[] = ['caesar', 'xor', 'vault'];

export const CHALLENGE_BY_ID: Record<string, Challenge> = Object.fromEntries(CHALLENGES.map(challenge => [challenge.id, challenge]));

export function challengeItemId(id: string): string {
  return `dungeon-${id}`;
}
