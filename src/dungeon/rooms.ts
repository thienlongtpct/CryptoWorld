import { SHELVES } from '../access.ts';
import { CATACOMB_GATES, challengeItemId } from '../dungeon/challenges.ts';
import { portrayalNotice } from '../characters/cast.ts';
import { fits, move, nearestSpot, type Blocker, type Spot, type Tile } from '../world/map.ts';

export interface Room {
  id: string;
  name: string;
  wing: string;
  entry: 'open' | 'auth';
  requires: string[];
  back: string;
  spawn: { x: number; y: number };
  map: Tile[][];
  spots: Spot[];
  objective: string;
}

export interface Place {
  room: string;
  x: number;
  y: number;
}

const notice = {
  caesar: portrayalNotice('Julius Caesar'),
  vigenere: portrayalNotice('Blaise de Vigenère'),
  kindi: portrayalNotice('Al-Kindi'),
  shamir: portrayalNotice('Adi Shamir'),
  daemen: portrayalNotice('Joan Daemen'),
};

function grid(rows: string[]): Tile[][] {
  const legend: Record<string, Tile> = {
    '#': 'wall',
    '.': 'stone',
    ',': 'plank',
    '*': 'grass',
    '+': 'path',
    '^': 'tree',
    '~': 'water',
    s: 'shelf',
    k: 'desk',
    t: 'torch',
    g: 'gate',
    e: 'engraving',
    c: 'chest',
    d: 'door',
    w: 'wheel',
    b: 'block',
    p: 'pedestal',
    n: 'wire',
    m: 'mix',
    f: 'flower',
    h: 'plants',
    u: 'mushroom',
    o: 'bush',
    r: 'rock',
    x: 'deadtree',
    '=': 'cobble',
    ':': 'bridge',
    '-': 'paving',
    _: 'carpet',
    q: 'grate',
    v: 'vent',
    B: 'banner',
    '|': 'bars',
    P: 'pillar',
    y: 'crystal',
    A: 'library',
    K: 'keep',
    H: 'crypt',
    T: 'temple',
    C: 'cabin',
    G: 'greenhouse',
  };
  return rows.map(row => [...row].map(cell => legend[cell] ?? 'stone'));
}

function person(partial: Spot): Spot {
  return partial;
}

function areaShelf(shelfId: string, x: number, y: number): Spot {
  const shelf = SHELVES.find(item => item.id === shelfId);
  const title = shelf?.title ?? shelfId;
  const blurb = shelf?.blurb ?? '';
  return {
    id: `shelf-${shelfId}`,
    name: title,
    x,
    y,
    kind: 'shelf',
    shelfId,
    mark: shelf?.mark ?? 'SHELF',
    guest: `${title}. ${blurb} Logging in opens a visualization from this area.`,
    signed: `${title}. ${blurb} Choose a topic to open its visualization.`,
  };
}

function groundsDoor(id: string, name: string, x: number, y: number, to: string, mark: string, blurb: string): Spot {
  return { id, name, x, y, kind: 'door', to, mark, guest: blurb, signed: blurb };
}

function knowledge(
  id: string,
  name: string,
  shelfId: string,
  rows: string[],
  spawn: { x: number; y: number },
  shelfAt: { x: number; y: number },
  doorAt: { x: number; y: number },
): Room {
  const shelf = SHELVES.find(item => item.id === shelfId);
  return {
    id,
    name,
    wing: 'Library',
    entry: 'open',
    requires: [],
    back: 'grounds',
    spawn,
    map: grid(rows),
    objective: shelf?.blurb ?? name,
    spots: [
      areaShelf(shelfId, shelfAt.x, shelfAt.y),
      {
        id: `${id}-out`,
        name: 'Library grounds',
        x: doorAt.x,
        y: doorAt.y,
        kind: 'door',
        to: 'grounds',
        mark: 'EXIT',
        guest: 'This door returns to the grounds.',
        signed: 'This door returns to the grounds.',
      },
    ],
  };
}

