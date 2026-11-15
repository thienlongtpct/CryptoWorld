/**
 * Everything Bit says without a network: the welcome, the Alice/Bob/Eve demo, guidance for each kind
 * of place, and the menu. Each message is one short idea. Edit the text here; the controller and the
 * panel only read these structures.
 *
 * Free-form questions go to Gemini through POST /api/npc (characterId 'bit') and come back labeled as
 * AI explanations. Gate hints come from the public `hints` in dungeon/challenges.ts and are labeled as
 * curated. No answer key is here: those stay in server/dungeon.mjs.
 */

import { CHALLENGE_BY_ID, type Challenge } from '../dungeon/challenges.ts';
import { TOPIC_BY_ID } from '../vis/registry.ts';
import type { Expression } from './art.ts';

export type BitAction =
  /** Open a route. Gated routes still ask a guest to log in. */
  | { kind: 'route'; route: string }
  /** Show the free-form question box (Gemini). */
  | { kind: 'ask' }
  /** Reveal the next curated hint for the open gate. */
  | { kind: 'hint' }
  /** Play the welcome again. */
  | { kind: 'intro' }
  /** Play the Alice, Bob, and Eve demo. */
  | { kind: 'demo' }
  /** Talk about the current place. */
  | { kind: 'place' }
  /** Show the menu. */
  | { kind: 'menu' }
  /** Switch between typewriter and instant text. */
  | { kind: 'instant' }
  /** Ask to log in. */
  | { kind: 'login' }
  | { kind: 'close' };

export interface BitChoice {
  id: string;
  label: string;
  /** Message to go to. Without `next` or `action`, the choice closes the dialogue. */
  next?: string;
  action?: BitAction;
}

export type BitSource = 'curated-hint' | 'ai';

export interface BitLine {
  id: string;
  speaker: 'bit';
  expression: Expression;
  text: string;
  /** Message after this one. A message with neither `next` nor `choices` ends the conversation. */
  next?: string;
  choices?: BitChoice[];
  /** Runs when the message is shown, for example opening the question box. */
  action?: BitAction;
  /** Shown as a label above the text so hints and AI answers are never confused. */
  source?: BitSource;
  /** "Hint 2 of 3" and similar. */
  tag?: string;
}

export type Script = Record<string, BitLine>;

const line = (id: string, expression: Expression, text: string, rest: Partial<BitLine> = {}): BitLine =>
  ({ id, speaker: 'bit', expression, text, ...rest });

