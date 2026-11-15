/**
 * One character art style for everyone: the player, the protocol cast, and the portrayals.
 * Each sprite is built from the same 16 × 22 pixel template, with a look (hair, outfit, props)
 * per character, then shaded and outlined the same way as the Pixel Crawler tiles.
 * The world and the dialogue portraits draw from these same sprites.
 */

export type Facing = 'down' | 'up' | 'left' | 'right';
type HairStyle = 'short' | 'long' | 'bun' | 'bald' | 'hood' | 'wizard' | 'cap' | 'laurel' | 'turban' | 'spiky';
type Outfit = 'tunic' | 'robe' | 'dress' | 'toga' | 'coat';
type Prop = 'glasses' | 'beard' | 'cape' | 'staff' | 'book' | 'key' | 'sword' | 'scroll' | 'bow';

export interface Look {
  skin: string;
  hair: string;
  style: HairStyle;
  outfit: Outfit;
  body: string;
  /** Pants, skirt, or the inside of a coat. */
  lower: string;
  shoes: string;
  /** Hood, hat, laurel, turban, or cape colour. */
  accent?: string;
  props?: Prop[];
}

const SKIN = ['#f1c9a5', '#e5b48f', '#c98f63', '#9a6440', '#7a4a2c'];
const OUTLINE = '#1b1410';

export const LOOKS: Record<string, Look> = {
  player: { skin: SKIN[1], hair: '#6d4c41', style: 'short', outfit: 'tunic', body: '#2f6fb7', lower: '#37474f', shoes: '#4e342e', accent: '#c62828', props: ['cape', 'sword'] },
  alice: { skin: SKIN[0], hair: '#c2185b', style: 'long', outfit: 'dress', body: '#f48fb1', lower: '#ad1457', shoes: '#5d2a3a' },
  bob: { skin: SKIN[2], hair: '#283593', style: 'short', outfit: 'tunic', body: '#64b5f6', lower: '#1565c0', shoes: '#3e2723' },
  eve: { skin: SKIN[1], hair: '#6d4c41', style: 'hood', outfit: 'tunic', body: '#78909c', lower: '#455a64', shoes: '#263238', accent: '#546e7a', props: ['bow'] },
  mallory: { skin: SKIN[0], hair: '#b71c1c', style: 'spiky', outfit: 'coat', body: '#4a148c', lower: '#e1bee7', shoes: '#212121', accent: '#212121', props: ['cape'] },
  trent: { skin: SKIN[1], hair: '#cfd8dc', style: 'wizard', outfit: 'robe', body: '#f3e5ab', lower: '#3e2723', shoes: '#3e2723', accent: '#6a4c93', props: ['beard', 'staff'] },
  peggy: { skin: SKIN[3], hair: '#4a148c', style: 'bun', outfit: 'dress', body: '#ce93d8', lower: '#6a1b9a', shoes: '#311b4f', props: ['key'] },
  victor: { skin: SKIN[2], hair: '#1a237e', style: 'short', outfit: 'coat', body: '#3949ab', lower: '#c5cae9', shoes: '#1a1a2e', props: ['glasses', 'scroll'] },
  shannon: { skin: SKIN[0], hair: '#eceff1', style: 'short', outfit: 'coat', body: '#8d6e63', lower: '#d7ccc8', shoes: '#3e2723', props: ['glasses', 'book'] },
  caesar: { skin: SKIN[1], hair: '#5d4037', style: 'laurel', outfit: 'toga', body: '#f5f0e6', lower: '#f5f0e6', shoes: '#6d4c41', accent: '#c62828', props: ['scroll'] },
  vigenere: { skin: SKIN[0], hair: '#5d4037', style: 'cap', outfit: 'coat', body: '#5e35b1', lower: '#d1c4e9', shoes: '#311b92', accent: '#311b92', props: ['beard', 'book'] },
  kindi: { skin: SKIN[2], hair: '#212121', style: 'turban', outfit: 'robe', body: '#2e7d32', lower: '#1b5e20', shoes: '#3e2723', accent: '#f5f0e6', props: ['beard', 'book'] },
  rivest: { skin: SKIN[0], hair: '#37474f', style: 'short', outfit: 'coat', body: '#1565c0', lower: '#bbdefb', shoes: '#212121', props: ['glasses'] },
  shamir: { skin: SKIN[1], hair: '#263238', style: 'bald', outfit: 'coat', body: '#ef6c00', lower: '#ffe082', shoes: '#3e2723', props: ['glasses', 'beard'] },
  adleman: { skin: SKIN[0], hair: '#4e342e', style: 'short', outfit: 'coat', body: '#558b2f', lower: '#dcedc8', shoes: '#33691e' },
  daemen: { skin: SKIN[0], hair: '#546e7a', style: 'short', outfit: 'coat', body: '#0277bd', lower: '#b3e5fc', shoes: '#01579b', props: ['glasses', 'book'] },
  rijmen: { skin: SKIN[0], hair: '#37474f', style: 'short', outfit: 'coat', body: '#d84315', lower: '#ffccbc', shoes: '#3e2723' },
  rabin: { skin: SKIN[1], hair: '#9e9e9e', style: 'bald', outfit: 'coat', body: '#00695c', lower: '#e0f2f1', shoes: '#004d40', props: ['glasses'] },
  yao: { skin: SKIN[1], hair: '#263238', style: 'short', outfit: 'coat', body: '#6a1b9a', lower: '#d1c4e9', shoes: '#4a148c', props: ['glasses'] },
};

