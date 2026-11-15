// Static text of the Classical, Modern, PSI and PSU pages, split around their interactive widgets.
export interface PageSection { id: string; title: string; intro: string; outro: string; widget: string | null }
export interface PageContent { hero: string; sections: PageSection[] }

export const PAGES: Record<string, PageContent> = {
 "classical": {
  "hero": "<span class=\"eyebrow\">Section · before 1950</span> <h1>Classical cryptography</h1> <p class=\"prose\" style=\"font-size:1.1rem\">For two thousand years, encryption meant rearranging or replacing letters with pen and paper, and breaking it meant spotting the patterns of language that leaked through. Every cipher below fell to a statistical attack, and those failures shaped the rules modern cryptography follows.</p> <div class=\"lib-nav\"><a href=\"#cl-time\">Timeline</a><a href=\"#cl-caesar\">Caesar cipher</a><a href=\"#cl-freq\">Frequency analysis</a><a href=\"#cl-vig\">Vigenère cipher</a><a href=\"#cl-rail\">Rail fence</a><a href=\"#cl-otp\">One-time pad</a><a href=\"#cl-lessons\">Lessons</a></div>",
  "sections": [
   {
    "id": "cl-time",
    "title": "Timeline",
    "intro": "",
    "outro": "",
    "widget": "cl-time"
   },
   {
    "id": "cl-caesar",
    "title": "Caesar cipher",
    "intro": "<div class=\"prose\"><p>Shift every letter a fixed number of places: with shift 3, A→D, B→E, …, Z→C. The key space has only 25 useful keys, so an attacker simply tries them all and keeps the one that reads like a language.</p></div>",
    "outro": "",
    "widget": "cl-caesar"
   },
   {
    "id": "cl-freq",
    "title": "Frequency analysis",
    "intro": "<div class=\"prose\"><p>A substitution cipher replaces each letter with another according to a secret alphabet, giving 26! ≈ 4 × 10²⁶ keys. Brute force is hopeless, but the cipher keeps letter frequencies intact: the most common ciphertext letter is probably E, the next T or A. Al-Kindi described this attack in the 9th century. Fill in the mapping below to break the message.</p></div>",
    "outro": "",
    "widget": "cl-freq"
   },
   {
    "id": "cl-vig",
    "title": "Vigenère cipher",
    "intro": "<div class=\"prose\"><p>Use a keyword to pick a different Caesar shift for each position. Repeating letters of the plaintext no longer map to repeating ciphertext letters, which flattens the frequency profile; for three centuries it was called <i>le chiffre indéchiffrable</i>. Kasiski (1863) broke it by finding the key length from repeated fragments, after which each column is just a Caesar cipher.</p></div>",
    "outro": "",
    "widget": "cl-vig"
   },
   {
    "id": "cl-rail",
    "title": "Rail fence (transposition)",
    "intro": "<div class=\"prose\"><p>Transposition ciphers keep every letter but scramble the order. Write the message in a zigzag across several rails, then read each rail left to right. Letter frequencies are unchanged, which tells an analyst immediately that letters were moved rather than replaced.</p></div>",
    "outro": "",
    "widget": "cl-rail"
   },
   {
    "id": "cl-otp",
    "title": "One-time pad",
    "intro": "<div class=\"prose\"><p>XOR the message with a truly random key as long as the message, used once. Shannon proved in 1949 that this is <b>perfectly secret</b>: the ciphertext is equally consistent with every message of that length. The catch is the key: it must be as long as all the traffic and never reused.</p></div>",
    "outro": "",
    "widget": "cl-otp"
   },
   {
    "id": "cl-lessons",
    "title": "Lessons carried into modern cryptography",
    "intro": "<div class=\"dims\"> <div><b>Kerckhoffs's principle</b><span>A cipher must stay secure even if everything about it except the key is public (1883).</span></div> <div><b>Key space is not enough</b><span>Substitution has 26! keys yet falls to counting letters. Security must hold against every efficient attack, not only brute force.</span></div> <div><b>Hide the statistics</b><span>Shannon's <i>confusion</i> and <i>diffusion</i>: each ciphertext bit should depend on the key in complex ways and on many plaintext bits.</span></div> <div><b>Never reuse a pad</b><span>c₁ ⊕ c₂ = m₁ ⊕ m₂: a reused one-time pad leaks the XOR of two messages, as the Venona project showed.</span></div> </div> <p class=\"xref\"><span><b>Next</b><a href=\"#modern\">Modern cryptography →</a></span></p>",
    "outro": "",
    "widget": null
   }
  ]
 },
 "modern": {
  "hero": "<span class=\"eyebrow\">Section · 1949 onwards</span> <h1>Modern cryptography</h1> <p class=\"prose\" style=\"font-size:1.1rem\">Modern cryptography replaces clever tricks with definitions and proofs. A scheme is secure if no efficient adversary can win a precisely stated game better than by guessing, assuming some mathematical problem is hard. On top of that sit two families of tools: symmetric primitives that share one secret key, and public-key primitives that let strangers communicate.</p> <div class=\"lib-nav\"><a href=\"#mo-time\">Timeline</a><a href=\"#mo-compare\">Symmetric vs public-key</a><a href=\"#mo-block\">Block ciphers</a><a href=\"#mo-modes\">Modes of operation</a><a href=\"#mo-hash\">Hash functions</a><a href=\"#mo-rsa\">RSA</a><a href=\"#mo-ecc\">Elliptic curves</a><a href=\"#mo-next\">Beyond</a></div>",
  "sections": [
   {
    "id": "mo-time",
    "title": "Timeline",
    "intro": "",
    "outro": "",
    "widget": "mo-time"
   },
   {
    "id": "mo-compare",
    "title": "Symmetric vs public-key",
    "intro": "<div class=\"scroll-x\"><table class=\"tbl\"> <tr><th></th><th>Symmetric-key</th><th>Public-key</th></tr> <tr><td><b>Keys</b></td><td>One shared secret key</td><td>A public key anyone may use, a private key only its owner holds</td></tr> <tr><td><b>Primitives</b></td><td>Block ciphers (AES), stream ciphers, MACs, hash functions</td><td>Key exchange (DH), encryption (RSA, ElGamal, ML-KEM), signatures (RSA, ECDSA, Ed25519)</td></tr> <tr><td><b>Hardness from</b></td><td>Careful design and cryptanalysis</td><td>Number theory and lattices: factoring, discrete logarithms, LWE</td></tr> <tr><td><b>Speed</b></td><td>Very fast; gigabytes per second with hardware AES</td><td>Thousands of times slower; used to agree on or sign a short key or hash</td></tr> <tr><td><b>Typical use</b></td><td>Encrypting the bulk of the data</td><td>Establishing keys and proving identity (e.g. the TLS handshake)</td></tr> </table></div>",
    "outro": "",
    "widget": null
   },
   {
    "id": "mo-block",
    "title": "Block ciphers and the avalanche effect",
    "intro": "<div class=\"prose\"><p>A block cipher is a keyed permutation on fixed-size blocks. AES alternates substitution (S-boxes for <i>confusion</i>) and permutation (bit mixing for <i>diffusion</i>) for 10–14 rounds. Below is a toy 16-bit substitution–permutation network with 4 rounds, using the PRESENT S-box. Flip one plaintext bit and watch the difference spread round by round until about half of the output bits change.</p></div>",
    "outro": "",
    "widget": "mo-block"
   },
   {
    "id": "mo-modes",
    "title": "Modes of operation",
    "intro": "<div class=\"prose\"><p>A block cipher only encrypts one block. A <i>mode</i> says how to encrypt a long message. <b>ECB</b> encrypts each block independently, so equal plaintext blocks give equal ciphertext blocks and the picture's outline survives. <b>CBC</b> XORs each block with the previous ciphertext, and <b>CTR</b> encrypts a counter to make a keystream. Both hide the patterns. Each pair of pixels below is one 16-bit block of the toy cipher above.</p></div>",
    "outro": "",
    "widget": "mo-modes"
   },
   {
    "id": "mo-hash",
    "title": "Hash functions",
    "intro": "<div class=\"prose\"><p>A cryptographic hash maps any input to a short fixed-length digest. It should be <b>one-way</b> (preimage resistant) and <b>collision resistant</b>, and in practice behave like a random function: change one character, or exactly one bit of the UTF-8 input, and about half of the 256 output bits flip. This demo uses your browser's real SHA-256.</p></div>",
    "outro": "",
    "widget": "mo-hash"
   },
   {
    "id": "mo-rsa",
    "title": "RSA: encryption and signatures",
    "intro": "<div class=\"prose\"><p>Pick two primes p, q and publish n = p·q with an exponent e. The private exponent d satisfies e·d ≡ 1 (mod φ(n)), which is easy to compute from p and q and believed hard from n alone. Encrypt with c = mᵉ mod n; decrypt with m = cᵈ mod n. Signing runs the same maths the other way: s = mᵈ, verified by checking sᵉ = m.</p></div>",
    "outro": "",
    "widget": "mo-rsa"
   },
   {
    "id": "mo-ecc",
    "title": "Elliptic curves",
    "intro": "<div class=\"prose\"><p>The points on y² = x³ + ax + b over a prime field form a group: a line through two points P and Q meets the curve in a third, and reflecting it gives P + Q. Repeated addition kP looks like a random walk over the points, and recovering k from kP (the elliptic-curve discrete log) is believed hard. A 256-bit curve gives about the security of 3072-bit RSA.</p></div>",
    "outro": "",
    "widget": "mo-ecc"
   },
   {
    "id": "mo-next",
    "title": "Beyond encryption",
    "intro": "<div class=\"fams\"> <div class=\"fam\" style=\"--fc:var(--c1)\"><h3>Key exchange</h3><p>Diffie–Hellman lets two strangers agree on a secret over a public channel; it opened the public-key era in 1976.</p><div class=\"legend\"><a class=\"chip\" href=\"#dh\">Diffie–Hellman demo</a></div></div> <div class=\"fam\" style=\"--fc:var(--c4)\"><h3>Zero-knowledge &amp; MPC</h3><p>Prove statements or compute on private data without revealing it. This is the focus of the rest of this dictionary.</p><div class=\"legend\"><a class=\"chip\" href=\"#zk\">Zero-knowledge</a><a class=\"chip\" href=\"#ot\">Oblivious transfer</a><a class=\"chip\" href=\"#lib-psi\">PSI library</a></div></div> <div class=\"fam\" style=\"--fc:var(--c3)\"><h3>Homomorphic encryption</h3><p>Compute on ciphertexts; Gentry's 2009 construction made fully homomorphic encryption possible.</p><div class=\"legend\"><a class=\"chip\" href=\"#he\">Paillier demo</a></div></div> <div class=\"fam\" style=\"--fc:var(--c6)\"><h3>Post-quantum cryptography</h3><p>Shor's algorithm would break RSA and elliptic curves on a large quantum computer. NIST standardised lattice-based ML-KEM and ML-DSA in 2024 as replacements.</p></div> </div>",
    "outro": "",
    "widget": null
   }
  ]
 },
 "lib-psu": {
  "hero": "<span class=\"eyebrow\">Sub-library · two-party PSU</span> <h1>Private Set Union library</h1> <p class=\"prose\" style=\"font-size:1.1rem\">Sender <span class=\"who-b\">P<sub>S</sub></span> holds X, receiver <span class=\"who-a\">P<sub>R</sub></span> holds Y, and the receiver learns X ∪ Y and nothing more. Every PSU protocol rests on the identity <b>X ∪ Y = Y ∪ (X ∖ Y)</b>: the hard part is moving the sender's set difference to the receiver without exposing which sender items were in the intersection.</p> <p class=\"note\">Organisation, benchmark figures and the all-or-nothing framework on this page follow <i>SoK: Private Set Union Under Incomplete Execution: Security and Practical Performance</i> (anonymous submission to PoPETs). Runtimes are seconds, communication is MB, measured with the authors' libPSU framework.</p> <div class=\"lib-nav\" id=\"psu-toc\"><a href=\"#psu-dims\">Dimensions</a><a href=\"#psu-fam\">Protocol families</a><a href=\"#psu-fw\">Framework explorer</a><a href=\"#psu-aon\">All-or-nothing output</a><a href=\"#psu-bench\">Benchmarks</a><a href=\"#psu-choose\">Which protocol?</a><a href=\"#psu-papers\">Papers</a><a href=\"#psu-open\">Open problems</a></div>",
  "sections": [
   {
    "id": "psu-dims",
    "title": "Four ways PSU protocols differ",
    "intro": "<div class=\"dims\"> <div><b>Output</b><span><i>One-sided</i>: only the receiver learns the union. <i>Two-sided</i>: both parties do.</span></div> <div><b>Security</b><span><i>Semi-honest</i>, <i>semi-honest and AON-compatible</i> (no output-dependent leakage if the run stops early), or <i>malicious</i>.</span></div> <div><b>Set sizes</b><span><i>Balanced</i>: |X| ≈ |Y|. <i>Unbalanced</i>: |X| ≪ |Y|, where communication should scale with the small set only.</span></div> <div><b>Dominant cost</b><span><i>Symmetric-key</i> (OT, OKVS, hashing), <i>public-key</i> (DH, HE) or a <i>hybrid</i>. Fixed OT setup dominates for small sets.</span></div> </div>",
    "outro": "",
    "widget": null
   },
   {
    "id": "psu-fam",
    "title": "Protocol families",
    "intro": "",
    "outro": "",
    "widget": "psu-fam"
   },
   {
    "id": "psu-fw",
    "title": "Framework explorer",
    "intro": "<p class=\"prose\">Run each family's generic framework on two small sets, then cut the connection after any step. The ledger shows what the receiver already knows when the run stops. That is the <i>during-execution leakage</i> the SoK formalises.</p>",
    "outro": "",
    "widget": "psu-fw"
   },
   {
    "id": "psu-aon",
    "title": "All-or-nothing (AON) output",
    "intro": "<div class=\"prose\"> <p>Standard PSU security only describes what a party learns from a <em>completed</em> run. In RPMT-based protocols the receiver sees the membership vector b, and so the intersection cardinality, before the union arrives. If runs stop early, whether by network failure or by a receiver that restarts with slightly changed inputs, those cardinalities become a membership oracle: one baseline run plus k extra runs reveal k chosen membership bits, while no union is ever delivered.</p> <p><b>AON output</b> requires the receiver to obtain either the complete output or nothing beyond public parameters. The SoK models this with an <b>atomic secure channel</b>: a router may drop indivisible σ-bit atoms but cannot read, change, inject or reorder them.</p> <p><b>Generic compiler.</b> If a one-sided protocol is <i>pre-final simulatable</i> (everything before the last sender message can be simulated without the output), replace that last message m = (m₁…m<sub>ℓ</sub>) with c<sub>i</sub> = m<sub>i</sub> ⊕ H(0‖r‖i) and an unlocking atom d = r ⊕ H(1‖ℓ‖c₁‖…‖c<sub>ℓ</sub>). Any missing atom leaves m hidden.</p> </div>",
    "outro": "",
    "widget": "psu-aon"
   },
   {
    "id": "psu-bench",
    "title": "Benchmarks",
    "intro": "<p class=\"prose\">Small-set results (Table 3 of the SoK). Fixed setup costs dominate here, so public-key protocols often win. Pick a set size and a network.</p>",
    "outro": "",
    "widget": "psu-bench"
   },
   {
    "id": "psu-choose",
    "title": "Which protocol?",
    "intro": "<p class=\"prose\">Answer a few questions; candidates are filtered by the SoK's classification and ranked by its measured runtime.</p>",
    "outro": "",
    "widget": "psu-choose"
   },
   {
    "id": "psu-papers",
    "title": "Papers",
    "intro": "",
    "outro": "",
    "widget": "psu-papers"
   },
   {
    "id": "psu-open",
    "title": "Open problems",
    "intro": "",
    "outro": "",
    "widget": "psu-open"
   }
  ]
 },
 "lib-psi": {
  "hero": "<span class=\"eyebrow\">Sub-library · two-party PSI</span> <h1>Private Set Intersection library</h1> <p class=\"prose\" style=\"font-size:1.1rem\">Alice and Bob learn A ∩ B and nothing else. PSI is the most mature private set operation: modern protocols intersect millions of items in seconds. This page groups the main construction families, helps pick one, and lists the papers behind them.</p> <div class=\"lib-nav\"><a href=\"#psi-fam\">Protocol families</a><a href=\"#psi-choose\">Which protocol?</a><a href=\"#psi-papers\">Papers</a><a href=\"#psi\">Interactive PSI demos</a></div>",
  "sections": [
   {
    "id": "psi-fam",
    "title": "Protocol families",
    "intro": "",
    "outro": "",
    "widget": "psi-fam"
   },
   {
    "id": "psi-choose",
    "title": "Which protocol?",
    "intro": "<p class=\"prose\">A rule-of-thumb guide based on what each family is designed for. Check the papers for measured numbers.</p>",
    "outro": "",
    "widget": "psi-choose"
   },
   {
    "id": "psi-papers",
    "title": "Papers",
    "intro": "",
    "outro": "",
    "widget": "psi-papers"
   }
  ]
 }
};