/** Messages that do not depend on where the player is. */
export const LINES: Script = Object.fromEntries([
  // The welcome: skippable with the close button, replayable from the menu.
  line('welcome-1', 'happy', 'Welcome to VisuCrypto! I’m Bit. Every locked door here hides something worth learning.', { next: 'welcome-2' }),
  line('welcome-2', 'neutral', 'Walk with WASD or the arrow keys. On a phone, hold the arrow pad.', { next: 'welcome-3' }),
  line('welcome-3', 'curious', 'A gold arrow points to your next goal. Walk up to something that glows and press Space.', { next: 'welcome-4' }),
  line('welcome-4', 'encouraging', 'Stuck or lost? Tap me in the corner any time. I’ll point the way.', {
    choices: [
      { id: 'demo', label: 'Show me a secret', action: { kind: 'demo' } },
      { id: 'go', label: 'Let’s explore' },
    ],
  }),

  // The demo: one idea per message, a question before the answer, and a nudge for a wrong guess.
  line('demo-1', 'curious', 'Alice wants to send Bob a secret: MEET AT NOON.', { next: 'demo-2' }),
  line('demo-2', 'thinking', 'Eve can see the message traveling. What could Alice change so Eve can’t understand it?', {
    choices: [
      { id: 'faster', label: 'Send it faster', next: 'demo-nudge' },
      { id: 'scramble', label: 'Scramble the letters with a key', next: 'demo-3' },
      { id: 'whisper', label: 'Hide who it is for', next: 'demo-nudge' },
    ],
  }),
  line('demo-nudge', 'encouraging', 'Close! Eve still sees every letter on the wire. What if the letters themselves changed?', { next: 'demo-2' }),
  line('demo-3', 'surprised', 'Yes! Alice shifts each letter 3 places with a key only she and Bob know. MEET becomes PHHW.', { next: 'demo-4' }),
  line('demo-4', 'neutral', 'Eve sees PHHW. Bob shifts back 3 places and reads MEET. That’s a Caesar cipher.', { next: 'demo-5' }),
  line('demo-5', 'thinking', 'One catch: there are only 25 shifts. Eve can try them all.', { next: 'demo-6' }),
  line('demo-6', 'happy', 'Nice work! You found the pattern. Ready to try a harder cipher?', {
    choices: [
      { id: 'caesar', label: 'Open the Caesar visualization', action: { kind: 'route', route: 'caesar' } },
      { id: 'vigenere', label: 'Show me a harder one', action: { kind: 'route', route: 'vigenere' } },
      { id: 'later', label: 'Maybe later' },
    ],
  }),

  line('instant-on', 'happy', 'Done. My messages now appear all at once.', { next: 'menu' }),
  line('instant-off', 'happy', 'Done. My messages type out again. Press Space to skip ahead.', { next: 'menu' }),
  line('ask', 'curious', 'Ask me anything about cryptography or this place. I answer with AI, so double-check me.', { action: { kind: 'ask' } }),
  line('ask-guest', 'encouraging', 'Free-form questions need an account, because they use the Gemini tutor. My guided tips work without one.', {
    choices: [
      { id: 'login', label: 'Log in', action: { kind: 'login' } },
      { id: 'back', label: 'Back', next: 'menu' },
    ],
  }),
  line('hint-guest', 'encouraging', 'Log in to use the gate’s hints and tools. You can still read the evidence.', {
    choices: [
      { id: 'login', label: 'Log in', action: { kind: 'login' } },
      { id: 'back', label: 'Back', next: 'menu' },
    ],
  }),
].map(item => [item.id, item]));

/** Kinds of place Bit can tell apart. */
export type PlaceKind = 'entrance' | 'sanctuary' | 'library' | 'catacombs' | 'quest' | 'vis' | 'page' | 'gate' | 'minigame';

export interface Place {
  kind: PlaceKind;
  /** What Bit calls it: a room, a page, or a visualization title. */
  name: string;
  /** Learning topic (a visualization id) when there is one. */
  topicId?: string;
  challengeId?: string;
  /** Region of the cast for the Gemini view, when the room has one. */
  regionId?: string;
}

/** Library buildings outside, each with a shelf. */
const SHELF_ROOMS = new Set(['ciphers', 'hashes', 'keys', 'compute', 'sets']);
const CATACOMB_ROOMS = new Set(['hall', 'caesar', 'xor', 'final', 'vault']);
const QUEST_ROOMS = new Set(['bridge', 'forest', 'gardens']);

const PAGE_NAMES: Record<string, string> = {
  library: 'the Library', terms: 'the Dictionary', classical: 'Classical cryptography', modern: 'Modern cryptography',
  'lib-psi': 'the PSI library', 'lib-psu': 'the PSU library', bib: 'the Bibliography', paths: 'Learning paths', research: 'the Research Desk',
};

/** Classification boards and the seal lab are played like small games. Text gates take one word. */
export function isMinigame(challenge: Challenge | undefined): boolean {
  return !!challenge && (challenge.params.kind === 'classify' || challenge.params.kind === 'seal');
}

/**
 * Where the player is, from the route, the room, and any open gate.
 * `route` is the hash path without '#'; `layered` is true when a Library page covers the world.
 */