const W = 16;
const H = 22;

// The template, facing the viewer. H hair · S skin · E eye · N mouth · C body · B belt · P lower · F shoes.
const BASE = [
  '................',
  '................',
  '......HHHH......',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '...HSSSSSSSSH...',
  '...SSESSSSESS...',
  '...SSSSSSSSSS...',
  '....SSSSSSSS....',
  '.....SSNNSS.....',
  '......SSSS......',
  '....CCCCCCCC....',
  '...CCCCCCCCCC...',
  '..CCCCCCCCCCCC..',
  '..CC.CCCCCC.CC..',
  '..SS.CCCCCC.SS..',
  '....BBBBBBBB....',
  '....PPPPPPPP....',
  '....PPP..PPP....',
  '....PPP..PPP....',
  '....FFF..FFF....',
  '................',
];

type Grid = (string | null)[][];

function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function put(grid: Grid, x: number, y: number, colour: string | null) {
  if (y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = colour;
}

function rows(grid: Grid, art: string[], top: number, colours: Record<string, string | null>) {
  art.forEach((line, j) => [...line].forEach((ch, i) => {
    if (ch in colours) put(grid, i, top + j, colours[ch]);
  }));
}

/** Compose one frame: facing, and 0 = standing, 1 and 2 = the two walking steps. */
function compose(look: Look, facing: Facing, frame: number): Grid {
  const props = new Set(look.props ?? []);
  const back = facing === 'up';
  const side = facing === 'left' || facing === 'right';
  const accent = look.accent ?? look.body;
  const grid: Grid = Array.from({ length: H }, () => Array<string | null>(W).fill(null));

  // Cape behind the body.
  if (props.has('cape')) {
    for (let y = 11; y <= 19; y++) {
      put(grid, 2, y, accent);
      put(grid, 13, y, accent);
      if (y >= 16) { put(grid, 3, y, accent); put(grid, 12, y, accent); }
    }
  }
  // Staff or bow held on the right, behind the hand.
  if (props.has('staff')) {
    for (let y = 4; y <= 20; y++) put(grid, 14, y, '#6d4c41');
    put(grid, 14, 2, '#80deea'); put(grid, 13, 3, '#80deea'); put(grid, 15, 3, '#80deea'); put(grid, 14, 3, '#e0f7fa'); put(grid, 14, 4, '#4dd0e1');
  }
  if (props.has('bow') && !back) {
    for (let y = 9; y <= 18; y++) put(grid, y < 11 || y > 16 ? 13 : 14, y, '#8d6e63');
    for (let y = 10; y <= 17; y++) put(grid, 12, y, '#e0e0e0');
  }

  const lower = look.outfit === 'toga' || look.outfit === 'robe' ? look.body : look.lower;
  const belt = look.outfit === 'toga' ? accent : shade(look.body, -0.35);
  BASE.forEach((line, y) => [...line].forEach((ch, x) => {
    const colour = ch === 'H' ? look.hair
      : ch === 'S' ? look.skin
        : ch === 'E' ? '#1b1410'
          : ch === 'N' ? shade(look.skin, -0.18)
            : ch === 'C' ? look.body
              : ch === 'B' ? belt
                : ch === 'P' ? lower
                  : ch === 'F' ? look.shoes
                    : null;
    if (colour) grid[y][x] = colour;
  }));

  // Outfits change the lower body.
  if (look.outfit === 'robe' || look.outfit === 'toga') {
    rows(grid, ['....CCCCCCCC....', '...CCCCCCCCCC...', '...CCCCCCCCCC...', '...CCCCCCCCCC...', '....FFF..FFF....'], 16, { C: look.body, F: look.shoes });
    if (look.outfit === 'toga') {
      // A sash across the chest.
      [[10, 11], [9, 12], [8, 13], [7, 14], [6, 15], [5, 16]].forEach(([x, y]) => put(grid, x, y, accent));
    } else {
      for (let y = 11; y <= 19; y++) put(grid, 7, y, shade(look.body, -0.2));
    }
  }
  if (look.outfit === 'dress') {
    rows(grid, ['....PPPPPPPP....', '...PPPPPPPPPP...', '..PPPPPPPPPPPP..', '..PPPPPPPPPPPP..', '.....FF..FF.....'], 16, { P: look.lower, F: look.shoes });
  }
  if (look.outfit === 'coat') {
    // An open coat: the lower colour shows down the middle.
    for (let y = 11; y <= 16; y++) { put(grid, 7, y, look.lower); put(grid, 8, y, look.lower); }
    put(grid, 6, 11, look.lower); put(grid, 9, 11, look.lower);
    rows(grid, ['....CC....CC....'], 16, { C: look.body });
  }

  // Hair styles over the head.
  const hair = look.hair;
  const skin = look.skin;
  switch (look.style) {
    case 'long':
      for (let y = 5; y <= 12; y++) { put(grid, 3, y, hair); put(grid, 12, y, hair); }
      put(grid, 2, 8, hair); put(grid, 13, 8, hair); put(grid, 2, 9, hair); put(grid, 13, 9, hair);
      break;
    case 'bun':
      rows(grid, ['......HHHH......', '.....HHHHHH.....'], 0, { H: hair });
      break;
    case 'bald':
      rows(grid, ['......SSSS......', '....SSSSSSSS....', '...SSSSSSSSSS...'], 2, { S: skin });
      put(grid, 3, 5, hair); put(grid, 12, 5, hair); put(grid, 3, 6, hair); put(grid, 12, 6, hair);
      break;
    case 'spiky':
      rows(grid, ['....H.HH.H......', '.....HHHHHH.H...'], 1, { H: hair });
      break;
    case 'hood':
      rows(grid, [
        '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...', '..AAAAAAAAAAAA..', '..AAhSSSSSShAA..',
        '..AASSESSSSESAA.', '..AASSSSSSSSAA..', '..AAASSSSSSAAA..', '...AAASNNSAAA...', '....AAASSAAA....',
      ], 1, { A: accent, h: shade(accent, -0.35), S: skin, E: '#1b1410', N: shade(skin, -0.18) });
      break;
    case 'wizard':
      rows(grid, ['........AA......', '.......AAA......', '......AAAAA.....', '.....AAAAAAA....', '..AAAAAAAAAAAA..'], 0, { A: accent });
      put(grid, 8, 3, '#f6d46b');
      break;
    case 'cap':
      rows(grid, ['.....AAAAAA.....', '...AAAAAAAAAA...', '..AAAAAAAAAAAA..'], 2, { A: accent });
      put(grid, 11, 2, '#f6d46b');
      break;
    case 'laurel':
      rows(grid, ['...L.L.LL.L.L...', '...LLLLLLLLLL...'], 3, { L: '#4caf50' });
      put(grid, 3, 5, '#2e7d32'); put(grid, 12, 5, '#2e7d32');
      break;
    case 'turban':
      rows(grid, ['.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...', '...AAAAAAAAAA...', '...AASSSSSSAA...'], 1, { A: accent, S: skin });
      put(grid, 7, 2, '#c62828'); put(grid, 8, 2, '#c62828');
      for (let x = 4; x <= 11; x += 2) put(grid, x, 4, shade(accent, -0.15));
      break;
    default:
      break;
  }

  // Face props.
  if (!back) {
    if (props.has('glasses')) {
      for (const x of [4, 6, 9, 11]) put(grid, x, 6, '#263238');
      put(grid, 7, 6, '#263238'); put(grid, 8, 6, '#263238');
      put(grid, 5, 6, '#cfd8dc'); put(grid, 10, 6, '#cfd8dc');
      put(grid, 5, 7, '#1b1410'); put(grid, 10, 7, '#1b1410');
    }
    if (props.has('beard')) {
      const beard = look.style === 'wizard' ? '#eceff1' : hair;
      rows(grid, ['....B......B....', '....BBBNNBBB....', '.....BBBBBB.....', '......BBBB......', '.......BB.......'], 8, { B: beard, N: shade(skin, -0.18) });
    }
  }

  // Held items, in front of the body.
  if (!back) {
    if (props.has('book')) rows(grid, ['.....bbbbbb.....', '.....bwwbwb.....', '.....bbbbbb.....'], 13, { b: '#3949ab', w: '#fdf6e3' });
    if (props.has('scroll')) rows(grid, ['.....rffffr.....', '.....rffffr.....'], 14, { r: '#a1887f', f: '#fdf6e3' });
    if (props.has('key')) rows(grid, ['............kk..', '............kk..', '.............k..', '............kk..'], 13, { k: '#d4a017' });
    if (props.has('sword')) {
      for (let y = 8; y <= 14; y++) put(grid, 14, y, '#cfd8dc');
      put(grid, 13, 15, '#8d6e63'); put(grid, 14, 15, '#8d6e63'); put(grid, 15, 15, '#8d6e63'); put(grid, 14, 16, '#5d4037');
    }
  }

  // Back view: the back of the head and, with a cape, the cape over the body.
  if (back) {
    const headCover = look.style === 'hood' || look.style === 'turban' ? accent : look.style === 'bald' ? skin : hair;
    for (let y = 5; y <= 9; y++) {
      for (let x = 3; x <= 12; x++) if (grid[y][x]) grid[y][x] = y >= 9 && look.style !== 'hood' ? skin : headCover;
    }
    if (look.style === 'long') for (let y = 9; y <= 12; y++) for (let x = 4; x <= 11; x++) put(grid, x, y, hair);
    if (props.has('cape')) for (let y = 11; y <= 19; y++) for (let x = 3; x <= 12; x++) put(grid, x, y, accent);
  }

  // Side view: one eye, looking the way you walk, and the hair over the back of the head.
  if (side) {
    for (let y = 5; y <= 8; y++) {
      for (let x = 3; x <= 12; x++) if (grid[y][x] === '#1b1410' || grid[y][x] === '#263238' || grid[y][x] === '#cfd8dc') grid[y][x] = skin;
    }
    put(grid, 10, 6, props.has('glasses') ? '#263238' : '#1b1410');
    if (props.has('glasses')) { put(grid, 11, 6, '#263238'); put(grid, 9, 6, '#263238'); put(grid, 10, 7, '#1b1410'); }
    if (look.style !== 'bald' && look.style !== 'hood' && look.style !== 'turban') {
      for (let y = 5; y <= 8; y++) { put(grid, 3, y, hair); put(grid, 4, y, hair); }
    }
  }

  // Walking: lift one foot and step with the other.
  if (frame === 1 || frame === 2) {
    const lift = frame === 1 ? [4, 5, 6] : [9, 10, 11];
    const shoe = grid[20].slice();
    for (const x of lift) {
      if (shoe[x]) { grid[19][x] = shoe[x]; grid[20][x] = null; }
    }
  }
  if (facing === 'left') return grid.map(row => row.slice().reverse());
  return grid;
}

/** Light from the upper left: lighten edges facing it, shade edges facing away, then outline. */
function finish(grid: Grid): Grid {
  const out: Grid = grid.map(row => row.slice());
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      if (!c || c === '#1b1410') continue;
      const right = grid[y][x + 1];
      const below = grid[y + 1]?.[x];
      const left = grid[y][x - 1];
      const above = grid[y - 1]?.[x];
      if (!right || !below) out[y][x] = shade(c, -0.22);
      else if (!left || !above) out[y][x] = shade(c, 0.16);
    }
  }
  const lined: Grid = out.map(row => row.slice());
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (out[y][x]) continue;
      if (out[y][x - 1] || out[y][x + 1] || out[y - 1]?.[x] || out[y + 1]?.[x]) lined[y][x] = OUTLINE;
    }
  }
  return lined;
}

const cache = new Map<string, HTMLCanvasElement>();

export const SPRITE_W = W;
export const SPRITE_H = H;

/** A finished sprite frame as a 16 × 22 canvas, built once and cached. */
export function sprite(id: string, facing: Facing = 'down', frame = 0): HTMLCanvasElement {
  const key = `${id}:${facing}:${frame}`;
  const known = cache.get(key);
  if (known) return known;
  const look = LOOKS[id] ?? LOOKS.player;
  const grid = finish(compose(look, facing, frame));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }));
  cache.set(key, canvas);
  return canvas;
}
