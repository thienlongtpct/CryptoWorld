import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { EXPRESSIONS, FACES, PALETTE, portraitGrid, spriteGrid } from '../src/bit/art.ts';
import {
  AUTO_OPEN,
  LINES,
  NUDGES,
  STARTS,
  celebration,
  hintLines,
  lintScript,
  menuLine,
  placeOf,
  scriptFor,
  tutorialFor,
  type Place,
} from '../src/bit/script.ts';
import {
  CHAR_MS,
  delayAfter,
  graphemes,
  isComplete,
  pressOutcome,
  reveal,
  revealDelays,
  revealDuration,
  sentences,
  splitShown,
  type Reveal,
} from '../src/bit/typewriter.ts';
import { CHALLENGE_BY_ID } from '../src/dungeon/challenges.ts';
import { prepareNpc } from '../src/characters/views.ts';
import { TOPIC_BY_ID } from '../src/vis/registry.ts';
import { grade } from '../server/dungeon.mjs';

// ── Typewriter ──────────────────────────────────────────────────────────────

test('graphemes keep emoji, flags, and combining marks whole', () => {
  assert.deepEqual(graphemes('héllo'), ['h', 'é', 'l', 'l', 'o']);
  assert.deepEqual(graphemes('é!'), ['é', '!']);
  assert.equal(graphemes('👩🏽‍💻 hi').length, 4);
  assert.equal(graphemes('🇺🇸🔑').length, 2);
  assert.deepEqual(graphemes(''), []);
});

test('punctuation pauses only at the end of a clause', () => {
  assert.equal(delayAfter('a', 'b'), CHAR_MS);
  assert.ok(delayAfter('.', ' ') > delayAfter(',', ' '));
  assert.ok(delayAfter(',', ' ') > CHAR_MS);
  assert.equal(delayAfter('.', '1'), CHAR_MS, '3.14 keeps typing');
  assert.ok(delayAfter('?', '”') > CHAR_MS);
  assert.equal(delayAfter('.', undefined), 0, 'nothing to wait for after the last character');
  assert.ok(delayAfter('\n', 'a') > CHAR_MS);
  const parts = graphemes('Hi, Eve. Ok');
  const delays = revealDelays(parts);
  assert.equal(delays.length, parts.length - 1);
  assert.ok(revealDuration('Hi, Eve. Ok') > parts.length * CHAR_MS);
  assert.equal(revealDuration(''), 0);
});

test('reveal steps one grapheme at a time and instant shows everything', () => {
  let state: Reveal = reveal({ key: '', shown: 0, total: 0 }, { type: 'start', key: '1', total: 3 });
  assert.equal(state.shown, 1);
  state = reveal(state, { type: 'tick' });
  state = reveal(state, { type: 'tick' });
  assert.ok(isComplete(state));
  assert.equal(reveal(state, { type: 'tick' }), state, 'ticks past the end change nothing');
  const instant = reveal(state, { type: 'start', key: '2', total: 40, instant: true });
  assert.equal(instant.shown, 40);
  assert.ok(isComplete(reveal(state, { type: 'start', key: '3', total: 0 })));
});

test('one press either reveals or advances, never both', () => {
  const typing: Reveal = { key: '1', shown: 4, total: 20 };
  assert.equal(pressOutcome(typing, false), 'reveal');
  assert.equal(pressOutcome(typing, true), 'reveal');
  const shown = reveal(typing, { type: 'finish' });
  assert.equal(shown.shown, 20);
  assert.equal(pressOutcome(shown, false), 'advance', 'only the next press advances');
  assert.equal(pressOutcome(shown, true), 'wait', 'choices need an explicit selection');
  // A sequence of presses walks reveal → advance → reveal → advance.
  const outcomes: string[] = [];
  let state: Reveal = { key: 'a', shown: 1, total: 10 };
  for (let i = 0; i < 4; i++) {
    const outcome = pressOutcome(state, false);
    outcomes.push(outcome);
    state = outcome === 'reveal' ? reveal(state, { type: 'finish' }) : reveal(state, { type: 'start', key: `n${i}`, total: 10 });
  }
  assert.deepEqual(outcomes, ['reveal', 'advance', 'reveal', 'advance']);
});

test('the hidden rest keeps its place so wrapping never jumps', () => {
  const parts = graphemes('Eve 👀 sees');
  const [said, rest] = splitShown(parts, 5);
  assert.equal(said + rest, 'Eve 👀 sees');
  assert.equal(said, 'Eve 👀');
});

test('long AI answers become short messages', () => {
  assert.deepEqual(sentences('Alice locks it. Bob opens it! Eve? She waits.'), ['Alice locks it.', 'Bob opens it!', 'Eve?', 'She waits.']);
  assert.deepEqual(sentences('One. Two. Three. Four. Five.', 3), ['One.', 'Two.', 'Three. Four. Five.']);
  assert.deepEqual(sentences('No full stop'), ['No full stop']);
  assert.deepEqual(sentences('  '), []);
});

// ── Art ─────────────────────────────────────────────────────────────────────

