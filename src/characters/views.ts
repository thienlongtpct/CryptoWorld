import { BRIDGE_DH, CHALLENGE_BY_ID } from '../dungeon/challenges.ts';
import { G, P, mpow } from '../lib/crypto.ts';
import {
  APPEARANCES,
  BRIDGE_ATTACK,
  CHARACTER_BY_ID,
  REGION_BY_ID,
  type AskMode,
  type Scenario,
} from './cast.ts';

export const HASH_INPUT = 'grove-leaf';
export const HASH_DIGEST = 'd505d129a279ad5a19f6ee0fad5f1b0c223ed06b31980c17392048c3fdd654c6';

const ALICE_SET = ['ana', 'ben', 'cho', 'dev', 'eli', 'fay'];
const BOB_SET = ['cho', 'eli', 'gus', 'hal', 'ben'];
const INTERSECTION = ALICE_SET.filter(item => BOB_SET.includes(item));

const DH = { a: BRIDGE_DH.a, b: BRIDGE_DH.b, m: 77 };

export interface NpcView {
  characterId: string;
  regionId: string;
  mode: AskMode;
  scenario: Scenario;
  context: string;
  overview: string | null;
  public: Record<string, string | number | string[]>;
  own: Record<string, string | number | string[]> | null;
  publicMessages: string[];
}

export interface PreparedNpc {
  ok: true;
  view: NpcView;
  system: string;
}

export interface RejectedNpc {
  ok: false;
  status: number;
  error: string;
}

function fail(status: number, error: string): RejectedNpc {
  return { ok: false, status, error };
}

function dhNumbers() {
  const A = mpow(G, DH.a, P);
  const B = mpow(G, DH.b, P);
  const published = mpow(G, DH.m, P);
  return {
    A,
    B,
    published,
    shared: mpow(B, DH.a, P),
    aliceActive: mpow(published, DH.a, P),
    bobActive: mpow(published, DH.b, P),
  };
}

function bridgeView(characterId: string, mode: AskMode, scenario: Scenario, context: string): NpcView {
  const numbers = dhNumbers();
  const base = {
    characterId,
    regionId: 'bridge',
    mode,
    scenario,
    context,
    overview: null as string | null,
    public: { p: P, g: G } as NpcView['public'],
    own: null as NpcView['own'],
    publicMessages: [] as string[],
  };
  if (mode === 'explain') {
    return {
      ...base,
      overview: scenario === 'active'
        ? `This is the selected attack, not Eve’s passive exchange. Mallory substitutes a public value, so Alice and Bob do not arrive at the same key. ${BRIDGE_ATTACK}`
        : 'Alice and Bob each keep a private exponent and send a public value in the educational group. Eve sees those public values and does not change them. Mallory is not in this passive exchange. Authenticating the public values stops a later substitution. A trusted third party is one way to do that, and it is not required for every protocol.',
      publicMessages: scenario === 'active'
        ? ['A public value was substituted.', 'Eve did not substitute it.']
        : ['Alice sends a public value.', 'Bob sends a public value.'],
    };
  }
  if (scenario === 'passive' && characterId === 'alice') {
    return {
      ...base,
      own: { exponent: DH.a, sent: numbers.A, received: numbers.B, key: numbers.shared },
      publicMessages: [`You sent ${numbers.A}.`, `Bob’s public value arrived as ${numbers.B}.`],
    };
  }
  if (scenario === 'passive' && characterId === 'bob') {
    return {
      ...base,
      own: { exponent: DH.b, sent: numbers.B, received: numbers.A, key: numbers.shared },
      publicMessages: [`You sent ${numbers.B}.`, `Alice’s public value arrived as ${numbers.A}.`],
    };
  }
  if (scenario === 'passive' && characterId === 'eve') {
    return {
      ...base,
      public: { p: P, g: G, fromAlice: numbers.A, fromBob: numbers.B },
      publicMessages: [`Alice sent ${numbers.A}.`, `Bob sent ${numbers.B}.`, 'You did not change either message.'],
    };
  }
  if (scenario === 'active' && characterId === 'alice') {
    return {
      ...base,
      own: { exponent: DH.a, sent: numbers.A, received: numbers.published, key: numbers.aliceActive },
      publicMessages: [`You sent ${numbers.A}.`, `The value that arrived, which you treat as Bob’s, is ${numbers.published}.`],
    };
  }
  if (scenario === 'active' && characterId === 'bob') {
    return {
      ...base,
      own: { exponent: DH.b, sent: numbers.B, received: numbers.published, key: numbers.bobActive },
      publicMessages: [`You sent ${numbers.B}.`, `The value that arrived, which you treat as Alice’s, is ${numbers.published}.`],
    };
  }
  return {
    ...base,
    own: {
      exponent: DH.m,
      sentToBob: numbers.published,
      sentToAlice: numbers.published,
      interceptedFromAlice: numbers.A,
      interceptedFromBob: numbers.B,
      keyWithAlice: numbers.aliceActive,
      keyWithBob: numbers.bobActive,
    },
    publicMessages: [
      `You replaced Alice’s public value with ${numbers.published} on the way to Bob.`,
      `You replaced Bob’s public value with ${numbers.published} on the way to Alice.`,
      BRIDGE_ATTACK,
    ],
  };
}