export function placeOf({ route, layered, roomId, roomName, challengeId, regionId }: {
  route: string;
  layered: boolean;
  roomId: string;
  roomName: string;
  challengeId?: string;
  regionId?: string;
}): Place {
  const base = route.split('?')[0];
  if (layered) {
    const topic = TOPIC_BY_ID[base];
    if (topic) return { kind: 'vis', name: topic.title, topicId: topic.id };
    if (base.startsWith('lesson-') || base.startsWith('path-') || base.startsWith('tour-')) return { kind: 'page', name: 'this lesson' };
    if (base === 'library') return { kind: 'library', name: 'the Library' };
    return { kind: 'page', name: PAGE_NAMES[base] ?? 'this page' };
  }
  const challenge = challengeId ? CHALLENGE_BY_ID[challengeId] : undefined;
  if (challenge) {
    return { kind: isMinigame(challenge) ? 'minigame' : 'gate', name: challenge.title, challengeId: challenge.id, topicId: challenge.lesson, regionId };
  }
  if (roomId === 'grounds') return { kind: 'entrance', name: roomName, regionId };
  if (roomId === 'sanctuary') return { kind: 'sanctuary', name: roomName, regionId };
  if (SHELF_ROOMS.has(roomId)) return { kind: 'library', name: roomName, regionId };
  if (CATACOMB_ROOMS.has(roomId)) return { kind: 'catacombs', name: roomName, regionId };
  if (QUEST_ROOMS.has(roomId)) return { kind: 'quest', name: roomName, regionId };
  return { kind: 'entrance', name: roomName, regionId };
}

/** Rules and objectives for each board or lab, in Bit's words. The expected answers stay on the server. */
const MINIGAME_RULES: Record<string, string[]> = {
  wire: [
    'This board is a sorting game. For each value, decide who holds it.',
    'The rule: anything sent across the bridge is public. Eve saw it too.',
    'Pick a choice on every row, then Submit. Wrong rows light up, so you can fix just those.',
  ],
  overlap: [
    'Carol and Dave ran PSI on their gardens. Sort what Carol can learn about each plant.',
    'The rule: Carol learns only the plants they both grow.',
    'Pick a choice on every row, then Submit. Wrong rows light up, so you can fix just those.',
  ],
  seal: [
    'The courier seal is a toy checksum. Your goal: a different word with the same seal.',
    'Use the lab to test words. Only Submit opens the gate, and the server checks it.',
  ],
};

const GATE_RULES = [
  'This gate hides one word. Everything you need is written in its evidence.',
  'Undo the method on the gate step by step. The tools next to it do the arithmetic.',
];

export interface PlaceVars {
  /** Curated hints already shown for the open gate. */
  hintsShown?: number;
  loggedIn?: boolean;
  instant?: boolean;
}