test('sprite and portrait grids are square, use only the palette, and change with the expression', () => {
  for (const grid of [spriteGrid(0), spriteGrid(1), spriteGrid(0, true)]) {
    assert.equal(grid.length, 16);
    for (const row of grid) assert.equal([...row].length, 16);
  }
  const seen = new Set<string>();
  for (const expression of EXPRESSIONS) {
    for (const pose of [{ expression }, { expression, speaking: true }, { expression, blink: true }]) {
      const grid = portraitGrid(pose);
      assert.equal(grid.length, 32);
      for (const row of grid) {
        assert.equal(row.length, 32);
        for (const ch of row) assert.ok(ch === '.' || PALETTE[ch], `unknown pixel ${ch}`);
      }
    }
    seen.add(portraitGrid({ expression }).join('\n'));
  }
  assert.equal(seen.size, EXPRESSIONS.length, 'every expression looks different');
  assert.deepEqual(Object.keys(FACES).sort(), [...EXPRESSIONS].sort());
  assert.notEqual(portraitGrid({ expression: 'neutral', speaking: true }).join(), portraitGrid({ expression: 'neutral' }).join());
  assert.notEqual(spriteGrid(0).join(), spriteGrid(0, true).join());
  // Gold key, cyan eyes, purple cloak, navy face: the four palette families all appear.
  const portrait = portraitGrid({ expression: 'neutral' }).join('');
  for (const ch of ['g', 'c', 'p', 'n', 's', 'b']) assert.ok(portrait.includes(ch), `portrait uses ${ch}`);
});

// ── Dialogue data ───────────────────────────────────────────────────────────

const PLACES: Place[] = [
  placeOf({ route: 'world', layered: false, roomId: 'grounds', roomName: 'Library grounds' }),
  placeOf({ route: 'world', layered: false, roomId: 'sanctuary', roomName: 'Library Sanctuary' }),
  placeOf({ route: 'world', layered: false, roomId: 'ciphers', roomName: 'Cipher court' }),
  placeOf({ route: 'world', layered: false, roomId: 'hall', roomName: 'Catacomb hall' }),
  placeOf({ route: 'world', layered: false, roomId: 'bridge', roomName: 'Key Exchange Bridge', regionId: 'bridge' }),
  placeOf({ route: 'caesar', layered: true, roomId: 'grounds', roomName: 'Library grounds' }),
  placeOf({ route: 'library', layered: true, roomId: 'grounds', roomName: 'Library grounds' }),
  placeOf({ route: 'terms', layered: true, roomId: 'grounds', roomName: 'Library grounds' }),
  ...Object.keys(CHALLENGE_BY_ID).map(id => placeOf({ route: 'world', layered: false, roomId: 'hall', roomName: 'Room', challengeId: id })),
];

test('places are told apart from the route, room, and open gate', () => {
  assert.deepEqual(PLACES.slice(0, 8).map(place => place.kind), ['entrance', 'sanctuary', 'library', 'catacombs', 'quest', 'vis', 'library', 'page']);
  assert.equal(PLACES[5].topicId, 'caesar');
  const byId = Object.fromEntries(PLACES.slice(8).map(place => [place.challengeId, place.kind]));
  assert.deepEqual(byId, { caesar: 'gate', xor: 'gate', vault: 'gate', wire: 'minigame', seal: 'minigame', overlap: 'minigame' });
  // A Library page over the world wins over the gate still open underneath.
  assert.equal(placeOf({ route: 'hash', layered: true, roomId: 'forest', roomName: 'Hash Forest', challengeId: 'seal' }).kind, 'vis');
});

test('every script resolves, has an intro and a menu, and keeps messages short', () => {
  for (const place of PLACES) {
    for (const hintsShown of [0, 1, 3]) {
      const script = scriptFor(place, { hintsShown, loggedIn: true });
      assert.deepEqual(lintScript(script), [], `${place.kind} ${place.name}`);
      for (const start of [STARTS.welcome, STARTS.demo, STARTS.place, STARTS.menu, STARTS.ask]) assert.ok(script[start], `${start} in ${place.kind}`);
      for (const item of Object.values(script)) {
        assert.equal(item.speaker, 'bit');
        assert.ok(EXPRESSIONS.includes(item.expression));
      }
    }
  }
  // Expressions are used across the script, not just one.
  const used = new Set(Object.values(scriptFor(PLACES[1])).map(item => item.expression));
  assert.ok(used.size >= 5);
});

test('the welcome is skippable, the demo asks before it tells, and a wrong guess gets a nudge', () => {
  assert.match(LINES['welcome-1'].text, /I’m Bit/);
  assert.ok(LINES['welcome-4'].choices?.some(choice => choice.action?.kind === 'demo'));
  const question = LINES['demo-2'];
  assert.match(question.text, /Eve can see the message/);
  const wrong = question.choices?.filter(choice => choice.next === 'demo-nudge') ?? [];
  const right = question.choices?.filter(choice => choice.next === 'demo-3') ?? [];
  assert.equal(right.length, 1);
  assert.ok(wrong.length >= 1);
  assert.equal(LINES['demo-nudge'].next, 'demo-2');
  assert.match(LINES['demo-3'].text, /MEET becomes PHHW/);
});

