// Visualization topics: metadata only (components live in vis/topics.tsx to avoid import cycles).

export type Thumb = 'parties' | 'matrix' | 'bars' | 'wheel' | 'curve' | 'venn' | 'points' | 'lock' | 'squares' | 'cave' | 'table' | 'zigzag' | 'pixels' | 'gate' | 'bins' | 'arrows' | 'line';

export interface Topic {
  id: string;            // route: #id
  title: string;
  abbr: string;          // short tab label in the top bar
  group: string;         // topics in one group share the top-bar tabs
  color: string;         // tile and accent colour
  thumb: Thumb;
  tags: string[];
  blurb: string;
  entry?: string;        // dictionary entry shown in the e-Lecture
  section?: string;      // page section (data/pages.ts) shown in the e-Lecture
  animated: boolean;     // has a step-by-step trace with the playback bar
}

const F = 'Foundations', O = 'Oblivious primitives', M = 'Secure computation', S = 'Set operations', C = 'Classical ciphers', D = 'Modern primitives';
const COL: Record<string, string> = { [F]: '#5C6BC0', [O]: '#00897B', [M]: '#8E24AA', [S]: '#EF6C00', [C]: '#C62828', [D]: '#1E88E5' };
const t = (id: string, title: string, abbr: string, group: string, thumb: Thumb, tags: string[], blurb: string, animated: boolean, extra: Partial<Topic> = {}): Topic =>
  ({ id, title, abbr, group, color: COL[group], thumb, tags, blurb, animated, entry: id, ...extra });

export const TOPICS: Topic[] = [
  t('ss', 'Secret Sharing', 'SS', F, 'points', ['shamir', 'threshold', 'mpc'], 'Split a secret into shares; any t rebuild it, fewer reveal nothing.', true),
  t('commit', 'Commitment', 'COM', F, 'lock', ['hash', 'binding', 'hiding'], 'Seal a value now, open it later, and prove you could not change it.', true),
  t('dh', 'Diffie–Hellman', 'DH', F, 'parties', ['key exchange', 'public key'], 'Two strangers agree on a shared key over a public channel.', true),
  t('he', 'Homomorphic Encryption', 'HE', F, 'arrows', ['paillier', 'public key'], 'Add numbers while they stay encrypted.', true),
  t('zk', 'Zero-Knowledge Proof', 'ZK', F, 'cave', ['proof', 'interactive'], 'Convince a verifier without revealing the secret.', true),

  t('ot', 'Oblivious Transfer', 'OT', O, 'parties', ['1-out-of-2', 'mpc', 'base ot'], 'The receiver gets one of two messages; the sender never learns which.', true),
  t('otext', 'OT Extension', 'IKNP', O, 'matrix', ['iknp', 'symmetric key'], 'Turn a few base OTs into many by transposing a bit matrix.', true),
  t('pcg', 'Silent OT / PCG', 'PCG', O, 'bars', ['vole', 'lpn', 'communication'], 'How much communication a million OTs cost, three ways.', false),
  t('oprf', 'Oblivious PRF', 'OPRF', O, 'parties', ['blinding', 'psi', 'opaque'], 'Evaluate a keyed function on your input without showing it.', true),
  t('opprf', 'Programmable OPRF', 'OPPRF', O, 'table', ['okvs', 'circuit-psi'], 'An OPRF whose outputs the server fixes at chosen points.', true),
  t('okvs', 'Oblivious Key-Value Store', 'OKVS', O, 'squares', ['data structure', 'linear algebra'], 'Encode key–value pairs so that inserted keys look like any other.', true),
  t('vole', 'Vector OLE', 'VOLE', O, 'line', ['correlation', 'silent'], 'Points on a line whose slope only one party knows.', false),

  t('gc', 'Garbled Circuits', 'GC', M, 'gate', ['yao', 'mpc'], 'Evaluate an encrypted gate by opening exactly one table row.', true),
  t('cuckoo', 'Cuckoo Hashing', 'CUCKOO', M, 'bins', ['hashing', 'psi'], 'Insert items that kick each other between two candidate bins.', true),
  t('shuffle', 'Oblivious Shuffle', 'SHUF', M, 'arrows', ['permute + share', 'psu'], 'Permute a list so nobody links positions to items.', false),

  t('psi', 'Private Set Intersection', 'PSI', S, 'venn', ['dh-psi', 'oprf', 'vole', 'circuit'], 'Five PSI protocols on the same two sets, step by step.', true),
  t('psu', 'Private Set Union', 'PSU', S, 'venn', ['rpmt', 'shuffle', 'ot'], 'Membership test plus OT, with and without a shuffle.', true),
  t('psufw', 'PSU Frameworks & Aborts', 'PSU-FW', S, 'table', ['rpmt', 'mcrg', 'polynomial', 'aon'], 'RPMT, MCRG and polynomial PSU, and what leaks if the run stops early.', true, { entry: 'mcrg', section: 'psu-fw' }),
  t('aon', 'All-or-Nothing Output', 'AON', S, 'squares', ['incomplete execution', 'compiler'], 'Drop any message atom and the receiver learns nothing.', false, { section: 'psu-aon' }),
  t('variants', 'PSI Variants', 'VAR', S, 'venn', ['psi-ca', 'psi-sum', 'labeled'], 'What each PSI-style functionality reveals for the same sets.', false),

  t('caesar', 'Caesar Cipher', 'CAESAR', C, 'wheel', ['shift', 'brute force'], 'Shift letters around a wheel, then break it by trying all 26.', true, { section: 'cl-caesar' }),
  t('freqan', 'Frequency Analysis', 'FREQ', C, 'bars', ['substitution', 'cryptanalysis'], 'Break a substitution cipher by counting letters.', false, { section: 'cl-freq' }),
  t('vigenere', 'Vigenère Cipher', 'VIG', C, 'matrix', ['polyalphabetic', 'tabula recta'], 'A keyword picks a different shift for every letter.', true, { section: 'cl-vig' }),
  t('railfence', 'Rail Fence', 'RAIL', C, 'zigzag', ['transposition'], 'Write the message in a zigzag, read it rail by rail.', true, { entry: undefined, section: 'cl-rail' }),
  t('otp', 'One-Time Pad', 'OTP', C, 'squares', ['xor', 'perfect secrecy'], 'XOR with a random key used once: perfectly secret.', true, { section: 'cl-otp' }),

  t('blockcipher', 'Block Cipher Avalanche', 'BLOCK', D, 'matrix', ['spn', 'aes', 'diffusion'], 'Flip one bit and watch it spread round by round.', true, { section: 'mo-block' }),
  t('modes', 'Modes of Operation', 'MODES', D, 'pixels', ['ecb', 'cbc', 'ctr'], 'Encrypt a picture with ECB, CBC and CTR, block by block.', true, { entry: 'blockcipher', section: 'mo-modes' }),
  t('hash', 'Hash Functions', 'SHA', D, 'squares', ['sha-256', 'avalanche'], 'Change one character and about half the digest flips.', false, { section: 'mo-hash' }),
  t('rsa', 'RSA', 'RSA', D, 'lock', ['public key', 'signature'], 'Key generation, encryption, decryption and signatures.', true, { section: 'mo-rsa' }),
  t('ecc', 'Elliptic Curves', 'ECC', D, 'curve', ['point addition', 'discrete log'], 'Add points on a curve and walk the multiples of P.', true, { section: 'mo-ecc' }),
];

export const TOPIC_BY_ID: Record<string, Topic> = Object.fromEntries(TOPICS.map(x => [x.id, x]));
export const GROUPS = [F, O, M, S, C, D];