/** Messages about the current place, starting at `${kind}-1`, plus the menu. */
export function placeScript(place: Place, vars: PlaceVars = {}): Script {
  const lines: BitLine[] = [];
  const chain = (prefix: string, items: Array<[Expression, string]>, last: Partial<BitLine>) => {
    items.forEach(([expression, text], index) => {
      const final = index === items.length - 1;
      lines.push(line(`${prefix}-${index + 1}`, expression, text, final ? last : { next: `${prefix}-${index + 2}` }));
    });
  };
  const toMenu: Partial<BitLine> = { choices: [{ id: 'menu', label: 'More options', next: 'menu' }, { id: 'done', label: 'Thanks, Bit' }] };
  const topic = place.topicId ? TOPIC_BY_ID[place.topicId] : undefined;
  switch (place.kind) {
    case 'entrance':
      chain('place', [
        ['neutral', `You’re on ${place.name}. The dirt path north leads to the Sanctuary.`],
        ['curious', 'Each building outside is one area of the Library. Step inside to browse its shelf.'],
        ['encouraging', 'Follow the gold arrow when you’re not sure where to go next.'],
      ], toMenu);
      break;
    case 'sanctuary':
      chain('place', [
        ['happy', 'This is the Library Sanctuary, the safe hub. Want to see how Alice sends Bob a secret?'],
      ], { choices: [{ id: 'demo', label: 'Show me', action: { kind: 'demo' } }, { id: 'more', label: 'Where do I go?', next: 'place-2' }] });
      lines.push(line('place-2', 'neutral', 'The south door leads into the Cipher Catacombs. The east door goes to the Key Exchange Bridge.', { next: 'place-3' }));
      lines.push(line('place-3', 'curious', 'The five buildings outside are the Library. Each holds animated visualizations.', toMenu));
      break;
    case 'library':
      chain('place', [
        ['happy', `That’s ${place.name}. Want to see how Alice sends Bob a secret?`],
      ], { choices: [{ id: 'demo', label: 'Show me', action: { kind: 'demo' } }, { id: 'more', label: 'What’s here?', next: 'place-2' }] });
      lines.push(line('place-2', 'neutral', 'Each shelf holds animated visualizations. Open one and press Play to step through it.', { next: 'place-3' }));
      lines.push(line('place-3', 'curious', 'The Dictionary explains the terms. Learning paths put lessons in a good order.', {
        choices: [
          { id: 'library', label: 'Open the Library', action: { kind: 'route', route: 'library' } },
          { id: 'paths', label: 'Show learning paths', action: { kind: 'route', route: 'paths' } },
          { id: 'menu', label: 'More options', next: 'menu' },
        ],
      }));
      break;
    case 'catacombs':
      chain('place', [
        ['curious', 'Welcome to the Cipher Catacombs. Three gates stand between you and the treasure room.'],
        ['thinking', 'Each gate states its method. Your job is to undo it and find one word.'],
        ['encouraging', 'Inspect a gate with Space. I can give hints, gently at first.'],
      ], toMenu);
      break;
    case 'quest':
      chain('place', [
        ['curious', `This is ${place.name}. Talk to the people here, then try the gate.`],
        ['thinking', 'Ask each of them what they can see. Alice, Bob, and Eve each know different things.'],
      ], toMenu);
      break;
    case 'vis':
      chain('place', [
        ['curious', `This is ${topic?.title ?? place.name}. Watch the stage: Alice on one side, the public wire, Bob on the other.`],
        ['neutral', 'Press Space to play or pause. The ← and → keys step one line of pseudo-code at a time.'],
        ['thinking', 'Open the yellow Actions box. Change an input, press Go, and see what changes.'],
        ['encouraging', 'Switch to “Alice sees” at the top. Striped values are secrets she never learns.'],
      ], toMenu);
      break;
    case 'page':
      chain('place', [
        ['neutral', `You’re reading ${place.name}. Gold citation links open the paper in the Bibliography.`],
        ['encouraging', 'The Back bar at the top returns you to the same spot in the dungeon.'],
      ], toMenu);
      break;
    case 'minigame':
    case 'gate': {
      const challenge = place.challengeId ? CHALLENGE_BY_ID[place.challengeId] : undefined;
      const rules = (place.kind === 'minigame' && place.challengeId && MINIGAME_RULES[place.challengeId]) || GATE_RULES;
      const exprs: Expression[] = ['curious', 'thinking', 'neutral'];
      chain('place', rules.map((text, index): [Expression, string] => [exprs[index % exprs.length], text]), {
        choices: [
          { id: 'hint', label: 'Give me a hint', action: { kind: 'hint' } },
          { id: 'menu', label: 'More options', next: 'menu' },
          { id: 'try', label: 'I’ll try on my own' },
        ],
      });
      if (challenge) lines.push(...hintLines(challenge, vars.hintsShown ?? 0));
      break;
    }
  }
  lines.push(menuLine(place, vars));
  return Object.fromEntries(lines.map(item => [item.id, item]));
}

export function menuLine(place: Place, vars: PlaceVars = {}): BitLine {
  const challenge = place.kind === 'gate' || place.kind === 'minigame';
  const choices: BitChoice[] = [
    { id: 'place', label: challenge ? 'What do I do here?' : 'Where am I?', action: { kind: 'place' } },
  ];
  if (challenge) choices.push({ id: 'hint', label: 'Give me a hint', action: { kind: 'hint' } });
  choices.push(
    { id: 'ask', label: 'Ask a question (AI)', action: { kind: 'ask' } },
    { id: 'demo', label: 'Alice, Bob and Eve demo', action: { kind: 'demo' } },
    { id: 'intro', label: 'Replay the introduction', action: { kind: 'intro' } },
    { id: 'instant', label: vars.instant ? 'Type my messages out' : 'Show messages instantly', action: { kind: 'instant' } },
  );
  return line('menu', 'neutral', challenge ? `We’re at ${place.name}. How can I help?` : 'What would you like to do?', { choices });
}

