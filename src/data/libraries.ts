// PSU library data follows the SoK "Private Set Union Under Incomplete Execution" (Tables 1 and 3).
// small: per n in {2^4, 2^6, 2^8, 2^10}: [LAN s, WAN1 s, WAN2 s, communication MB]. big: n = 2^20 on LAN: [s, MB].
export type Bench4 = [number, number, number, number];
export interface PsuVariant { name: string; small?: Bench4[]; big?: [number, number | string]; unbal?: boolean }
export interface PsuPaper {
  id: string; label: string; year: number; title: string; authors: string; venue: string;
  fam: 'rpmt' | 'mcrg' | 'poly' | 'other'; out: 'one' | 'two' | ''; sec: 'sh' | 'aon' | 'mal' | ''; set: 'bal' | 'unbal' | 'both';
  prim: string; cx?: string[]; sum: string; small?: Bench4[]; big?: [number, number | string]; variants?: PsuVariant[];
}
export interface PsiPaper { id: string; label: string; year: number; title: string; authors: string; venue: string; fam: string; tags: string[]; sum: string }
export type Family = [name: string, color: string, description: string];

export const PSU_PAPERS: PsuPaper[] = [
 {
  "id": "ks05",
  "label": "KS05",
  "year": 2005,
  "title": "Privacy-Preserving Set Operations",
  "authors": "L. Kissner, D. Song",
  "venue": "CRYPTO",
  "fam": "poly",
  "out": "one",
  "sec": "aon",
  "set": "bal",
  "prim": "Public-key",
  "cx": [
   "O(n²)",
   "–",
   "O(κ³n²)"
  ],
  "sum": "First PSU protocol: sets as polynomials whose roots are the elements, evaluated under additively homomorphic encryption. Quadratic cost."
 },
 {
  "id": "frikken07",
  "label": "Fri07",
  "year": 2007,
  "title": "Privacy-Preserving Set Union",
  "authors": "K. B. Frikken",
  "venue": "ACNS",
  "fam": "poly",
  "out": "one",
  "sec": "aon",
  "set": "bal",
  "prim": "Public-key",
  "cx": [
   "O(n log log n)",
   "–",
   "O(κn)"
  ],
  "sum": "Improves KS05's communication by avoiding explicit computation of the full product polynomial.",
  "small": [
   [
    2.602,
    2.809,
    2.807,
    0.038
   ],
   [
    12.062,
    12.267,
    12.267,
    0.149
   ],
   [
    77.213,
    79.784,
    80.577,
    0.594
   ],
   [
    844.123,
    806.279,
    840.848,
    2.373
   ]
  ]
 },
 {
  "id": "hn12",
  "label": "HN12",
  "year": 2012,
  "title": "Efficient Set Operations in the Presence of Malicious Adversaries",
  "authors": "C. Hazay, K. Nissim",
  "venue": "J. Cryptology",
  "fam": "poly",
  "out": "",
  "sec": "mal",
  "set": "bal",
  "prim": "Public-key",
  "cx": [
   "O((κ²+log log n)n)",
   "–",
   "O(κ²n)"
  ],
  "sum": "Strengthens the polynomial framework to malicious security.",
  "small": [
   [
    0.094,
    0.246,
    0.245,
    0.01
   ],
   [
    0.293,
    0.458,
    0.461,
    0.037
   ],
   [
    1.155,
    1.288,
    1.318,
    0.146
   ],
   [
    4.439,
    4.785,
    4.979,
    0.583
   ]
  ],
  "big": [
   4845.428,
   596.63
  ]
 },
 {
  "id": "ba12",
  "label": "BA12",
  "year": 2012,
  "title": "Private and Oblivious Set and Multiset Operations",
  "authors": "M. Blanton, E. Aguiar",
  "venue": "ASIACCS",
  "fam": "other",
  "out": "",
  "sec": "aon",
  "set": "bal",
  "prim": "Hybrid",
  "cx": [
   "O(κ)",
   "O(κ²n log n)",
   "O(κn log n)"
  ],
  "sum": "General construction from oblivious sorting and generic MPC.",
  "small": [
   [
    0.048,
    10.767,
    10.85,
    1.074
   ],
   [
    0.081,
    19.806,
    20.216,
    4.276
   ],
   [
    0.169,
    32.596,
    35.062,
    24.518
   ],
   [
    0.521,
    54.012,
    68.441,
    142.701
   ]
  ],
  "big": [
   3341.69,
   648338.99
  ]
 },
 {
  "id": "dc17",
  "label": "DC17",
  "year": 2017,
  "title": "An Efficient Toolkit for Computing Private Set Operations",
  "authors": "A. Davidson, C. Cid",
  "venue": "ACISP",
  "fam": "other",
  "out": "",
  "sec": "sh",
  "set": "bal",
  "prim": "Public-key",
  "cx": [
   "O(λn)",
   "–",
   "O(κλn)"
  ],
  "sum": "Encrypted Bloom filter lets the sender homomorphically test membership of its elements; avoids pairwise comparison but is costly for large sets.",
  "small": [
   [
    0.152,
    0.327,
    0.344,
    0.186
   ],
   [
    0.569,
    0.816,
    0.899,
    0.742
   ],
   [
    2.171,
    2.757,
    3.087,
    2.968
   ],
   [
    8.762,
    9.952,
    11.533,
    11.87
   ]
  ],
  "big": [
   9082.358,
   12154.995
  ]
 },
 {
  "id": "krtw19",
  "label": "KRTW19",
  "year": 2019,
  "title": "Scalable Private Set Union from Symmetric-Key Techniques",
  "authors": "V. Kolesnikov, M. Rosulek, N. Trieu, X. Wang",
  "venue": "ASIACRYPT",
  "fam": "rpmt",
  "out": "one",
  "sec": "sh",
  "set": "bal",
  "prim": "Symmetric-key",
  "cx": [
   "O(κ)",
   "O(n log n log log n)",
   "O(κn log n)"
  ],
  "sum": "Introduces the reverse private membership test (RPMT) framework: hashing, bucketing, OPRF/OPPRF and OT extension. Its hash-bin structure can leak about intersection elements.",
  "small": [
   [
    0.293,
    0.907,
    0.951,
    0.426
   ],
   [
    0.309,
    0.911,
    0.967,
    0.426
   ],
   [
    0.337,
    0.934,
    0.996,
    0.426
   ],
   [
    0.492,
    1.34,
    1.538,
    1.951
   ]
  ],
  "big": [
   328.67,
   2590.103
  ]
 },
 {
  "id": "gmrss21",
  "label": "GMR+21",
  "year": 2021,
  "title": "Private Set Operations from Oblivious Switching",
  "authors": "G. Garimella, P. Mohassel, M. Rosulek, S. Sadeghian, J. Singh",
  "venue": "PKC",
  "fam": "rpmt",
  "out": "one",
  "sec": "sh",
  "set": "bal",
  "prim": "Symmetric-key",
  "cx": [
   "O(κ)",
   "O(n log n)",
   "O(κn log n)"
  ],
  "sum": "Obliviously permutes sender elements with an OT-based switching network before OKVS membership testing.",
  "small": [
   [
    0.687,
    1.316,
    1.326,
    0.134
   ],
   [
    0.688,
    1.321,
    1.334,
    0.153
   ],
   [
    0.693,
    1.314,
    1.345,
    0.263
   ],
   [
    0.753,
    1.536,
    1.588,
    0.835
   ]
  ],
  "big": [
   48.868,
   1177.762
  ]
 },
 {
  "id": "jszdg22",
  "label": "JSZ+22",
  "year": 2022,
  "title": "Shuffle-based Private Set Union: Faster and More Secure",
  "authors": "Y. Jia, S.-F. Sun, H.-S. Zhou, J. Du, D. Gu",
  "venue": "USENIX Security",
  "fam": "rpmt",
  "out": "one",
  "sec": "sh",
  "set": "bal",
  "prim": "Symmetric-key",
  "cx": [
   "O(κ)",
   "O(n log n)",
   "O(κn log n)"
  ],
  "sum": "Uses Permute+Share to shuffle before the membership test, so membership bits are tied to random positions.",
  "small": [
   [
    0.126,
    0.771,
    0.782,
    0.089
   ],
   [
    0.125,
    0.772,
    0.782,
    0.104
   ],
   [
    0.13,
    0.781,
    0.81,
    0.231
   ],
   [
    0.15,
    0.976,
    1.057,
    0.855
   ]
  ],
  "big": [
   40.8,
   1403.825
  ]
 },
 {
  "id": "bpsy23",
  "label": "BPSY23",
  "year": 2023,
  "title": "Near-Optimal Oblivious Key-Value Stores for Efficient PSI, PSU and Volume-Hiding Multi-Maps",
  "authors": "A. Bienstock, S. Patel, J. Y. Seo, K. Yeo",
  "venue": "USENIX Security",
  "fam": "rpmt",
  "out": "one",
  "sec": "",
  "set": "bal",
  "prim": "Symmetric-key",
  "sum": "Near-optimal OKVS constructions that cut the cost of the membership tests inside RPMT-based PSU."
 },
 {
  "id": "tclz23",
  "label": "TCLZ23",
  "year": 2023,
  "title": "Fast Unbalanced Private Set Union from Fully Homomorphic Encryption",
  "authors": "B. Tu, Y. Chen, Q. Liu, C. Zhang",
  "venue": "ACM CCS",
  "fam": "rpmt",
  "out": "one",
  "sec": "sh",
  "set": "unbal",
  "prim": "Public-key",
  "cx": [
   "O(n_Y + n_X log n_Y)",
   "–",
   "O(κ n_X log n_Y)"
  ],
  "sum": "Unbalanced PSU. Permuted Matrix Private Equality Test combines FHE and polynomials so communication depends on the small set.",
  "big": [
   12.818,
   7.556
  ]
 },
 {
  "id": "zcl23",
  "label": "ZCL+23",
  "year": 2023,
  "title": "Linear Private Set Union from Multi-Query Reverse Private Membership Test",
  "authors": "C. Zhang, Y. Chen, W. Liu, M. Zhang, D. Lin",
  "venue": "USENIX Security",
  "fam": "rpmt",
  "out": "one",
  "sec": "sh",
  "set": "bal",
  "prim": "Symmetric-key (SKE) / public-key (PKE) variants",
  "cx": [
   "O(κ) / O(n)",
   "O(n log n) / –",
   "O((κ+log n)n) / O(κn)"
  ],
  "sum": "Multi-query RPMT via Vector Oblivious Decryption-then-Matching, with symmetric-key and public-key instantiations.",
  "variants": [
   {
    "name": "ZCL+23 (SKE)",
    "small": [
     [
      0.125,
      6.194,
      6.198,
      0.024
     ],
     [
      0.126,
      6.116,
      6.122,
      0.045
     ],
     [
      0.13,
      6.045,
      6.055,
      0.126
     ],
     [
      0.147,
      5.99,
      6.022,
      0.449
     ]
    ],
    "big": [
     25.254,
     435.322
    ]
   },
   {
    "name": "ZCL+23 (PKE)",
    "small": [
     [
      1.435,
      1.732,
      1.734,
      0.013
     ],
     [
      1.446,
      1.745,
      1.744,
      0.023
     ],
     [
      1.503,
      1.815,
      1.816,
      0.059
     ],
     [
      1.672,
      2.067,
      2.087,
      0.197
     ]
    ],
    "big": [
     244.804,
     187.538
    ]
   }
  ]
 },
 {
  "id": "czz24",
  "label": "CZZ+24",
  "year": 2024,
  "title": "Private Set Operations from Multi-Query Reverse Private Membership Test",
  "authors": "Y. Chen, M. Zhang, C. Zhang, M. Dong, W. Liu",
  "venue": "PKC",
  "fam": "rpmt",
  "out": "one",
  "sec": "sh",
  "set": "bal",
  "prim": "Public-key",
  "cx": [
   "O(κ+n)",
   "–",
   "O(κn)"
  ],
  "sum": "Realises both membership testing and shuffling with a Diffie–Hellman OPRF, avoiding separate OKVS and permutation components.",
  "small": [
   [
    0.023,
    0.265,
    0.268,
    0.024
   ],
   [
    0.026,
    0.268,
    0.27,
    0.029
   ],
   [
    0.037,
    0.28,
    0.284,
    0.047
   ],
   [
    0.082,
    0.327,
    0.339,
    0.127
   ]
  ],
  "big": [
   62.918,
   108.234
  ]
 },
 {
  "id": "jszg24",
  "label": "JSZG24",
  "year": 2024,
  "title": "Scalable Private Set Union, with Stronger Security",
  "authors": "Y. Jia, S.-F. Sun, H.-S. Zhou, D. Gu",
  "venue": "USENIX Security",
  "fam": "mcrg",
  "out": "one",
  "sec": "aon",
  "set": "bal",
  "prim": "Symmetric-key",
  "cx": [
   "O(κ)",
   "O(n log n)",
   "O(κn log n)"
  ],
  "sum": "Names during-execution leakage and replaces membership bits with equality-conditional randomness (ECRG); elements travel under one-time pads that only open for non-members.",
  "small": [
   [
    0.969,
    2.859,
    3.099,
    1.916
   ],
   [
    0.973,
    2.887,
    3.097,
    1.949
   ],
   [
    0.949,
    2.896,
    3.112,
    2.127
   ],
   [
    0.99,
    3.021,
    3.342,
    3.015
   ]
  ],
  "big": [
   38.478,
   2548.677
  ]
 },
 {
  "id": "tbz25",
  "label": "TBZ+25",
  "year": 2025,
  "title": "Fast Enhanced Private Set Union in the Balanced and Unbalanced Scenarios",
  "authors": "B. Tu, Y. Bai, C. Zhang, Y. Cao, Y. Chen",
  "venue": "USENIX Security",
  "fam": "mcrg",
  "out": "one",
  "sec": "aon",
  "set": "both",
  "prim": "Hybrid",
  "cx": [
   "O(n)",
   "O(n)",
   "O(κn)"
  ],
  "sum": "Permuted non-membership conditional randomness generation (pnMCRG) removes the O(n log n) Permute+Share cost; linear balanced protocol and an FHE-based unbalanced variant.",
  "variants": [
   {
    "name": "TBZ+25 (balanced)",
    "small": [
     [
      0.182,
      1.305,
      1.357,
      0.712
     ],
     [
      0.187,
      1.307,
      1.361,
      0.722
     ],
     [
      0.203,
      1.326,
      1.385,
      0.789
     ],
     [
      0.37,
      1.512,
      1.627,
      1.037
     ]
    ],
    "big": [
     99.267,
     275.755
    ]
   },
   {
    "name": "TBZ+25 (unbalanced)",
    "unbal": true,
    "big": [
     23.707,
     2.676
    ]
   }
  ]
 },
 {
  "id": "cssw25",
  "label": "CSSW25",
  "year": 2025,
  "title": "Concretely Efficient Private Set Union via Circuit-Based PSI",
  "authors": "G. R. Chandran, T. Schneider, M. Stillger, C. Weinert",
  "venue": "ASIACCS",
  "fam": "rpmt",
  "out": "one",
  "sec": "sh",
  "set": "bal",
  "prim": "Symmetric-key",
  "sum": "Realises the RPMT functionality with circuit-PSI.",
  "small": [
   [
    0.182,
    3.635,
    3.737,
    0.886
   ],
   [
    0.189,
    3.796,
    3.902,
    0.914
   ],
   [
    0.188,
    4.125,
    4.237,
    1.026
   ],
   [
    0.214,
    4.546,
    4.687,
    1.27
   ]
  ],
  "big": [
   41.307,
   263.971
  ]
 },
 {
  "id": "hwy26",
  "label": "HWY+26",
  "year": 2026,
  "title": "Enhanced Private Set Union from Secret-Shared Private Membership Test",
  "authors": "M. Hao, G. Wang, X. Yang, P. Xing, H. Chen, T. Zhang, H. Xue, G. Yang, H. Li, R. H. Deng",
  "venue": "USENIX Security",
  "fam": "mcrg",
  "out": "one",
  "sec": "aon",
  "set": "bal",
  "prim": "Symmetric-key",
  "cx": [
   "O(κ)",
   "O(n)",
   "O(κn)"
  ],
  "sum": "Secret-shares the membership-test result and derives membership-conditional randomness from the shares, so no cardinality leaks before completion.",
  "small": [
   [
    0.125,
    2.02,
    2.08,
    0.566
   ],
   [
    0.124,
    2.02,
    2.08,
    0.567
   ],
   [
    0.127,
    2.025,
    2.092,
    0.626
   ],
   [
    0.141,
    2.047,
    2.142,
    0.908
   ]
  ],
  "big": [
   17.054,
   397.99
  ]
 },
 {
  "id": "pt26",
  "label": "PT26",
  "year": 2026,
  "title": "Is PSI Really Faster than PSU? Achieving Efficient PSU with Invertible Bloom Filters",
  "authors": "L. Piske, N. Trieu",
  "venue": "EUROCRYPT",
  "fam": "other",
  "out": "two",
  "sec": "",
  "set": "bal",
  "prim": "Symmetric-key",
  "cx": [
   "O(κ)",
   "O(n log n)",
   "O(κn log n)"
  ],
  "sum": "Invertible Bloom lookup tables plus secure peeling recover the union directly, giving two-sided PSU in a few seconds at n = 2²⁰.",
  "big": [
   3.865,
   "545.424 / 428.866"
  ]
 },
 {
  "id": "pgt26",
  "label": "PGT26",
  "year": 2026,
  "title": "Malicious Private Set Union with Two-Sided Output",
  "authors": "S. Pu, J. Gao, N. Trieu",
  "venue": "EUROCRYPT",
  "fam": "other",
  "out": "two",
  "sec": "mal",
  "set": "bal",
  "prim": "Public-key",
  "cx": [
   "O(n)",
   "–",
   "O(κn)"
  ],
  "sum": "Practical maliciously secure two-sided PSU from shuffle-OPRF, consistency checks and specialised zero-knowledge arguments. Shows JSZG24's enhanced functionality equals standard PSU.",
  "small": [
   [
    0.007,
    0.328,
    0.328,
    0.008
   ],
   [
    0.018,
    0.339,
    0.342,
    0.026
   ],
   [
    0.059,
    0.383,
    0.393,
    0.102
   ],
   [
    0.216,
    0.552,
    0.596,
    0.403
   ]
  ],
  "big": [
   224.504,
   411.043
  ]
 },
 {
  "id": "sokpsu",
  "label": "SoK small-set",
  "year": 2026,
  "title": "SoK: Private Set Union Under Incomplete Execution: Security and Practical Performance",
  "authors": "Anonymous (under submission)",
  "venue": "PoPETs submission",
  "fam": "rpmt",
  "out": "one",
  "sec": "sh",
  "set": "bal",
  "prim": "Public-key",
  "cx": [
   "O(n)",
   "–",
   "O(κn)"
  ],
  "sum": "Defines AON output and a generic compiler; contributes libPSU and a lightweight shuffle-OPRF small-set protocol that avoids OT. The unpadded version leaks |X ∖ Y| to the sender; padding to n_X removes it.",
  "small": [
   [
    0.006,
    0.167,
    0.167,
    0.004
   ],
   [
    0.019,
    0.18,
    0.181,
    0.016
   ],
   [
    0.068,
    0.228,
    0.233,
    0.062
   ],
   [
    0.259,
    0.522,
    0.543,
    0.247
   ]
  ],
  "big": [
   280.231,
   253.231
  ]
 }
];