export const ROOMS: Record<string, Room> = {
  grounds: {
    id: 'grounds',
    name: 'Library grounds',
    wing: 'Outside',
    entry: 'open',
    requires: [],
    back: 'grounds',
    spawn: { x: 18.5, y: 23.5 },
    map: grid([
      'oo^^o^^^^o^^^ooo^o^^^^^^^o^o^^^^o^^o^oo^',
      'o*****f***f**************************rr^',
      '^***f*****f*f***AAAAAAAA*f****HHHHHH**^^',
      'oh***********^**AAAAAAAA*o*u**HHHHHH*^*^',
      'o***********^*^*AAAAAAAA***f**HHHHHH**^o',
      '^o*KKKKKK*f*****AAAdAAAA******HHHdHH***^',
      '^**KKKKKK*f*f*fy========y******+++***f*^',
      'oh*KKKKKK****h**=======++******+*******o',
      '^**KKdKKK*****f****+****++++++++****h**^',
      'o****++++**********+**f**********f**~~*o',
      'o*******++++++++++++***u*^*********r~~*o',
      '^*urf*************+**f*f^**CCCCC*f**h~*^',
      '^*^***************+**f*****CCCCC**o****o',
      'o**^u*TTTTTTT*****++*****o*CCCCC*******o',
      '^*f*f*TTTTTTT******++++****CCdCC***f*o*^',
      '^*****TTTTTTT******+**++++++++****^****o',
      'o*o*f*TTTdTTT******+***************^*o*^',
      '^*r*f****+*+++++++++****************f**o',
      '^*o*f****+++******+***GGGGGG*f*r****h**o',
      'o*f***h**h*r**ffu*+*o*GGGGGG****o*f***f^',
      'o*****~~~~***fr^**+***GGGGGG***f*******^',
      '^f*oh~~~~~~h**^f**+***GGdGGG*f*^***f***o',
      'o**xh~~~~~~h*^*^f*++++**+*****^*^f**u**^',
      'oo****~~~~***u**u*+**++++******fr**h***^',
      'o**f*r*hh*****fff*+*******f**f******h**o',
      'oo^oo^^o^^o^o^^o^^o^oo^oo^^^o^o^^^oo^^^^',
    ]),
    objective: 'Follow the paths. Each building is a different part of the library, and every path ends at a door.',
    spots: [
      person({
        id: 'trent-grounds',
        name: 'Trent',
        x: 20.5,
        y: 11.5,
        kind: 'person',
        characterId: 'trent',
        regionId: 'grounds',
        place: 'Library grounds',
        guest: 'I am Trent. In protocol stories I am the trusted third party, the one both sides agree to rely on. Here I only vouch for directions: the winding path north ends at the Sanctuary, and every branch ends at a library building. You can look around before you log in.',
        signed: 'I am Trent. The Sanctuary to the north leads to the Catacombs and the Key Exchange Bridge. Ask me when a protocol needs a trusted party, and when it does not.',
      }),
      person({
        id: 'shamir-grounds',
        name: 'Adi Shamir',
        x: 12.5,
        y: 12.5,
        kind: 'person',
        characterId: 'shamir',
        regionId: 'grounds',
        place: 'Library grounds',
        topic: 'ss',
        guest: `${notice.shamir} The cipher court beside this path holds the secret-sharing lesson from the 1979 paper How to Share a Secret: split a secret into shares so that any threshold of them rebuilds it, and fewer reveal nothing about it.`,
        signed: `${notice.shamir} Ask what a threshold means, or open the secret-sharing visualization.`,
      }),
      {
        id: 'to-sanctuary',
        name: 'Library Sanctuary',
        x: 19.5,
        y: 5.5,
        kind: 'door',
        to: 'sanctuary',
        mark: 'SANCTUARY',
        guest: 'The dirt path ends at the library door.',
        signed: 'The dirt path ends at the sanctuary door.',
      },
      groundsDoor('to-keys', 'Key citadel', 5.5, 8.5, 'keys', 'KEYS', 'Public keys and encrypted math. The room is a citadel of keys.'),
      groundsDoor('to-hashes', 'Hash crypt', 33.5, 5.5, 'hashes', 'HASHES', 'Hashes and secret-key encryption. The room is a crypt of digest blocks.'),
      groundsDoor('to-ciphers', 'Cipher court', 9.5, 16.5, 'ciphers', 'CIPHERS', 'Ciphers, shares, and proofs. The room is a court of wheels and tablets.'),
      groundsDoor('to-compute', 'Circuit shop', 29.5, 14.5, 'compute', 'COMPUTE', 'Computing without showing inputs. The room is a shop of circuits.'),
      groundsDoor('to-sets', 'Overlap garden', 24.5, 21.5, 'sets', 'SETS', 'Private lists and their overlap. The room is a garden of two ponds.'),
    ],
  },
  ciphers: knowledge('ciphers', 'Cipher court', 'foundations', [
    '###t##B##B##t###',
    '#ss.e.e..e.e.ss#',
    '#P............P#',
    '#.....w........#',
    '#..eeeeeeeeee..#',
    '#..............#',
    '#d___________y.#',
    '#hh..q....q..hh#',
    '################',
  ], { x: 4.5, y: 6.5 }, { x: 6.5, y: 3.5 }, { x: 1.5, y: 6.5 }),
  hashes: knowledge('hashes', 'Hash crypt', 'symmetric', [
    '###t###v##v###t#',
    '#bb..........bb#',
    '#..............#',
    '#...bbbbbbbb...#',
    '#.y..........y.#',
    '#..............#',
    '#d______.......#',
    '#.q.|.......|.q#',
    '################',
  ], { x: 4.5, y: 6.5 }, { x: 8.5, y: 5.5 }, { x: 1.5, y: 6.5 }),
  keys: knowledge('keys', 'Key citadel', 'public', [
    '###t####B###t###',
    '#--p--y--y--p--#',
    '#P------------P#',
    '#--------------#',
    '#--p---p---p---#',
    '#--------------#',
    '#d______-------#',
    '#hP----------Ph#',
    '################',
  ], { x: 4.5, y: 6.5 }, { x: 8.5, y: 5.5 }, { x: 1.5, y: 6.5 }),
  compute: knowledge('compute', 'Circuit shop', 'mpc', [
    '################',
    '#s,k,,m,,m,,k,s#',
    '#,,nnnnnnnnnn,,#',
    '#,,n,,,,,,,,n,,#',
    '#,,nnnnnnnnnn,,#',
    '#,,k,,,,,,,,k,,#',
    '#d,,,,,,,,,,,,h#',
    '#h,,,,,ss,,,,,h#',
    '################',
  ], { x: 4.5, y: 6.5 }, { x: 7.5, y: 3.5 }, { x: 1.5, y: 6.5 }),
  sets: knowledge('sets', 'Overlap garden', 'sets', [
    '################',
    '#f*^**ff**^*f*o#',
    '#*h~~~~**~~~~h*#',
    '#**~~~~*mm*~~~~#',
    '#*r*~~++++++~~*#',
    '#*f****++***f**#',
    '#d*****++*****o#',
    '#*u****++**f***#',
    '#**ff**++**u*h*#',
    '################',
  ], { x: 3.5, y: 6.5 }, { x: 8.5, y: 4.5 }, { x: 1.5, y: 6.5 }),
  sanctuary: {
    id: 'sanctuary',
    name: 'Library Sanctuary',
    wing: 'Library Sanctuary',
    entry: 'open',
    requires: [],
    back: 'grounds',
    spawn: { x: 9.5, y: 7.5 },
    map: grid([
      '###t#B##d##B#t####',
      '#sss----_----ssss#',
      '#sss----_-----sss#',
      '#-------_--------#',
      '#-P--k--_--k---P-#',
      '#-------_--------#',
      '#y------_-------y#',
      '#--h----_------h-#',
      '#k------_--------d',
      '#h--P---_----P--h#',
      '#-------d--------#',
      '##################',
    ]),
    objective: 'The grounds buildings are the library. The south door is the Cipher Catacombs. The east door is the Key Exchange Bridge.',
    spots: [
      person({
        id: 'peggy-sanctuary',
        name: 'Peggy',
        x: 4.5,
        y: 3.5,
        kind: 'person',
        characterId: 'peggy',
        regionId: 'sanctuary',
        place: 'Library Sanctuary',
        topic: 'zk',
        guest: 'I am Peggy, the prover. I can convince Victor that I know a secret without showing it to him. The zero-knowledge lesson plays rounds of that proof. The south door leads to the Cipher Catacombs.',
        signed: 'I am Peggy. Ask what a prover must be able to do, or open the zero-knowledge lesson.',
      }),
      person({
        id: 'victor-sanctuary',
        name: 'Victor',
        x: 13.5,
        y: 3.5,
        kind: 'person',
        characterId: 'victor',
        regionId: 'sanctuary',
        place: 'Library Sanctuary',
        topic: 'zk',
        guest: 'I am Victor, the verifier. I send Peggy random challenges. Each one she answers makes cheating less likely, and I end up convinced without learning her secret.',
        signed: 'I am Victor. Ask what a verifier checks, and what a verifier never learns.',
      }),
      person({
        id: 'shannon',
        name: 'Claude Shannon',
        x: 9.5,
        y: 5.5,
        kind: 'person',
        characterId: 'shannon',
        regionId: 'library',
        place: 'Library Sanctuary',
        guest: `${portrayalNotice('Claude Shannon')} Each area of the library is a building outside, and each one is drawn differently. Opening a visualization needs an account so the progress can be saved.`,
        signed: `${portrayalNotice('Claude Shannon')} Ask about what a message can reveal, or open Meet the cryptographers. The five buildings outside are the library.`,
      }),
      {
        id: 'to-grounds',
        name: 'Outside',
        x: 8.5,
        y: 0.5,
        kind: 'door',
        to: 'grounds',
        mark: 'EXIT',
        guest: 'The north door returns to the path outside.',
        signed: 'The north door returns to the path outside.',
      },
      {
        id: 'to-bridge',
        name: 'Key Exchange Bridge',
        x: 16.5,
        y: 8.5,
        kind: 'door',
        to: 'bridge',
        mark: 'EAST',
        guest: 'A bridge where Alice and Bob agree on a key while Eve listens. One board asks who holds each value. Log in to cross and to save the gate.',
        signed: 'The Key Exchange Bridge. Sort the values of one key exchange by who holds them to open the bridge gate.',
      },
      {
        id: 'to-catacombs',
        name: 'Cipher Catacombs',
        x: 8.5,
        y: 10.5,
        kind: 'door',
        to: 'hall',
        mark: 'ENTER',
        guest: 'Stone corridors, three gates, and a treasure room. Caesar, Vigenère, and Al-Kindi are inside. Log in to enter and to save solved gates.',
        signed: 'The Cipher Catacombs are open. Three gates stand between here and the treasure room.',
      },
    ],
  },
  bridge: {
    id: 'bridge',
    name: 'Key Exchange Bridge',
    wing: 'Key Exchange Bridge',
    entry: 'auth',
    requires: [],
    back: 'sanctuary',
    spawn: { x: 2.5, y: 5.5 },
    map: grid([
      '^o^^o^^~~~~~~^^o^^',
      '^*f***h~~~~~~h*f*^',
      'o**r**~~~~~~~~**^o',
      '^*f**h~~~~~~~~h**^',
      'o*u***~~~~~~~~*f*o',
      'd=====:::g:::====d',
      '^*f***~~~~~~~~**r^',
      'o**h**~~~~~~~~h*f^',
      '^f**o*h~~~~~~h*u*o',
      '^**f**~~~~~~~~*f*^',
      '^o^^o^^~~~~~~^o^^^',
    ]),
    objective: 'Sort the values of the key exchange by who holds them. The answer opens the gate on the bridge.',
    spots: [
      person({
        id: 'alice-bridge-room',
        name: 'Alice',
        x: 2.5,
        y: 7.5,
        kind: 'person',
        characterId: 'alice',
        regionId: 'bridge',
        place: 'Key Exchange Bridge',
        topic: 'dh',
        guest: 'I am Alice. I picked a secret exponent and sent one public number across the bridge to Bob. Eve heard it. The board at the gate asks who holds each value.',
        signed: 'I am Alice. I know my exponent, both public numbers, and the key we share. Ask what I can know, or open the Diffie–Hellman visualization.',
      }),
      person({
        id: 'eve-bridge-room',
        name: 'Eve',
        x: 4.5,
        y: 3.5,
        kind: 'person',
        characterId: 'eve',
        regionId: 'bridge',
        place: 'Key Exchange Bridge',
        topic: 'dh',
        guest: 'I am Eve. I hear every message on this bridge, and I do not change any of them. Hearing a message is not the same as knowing the secret behind it.',
        signed: 'I am Eve, a passive listener. Ask what the public values tell me and what they do not. I still do not edit them.',
      }),
      {
        id: 'bridge-back',
        name: 'Library Sanctuary',
        x: 0.5,
        y: 5.5,
        kind: 'door',
        to: 'sanctuary',
        mark: 'WEST',
        guest: 'Back to the Library Sanctuary.',
        signed: 'Back to the Library Sanctuary.',
      },
      {
        id: 'bridge-gate',
        name: 'Bridge gate',
        x: 8.5,
        y: 5.5,
        kind: 'gate',
        challengeId: 'wire',
        requires: ['wire'],
        gate: { x: 9, y: 5 },
        mark: 'LOCK',
        guest: 'A board on the gate lists every value from the key exchange. Log in to sort them and open the gate.',
        signed: 'Sort every value on the board by who holds it. The server checks the board and opens the gate.',
      },
      person({
        id: 'bob-bridge-room',
        name: 'Bob',
        x: 14.5,
        y: 3.5,
        kind: 'person',
        characterId: 'bob',
        regionId: 'bridge',
        place: 'Key Exchange Bridge',
        topic: 'dh',
        guest: 'I am Bob. Alice’s number reached me over the bridge. My exponent never left this bank.',
        signed: 'I am Bob. You crossed. I know my exponent, both public numbers, and the key Alice and I share. Eve heard the same two numbers and still does not have the key.',
      }),
      {
        id: 'bridge-citadel',
        name: 'Public-Key Citadel',
        x: 16.5,
        y: 5.5,
        kind: 'future',
        mark: 'SOON',
        lesson: 'rsa',
        summary: 'Not open yet. The Public-Key Citadel will hold RSA and elliptic-curve challenges. The RSA and elliptic-curve visualizations are already in the Library.',
        guest: 'The far door is sealed. The Public-Key Citadel is future content.',
        signed: 'The far door is sealed. The Public-Key Citadel is future content.',
      },
    ],
  },
  hall: {
    id: 'hall',
    name: 'Catacomb hall',
    wing: 'Cipher Catacombs',
    entry: 'auth',
    requires: [],
    back: 'sanctuary',
    spawn: { x: 5.5, y: 5.5 },
    map: grid([
      '####t##B##B##t##',
      '#..............#',
      '#P..........y.P#',
      '#..t......t....#',
      '#..q.......q...#',
      '#eeeeeeeeeeee..#',
      '#______________#',
      '#d..........d..#',
      '#.|..........|.#',
      '################',
    ]),
    objective: 'Speak with Vigenère, then take the east door to the shift gate.',
    spots: [
      person({
        id: 'vigenere-catacombs',
        name: 'Blaise de Vigenère',
        x: 3.5,
        y: 2.5,
        kind: 'person',
        characterId: 'vigenere',
        regionId: 'catacombs',
        place: 'Cipher Catacombs',
        topic: 'vigenere',
        guest: `${notice.vigenere} A keyword can pick a different shift for each letter. The repeating-keyword tableau is a later name for work in the 1586 treatise. The gates ahead use a single stated shift, not a hidden keyword.`,
        signed: `${notice.vigenere} Ask about what a keyword changes. The polyalphabetic visualization is in the Library. These gates do not ask you to guess a keyword.`,
      }),
      {
        id: 'hall-back',
        name: 'Library Sanctuary',
        x: 1.5,
        y: 7.5,
        kind: 'door',
        to: 'sanctuary',
        mark: 'EXIT',
        guest: 'This door returns to the Library Sanctuary.',
        signed: 'This door returns to the Library Sanctuary.',
      },
      {
        id: 'hall-forward',
        name: 'Shift gate',
        x: 13.5,
        y: 6.5,
        kind: 'door',
        to: 'caesar',
        mark: 'EAST',
        guest: 'The next room holds the shift-cipher gate.',
        signed: 'The next room holds the shift-cipher gate.',
      },
    ],
  },
  caesar: {
    id: 'caesar',
    name: 'Shift gate',
    wing: 'Cipher Catacombs',
    entry: 'auth',
    requires: [],
    back: 'hall',
    spawn: { x: 4.5, y: 5.5 },
    map: grid([
      '###t##B##B##t#',
      '#............#',
      '#.Peeeeeeee..#',
      '#............#',
      '#.....t......#',
      '#_________...#',
      '#d.........g.#',
      '#.q.......q..#',
      '#y..........y#',
      '##############',
    ]),
    objective: 'Decrypt the shift cipher on the gate.',
    spots: [
      person({
        id: 'caesar-catacombs',
        name: 'Julius Caesar',
        x: 3.5,
        y: 1.5,
        kind: 'person',
        characterId: 'caesar',
        regionId: 'catacombs',
        place: 'Cipher Catacombs',
        topic: 'caesar',
        guest: `${notice.caesar} Suetonius describes letters moved three places. That is a shift cipher, not a claim that every substitution was invented by Caesar. This gate states its shift.`,
        signed: `${notice.caesar} The ciphertext and the shift are on the gate. Ask for a hint, or open the Caesar visualization.`,
      }),
      person({
        id: 'kindi-catacombs',
        name: 'Al-Kindi',
        x: 10.5,
        y: 1.5,
        kind: 'person',
        characterId: 'kindi',
        regionId: 'catacombs',
        place: 'Cipher Catacombs',
        topic: 'freqan',
        guest: `${notice.kindi} Counting letters can expose a simple substitution when the language is known. This gate already states its shift, so counting is a tool here, not a required guess.`,
        signed: `${notice.kindi} The frequency tool counts the letters you type. The frequency visualization is in the Library.`,
      }),
      {
        id: 'caesar-back',
        name: 'Catacomb hall',
        x: 1.5,
        y: 6.5,
        kind: 'door',
        to: 'hall',
        mark: 'WEST',
        guest: 'Back to the hall.',
        signed: 'Back to the hall.',
      },
      {
        id: 'caesar-gate',
        name: 'Shift gate',
        x: 10.5,
        y: 6.5,
        kind: 'gate',
        to: 'xor',
        challengeId: 'caesar',
        requires: ['caesar'],
        gate: { x: 11, y: 6 },
        mark: 'LOCK',
        guest: 'A guardian blocks this gate. The ciphertext and the shift are written beside it.',
        signed: 'A guardian blocks this gate. Open the challenge, then submit the word.',
      },
    ],
  },
  xor: {
    id: 'xor',
    name: 'Byte gate',
    wing: 'Cipher Catacombs',
    entry: 'auth',
    requires: ['caesar'],
    back: 'caesar',
    spawn: { x: 4.5, y: 5.5 },
    map: grid([
      '###v###v###v##',
      '#............#',
      '#..eeeeeeee..#',
      '#.q.......q..#',
      '#.....t......#',
      '#__________..#',
      '#d.........g.#',
      '#|....q...|..#',
      '#|...........#',
      '##############',
    ]),
    objective: 'XOR the stated bytes, then read the letters.',
    spots: [
      person({
        id: 'eve-catacombs',
        name: 'Eve',
        x: 3.5,
        y: 1.5,
        kind: 'person',
        characterId: 'eve',
        regionId: 'catacombs',
        place: 'Cipher Catacombs',
        topic: 'otp',
        guest: 'I am Eve. I can see the public bytes on this gate. I do not change, inject, or replace them. The pad is written on the gate for you.',
        signed: 'I am Eve. Ask what an observer can see. I still do not edit the bytes.',
      }),
      {
        id: 'xor-back',
        name: 'Shift gate',
        x: 1.5,
        y: 6.5,
        kind: 'door',
        to: 'caesar',
        mark: 'WEST',
        guest: 'Back to the shift gate.',
        signed: 'Back to the shift gate.',
      },
      {
        id: 'xor-gate',
        name: 'Byte gate',
        x: 10.5,
        y: 6.5,
        kind: 'gate',
        to: 'final',
        challengeId: 'xor',
        requires: ['xor'],
        gate: { x: 11, y: 6 },
        mark: 'LOCK',
        guest: 'The bytes and the pad are written on the gate.',
        signed: 'The bytes and the pad are written on the gate.',
      },
    ],
  },
  final: {
    id: 'final',
    name: 'Combined gate',
    wing: 'Cipher Catacombs',
    entry: 'auth',
    requires: ['caesar', 'xor'],
    back: 'xor',
    spawn: { x: 4.5, y: 5.5 },
    map: grid([
      '##t#B#vv#B#t##',
      '#............#',
      '#.Peeeeeeee.P#',
      '#..y......y..#',
      '#.....t......#',
      '#__________..#',
      '#d.........g.#',
      '#.P.......P..#',
      '#y...q..q...y#',
      '##############',
    ]),
    objective: 'XOR the bytes, then undo the stated shift.',
    spots: [
      person({
        id: 'daemen-catacombs',
        name: 'Joan Daemen',
        x: 3.5,
        y: 1.5,
        kind: 'person',
        characterId: 'daemen',
        regionId: 'catacombs',
        place: 'Cipher Catacombs',
        topic: 'blockcipher',
        guest: `${notice.daemen} This last gate stacks two simple steps in a stated order: XOR first, then a shift. Block ciphers also repeat simple steps in a fixed order. AES, the standard in FIPS 197 built from Rijndael, runs rounds, and one step of each round XORs a round key into the data.`,
        signed: `${notice.daemen} Do the XOR first, then undo the shift. Ask why the order matters, or open the block-cipher visualization.`,
      }),
      {
        id: 'final-back',
        name: 'Byte gate',
        x: 1.5,
        y: 6.5,
        kind: 'door',
        to: 'xor',
        mark: 'WEST',
        guest: 'Back to the byte gate.',
        signed: 'Back to the byte gate.',
      },
      {
        id: 'final-gate',
        name: 'Combined gate',
        x: 10.5,
        y: 6.5,
        kind: 'gate',
        to: 'vault',
        challengeId: 'vault',
        requires: ['vault'],
        gate: { x: 11, y: 6 },
        mark: 'LOCK',
        guest: 'The last inscription combines the two earlier operations.',
        signed: 'The last inscription combines the two earlier operations.',
      },
    ],
  },
  vault: {
    id: 'vault',
    name: 'Treasure room',
    wing: 'Cipher Catacombs',
    entry: 'auth',
    requires: ['caesar', 'xor', 'vault'],
    back: 'final',
    spawn: { x: 7.5, y: 5.5 },
    map: grid([
      '###t#BB#t###',
      '#y.......y.#',
      '#..c..c..c.#',
      '#....___...#',
      '#.P..t_t.P.#',
      '#....___...#',
      '#....d.....#',
      '#y........y#',
      '############',
    ]),
    objective: 'The gates are open. Read the treasure, or return to the Library.',
    spots: [
      {
        id: 'treasure',
        name: 'Treasure chest',
        x: 3.5,
        y: 3.5,
        kind: 'chest',
        mark: 'CHEST',
        guest: 'The chest opens after the three gates.',
        signed: 'The chest lists the gates you solved and the Library lessons that match them.',
      },
      {
        id: 'vault-home',
        name: 'Library Sanctuary',
        x: 5.5,
        y: 6.5,
        kind: 'door',
        to: 'sanctuary',
        mark: 'EXIT',
        guest: 'Return to the Library Sanctuary.',
        signed: 'Return to the Library Sanctuary.',
      },
    ],
  },
};

