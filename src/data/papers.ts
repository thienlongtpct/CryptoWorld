// Bibliography: every paper cited anywhere on the site, with "builds on" links for the lineage view.
export type PaperCat = 'found' | 'ot' | 'corr' | 'oprf' | 'okvs' | 'psi' | 'cpsi' | 'psu';
export interface Paper { id: string; year: number; label: string; title: string; authors: string; venue: string; cat: PaperCat; buildsOn: string[]; note: string }

export const PAPER_CATS: Record<PaperCat, [label: string, color: string]> = {
 "found": [
  "Foundations",
  "var(--c8)"
 ],
 "ot": [
  "OT & extension",
  "var(--c1)"
 ],
 "corr": [
  "VOLE / PCG",
  "var(--c4)"
 ],
 "oprf": [
  "OPRF / OPPRF",
  "var(--c2)"
 ],
 "okvs": [
  "OKVS & hashing",
  "var(--c5)"
 ],
 "psi": [
  "PSI",
  "var(--c3)"
 ],
 "cpsi": [
  "Circuit-PSI",
  "var(--c7)"
 ],
 "psu": [
  "PSU",
  "var(--c6)"
 ]
};

export const PAPERS: Paper[] = [
 {
  "id": "shamir79",
  "year": 1979,
  "label": "Shamir79",
  "title": "How to Share a Secret",
  "authors": "A. Shamir",
  "venue": "CACM",
  "cat": "found",
  "buildsOn": [],
  "note": "Threshold secret sharing from polynomial interpolation."
 },
 {
  "id": "rabin81",
  "year": 1981,
  "label": "Rabin81",
  "title": "How to Exchange Secrets with Oblivious Transfer",
  "authors": "M. O. Rabin",
  "venue": "Harvard TR-81",
  "cat": "ot",
  "buildsOn": [],
  "note": "Introduces oblivious transfer."
 },
 {
  "id": "egl85",
  "year": 1985,
  "label": "EGL85",
  "title": "A Randomized Protocol for Signing Contracts",
  "authors": "S. Even, O. Goldreich, A. Lempel",
  "venue": "CACM",
  "cat": "ot",
  "buildsOn": [
   "rabin81"
  ],
  "note": "Defines 1-out-of-2 OT, the form used today."
 },
 {
  "id": "gmr85",
  "year": 1985,
  "label": "GMR85",
  "title": "The Knowledge Complexity of Interactive Proof-Systems",
  "authors": "S. Goldwasser, S. Micali, C. Rackoff",
  "venue": "STOC",
  "cat": "found",
  "buildsOn": [],
  "note": "Defines zero-knowledge proofs."
 },
 {
  "id": "yao86",
  "year": 1986,
  "label": "Yao86",
  "title": "How to Generate and Exchange Secrets",
  "authors": "A. C. Yao",
  "venue": "FOCS",
  "cat": "found",
  "buildsOn": [
   "egl85"
  ],
  "note": "Garbled circuits for two-party computation."
 },
 {
  "id": "meadows86",
  "year": 1986,
  "label": "Meadows86",
  "title": "A More Efficient Cryptographic Matchmaking Protocol for Use in the Absence of a Continuously Available Third Party",
  "authors": "C. Meadows",
  "venue": "IEEE S&P",
  "cat": "psi",
  "buildsOn": [],
  "note": "Commutative-exponentiation matching, the root of DH-PSI."
 },
 {
  "id": "gmw87",
  "year": 1987,
  "label": "GMW87",
  "title": "How to Play Any Mental Game",
  "authors": "O. Goldreich, S. Micali, A. Wigderson",
  "venue": "STOC",
  "cat": "found",
  "buildsOn": [
   "egl85",
   "shamir79"
  ],
  "note": "Secret-sharing based MPC for any function."
 },
 {
  "id": "beaver96",
  "year": 1996,
  "label": "Beaver96",
  "title": "Correlated Pseudorandomness and the Complexity of Private Computations",
  "authors": "D. Beaver",
  "venue": "STOC",
  "cat": "ot",
  "buildsOn": [
   "egl85"
  ],
  "note": "First OT extension idea: few OTs → many, using one-way functions."
 },
 {
  "id": "nr97",
  "year": 1997,
  "label": "NR97",
  "title": "Number-Theoretic Constructions of Efficient Pseudo-Random Functions",
  "authors": "M. Naor, O. Reingold",
  "venue": "FOCS",
  "cat": "oprf",
  "buildsOn": [],
  "note": "Naor–Reingold PRF, later evaluated obliviously."
 },
 {
  "id": "hfh99",
  "year": 1999,
  "label": "HFH99",
  "title": "Enhancing Privacy and Trust in Electronic Communities",
  "authors": "B. A. Huberman, M. Franklin, T. Hogg",
  "venue": "ACM EC",
  "cat": "psi",
  "buildsOn": [
   "meadows86"
  ],
  "note": "DH-based private matching."
 },
 {
  "id": "paillier99",
  "year": 1999,
  "label": "Paillier99",
  "title": "Public-Key Cryptosystems Based on Composite Degree Residuosity Classes",
  "authors": "P. Paillier",
  "venue": "EUROCRYPT",
  "cat": "found",
  "buildsOn": [],
  "note": "Additively homomorphic encryption."
 },
 {
  "id": "gilboa99",
  "year": 1999,
  "label": "Gilboa99",
  "title": "Two Party RSA Key Generation",
  "authors": "N. Gilboa",
  "venue": "CRYPTO",
  "cat": "corr",
  "buildsOn": [
   "egl85"
  ],
  "note": "Oblivious linear evaluation (multiplication) from OT."
 },
 {
  "id": "pagh01",
  "year": 2001,
  "label": "PR01",
  "title": "Cuckoo Hashing",
  "authors": "R. Pagh, F. F. Rodler",
  "venue": "ESA",
  "cat": "okvs",
  "buildsOn": [],
  "note": "Two-choice hashing with evictions."
 },
 {
  "id": "np01",
  "year": 2001,
  "label": "NP01",
  "title": "Efficient Oblivious Transfer Protocols",
  "authors": "M. Naor, B. Pinkas",
  "venue": "SODA",
  "cat": "ot",
  "buildsOn": [
   "egl85"
  ],
  "note": "Practical DH-based base OTs."
 },
 {
  "id": "iknp03",
  "year": 2003,
  "label": "IKNP03",
  "title": "Extending Oblivious Transfers Efficiently",
  "authors": "Y. Ishai, J. Kilian, K. Nissim, E. Petrank",
  "venue": "CRYPTO",
  "cat": "ot",
  "buildsOn": [
   "beaver96",
   "np01"
  ],
  "note": "Practical OT extension from a random oracle."
 },
 {
  "id": "fnp04",
  "year": 2004,
  "label": "FNP04",
  "title": "Efficient Private Matching and Set Intersection",
  "authors": "M. J. Freedman, K. Nissim, B. Pinkas",
  "venue": "EUROCRYPT",
  "cat": "psi",
  "buildsOn": [
   "paillier99"
  ],
  "note": "PSI by oblivious polynomial evaluation under HE."
 },
 {
  "id": "fipr05",
  "year": 2005,
  "label": "FIPR05",
  "title": "Keyword Search and Oblivious Pseudorandom Functions",
  "authors": "M. J. Freedman, Y. Ishai, B. Pinkas, O. Reingold",
  "venue": "TCC",
  "cat": "oprf",
  "buildsOn": [
   "nr97"
  ],
  "note": "Formalizes OPRFs and applies them to PSI."
 },
 {
  "id": "ks05",
  "year": 2005,
  "label": "KS05",
  "title": "Privacy-Preserving Set Operations",
  "authors": "L. Kissner, D. Song",
  "venue": "CRYPTO",
  "cat": "psu",
  "buildsOn": [
   "fnp04"
  ],
  "note": "Polynomial-based intersection, union and more, multi-party."
 },
 {
  "id": "frikken07",
  "year": 2007,
  "label": "Frikken07",
  "title": "Privacy-Preserving Set Union",
  "authors": "K. Frikken",
  "venue": "ACNS",
  "cat": "psu",
  "buildsOn": [
   "ks05"
  ],
  "note": "More efficient HE-based PSU."
 },
 {
  "id": "hek12",
  "year": 2012,
  "label": "HEK12",
  "title": "Private Set Intersection: Are Garbled Circuits Better than Custom Protocols?",
  "authors": "Y. Huang, D. Evans, J. Katz",
  "venue": "NDSS",
  "cat": "cpsi",
  "buildsOn": [
   "yao86"
  ],
  "note": "Sort-compare-shuffle circuits for PSI."
 },
 {
  "id": "alsz13",
  "year": 2013,
  "label": "ALSZ13",
  "title": "More Efficient Oblivious Transfer and Extensions for Faster Secure Computation",
  "authors": "G. Asharov, Y. Lindell, T. Schneider, M. Zohner",
  "venue": "CCS",
  "cat": "ot",
  "buildsOn": [
   "iknp03"
  ],
  "note": "Optimized OT extension variants (correlated, random OT)."
 },
 {
  "id": "psz14",
  "year": 2014,
  "label": "PSZ14",
  "title": "Faster Private Set Intersection Based on OT Extension",
  "authors": "B. Pinkas, T. Schneider, M. Zohner",
  "venue": "USENIX Security",
  "cat": "psi",
  "buildsOn": [
   "iknp03",
   "pagh01",
   "alsz13"
  ],
  "note": "OT-extension PSI with cuckoo hashing."
 },
 {
  "id": "kkrt16",
  "year": 2016,
  "label": "KKRT16",
  "title": "Efficient Batched Oblivious PRF with Applications to Private Set Intersection",
  "authors": "V. Kolesnikov, R. Kumaresan, M. Rosulek, N. Trieu",
  "venue": "CCS",
  "cat": "oprf",
  "buildsOn": [
   "iknp03",
   "psz14"
  ],
  "note": "Batched OPRF from 1-out-of-∞ OT extension."
 },
 {
  "id": "kmprt17",
  "year": 2017,
  "label": "KMPRT17",
  "title": "Practical Multi-party Private Set Intersection from Symmetric-Key Techniques",
  "authors": "V. Kolesnikov, N. Matania, B. Pinkas, M. Rosulek, N. Trieu",
  "venue": "CCS",
  "cat": "oprf",
  "buildsOn": [
   "kkrt16"
  ],
  "note": "Introduces the OPPRF."
 },
 {
  "id": "clr17",
  "year": 2017,
  "label": "CLR17",
  "title": "Fast Private Set Intersection from Homomorphic Encryption",
  "authors": "H. Chen, K. Laine, P. Rindal",
  "venue": "CCS",
  "cat": "psi",
  "buildsOn": [
   "fnp04"
  ],
  "note": "Unbalanced PSI with FHE."
 },
 {
  "id": "ekr18",
  "year": 2018,
  "label": "EKR18",
  "title": "A Pragmatic Introduction to Secure Multi-Party Computation",
  "authors": "D. Evans, V. Kolesnikov, M. Rosulek",
  "venue": "FnT Privacy & Security",
  "cat": "found",
  "buildsOn": [
   "yao86",
   "gmw87",
   "iknp03"
  ],
  "note": "Textbook survey of practical MPC."
 },
 {
  "id": "bcgi18",
  "year": 2018,
  "label": "BCGI18",
  "title": "Compressing Vector OLE",
  "authors": "E. Boyle, G. Couteau, N. Gilboa, Y. Ishai",
  "venue": "CCS",
  "cat": "corr",
  "buildsOn": [
   "gilboa99"
  ],
  "note": "First PCG for VOLE from LPN."
 },
 {
  "id": "bcgiks19",
  "year": 2019,
  "label": "BCGIKS19",
  "title": "Efficient Pseudorandom Correlation Generators: Silent OT Extension and More",
  "authors": "E. Boyle, G. Couteau, N. Gilboa, Y. Ishai, L. Kohl, P. Scholl",
  "venue": "CRYPTO",
  "cat": "corr",
  "buildsOn": [
   "bcgi18",
   "iknp03"
  ],
  "note": "Silent OT extension."
 },
 {
  "id": "prty19",
  "year": 2019,
  "label": "SpOT-Light",
  "title": "SpOT-Light: Lightweight Private Set Intersection from Sparse OT Extension",
  "authors": "B. Pinkas, M. Rosulek, N. Trieu, A. Yanai",
  "venue": "CRYPTO",
  "cat": "psi",
  "buildsOn": [
   "kkrt16"
  ],
  "note": "Low-communication PSI via polynomial encoding (an OKVS precursor)."
 },
 {
  "id": "psty19",
  "year": 2019,
  "label": "PSTY19",
  "title": "Efficient Circuit-Based PSI with Linear Communication",
  "authors": "B. Pinkas, T. Schneider, O. Tkachenko, A. Yanai",
  "venue": "EUROCRYPT",
  "cat": "cpsi",
  "buildsOn": [
   "kmprt17",
   "hek12",
   "pagh01"
  ],
  "note": "Circuit-PSI from OPPRF and cuckoo hashing."
 },
 {
  "id": "krtw19",
  "year": 2019,
  "label": "KRTW19",
  "title": "Scalable Private Set Union from Symmetric-Key Techniques",
  "authors": "V. Kolesnikov, M. Rosulek, N. Trieu, X. Wang",
  "venue": "ASIACRYPT",
  "cat": "psu",
  "buildsOn": [
   "kkrt16",
   "kmprt17",
   "frikken07"
  ],
  "note": "First fast PSU from OT and OPRF."
 },
 {
  "id": "cm20",
  "year": 2020,
  "label": "CM20",
  "title": "Private Set Intersection in the Internet Setting from Lightweight Oblivious PRF",
  "authors": "M. Chase, P. Miao",
  "venue": "CRYPTO",
  "cat": "oprf",
  "buildsOn": [
   "iknp03"
  ],
  "note": "Lightweight OPRF, good on slow networks."
 },
 {
  "id": "prty20",
  "year": 2020,
  "label": "PaXoS",
  "title": "PSI from PaXoS: Fast, Malicious Private Set Intersection",
  "authors": "B. Pinkas, M. Rosulek, N. Trieu, A. Yanai",
  "venue": "EUROCRYPT",
  "cat": "okvs",
  "buildsOn": [
   "prty19",
   "pagh01"
  ],
  "note": "Probe-and-XOR data structure, linear-time encoding."
 },
 {
  "id": "cgp20",
  "year": 2020,
  "label": "CGP20",
  "title": "Secret-Shared Shuffle",
  "authors": "M. Chase, E. Ghosh, O. Poburinnaya",
  "venue": "ASIACRYPT",
  "cat": "found",
  "buildsOn": [
   "iknp03"
  ],
  "note": "Efficient shuffling of secret-shared data."
 },
 {
  "id": "gprty21",
  "year": 2021,
  "label": "GPRTY21",
  "title": "Oblivious Key-Value Stores and Amplification for Private Set Intersection",
  "authors": "G. Garimella, B. Pinkas, M. Rosulek, N. Trieu, A. Yanai",
  "venue": "CRYPTO",
  "cat": "okvs",
  "buildsOn": [
   "prty20"
  ],
  "note": "Defines the OKVS abstraction; 3-hash garbled cuckoo table."
 },
 {
  "id": "rs21",
  "year": 2021,
  "label": "RS21",
  "title": "VOLE-PSI: Fast OPRF and Circuit-PSI from Vector-OLE",
  "authors": "P. Rindal, P. Schoppmann",
  "venue": "EUROCRYPT",
  "cat": "psi",
  "buildsOn": [
   "bcgiks19",
   "prty20",
   "psty19"
  ],
  "note": "OPRF and circuit-PSI from silent VOLE + OKVS."
 },
 {
  "id": "crr21",
  "year": 2021,
  "label": "Silver",
  "title": "Silver: Silent VOLE and Oblivious Transfer from Hardness of Decoding Structured LDPC Codes",
  "authors": "G. Couteau, P. Rindal, S. Raghuraman",
  "venue": "CRYPTO",
  "cat": "corr",
  "buildsOn": [
   "bcgiks19"
  ],
  "note": "Fast silent VOLE/OT via structured codes."
 },
 {
  "id": "gmrss21",
  "year": 2021,
  "label": "GMRSS21",
  "title": "Private Set Operations from Oblivious Switching",
  "authors": "G. Garimella, P. Mohassel, M. Rosulek, S. Sadeghian, J. Singh",
  "venue": "PKC",
  "cat": "psu",
  "buildsOn": [
   "krtw19",
   "psty19"
  ],
  "note": "Permute-and-share for circuit-PSI, PSU and Private-ID."
 },
 {
  "id": "rr22",
  "year": 2022,
  "label": "RR22",
  "title": "Blazing Fast PSI from Improved OKVS and Subfield VOLE",
  "authors": "S. Raghuraman, P. Rindal",
  "venue": "CCS",
  "cat": "psi",
  "buildsOn": [
   "rs21",
   "gprty21",
   "crr21"
  ],
  "note": "Random-band OKVS + subfield VOLE."
 },
 {
  "id": "jszdg22",
  "year": 2022,
  "label": "JSZDG22",
  "title": "Shuffle-based Private Set Union: Faster and More Secure",
  "authors": "Y. Jia, S.-F. Sun, H.-S. Zhou, J. Du, D. Gu",
  "venue": "USENIX Security",
  "cat": "psu",
  "buildsOn": [
   "gmrss21",
   "cgp20",
   "krtw19"
  ],
  "note": "Shuffle first so the receiver cannot locate duplicates."
 },
 {
  "id": "zcl23",
  "year": 2023,
  "label": "ZCLZL23",
  "title": "Linear Private Set Union from Multi-Query Reverse Private Membership Test",
  "authors": "C. Zhang, Y. Chen, W. Liu, M. Zhang, D. Lin",
  "venue": "USENIX Security",
  "cat": "psu",
  "buildsOn": [
   "krtw19",
   "jszdg22",
   "rr22"
  ],
  "note": "Linear-complexity PSU from mq-RPMT and OT."
 },
 {
  "id": "dcw13",
  "year": 2013,
  "label": "DCW13",
  "title": "When Private Set Intersection Meets Big Data: An Efficient and Scalable Protocol",
  "authors": "C. Dong, L. Chen, Z. Wen",
  "venue": "ACM CCS",
  "cat": "psi",
  "buildsOn": [
   "egl85"
  ],
  "note": "Garbled Bloom filters with OT."
 },
 {
  "id": "chlr18",
  "year": 2018,
  "label": "CHLR18",
  "title": "Labeled PSI from Fully Homomorphic Encryption with Malicious Security",
  "authors": "H. Chen, Z. Huang, K. Laine, P. Rindal",
  "venue": "ACM CCS",
  "cat": "psi",
  "buildsOn": [
   "clr17"
  ],
  "note": "Labeled, unbalanced PSI from FHE."
 },
 {
  "id": "krs19",
  "year": 2019,
  "label": "KRS+19",
  "title": "Mobile Private Contact Discovery at Scale",
  "authors": "D. Kales, C. Rechberger, T. Schneider, M. Senker, C. Weinert",
  "venue": "USENIX Security",
  "cat": "psi",
  "buildsOn": [
   "kkrt16"
  ],
  "note": "Contact discovery against large server databases."
 },
 {
  "id": "ion20",
  "year": 2020,
  "label": "IKN+20",
  "title": "On Deploying Secure Computing: Private Intersection-Sum-with-Cardinality",
  "authors": "M. Ion, B. Kreuter, A. E. Nergiz, S. Patel, S. Saxena, K. Seth, M. Raykova, D. Shanahan, M. Yung",
  "venue": "IEEE EuroS&P",
  "cat": "cpsi",
  "buildsOn": [
   "hfh99",
   "paillier99"
  ],
  "note": "Deployed intersection-sum with cardinality."
 },
 {
  "id": "rt21",
  "year": 2021,
  "label": "RT21",
  "title": "Compact and Malicious Private Set Intersection for Small Sets",
  "authors": "M. Rosulek, N. Trieu",
  "venue": "ACM CCS",
  "cat": "psi",
  "buildsOn": [
   "hfh99"
  ],
  "note": "Low-communication malicious PSI for small sets."
 },
 {
  "id": "hn12",
  "year": 2012,
  "label": "HN12",
  "title": "Efficient Set Operations in the Presence of Malicious Adversaries",
  "authors": "C. Hazay, K. Nissim",
  "venue": "J. Cryptology",
  "cat": "psu",
  "buildsOn": [
   "ks05"
  ],
  "note": "Malicious polynomial-based set operations."
 },
 {
  "id": "ba12",
  "year": 2012,
  "label": "BA12",
  "title": "Private and Oblivious Set and Multiset Operations",
  "authors": "M. Blanton, E. Aguiar",
  "venue": "ASIACCS",
  "cat": "psu",
  "buildsOn": [
   "gmw87"
  ],
  "note": "Set operations from oblivious sorting and MPC."
 },
 {
  "id": "dc17",
  "year": 2017,
  "label": "DC17",
  "title": "An Efficient Toolkit for Computing Private Set Operations",
  "authors": "A. Davidson, C. Cid",
  "venue": "ACISP",
  "cat": "psu",
  "buildsOn": [
   "ks05"
  ],
  "note": "Encrypted Bloom-filter PSU."
 },
 {
  "id": "bpsy23",
  "year": 2023,
  "label": "BPSY23",
  "title": "Near-Optimal Oblivious Key-Value Stores for Efficient PSI, PSU and Volume-Hiding Multi-Maps",
  "authors": "A. Bienstock, S. Patel, J. Y. Seo, K. Yeo",
  "venue": "USENIX Security",
  "cat": "okvs",
  "buildsOn": [
   "gprty21",
   "rr22"
  ],
  "note": "Near-optimal OKVS for PSI and PSU."
 },
 {
  "id": "tclz23",
  "year": 2023,
  "label": "TCLZ23",
  "title": "Fast Unbalanced Private Set Union from Fully Homomorphic Encryption",
  "authors": "B. Tu, Y. Chen, Q. Liu, C. Zhang",
  "venue": "ACM CCS",
  "cat": "psu",
  "buildsOn": [
   "krtw19",
   "clr17"
  ],
  "note": "Unbalanced PSU from FHE."
 },
 {
  "id": "czz24",
  "year": 2024,
  "label": "CZZ+24",
  "title": "Private Set Operations from Multi-Query Reverse Private Membership Test",
  "authors": "Y. Chen, M. Zhang, C. Zhang, M. Dong, W. Liu",
  "venue": "PKC",
  "cat": "psu",
  "buildsOn": [
   "zcl23"
  ],
  "note": "DH-OPRF realises both membership test and shuffle."
 },
 {
  "id": "jszg24",
  "year": 2024,
  "label": "JSZG24",
  "title": "Scalable Private Set Union, with Stronger Security",
  "authors": "Y. Jia, S.-F. Sun, H.-S. Zhou, D. Gu",
  "venue": "USENIX Security",
  "cat": "psu",
  "buildsOn": [
   "jszdg22"
  ],
  "note": "Enhanced PSU against during-execution leakage."
 },
 {
  "id": "tbz25",
  "year": 2025,
  "label": "TBZ+25",
  "title": "Fast Enhanced Private Set Union in the Balanced and Unbalanced Scenarios",
  "authors": "B. Tu, Y. Bai, C. Zhang, Y. Cao, Y. Chen",
  "venue": "USENIX Security",
  "cat": "psu",
  "buildsOn": [
   "jszg24",
   "tclz23"
  ],
  "note": "pnMCRG for linear enhanced PSU."
 },
 {
  "id": "cssw25",
  "year": 2025,
  "label": "CSSW25",
  "title": "Concretely Efficient Private Set Union via Circuit-Based PSI",
  "authors": "G. R. Chandran, T. Schneider, M. Stillger, C. Weinert",
  "venue": "ASIACCS",
  "cat": "psu",
  "buildsOn": [
   "krtw19",
   "psty19"
  ],
  "note": "RPMT from circuit-PSI."
 },
 {
  "id": "hwy26",
  "year": 2026,
  "label": "HWY+26",
  "title": "Enhanced Private Set Union from Secret-Shared Private Membership Test",
  "authors": "M. Hao, G. Wang, X. Yang, P. Xing, H. Chen, T. Zhang, H. Xue, G. Yang, H. Li, R. H. Deng",
  "venue": "USENIX Security",
  "cat": "psu",
  "buildsOn": [
   "jszg24"
  ],
  "note": "MCRG from a secret-shared membership test."
 },
 {
  "id": "pt26",
  "year": 2026,
  "label": "PT26",
  "title": "Is PSI Really Faster than PSU? Achieving Efficient PSU with Invertible Bloom Filters",
  "authors": "L. Piske, N. Trieu",
  "venue": "EUROCRYPT",
  "cat": "psu",
  "buildsOn": [
   "krtw19"
  ],
  "note": "Two-sided PSU via IBLT peeling."
 },
 {
  "id": "pgt26",
  "year": 2026,
  "label": "PGT26",
  "title": "Malicious Private Set Union with Two-Sided Output",
  "authors": "S. Pu, J. Gao, N. Trieu",
  "venue": "EUROCRYPT",
  "cat": "psu",
  "buildsOn": [
   "jszg24",
   "hn12"
  ],
  "note": "Malicious two-sided PSU from shuffle-OPRF."
 },
 {
  "id": "sokpsu",
  "year": 2026,
  "label": "SoK-PSU",
  "title": "SoK: Private Set Union Under Incomplete Execution: Security and Practical Performance",
  "authors": "Anonymous (under submission)",
  "venue": "PoPETs submission",
  "cat": "psu",
  "buildsOn": [
   "jszg24",
   "pgt26",
   "czz24"
  ],
  "note": "AON output, a generic compiler, libPSU benchmarks."
 }
];

export const PAPER_BY_ID: Record<string, Paper> = Object.fromEntries(PAPERS.map(p => [p.id, p]));
