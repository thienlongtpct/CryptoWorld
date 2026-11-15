import { SHELVES } from '../access.ts';
import { CATACOMB_GATES, challengeItemId } from '../dungeon/challenges.ts';
import { portrayalNotice } from '../characters/cast.ts';
import { L, locationOfRoom, type LocationId } from '../world/locations.ts';
import { fits, move, nearestSpot, type Blocker, type Decor, type Spot, type Tile } from '../world/map.ts';

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
  /** Flat artwork painted over the ground: a compass rose, drifting pages, travelling runes. */
  decor?: Decor[];
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
    '!': 'sign',
    // Landmarks and props for the named locations (see world/locations.ts).
    F: 'fountain',
    W: 'tower',
    V: 'beds',
    Q: 'stall',
    Z: 'cave',
    J: 'table',
    L: 'lantern',
    Y: 'signpost',
    R: 'shrine',
    S: 'seal',
    I: 'stained',
    X: 'flag',
    N: 'archway',
    D: 'anvil',
    M: 'marker',
    U: 'letters',
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
    wing: L.library,
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
        name: L.crossroads,
        x: doorAt.x,
        y: doorAt.y,
        kind: 'door',
        to: 'grounds',
        mark: 'EXIT',
        guest: 'This door returns to the Crossroads of Secrets.',
        signed: 'This door returns to the Crossroads of Secrets.',
      },
    ],
  };
}

