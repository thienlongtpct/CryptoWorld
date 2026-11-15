import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import {
  APPEARANCES,
  CHARACTERS,
  PORTRAYAL_BADGE,
  REGIONS,
  portrayalNotice,
} from '../src/characters/cast.ts';
import { HASH_DIGEST, HASH_INPUT, prepareNpc } from '../src/characters/views.ts';

const names = CHARACTERS.map(character => character.name.toLowerCase());

function viewOf(body: Record<string, string>) {
  const prepared = prepareNpc({ ...body, question: body.question ?? 'What is happening?' });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) throw new Error('unreachable');
  return prepared;
}

test('protocol characters keep one identity and real people are disclosed', () => {
  assert.equal(new Set(CHARACTERS.map(character => character.id)).size, CHARACTERS.length);
  assert.equal(CHARACTERS.filter(character => character.id === 'shamir').length, 1);
  assert.ok(APPEARANCES.filter(appearance => appearance.characterId === 'alice').length >= 4);
  assert.equal(names.includes('nova') || names.includes('hazel'), false);
  for (const character of CHARACTERS.filter(item => item.type === 'portrayal')) {
    assert.equal(PORTRAYAL_BADGE, 'AI educational portrayal');
    assert.equal(portrayalNotice(character.name), `This is an AI-generated educational character inspired by ${character.name}'s published work, not the actual person.`);
    assert.ok(character.biography);
    assert.ok(character.biography.sources.length > 0);
    for (const source of character.biography.sources) assert.match(source.url, /^https:\/\//);
    assert.match(character.limits, /Do not speak as|not the person|Do not claim to be/);
  }
  const shannon = APPEARANCES.find(appearance => appearance.id === 'shannon');
  assert.match(shannon?.guest ?? '', /not the actual person/);
});

test('future regions stay labeled and closed', () => {
  for (const id of ['ruins', 'citadel', 'forge', 'peaks', 'market', 'cavern', 'observatory']) {
    const region = REGIONS.find(item => item.id === id);
    assert.equal(region?.open, false);
    assert.match(region?.summary ?? '', /Not open/);
    const prepared = prepareNpc({ characterId: 'caesar', regionId: id, mode: 'explain', question: 'Hello' });
    if (id === 'ruins') {
      assert.equal(prepared.ok, false);
      if (!prepared.ok) assert.match(prepared.error, /not open yet/);
    }
  }
  assert.equal(APPEARANCES.some(appearance => appearance.regionId === 'ruins'), false);
});

test('the hash view gives Eve the digest and not the input', () => {
  assert.equal(createHash('sha256').update(HASH_INPUT).digest('hex'), HASH_DIGEST);
  const eve = viewOf({ characterId: 'eve', regionId: 'grove', mode: 'role' });
  const alice = viewOf({ characterId: 'alice', regionId: 'grove', mode: 'role' });
  const explained = viewOf({ characterId: 'eve', regionId: 'grove', mode: 'explain' });
  assert.equal(JSON.stringify(eve.view).includes(HASH_INPUT), false);
  assert.equal(JSON.stringify(explained.view).includes(HASH_INPUT), false);
  assert.equal(alice.view.own?.input, HASH_INPUT);
  assert.match(eve.system, /cannot modify, inject, or replace/);
  const active = prepareNpc({ characterId: 'eve', regionId: 'grove', mode: 'role', scenario: 'active', question: 'Change it' });
  assert.equal(active.ok, false);
});

test('bridge roles omit the other exponent and Mallory waits for the attack', () => {
  const alice = viewOf({ characterId: 'alice', regionId: 'bridge', mode: 'role' });
  const bob = viewOf({ characterId: 'bob', regionId: 'bridge', mode: 'role' });
  const eve = viewOf({ characterId: 'eve', regionId: 'bridge', mode: 'role' });
  assert.equal(alice.view.own?.exponent, 123);
  assert.equal(JSON.stringify(alice.view).includes('321'), false);
  assert.equal(bob.view.own?.exponent, 321);
  assert.equal(JSON.stringify(bob.view).includes('123'), false);
  assert.equal(JSON.stringify(eve.view).includes('123'), false);
  assert.equal(JSON.stringify(eve.view).includes('321'), false);
  assert.equal(JSON.stringify(eve.view).includes('676'), false);
  const waiting = prepareNpc({ characterId: 'mallory', regionId: 'bridge', mode: 'role', question: 'What did you change?' });
  assert.equal(waiting.ok, false);
  const mallory = viewOf({ characterId: 'mallory', regionId: 'bridge', mode: 'role', scenario: 'active' });
  assert.equal(mallory.view.own?.exponent, 77);
  assert.equal(JSON.stringify(mallory.view).includes('123'), false);
  assert.equal(JSON.stringify(mallory.view).includes('321'), false);
  assert.match(JSON.stringify(mallory.view), /authenticate/);
  const eveAttack = prepareNpc({ characterId: 'eve', regionId: 'bridge', mode: 'role', scenario: 'active', question: 'Change the message' });
  assert.equal(eveAttack.ok, false);
  const overview = viewOf({ characterId: 'alice', regionId: 'bridge', mode: 'explain', scenario: 'active' });
  assert.equal(overview.view.own, null);
  assert.equal(JSON.stringify(overview.view).includes('123'), false);
  assert.match(overview.system, /teaching overview/);
});

test('garden roles do not receive the other set', () => {
  const alice = viewOf({ characterId: 'alice', regionId: 'garden', mode: 'role' });
  const bob = viewOf({ characterId: 'bob', regionId: 'garden', mode: 'role' });
  const eve = viewOf({ characterId: 'eve', regionId: 'garden', mode: 'role' });
  const explained = viewOf({ characterId: 'alice', regionId: 'garden', mode: 'explain' });
  assert.equal(JSON.stringify(alice.view).includes('gus'), false);
  assert.equal(JSON.stringify(alice.view).includes('hal'), false);
  assert.equal(JSON.stringify(bob.view).includes('ana'), false);
  assert.equal(JSON.stringify(bob.view).includes('fay'), false);
  for (const name of ['ana', 'ben', 'gus', 'hal', 'fay']) {
    assert.equal(JSON.stringify(eve.view).includes(name), false);
    assert.equal(JSON.stringify(explained.view).includes(name), false);
  }
  assert.match(JSON.stringify(eve.view), /not the definition of PSI/);
});

test('a portrayal is not asked for a participant view', () => {
  const role = prepareNpc({ characterId: 'shannon', regionId: 'library', mode: 'role', question: 'What is your secret?' });
  assert.equal(role.ok, false);
  const explained = viewOf({ characterId: 'shannon', regionId: 'library', mode: 'explain' });
  assert.match(explained.system, /not the person/);
  assert.equal(explained.view.own, null);
});