export const PSU_FAMILIES: Record<PsuPaper['fam'], Family> = {
 "rpmt": [
  "RPMT-based",
  "var(--c1)",
  "The receiver learns a membership bit bᵢ = [x<sub>π(i)</sub> ∈ Y] for each shuffled sender item, then one OT per position delivers x<sub>π(i)</sub> when bᵢ = 0 and ⊥ otherwise. Dominant family for efficient one-sided PSU; differs by how the membership test and shuffle are built (OPRF/OPPRF, oblivious switching, Permute+Share, OKVS, circuit-PSI, DH-OPRF, FHE)."
 ],
 "mcrg": [
  "MCRG-based",
  "var(--c4)",
  "Membership-conditional randomness generation: the sender gets rᵢ and the receiver rᵢ′ with rᵢ = rᵢ′ exactly when the item is in X ∖ Y. The sender encrypts each item under rᵢ; only non-members decrypt. No explicit membership vector ever exists, which removes during-execution leakage."
 ],
 "poly": [
  "Polynomial-based",
  "var(--c3)",
  "The receiver encodes Y as f<sub>Y</sub>(z) = ∏(z − y) under homomorphic encryption. The sender returns shuffled encryptions of (x·f<sub>Y</sub>(x), f<sub>Y</sub>(x)); members decrypt to (0, 0), non-members reveal x. The earliest family; clean but public-key heavy."
 ],
 "other": [
  "Bloom filters, IBLTs & others",
  "var(--c5)",
  "Encrypted Bloom filters (DC17), invertible Bloom lookup tables with secure peeling for two-sided output (PT26), generic MPC with oblivious sorting (BA12), and malicious two-sided shuffle-OPRF constructions (PGT26)."
 ]
};

