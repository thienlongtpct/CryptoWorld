/**
 * Bit, the cipher companion: a small round padlock spirit. A pale-blue body, a gold shackle on
 * top, and a keyhole plate on its belly: Bit is the lock, and every lesson is a key.
 *
 * The art is plain character grids, so it needs no image files and can be checked in tests. The
 * round shapes are computed (one character per pixel), then the face is stamped on top. Light
 * comes from the upper left. Both sizes share the palette, so the world sprite, the guide button,
 * and the dialogue portrait always match.
 */

export type Expression = 'neutral' | 'happy' | 'thinking' | 'curious' | 'surprised' | 'encouraging';
export const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'thinking', 'curious', 'surprised', 'encouraging'];

/** One character per pixel. '.' is transparent. */
export const PALETTE: Record<string, string> = {
  o: '#2d2640', // soft plum outline
  w: '#ffffff', // shine
  b: '#eef7ff', // body, lit
  B: '#d4e9fb', // body, mid
  d: '#aac9ec', // body, shadow
  g: '#f2b84b', // gold shackle and plate
  G: '#ffe08a', // gold highlight
  k: '#55628f', // keyhole
  e: '#2d2640', // eyes and mouth
  p: '#ffb3c8', // cheeks
  m: '#ff7f9c', // open mouth
  c: '#5fd6f5', // cyan sparkle
};

type Grid = string[];

function blank(size: number): string[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => '.'));
}

function stamp(rows: string[][], marks: Array<[number, number, string]>) {
  for (const [x, y, ch] of marks) {
    if (rows[y] && x >= 0 && x < rows[y].length) rows[y][x] = ch;
  }
}

/**
 * A round body with a padlock shackle. `cx`, `cy`, and `r` place the body; the shackle is a gold
 * arch of `outer`/`inner` radius centred at (`cx`, `sy`), with legs that disappear into the body.
 */
function lockBody(size: number, cx: number, cy: number, r: number, sy: number, outer: number, inner: number): string[][] {
  const rows = blank(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      // Shackle: the top half of a ring, then two straight legs.
      const ring = py <= sy ? Math.hypot(px - cx, py - sy) : Math.abs(px - cx);
      if (ring <= outer && ring >= inner && py < cy) {
        const edge = ring > outer - 0.9 || ring < inner + 0.9;
        rows[y][x] = edge ? 'o' : px < cx - 1 && py < sy ? 'G' : 'g';
      }
      // Body: outline ring, then light to shadow along the diagonal.
      const d = Math.hypot(px - cx, py - cy);
      if (d <= r) {
        const t = ((px - cx) + (py - cy)) / r;
        rows[y][x] = d > r - 1 ? 'o' : t > 0.75 ? 'd' : t > 0.05 ? 'B' : 'b';
      }
    }
  }
  return rows;
}

// ── World sprite and guide button: 16 × 16 ─────────────────────────────────────────────────────

/** Frames of the small sprite: frame 1 adds a sparkle, `blink` closes the eyes. */
export function spriteGrid(frame: 0 | 1 = 0, blink = false): Grid {
  const rows = lockBody(16, 8, 9.6, 6.1, 5.2, 4.1, 2.1);
  stamp(rows, [
    // shine
    [5, 6, 'w'], [4, 7, 'w'],
    // eyes
    ...(blink ? [[5, 10, 'e'], [10, 10, 'e']] as Array<[number, number, string]> : [[5, 9, 'e'], [5, 10, 'e'], [10, 9, 'e'], [10, 10, 'e']] as Array<[number, number, string]>),
    // cheeks and a tiny smile
    [4, 11, 'p'], [11, 11, 'p'], [7, 11, 'e'], [8, 11, 'e'],
    // keyhole plate
    [7, 13, 'g'], [8, 13, 'g'], [7, 14, 'k'], [8, 14, 'g'],
  ]);
  if (frame) stamp(rows, [[13, 3, 'c'], [14, 2, 'c'], [13, 1, 'c'], [12, 2, 'c']]);
  return rows.map(row => row.join(''));
}

// ── Dialogue portrait: 32 × 32 ─────────────────────────────────────────────────────────────────

/** 3 × 4 eye shapes, top row at y = 15. The left eye starts at x = 10, the right at x = 19. '.' keeps the body. */
const EYE: Record<string, string[]> = {
  open: ['.e.', 'ewe', 'eee', '.e.'],
  arc: ['...', '.e.', 'e.e', '...'],
  up: ['.we', '.ee', '...', '...'],
  wide: ['eee', 'ewe', 'eee', 'eee'],
  ring: ['eee', 'e.e', 'e.e', 'eee'],
  wink: ['...', '...', 'eee', '...'],
  shut: ['...', '...', 'eee', '...'],
};