/**
 * Each door leads to the front of the door that leads back, so leaving a building puts you outside it.
 * A door with no partner on the other side uses that room's spawn.
 */
function linkDoors() {
  for (const room of Object.values(ROOMS)) {
    for (const spot of room.spots) {
      if (spot.kind !== 'door' || !spot.to || spot.arrive) continue;
      const target = ROOMS[spot.to];
      const partner = target?.spots.find(other => other.kind === 'door' && other.to === room.id);
      if (!target || !partner) continue;
      const blockers = blockersOf(target);
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const x = partner.x + dx;
        const y = partner.y + dy;
        if (fits(target.map, x, y, undefined, blockers)) {
          spot.arrive = { x, y };
          break;
        }
      }
    }
  }
}
linkDoors();

export const ROOM_LIST = ['grounds', 'ciphers', 'hashes', 'keys', 'compute', 'sets', 'sanctuary', 'bridge', 'hall', 'caesar', 'xor', 'final', 'vault'] as const;

export function roomOf(id: string): Room {
  return ROOMS[id] ?? ROOMS.sanctuary;
}

export function challengeDone(progress: Record<string, string>, id: string): boolean {
  return progress[challengeItemId(id)] === 'done';
}

export function canEnter(roomId: string, user: string | null, progress: Record<string, string>): boolean {
  const room = ROOMS[roomId];
  if (!room) return false;
  if (room.entry === 'auth' && !user) return false;
  return room.requires.every(id => challengeDone(progress, id));
}

