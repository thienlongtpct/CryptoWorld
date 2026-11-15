/**
 * Bit, the cipher companion: pixel art as plain character grids, so it needs no image files and
 * can be checked in tests. Light comes from the upper left. Each figure is drawn as its left half
 * and mirrored (light purple on the left becomes shadow on the right), then the asymmetric parts
 * (eyes, key pendant, satchel) are stamped on top.
 *
 * Edit the palette or the half-rows below to change how Bit looks. Both forms use the same palette,
 * so the world sprite, the guide button, and the dialogue portrait always match.
 */

export type Expression = 'neutral' | 'happy' | 'thinking' | 'curious' | 'surprised' | 'encouraging';
export const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'thinking', 'curious', 'surprised', 'encouraging'];

/** One character per pixel. '.' is transparent. */
export const PALETTE: Record<string, string> = {
  o: '#0d0b1e', // outline
  d: '#2a1650', // purple shadow
  p: '#4b2a8a', // purple cloak
  P: '#7a4fc9', // purple highlight
  n: '#141a3a', // dark navy face
  c: '#3fe6ff', // cyan glow
  C: '#d2fcff', // cyan highlight
  g: '#d9a03a', // warm gold
  G: '#ffd877', // gold highlight
  b: '#7c4a1c', // satchel leather
  s: '#f4e4b4', // scroll paper
};

type Grid = string[];

function mirror(halves: string[]): Grid {
  const flip: Record<string, string> = { P: 'd' };
  return halves.map(half => half + [...half].reverse().map(ch => flip[ch] ?? ch).join(''));
}

function stamp(grid: Grid, marks: Array<[number, number, string]>): Grid {
  const rows = grid.map(row => [...row]);
  for (const [x, y, ch] of marks) {
    if (rows[y] && x >= 0 && x < rows[y].length) rows[y][x] = ch;
  }
  return rows.map(row => row.join(''));
}

// ── World sprite and guide button: 16 × 16 ─────────────────────────────────────────────────────

const SPRITE_TOP = [
  '......oo',
  '....ooPP',
  '...oPPpp',
  '..oPpppp',
  '..oPpooo',
  '..oPonnn',
  '..oPonnn',
  '..oPonnn',
  '..oPppoo',
  '.oPPpppp',
  '.oPppppp',
  'oPPppppp',
  'oPpppppp',
  'oPpppdpp',
];
const HEM_A = ['.oppo.op', '..oo...o'];
const HEM_B = ['oppo.opp', '.oo...oo'];

const SPRITE_MARKS: Array<[number, number, string]> = [
  // key pendant on a short chain
  [7, 9, 'g'], [8, 9, 'g'], [7, 10, 'G'], [8, 10, 'g'], [8, 11, 'g'], [8, 12, 'g'], [9, 12, 'g'],
  // satchel on the right hip, a scroll poking out of it
  [11, 8, 'b'], [12, 9, 's'], [13, 9, 's'], [11, 10, 'b'], [12, 10, 'b'], [13, 10, 'b'], [14, 10, 'o'],
  [11, 11, 'b'], [12, 11, 'g'], [13, 11, 'b'], [14, 11, 'o'], [11, 12, 'o'], [12, 12, 'o'], [13, 12, 'o'],
];

const SPRITE_EYES_OPEN: Array<[number, number, string]> = [[6, 6, 'C'], [6, 7, 'c'], [9, 6, 'C'], [9, 7, 'c']];
const SPRITE_EYES_SHUT: Array<[number, number, string]> = [[6, 7, 'c'], [9, 7, 'c']];

/** Frames of the small sprite: 0 and 1 flutter the hem, `blink` closes the eyes. */
export function spriteGrid(frame: 0 | 1 = 0, blink = false): Grid {
  const base = mirror([...SPRITE_TOP, ...(frame ? HEM_B : HEM_A)]);
  return stamp(base, [...SPRITE_MARKS, ...(blink ? SPRITE_EYES_SHUT : SPRITE_EYES_OPEN)]);
}

// ── Dialogue portrait: 32 × 32 ─────────────────────────────────────────────────────────────────

const PORTRAIT_HALF = [
  '................',
  '..............oo',
  '............ooPP',
  '..........ooPPPp',
  '.........oPPPppp',
  '........oPPppppp',
  '.......oPPpppppp',
  '......oPPppppppp',
  '.....oPPpppppppp',
  '.....oPppppooooo',
  '....oPPpppoonnnn',
  '....oPpppponnnnn',
  '....oPpppponnnnn',
  '...oPPpppponnnnn',
  '...oPppppponnnnn',
  '...oPppppponnnnn',
  '...oPppppponnnnn',
  '...oPpppppponnnn',
  '...oPppppppponnn',
  '..oPPppppppppooo',
  '..oPpppppppppppp',
  '.oPPpppdpppppppp',
  '.oPppppdpppppppp',
  'oPPppppdpppppppp',
  'oPpppppdpppppppp',
  'oPppppdppppppppp',
  'oPppppdppppppppp',
  'oPppppdppppppppp',
  'oPppppdppppppppp',
  'oPppppdppppppppp',
  'oPppppdppppppppp',
  'oPppppdppppppppp',
];