function gardenView(characterId: string, mode: AskMode, context: string): NpcView {
  const base = {
    characterId,
    regionId: 'garden',
    mode,
    scenario: 'passive' as const,
    context,
    overview: null as string | null,
    public: {} as NpcView['public'],
    own: null as NpcView['own'],
    publicMessages: ['Alice and Bob run the Library PSI demonstration on their own sets.'],
  };
  if (mode === 'explain') {
    return {
      ...base,
      overview: 'Alice and Bob each hold a set. The PSI and PSU visualizations are the computation. Alice learns the intersection, not Bob’s remaining items. An outsider who misses both sets has not, by that fact alone, been given the security definition.',
    };
  }
  if (characterId === 'alice') {
    return { ...base, own: { set: ALICE_SET, intersection: INTERSECTION }, publicMessages: ['The demo returns the intersection of your set with Bob’s.'] };
  }
  if (characterId === 'bob') {
    return { ...base, own: { set: BOB_SET, intersection: INTERSECTION }, publicMessages: ['The demo returns the intersection of your set with Alice’s.'] };
  }
  return {
    ...base,
    publicMessages: ['A comparison ran.', 'You do not have either set.', 'Outsider secrecy is not the definition of PSI security.'],
  };
}

function hashView(characterId: string, mode: AskMode, context: string): NpcView {
  const base = {
    characterId,
    regionId: 'grove',
    mode,
    scenario: 'passive' as const,
    context,
    overview: null as string | null,
    public: {} as NpcView['public'],
    own: null as NpcView['own'],
    publicMessages: [] as string[],
  };
  if (mode === 'explain') {
    return {
      ...base,
      overview: 'A hash maps an input to a digest. It is not encryption, because a digest is not meant to be decrypted. Changing the input changes the digest. Hashing a short or guessable secret does not hide it from someone who can test guesses. Eve sees the digest and does not edit the input.',
    };
  }
  if (characterId === 'alice') {
    return {
      ...base,
      own: { input: HASH_INPUT },
      public: { digest: HASH_DIGEST },
      publicMessages: [`You hashed your input. The digest is ${HASH_DIGEST}.`],
    };
  }
  return {
    ...base,
    public: { digest: HASH_DIGEST },
    publicMessages: [`You see the digest ${HASH_DIGEST}.`, 'You do not see the input.', 'You did not change it.'],
  };
}

function viewFor(characterId: string, regionId: string, mode: AskMode, scenario: Scenario, context: string): NpcView {
  if (regionId === 'grove') return hashView(characterId, mode, context);
  if (regionId === 'bridge') return bridgeView(characterId, mode, scenario, context);
  if (regionId === 'garden') return gardenView(characterId, mode, context);
  if (regionId === 'grounds') {
    return {
      characterId,
      regionId,
      mode,
      scenario,
      context,
      overview: 'The player is outside. The dirt path leads north to the sanctuary. Five buildings are the library, one for each area of knowledge, and each room is drawn differently. No protocol secret is assigned on the grounds.',
      public: {},
      own: null,
      publicMessages: ['The path leads to the sanctuary door.', 'The side buildings are the five library areas.'],
    };
  }
  if (regionId === 'library' || regionId === 'sanctuary') {
    return {
      characterId,
      regionId,
      mode,
      scenario,
      context,
      overview: 'The Library Sanctuary looks onto five grounds buildings. Each building is one area of knowledge and is drawn differently. A message is one choice from a set of possible messages. Secrecy asks what an observer can still infer. This overview is teaching context, not a private memory.',
      public: {},
      own: null,
      publicMessages: [],
    };
  }
  if (regionId === 'catacombs') {
    const xor = CHALLENGE_BY_ID.xor;
    return {
      characterId,
      regionId,
      mode,
      scenario,
      context,
      overview: characterId === 'eve'
        ? 'Eve can see the public ciphertext bytes on the byte gate. She does not change, inject, or replace them. The pad is written on the gate for the solver. Seeing those public bytes is not the same as already knowing the letters they become.'
        : 'The Cipher Catacombs states every shift and every pad on the gate. A teaching overview can describe those public values. It is separate from any one participant’s knowledge. No unstated keyword is part of these gates.',
      public: characterId === 'eve' ? { evidence: xor.evidence } : {},
      own: mode === 'role' ? { assignedSecrets: 'none' } : null,
      publicMessages: characterId === 'eve'
        ? ['You see the public ciphertext.', 'You do not change, inject, or replace those bytes.']
        : [],
    };
  }
  return {
    characterId,
    regionId,
    mode,
    scenario,
    context,
    overview: mode === 'explain'
      ? 'Alice keeps her own inputs. Bob keeps his. They can still compute together and send messages. Encryption hides a message from an observer. This plaza has no protocol secret assigned.'
      : null,
    public: {},
    own: mode === 'role' ? { assignedSecrets: 'none' } : null,
    publicMessages: [],
  };
}