export function openCells(room: Room, progress: Record<string, string>): Set<string> {
  const cells = new Set<string>();
  for (const spot of room.spots) {
    if (spot.kind === 'gate' && spot.gate && spot.requires?.every(id => challengeDone(progress, id))) {
      cells.add(`${spot.gate.x},${spot.gate.y}`);
    }
  }
  return cells;
}

export function sanctuaryPlace(): Place {
  const room = ROOMS.sanctuary;
  return { room: room.id, x: room.spawn.x, y: room.spawn.y };
}

export function homePlace(): Place {
  const room = ROOMS.grounds;
  return { room: room.id, x: room.spawn.x, y: room.spawn.y };
}

export function resolvePlace(saved: Place, user: string | null, progress: Record<string, string>): Place {
  let room = ROOMS[saved.room];
  const seen = new Set<string>();
  while (room && !canEnter(room.id, user, progress)) {
    if (seen.has(room.id)) return sanctuaryPlace();
    seen.add(room.id);
    room = ROOMS[room.back];
  }
  if (!room) return sanctuaryPlace();
  if (!fits(room.map, saved.x, saved.y, openCells(room, progress), blockersOf(room)) || saved.room !== room.id) {
    return { room: room.id, x: room.spawn.x, y: room.spawn.y };
  }
  return { room: room.id, x: saved.x, y: saved.y };
}

