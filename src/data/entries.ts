// Dictionary entries. HTML fields are trusted, hand-written markup rendered with <Html>.
// Citations use <a class="cite" data-paper="id">; the app turns them into bibliography links.
export interface FullEntry {
  id: string; headword: string; abbr: string; pos: string; cat: string; short: false;
  senses: string[]; func: string; prose: string; demo: string | null; uses: string; library: string;
  origin: string; seeAlso: string[];
}
export interface ShortEntry {
  id: string; headword: string; abbr: string; pos: string; cat: string; short: true;
  definition: string; origin: string; seeAlso: string[];
}
export type Entry = FullEntry | ShortEntry;

export const ENTRIES: Entry[] = [
 {
  "id": "aon",
  "headword": "all-or-nothing output",
  "abbr": "AON",
  "pos": "n.",
  "cat": "security notion",
  "definition": "An output-delivery property for two-party computation: the output party obtains either the complete output or no output-dependent information beyond public parameters, even if the execution is cut short. Modelled with an atomic secure channel whose router may drop but not read or alter message atoms; a generic compiler achieves it for pre-final simulatable one-sided protocols.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"sokpsu\">[SoK-PSU]</a>",
  "seeAlso": [
   "during",
   "psu",
   "mcrg"
  ],
  "short": true
 },
 {
  "id": "beaver",
  "headword": "Beaver triple",
  "abbr": "",
  "pos": "n.",
  "cat": "foundation",
  "definition": "A pre-shared random triple (a, b, c = a·b) that lets parties multiply secret-shared values with a single round of openings.",
  "origin": "D. Beaver, 1991.",
  "seeAlso": [
   "ss",
   "gmw"
  ],
  "short": true
 },
 {
  "id": "blockcipher",
  "headword": "block cipher",
  "abbr": "",
  "pos": "n.",
  "cat": "symmetric primitive",
  "definition": "A keyed permutation on fixed-size blocks, such as AES on 128-bit blocks, built from rounds of substitution and permutation. Used through a mode of operation such as CBC, CTR or GCM. <a href=\"#mo-block\">Watch the avalanche effect →</a>",
  "origin": "DES 1977; AES 2001.",
  "seeAlso": [
   "hash",
   "otp"
  ],
  "short": true
 },
 {
  "id": "caesar",
  "headword": "Caesar cipher",
  "abbr": "",
  "pos": "n.",
  "cat": "classical cipher",
  "definition": "A substitution cipher that shifts every letter a fixed number of places in the alphabet. With only 25 non-trivial keys it falls to brute force. <a href=\"#cl-caesar\">Try the cipher wheel →</a>",
  "origin": "Julius Caesar, 1st century BC.",
  "seeAlso": [
   "freqan",
   "vigenere"
  ],
  "short": true
 },
 {
  "id": "circuit-psi",
  "headword": "circuit-PSI",
  "abbr": "",
  "pos": "n.",
  "cat": "functionality",
  "definition": "PSI whose output stays secret-shared between the parties, so that further secure computation can run on it. Demonstrated in the <i>Circuit-PSI</i> tab under private set intersection.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"hek12\">[HEK12]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"psty19\">[PSTY19]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"rs21\">[RS21]</a>",
  "seeAlso": [
   "psi",
   "opprf",
   "ss"
  ],
  "short": true
 },
 {
  "id": "commit",
  "headword": "commitment",
  "abbr": "COM",
  "pos": "n.",
  "cat": "foundation",
  "senses": [
   "A two-phase protocol in which a party first fixes a value without revealing it (<i>commit</i>) and later discloses it verifiably (<i>open</i>).",
   "The message c sent in the first phase."
  ],
  "func": "<div class=\"row\"><span class=\"k\">commit</span><span>Alice: value v, nonce r → c = H(v ‖ r) to Bob</span></div> <div class=\"row\"><span class=\"k\">open</span><span>Alice reveals (v, r); Bob checks H(v ‖ r) = c</span></div>",
  "prose": "<div class=\"prose def\"><p>A sealed envelope. <b>Hiding</b>: c tells Bob nothing about v. <b>Binding</b>: once c is sent, Alice cannot open it to a different value. The random nonce matters; without it Bob could hash every guess and compare.</p></div>",
  "demo": "w-com",
  "uses": "<b>Used in</b> coin flipping, zero-knowledge proofs, malicious-secure OT and PSI.",
  "library": "",
  "origin": "Folklore; the hash-based form is analysed in the random oracle model.",
  "seeAlso": [
   "zk",
   "random-oracle"
  ],
  "short": false
 },
 {
  "id": "correlated-ot",
  "headword": "correlated OT",
  "abbr": "COT",
  "pos": "n.",
  "cat": "primitive",
  "definition": "OT in which the two messages differ by one global offset, m₁ = m₀ ⊕ Δ. <i>Random OT</i> (ROT) has uniformly random messages. Both are cheaper to produce than chosen-message OT and convert to it easily.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"alsz13\">[ALSZ13]</a>",
  "seeAlso": [
   "ot",
   "otext",
   "vole"
  ],
  "short": true
 },
 {
  "id": "cuckoo",
  "headword": "cuckoo hashing",
  "abbr": "CH",
  "pos": "n.",
  "cat": "data structure",
  "senses": [
   "A hashing scheme in which each item may occupy one of several candidate bins, displacing the current occupant to its alternative bin when necessary."
  ],
  "func": "<div class=\"row\"><span class=\"k\">structure</span><span>table of m bins, each item may live in bin h₁(x) or h₂(x); one item per bin</span></div> <div class=\"row\"><span class=\"k\">insert</span><span>if both bins are full, evict an occupant and move it to its other bin; give up to a small stash</span></div>",
  "prose": "<div class=\"prose def\"><p>Not cryptography itself, but the reason PSI scales. Alice puts each item into a single bin with cuckoo hashing; Bob puts each of his items into <em>both</em> candidate bins with simple hashing. Now each bin needs only a small comparison (one OPRF instance), instead of comparing everything with everything.</p></div>",
  "demo": "w-cuckoo",
  "uses": "",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"pagh01\">[PR01]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"psz14\">[PSZ14]</a>",
  "seeAlso": [
   "psi",
   "circuit-psi"
  ],
  "short": false
 },
 {
  "id": "dh",
  "headword": "Diffie–Hellman key exchange",
  "abbr": "DH",
  "pos": "n.",
  "cat": "foundation",
  "senses": [
   "A protocol by which two parties derive a shared secret g<sup>ab</sup> over a public channel.",
   "By extension, any construction exploiting (g<sup>a</sup>)<sup>b</sup> = (g<sup>b</sup>)<sup>a</sup>, as in DH-PSI and blind-exponentiation OPRFs."
  ],
  "func": "<div class=\"row\"><span class=\"k\">public</span><span>group of prime order q, generator g</span></div> <div class=\"row\"><span class=\"k\">output</span><span>both parties get g<sup>ab</sup>; an eavesdropper sees only g<sup>a</sup>, g<sup>b</sup></span></div>",
  "prose": "<div class=\"prose def\"><p>The algebraic trick (g<sup>a</sup>)<sup>b</sup> = (g<sup>b</sup>)<sup>a</sup> is the seed of base OT, DH-based PSI and blind-exponentiation OPRFs later on this page.</p></div>",
  "demo": "w-dh",
  "uses": "",
  "library": "",
  "origin": "W. Diffie and M. Hellman, 1976.",
  "seeAlso": [
   "ot",
   "oprf",
   "psi"
  ],
  "short": false
 },
 {
  "id": "sig",
  "headword": "digital signature",
  "abbr": "",
  "pos": "n.",
  "cat": "public-key primitive",
  "definition": "A value only the private-key holder can produce for a message, which anyone can verify with the public key; altering the message invalidates it. <a href=\"#mo-rsa\">Sign and tamper →</a>",
  "origin": "Diffie and Hellman, 1976 (concept).",
  "seeAlso": [
   "rsa",
   "ecc",
   "hash"
  ],
  "short": true
 },
 {
  "id": "during",
  "headword": "during-execution leakage",
  "abbr": "",
  "pos": "n.",
  "cat": "security notion",
  "definition": "Output-dependent information, such as the intersection cardinality, that a party learns before a protocol completes. Harmless in a finished run when it is implied by the output, but meaningful when runs abort, since repeated aborted runs can act as a membership oracle.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"jszg24\">[JSZG24]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"pgt26\">[PGT26]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"sokpsu\">[SoK-PSU]</a>",
  "seeAlso": [
   "aon",
   "psu"
  ],
  "short": true
 },
 {
  "id": "ecc",
  "headword": "elliptic-curve cryptography",
  "abbr": "ECC",
  "pos": "n.",
  "cat": "public-key scheme",
  "definition": "Public-key cryptography over the group of points of an elliptic curve; security rests on the elliptic-curve discrete logarithm. Smaller keys than RSA for the same security. <a href=\"#mo-ecc\">Add points on a curve →</a>",
  "origin": "V. Miller, 1985; N. Koblitz, 1987.",
  "seeAlso": [
   "rsa",
   "dh",
   "sig"
  ],
  "short": true
 },
 {
  "id": "free-xor",
  "headword": "free-XOR",
  "abbr": "",
  "pos": "n.",
  "cat": "technique",
  "definition": "A garbling optimisation in which every wire's two labels differ by one secret offset R, so XOR gates need no ciphertexts.",
  "origin": "V. Kolesnikov and T. Schneider, 2008.",
  "seeAlso": [
   "gc"
  ],
  "short": true
 },
 {
  "id": "freqan",
  "headword": "frequency analysis",
  "abbr": "",
  "pos": "n.",
  "cat": "cryptanalysis",
  "definition": "Breaking a substitution cipher by matching the frequencies of ciphertext letters to those of the language. <a href=\"#cl-freq\">Break a cipher yourself →</a>",
  "origin": "Al-Kindi, 9th century.",
  "seeAlso": [
   "caesar",
   "vigenere"
  ],
  "short": true
 },
 {
  "id": "gbf",
  "headword": "garbled Bloom filter",
  "abbr": "GBF",
  "pos": "n.",
  "cat": "data structure",
  "definition": "A Bloom-filter-shaped array in which each item's value is XOR-shared across its k hashed positions; an early OKVS.",
  "origin": "C. Dong, L. Chen and Z. Wen, 2013.",
  "seeAlso": [
   "okvs"
  ],
  "short": true
 },
 {
  "id": "gc",
  "headword": "garbled circuit",
  "abbr": "GC",
  "pos": "n.",
  "cat": "technique",
  "senses": [
   "An encrypted Boolean circuit whose wires carry random labels instead of bits, evaluable given one label per input wire.",
   "<i>Yao's protocol</i>: two-party computation built from a garbled circuit and OT."
  ],
  "func": "<div class=\"row\"><span class=\"k\">garbler</span><span class=\"a\">Alice: picks two random labels per wire, encrypts each gate's truth table</span></div> <div class=\"row\"><span class=\"k\">evaluator</span><span class=\"b\">Bob: gets one label per input wire (his own via OT), decrypts exactly one row per gate</span></div>",
  "prose": "<div class=\"prose def\"><p>Yao's idea. Labels are random strings, so Bob holding a label learns nothing about which bit it stands for. Each garbled row is the output label encrypted under one pair of input labels, and rows are shuffled. With one label per input, Bob can open just one row.</p></div>",
  "demo": "w-gc",
  "uses": "",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"yao86\">[Yao86]</a>",
  "seeAlso": [
   "free-xor",
   "ot",
   "gmw",
   "circuit-psi"
  ],
  "short": false
 },
 {
  "id": "gmw",
  "headword": "GMW protocol",
  "abbr": "GMW",
  "pos": "n.",
  "cat": "protocol",
  "definition": "Secure computation in which every wire is secret-shared; XOR gates are computed locally and each AND gate consumes an OT or a Beaver triple.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"gmw87\">[GMW87]</a>",
  "seeAlso": [
   "ss",
   "beaver",
   "gc"
  ],
  "short": true
 },
 {
  "id": "hash",
  "headword": "hash function",
  "abbr": "",
  "pos": "n.",
  "cat": "symmetric primitive",
  "definition": "A function mapping inputs of any length to a fixed-length digest that is one-way and collision resistant, such as SHA-256. <a href=\"#mo-hash\">Compare two SHA-256 digests →</a>",
  "origin": "SHA-2, 2001.",
  "seeAlso": [
   "blockcipher",
   "commit",
   "random-oracle"
  ],
  "short": true
 },
 {
  "id": "he",
  "headword": "homomorphic encryption",
  "abbr": "HE",
  "pos": "n.",
  "cat": "foundation",
  "senses": [
   "Encryption that permits computation on ciphertexts, yielding an encryption of the result.",
   "<i>additively homomorphic</i>: supports addition only, e.g. Paillier.",
   "<i>fully homomorphic</i> (FHE): supports both addition and multiplication, e.g. BFV, CKKS."
  ],
  "func": "<div class=\"row\"><span class=\"k\">property</span><span>Enc(m₁) ⊗ Enc(m₂) = Enc(m₁ + m₂)</span></div> <div class=\"row\"><span class=\"k\">who</span><span>Bob computes on Alice's ciphertexts without the secret key</span></div>",
  "prose": "<div class=\"prose def\"><p>Paillier encryption is <em>additively</em> homomorphic: multiplying ciphertexts adds plaintexts, and raising a ciphertext to k multiplies the plaintext by k. Fully homomorphic schemes (BFV, CKKS) also multiply, and power <b>unbalanced PSI</b> where a phone checks a huge server set.</p></div>",
  "demo": "w-he",
  "uses": "",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"paillier99\">[Paillier99]</a>",
  "seeAlso": [
   "unbalanced",
   "psi"
  ],
  "short": false
 },
 {
  "id": "ideal",
  "headword": "ideal/real paradigm",
  "abbr": "",
  "pos": "n.",
  "cat": "security notion",
  "definition": "The style of definition in which a protocol is secure if everything an adversary sees can be simulated from what an ideal trusted party would have given it.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"ekr18\">[EKR18]</a>",
  "seeAlso": [
   "semi-honest"
  ],
  "short": true
 },
 {
  "id": "iblt",
  "headword": "invertible Bloom lookup table",
  "abbr": "IBLT",
  "pos": "n.",
  "cat": "data structure",
  "definition": "A Bloom-filter-like table whose cells store counts and XOR sums, so that the difference of two encoded sets can be recovered by repeatedly \"peeling\" cells holding a single element. Secure peeling yields fast two-sided PSU.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"pt26\">[PT26]</a>",
  "seeAlso": [
   "psu",
   "gbf"
  ],
  "short": true
 },
 {
  "id": "kerckhoffs",
  "headword": "Kerckhoffs's principle",
  "abbr": "",
  "pos": "n.",
  "cat": "design principle",
  "definition": "A cryptosystem should remain secure even if everything about it, except the key, is public. <a href=\"#cl-lessons\">Lessons from classical ciphers →</a>",
  "origin": "A. Kerckhoffs, 1883.",
  "seeAlso": [
   "otp",
   "blockcipher"
  ],
  "short": true
 },
 {
  "id": "lpn",
  "headword": "LPN",
  "abbr": "",
  "pos": "n.",
  "cat": "assumption",
  "definition": "Learning parity with noise: the hardness of decoding a random linear code with sparse noise. Most silent OT and VOLE constructions rest on it.",
  "origin": "",
  "seeAlso": [
   "pcg",
   "silent"
  ],
  "short": true
 },
 {
  "id": "mcrg",
  "headword": "membership-conditional randomness generation",
  "abbr": "MCRG",
  "pos": "n.",
  "cat": "primitive",
  "definition": "The sender holds x and the receiver a set Y; the sender obtains r and the receiver r′ with r = r′ exactly when x ∉ Y. Encrypting x under r lets the receiver open only non-members, so no membership bit is ever revealed. Basis of enhanced PSU.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"jszg24\">[JSZG24]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"tbz25\">[TBZ+25]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"hwy26\">[HWY+26]</a>",
  "seeAlso": [
   "psu",
   "rpmt",
   "aon"
  ],
  "short": true
 },
 {
  "id": "okvs",
  "headword": "oblivious key-value store",
  "abbr": "OKVS",
  "pos": "n.",
  "cat": "data structure",
  "senses": [
   "A data structure encoding key–value pairs into a vector P such that Decode(P, k) returns the value of every inserted key.",
   "<i>(oblivious)</i> The property that, when the values are random, P reveals nothing about which keys were inserted."
  ],
  "func": "<div class=\"row\"><span class=\"k\">Encode</span><span>{(k₁,v₁)…(kₙ,vₙ)} → vector P of m ≈ (1+ε)n field elements</span></div> <div class=\"row\"><span class=\"k\">Decode</span><span>Decode(P, k) = ⟨row(k), P⟩; equals vᵢ when k = kᵢ</span></div> <div class=\"row\"><span class=\"k\">oblivious</span><span>if values are random, P hides <em>which</em> keys were encoded</span></div>",
  "prose": "<div class=\"prose def\"><p>An OKVS is a data structure, not a protocol. Each key hashes to a sparse row of coefficients; encoding means solving the linear system \"row(kᵢ) · P = vᵢ\" with the remaining freedom filled randomly. Decoding any key, inserted or not, just returns a field element, so an inserted key looks like any other. Polynomials, garbled Bloom filters, PaXoS and RB-OKVS are all instances.</p></div>",
  "demo": "w-okvs",
  "uses": "<b>Used in</b> PaXoS / VOLE-PSI / RR22 PSI, OPPRF hints, PSU protocols.",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"prty19\">[SpOT-Light]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"prty20\">[PaXoS]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"gprty21\">[GPRTY21]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"rr22\">[RR22]</a>",
  "seeAlso": [
   "paxos",
   "gbf",
   "vole",
   "opprf"
  ],
  "short": false
 },
 {
  "id": "opprf",
  "headword": "oblivious programmable PRF",
  "abbr": "OPPRF",
  "pos": "n.",
  "cat": "primitive",
  "senses": [
   "An OPRF whose server may fix the outputs at chosen points, indistinguishably from the pseudorandom outputs elsewhere."
  ],
  "func": "<div class=\"row\"><span class=\"k\">server</span><span class=\"b\">Bob: points (x₁,y₁)…(xₙ,yₙ)</span></div> <div class=\"row\"><span class=\"k\">client</span><span class=\"a\">Alice: query q</span></div> <div class=\"row\"><span class=\"k\">output</span><span>Alice gets yᵢ if q = xᵢ, otherwise a random-looking value; she can't tell which case she's in</span></div>",
  "prose": "<div class=\"prose def\"><p>An OPRF whose outputs Bob can <em>program</em> at chosen points. Construction: run an OPRF to get F<sub>k</sub>(q), and let Bob publish an OKVS \"hint\" H that encodes xᵢ ↦ yᵢ − F<sub>k</sub>(xᵢ). Alice outputs F<sub>k</sub>(q) + Decode(H, q). This reuses the two widgets above.</p></div>",
  "demo": "w-opprf",
  "uses": "<b>Used in</b> multi-party PSI, circuit-PSI (PSTY19), PSU.",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"kmprt17\">[KMPRT17]</a>",
  "seeAlso": [
   "oprf",
   "okvs",
   "circuit-psi"
  ],
  "short": false
 },
 {
  "id": "oprf",
  "headword": "oblivious pseudorandom function",
  "abbr": "OPRF",
  "pos": "n.",
  "cat": "primitive",
  "senses": [
   "A protocol in which a client obtains F<sub>k</sub>(x) on its input x, where the key k is held by a server; the server learns nothing about x and the client nothing about k."
  ],
  "func": "<div class=\"row\"><span class=\"k\">server</span><span class=\"b\">Bob: PRF key k</span></div> <div class=\"row\"><span class=\"k\">client</span><span class=\"a\">Alice: input x</span></div> <div class=\"row\"><span class=\"k\">output</span><span>Alice gets F<sub>k</sub>(x). Bob learns nothing about x; Alice learns nothing about k.</span></div>",
  "prose": "<div class=\"prose def\"><p>A keyed hash that Alice can evaluate on her own inputs only with Bob's help, and only one point per interaction. The DH-style OPRF F<sub>k</sub>(x) = H(x)<sup>k</sup> uses blinding: Alice sends H(x)<sup>r</sup> for a fresh random r, Bob raises it to k, Alice strips r. Fast symmetric-key OPRFs (KKRT, VOLE-based) follow the same contract with different machinery.</p></div>",
  "demo": "w-oprf",
  "uses": "<b>Used in</b> PSI, password protocols (OPAQUE), Privacy Pass tokens, private contact discovery.",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"nr97\">[NR97]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"fipr05\">[FIPR05]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"kkrt16\">[KKRT16]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"cm20\">[CM20]</a>",
  "seeAlso": [
   "opprf",
   "psi",
   "okvs"
  ],
  "short": false
 },
 {
  "id": "shuffle",
  "headword": "oblivious shuffle",
  "abbr": "OSN",
  "pos": "n.",
  "cat": "primitive",
  "senses": [
   "A protocol that permutes a secret-shared list so that no single party knows how output positions correspond to input positions.",
   "<i>permute + share</i>: the two-party form in which one party holds the permutation and the other the data."
  ],
  "func": "<div class=\"row\"><span class=\"k\">input</span><span class=\"a\">Alice: list x₁…xₙ</span> · <span class=\"b\">Bob: permutation π</span></div> <div class=\"row\"><span class=\"k\">output</span><span>additive shares of x<sub>π(1)</sub>…x<sub>π(n)</sub>; Alice doesn't learn π, Bob doesn't learn x</span></div>",
  "prose": "<div class=\"prose def\"><p>Shuffling breaks the link between <em>position</em> and <em>identity</em>. Realized with an OT-based Beneš switching network (Mohassel–Sadeghian) or a secret-shared shuffle. Shuffle-based PSU uses this so the receiver cannot correlate which of the sender's items were duplicates.</p></div>",
  "demo": "w-shuf",
  "uses": "",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"cgp20\">[CGP20]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"gmrss21\">[GMRSS21]</a>",
  "seeAlso": [
   "switching",
   "psu",
   "ss"
  ],
  "short": false
 },
 {
  "id": "switching",
  "headword": "oblivious switching network",
  "abbr": "",
  "pos": "n.",
  "cat": "primitive",
  "definition": "An OT-based Beneš permutation network that applies one party's permutation to the other party's data and outputs shares of the result.",
  "origin": "P. Mohassel and S. Sadeghian, 2013.",
  "seeAlso": [
   "shuffle",
   "psu"
  ],
  "short": true
 },
 {
  "id": "ot",
  "headword": "oblivious transfer",
  "abbr": "OT",
  "pos": "n.",
  "cat": "primitive",
  "senses": [
   "<i>(1-out-of-2)</i> A protocol in which a sender inputs two messages and a receiver obtains exactly one of its choosing; the sender learns nothing about the choice and the receiver nothing about the other message.",
   "<i>(1-out-of-n)</i> The generalisation to n messages.",
   "Rabin's original variant, in which a single message arrives with probability ½."
  ],
  "func": "<div class=\"row\"><span class=\"k\">sender</span><span class=\"a\">Alice: messages m₀, m₁</span></div> <div class=\"row\"><span class=\"k\">receiver</span><span class=\"b\">Bob: choice bit c</span></div> <div class=\"row\"><span class=\"k\">output</span><span>Bob gets m<sub>c</sub>. Alice learns nothing about c; Bob learns nothing about m<sub>1−c</sub>.</span></div>",
  "prose": "<div class=\"prose def\"><p>OT is <em>complete</em> for secure computation: given OT, any function can be computed securely. The widget runs the \"simplest OT\" of Chou and Orlandi. Bob's message B looks the same whichever bit he picks, and only one of Alice's two derived keys matches the key Bob can compute.</p></div>",
  "demo": "w-ot",
  "uses": "<b>Variants</b> 1-out-of-n OT, random OT (messages chosen by the protocol), correlated OT (m₁ = m₀ ⊕ Δ). <b>Used in</b> garbled circuits, GMW, every OT-extension-based PSI.",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"rabin81\">[Rabin81]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"egl85\">[EGL85]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"np01\">[NP01]</a>",
  "seeAlso": [
   "otext",
   "correlated-ot",
   "gc",
   "psu"
  ],
  "short": false
 },
 {
  "id": "otp",
  "headword": "one-time pad",
  "abbr": "OTP",
  "pos": "n.",
  "cat": "classical cipher",
  "definition": "Encryption by XOR with a uniformly random key as long as the message, used once. Perfectly secret, but the key must never be reused. <a href=\"#cl-otp\">See perfect secrecy →</a>",
  "origin": "G. Vernam, 1917; C. Shannon, 1949.",
  "seeAlso": [
   "vigenere",
   "blockcipher"
  ],
  "short": true
 },
 {
  "id": "otext",
  "headword": "OT extension",
  "abbr": "IKNP",
  "pos": "n.",
  "cat": "primitive",
  "senses": [
   "A technique that turns a small number κ of base OTs into arbitrarily many OTs using only symmetric-key operations."
  ],
  "func": "<div class=\"row\"><span class=\"k\">input</span><span>κ \"base\" OTs (public-key, expensive)</span></div> <div class=\"row\"><span class=\"k\">output</span><span>m ≫ κ OTs using only hashing and XOR</span></div>",
  "prose": "<div class=\"prose def\"><p>Ishai, Kilian, Nissim and Petrank flip the roles: Bob (the eventual receiver) lays out a random matrix T and acts as the <em>sender</em> of κ base OTs on its columns. Alice picks secret bits s. She receives column j of T, or T ⊕ r if s<sub>j</sub> = 1. Read the resulting matrix Q by <b>rows</b> instead of columns and each row satisfies q<sub>i</sub> = t<sub>i</sub> ⊕ r<sub>i</sub>·s: a correlated OT per row. Hashing rows gives m independent OTs.</p></div>",
  "demo": "w-iknp",
  "uses": "",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"beaver96\">[Beaver96]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"iknp03\">[IKNP03]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"alsz13\">[ALSZ13]</a>",
  "seeAlso": [
   "ot",
   "pcg",
   "correlated-ot"
  ],
  "short": false
 },
 {
  "id": "paxos",
  "headword": "PaXoS",
  "abbr": "",
  "pos": "n.",
  "cat": "data structure",
  "definition": "Probe-and-XOR of strings: a linear-time OKVS built on a two-hash cuckoo graph. Its successor RB-OKVS uses random banded rows.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"prty20\">[PaXoS]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"rr22\">[RR22]</a>",
  "seeAlso": [
   "okvs"
  ],
  "short": true
 },
 {
  "id": "psi",
  "headword": "private set intersection",
  "abbr": "PSI",
  "pos": "n.",
  "cat": "functionality",
  "senses": [
   "A protocol by which two parties holding sets A and B learn A ∩ B and nothing more.",
   "<i>one-sided</i>: only the receiver learns the intersection; the sender learns only |A|."
  ],
  "func": "<div class=\"row\"><span class=\"k\">input</span><span><span class=\"a\">Alice: set A</span> · <span class=\"b\">Bob: set B</span></span></div> <div class=\"row\"><span class=\"k\">output</span><span>receiver Alice learns A ∩ B (and |B|); Bob learns only |A|</span></div>",
  "prose": "<div class=\"prose def\"><p>Pick a protocol and step through it. The ledger on the right records everything each party has learned so far. Notice how the naive one leaks, and how the modern ones replace public-key operations with OPRFs built from OT or VOLE.</p></div>",
  "demo": "w-psi",
  "uses": "",
  "library": "<a href=\"#lib-psi\">PSI library: families, protocol chooser, papers</a>",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"meadows86\">[Meadows86]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"hfh99\">[HFH99]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"fnp04\">[FNP04]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"kkrt16\">[KKRT16]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"rs21\">[RS21]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"rr22\">[RR22]</a>",
  "seeAlso": [
   "circuit-psi",
   "variants",
   "unbalanced",
   "oprf",
   "psu"
  ],
  "short": false
 },
 {
  "id": "psu",
  "headword": "private set union",
  "abbr": "PSU",
  "pos": "n.",
  "cat": "functionality",
  "senses": [
   "A protocol by which a receiver holding Y learns X ∪ Y from a sender holding X, and nothing more; in practice it transfers the set difference X ∖ Y without revealing which sender items were in the intersection.",
   "<i>one-sided</i>: only the receiver learns the union. <i>two-sided</i>: both parties do (e.g. IBLT-based and malicious shuffle-OPRF constructions).",
   "<i>enhanced</i> or <i>AON-compatible</i>: additionally leaks nothing output-dependent, such as |X ∩ Y|, if the execution stops before the union is delivered."
  ],
  "func": "<div class=\"row\"><span class=\"k\">input</span><span><span class=\"a\">Alice: set A</span> · <span class=\"b\">Bob: set B</span></span></div> <div class=\"row\"><span class=\"k\">output</span><span>receiver Alice learns A ∪ B; Bob learns nothing beyond |A|</span></div>",
  "prose": "<div class=\"prose def\"><p>Union sounds easier than intersection, but it is subtle. Alice must receive Bob's items that are <em>not</em> in A, while neither party learns which of Bob's items <em>were</em> in A. (Alice can of course work out A ∩ B = A ∖ (received items) from the output, so the intersection's contents follow from the union. What must stay hidden is how Bob's list lines up with that.) Bob must not even learn which of his items were sent.</p> <p>The common recipe: for each of Bob's items, a <b>reverse private membership test</b> gives Alice a bit eⱼ = [bⱼ ∈ A] without revealing bⱼ, then a 1-out-of-2 <b>OT</b> lets Alice receive bⱼ when eⱼ = 0 and ⊥ when eⱼ = 1. Shuffle-based PSU first permutes Bob's list obliviously so the positions of the ⊥'s carry no meaning.</p></div>",
  "demo": "w-psu",
  "uses": "",
  "library": "<a href=\"#lib-psu\">PSU library: families, framework explorer, AON, benchmarks, papers</a>",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"ks05\">[KS05]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"krtw19\">[KRTW19]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"jszdg22\">[JSZDG22]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"jszg24\">[JSZG24]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"pt26\">[PT26]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"pgt26\">[PGT26]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"sokpsu\">[SoK-PSU]</a>",
  "seeAlso": [
   "rpmt",
   "mcrg",
   "aon",
   "iblt",
   "shuffle",
   "psi"
  ],
  "short": false
 },
 {
  "id": "pcg",
  "headword": "pseudorandom correlation generator",
  "abbr": "PCG",
  "pos": "n.",
  "cat": "primitive",
  "senses": [
   "A pair of short correlated seeds that each party expands locally into a long correlation, such as random OTs or VOLE.",
   "Hence <i>silent</i> OT or VOLE: correlations produced this way, with communication sublinear in their length."
  ],
  "func": "<div class=\"row\"><span class=\"k\">setup</span><span>short correlated seeds (sublinear in m)</span></div> <div class=\"row\"><span class=\"k\">expand</span><span>each party locally stretches its seed into millions of OT or VOLE correlations</span></div>",
  "prose": "<div class=\"prose def\"><p>IKNP still sends κ bits per OT. Pseudorandom correlation generators (Boyle, Couteau, Gilboa, Ishai and others) go further: parties exchange a small seed, then expand it offline using the hardness of decoding random linear codes (LPN). Communication becomes almost independent of how many OTs you need, which is why they're called <em>silent</em>.</p></div>",
  "demo": "w-pcg",
  "uses": "",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"bcgi18\">[BCGI18]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"bcgiks19\">[BCGIKS19]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"crr21\">[Silver]</a>",
  "seeAlso": [
   "silent",
   "lpn",
   "vole",
   "otext"
  ],
  "short": false
 },
 {
  "id": "variants",
  "headword": "PSI variants",
  "abbr": "PSI-*",
  "pos": "n. pl.",
  "cat": "functionality",
  "senses": [
   "Set functionalities that reveal a function of the intersection rather than the intersection itself: its size (PSI-CA), a sum of associated values (PSI-Sum), per-item labels (labeled PSI), or the intersection only above a threshold."
  ],
  "func": "",
  "prose": "<div class=\"prose def\"><p>Many applications need less than the full intersection. Choose a functionality to see exactly what Alice receives for the playground sets. Bob's items carry an associated value (e.g. a spend amount).</p></div>",
  "demo": "w-var",
  "uses": "",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"gmrss21\">[GMRSS21]</a>",
  "seeAlso": [
   "psi",
   "circuit-psi",
   "psu"
  ],
  "short": false
 },
 {
  "id": "random-oracle",
  "headword": "random oracle model",
  "abbr": "ROM",
  "pos": "n.",
  "cat": "security notion",
  "definition": "The heuristic of analysing a hash function as though it were a truly random function available to all parties.",
  "origin": "",
  "seeAlso": [
   "commit",
   "otext"
  ],
  "short": true
 },
 {
  "id": "rpmt",
  "headword": "reverse private membership test",
  "abbr": "RPMT",
  "pos": "n.",
  "cat": "primitive",
  "definition": "A protocol in which the party holding a set learns whether the other party's item belongs to it, without seeing the item. The multi-query form (mq-RPMT) underlies linear-time PSU.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"zcl23\">[ZCLZL23]</a>",
  "seeAlso": [
   "psu"
  ],
  "short": true
 },
 {
  "id": "rsa",
  "headword": "RSA",
  "abbr": "RSA",
  "pos": "n.",
  "cat": "public-key scheme",
  "definition": "Encryption and signatures based on the difficulty of factoring n = p·q: c = mᵉ mod n, m = cᵈ mod n, with e·d ≡ 1 mod φ(n). <a href=\"#mo-rsa\">Generate a toy key →</a>",
  "origin": "R. Rivest, A. Shamir, L. Adleman, 1977.",
  "seeAlso": [
   "ecc",
   "dh",
   "sig"
  ],
  "short": true
 },
 {
  "id": "ss",
  "headword": "secret sharing",
  "abbr": "SS",
  "pos": "n.",
  "cat": "foundation",
  "senses": [
   "A method of splitting a secret into <i>shares</i> so that authorised subsets of parties can reconstruct it while any smaller subset learns nothing.",
   "<i>(t-out-of-n)</i> Shamir's threshold form: any t of the n shares suffice.",
   "<i>additive</i>: the case t = n, where shares are random numbers summing to the secret."
  ],
  "func": "<div class=\"row\"><span class=\"k\">dealer</span><span>secret s, threshold t, parties n</span></div> <div class=\"row\"><span class=\"k\">output</span><span>shares s₁…sₙ; any t reconstruct s, any t−1 reveal nothing</span></div>",
  "prose": "<div class=\"prose def\"><p>Shamir's scheme hides the secret as the constant term of a random polynomial f of degree t−1, and hands party i the point (i, f(i)). Any t points pin down the polynomial; fewer points are consistent with <em>every</em> possible secret. Additive sharing is the special case t = n: random numbers that sum to s.</p></div>",
  "demo": "w-ss",
  "uses": "<b>Used in</b> GMW-style MPC, circuit-PSI outputs, threshold signatures, secret-shared shuffles.",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"shamir79\">[Shamir79]</a>",
  "seeAlso": [
   "beaver",
   "gmw",
   "circuit-psi",
   "shuffle"
  ],
  "short": false
 },
 {
  "id": "semi-honest",
  "headword": "semi-honest adversary",
  "abbr": "",
  "pos": "n.",
  "cat": "security notion",
  "definition": "An adversary that follows the protocol but tries to learn more from what it sees. Contrast <i>malicious</i>: an adversary that may deviate arbitrarily.",
  "origin": "",
  "seeAlso": [
   "ideal"
  ],
  "short": true
 },
 {
  "id": "silent",
  "headword": "silent OT",
  "abbr": "",
  "pos": "n.",
  "cat": "primitive",
  "definition": "OT generated from a pseudorandom correlation generator, with communication almost independent of the number of OTs produced.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"bcgiks19\">[BCGIKS19]</a>",
  "seeAlso": [
   "pcg",
   "lpn"
  ],
  "short": true
 },
 {
  "id": "subfield",
  "headword": "subfield VOLE",
  "abbr": "",
  "pos": "n.",
  "cat": "correlation",
  "definition": "VOLE in which A lies in a small field (e.g. 𝔽₂) while Δ, B and C lie in an extension field; it cuts communication in RR22 PSI.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"rr22\">[RR22]</a>",
  "seeAlso": [
   "vole"
  ],
  "short": true
 },
 {
  "id": "unbalanced",
  "headword": "unbalanced PSI",
  "abbr": "",
  "pos": "n.",
  "cat": "functionality",
  "definition": "PSI in which one set is far larger than the other, such as a phone's contacts against a server database. Usually built from homomorphic encryption so the small side's cost stays low.",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"clr17\">[CLR17]</a>",
  "seeAlso": [
   "psi",
   "he"
  ],
  "short": true
 },
 {
  "id": "vole",
  "headword": "vector oblivious linear evaluation",
  "abbr": "VOLE",
  "pos": "n.",
  "cat": "correlation",
  "senses": [
   "A correlation in which one party holds a scalar Δ and vector B, the other vectors A and C, with B = C + A·Δ coordinate-wise.",
   "<i>OLE</i>: the single-coordinate case.",
   "<i>subfield VOLE</i>: A drawn from a small subfield of the field holding Δ."
  ],
  "func": "<div class=\"row\"><span class=\"k\">sender</span><span class=\"b\">Bob: scalar Δ, vector B</span></div> <div class=\"row\"><span class=\"k\">receiver</span><span class=\"a\">Alice: vectors A, C</span></div> <div class=\"row\"><span class=\"k\">relation</span><span>B = C + A·Δ coordinate-wise over 𝔽<sub>p</sub></span></div>",
  "prose": "<div class=\"prose def\"><p>Think of every coordinate as a point on a line with secret slope Δ. Alice knows the \"x\" (Aᵢ) and an offset Cᵢ; Bob knows the slope and Bᵢ. Neither alone knows the whole line. VOLE is the arithmetic cousin of correlated OT (bits: Bᵢ = Cᵢ ⊕ Aᵢ·Δ), and silent PCGs make millions of coordinates nearly free. VOLE-PSI, RR22 and VOLE-based ZK all start here.</p></div>",
  "demo": "w-vole",
  "uses": "",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"gilboa99\">[Gilboa99]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"bcgi18\">[BCGI18]</a>, <a class=\"cite\" href=\"#bib\" data-paper=\"rs21\">[RS21]</a>",
  "seeAlso": [
   "pcg",
   "subfield",
   "psi",
   "zk"
  ],
  "short": false
 },
 {
  "id": "vigenere",
  "headword": "Vigenère cipher",
  "abbr": "",
  "pos": "n.",
  "cat": "classical cipher",
  "definition": "A polyalphabetic cipher that applies a different Caesar shift to each letter, chosen by a repeating keyword. Broken by finding the key length (Kasiski, Friedman). <a href=\"#cl-vig\">Explore the tabula recta →</a>",
  "origin": "G. B. Bellaso, 1553.",
  "seeAlso": [
   "caesar",
   "freqan",
   "otp"
  ],
  "short": true
 },
 {
  "id": "zk",
  "headword": "zero-knowledge proof",
  "abbr": "ZK",
  "pos": "n.",
  "cat": "foundation",
  "senses": [
   "A proof that convinces a verifier a statement is true while revealing nothing beyond its truth."
  ],
  "func": "<div class=\"row\"><span class=\"k\">prover</span><span>knows a witness w for statement x</span></div> <div class=\"row\"><span class=\"k\">verifier</span><span>becomes convinced x is true, learns nothing about w</span></div>",
  "prose": "<div class=\"prose def\"><p>The classic cave: a ring-shaped tunnel with a locked door at the back. Peggy enters on a random side; Victor shouts which side to come out of. If Peggy knows the password she always succeeds. A cheater guesses right only half the time, so after k rounds she survives with probability 2<sup>−k</sup>. Modern VOLE-based ZK systems use the correlations from Chapter 2.</p></div>",
  "demo": "w-zk",
  "uses": "",
  "library": "",
  "origin": "<a class=\"cite\" href=\"#bib\" data-paper=\"gmr85\">[GMR85]</a>",
  "seeAlso": [
   "commit",
   "vole"
  ],
  "short": false
 }
];

export const ENTRY_BY_ID: Record<string, Entry> = Object.fromEntries(ENTRIES.map(e => [e.id, e]));
