import type { ComponentType } from 'react';
import { CommitmentVis, DiffieHellmanVis, PaillierVis, SecretSharingVis, ZkVis } from './topics/foundations';
import { IknpVis, OkvsVis, OpprfVis, OprfVis, OtVis, PcgVis, VoleVis } from './topics/oblivious';
import { CuckooVis, GcVis, ShuffleVis } from './topics/mpc';
import { AonVis, PsiVis, PsuFwVis, PsuVis, VariantsVis } from './topics/sets';
import { CaesarVis, FreqVis, OtpVis, RailFenceVis, VigenereVis } from './topics/classical';
import { BlockVis, EccVis, HashVis, ModesVis, RsaVis } from './topics/modern';

/** Visualization page for each topic id in vis/registry.ts. */
export const TOPIC_PAGES: Record<string, ComponentType> = {
  ss: SecretSharingVis, commit: CommitmentVis, dh: DiffieHellmanVis, he: PaillierVis, zk: ZkVis,
  ot: OtVis, otext: IknpVis, pcg: PcgVis, oprf: OprfVis, opprf: OpprfVis, okvs: OkvsVis, vole: VoleVis,
  gc: GcVis, cuckoo: CuckooVis, shuffle: ShuffleVis,
  psi: PsiVis, psu: PsuVis, psufw: PsuFwVis, aon: AonVis, variants: VariantsVis,
  caesar: CaesarVis, freqan: FreqVis, vigenere: VigenereVis, railfence: RailFenceVis, otp: OtpVis,
  blockcipher: BlockVis, modes: ModesVis, hash: HashVis, rsa: RsaVis, ecc: EccVis,
};