const POS_KEY = 'dungeon-pos';
const WELCOME_KEY = 'dungeon-welcome';
const DRAFT_KEY = 'dungeon-drafts';
const RESUME_KEY = 'dungeon-resume';
const MOTION_KEY = 'dungeon-motion';

export function loadPlace(): Place {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return homePlace();
    const parsed = JSON.parse(raw) as { room?: unknown; x?: unknown; y?: unknown };
    if (typeof parsed.room !== 'string' || typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return sanctuaryPlace();
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return sanctuaryPlace();
    return { room: parsed.room, x: parsed.x, y: parsed.y };
  } catch {
    return sanctuaryPlace();
  }
}

export function savePlace(place: Place) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(place));
  } catch {
    /* A blocked store forgets only the local checkpoint. Completion stays on the account. */
  }
}

export function welcomePending(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) !== '1';
  } catch {
    return true;
  }
}

export function markWelcome() {
  try {
    localStorage.setItem(WELCOME_KEY, '1');
  } catch {
    /* The welcome can show again next visit. */
  }
}

export interface Draft {
  answer: string;
  hints: number;
}

export function loadDrafts(): Record<string, Draft> {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') as Record<string, Draft>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDrafts(drafts: Record<string, Draft>) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch {
    /* The draft can be retyped. The flag is not stored here. */
  }
}

