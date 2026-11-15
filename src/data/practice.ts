// One practice question per dictionary term. `answer` is the index into `choices`.
import { ENTRIES } from './entries';

export interface PracticeQ {
  prompt: string;
  choices: string[];
  answer: number;
  why: string;
}

export const PRACTICE: Record<string, PracticeQ> = {
  aon: {
    prompt: 'A run of an all-or-nothing protocol is cut off before the end. What may the output party learn?',
    choices: [
      'Either the complete output, or nothing that depends on the output',
      'A partial intersection, one item at a time',
      'The other party’s whole set, but not the union',
      'Whichever messages the network dropped, in the clear',
    ],
    answer: 0,
    why: 'All-or-nothing output means a stopped run reveals no output-dependent information. The party gets the full output or none of it.',
  },
  beaver: {
    prompt: 'A Beaver triple is a pre-shared random triple (a, b, c). Which relation does it satisfy?',
    choices: ['c = a + b', 'c = a XOR b', 'c = a · b', 'a, b, and c are three shares of one secret'],
    answer: 2,
    why: 'The triple obeys c = a·b. Opening a masked product then lets the parties multiply secret-shared values in one round.',
  },
  blockcipher: {
    prompt: 'What is a block cipher?',
    choices: [
      'A public-key signature on a message digest',
      'A keyed permutation of fixed-size blocks, used through a mode such as CTR',
      'A hash that accepts an input of any length',
      'A pad as long as the message, used once',
    ],
    answer: 1,
    why: 'AES, for example, is a keyed permutation on 128-bit blocks. A mode of operation such as CBC, CTR, or GCM applies it to longer messages.',
  },
  caesar: {
    prompt: 'A Caesar cipher shifts every letter by 3. What is CAT?',
    choices: ['FDW', 'DBU', 'XFQ', 'FDX'],
    answer: 0,
    why: 'C→F, A→D, T→W. Only 25 shifts are useful, so trying every shift breaks the cipher.',
  },
  'circuit-psi': {
    prompt: 'How does circuit-PSI deliver the intersection?',
    choices: [
      'In the clear to both parties',
      'As a public count only',
      'Secret-shared, so later secure computation can use it',
      'Encrypted under a key that is then deleted',
    ],
    answer: 2,
    why: 'The intersection stays secret-shared. Neither party sees the items, and a circuit can keep computing on those shares.',
  },
  commit: {
    prompt: 'Which two properties define a commitment?',
    choices: [
      'Hiding and binding',
      'Completeness and zero-knowledge',
      'Confusion and diffusion',
      'CPA security and CCA security',
    ],
    answer: 0,
    why: 'Hiding means the commitment reveals nothing about the value. Binding means the sender cannot open it to a different value later.',
  },
  'correlated-ot': {
    prompt: 'In correlated OT, how are the sender’s two messages related?',
    choices: [
      'They are identical',
      'The receiver chose both of them',
      'They differ by 1 in the integers',
      'm₁ = m₀ XOR Δ for one global offset Δ',
    ],
    answer: 3,
    why: 'Correlated OT is cheaper than chosen-message OT because the messages differ by a single offset. It converts to ordinary OT afterward.',
  },
  cuckoo: {
    prompt: 'Both candidate bins for a new item are full. What does cuckoo hashing do?',
    choices: [
      'Evicts an occupant and moves it to that occupant’s other bin',
      'Stores both items in the same bin',
      'Drops the new item',
      'Appends the item to a public sorted list',
    ],
    answer: 0,
    why: 'Each item may live in one of two bins. Inserting kicks the current occupant to its alternative bin, and a small stash catches a rare loop.',
  },
  dh: {
    prompt: 'Alice sends gᵃ and Bob sends gᵇ. What shared secret do they both compute?',
    choices: ['gᵃ⁺ᵇ', 'a · b', 'gᵃᵇ', 'g, which was already public'],
    answer: 2,
    why: '(gᵃ)ᵇ = (gᵇ)ᵃ = gᵃᵇ. An eavesdropper sees gᵃ and gᵇ, not the exponents.',
  },
  sig: {
    prompt: 'What can anyone do with a digital signature and the signer’s public key?',
    choices: [
      'Recover the private key from the signature',
      'Decrypt the message',
      'Check that the private-key holder signed this exact message',
      'Edit the message and keep the same signature valid',
    ],
    answer: 2,
    why: 'Only the private key produces a valid signature. Anyone with the public key can verify it, and a changed message no longer checks.',
  },
  during: {
    prompt: 'When is during-execution leakage dangerous?',
    choices: [
      'When a finished run’s output already includes that same information',
      'When aborted runs can be repeated and used as a membership oracle',
      'When the parties use a fresh one-time pad',
      'When a hash has no known collision',
    ],
    answer: 1,
    why: 'Learning the intersection size before the protocol finishes is harmless if the output implies it. If the run can abort, repeating that leak tests membership.',
  },
  ecc: {
    prompt: 'Elliptic-curve cryptography is hard to break because of which problem?',
    choices: [
      'The elliptic-curve discrete logarithm',
      'Factoring n = p · q',
      'Matching letter frequencies',
      'Finding a collision in SHA-256',
    ],
    answer: 0,
    why: 'The scheme works in the group of points on a curve. Recovering the secret scalar from a point is the elliptic-curve discrete logarithm. Keys are shorter than RSA keys at the same security level.',
  },
  'free-xor': {
    prompt: 'Why does free-XOR evaluate an XOR gate with no ciphertexts?',
    choices: [
      'The two labels on every wire differ by one secret offset',
      'XOR gates are deleted from the circuit',
      'The evaluator is given both labels of each wire',
      'Each XOR is replaced by a fresh oblivious transfer',
    ],
    answer: 0,
    why: 'If every wire’s labels differ by the same secret R, XORing labels XORs the bits. The garbler sends ciphertexts only for non-XOR gates.',
  },
  freqan: {
    prompt: 'Frequency analysis breaks a simple substitution by using what fact?',
    choices: [
      'The ciphertext keeps the letter frequencies of the language',
      'There are only 25 Caesar keys',
      'The key is as long as the message and used once',
      'The modulus n is a product of two primes',
    ],
    answer: 0,
    why: 'A substitution does not change how often letters appear. The most common ciphertext letter is a candidate for the most common plaintext letter.',
  },
  gbf: {
    prompt: 'How does a garbled Bloom filter store an item?',
    choices: [
      'It writes the item in the clear into one bin',
      'It XOR-shares the value across the k positions the item hashes to',
      'It encrypts the item with RSA',
      'It appends the item to a sorted list',
    ],
    answer: 1,
    why: 'Each item is split by XOR across its hashed cells. That layout was an early oblivious key-value store.',
  },
  gc: {
    prompt: 'In Yao’s garbled circuit, what can the evaluator decrypt at each gate?',
    choices: [
      'Every row of the truth table',
      'Exactly one row, using the one label it holds for each input wire',
      'Nothing, until the garbler opens both labels',
      'The garbler’s input bits, directly',
    ],
    answer: 1,
    why: 'Each row is the output label encrypted under one pair of input labels, and the rows are shuffled. One label per input wire opens one row and hides which bit that label means.',
  },
  gmw: {
    prompt: 'In the GMW protocol, how is an AND gate evaluated?',
    choices: [
      'Locally, with no interaction, like an XOR',
      'By sending the plaintext bits',
      'With an oblivious transfer or a Beaver triple',
      'With a Caesar shift of the shares',
    ],
    answer: 2,
    why: 'XOR of secret shares is local. Each AND needs interaction: an OT or a Beaver triple.',
  },
  hash: {
    prompt: 'What do we require of a cryptographic hash such as SHA-256?',
    choices: [
      'It is one-way and collision resistant, and the digest has fixed length',
      'Anyone with the public key can invert it',
      'It is a keyed permutation of one block',
      'Reusing the digest is perfectly secret',
    ],
    answer: 0,
    why: 'A hash maps any input to a fixed-length digest. It should be infeasible to invert or to find two inputs with the same digest.',
  },
  he: {
    prompt: 'Paillier encryption is additively homomorphic. What does that let Bob compute?',
    choices: [
      'An encryption of m₁ + m₂ from Enc(m₁) and Enc(m₂), without the secret key',
      'The plaintext m₁ from Enc(m₁) alone',
      'A signature on m₁',
      'The discrete log of the ciphertext',
    ],
    answer: 0,
    why: 'Multiplying Paillier ciphertexts adds the plaintexts. Bob never needs Alice’s secret key to do that arithmetic.',
  },
  ideal: {
    prompt: 'In the ideal/real paradigm, a protocol is secure when:',
    choices: [
      'Both parties publish their inputs',
      'The transcript is shorter than the input',
      'Whatever an adversary sees can be simulated from the ideal trusted party’s output',
      'The hash is modelled as SHA-256 specifically',
    ],
    answer: 2,
    why: 'The ideal world hands the parties only what the function should reveal. If the real transcript can be simulated from that, the protocol leaked nothing more.',
  },
  iblt: {
    prompt: 'How does an invertible Bloom lookup table recover a set difference?',
    choices: [
      'By peeling cells that currently hold a single element, then updating their neighbours',
      'By asking the other party to list the missing items',
      'By factoring a public modulus',
      'By trying every subset of the larger set',
    ],
    answer: 0,
    why: 'Cells store counts and XOR sums. A cell whose count is one reveals that element, and removing it may free another cell. Secure peeling gives a fast two-sided private set union.',
  },
  kerckhoffs: {
    prompt: 'Kerckhoffs’s principle says a system should stay secure when:',
    choices: [
      'The algorithm is secret and the key may be short',
      'Everything except the key is public',
      'The ciphertext is never shown to the adversary',
      'The same keyword is reused on every message',
    ],
    answer: 1,
    why: 'The method may be published. Secrecy has to rest on the key.',
  },
  lpn: {
    prompt: 'Learning parity with noise assumes it is hard to:',
    choices: [
      'Factor n = p · q',
      'Find the most common letter in English',
      'Decode a random linear code that was perturbed by sparse noise',
      'Invert a one-time pad that was used once',
    ],
    answer: 2,
    why: 'LPN is the hardness of decoding a random linear code with a few flipped bits. Silent OT and VOLE constructions rely on it.',
  },
  mcrg: {
    prompt: 'The sender holds item x and the receiver holds set Y. Their membership-conditional strings r and r′ are equal when:',
    choices: [
      'x is not in Y',
      'x is in Y',
      'Always, whatever x and Y are',
      'Never; the strings are independent',
    ],
    answer: 0,
    why: 'r = r′ exactly when x ∉ Y. The receiver can open an encryption under r only for items outside Y, so no membership bit is revealed.',
  },
  okvs: {
    prompt: 'When is the vector P of an oblivious key-value store hiding which keys were inserted?',
    choices: [
      'When the stored values are random',
      'When the keys are stored next to P in the clear',
      'When P is sorted',
      'Only after P is signed',
    ],
    answer: 0,
    why: 'Decoding any key, inserted or not, returns a field element. If the programmed values were random, an inserted key looks like any other key.',
  },
  opprf: {
    prompt: 'What can the server do in an oblivious programmable PRF that it cannot do in a plain OPRF?',
    choices: [
      'Learn the client’s query',
      'Hand the client the PRF key',
      'Choose the output at selected points, while other points stay pseudorandom',
      'Skip the oblivious evaluation entirely',
    ],
    answer: 2,
    why: 'The server programs chosen points, often by publishing an OKVS hint. The client cannot tell a programmed output from a pseudorandom one.',
  },
  oprf: {
    prompt: 'An oblivious PRF gives the client Fₖ(x). What stays hidden?',
    choices: [
      'The server learns x, and the client learns k',
      'The server learns nothing about x, and the client learns nothing about k',
      'Both parties learn k and x',
      'The client learns every point of Fₖ',
    ],
    answer: 1,
    why: 'The client obtains the PRF output at its own input only. The key stays with the server, and the input stays with the client.',
  },
  shuffle: {
    prompt: 'After an oblivious shuffle of a secret-shared list, who knows the permutation?',
    choices: [
      'Both parties, because the list is sorted in the clear',
      'Neither party alone can link output positions back to input positions',
      'Only the party who sees the data in the clear',
      'Anyone who reads the transcript',
    ],
    answer: 1,
    why: 'The output is a permuted secret-shared list. No single party knows both the permutation and how the positions line up.',
  },
  switching: {
    prompt: 'An oblivious switching network, as used for shuffling, does what?',
    choices: [
      'Applies one party’s permutation to the other party’s data and outputs shares',
      'Sorts both sets in the clear',
      'Shifts every letter by the same amount',
      'Encrypts each item under RSA',
    ],
    answer: 0,
    why: 'A Beneš network of oblivious transfers applies one party’s permutation to the other party’s data. The result is shared, so neither side sees both the data and the permutation.',
  },
  ot: {
    prompt: 'In 1-out-of-2 oblivious transfer, the receiver obtains:',
    choices: [
      'Both messages, and the sender learns the choice bit',
      'Exactly the chosen message, and nothing about the other one',
      'Neither message',
      'The sender’s two messages XOR-ed together',
    ],
    answer: 1,
    why: 'The sender learns nothing about the choice. The receiver learns nothing about the message it did not choose. OT is complete for secure computation.',
  },
  otp: {
    prompt: 'When is a one-time pad perfectly secret?',
    choices: [
      'The key is a short keyword that repeats',
      'The key is uniformly random, as long as the message, and never reused',
      'The key is the first letter of the message',
      'The key is public and only the algorithm is secret',
    ],
    answer: 1,
    why: 'XOR with a fresh uniform key as long as the message hides it perfectly. Reusing the key, as a two-time pad, leaks the XOR of the two messages.',
  },
  otext: {
    prompt: 'OT extension produces many oblivious transfers from a few base OTs by using:',
    choices: [
      'A new public-key operation for every extra OT',
      'Frequency analysis of the messages',
      'Symmetric-key operations: hashing and XOR',
      'Homomorphic encryption of every row',
    ],
    answer: 2,
    why: 'IKNP spends public-key work on about κ base OTs, then stretches them into m ≫ κ OTs with hashing and XOR only.',
  },
  paxos: {
    prompt: 'PaXoS is best described as:',
    choices: [
      'A classical polyalphabetic cipher',
      'A signature scheme based on factoring',
      'A linear-time oblivious key-value store on a two-hash cuckoo graph',
      'A Bloom filter that cannot be decoded',
    ],
    answer: 2,
    why: 'Probe-and-XOR of strings encodes key-value pairs in linear time using a cuckoo graph. RB-OKVS is the later banded-matrix version.',
  },
  psi: {
    prompt: 'Alice holds A and Bob holds B. One-sided private set intersection lets Alice learn:',
    choices: [
      'A ∩ B, and not the rest of Bob’s set',
      'Bob’s entire set B',
      'Only the union A ∪ B',
      'Nothing; only Bob learns the intersection',
    ],
    answer: 0,
    why: 'The receiver learns the items in common. The sender does not learn Alice’s set, and Alice does not learn Bob’s items outside the intersection.',
  },
  psu: {
    prompt: 'In one-sided private set union, the receiver ends up able to list:',
    choices: [
      'Only the intersection',
      'The union, which means it must receive the sender’s items it did not already hold',
      'A count of the intersection and no items',
      'The sender’s set sorted in its original order',
    ],
    answer: 1,
    why: 'The receiver learns A ∪ B. That requires the sender’s items outside the receiver’s set, without revealing which of the sender’s items were already members.',
  },
  pcg: {
    prompt: 'A pseudorandom correlation generator lets the parties:',
    choices: [
      'Expand short correlated seeds locally into a long OT or VOLE correlation',
      'Send a full message for every OT they will ever need',
      'Publish one shared seed in the clear',
      'Replace the correlation with a hash of the input',
    ],
    answer: 0,
    why: 'After a small setup, each party stretches its seed locally. Communication stays sublinear in the number of correlations, which is why the result is called silent.',
  },
  variants: {
    prompt: 'PSI cardinality (PSI-CA) reveals:',
    choices: [
      'The items in the intersection',
      'The union of the two sets',
      'Each item’s associated label',
      'How many items are in the intersection, not which ones',
    ],
    answer: 3,
    why: 'A variant reveals a function of the intersection. PSI-CA reveals the size, PSI-Sum a sum of associated values, and labeled PSI the labels.',
  },
  'random-oracle': {
    prompt: 'In the random oracle model, a hash function is treated as:',
    choices: [
      'A truly random function that every party can query',
      'A keyed permutation of one block',
      'An elliptic-curve group',
      'A one-time pad that may be reused',
    ],
    answer: 0,
    why: 'Proofs pretend the hash answers each new query with a fresh random value and repeats itself on repeated queries. Real hashes only approximate that.',
  },
  rpmt: {
    prompt: 'A reverse private membership test tells:',
    choices: [
      'The party who holds the set whether the other party’s hidden item is a member',
      'Both parties the item in the clear',
      'The sender the whole set',
      'Only the size of the union',
    ],
    answer: 0,
    why: 'The set holder learns the membership bit and does not see the item. The multi-query form is the usual first step of a linear-time private set union.',
  },
  rsa: {
    prompt: 'With public exponent e and modulus n, RSA encryption of a message m is:',
    choices: ['c = m + e', 'c = m XOR e', 'c = mᵉ mod n', 'c = m · φ(n)'],
    answer: 2,
    why: 'Encryption raises m to the public exponent modulo n = p·q. Decryption raises the ciphertext to the private exponent d, where e·d ≡ 1 (mod φ(n)).',
  },
  ss: {
    prompt: 'In t-out-of-n Shamir sharing, which shares reconstruct the secret?',
    choices: [
      'Any t shares; any t − 1 shares reveal nothing',
      'Only all n shares',
      'Only the first share',
      'Any two shares, whatever t was',
    ],
    answer: 0,
    why: 'The secret is the constant term of a polynomial of degree t − 1. Any t points determine it, and fewer points fit every possible secret.',
  },
  'semi-honest': {
    prompt: 'A semi-honest adversary:',
    choices: [
      'Follows the protocol, then studies everything it was allowed to see',
      'May send any message it wants',
      'Aborts before the first message',
      'Controls the ideal trusted party',
    ],
    answer: 0,
    why: 'Semi-honest means honest-but-curious: no deviation from the protocol, but no promise to forget the transcript. A malicious adversary may deviate arbitrarily.',
  },
  silent: {
    prompt: 'Silent OT gets its name because:',
    choices: [
      'The parties never send any message at all',
      'Communication stays small as the number of OTs grows',
      'The receiver never learns a message',
      'It uses no cryptographic assumption',
    ],
    answer: 1,
    why: 'A pseudorandom correlation generator expands a short seed into many OTs. The communication does not grow with every extra OT.',
  },
  subfield: {
    prompt: 'In subfield VOLE, which value is drawn from the small field?',
    choices: [
      'The vector A; Δ and the other vectors live in an extension field',
      'The public modulus n',
      'Every coordinate, including Δ',
      'Only the receiver’s choice bit',
    ],
    answer: 0,
    why: 'A lies in a small field such as the bits, while Δ, B, and C lie in an extension. That cuts communication in the RR22 private set intersection.',
  },
  unbalanced: {
    prompt: 'Unbalanced PSI is the setting where:',
    choices: [
      'One set is much larger than the other',
      'Both sets have the same size',
      'The output is a union',
      'Neither party uses cryptography',
    ],
    answer: 0,
    why: 'A small set, such as a phone’s contacts, is matched against a huge server set. Homomorphic encryption keeps the small side’s work low.',
  },
  vole: {
    prompt: 'Vector oblivious linear evaluation gives the parties vectors satisfying:',
    choices: [
      'B = C + A · Δ, one coordinate at a time',
      'B = A XOR C, with no secret slope',
      'B = Δ, and A and C are public',
      'A = B = C = Δ',
    ],
    answer: 0,
    why: 'Each coordinate is a point on a line of secret slope Δ. Alice holds A and C, Bob holds Δ and B, and neither side knows the whole line.',
  },
  vigenere: {
    prompt: 'The keyword is CAT and the plaintext is HELLO. The Vigenère ciphertext is:',
    choices: ['IFMMP', 'JEENO', 'HFNLP', 'CATHE'],
    answer: 1,
    why: 'The shifts are C, A, T, C, A, which is 2, 0, 19, 2, 0. HELLO moves by those amounts to JEENO. The keyword repeats, unlike a one-time pad.',
  },
  zk: {
    prompt: 'A zero-knowledge proof convinces the verifier that:',
    choices: [
      'The statement is true, and reveals nothing else about the witness',
      'The witness can be read off the proof',
      'The statement is false',
      'Both parties now know the witness',
    ],
    answer: 0,
    why: 'The verifier accepts a true statement and learns nothing beyond that truth. In the cave story, a cheater who lacks the password survives each round only half the time.',
  },
};

const missing = ENTRIES.filter(e => !PRACTICE[e.id]);
const extra = Object.keys(PRACTICE).filter(id => !ENTRIES.some(e => e.id === id));
if (missing.length || extra.length) {
  throw new Error(`Practice questions out of sync with the dictionary: missing ${missing.map(e => e.id).join(', ')}; extra ${extra.join(', ')}`);
}