test('the menu offers the intro replay, instant text, and AI, and hints only at gates', () => {
  const plain = menuLine(PLACES[0]);
  const gate = menuLine(PLACES[8]);
  const kinds = (line: typeof plain) => (line.choices ?? []).map(choice => choice.action?.kind);
  assert.ok(kinds(plain).includes('intro'));
  assert.ok(kinds(plain).includes('instant'));
  assert.ok(kinds(plain).includes('ask'));
  assert.ok(!kinds(plain).includes('hint'));
  assert.ok(kinds(gate).includes('hint'));
  assert.match(menuLine(PLACES[0], { instant: true }).choices!.find(choice => choice.id === 'instant')!.label, /Type/);
});

test('curated hints get stronger one at a time and are labeled apart from AI', () => {
  for (const challenge of Object.values(CHALLENGE_BY_ID)) {
    const total = challenge.hints.length;
    for (let shown = 0; shown < total; shown++) {
      const [hint] = hintLines(challenge, shown);
      assert.equal(hint.source, 'curated-hint');
      assert.equal(hint.text, challenge.hints[shown]);
      assert.equal(hint.tag, `Hint ${shown + 1} of ${total}`);
      const stronger = hint.choices?.some(choice => choice.action?.kind === 'hint');
      assert.equal(stronger, shown + 1 < total);
    }
    const [done] = hintLines(challenge, total);
    assert.equal(done.source, undefined);
    assert.match(done.text, /walkthrough/);
  }
});

test('nothing Bit says locally opens a gate', () => {
  const texts = new Set<string>();
  for (const place of PLACES) {
    for (const hintsShown of [0, 1, 2, 3]) for (const item of Object.values(scriptFor(place, { hintsShown }))) texts.add(item.text);
  }
  for (const id of Object.keys(CHALLENGE_BY_ID)) texts.add(celebration(id));
  for (const text of Object.values(NUDGES)) texts.add(text);
  const words = new Set([...texts].join(' ').toLowerCase().match(/[a-z]{3,12}/g) ?? []);
  // The seal gate accepts any colliding word by design, so only the one-word gates are checked.
  for (const id of ['caesar', 'xor', 'vault']) {
    for (const word of words) {
      const result = grade(id, word) as { ok: boolean; correct?: boolean };
      assert.notEqual(result.correct, true, `${word} would open ${id}`);
    }
  }
});

test('automatic introductions: dialogues for places, only nudges over a puzzle', () => {
  assert.equal(tutorialFor(PLACES[0]), null, 'the entrance is covered by the welcome');
  assert.equal(tutorialFor(PLACES[5]), 'vis');
  assert.equal(AUTO_OPEN.vis, true);
  assert.equal(AUTO_OPEN.gate, false);
  assert.equal(AUTO_OPEN.minigame, false);
  for (const id of Object.keys(AUTO_OPEN)) assert.ok(NUDGES[id as keyof typeof NUDGES]);
});

// ── Gemini path ─────────────────────────────────────────────────────────────

test('Bit asks Gemini through the guide view with the place and topic, and no answer key', () => {
  const prepared = prepareNpc({ characterId: 'bit', question: 'Why can’t Eve read it?', location: 'vis', topic: 'caesar', place: 'Caesar cipher' });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  assert.equal(prepared.view.characterId, 'bit');
  assert.equal(prepared.view.public.location, 'vis');
  assert.equal(prepared.view.public.topic, TOPIC_BY_ID.caesar.title);
  assert.match(prepared.system, /You are Bit/);
  assert.match(prepared.system, /Never give a challenge answer/);
  const gate = prepareNpc({ characterId: 'bit', question: 'Help', location: 'gate', challengeId: 'caesar', regionId: 'catacombs' });
  assert.equal(gate.ok, true);
  if (gate.ok) {
    assert.equal(gate.view.public.challenge, CHALLENGE_BY_ID.caesar.title);
    assert.equal(JSON.stringify(gate.view).toLowerCase().includes('hello'), false);
  }
  const odd = prepareNpc({ characterId: 'bit', question: 'Hi', location: 'nowhere', topic: '../x', regionId: 'ruins' });
  assert.equal(odd.ok, true);
  if (odd.ok) {
    assert.equal(odd.view.public.location, 'page');
    assert.equal(odd.view.public.topic, undefined);
    assert.equal(odd.view.regionId, 'guide', 'closed regions are not used');
  }
  assert.equal(prepareNpc({ characterId: 'bit', question: '' }).ok, false);
  assert.equal(prepareNpc({ characterId: 'bit', question: 'x'.repeat(401) }).ok, false);
});

test('client code under src/bit never imports the answer module', () => {
  for (const file of readdirSync(new URL('../src/bit/', import.meta.url))) {
    const source = readFileSync(new URL(`../src/bit/${file}`, import.meta.url), 'utf8');
    assert.equal(/(?:import|from)\s*\(?\s*['"][^'"]*(?:dungeon\.mjs|server\/)/.test(source), false, file);
  }
});