export function loadResume(): string {
  try {
    return localStorage.getItem(RESUME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveResume(id: string) {
  try {
    if (id) localStorage.setItem(RESUME_KEY, id);
    else localStorage.removeItem(RESUME_KEY);
  } catch {
    /* Returning from the Library can reopen the gate from the room list. */
  }
}

export function loadMotion(): 'system' | 'reduce' | 'full' {
  try {
    const value = localStorage.getItem(MOTION_KEY);
    return value === 'reduce' || value === 'full' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function saveMotion(value: 'system' | 'reduce' | 'full') {
  try {
    localStorage.setItem(MOTION_KEY, value);
  } catch {
    /* The system preference still applies. */
  }
}

export function reachableRooms(user: string | null, progress: Record<string, string>): string[] {
  return ROOM_LIST.filter(id => canEnter(id, user, progress));
}

export function stand(room: Room, x: number, y: number) {
  return nearestSpot(room.spots, x, y);
}

/** NPCs stand where their spots are, and the player walks around them. */
export function blockersOf(room: Room): Blocker[] {
  return room.spots.filter(spot => spot.kind === 'person').map(spot => ({ x: spot.x, y: spot.y }));
}

export function step(room: Room, x: number, y: number, dx: number, dy: number, progress: Record<string, string>) {
  return move(room.map, x, y, dx, dy, openCells(room, progress), blockersOf(room));
}

/** Solved Catacomb gates. The bridge board is a separate wing and does not count toward the treasure room. */
export const SOLVED_COUNT = (progress: Record<string, string>) =>
  CATACOMB_GATES.filter(id => challengeDone(progress, id)).length;

export interface Goal {
  /** One short instruction for the HUD. */
  text: string;
  /** The spot in the current room to mark, when the next step is in this room. */
  target?: string;
}

/** What to do next, from where the player is, whether they are logged in, and what they solved. */
export function nextGoal(roomId: string, user: string | null, progress: Record<string, string>): Goal {
  const catacombsDone = SOLVED_COUNT(progress) === CATACOMB_GATES.length;
  const bridgeDone = challengeDone(progress, 'wire');
  const gate = (id: string, spot: string, name: string): Goal => (challengeDone(progress, id)
    ? { text: `${name} is open. Go through.`, target: spot }
    : { text: `Solve the ${name}. Open it to read the evidence.`, target: spot });
  switch (roomId) {
    case 'grounds':
      if (!user) return { text: 'Follow the path north to the Sanctuary.', target: 'to-sanctuary' };
      if (!catacombsDone) return { text: 'Go to the Sanctuary. The Catacombs start there.', target: 'to-sanctuary' };
      if (!bridgeDone) return { text: 'Go to the Sanctuary, then east to the Key Exchange Bridge.', target: 'to-sanctuary' };
      return { text: 'Everything is open. Step into a building to play a lesson.', target: 'to-ciphers' };
    case 'sanctuary':
      if (!user) return { text: 'Talk to Shannon, then log in to enter the Catacombs.', target: 'shannon' };
      if (!catacombsDone) return { text: 'Take the south door into the Cipher Catacombs.', target: 'to-catacombs' };
      if (!bridgeDone) return { text: 'Take the east door to the Key Exchange Bridge.', target: 'to-bridge' };
      return { text: 'Every gate is open. The library buildings are outside.', target: 'to-grounds' };
    case 'hall':
      return { text: 'Head east to the Shift gate.', target: 'hall-forward' };
    case 'caesar':
      return gate('caesar', 'caesar-gate', 'Shift gate');
    case 'xor':
      return gate('xor', 'xor-gate', 'Byte gate');
    case 'final':
      return gate('vault', 'final-gate', 'Combined gate');
    case 'vault':
      return { text: 'Open the chest to review what you learned.', target: 'treasure' };
    case 'bridge':
      return bridgeDone
        ? { text: 'The bridge is open. Cross and talk to Bob.', target: 'bob-bridge-room' }
        : { text: 'Sort the values on the bridge gate: who holds each one?', target: 'bridge-gate' };
    default: {
      const room = ROOMS[roomId];
      const shelf = room?.spots.find(spot => spot.kind === 'shelf');
      return shelf
        ? { text: 'Browse the shelf to open a visualization.', target: shelf.id }
        : { text: room?.objective ?? 'Explore.' };
    }
  }
}