export function systemFor(characterId: string, mode: AskMode): string {
  const character = CHARACTER_BY_ID[characterId];
  const lines = [
    `You are the educational character ${character.name} in the Crypto Dungeon.`,
    'Answer in at most three short sentences of plain text. Do not use markdown, lists, or headings.',
    character.limits,
    'Use only the JSON view in the next message. If a value is absent, say that you do not have it. Do not invent it.',
    mode === 'explain'
      ? 'The user asked for a teaching overview. Distinguish that overview from what any one participant actually knows.'
      : 'The user asked what you can know at this step. Use only your own field and the public messages. Do not describe another participant’s secret.',
  ];
  if (character.type === 'portrayal') {
    lines.push('You are an AI educational portrayal of published work, not the person. Do not claim to be them, quote them, remember a private event, or speak for their beliefs. If a question goes beyond the listed sources, say you are unsure. Do not wrap your answer in quotation marks as if it were their words.');
  }
  if (characterId === 'eve') lines.push('You cannot modify, inject, or replace a message. Do not describe yourself doing so.');
  if (characterId === 'mallory') lines.push('You are inside the selected attack simulation only. Say how authentication stops the substitution, and that a trusted third party is not required for every protocol.');
  return lines.join('\n');
}

export function prepareNpc(input: unknown): PreparedNpc | RejectedNpc {
  if (!input || typeof input !== 'object') return fail(400, 'Send a character, a region, and a question.');
  const body = input as Record<string, unknown>;
  const character = CHARACTER_BY_ID[typeof body.characterId === 'string' ? body.characterId : ''];
  const region = REGION_BY_ID[typeof body.regionId === 'string' ? body.regionId : ''];
  const mode: AskMode = body.mode === 'role' ? 'role' : body.mode === 'explain' ? 'explain' : 'explain';
  if (body.mode !== 'role' && body.mode !== 'explain') return fail(400, 'Choose Explain the protocol or What can you know at this step.');
  const scenario: Scenario = body.scenario === 'active' ? 'active' : 'passive';
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!character || !region) return fail(400, 'Unknown character or region.');
  if (!question || question.length > 400) return fail(400, 'Ask a question of at most 400 characters.');
  if (!region.open) return fail(400, `${region.name} is not open yet. The related lessons stay in the Library.`);
  const appearance = APPEARANCES.find(item => item.characterId === character.id && item.regionId === region.id);
  if (!appearance) return fail(400, `${character.name} is not in ${region.name}.`);
  if (character.type === 'portrayal' && mode === 'role') {
    return fail(400, 'Choose Explain the protocol. This portrayal is a teacher, not a protocol participant.');
  }
  if (character.id === 'mallory' && scenario !== 'active') {
    return fail(400, 'Mallory appears only after you activate the attack simulation.');
  }
  if (character.id === 'eve' && scenario === 'active') {
    return fail(400, 'Eve stays passive. Activate Mallory to run the attack simulation.');
  }
  if (scenario === 'active' && region.id !== 'bridge') {
    return fail(400, 'The attack simulation is only on the Key Exchange Bridge.');
  }
  if (scenario === 'active' && !['alice', 'bob', 'mallory'].includes(character.id)) {
    return fail(400, 'The attack simulation is for Alice, Bob, and Mallory.');
  }
  const view = viewFor(character.id, region.id, mode, scenario, appearance.context);
  const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
  const challenge = CHALLENGE_BY_ID[challengeId];
  let system = systemFor(character.id, mode);
  if (challenge) {
    view.public = {
      ...view.public,
      challenge: challenge.title,
      evidence: challenge.evidence,
      flagFormat: challenge.flagFormat,
    };
    view.publicMessages = [...view.publicMessages, challenge.objective];
    system += '\nThe player is on a scored challenge. Start with one small hint and ask what they have tried. Give a more explicit explanation if they ask. If they want the full solution, tell them to use the labeled walkthrough button. Do not decide that the challenge is complete and do not award a reward.';
  }
  return { ok: true, view, system };
}