export const ROOMS: Record<string, Room> = {
  grounds: {
    id: 'grounds',
    name: L.crossroads,
    wing: L.crossroads,
    entry: 'open',
    requires: [],
    back: 'grounds',
    spawn: { x: 18.5, y: 23.5 },
    map: grid([
      'oo^^o^^^^o^^^ooo^o^^^^^^^o^o^^^^o^^o^oo^',
      'o*****fR**f**************************rr^',
      '^**Rf*****fRf***AAAAAAAA*f****HHHHHH**^^',
      'oh*****S*****^**AAAAAAAA*o*u**HHHHHH*^*^',
      'o***********^*^*AAAAAAAA***f**HHHHHH**^o',
      '^o*KKKKKK*f*****AAAdAAAA******HHHdHH***^',
      '^**KKKKKK*f*f*fy========y******+++*D*f*^',
      'oh*KKKKKK****h**=======++******+*******o',
      '^**KKdKKK*****f****+****++++++++****h**^',
      'o****++++**********+**f**********f**~~*o',
      'o*******++++++++++++***u*^*********r~~*o',
      '^*urf***********L*+**fLf^**CCCCC*f**h~*^',
      '^*^***************+Y*f*****CCCCC**o****o',
      'o**^u*TTTTTTT*****++**L**o*CCCCC*******o',
      '^*f*fUTTTTTTT***L**++++****CCdCC***f*o!^',
      '^*****TTTTTTTU*****+**++++++++++++++++++',
      'o*o*f*TTTdTTT*U****+***************^*o*^',
      '^!r*f****+*+++++++++****************f**o',
      '++++++++++++******+***GGGGGG*f*r****h**o',
      'o*f***h**h*r**ffu*+*o*GGGGGG****o*f***f^',
      'o*****~~~~***fr^**+***GGGGGG***f*******^',
      '^f*oh~~~~~~h**^f**+***GGdGGG*f*^***f***o',
      'o**xh~~~~~~h*^*^f*++++**+*****^*^f**u**^',
      'oo****~~~~***u**u*+**++++******fr**h***^',
      'o**f*r*hh*****fff*+*******f**f******h**o',
      'oo^oo^^o^^o^o^^o^^o^oo^oo^^^o^o^^^oo^^^^',
    ]),
    objective: 'Signposts at the compass rose point to every region. Each building holds part of the Library, and every path ends at a door.',
    decor: [{ art: 'compass', x: 17, y: 10, w: 5, h: 5 }],
    spots: [
      person({
        id: 'trent-grounds',
        name: 'Trent',
        x: 20.5,
        y: 11.5,
        kind: 'person',
        characterId: 'trent',
        regionId: 'grounds',
        place: L.crossroads,
        guest: 'I am Trent. In protocol stories I am the trusted third party, the one both sides agree to rely on. Here I only vouch for directions: this is the Crossroads of Secrets. The winding path north ends at the Library of Arcane Ciphers, and every branch ends at a landmark. You can look around before you log in.',
        signed: 'I am Trent. The Library of Arcane Ciphers to the north leads to the Labyrinth of Hidden Flags and the Bridge of Shared Secrets. Ask me when a protocol needs a trusted party, and when it does not.',
      }),
      person({
        id: 'shamir-grounds',
        name: 'Adi Shamir',
        x: 12.5,
        y: 12.5,
        kind: 'person',
        characterId: 'shamir',
        regionId: 'grounds',
        place: L.crossroads,
        topic: 'ss',
        guest: `${notice.shamir} The Ruins of Shifting Letters beside this path holds the secret-sharing lesson from the 1979 paper How to Share a Secret: split a secret into shares so that any threshold of them rebuilds it, and fewer reveal nothing about it.`,
        signed: `${notice.shamir} Ask what a threshold means, or open the secret-sharing visualization.`,
      }),
      {
        id: 'to-sanctuary',
        name: L.library,
        x: 19.5,
        y: 5.5,
        kind: 'door',
        to: 'sanctuary',
        mark: 'LIBRARY',
        guest: 'The dirt path ends at the door of the Library of Arcane Ciphers.',
        signed: 'The dirt path ends at the door of the Library of Arcane Ciphers.',
      },
      {
        id: 'to-forest',
        name: L.fountain,
        x: 39.5,
        y: 15.5,
        kind: 'door',
        to: 'forest',
        mark: 'FOUNTAIN',
        auto: true,
        guest: 'The path east leaves the Crossroads for the Fountain of Hash.',
        signed: 'The path east leaves the Crossroads for the Fountain of Hash.',
      },
      {
        id: 'to-gardens',
        name: L.gardens,
        x: 0.5,
        y: 18.5,
        kind: 'door',
        to: 'gardens',
        mark: 'GARDENS',
        auto: true,
        guest: 'The path west leaves the Crossroads for the Gardens of Hidden Overlap.',
        signed: 'The path west leaves the Crossroads for the Gardens of Hidden Overlap.',
      },
      groundsDoor('to-keys', L.citadel, 5.5, 8.5, 'keys', 'CITADEL', 'Public keys and encrypted math. Twin keys hang over the gate: one public, one kept in the vault.'),
      groundsDoor('to-hashes', L.forge, 33.5, 5.5, 'hashes', 'FORGE', 'Block ciphers, modes, and hashes. The furnaces seal equal blocks with one shared key.'),
      groundsDoor('to-ciphers', L.ruins, 9.5, 16.5, 'ciphers', 'RUINS', 'Ciphers, shares, and proofs. Alphabet pillars and a Caesar wheel stand among the ruins.'),
      groundsDoor('to-compute', L.observatory, 29.5, 14.5, 'compute', 'OBSERVATORY', 'Computing without showing inputs. Separate telescopes draw one shared constellation.'),
      groundsDoor('to-sets', 'The Conservatory of Hidden Overlap', 24.5, 21.5, 'sets', 'GLASSHOUSE', 'Private lists and their overlap. A glasshouse of the Gardens of Hidden Overlap.'),
      {
        id: 'peaks-seal',
        name: L.peaks,
        x: 7.5,
        y: 4.5,
        kind: 'future',
        mark: 'PEAKS',
        lesson: 'ss',
        summary: 'Not open yet. The Peaks of Shattered Secrets will hold threshold puzzles. Three shrines each keep one share, and the seal wakes only when two of them give their light. The secret-sharing visualization is already in the Library.',
        guest: 'Three shrines each hold one shard of light. The seal between them wakes only when two shrines shine at once. One shard alone reveals nothing. The Peaks of Shattered Secrets are future content.',
        signed: 'Three shrines each hold one shard of light. The seal between them wakes only when two shrines shine at once. One shard alone reveals nothing. The Peaks of Shattered Secrets are future content.',
      },
    ],
  },
  ciphers: knowledge('ciphers', L.ruins, 'foundations', [
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
  hashes: knowledge('hashes', L.forge, 'symmetric', [
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
  keys: knowledge('keys', L.citadel, 'public', [
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
  compute: knowledge('compute', L.observatory, 'mpc', [
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
  sets: knowledge('sets', 'The Conservatory of Hidden Overlap', 'sets', [
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
    name: L.library,
    wing: L.library,
    entry: 'open',
    requires: [],
    back: 'grounds',
    spawn: { x: 9.5, y: 7.5 },
    map: grid([
      '###t#I##d##I#t####',
      '#sss----_----ssss#',
      '#sss----_-----sss#',
      '#-------_--------#',
      '#-P--k--_--k---P-#',
      '#-------_--------#',
      '#y------_-JJJ---y#',
      '#--h----_------h-#',
      '#k------_--------d',
      '#h--P---_----P--h#',
      '#-------N--------#',
      '##################',
    ]),
    objective: 'The lit table and the shelves hold every lesson. The south gate opens the Labyrinth of Hidden Flags. The east door leads to the Bridge of Shared Secrets.',
    decor: [{ art: 'pages', x: 1, y: 1, w: 16, h: 4 }],
    spots: [
      person({
        id: 'peggy-sanctuary',
        name: 'Peggy',
        x: 4.5,
        y: 3.5,
        kind: 'person',
        characterId: 'peggy',
        regionId: 'sanctuary',
        place: L.library,
        topic: 'zk',
        guest: 'I am Peggy, the prover. I can convince Victor that I know a secret without showing it to him. The zero-knowledge lesson plays rounds of that proof. The south door leads to the Labyrinth of Hidden Flags.',
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
        place: L.library,
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
        place: L.library,
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
        name: L.bridge,
        x: 16.5,
        y: 8.5,
        kind: 'door',
        to: 'bridge',
        mark: 'BRIDGE',
        guest: 'A bridge where Alice and Bob agree on a key while Eve listens. One board asks who holds each value. Log in to cross and to save the gate.',
        signed: 'The Bridge of Shared Secrets. Sort the values of one key exchange by who holds them to open the bridge gate.',
      },
      {
        id: 'to-catacombs',
        name: L.labyrinth,
        x: 8.5,
        y: 10.5,
        kind: 'door',
        to: 'hall',
        mark: 'LABYRINTH',
        guest: 'Stone corridors, three gates, and a treasure room. Caesar, Vigenère, and Al-Kindi are inside. Log in to enter and to save solved gates.',
        signed: 'The Labyrinth of Hidden Flags is open. Three gates stand between here and the treasure room.',
      },
    ],
  },
  bridge: {
    id: 'bridge',
    name: L.bridge,
    wing: L.bridge,
    entry: 'auth',
    requires: [],
    back: 'sanctuary',
    spawn: { x: 2.5, y: 5.5 },
    map: grid([
      '^o^^o^^~~~~~~^^o^^',
      '^*f***h~~~~~~h*f*^',
      'oWWW**~~~~~~~~WWWo',
      '^WWW*h~~~~~~~~WWW^',
      'oWWW**~~~~~~~~WWWo',
      'd=====:::g:::====d',
      '^*f***~~~~~~~~**r^',
      'o**h**~~~~~~~~h*f^',
      '^f**o*h~~~~~~h*u*o',
      '^**f**~~~~~~~~*f*^',
      '^o^^o^^~~~~~~^o^^^',
    ]),
    objective: 'Sort the values of the key exchange by who holds them. The answer opens the gate on the bridge.',
    decor: [{ art: 'runes', x: 1, y: 5, w: 16, h: 1 }],
    spots: [
      person({
        id: 'alice-bridge-room',
        name: 'Alice',
        x: 2.5,
        y: 7.5,
        kind: 'person',
        characterId: 'alice',
        regionId: 'bridge',
        place: L.bridge,
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
        place: L.bridge,
        topic: 'dh',
        guest: 'I am Eve. I hear every message on this bridge, and I do not change any of them. Hearing a message is not the same as knowing the secret behind it.',
        signed: 'I am Eve, a passive listener. Ask what the public values tell me and what they do not. I still do not edit them.',
      }),
      {
        id: 'bridge-back',
        name: L.library,
        x: 0.5,
        y: 5.5,
        kind: 'door',
        to: 'sanctuary',
        mark: 'LIBRARY',
        guest: 'Back to the Library of Arcane Ciphers.',
        signed: 'Back to the Library of Arcane Ciphers.',
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
        x: 15.5,
        y: 6.5,
        kind: 'person',
        characterId: 'bob',
        regionId: 'bridge',
        place: L.bridge,
        topic: 'dh',
        guest: 'I am Bob. Alice’s number reached me over the bridge. My exponent never left this bank.',
        signed: 'I am Bob. You crossed. I know my exponent, both public numbers, and the key Alice and I share. Eve heard the same two numbers and still does not have the key.',
      }),
      {
        id: 'bridge-citadel',
        name: L.citadel,
        x: 16.5,
        y: 5.5,
        kind: 'future',
        mark: 'SOON',
        lesson: 'rsa',
        summary: 'Not open yet. The Citadel of Twin Keys will hold RSA and elliptic-curve challenges. The RSA and elliptic-curve visualizations are already in the Library.',
        guest: 'The far door is sealed. The Citadel of Twin Keys is future content.',
        signed: 'The far door is sealed. The Citadel of Twin Keys is future content.',
      },
    ],
  },
  forest: {
    id: 'forest',
    name: L.fountain,
    wing: L.fountain,
    entry: 'open',
    requires: [],
    back: 'grounds',
    spawn: { x: 2.5, y: 14.5 },
    map: grid([
      'oo^^o^^^^o^^^ooo^o^^^^^^^o^o^^^^o^^o^oo^^o^o',
      'o^***f*^***^****o^**~~~h**u****#^h*^*****x*^',
      '^*h***^********^*f**~~~**^*^*^*#**u***ZZZZ*^',
      'o^******^^**r*****o**~~~****^**#*^****ZZZZ*o',
      'o^**^**^**********^^*~~~h*^^**^#*^***rr||rr^',
      '^^****^*****^^^**^*^*~~~h^**^**#**^**r****r^',
      '^**^****^**^^**f*^**^~~~*^**r**#*******=***^',
      'o^h**f^****^*********~~~*^f^*^*#*****===***^',
      '^*^***h*^f****ro**^^^~~~*******#***y*=*y***o',
      'o*****u****r*t**^u**~~~****f**f#*P=======P*^',
      'o**************f*^^*~~~*h******#*=========*o',
      '^^***++++++++*****^~~~**h*^****#*=========*^',
      '^****+******+*****~~~*hh*******#*===FFF===*o',
      'o*!**+******+****^~~~hh*+++++++g+===FFF===*o',
      '++++++*o*^**+***h~~~h***+******#*===FFF===*^',
      '^***********+++++:::+++++*^*^ou#*=========*^',
      'o******r*f^******~~~******^***^#*=========*^',
      '^****^****^^****h~~~*h**^^^^*^r#*P=======P*^',
      '^*^***x********u*~~~*h*^*^**^^^#***y***y***^',
      'o*********^*****^~~~**^**^*f***#*********^*^',
      'o**f******^o******~~~**^****^o^#f*****ffx**^',
      '^*****u*h***h*^***~~~*^^*u**^**#*****r*^***^',
      'o^**********h*****h~~~f^h******#**f*ro*****^',
      'o**^f***^f^*********~~~h*******#**********u^',
      'o****u^**f**^****^u*~~~**^*****#f********f*^',
      'o***f**^^*o*h****f**h~~~h*^**^*#***********^',
      '^******^^rf*****u**u*~~~***^^**#*f**o**u*r*^',
      '^^^o^^^o^oo^^^o^oo^oo^^^^^^^o^^^^o^^o^o^^ooo',
    ]),
    objective: 'Follow the trail east, across the stream, to the shrine gate. The Fountain of Hash glows behind it.',
    decor: [{ art: 'hash-stream', x: 32, y: 13, w: 10, h: 1 }],
    spots: [
      {
        id: 'forest-out',
        name: L.crossroads,
        x: 0.5,
        y: 14.5,
        kind: 'door',
        to: 'grounds',
        mark: 'CROSSROADS',
        auto: true,
        guest: 'The trail leads back west to the Crossroads of Secrets.',
        signed: 'The trail leads back west to the Crossroads of Secrets.',
      },
      person({
        id: 'faythe-forest',
        name: 'Faythe',
        x: 14.5,
        y: 10.5,
        kind: 'person',
        characterId: 'faythe',
        regionId: 'grove',
        place: L.fountain,
        topic: 'hash',
        guest: 'I am Faythe, a courier. I seal each parcel by adding up its letters, and I check the seal when it arrives. Oscar says my seal is weak. The old shrine gate ahead will test that claim.',
        signed: 'I am Faythe. Ask what a seal proves, or why a simple checksum is not a real hash.',
      }),
      person({
        id: 'oscar-forest',
        name: 'Oscar',
        x: 28.5,
        y: 11.5,
        kind: 'person',
        characterId: 'oscar',
        regionId: 'grove',
        place: L.fountain,
        topic: 'hash',
        guest: 'I am Oscar. Faythe adds letters up and calls it a seal. Find another word with the same seal as LEAF and the shrine gate opens. The Fountain behind it is a real hash: with SHA-256 you would not get that lucky.',
        signed: 'I am Oscar. Ask how a forger thinks, or why a real hash resists this trick.',
      }),
      {
        id: 'forest-gate',
        name: 'Shrine gate',
        x: 30.5,
        y: 13.5,
        kind: 'gate',
        challengeId: 'seal',
        requires: ['seal'],
        gate: { x: 31, y: 13 },
        mark: 'SEAL',
        guest: 'The shrine gate opens for anyone who shows that the courier seal is weak.',
        signed: 'Find a different word with the same seal as LEAF. The server checks your word.',
      },
      {
        id: 'forest-cave',
        name: L.cavern,
        x: 39.5,
        y: 6.5,
        kind: 'future',
        mark: 'SOON',
        lesson: 'zk',
        summary: 'Not open yet. The Cavern of Unspoken Proofs will hold Peggy and Victor’s proof puzzles. The zero-knowledge visualization is already in the Library.',
        guest: 'Iron bars seal the cave mouth. The Cavern of Unspoken Proofs is future content.',
        signed: 'Iron bars seal the cave mouth. The Cavern of Unspoken Proofs is future content.',
      },
    ],
  },
  gardens: {
    id: 'gardens',
    name: L.gardens,
    wing: L.gardens,
    entry: 'open',
    requires: [],
    back: 'grounds',
    spawn: { x: 37.5, y: 13.5 },
    map: grid([
      'oo^^o^^^^o^^^ooo^o^^^^^^^o^o^^^^o^^o^oo^',
      'o************f**************r***h******^',
      '^*oooooooooooooo********oooooooooooooo*^',
      'o*o*~~~h*******o*****hufo*~~~h*******o*^',
      'o*o*ff*fffffff*o*VVVVVV*o**ffff*ffff*o*o',
      '^*o***M********o*VVVVVV*o***M****f***o*^',
      '^*o**ffff*ffff*o*VVVVVV*o*fff*ffff*f*o*^',
      'ofo************o*VVVVVV*o********f***o*o',
      '^*o*fff*ffff*f*o**h*****off*ffff*fff*o*^',
      'oho*********M**o*******fo*********M**o*o',
      'o*o*f****+*****o********o*****+******o*o',
      '^*ooooooo+oooooo******f*oooooo+ooooooo*^',
      '^********+********************+*******!o',
      'o***++++++++++++++++++++++++++++++++++++',
      '^******************+*******************^',
      '^******f***********+**************f**f*o',
      'ooooooooooooooooooogooooooooooooooooooo^',
      '^****h****f********+**u***********h****o',
      '^***^***^***^***^r*+***f^***^*f*^r**^**o',
      'o***f*********u****+****u**************^',
      'o***r*********f*h**+*************QQQ***^',
      '^***^h**^*f*^***^**+****^***^**f*QQQ*f*o',
      'o*****************y+y***************rr*^',
      'o*****u*f**********++++++++++++++++**|*^',
      'o***********************************rr*o',
      'oo^oo^^o^^o^o^^o^^o^oo^oo^^^o^o^^^oo^^^^',
    ]),
    objective: 'Visit Carol’s and Dave’s gardens, then open the orchard gate.',
    spots: [
      {
        id: 'gardens-out',
        name: L.crossroads,
        x: 39.5,
        y: 13.5,
        kind: 'door',
        to: 'grounds',
        mark: 'CROSSROADS',
        auto: true,
        guest: 'The path leads back east to the Crossroads of Secrets.',
        signed: 'The path leads back east to the Crossroads of Secrets.',
      },
      person({
        id: 'carol-gardens',
        name: 'Carol',
        x: 8.5,
        y: 8.5,
        kind: 'person',
        characterId: 'carol',
        regionId: 'garden',
        place: L.gardens,
        topic: 'psi',
        guest: 'I am Carol. This is my garden. Dave keeps the one across the path. We want to know which plants we share without showing each other the rest.',
        signed: 'I am Carol. Ask what I learn when PSI finishes, and what stays hidden from me.',
      }),
      person({
        id: 'dave-gardens',
        name: 'Dave',
        x: 30.5,
        y: 8.5,
        kind: 'person',
        characterId: 'dave',
        regionId: 'garden',
        place: L.gardens,
        topic: 'psi',
        guest: 'I am Dave. My plants stay in my garden. When Carol and I run PSI, she learns only the ones we both grow.',
        signed: 'I am Dave. Ask what I put into PSI, or what Carol learns about my garden.',
      }),
      {
        id: 'gardens-gate',
        name: 'Orchard gate',
        x: 19.5,
        y: 15.5,
        kind: 'gate',
        challengeId: 'overlap',
        requires: ['overlap'],
        gate: { x: 19, y: 16 },
        mark: 'LOCK',
        guest: 'The orchard gate asks what Carol learns from PSI.',
        signed: 'Sort each plant by what Carol learns when PSI finishes. The server checks the board.',
      },
      {
        id: 'gardens-market',
        name: L.bazaar,
        x: 35.5,
        y: 23.5,
        kind: 'future',
        mark: 'SOON',
        lesson: 'ot',
        summary: 'Not open yet. The Bazaar of Veiled Choices will hold oblivious transfer puzzles. The oblivious transfer visualization is already in the Library.',
        guest: 'Iron bars close the way east. The Bazaar of Veiled Choices is future content.',
        signed: 'Iron bars close the way east. The Bazaar of Veiled Choices is future content.',
      },
    ],
  },
  hall: {
    id: 'hall',
    name: 'The Hall of Banners',
    wing: L.labyrinth,
    entry: 'auth',
    requires: [],
    back: 'sanctuary',
    spawn: { x: 5.5, y: 5.5 },
    map: grid([
      '####t##X##X##t##',
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
        place: L.labyrinth,
        topic: 'vigenere',
        guest: `${notice.vigenere} A keyword can pick a different shift for each letter. The repeating-keyword tableau is a later name for work in the 1586 treatise. The gates ahead use a single stated shift, not a hidden keyword.`,
        signed: `${notice.vigenere} Ask about what a keyword changes. The polyalphabetic visualization is in the Library. These gates do not ask you to guess a keyword.`,
      }),
      {
        id: 'hall-back',
        name: L.library,
        x: 1.5,
        y: 7.5,
        kind: 'door',
        to: 'sanctuary',
        mark: 'LIBRARY',
        guest: 'This door returns to the Library of Arcane Ciphers.',
        signed: 'This door returns to the Library of Arcane Ciphers.',
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
    wing: L.labyrinth,
    entry: 'auth',
    requires: [],
    back: 'hall',
    spawn: { x: 4.5, y: 5.5 },
    map: grid([
      '###t##X##X##t#',
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
        place: L.labyrinth,
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
        place: L.labyrinth,
        topic: 'freqan',
        guest: `${notice.kindi} Counting letters can expose a simple substitution when the language is known. This gate already states its shift, so counting is a tool here, not a required guess.`,
        signed: `${notice.kindi} The frequency tool counts the letters you type. The frequency visualization is in the Library.`,
      }),
      {
        id: 'caesar-back',
        name: 'The Hall of Banners',
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
    wing: L.labyrinth,
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
        place: L.labyrinth,
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
    wing: L.labyrinth,
    entry: 'auth',
    requires: ['caesar', 'xor'],
    back: 'xor',
    spawn: { x: 4.5, y: 5.5 },
    map: grid([
      '##t#X#vv#X#t##',
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
        place: L.labyrinth,
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
    wing: L.labyrinth,
    entry: 'auth',
    requires: ['caesar', 'xor', 'vault'],
    back: 'final',
    spawn: { x: 7.5, y: 5.5 },
    map: grid([
      '###t#XX#t###',
      '#y.......y.#',
      '#..c..c..c.#',
      '#....___...#',
      '#.P..t_t.P.#',
      '#....___...#',
      '#....d.....#',
      '#y........y#',
      '############',
    ]),
    objective: 'The gates are open. Read the treasure, or return to the Library of Arcane Ciphers.',
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
        name: L.library,
        x: 5.5,
        y: 6.5,
        kind: 'door',
        to: 'sanctuary',
        mark: 'EXIT',
        guest: 'Return to the Library of Arcane Ciphers.',
        signed: 'Return to the Library of Arcane Ciphers.',
      },
    ],
  },
};

/** Every room's wing is the display name of its location, so the HUD, the map, and Bit agree. */
for (const [id, room] of Object.entries(ROOMS)) room.wing = locationOfRoom(id).name;

/** The location a room belongs to, with its name, subtitle, palette, and artwork. */
export function locationOf(roomId: string) {
  return locationOfRoom(roomId);
}

export type { LocationId };

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

export const ROOM_LIST = ['grounds', 'ciphers', 'hashes', 'keys', 'compute', 'sets', 'sanctuary', 'bridge', 'forest', 'gardens', 'hall', 'caesar', 'xor', 'final', 'vault'] as const;

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

const DISCOVERED_KEY = 'dungeon-discovered';

/** Marks a location as found. True the first time, so the banner can say it is new. */
export function markDiscovered(id: string): boolean {
  try {
    const seen = JSON.parse(localStorage.getItem(DISCOVERED_KEY) || '[]') as unknown;
    const list = Array.isArray(seen) ? seen.filter((item): item is string => typeof item === 'string') : [];
    if (list.includes(id)) return false;
    localStorage.setItem(DISCOVERED_KEY, JSON.stringify([...list, id]));
    return true;
  } catch {
    return false;
  }
}

const BIT_KEY = 'dungeon-bit';

/** Bit's tutorials the player has already seen or skipped, and the instant-text setting. */
export interface BitPrefs {
  seen: string[];
  instant: boolean;
}

export function loadBit(): BitPrefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(BIT_KEY) || '{}') as Partial<BitPrefs>;
    const seen = Array.isArray(parsed.seen) ? parsed.seen.filter((id): id is string => typeof id === 'string') : [];
    return { seen, instant: parsed.instant === true };
  } catch {
    return { seen: [], instant: false };
  }
}

export function saveBit(prefs: BitPrefs) {
  try {
    localStorage.setItem(BIT_KEY, JSON.stringify({ seen: [...new Set(prefs.seen)], instant: prefs.instant }));
  } catch {
    /* Bit may introduce a place again next visit. */
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

/** Solved Labyrinth gates. The bridge board is a separate wing and does not count toward the treasure room. */
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
      if (!user) return { text: 'Follow the path north to the Library of Arcane Ciphers.', target: 'to-sanctuary' };
      if (!catacombsDone) return { text: 'Go to the Library. The Labyrinth of Hidden Flags starts there.', target: 'to-sanctuary' };
      if (!bridgeDone) return { text: 'Go to the Library, then east to the Bridge of Shared Secrets.', target: 'to-sanctuary' };
      if (!challengeDone(progress, 'seal')) return { text: 'Take the east path into the Fountain of Hash.', target: 'to-forest' };
      if (!challengeDone(progress, 'overlap')) return { text: 'Take the west path to the Gardens of Hidden Overlap.', target: 'to-gardens' };
      return { text: 'Every gate is open. Step into a landmark to play a lesson.', target: 'to-ciphers' };
    case 'sanctuary':
      if (!user) return { text: 'Talk to Shannon, then log in to enter the Labyrinth.', target: 'shannon' };
      if (!catacombsDone) return { text: 'Take the south door into the Labyrinth of Hidden Flags.', target: 'to-catacombs' };
      if (!bridgeDone) return { text: 'Take the east door to the Bridge of Shared Secrets.', target: 'to-bridge' };
      return { text: 'Every gate is open. More lessons wait in the landmarks outside.', target: 'to-grounds' };
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
    case 'forest':
      return challengeDone(progress, 'seal')
        ? { text: 'The shrine is open. Visit the Fountain, or head back to the Crossroads.', target: 'forest-cave' }
        : { text: 'Prove the courier seal is weak at the shrine gate.', target: 'forest-gate' };
    case 'gardens':
      return challengeDone(progress, 'overlap')
        ? { text: 'The orchard is open. Walk through, or head back to the Crossroads.', target: 'gardens-market' }
        : { text: 'Sort what Carol learns from PSI at the orchard gate.', target: 'gardens-gate' };
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