export const PSI_PAPERS: PsiPaper[] = [
 {
  "id": "meadows86",
  "label": "Meadows86",
  "year": 1986,
  "title": "A More Efficient Cryptographic Matchmaking Protocol for Use in the Absence of a Continuously Available Third Party",
  "authors": "C. Meadows",
  "venue": "IEEE S&P",
  "fam": "dh",
  "tags": [
   "Semi-honest",
   "Balanced"
  ],
  "sum": "Commutative-exponentiation matching, the root of DH-based PSI."
 },
 {
  "id": "hfh99",
  "label": "HFH99",
  "year": 1999,
  "title": "Enhancing Privacy and Trust in Electronic Communities",
  "authors": "B. A. Huberman, M. Franklin, T. Hogg",
  "venue": "ACM EC",
  "fam": "dh",
  "tags": [
   "Semi-honest",
   "Balanced"
  ],
  "sum": "DH-based private matching in the form used today."
 },
 {
  "id": "rt21",
  "label": "RT21",
  "year": 2021,
  "title": "Compact and Malicious Private Set Intersection for Small Sets",
  "authors": "M. Rosulek, N. Trieu",
  "venue": "ACM CCS",
  "fam": "dh",
  "tags": [
   "Malicious",
   "Small sets"
  ],
  "sum": "Low-communication maliciously secure PSI aimed at small sets."
 },
 {
  "id": "fnp04",
  "label": "FNP04",
  "year": 2004,
  "title": "Efficient Private Matching and Set Intersection",
  "authors": "M. J. Freedman, K. Nissim, B. Pinkas",
  "venue": "EUROCRYPT",
  "fam": "he",
  "tags": [
   "Semi-honest",
   "Balanced"
  ],
  "sum": "PSI by oblivious polynomial evaluation under additively homomorphic encryption."
 },
 {
  "id": "clr17",
  "label": "CLR17",
  "year": 2017,
  "title": "Fast Private Set Intersection from Homomorphic Encryption",
  "authors": "H. Chen, K. Laine, P. Rindal",
  "venue": "ACM CCS",
  "fam": "he",
  "tags": [
   "Semi-honest",
   "Unbalanced"
  ],
  "sum": "FHE-based PSI whose communication grows with the small set only."
 },
 {
  "id": "chlr18",
  "label": "CHLR18",
  "year": 2018,
  "title": "Labeled PSI from Fully Homomorphic Encryption with Malicious Security",
  "authors": "H. Chen, Z. Huang, K. Laine, P. Rindal",
  "venue": "ACM CCS",
  "fam": "he",
  "tags": [
   "Malicious",
   "Unbalanced",
   "Labeled"
  ],
  "sum": "Labeled PSI: the client learns data attached to matching server items."
 },
 {
  "id": "dcw13",
  "label": "DCW13",
  "year": 2013,
  "title": "When Private Set Intersection Meets Big Data: An Efficient and Scalable Protocol",
  "authors": "C. Dong, L. Chen, Z. Wen",
  "venue": "ACM CCS",
  "fam": "ot",
  "tags": [
   "Semi-honest",
   "Balanced"
  ],
  "sum": "Garbled Bloom filters with OT; an early OKVS-style PSI."
 },
 {
  "id": "psz14",
  "label": "PSZ14",
  "year": 2014,
  "title": "Faster Private Set Intersection Based on OT Extension",
  "authors": "B. Pinkas, T. Schneider, M. Zohner",
  "venue": "USENIX Security",
  "fam": "ot",
  "tags": [
   "Semi-honest",
   "Balanced"
  ],
  "sum": "OT-extension PSI with cuckoo hashing; systematic comparison of PSI approaches."
 },
 {
  "id": "kkrt16",
  "label": "KKRT16",
  "year": 2016,
  "title": "Efficient Batched Oblivious PRF with Applications to Private Set Intersection",
  "authors": "V. Kolesnikov, R. Kumaresan, M. Rosulek, N. Trieu",
  "venue": "ACM CCS",
  "fam": "ot",
  "tags": [
   "Semi-honest",
   "Balanced"
  ],
  "sum": "Batched OPRF from 1-out-of-∞ OT extension."
 },
 {
  "id": "prty19",
  "label": "SpOT-Light",
  "year": 2019,
  "title": "SpOT-Light: Lightweight Private Set Intersection from Sparse OT Extension",
  "authors": "B. Pinkas, M. Rosulek, N. Trieu, A. Yanai",
  "venue": "CRYPTO",
  "fam": "ot",
  "tags": [
   "Semi-honest",
   "Balanced",
   "Low communication"
  ],
  "sum": "Low-communication PSI via polynomial encoding over sparse OT extension."
 },
 {
  "id": "krs19",
  "label": "KRS+19",
  "year": 2019,
  "title": "Mobile Private Contact Discovery at Scale",
  "authors": "D. Kales, C. Rechberger, T. Schneider, M. Senker, C. Weinert",
  "venue": "USENIX Security",
  "fam": "ot",
  "tags": [
   "Semi-honest",
   "Unbalanced"
  ],
  "sum": "Contact discovery between phones and a large server database."
 },
 {
  "id": "cm20",
  "label": "CM20",
  "year": 2020,
  "title": "Private Set Intersection in the Internet Setting from Lightweight Oblivious PRF",
  "authors": "M. Chase, P. Miao",
  "venue": "CRYPTO",
  "fam": "ot",
  "tags": [
   "Semi-honest",
   "Balanced",
   "Slow networks"
  ],
  "sum": "Lightweight OPRF that balances computation and communication for internet links."
 },
 {
  "id": "prty20",
  "label": "PaXoS",
  "year": 2020,
  "title": "PSI from PaXoS: Fast, Malicious Private Set Intersection",
  "authors": "B. Pinkas, M. Rosulek, N. Trieu, A. Yanai",
  "venue": "EUROCRYPT",
  "fam": "vole",
  "tags": [
   "Malicious",
   "Balanced"
  ],
  "sum": "Probe-and-XOR data structure gives fast malicious PSI."
 },
 {
  "id": "gprty21",
  "label": "GPRTY21",
  "year": 2021,
  "title": "Oblivious Key-Value Stores and Amplification for Private Set Intersection",
  "authors": "G. Garimella, B. Pinkas, M. Rosulek, N. Trieu, A. Yanai",
  "venue": "CRYPTO",
  "fam": "vole",
  "tags": [
   "Malicious",
   "Balanced"
  ],
  "sum": "Defines the OKVS abstraction and improves PaXoS-style PSI."
 },
 {
  "id": "rs21",
  "label": "RS21",
  "year": 2021,
  "title": "VOLE-PSI: Fast OPRF and Circuit-PSI from Vector-OLE",
  "authors": "P. Rindal, P. Schoppmann",
  "venue": "EUROCRYPT",
  "fam": "vole",
  "tags": [
   "Semi-honest & malicious",
   "Balanced",
   "Circuit-PSI"
  ],
  "sum": "OPRF and circuit-PSI from silent VOLE + OKVS."
 },
 {
  "id": "rr22",
  "label": "RR22",
  "year": 2022,
  "title": "Blazing Fast PSI from Improved OKVS and Subfield VOLE",
  "authors": "S. Raghuraman, P. Rindal",
  "venue": "ACM CCS",
  "fam": "vole",
  "tags": [
   "Semi-honest & malicious",
   "Balanced"
  ],
  "sum": "Random-band OKVS plus subfield VOLE."
 },
 {
  "id": "bpsy23",
  "label": "BPSY23",
  "year": 2023,
  "title": "Near-Optimal Oblivious Key-Value Stores for Efficient PSI, PSU and Volume-Hiding Multi-Maps",
  "authors": "A. Bienstock, S. Patel, J. Y. Seo, K. Yeo",
  "venue": "USENIX Security",
  "fam": "vole",
  "tags": [
   "Balanced"
  ],
  "sum": "Near-optimal OKVS constructions that speed up OKVS-based PSI and PSU."
 },
 {
  "id": "hek12",
  "label": "HEK12",
  "year": 2012,
  "title": "Private Set Intersection: Are Garbled Circuits Better than Custom Protocols?",
  "authors": "Y. Huang, D. Evans, J. Katz",
  "venue": "NDSS",
  "fam": "circuit",
  "tags": [
   "Semi-honest",
   "Circuit output"
  ],
  "sum": "Sort-compare-shuffle circuits for PSI."
 },
 {
  "id": "psty19",
  "label": "PSTY19",
  "year": 2019,
  "title": "Efficient Circuit-Based PSI with Linear Communication",
  "authors": "B. Pinkas, T. Schneider, O. Tkachenko, A. Yanai",
  "venue": "EUROCRYPT",
  "fam": "circuit",
  "tags": [
   "Semi-honest",
   "Circuit output"
  ],
  "sum": "Circuit-PSI from OPPRF and cuckoo hashing."
 },
 {
  "id": "ion20",
  "label": "IKN+20",
  "year": 2020,
  "title": "On Deploying Secure Computing: Private Intersection-Sum-with-Cardinality",
  "authors": "M. Ion, B. Kreuter, A. E. Nergiz, S. Patel, S. Saxena, K. Seth, M. Raykova, D. Shanahan, M. Yung",
  "venue": "IEEE EuroS&P",
  "fam": "circuit",
  "tags": [
   "Semi-honest",
   "PSI-Sum",
   "Deployed"
  ],
  "sum": "DH- and HE-based intersection-sum with cardinality, deployed for ad-conversion measurement."
 },
 {
  "id": "gmrss21",
  "label": "GMR+21",
  "year": 2021,
  "title": "Private Set Operations from Oblivious Switching",
  "authors": "G. Garimella, P. Mohassel, M. Rosulek, S. Sadeghian, J. Singh",
  "venue": "PKC",
  "fam": "circuit",
  "tags": [
   "Semi-honest",
   "Circuit output",
   "Reveals |A ∩ B|"
  ],
  "sum": "Secret shares of the intersection for further 2PC, cheaper than PSTY19 when the cardinality may be revealed."
 }
];

