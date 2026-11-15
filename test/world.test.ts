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
  blockersOf,
  homePlace,
  sanctuaryPlace,
} from '../src/dungeon/rooms.ts';
import { prepareNpc } from '../src/characters/views.ts';
import { grade } from '../server/dungeon.mjs';
import { fits, move, solidAt } from '../src/world/map.ts';

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

test('the default place is the outdoor path, and a path leads from it to every grounds door', () => {
  const home = homePlace();
  assert.equal(home.room, 'grounds');
  const room = roomOf(home.room);
  assert.equal(room.map[Math.floor(home.y)][Math.floor(home.x)], 'path');
  const walkway = new Set(['path', 'cobble', 'door']);
  const start = `${Math.floor(home.x)},${Math.floor(home.y)}`;
  const seen = new Set([start]);
  const todo = [start];
  while (todo.length) {
    const [x, y] = todo.pop()!.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${x + dx},${y + dy}`;
      const tile = room.map[y + dy]?.[x + dx];
      if (tile && walkway.has(tile) && !seen.has(key)) {
        seen.add(key);
        // Doors end a path: do not walk through a building.
        if (tile !== 'door') todo.push(key);
      }
    }
  }
  for (const door of room.spots.filter(spot => spot.kind === 'door')) {
    assert.ok(seen.has(`${Math.floor(door.x)},${Math.floor(door.y)}`), `no path reaches ${door.id}`);
  }
});

test('the player body fits where it arrives and can walk to every spot in every room', () => {
  for (const id of ROOM_LIST) {
    const room = ROOMS[id];
    const gates = new Set<string>();
    room.map.forEach((row, y) => row.forEach((tile, x) => { if (tile === 'gate') gates.add(`${x},${y}`); }));
    const blockers = blockersOf(room);
    assert.ok(fits(room.map, room.spawn.x, room.spawn.y, gates, blockers), `${id} spawn does not fit the body`);
    for (const other of Object.values(ROOMS)) {
      for (const spot of other.spots) {
        if (spot.to === id && spot.arrive) assert.ok(fits(room.map, spot.arrive.x, spot.arrive.y, gates, blockers), `${spot.id} arrives inside something`);
      }
    }
    // Walk tile centre to tile centre with the real movement code.
    const key = (x: number, y: number) => `${x},${y}`;
    const sx = Math.floor(room.spawn.x);
    const sy = Math.floor(room.spawn.y);
    const reached = new Set([key(sx, sy)]);
    const todo: [number, number][] = [[sx, sy]];
    const from = (x: number, y: number) => (x === sx && y === sy ? room.spawn : { x: x + 0.5, y: y + 0.5 });
    while (todo.length) {
      const [x, y] = todo.pop()!;
      const here = from(x, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const tx = x + dx + 0.5;
        const ty = y + dy + 0.5;
        if (reached.has(key(x + dx, y + dy)) || !fits(room.map, tx, ty, gates, blockers)) continue;
        const end = move(room.map, here.x, here.y, tx - here.x, ty - here.y, gates, blockers);
        if (Math.abs(end.x - tx) < 0.01 && Math.abs(end.y - ty) < 0.01) {
          reached.add(key(x + dx, y + dy));
          todo.push([x + dx, y + dy]);
        }
      }
    }
    for (const spot of room.spots) {
      const near = [...reached].some(cell => {
        const [x, y] = cell.split(',').map(Number);
        return Math.max(Math.abs(x + 0.5 - spot.x), Math.abs(y + 0.5 - spot.y)) <= 1.05;
      });
      assert.ok(near, `${id}: cannot walk to ${spot.id}`);
    }
  }
});

test('walls, building fronts, and NPCs stop the body before the sprite overlaps them', () => {
  const room = ROOMS.sanctuary;
  // Walk left into the west wall: the body stops at its edge, not half inside it.
  const atWall = move(room.map, 2.5, 7.5, -5, 0);
  assert.ok(atWall.x >= 1 + 0.34 - 1e-9, `stopped at ${atWall.x}`);
  // An NPC stops the player instead of being walked through.
  const alice = room.spots.find(spot => spot.id === 'alice-sanctuary')!;
  const blocked = move(room.map, alice.x, alice.y + 2, 0, -2, undefined, blockersOf(room));
  assert.ok(blocked.y > alice.y + 0.3, `walked into Alice at ${blocked.y}`);
  // A building on the grounds is solid apart from its door.
  const grounds = ROOMS.grounds;
  const door = grounds.spots.find(spot => spot.id === 'to-keys')!;
  assert.ok(fits(grounds.map, door.x, door.y));
  assert.ok(!fits(grounds.map, door.x, door.y - 1));
  // A large step cannot tunnel through a wall.
  const jump = move(room.map, 9.5, 7.5, 0, -20);
  assert.ok(jump.y > 0.5);
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

test('walking at a door slightly off-centre slides into the doorway instead of catching on the corner', () => {
  const grounds = ROOMS.grounds;
  const door = grounds.spots.find(spot => spot.id === 'to-keys')!;
  for (const offset of [-0.3, 0.3]) {
    let at = { x: door.x + offset, y: door.y + 1.6 };
    for (let i = 0; i < 30; i++) at = move(grounds.map, at.x, at.y, 0, -0.1);
    assert.ok(at.y < door.y + 0.2, `stuck below the door at offset ${offset}: y=${at.y}`);
    assert.ok(Math.abs(at.x - door.x) <= 0.5 - 0.34 + 1e-9, `body sticks out of the doorway: x=${at.x}`);
  }
});