/**
 * The next curated hint as a message. Hints get stronger one at a time: a nudge first, the last step last.
 * After the last hint, Bit points to the gate's labeled walkthrough, which the server serves.
 */
export function hintLines(challenge: Challenge, shown: number): BitLine[] {
  const total = challenge.hints.length;
  if (shown >= total) {
    return [line('hint', 'thinking', 'That’s every hint I have. If you want the full solution, the gate has a labeled walkthrough button.', {
      choices: [{ id: 'ask', label: 'Ask a question (AI)', action: { kind: 'ask' } }, { id: 'ok', label: 'I’ll keep trying' }],
    })];
  }
  const index = shown;
  const lead: Expression = index === 0 ? 'curious' : index === total - 1 ? 'encouraging' : 'thinking';
  const more = index + 1 < total;
  return [line('hint', lead, challenge.hints[index], {
    source: 'curated-hint',
    tag: `Hint ${index + 1} of ${total}`,
    choices: more
      ? [{ id: 'more', label: 'A stronger hint', action: { kind: 'hint' } }, { id: 'ok', label: 'I’ll try that' }]
      : [{ id: 'ok', label: 'Got it' }],
  })];
}

/** A celebration after a gate opens. */
export function celebration(challengeId: string): string {
  const challenge = CHALLENGE_BY_ID[challengeId];
  return challenge ? `Nice work! The ${challenge.title} is open. Ready for the next one?` : 'Nice work! Ready for the next one?';
}

/** Automatic introductions. Each plays once, then only on demand. */
export type Tutorial = 'welcome' | 'library' | 'vis' | 'gate' | 'minigame' | 'catacombs';

/** Which automatic introduction fits this place, if any. Gates only get a small nudge, never a dialogue over the puzzle. */
export function tutorialFor(place: Place): Tutorial | null {
  if (place.kind === 'vis') return 'vis';
  if (place.kind === 'library') return 'library';
  if (place.kind === 'catacombs') return 'catacombs';
  if (place.kind === 'gate') return 'gate';
  if (place.kind === 'minigame') return 'minigame';
  return null;
}

/** Tutorials that open the dialogue by themselves. The others show a nudge beside the guide button. */
export const AUTO_OPEN: Record<Tutorial, boolean> = {
  welcome: true,
  library: true,
  vis: true,
  catacombs: true,
  gate: false,
  minigame: false,
};

export const NUDGES: Record<Tutorial, string> = {
  welcome: 'Hi! I’m Bit. Tap me for a tour.',
  library: 'Want a quick tour of the Library?',
  vis: 'Tap me for what to watch here.',
  catacombs: 'Tap me before you try the gates.',
  gate: 'Stuck? I have hints, gentle ones first.',
  minigame: 'Tap me for the rules of this board.',
};

/** Messages that the welcome, demo, and place sequences start at. */
export const STARTS = { welcome: 'welcome-1', demo: 'demo-1', place: 'place-1', menu: 'menu', hint: 'hint', ask: 'ask' } as const;

/** Fills one script from the static lines and the place, so every `next` resolves. */
export function scriptFor(place: Place, vars: PlaceVars = {}): Script {
  return { ...LINES, ...placeScript(place, vars) };
}

/** Problems in a script: dangling `next`, empty text, or a message that is too long to be one idea. */
export function lintScript(script: Script, maxLength = 160): string[] {
  const problems: string[] = [];
  for (const item of Object.values(script)) {
    if (!item.text.trim()) problems.push(`${item.id}: empty text`);
    if (item.source !== 'curated-hint' && item.text.length > maxLength) problems.push(`${item.id}: ${item.text.length} characters`);
    if (item.next && !script[item.next]) problems.push(`${item.id}: next ${item.next} is missing`);
    for (const choice of item.choices ?? []) {
      if (choice.next && !script[choice.next]) problems.push(`${item.id}/${choice.id}: next ${choice.next} is missing`);
    }
    if (item.next && item.choices?.length) problems.push(`${item.id}: has both next and choices`);
  }
  return problems;
}