interface Face {
  left: keyof typeof EYE;
  right: keyof typeof EYE;
  /** Mouth pixels at rest. */
  mouth: Array<[number, number]>;
  /** A small mark beside the shackle: a thought, a question, an exclamation, or a sparkle. */
  mark: Array<[number, number, string]>;
}

const SMILE: Array<[number, number]> = [[14, 20], [17, 20], [15, 21], [16, 21]];
const DOT: Array<[number, number]> = [[15, 21], [16, 21]];

export const FACES: Record<Expression, Face> = {
  neutral: { left: 'open', right: 'open', mouth: DOT, mark: [] },
  happy: { left: 'arc', right: 'arc', mouth: SMILE, mark: [] },
  thinking: {
    left: 'up', right: 'up', mouth: [[16, 21]],
    mark: [[25, 5, 'G'], [27, 3, 'G'], [28, 3, 'G'], [27, 2, 'G'], [28, 2, 'G'], [30, 1, 'g'], [31, 1, 'g'], [30, 0, 'g'], [31, 0, 'g']],
  },
  curious: {
    left: 'open', right: 'wide', mouth: [[16, 21]],
    mark: [[26, 1, 'c'], [27, 0, 'c'], [28, 0, 'c'], [29, 1, 'c'], [29, 2, 'c'], [28, 3, 'c'], [28, 4, 'c'], [28, 6, 'c']],
  },
  surprised: {
    left: 'ring', right: 'ring', mouth: [[15, 20], [16, 20], [15, 21], [16, 21]],
    mark: [[28, 0, 'g'], [28, 1, 'g'], [28, 2, 'g'], [28, 3, 'g'], [28, 5, 'g']],
  },
  encouraging: {
    left: 'arc', right: 'wink', mouth: SMILE,
    mark: [[28, 1, 'G'], [27, 2, 'G'], [28, 2, 'w'], [29, 2, 'G'], [28, 3, 'G']],
  },
};

export interface PortraitPose {
  expression: Expression;
  /** Mouth open while a message is appearing. */
  speaking?: boolean;
  /** Eyes closed for one blink. Arc eyes stay arcs. */
  blink?: boolean;
}

/** The keyhole plate on Bit's belly. */
const PLATE: Array<[number, number, string]> = (() => {
  const out: Array<[number, number, string]> = [];
  for (let y = 23; y <= 28; y++) {
    for (let x = 12; x <= 19; x++) {
      const corner = (x === 12 || x === 19) && (y === 23 || y === 28);
      if (!corner) out.push([x, y, y === 23 ? 'G' : 'g']);
    }
  }
  // Keyhole: a round top over a narrow slot.
  out.push([15, 24, 'k'], [16, 24, 'k'], [14, 25, 'k'], [15, 25, 'k'], [16, 25, 'k'], [17, 25, 'k'], [15, 26, 'k'], [16, 26, 'k'], [15, 27, 'k'], [16, 27, 'k']);
  return out;
})();

export function portraitGrid({ expression, speaking = false, blink = false }: PortraitPose): Grid {
  const face = FACES[expression];
  const rows = lockBody(32, 16, 19.5, 11.6, 10, 7.6, 4.1);
  const marks: Array<[number, number, string]> = [
    // shine on the upper left of the body
    [9, 11, 'w'], [10, 11, 'w'], [8, 12, 'w'], [9, 12, 'w'], [8, 13, 'w'],
    // cheeks
    [8, 20, 'p'], [9, 20, 'p'], [8, 21, 'p'], [9, 21, 'p'], [22, 20, 'p'], [23, 20, 'p'], [22, 21, 'p'], [23, 21, 'p'],
    ...PLATE,
  ];
  const eye = (shape: keyof typeof EYE, x0: number) => {
    const shapeRows = EYE[blink && shape !== 'arc' && shape !== 'wink' ? 'shut' : shape];
    shapeRows.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch !== '.') marks.push([x0 + dx, 15 + dy, ch]); }));
  };
  eye(face.left, 10);
  eye(face.right, 19);
  for (const [x, y] of face.mouth) marks.push([x, y, 'e']);
  // Speaking opens a small pink mouth over whatever the face shows at rest.
  if (speaking) marks.push([15, 20, 'e'], [16, 20, 'e'], [15, 21, 'm'], [16, 21, 'm'], [15, 22, 'e'], [16, 22, 'e']);
  marks.push(...face.mark);
  stamp(rows, marks);
  return rows.map(row => row.join(''));
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
