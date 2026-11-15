/**
 * The world's places: one entry per location, with its display name, short label, topic subtitle,
 * description, accent palette, and the artwork that draws its landmark.
 *
 * Location ids, room ids, and cast region ids are stable. Saved positions, routes, progress, and
 * quest references use those ids, so a rename only changes the text here.
 *
 * The server imports this file through `characters/cast.ts`. Keep it free of browser or React imports.
 */

export type LocationId =
  | 'crossroads' | 'library' | 'ruins' | 'fountain' | 'bridge' | 'citadel' | 'forge'
  | 'peaks' | 'bazaar' | 'gardens' | 'cavern' | 'observatory' | 'labyrinth';

/** Which landmark drawing in `world/draw.ts` belongs to the location. */
export type LandmarkArt =
  | 'compass-plaza' | 'arcane-library' | 'letter-ruins' | 'hash-fountain' | 'twin-towers'
  | 'key-citadel' | 'sealed-forge' | 'share-shrines' | 'veiled-stall' | 'overlap-beds'
  | 'proof-cavern' | 'star-observatory' | 'flag-gate';

export interface Accent {
  /** Main surface colour for the landmark and its card swatch. */
  base: string;
  dark: string;
  light: string;
  /** Emissive colour for glows, runes, and lights. */
  glow: string;
}

export interface Location {
  id: LocationId;
  /** Display name, with its article: “The Fountain of Hash”. */
  name: string;
  /** Short label for navigation chips and canvas markers. */
  short: string;
  /** The topics under the fantasy name. */
  subtitle: string;
  /** One or two sentences for cards, the map, and Gemini context. */
  description: string;
  /** Bit's introduction, tying the landmark to its lesson. */
  intro: string;
  accent: Accent;
  art: LandmarkArt;
  /** Rooms that belong to this location. */
  rooms: string[];
  /** Cast regions that belong to this location. */
  regions: string[];
  /** False while the location has no playable room yet. */
  open: boolean;
}

