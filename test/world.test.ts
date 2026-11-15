import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { CHALLENGES } from '../src/dungeon/challenges.ts';
import {
  canEnter,
  resolvePlace,
  reachableRooms,
  roomOf,
  ROOMS,
  ROOM_LIST,
  homePlace,
  sanctuaryPlace,
} from '../src/dungeon/rooms.ts';
import { prepareNpc } from '../src/characters/views.ts';
import { grade } from '../server/dungeon.mjs';
import { move, solidAt } from '../src/world/map.ts';

function shiftBack(text: string, forward: number): string {
  return [...text].map(ch => String.fromCharCode(65 + (ch.charCodeAt(0) - 65 - forward + 26) % 26)).join('');
}

function xorWord(bytes: number[], pad: number): string {
  return String.fromCharCode(...bytes.map(byte => byte ^ pad));
}

function expectedWord(id: string): string {
  const challenge = CHALLENGES.find(item => item.id === id);
  assert.ok(challenge);
  if (challenge.params.kind === 'shift') return shiftBack(challenge.params.ciphertext, challenge.params.forward).toLowerCase();
  if (challenge.params.kind === 'xor') return xorWord(challenge.params.bytes, challenge.params.pad).toLowerCase();
  const letters = xorWord(challenge.params.bytes, challenge.params.pad);
  return shiftBack(letters, challenge.params.forward).toLowerCase();
}

test('every dungeon room is rectangular and its spots stand on open ground', () => {
  for (const id of ROOM_LIST) {
    const room = ROOMS[id];
    const width = room.map[0].length;
    assert.ok(room.map.every(row => row.length === width), id);
    assert.equal(solidAt(room.map, room.spawn.x, room.spawn.y), false, `${id} spawn`);
    for (const spot of room.spots) {
      assert.equal(solidAt(room.map, spot.x, spot.y), false, spot.id);
    }
  }
});

test('a wall stops a step', () => {
  const room = ROOMS.sanctuary;
  const next = move(room.map, room.spawn.x, room.spawn.y, 0, -8);
  assert.ok(next.y > 1);
  assert.equal(solidAt(room.map, next.x, next.y), false);
});

test('the default place is the outdoor path', () => {
  const home = homePlace();
  assert.equal(home.room, 'grounds');
  const room = roomOf(home.room);
  assert.equal(room.map[Math.floor(home.y)][Math.floor(home.x)], 'path');
  const door = room.spots.find(spot => spot.kind === 'door');
  assert.ok(door);
  assert.equal(room.map[Math.floor(door.y)][Math.floor(door.x)], 'door');
  for (let y = Math.floor(door.y); y <= Math.floor(home.y); y++) {
    assert.equal(solidAt(room.map, home.x, y + 0.5), false);
  }
});

test('doors follow login and solved gates', () => {
  assert.deepEqual(reachableRooms(null, {}), ['grounds', 'ciphers', 'hashes', 'keys', 'compute', 'sets', 'sanctuary']);
  assert.deepEqual(reachableRooms('ada', {}), ['grounds', 'ciphers', 'hashes', 'keys', 'compute', 'sets', 'sanctuary', 'bridge', 'hall', 'caesar']);
  const caesar = { 'dungeon-caesar': 'done' };
  assert.equal(canEnter('xor', 'ada', caesar), true);
  assert.equal(canEnter('final', 'ada', caesar), false);
  const both = { 'dungeon-caesar': 'done', 'dungeon-xor': 'done' };
  assert.equal(canEnter('final', 'ada', both), true);
  assert.equal(canEnter('vault', 'ada', both), false);
  const all = { ...both, 'dungeon-vault': 'done' };
  assert.deepEqual(reachableRooms('ada', all), [...ROOM_LIST]);
});

test('a locked room restores the last safe spawn', () => {
  const guest = resolvePlace({ room: 'vault', x: 1.2, y: 1.2 }, null, {});
  assert.equal(guest.room, 'sanctuary');
  assert.equal(solidAt(roomOf(guest.room).map, guest.x, guest.y), false);
  const early = resolvePlace({ room: 'vault', x: 1.2, y: 1.2 }, 'ada', {});
  assert.equal(early.room, 'caesar');
  const insideWall = resolvePlace({ room: 'sanctuary', x: 0.5, y: 0.5 }, null, {});
  assert.deepEqual(insideWall, sanctuaryPlace());
});