export const PSI_FAMILIES: Record<string, Family> = {
 "dh": [
  "Diffie–Hellman / public-key",
  "var(--c6)",
  "Commutative exponentiation H(x)<sup>αβ</sup>. Very little code and low round count; per-item public-key cost limits large sets but makes it attractive for small ones."
 ],
 "he": [
  "Homomorphic encryption",
  "var(--c3)",
  "Oblivious polynomial evaluation or FHE. Communication can scale with the small set only, which suits unbalanced PSI and labeled PSI."
 ],
 "ot": [
  "OT extension & OPRF",
  "var(--c1)",
  "Cuckoo hashing plus batched OPRFs built from OT extension. Moves almost all work to symmetric-key operations."
 ],
 "vole": [
  "OKVS & VOLE",
  "var(--c4)",
  "Encode a set into an OKVS and mask it with silent VOLE; the fastest current family for large balanced sets."
 ],
 "circuit": [
  "Circuit-PSI & functions of the intersection",
  "var(--c7)",
  "Keep the result secret-shared to compute cardinality, sums or joins without revealing the intersection itself."
 ]
};

export const SEC_LABEL = { sh: 'Semi-honest', aon: 'Semi-honest, AON-compatible', mal: 'Malicious', '': 'Not stated in the SoK text' } as const;
export const OUT_LABEL = { one: 'One-sided', two: 'Two-sided', '': 'Not stated' } as const;
export const SET_LABEL = { bal: 'Balanced', unbal: 'Unbalanced', both: 'Balanced & unbalanced' } as const;