export const LOCATIONS: Location[] = [
  {
    id: 'crossroads',
    name: 'The Crossroads of Secrets',
    short: 'Crossroads',
    subtitle: 'Start here · Paths to every region',
    description: 'A round stone plaza with a glowing compass rose. Signposts point toward every learning region, and each path ends at a door.',
    intro: 'The Crossroads of Secrets! Every path from this compass rose ends at a door. Pick one and a lesson waits inside.',
    accent: { base: '#8d7b68', dark: '#5d4f42', light: '#cbb89a', glow: '#f6d46b' },
    art: 'compass-plaza',
    rooms: ['grounds'],
    regions: ['plaza', 'grounds'],
    open: true,
  },
  {
    id: 'library',
    name: 'The Library of Arcane Ciphers',
    short: 'Library',
    subtitle: 'Visualizations · Dictionary · Research Desk',
    description: 'An old sanctuary of tall shelves, floating manuscripts, and stained-glass keys. Its lit table opens every visualization.',
    intro: 'The Library of Arcane Ciphers keeps every lesson on its shelves. The glowing table plays them step by step.',
    accent: { base: '#4f6086', dark: '#36425e', light: '#7488b2', glow: '#ffcf6b' },
    art: 'arcane-library',
    rooms: ['sanctuary'],
    regions: ['library', 'sanctuary'],
    open: true,
  },
  {
    id: 'ruins',
    name: 'The Ruins of Shifting Letters',
    short: 'Ruins',
    subtitle: 'Caesar · Vigenère · Frequency analysis',
    description: 'Broken alphabet pillars, a turning Caesar wheel, and a Vigenère mosaic. Inside are the classical cipher, sharing, and proof lessons.',
    intro: 'The Ruins of Shifting Letters! Turn the wheel three places and A becomes D. Count the letters and the shift gives itself away.',
    accent: { base: '#b4552f', dark: '#863b1e', light: '#d97a4b', glow: '#f6b26b' },
    art: 'letter-ruins',
    rooms: ['ciphers'],
    regions: ['ruins'],
    open: false,
  },
  {
    id: 'fountain',
    name: 'The Fountain of Hash',
    short: 'Fountain',
    subtitle: 'Hash Functions · Avalanche Effect · Collisions',
    description: 'A forest clearing around a bright fountain. Runes of any length flow in, and the same number of glowing symbols always flows out. Nothing flows back.',
    intro: 'The Fountain of Hash turns messages into glowing fingerprints. Change one letter and watch the pattern!',
    accent: { base: '#2a7f8f', dark: '#1b4f5a', light: '#5fd3e0', glow: '#7ff3ff' },
    art: 'hash-fountain',
    rooms: ['forest'],
    regions: ['grove'],
    open: true,
  },
  {
    id: 'bridge',
    name: 'The Bridge of Shared Secrets',
    short: 'Bridge',
    subtitle: 'Diffie–Hellman · Public values · Eavesdroppers',
    description: 'A bridge between two towers. Each tower keeps its own secret exponent, only public runes cross the water, and matching lights wake at both ends.',
    intro: 'The Bridge of Shared Secrets! Only public runes cross it, yet both towers end up glowing the same color. Eve sees every rune.',
    accent: { base: '#4f8ccf', dark: '#2f5e8f', light: '#8fc1f0', glow: '#f6d46b' },
    art: 'twin-towers',
    rooms: ['bridge'],
    regions: ['bridge'],
    open: true,
  },
  {
    id: 'citadel',
    name: 'The Citadel of Twin Keys',
    short: 'Citadel',
    subtitle: 'RSA · Elliptic curves · Public and private keys',
    description: 'A fortress of paired keys and prime engravings. The public key hangs over the gate; the private key stays in the inner vault.',
    intro: 'The Citadel of Twin Keys hangs one key over its gate for anyone. Its twin never leaves the inner vault.',
    accent: { base: '#5b6573', dark: '#3a414b', light: '#8a95a5', glow: '#e0b84a' },
    art: 'key-citadel',
    rooms: ['keys'],
    regions: ['citadel'],
    open: false,
  },
  {
    id: 'forge',
    name: 'The Forge of Sealed Flames',
    short: 'Forge',
    subtitle: 'Block ciphers · AES · Modes · Hashes',
    description: 'A workshop of glowing furnaces and rune anvils. Messages are cut into equal ingots, and the same key-shaped tool seals and opens them.',
    intro: 'The Forge of Sealed Flames cuts messages into equal blocks. One key seals them, and the same key opens them.',
    accent: { base: '#4a3a36', dark: '#2a1f1c', light: '#6b5550', glow: '#ff9a3c' },
    art: 'sealed-forge',
    rooms: ['hashes'],
    regions: ['forge'],
    open: false,
  },
  {
    id: 'peaks',
    name: 'The Peaks of Shattered Secrets',
    short: 'Peaks',
    subtitle: 'Secret sharing · Thresholds · Reconstruction',
    description: 'Mountain shrines that each hold one share. The central seal wakes only when two of the three shrines give their light; one share alone shows nothing.',
    intro: 'The Peaks of Shattered Secrets guard a shared mystery. Can enough keepers bring their shares together?',
    accent: { base: '#6c6f9a', dark: '#44466b', light: '#a9abd6', glow: '#c7b6ff' },
    art: 'share-shrines',
    rooms: [],
    regions: ['peaks'],
    open: false,
  },
  {
    id: 'bazaar',
    name: 'The Bazaar of Veiled Choices',
    short: 'Bazaar',
    subtitle: 'Oblivious transfer · Private selection',
    description: 'A moonlit market of curtained stalls. The buyer takes one sealed package; the merchant never learns which.',
    intro: 'The Bazaar of Veiled Choices: pick one sealed package behind the curtain. The merchant never sees which one you took.',
    accent: { base: '#6b3f7a', dark: '#40234a', light: '#a46bb5', glow: '#ffd27a' },
    art: 'veiled-stall',
    rooms: [],
    regions: ['market'],
    open: false,
  },
  {
    id: 'gardens',
    name: 'The Gardens of Hidden Overlap',
    short: 'Gardens',
    subtitle: 'Private set intersection · Union',
    description: 'Two enchanted gardens with veiled plant markers. Their beds overlap in the middle, and only the shared plants bloom there.',
    intro: 'The Gardens of Hidden Overlap! Two gardeners compare plants, and only the ones they share bloom in the middle bed.',
    accent: { base: '#4f9a5a', dark: '#2f6b3a', light: '#8fd49a', glow: '#d7c4ff' },
    art: 'overlap-beds',
    rooms: ['gardens', 'sets'],
    regions: ['garden'],
    open: true,
  },
  {
    id: 'cavern',
    name: 'The Cavern of Unspoken Proofs',
    short: 'Cavern',
    subtitle: 'Zero-knowledge proofs · Challenges · Soundness',
    description: 'A branching crystal cave behind a rune door. Proof symbols light when a challenge is answered, without the secret being spoken.',
    intro: 'The Cavern of Unspoken Proofs: Peggy proves she knows the way through without ever saying it.',
    accent: { base: '#3d4f7a', dark: '#25304d', light: '#7fa0e0', glow: '#9be7ff' },
    art: 'proof-cavern',
    rooms: [],
    regions: ['cavern'],
    open: false,
  },
  {
    id: 'observatory',
    name: 'The Observatory of Many Minds',
    short: 'Observatory',
    subtitle: 'Multi-party computation · Garbled circuits · OT',
    description: 'Telescope towers that each aim their own beam. The beams meet in one constellation, and no tower sees another tower’s star chart.',
    intro: 'The Observatory of Many Minds! Each telescope keeps its own star chart, but together they draw one shared constellation.',
    accent: { base: '#2f3b6b', dark: '#1c2447', light: '#5c6fb8', glow: '#bfa8ff' },
    art: 'star-observatory',
    rooms: ['compute'],
    regions: ['observatory'],
    open: false,
  },
  {
    id: 'labyrinth',
    name: 'The Labyrinth of Hidden Flags',
    short: 'Labyrinth',
    subtitle: 'CTF gates · Shift · XOR · Combined ciphers',
    description: 'A dungeon gate of flag-shaped runes. Three puzzle locks stand between the hall of banners and the treasure room.',
    intro: 'The Labyrinth of Hidden Flags! Each lock states its method. Undo it, and the hidden word is your flag.',
    accent: { base: '#2f434c', dark: '#1e2d33', light: '#45606b', glow: '#e05a4f' },
    art: 'flag-gate',
    rooms: ['hall', 'caesar', 'xor', 'final', 'vault'],
    regions: ['catacombs'],
    open: true,
  },
];

export const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map(item => [item.id, item])) as Record<LocationId, Location>;

const BY_ROOM = new Map(LOCATIONS.flatMap(item => item.rooms.map(room => [room, item] as const)));
const BY_REGION = new Map(LOCATIONS.flatMap(item => item.regions.map(region => [region, item] as const)));

/** The location a room belongs to. Unknown rooms fall back to the Crossroads. */
export function locationOfRoom(roomId: string): Location {
  return BY_ROOM.get(roomId) ?? LOCATION_BY_ID.crossroads;
}

/** The location a cast region belongs to, if any. */
export function locationOfRegion(regionId: string): Location | undefined {
  return BY_REGION.get(regionId);
}

/** Shorthand for a location's display name. */
export const placeName = (id: LocationId) => LOCATION_BY_ID[id].name;

/** Display names by location id, for data files: `L.fountain` is “The Fountain of Hash”. */
export const L = Object.fromEntries(LOCATIONS.map(item => [item.id, item.name])) as Record<LocationId, string>;

/** A display name inside a sentence: “Enter the Fountain of Hash”. Other names pass through. */
export const inSentence = (name: string) => name.replace(/^The /, 'the ');
