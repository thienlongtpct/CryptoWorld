import { BRIDGE_DH, CHALLENGE_BY_ID, GARDENS, sealOf } from '../dungeon/challenges.ts';
import { G, P, mpow } from '../lib/crypto.ts';
import {
  APPEARANCES,
  BRIDGE_ATTACK,
  CHARACTER_BY_ID,
  REGION_BY_ID,
  type AskMode,
  type Scenario,
} from './cast.ts';
import { TOPIC_BY_ID } from '../vis/registry.ts';
import { LOCATION_BY_ID, locationOfRegion, type Location } from '../world/locations.ts';

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
  if (characterId === 'carol') {
    return { ...base, own: { garden: GARDENS.carol, intersection: GARDENS.carol.filter(plant => GARDENS.dave.includes(plant)) }, publicMessages: ['PSI returned the plants you share with Dave.'] };
  }
  if (characterId === 'dave') {
    return { ...base, own: { garden: GARDENS.dave }, publicMessages: ['You took part in PSI. Carol received the output, not you.'] };
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
  if (characterId === 'faythe' || characterId === 'oscar') {
    return {
      ...base,
      overview: mode === 'explain'
        ? 'The courier seal adds letter values and keeps the remainder after dividing by 26. Two different words with the same seal are a collision, and this seal has many, for example any rearrangement of the same letters. A cryptographic hash such as SHA-256 is designed so that finding a collision is out of reach. No practical way to do that is known.'
        : null,
      public: { parcel: 'LEAF', seal: sealOf('LEAF'), rule: 'add letter values A = 1 to Z = 26, then take the remainder after dividing by 26' },
      publicMessages: ['The parcel LEAF carries seal 24.', 'The seal is a toy checksum, not a cryptographic hash.'],
    };
  }
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
      overview: 'The Library of Arcane Ciphers looks onto five grounds buildings. Each building is one area of knowledge and is drawn differently. A message is one choice from a set of possible messages. Secrecy asks what an observer can still infer. This overview is teaching context, not a private memory.',
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
        : 'The Labyrinth of Hidden Flags states every shift and every pad on the gate. A teaching overview can describe those public values. It is separate from any one participant’s knowledge. No unstated keyword is part of these gates.',
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

/** Where Bit, the guide, can be asked from. Matches PlaceKind in src/bit/script.ts. */
export const GUIDE_LOCATIONS = ['entrance', 'sanctuary', 'library', 'catacombs', 'quest', 'vis', 'page', 'gate', 'minigame'] as const;

export const GUIDE_SYSTEM = [
  'You are Bit, a small floating cipher companion who guides university students and beginners through CryptoWorld, a cryptography learning game.',
  'Be curious and friendly. Answer in at most three short sentences of plain text, one idea per sentence. Do not use markdown, lists, or headings.',
  'When you explain a term, use a tiny Alice, Bob, and Eve example: Alice and Bob talk, Eve only listens.',
  'Use the JSON view for where the learner is and what they are studying. General textbook cryptography is fine. Say so when you are unsure.',
  'Every number in this game is a toy parameter. Never suggest that the toy schemes are secure.',
  'Never give a challenge answer, flag, or final word. Offer one small hint, then point to the curated hints and the labeled walkthrough on the gate.',
].join('\n');

/** Bit, the guide: no fixed region or secrets. The view carries only the place, the topic, and any open gate's public evidence. */
function prepareGuide(body: Record<string, unknown>): PreparedNpc | RejectedNpc {
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question || question.length > 400) return fail(400, 'Ask a question of at most 400 characters.');
  const location = GUIDE_LOCATIONS.find(item => item === body.location) ?? 'page';
  const topic = TOPIC_BY_ID[typeof body.topic === 'string' ? body.topic : ''];
  const regionCandidate = REGION_BY_ID[typeof body.regionId === 'string' ? body.regionId : ''];
  const region = regionCandidate?.open ? regionCandidate : undefined;
  const challenge = CHALLENGE_BY_ID[typeof body.challengeId === 'string' ? body.challengeId : ''];
  const place = typeof body.place === 'string' ? body.place.replace(/[^\p{L}\p{N} ’'.,:-]/gu, '').slice(0, 60) : '';
  const landmark: Location | undefined = LOCATION_BY_ID[body.locationId as keyof typeof LOCATION_BY_ID] ?? (region ? locationOfRegion(region.id) : undefined);
  const view: NpcView = {
    characterId: 'bit',
    regionId: region?.id ?? 'guide',
    mode: 'explain',
    scenario: 'passive',
    context: `The learner is at ${place || 'a page of CryptoWorld'} (${location}).`,
    overview: region ? region.summary : null,
    public: {
      location,
      ...(landmark ? landmarkView(landmark) : {}),
      ...(topic ? { topic: topic.title, topicBlurb: topic.blurb } : {}),
    },
    own: null,
    publicMessages: [],
  };
  let system = GUIDE_SYSTEM;
  if (challenge) {
    view.public = { ...view.public, challenge: challenge.title, evidence: challenge.evidence, flagFormat: challenge.flagFormat };
    view.publicMessages = [challenge.objective];
    system += '\nThe learner is on a scored challenge. Start with one small hint and ask what they have tried. Do not decide that the challenge is complete and do not award a reward.';
  }
  return { ok: true, view, system };
}

/** The world location around a character, as public scenery for the Gemini view. */
function landmarkView(landmark: Location) {
  return { landmark: landmark.name, landmarkTopics: landmark.subtitle, landmarkScene: landmark.description };
}

export function prepareNpc(input: unknown): PreparedNpc | RejectedNpc {
  if (!input || typeof input !== 'object') return fail(400, 'Send a character, a region, and a question.');
  const body = input as Record<string, unknown>;
  if (body.characterId === 'bit') return prepareGuide(body);
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
    return fail(400, 'The attack simulation is only on the Bridge of Shared Secrets.');
  }
  if (scenario === 'active' && !['alice', 'bob', 'mallory'].includes(character.id)) {
    return fail(400, 'The attack simulation is for Alice, Bob, and Mallory.');
  }
  const view = viewFor(character.id, region.id, mode, scenario, appearance.context);
  const landmark = locationOfRegion(region.id);
  if (landmark) view.public = { ...landmarkView(landmark), ...view.public };
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
