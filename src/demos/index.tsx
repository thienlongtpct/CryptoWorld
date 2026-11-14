import type { ComponentType } from 'react';
import { Commitment, DiffieHellman, Paillier, SecretSharing, ZkCave } from './foundations';
import { Cuckoo, GarbledGate, Iknp, ObliviousTransfer, OkvsDemo, Opprf, Oprf, Pcg, Shuffle, Vole } from './oblivious';
import { Playground, PsiDemo, PsuDemo, Variants } from './sets';
import { CLASSICAL_TIMELINE, Caesar, Frequency, OneTimePad, RailFence, Timeline, Vigenere } from './classical';
import { Avalanche, EllipticCurve, HashAvalanche, MODERN_TIMELINE, Modes, Rsa } from './modern';
import { Aon, PsiChooser, PsiFamilies, PsiPapers, PsuBench, PsuChooser, PsuFamilies, PsuFramework, PsuOpenProblems, PsuPapers } from './libraries';

/** Demo shown under "Try it" on a dictionary entry, keyed by the entry's `demo` field. */
export const DEMOS: Record<string, ComponentType> = {
  'w-ss': SecretSharing, 'w-com': Commitment, 'w-dh': DiffieHellman, 'w-he': Paillier, 'w-zk': ZkCave,
  'w-ot': ObliviousTransfer, 'w-iknp': Iknp, 'w-pcg': Pcg, 'w-oprf': Oprf, 'w-okvs': OkvsDemo, 'w-vole': Vole,
  'w-opprf': Opprf, 'w-gc': GarbledGate, 'w-cuckoo': Cuckoo, 'w-shuf': Shuffle,
  'w-psi': PsiDemo,
  // PSU and the variants read the same playground sets, so each shows the editor too.
  'w-psu': () => <><Playground /><PsuDemo /></>,
  'w-var': () => <><Playground /><Variants /></>,
};

/** Interactive part of a section on the Classical, Modern and library pages, keyed by section id. */
export const WIDGETS: Record<string, ComponentType> = {
  'cl-time': () => <Timeline items={CLASSICAL_TIMELINE} />, 'cl-caesar': Caesar, 'cl-freq': Frequency, 'cl-vig': Vigenere, 'cl-rail': RailFence, 'cl-otp': OneTimePad,
  'mo-time': () => <Timeline items={MODERN_TIMELINE} />, 'mo-block': Avalanche, 'mo-modes': Modes, 'mo-hash': HashAvalanche, 'mo-rsa': Rsa, 'mo-ecc': EllipticCurve,
  'psu-fam': PsuFamilies, 'psu-fw': PsuFramework, 'psu-aon': Aon, 'psu-bench': PsuBench, 'psu-choose': PsuChooser, 'psu-papers': PsuPapers, 'psu-open': PsuOpenProblems,
  'psi-fam': PsiFamilies, 'psi-choose': PsiChooser, 'psi-papers': PsiPapers,
};