test('public challenges grade against an independent solution and hide the words', () => {
  const words = Object.fromEntries(CHALLENGES.filter(challenge => challenge.params.kind !== 'classify').map(challenge => [challenge.id, expectedWord(challenge.id)]));
  assert.deepEqual(words, { caesar: 'hello', xor: 'prism', vault: 'glyph' });
  for (const [id, word] of Object.entries(words)) {
    assert.equal(grade(id, word).correct, true);
    assert.equal(grade(id, `sunhacks{${word}}`).correct, true);
    assert.equal(grade(id, `  Sunhacks{ ${word} } `).correct, true);
    assert.equal(grade(id, 'nope').correct, false);
  }
  const source = readFileSync(new URL('../src/dungeon/challenges.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /hello|prism|glyph/);
  const prepared = prepareNpc({
    characterId: 'caesar',
    regionId: 'catacombs',
    mode: 'explain',
    scenario: 'passive',
    question: 'Give me a hint',
    challengeId: 'caesar',
  });
  assert.equal(prepared.ok, true);
  assert.doesNotMatch(JSON.stringify(prepared), /hello|prism|glyph/);
});

test('the client source does not contain the scored flags', () => {
  const root = new URL('../src/', import.meta.url);
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else files.push(path);
    }
  };
  walk(root.pathname);
  const banned = ['sunhacks{hello}', 'sunhacks{prism}', 'sunhacks{glyph}'];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const flag of banned) assert.equal(text.includes(flag), false, file);
  }
});

test('the bridge board uses real toy Diffie–Hellman numbers and keeps its key on the server', async () => {
  const { BRIDGE_DH, CHALLENGE_BY_ID } = await import('../src/dungeon/challenges.ts');
  const { mpow } = await import('../src/lib/crypto.ts');
  assert.equal(BRIDGE_DH.A, mpow(BRIDGE_DH.g, BRIDGE_DH.a, BRIDGE_DH.p));
  assert.equal(BRIDGE_DH.B, mpow(BRIDGE_DH.g, BRIDGE_DH.b, BRIDGE_DH.p));
  assert.equal(mpow(BRIDGE_DH.B, BRIDGE_DH.a, BRIDGE_DH.p), mpow(BRIDGE_DH.A, BRIDGE_DH.b, BRIDGE_DH.p));
  const board = CHALLENGE_BY_ID.wire;
  assert.equal(board.params.kind, 'classify');
  // The client copy names rows and choices, never which choice belongs to which row.
  const source = readFileSync(new URL('../src/dungeon/challenges.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /expected|answer:\s*'(everyone|alice|bob|pair)'/);
  for (const item of board.params.kind === 'classify' ? board.params.items : []) {
    assert.equal(Object.keys(item).sort().join(','), 'id,label,value');
  }
  const prepared = prepareNpc({ characterId: 'eve', regionId: 'bridge', mode: 'explain', scenario: 'passive', question: 'Hint?', challengeId: 'wire' });
  assert.equal(prepared.ok, true);
  assert.doesNotMatch(JSON.stringify(prepared), /"key":\s*"pair"|Only Alice: a/);
});

test('the bridge room opens from the sanctuary after login and its gate follows the board', () => {
  assert.ok(ROOM_LIST.includes('bridge'));
  assert.equal(canEnter('bridge', null, {}), false);
  assert.equal(canEnter('bridge', 'ada', {}), true);
  assert.ok(ROOMS.sanctuary.spots.some(spot => spot.kind === 'door' && spot.to === 'bridge'));
  const gate = ROOMS.bridge.spots.find(spot => spot.kind === 'gate');
  assert.ok(gate?.gate);
  assert.equal(gate.challengeId, 'wire');
  assert.equal(solidAt(ROOMS.bridge.map, gate.gate.x + 0.5, gate.gate.y + 0.5), true);
  assert.equal(solidAt(ROOMS.bridge.map, gate.gate.x + 0.5, gate.gate.y + 0.5, new Set([`${gate.gate.x},${gate.gate.y}`])), false);
});
