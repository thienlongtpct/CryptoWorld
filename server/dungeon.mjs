import { CHALLENGE_BY_ID, challengeItemId } from '../src/dungeon/challenges.ts';

/** Scored answers. This module is not imported by the client. */
const ANSWERS = {
  caesar: 'hello',
  xor: 'prism',
  vault: 'glyph',
};

/** Classification boards: the expected choice for every row. */
const BOARDS = {
  wire: {
    p: 'everyone',
    g: 'everyone',
    a: 'alice',
    A: 'everyone',
    b: 'bob',
    B: 'everyone',
    key: 'pair',
    note: 'everyone',
  },
};

/** A nudge for a wrong row. It points at the reasoning and does not name the answer. */
const NUDGES = {
  wire: {
    p: 'Was this number agreed before the exchange, in the open, or chosen in secret by one person?',
    g: 'Was this number agreed before the exchange, in the open, or chosen in secret by one person?',
    a: 'Who chose this number, and was it ever sent across the bridge?',
    A: 'This value crossed the bridge. Who can read a message on the bridge?',
    b: 'Who chose this number, and was it ever sent across the bridge?',
    B: 'This value crossed the bridge. Who can read a message on the bridge?',
    key: 'Who holds an exponent and the other side’s message? Can Eve combine A and B without an exponent?',
    note: 'Encryption hides the contents, not the message itself. Did the ciphertext cross the bridge?',
  },
};

/** Shown after a correct board, or from the labeled walkthrough. */
const EXPLANATIONS = {
  wire: [
    'p and g are public parameters, agreed in the open before anyone picks a secret, so everyone has them.',
    'a is chosen by Alice and never sent, so only Alice has it. b is the same for Bob.',
    'A and B are sent across the bridge. Eve reads every message, so everyone has them.',
    'The key is B^a mod p for Alice and A^b mod p for Bob, which is the same number. Eve has A and B but no exponent. In a real-size group she cannot compute the key. With p = 1019 she could try every exponent, which is why these numbers are only for teaching.',
    'The encrypted note crosses the bridge, so everyone has the ciphertext. Only Alice and Bob can read what it says.',
    'Eve stayed passive. If Mallory replaced A or B in transit, Alice and Bob would each share a key with Mallory instead. Authenticating the public values stops that.',
  ].join(' '),
};

const WALKTHROUGHS = {
  caesar: 'Shift KHOOR back by 3. K becomes H, H becomes E, O becomes L, O becomes L, and R becomes O. The word is hello. The flag is sunhacks{hello}.',
  xor: 'XOR each byte with 0x17: 0x47 becomes 0x50 (P), 0x45 becomes 0x52 (R), 0x5e becomes 0x49 (I), 0x44 becomes 0x53 (S), and 0x5a becomes 0x4d (M). The word is prism. The flag is sunhacks{prism}.',
  vault: 'XOR each byte with 0x11 to get K P C T L. Shift those letters back by 4 to get G L Y P H. The word is glyph. The flag is sunhacks{glyph}.',
  wire: `Everyone: p, g, A, B, and the encrypted note. Only Alice: a. Only Bob: b. Alice and Bob, not Eve: the shared key. ${EXPLANATIONS.wire}`,
};

export function normalizeAnswer(input) {
  const compact = String(input ?? '').trim().toLowerCase().replace(/\s+/g, '');
  const wrapped = compact.match(/^sunhacks\{([a-z]+)\}$/);
  if (wrapped) return wrapped[1];
  if (/^[a-z]+$/.test(compact)) return compact;
  return '';
}

/**
 * Grade a whole classification board. Every row needs one of the listed choices.
 * Wrong rows come back with a nudge, never with the expected choice.
 */
function gradeBoard(challengeId, answer) {
  const challenge = CHALLENGE_BY_ID[challengeId];
  const key = BOARDS[challengeId];
  const params = challenge.params;
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
    return { ok: false, status: 400, error: 'Choose an answer for every value.' };
  }
  const choices = new Set(params.choices.map(choice => choice.id));
  for (const item of params.items) {
    if (!Object.prototype.hasOwnProperty.call(answer, item.id) || !choices.has(answer[item.id])) {
      return { ok: false, status: 400, error: 'Choose an answer for every value.' };
    }
  }
  const wrong = params.items.map(item => item.id).filter(id => answer[id] !== key[id]);
  return {
    ok: true,
    correct: wrong.length === 0,
    itemId: challengeItemId(challengeId),
    wrong,
    nudges: Object.fromEntries(wrong.map(id => [id, NUDGES[challengeId][id]])),
    explanation: wrong.length === 0 ? EXPLANATIONS[challengeId] : '',
  };
}

export function grade(challengeId, answer) {
  if (typeof challengeId === 'string' && BOARDS[challengeId] && CHALLENGE_BY_ID[challengeId]?.params.kind === 'classify') {
    return gradeBoard(challengeId, answer);
  }
  if (typeof challengeId !== 'string' || !CHALLENGE_BY_ID[challengeId] || !ANSWERS[challengeId]) {
    return { ok: false, status: 400, error: 'Unknown challenge.' };
  }
  const expected = ANSWERS[challengeId];
  const got = normalizeAnswer(answer);
  return {
    ok: true,
    correct: got === expected,
    itemId: challengeItemId(challengeId),
  };
}

export function walkthroughFor(challengeId) {
  if (typeof challengeId !== 'string' || !WALKTHROUGHS[challengeId]) {
    return { ok: false, status: 400, error: 'Unknown challenge.' };
  }
  return { ok: true, walkthrough: WALKTHROUGHS[challengeId] };
}