const PORTRAIT_GEAR: Array<[number, number, string]> = [
  // key on a gold chain
  [13, 20, 'g'], [18, 20, 'g'],
  [14, 21, 'g'], [15, 21, 'G'], [16, 21, 'G'], [17, 21, 'g'],
  [14, 22, 'g'], [15, 22, 'o'], [16, 22, 'o'], [17, 22, 'g'],
  [14, 23, 'g'], [15, 23, 'g'], [16, 23, 'g'], [17, 23, 'g'],
  [15, 24, 'G'], [16, 24, 'b'], [15, 25, 'g'], [16, 25, 'b'],
  [15, 26, 'g'], [16, 26, 'g'], [17, 26, 'g'], [15, 27, 'g'], [16, 27, 'b'],
  [15, 28, 'g'], [16, 28, 'g'], [17, 28, 'g'],
  // satchel strap from the right shoulder
  [23, 19, 'b'], [23, 20, 'b'], [24, 21, 'b'], [24, 22, 'b'], [24, 23, 'b'],
  // scrolls and a little cipher wheel sticking out of the satchel
  [26, 21, 's'], [26, 22, 's'], [27, 22, 'o'], [26, 23, 's'], [27, 23, 's'],
  [28, 22, 'G'], [29, 22, 'g'], [28, 23, 'g'], [29, 23, 'G'],
  // the satchel
  ...rowOf(22, 30, 24, 'o'),
  ...rowOf(22, 30, 25, 'b', 'o'),
  ...rowOf(22, 30, 26, 'b', 'o'),
  [26, 26, 'g'], [26, 27, 'G'],
  ...rowOf(22, 30, 27, 'b', 'o'),
  ...rowOf(22, 30, 28, 'b', 'o'),
  ...rowOf(22, 30, 29, 'b', 'o'),
  ...rowOf(22, 30, 30, 'b', 'o'),
  ...rowOf(22, 30, 31, 'o'),
];

function rowOf(x0: number, x1: number, y: number, fill: string, edge = fill): Array<[number, number, string]> {
  const out: Array<[number, number, string]> = [];
  for (let x = x0; x <= x1; x++) out.push([x, y, x === x0 || x === x1 ? edge : fill]);
  return out;
}

/** 3 × 4 eye shapes, top row at y = 12. The left eye starts at x = 11, the right at x = 18. */
const EYE: Record<string, string[]> = {
  open: ['.c.', 'cCc', 'ccc', '.c.'],
  arc: ['...', '.c.', 'c.c', '...'],
  up: ['.Cc', '.cc', '...', '...'],
  wide: ['ccc', 'cCc', 'ccc', 'ccc'],
  ring: ['ccc', 'c.c', 'c.c', 'ccc'],
  wink: ['...', '...', 'ccc', '...'],
  shut: ['...', '...', 'ccc', '...'],
};

interface Face {
  left: keyof typeof EYE;
  right: keyof typeof EYE;
  /** Mouth pixels at rest. Bit has no mouth on a neutral face. */
  mouth: Array<[number, number]>;
  /** A small mark beside the hood: a thought, a question, an exclamation, or a sparkle. */
  mark: Array<[number, number, string]>;
}

const SMILE: Array<[number, number]> = [[14, 17], [17, 17], [15, 18], [16, 18]];

export const FACES: Record<Expression, Face> = {
  neutral: { left: 'open', right: 'open', mouth: [], mark: [] },
  happy: { left: 'arc', right: 'arc', mouth: SMILE, mark: [] },
  thinking: {
    left: 'up', right: 'up', mouth: [[15, 18], [16, 18]],
    mark: [[25, 5, 'G'], [27, 3, 'G'], [28, 3, 'G'], [27, 2, 'G'], [28, 2, 'G'], [30, 1, 'g'], [31, 1, 'g'], [30, 0, 'g'], [31, 0, 'g']],
  },
  curious: {
    left: 'open', right: 'wide', mouth: [[16, 18]],
    mark: [[26, 1, 'c'], [27, 0, 'c'], [28, 0, 'c'], [29, 1, 'c'], [29, 2, 'c'], [28, 3, 'c'], [28, 4, 'c'], [28, 6, 'c']],
  },
  surprised: {
    left: 'ring', right: 'ring', mouth: [[15, 17], [16, 17], [15, 18], [16, 18]],
    mark: [[28, 0, 'G'], [28, 1, 'G'], [28, 2, 'G'], [28, 3, 'G'], [28, 5, 'G']],
  },
  encouraging: {
    left: 'arc', right: 'wink', mouth: SMILE,
    mark: [[28, 1, 'G'], [27, 2, 'G'], [28, 2, 'C'], [29, 2, 'G'], [28, 3, 'G']],
  },
};

export interface PortraitPose {
  expression: Expression;
  /** Mouth open while a message is appearing. */
  speaking?: boolean;
  /** Eyes closed for one blink. Arc eyes stay arcs. */
  blink?: boolean;
}

export function portraitGrid({ expression, speaking = false, blink = false }: PortraitPose): Grid {
  const face = FACES[expression];
  const marks: Array<[number, number, string]> = [...PORTRAIT_GEAR];
  const eye = (shape: keyof typeof EYE, x0: number) => {
    const rows = EYE[blink && shape !== 'arc' && shape !== 'wink' ? 'shut' : shape];
    rows.forEach((row, dy) => [...row].forEach((ch, dx) => marks.push([x0 + dx, 12 + dy, ch === '.' ? 'n' : ch])));
  };
  eye(face.left, 11);
  eye(face.right, 18);
  // Speaking opens a small glowing mouth over whatever the face shows at rest.
  const mouth = speaking ? [...face.mouth, [15, 17], [16, 17], [15, 18], [16, 18]] as Array<[number, number]> : face.mouth;
  for (const [x, y] of mouth) marks.push([x, y, 'c']);
  marks.push(...face.mark);
  return stamp(mirror(PORTRAIT_HALF), marks);
}

/** Paints a grid onto a 2D context at one canvas pixel per art pixel, offset by (x, y). */
export function paintGrid(ctx: CanvasRenderingContext2D, grid: Grid, x = 0, y = 0, scale = 1) {
  for (let row = 0; row < grid.length; row++) {
    const line = grid[row];
    for (let col = 0; col < line.length; col++) {
      const color = PALETTE[line[col]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}
