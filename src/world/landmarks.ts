/**
 * Pixel artwork for the named locations: multi-tile landmarks, one-tile props, wall pieces, flat
 * decor, and their lights. Everything is drawn in source pixels (`u` device pixels each, 16 per
 * tile) with the shared dark outline, so it matches the tiles and sprites around it.
 *
 * Each metaphor follows its lesson:
 * - The Fountain of Hash only takes runes in. Inputs of any length leave as one fixed-length
 *   inscription, and every new input gives an unrelated pattern.
 * - On the Bridge of Shared Secrets each tower keeps its own coloured chamber (its private
 *   exponent). Only public runes cross, and both beacons wake in the same colour once the gate opens.
 * - At the Peaks of Shattered Secrets the seal wakes only while at least two of the three shrines
 *   are lit, which is the 2-of-3 threshold. One lit shrine alone leaves the seal dark.
 */
import { LOCATION_BY_ID } from './locations';
import type { Decor, Tile } from './map';

export interface Scene {
  map: Tile[][];
  unit: number;
  tile: number;
  time: number;
  reduced: boolean;
  open: Set<string>;
}

export const OUTLINE = '#1b1410';
const A = LOCATION_BY_ID;

/** Private colours of the two bridge towers, and the shared key colour both reach. */
const ALICE = '#f48fb1';
const BOB = '#64b5f6';
const SHARED = '#f6d46b';

function hash(x: number, y: number, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A painter in source pixels, anchored at (px, py). */
function pen(ctx: CanvasRenderingContext2D, px: number, py: number, u: number) {
  const rect = (x: number, y: number, w: number, h: number, colour: string) => {
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(px + x * u), Math.round(py + y * u), Math.ceil(w * u), Math.ceil(h * u));
  };
  /** A rectangle with the shared one-pixel outline around it. */
  const box = (x: number, y: number, w: number, h: number, colour: string) => {
    rect(x - 1, y - 1, w + 2, h + 2, OUTLINE);
    rect(x, y, w, h, colour);
  };
  /** A filled pixel disc or ellipse, built from rows so its edge stays stepped. */
  const disc = (cx: number, cy: number, rx: number, ry: number, colour: string) => {
    for (let y = -ry; y < ry; y++) {
      const t = (y + 0.5) / ry;
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      if (half > 0) rect(cx - half, cy + y, half * 2, 1, colour);
    }
  };
  return { rect, box, disc };
}

/** A small rune from a number: a 3 × 4 pattern of lit pixels. */
function rune(rect: (x: number, y: number, w: number, h: number, c: string) => void, x: number, y: number, bits: number, colour: string) {
  let lit = 0;
  for (let i = 0; i < 12; i++) {
    if ((bits >>> i) & 1) {
      rect(x + (i % 3), y + Math.floor(i / 3), 1, 1, colour);
      lit++;
    }
  }
  if (lit < 3) rect(x + 1, y, 1, 4, colour);
}

/** Tiny 3 × 5 letters for the ruins, the letter tiles, and the Caesar wheel. */
const GLYPHS: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', K: '101110100110101', X: '101101010101101',
  Q: '010101101011001', Z: '111001010100111', H: '101101111101101', N: '101111111111101',
};
function letter(rect: (x: number, y: number, w: number, h: number, c: string) => void, x: number, y: number, ch: string, colour: string) {
  const bits = GLYPHS[ch] ?? GLYPHS.X;
  for (let i = 0; i < 15; i++) if (bits[i] === '1') rect(x + (i % 3), y + Math.floor(i / 3), 1, 1, colour);
}

const wave = (scene: Scene, period: number, offset = 0) => (scene.reduced ? 0 : Math.sin(scene.time / period + offset));

// ── Multi-tile landmarks ─────────────────────────────────────────────────────

export function drawLandmark(ctx: CanvasRenderingContext2D, scene: Scene, kind: Tile, x0: number, y0: number, w: number, h: number, px: number, py: number) {
  currentCtx = ctx;
  const u = scene.unit;
  const p = pen(ctx, px, py, u);
  const W = w * 16;
  const H = h * 16;
  // Soft ground shadow to the south-east, like the buildings.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(px + 3 * u, py + (H - 2) * u, W * u, 3 * u);
  if (kind === 'fountain') fountain(scene, p, W, H, x0, y0);
  else if (kind === 'tower') tower(scene, p, W, H, x0, y0);
  else if (kind === 'beds') beds(scene, p, W, H, x0, y0);
  else if (kind === 'stall') stall(scene, p, W, H);
  else if (kind === 'cave') cave(scene, p, W, H);
  else if (kind === 'table') table(scene, p, W);
}

type Pen = ReturnType<typeof pen>;

function fountain(scene: Scene, p: Pen, W: number, H: number, x0: number, y0: number) {
  const { glow, light, dark } = A.fountain.accent;
  const cx = W / 2;
  // Octagonal basin: outline, rim, water, and the front face with its engraving.
  p.rect(5, 15, W - 10, H - 18, OUTLINE);
  p.rect(3, 17, W - 6, H - 22, OUTLINE);
  p.rect(6, 16, W - 12, H - 20, '#aeb8bb');
  p.rect(4, 18, W - 8, H - 24, '#aeb8bb');
  p.rect(8, 19, W - 16, H - 28, dark);
  p.rect(7, 21, W - 14, H - 32, dark);
  p.rect(9, 20, W - 18, H - 30, '#2a7f8f');
  // Moving light bands on the water.
  const shift = scene.reduced ? 0 : Math.floor(scene.time / 260) % 6;
  for (let i = 0; i < 3; i++) p.rect(11 + ((i * 9 + shift) % (W - 24)), 23 + i * 4, 5, 1, light);
  p.rect(4, H - 8, W - 8, 4, '#7a8689');
  p.rect(4, H - 4, W - 8, 1, OUTLINE);
  // The rim's inscription: a fixed number of glowing marks, whatever goes in.
  for (let i = 0; i < 4; i++) rune(p.rect, cx - 9 + i * 5, H - 8, hash(x0 + i, y0, 41), glow);
  // A tiered fountain: a short pedestal, a wide upper bowl, and a plume of water.
  p.box(cx - 3, 14, 6, 14, '#c3ccce');
  p.rect(cx - 3, 14, 2, 14, '#e3e9ea');
  p.box(cx - 5, 25, 10, 3, '#aeb8bb');
  // Upper bowl: a shallow dish with its own water.
  p.rect(cx - 13, 9, 26, 6, OUTLINE);
  p.rect(cx - 12, 8, 24, 1, OUTLINE);
  p.rect(cx - 12, 9, 24, 5, '#d5dcde');
  p.rect(cx - 10, 9, 20, 2, light);
  p.rect(cx - 12, 13, 24, 1, '#8f9a9d');
  p.rect(cx - 9, 15, 18, 2, OUTLINE);
  p.rect(cx - 8, 15, 16, 1, '#aeb8bb');
  // Water curtains falling from the bowl's rim into the basin.
  const fall = scene.reduced ? 0 : Math.floor(scene.time / 140) % 4;
  for (const side of [-1, 1]) {
    const x = cx + side * 13 - (side > 0 ? 1 : 0);
    for (let y = 14; y < 22; y++) if ((y + fall) % 4 !== 0) p.rect(x, y, 1, 1, (y + fall) % 4 === 1 ? '#ffffff' : light);
  }
  // The plume over the bowl, with a glowing core: the fountain is lit from within.
  const pulse = scene.reduced ? 1 : 0.75 + wave(scene, 520) * 0.25;
  const rise = scene.reduced ? 0 : Math.round(wave(scene, 300));
  p.rect(cx - 2, 1 + rise, 4, 8 - rise, light);
  p.rect(cx - 1, 0 + rise, 2, 9 - rise, '#ffffff');
  withAlpha(() => {
    p.rect(cx - 4, 7, 8, 2, glow);
    p.rect(cx - 1, 2 + rise, 2, 3, glow);
  }, pulse);
  // Spray drops arcing from the plume into the bowl and the basin.
  const drops = 10;
  for (let i = 0; i < drops; i++) {
    const side = i % 2 ? 1 : -1;
    const spread = 6 + (i % 3) * 6;
    const t = scene.reduced ? 0.25 + (i % 4) * 0.2 : ((scene.time / 1300 + i / drops) % 1);
    const x = cx + side * spread * t;
    const y = 2 - 6 * t + 18 * t * t;
    p.rect(x, y, i % 3 ? 1 : 2, 2, i % 3 ? '#d9fbff' : glow);
  }
}

/** Runs `draw` with a temporary global alpha on the canvas being painted. */
function withAlpha(draw: () => void, alpha: number) {
  const c = currentCtx;
  if (!c) return draw();
  const before = c.globalAlpha;
  c.globalAlpha = before * Math.max(0, Math.min(1, alpha));
  draw();
  c.globalAlpha = before;
}
let currentCtx: CanvasRenderingContext2D | null = null;

function tower(scene: Scene, p: Pen, W: number, H: number, x0: number, y0: number) {
  const { base, dark, light } = A.bridge.accent;
  const west = x0 < scene.map[0].length / 2;
  const own = west ? ALICE : BOB;
  const solved = scene.open.size > 0;
  // A tall, round stone tower: a narrow body with a stepped base and a high cone.
  const cx = W / 2;
  const half = 11;
  p.rect(cx - half - 3, H - 7, (half + 3) * 2, 7, OUTLINE);
  p.rect(cx - half - 2, H - 6, (half + 2) * 2, 6, '#7d868f');
  p.rect(cx - half - 1, -2, (half + 1) * 2, H - 4, OUTLINE);
  p.rect(cx - half, -2, half * 2, H - 5, '#9aa3ad');
  p.rect(cx - half, -2, 4, H - 5, '#c2c9d0');
  p.rect(cx + half - 5, -2, 5, H - 5, '#6f7881');
  for (let y = 2; y < H - 7; y += 5) {
    p.rect(cx - half, y, half * 2, 1, 'rgba(0, 0, 0, 0.18)');
    p.rect(cx - half + ((y / 5) % 2 ? 6 : 12), y - 4, 1, 4, 'rgba(0, 0, 0, 0.12)');
  }
  // Crenellated ring under the cone.
  p.rect(cx - half - 3, -6, (half + 3) * 2, 5, OUTLINE);
  p.rect(cx - half - 2, -5, (half + 2) * 2, 3, '#b3bbc3');
  for (let x = cx - half - 2; x < cx + half + 1; x += 5) p.rect(x, -8, 3, 3, '#b3bbc3');
  // High cone in the bridge's blue.
  for (let i = 0; i < 18; i++) {
    const r = 1 + i * 0.75;
    p.rect(cx - r - 1, -26 + i, r * 2 + 2, 1, OUTLINE);
    p.rect(cx - r, -26 + i, r * 2, 1, i < 6 ? light : i < 12 ? base : dark);
    p.rect(cx - r, -26 + i, 1, 1, light);
  }
  // The private chamber: a lit window in this tower's own colour.
  p.box(cx - 4, 10, 8, 10, '#2b2b33');
  p.rect(cx - 3, 11, 6, 8, own);
  p.rect(cx - 0.5, 11, 1, 8, '#2b2b33');
  p.rect(cx - 3, 14.5, 6, 1, '#2b2b33');
  p.rect(cx - 3, 11, 2, 1, 'rgba(255, 255, 255, 0.6)');
  // Door at the foot.
  p.box(cx - 4, H - 13, 8, 12, '#3e2723');
  p.rect(cx - 3, H - 12, 6, 11, '#5d4037');
  p.rect(cx + 1, H - 7, 1, 1, '#f6d46b');
  // Beacon on the spire: dark until the exchange is done, then the same colour on both towers.
  const pulse = solved && !scene.reduced ? 0.8 + wave(scene, 400) * 0.2 : 1;
  p.rect(cx - 0.5, -29, 1, 3, OUTLINE);
  p.box(cx - 3, -34, 6, 5, '#3a414b');
  withAlpha(() => p.rect(cx - 2, -33, 4, 3, solved ? SHARED : '#555b63'), pulse);
  void y0;
}

function beds(scene: Scene, p: Pen, W: number, H: number, x0: number, y0: number) {
  const { glow } = A.gardens.accent;
  const r = Math.round(H / 2) - 2;
  const lx = Math.round(W / 2 - r * 0.55);
  const rx = Math.round(W / 2 + r * 0.55);
  const cy = H / 2;
  const inL = (x: number, y: number) => (x - lx) ** 2 + (y - cy) ** 2 <= r * r;
  const inR = (x: number, y: number) => (x - rx) ** 2 + (y - cy) ** 2 <= r * r;
  // Stone borders, then soil.
  p.disc(lx, cy, r + 2, r + 2, OUTLINE);
  p.disc(rx, cy, r + 2, r + 2, OUTLINE);
  p.disc(lx, cy, r + 1, r + 1, '#b9b0a0');
  p.disc(rx, cy, r + 1, r + 1, '#b9b0a0');
  p.disc(lx, cy, r - 1, r - 1, '#5d4037');
  p.disc(rx, cy, r - 1, r - 1, '#5d4037');
  // The overlap: a lighter soil lens where both beds meet.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (inL(x + 0.5, y + 0.5) && inR(x + 0.5, y + 0.5) && (x - lx) ** 2 + (y - cy) ** 2 <= (r - 1) ** 2 && (x - rx) ** 2 + (y - cy) ** 2 <= (r - 1) ** 2) {
        p.rect(x, y, 1, 1, '#7b5a44');
      }
    }
  }
  // Plants on a 4 px grid. Carol's own are pink, Dave's own are yellow and hidden under veils;
  // only the shared plants in the overlap bloom and glow.
  const bloom = scene.reduced ? 1 : 0.7 + wave(scene, 600) * 0.3;
  for (let y = 4; y < H - 3; y += 4) {
    for (let x = 4; x < W - 3; x += 4) {
      const a = inL(x, y) && (x - lx) ** 2 + (y - cy) ** 2 <= (r - 3) ** 2;
      const b = inR(x, y) && (x - rx) ** 2 + (y - cy) ** 2 <= (r - 3) ** 2;
      if (!a && !b) continue;
      const h = hash(x0 * 16 + x, y0 * 16 + y, 9);
      if (h % 3 === 0) continue;
      p.rect(x, y + 1, 1, 2, '#2e7d32');
      if (a && b) {
        withAlpha(() => {
          p.rect(x - 1, y - 1, 3, 2, glow);
          p.rect(x, y - 2, 1, 1, '#ffffff');
        }, bloom);
      } else if (h % 9 === 1) {
        // A veiled marker: the plant's name stays hidden.
        p.rect(x - 1, y - 2, 3, 3, '#e8e0cf');
        p.rect(x - 1, y + 1, 3, 1, '#a89f8d');
      } else {
        p.rect(x - 1, y - 1, 2, 2, a ? '#f48fb1' : '#ffd54f');
      }
    }
  }
}

function stall(scene: Scene, p: Pen, W: number, H: number) {
  const { base, dark, light, glow } = A.bazaar.accent;
  // Posts.
  p.box(2, -6, 3, H + 4, '#4e342e');
  p.box(W - 5, -6, 3, H + 4, '#4e342e');
  // Striped canopy with a scalloped edge.
  p.rect(0, -11, W, 9, OUTLINE);
  for (let x = 1; x < W - 1; x += 4) p.rect(x, -10, 4, 7, (x / 4) % 2 < 1 ? base : '#e9d8a6');
  for (let x = 1; x < W - 1; x += 4) p.rect(x + 1, -3, 2, 2, (x / 4) % 2 < 1 ? dark : '#c9b682');
  p.rect(1, -10, W - 2, 1, 'rgba(255, 255, 255, 0.3)');
  // A mask on the canopy: the merchant's face stays hidden too.
  p.box(W / 2 - 4, -9, 8, 4, '#f3e3bd');
  p.rect(W / 2 - 3, -8, 2, 1, OUTLINE);
  p.rect(W / 2 + 1, -8, 2, 1, OUTLINE);
  // Curtains that sway, closing the booth.
  const sway = scene.reduced ? 0 : Math.round(wave(scene, 700) * 1.5);
  for (let i = 0; i < 2; i++) {
    const left = i === 0;
    const x = left ? 5 : W / 2;
    const w = W / 2 - 5;
    p.rect(x, 0, w, H - 10, dark);
    for (let s = 0; s < w; s += 3) p.rect(x + s + (left ? sway : -sway) * (s / w), 0, 1, H - 10, base);
    p.rect(left ? x + w - 2 + sway : x + 1 - sway, 0, 1, H - 10, light);
  }
  // Counter with sealed packages. Which one the buyer takes is behind the curtain.
  p.box(3, H - 10, W - 6, 10, '#6d4c41');
  p.rect(3, H - 10, W - 6, 2, '#8d6e63');
  for (let i = 0; i < 3; i++) {
    const x = 9 + i * 11;
    p.box(x, H - 16, 7, 6, '#c8a27a');
    p.rect(x + 3, H - 16, 1, 6, '#8d6e63');
    p.rect(x + 2, H - 14, 3, 2, '#b71c1c');
  }
  // Hanging moon lantern.
  const flick = scene.reduced ? 1 : 0.85 + wave(scene, 180) * 0.15;
  p.rect(W - 8, -2, 1, 4, OUTLINE);
  withAlpha(() => p.box(W - 10, 2, 5, 5, glow), flick);
}

function cave(scene: Scene, p: Pen, W: number, H: number) {
  const { base, dark, light, glow } = A.cavern.accent;
  // A rocky mound that rises above its tiles, in stepped rows.
  // A rounded, lumpy dome of rock, lit from the upper left.
  for (let y = -16; y < H; y++) {
    const t = (y + 16) / (H + 16);
    const bump = [0, 1, 0, -1, 0, 2, 1, 0][Math.floor((y + 16) / 3) % 8];
    const half = Math.round((W / 2) * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2)) + bump);
    if (half < 1) continue;
    p.rect(W / 2 - half - 1, y, half * 2 + 2, 1, OUTLINE);
    p.rect(W / 2 - half, y, half * 2, 1, base);
    p.rect(W / 2 - half, y, Math.max(1, Math.round(half * 0.7)), 1, y < 4 ? light : base);
    p.rect(W / 2 + Math.round(half * 0.55), y, Math.round(half * 0.45), 1, dark);
  }
  // Boulder seams.
  for (const [x, y, w] of [[10, -2, 7], [W - 22, 4, 8], [18, 12, 6], [W - 16, -8, 5], [6, 18, 5]] as const) {
    p.rect(x, y, w, 1, OUTLINE);
    p.rect(x, y + 1, 1, 2, OUTLINE);
  }
  // The mouth, right above the barred rune door.
  p.rect(W / 2 - 9, H - 14, 18, 14, OUTLINE);
  p.rect(W / 2 - 8, H - 13, 16, 13, '#0d1220');
  p.rect(W / 2 - 6, H - 15, 12, 2, OUTLINE);
  // Crystals.
  const shine = scene.reduced ? 1 : 0.7 + wave(scene, 650) * 0.3;
  for (const [x, y, s] of [[7, 4, 5], [W - 12, 2, 6], [14, -6, 4], [W - 20, -9, 4]] as const) {
    withAlpha(() => {
      p.rect(x, y, 2, s, glow);
      p.rect(x + 2, y + 2, 2, s - 2, light);
      p.rect(x - 2, y + 3, 2, s - 3, '#4dd0e1');
    }, shine);
  }
  // Three proof symbols over the door. Each round lights one more; an opened challenge lights all.
  const solved = scene.open.size > 0;
  const rounds = solved ? 3 : scene.reduced ? 1 : Math.floor(scene.time / 900) % 4;
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - 9 + i * 8;
    const lit = i < rounds;
    p.rect(x + 1, H - 22, 2, 1, OUTLINE);
    p.rect(x, H - 21, 4, 2, lit ? glow : '#3a4766');
    p.rect(x + 1, H - 19, 2, 1, lit ? '#ffffff' : '#2a3450');
  }
}

function table(scene: Scene, p: Pen, W: number) {
  const { glow } = A.library.accent;
  p.box(2, 12, 2, 4, '#4e342e');
  p.box(W - 4, 12, 2, 4, '#4e342e');
  p.box(0, 4, W, 8, '#795548');
  p.rect(0, 4, W, 1, '#a1887f');
  // The glowing page: Alice on one side, the public wire, Bob on the other.
  const pulse = scene.reduced ? 1 : 0.8 + wave(scene, 500) * 0.2;
  withAlpha(() => p.box(5, 1, W - 10, 8, '#fff4cf'), pulse);
  p.rect(9, 4, 3, 3, ALICE);
  p.rect(W - 12, 4, 3, 3, BOB);
  p.rect(12, 5, W - 24, 1, '#7a6a4f');
  const t = scene.reduced ? 0.5 : (scene.time / 1400) % 1;
  p.rect(12 + (W - 26) * t, 4, 2, 3, glow);
  void glow;
}

// ── One-tile props ───────────────────────────────────────────────────────────

/** Shrine order on a map, west to east, cached per map. */
const shrineOrder = new WeakMap<Tile[][], string[]>();
function shrines(map: Tile[][]) {
  let list = shrineOrder.get(map);
  if (!list) {
    list = [];
    map.forEach((row, y) => row.forEach((t, x) => { if (t === 'shrine') list!.push(`${x},${y}`); }));
    list.sort((a, b) => Number(a.split(',')[0]) - Number(b.split(',')[0]));
    shrineOrder.set(map, list);
  }
  return list;
}

/** How many shrines give their light right now: 0, 1, 2, then 3, so the threshold is visible. */
export function litShrines(scene: Scene) {
  return scene.reduced ? 2 : Math.floor(scene.time / 1200) % 4;
}
/** The seal wakes at the threshold: two of the three shares. */
export const SHARE_THRESHOLD = 2;

function shrineLit(scene: Scene, x: number, y: number) {
  return shrines(scene.map).indexOf(`${x},${y}`) < litShrines(scene);
}

export function drawProp(ctx2: CanvasRenderingContext2D, scene: Scene, kind: Tile, x: number, y: number, px: number, py: number) {
  currentCtx = ctx2;
  const u = scene.unit;
  const p = pen(ctx2, px, py, u);
  const shadow = (w: number) => {
    ctx2.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx2.beginPath();
    ctx2.ellipse(px + 8 * u, py + 14 * u, w * u, 2.2 * u, 0, 0, Math.PI * 2);
    ctx2.fill();
  };
  if (kind === 'lantern') {
    shadow(3);
    const flick = scene.reduced ? 1 : 0.8 + Math.sin(scene.time / 150 + x * 3) * 0.2;
    p.box(7, 4, 2, 11, '#3e2723');
    p.box(5, 13, 6, 2, '#3e2723');
    p.box(5, -2, 6, 6, '#2b2b33');
    withAlpha(() => p.rect(6, -1, 4, 4, '#ffd27a'), flick);
    p.rect(4, -3, 8, 1, '#2b2b33');
    p.rect(7, -4, 2, 1, '#2b2b33');
  } else if (kind === 'signpost') {
    shadow(4);
    p.box(7, -2, 2, 17, '#6d4c41');
    // One arm per direction, each in its region's colour.
    const arms: [number, number, string, number][] = [
      [-1, 0, A.library.accent.light, -1], [3, 0, A.fountain.accent.light, 1],
      [7, 0, A.gardens.accent.light, -1], [-5, 0, A.labyrinth.accent.glow, 1],
    ];
    arms.forEach(([dy, , colour, dir], i) => {
      const yy = 2 + i * 3 + dy * 0;
      const x0 = dir > 0 ? 8 : 1;
      p.rect(x0 - 1, yy - 1, 9, 4, OUTLINE);
      p.rect(x0, yy, 7, 2, colour);
      p.rect(dir > 0 ? x0 + 7 : x0 - 1, yy, 1, 2, colour);
    });
    p.box(6, -4, 4, 2, A.crossroads.accent.glow);
  } else if (kind === 'shrine') {
    shadow(7);
    // A small mountain crag with a snowy cap, holding one shard of the secret on its summit.
    const { base, dark, light, glow } = A.peaks.accent;
    for (let i = 0; i < 14; i++) {
      const jag = i % 4 === 2 ? 1 : 0;
      const left = 7 - i * 0.5 - jag;
      const right = 9 + i * 0.5 + (i % 5 === 3 ? 1 : 0);
      p.rect(left - 1, 1 + i, right - left + 2, 1, OUTLINE);
      p.rect(left, 1 + i, right - left, 1, i < 3 ? '#eef1ff' : i < 6 ? light : i < 10 ? base : dark);
      if (i >= 3) p.rect(left, 1 + i, 1, 1, i < 6 ? '#d6d8f4' : light);
      if (i >= 3) p.rect(right - 1, 1 + i, 1, 1, dark);
    }
    p.rect(5, 9, 2, 1, dark);
    p.rect(10, 11, 2, 1, dark);
    const lit = shrineLit(scene, x, y);
    p.rect(6, -6, 4, 8, OUTLINE);
    p.rect(7, -5, 2, 6, lit ? glow : '#5a5c7a');
    p.rect(7, -7, 2, 1, OUTLINE);
    if (lit) {
      p.rect(7, -5, 1, 3, '#ffffff');
      p.rect(9, -4, 1, 1, glow);
      p.rect(5, -3, 1, 1, glow);
    }
  } else if (kind === 'seal') {
    shadow(6);
    const awake = litShrines(scene) >= SHARE_THRESHOLD;
    p.disc(8, 10, 7, 4, OUTLINE);
    p.disc(8, 10, 6, 3, awake ? '#cfc4ff' : '#7d7f99');
    p.disc(8, 9, 6, 3, awake ? '#e8e2ff' : '#9a9cb3');
    // The secret's rune shows only when the threshold of shares is met.
    p.rect(6, 8, 4, 1, awake ? '#6a4bd6' : '#7d7f99');
    p.rect(7.5, 7, 1, 3, awake ? '#6a4bd6' : '#7d7f99');
  } else if (kind === 'anvil') {
    shadow(6);
    p.box(5, 10, 6, 5, '#6d4c41');
    p.box(2, 6, 12, 4, '#37474f');
    p.rect(2, 6, 12, 1, '#78909c');
    p.box(1, 6, 2, 2, '#37474f');
    const heat = scene.reduced ? 1 : 0.75 + Math.sin(scene.time / 170) * 0.25;
    withAlpha(() => p.box(6, 3, 5, 3, A.forge.accent.glow), heat);
    // A key-shaped hammer: the same key seals and opens.
    p.rect(12, 0, 1, 6, '#8d6e63');
    p.box(11, -1, 3, 2, '#e0b84a');
  } else if (kind === 'marker') {
    shadow(3);
    p.box(7, 7, 2, 8, '#8d6e63');
    // The plant's name is under a hood.
    p.box(4, 2, 8, 6, '#e8e0cf');
    p.rect(4, 7, 8, 1, '#b8ad97');
    p.rect(7, 3, 2, 1, '#9e9585');
    p.rect(8, 4, 1, 1, '#9e9585');
    p.rect(7.5, 6, 1, 1, '#9e9585');
  }
}

/** Letter tiles lying in the grass by the Ruins. They do not block anything. */
export function drawLetters(ctx2: CanvasRenderingContext2D, scene: Scene, x: number, y: number, px: number, py: number) {
  currentCtx = ctx2;
  const p = pen(ctx2, px, py, scene.unit);
  const letters = 'ABCDEFHKNQXZ';
  const h = hash(x, y, 5);
  for (let i = 0; i < 2; i++) {
    const lx = 2 + i * 7 + ((h >>> (i * 3)) % 2);
    const ly = 4 + ((h >>> (i * 5)) % 5);
    p.box(lx, ly, 5, 7, '#e3d6b8');
    p.rect(lx, ly + 6, 5, 1, '#b8a888');
    letter(p.rect, lx + 1, ly + 1, letters[(h >>> (i * 4 + 2)) % letters.length], '#6d4c41');
  }
}

/** Wall pieces: a stained-glass key window for the Library, a flag-rune banner for the Labyrinth. */
export function drawWallPiece(ctx2: CanvasRenderingContext2D, scene: Scene, kind: Tile, x: number, px: number, py: number) {
  currentCtx = ctx2;
  const p = pen(ctx2, px, py, scene.unit);
  if (kind === 'stained') {
    p.rect(3, 1, 10, 14, OUTLINE);
    p.rect(4, 0, 8, 1, OUTLINE);
    const panes = ['#5c6bc0', '#c62828', '#00897b', '#7e57c2', '#1e88e5', '#f9a825'];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) p.rect(4 + i * 4, 2 + j * 3, 4, 3, panes[(i + j + x) % panes.length]);
    p.rect(5, 1, 6, 1, panes[(x + 2) % panes.length]);
    // A gold key across the glass.
    p.rect(6, 4, 4, 3, '#f6d46b');
    p.rect(7, 5, 2, 1, OUTLINE);
    p.rect(7.5, 7, 1, 6, '#f6d46b');
    p.rect(8.5, 10, 2, 1, '#f6d46b');
    p.rect(8.5, 12, 1, 1, '#f6d46b');
    p.rect(7.5, 1, 1, 14, 'rgba(27, 20, 16, 0.5)');
  } else if (kind === 'flag') {
    const sway = scene.reduced ? 0 : Math.round(Math.sin(scene.time / 500 + x) * 1);
    p.rect(2, 1, 12, 2, '#5d4037');
    p.rect(4, 3, 8, 10, OUTLINE);
    p.rect(5, 3, 6, 9, A.labyrinth.accent.glow);
    p.rect(5, 12 + sway, 2, 2, A.labyrinth.accent.glow);
    p.rect(9, 12 - sway, 2, 2, A.labyrinth.accent.glow);
    p.rect(7, 12, 2, 1, OUTLINE);
    // The flag rune: a pole and a pennant.
    p.rect(6.5, 5, 1, 6, '#f6d46b');
    p.rect(7.5, 5, 3, 2, '#f6d46b');
  }
}

/** The Labyrinth gate frame around the door: posts with flag runes and a lintel with banners. */
export function drawArchway(ctx2: CanvasRenderingContext2D, scene: Scene, px: number, py: number) {
  currentCtx = ctx2;
  const p = pen(ctx2, px, py, scene.unit);
  const glow = A.labyrinth.accent.glow;
  const pulse = scene.reduced ? 1 : 0.7 + Math.sin(scene.time / 450) * 0.3;
  for (const x of [-6, 16]) {
    p.box(x, -12, 6, 28, '#56636b');
    p.rect(x, -12, 2, 28, '#7c8b93');
    withAlpha(() => {
      p.rect(x + 2, -6, 1, 7, glow);
      p.rect(x + 3, -6, 2, 3, glow);
      p.rect(x + 2, 4, 1, 7, glow);
      p.rect(x + 3, 4, 2, 3, glow);
    }, pulse);
  }
  p.box(-7, -16, 30, 5, '#45606b');
  p.rect(-7, -16, 30, 1, '#7c8b93');
  for (let i = 0; i < 4; i++) {
    const x = -4 + i * 7;
    p.rect(x, -11, 4, 4, i % 2 ? glow : '#f6d46b');
    p.rect(x + 1, -7, 2, 1, i % 2 ? glow : '#f6d46b');
  }
}

// ── Flat decor ───────────────────────────────────────────────────────────────

export function drawDecor(ctx2: CanvasRenderingContext2D, scene: Scene, decor: Decor, px: number, py: number) {
  currentCtx = ctx2;
  const p = pen(ctx2, px, py, scene.unit);
  const W = decor.w * 16;
  const H = decor.h * 16;
  if (decor.art === 'compass') compass(scene, p, W, H, decor);
  else if (decor.art === 'pages') pages(scene, p, W, H);
  else if (decor.art === 'runes') runes(scene, p, W);
  else if (decor.art === 'hash-stream') hashStream(scene, p, W);
}

function compass(scene: Scene, p: Pen, W: number, H: number, decor: Decor) {
  const { glow, light, dark, base } = A.crossroads.accent;
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) / 2 - 1;
  // Round plaza of cipher-inscribed paving.
  p.disc(cx, cy, r + 1, r + 1, dark);
  p.disc(cx, cy, r, r, light);
  p.disc(cx, cy, r - 3, r - 3, '#d9c8a8');
  for (let ring = 0; ring < 24; ring++) {
    const a = (ring / 24) * Math.PI * 2;
    const x = cx + Math.cos(a) * (r - 1.5);
    const y = cy + Math.sin(a) * (r - 1.5);
    letter(p.rect, x - 1, y - 2, 'ABCDEFHKNQXZ'[ring % 12], base);
  }
  // Paving joints.
  for (let i = 1; i < 4; i++) p.rect(cx - r + 4, cy - r + i * (r / 2), (r - 4) * 2, 1, 'rgba(93, 79, 66, 0.25)');
  // The compass rose: four long points and four short ones, glowing softly.
  const pulse = scene.reduced ? 1 : 0.75 + Math.sin(scene.time / 900) * 0.25;
  const len = r - 7;
  withAlpha(() => {
    for (let i = 0; i < len; i++) {
      const half = Math.max(0, Math.round((len - i) / 5));
      p.rect(cx - half, cy - i - 1, half * 2 + 1, 1, i > len - 4 ? '#fff4c4' : glow);
      p.rect(cx - half, cy + i, half * 2 + 1, 1, glow);
      p.rect(cx + i, cy - half, 1, half * 2 + 1, glow);
      p.rect(cx - i - 1, cy - half, 1, half * 2 + 1, glow);
    }
    for (let i = 0; i < len * 0.55; i++) {
      p.rect(cx + i * 0.7, cy - i * 0.7, 1, 1, '#e0a93a');
      p.rect(cx - i * 0.7, cy - i * 0.7, 1, 1, '#e0a93a');
      p.rect(cx + i * 0.7, cy + i * 0.7, 1, 1, '#e0a93a');
      p.rect(cx - i * 0.7, cy + i * 0.7, 1, 1, '#e0a93a');
    }
  }, pulse);
  p.disc(cx, cy, 3, 3, dark);
  p.disc(cx, cy, 2, 2, '#fff4c4');
  void decor;
}

function pages(scene: Scene, p: Pen, W: number, H: number) {
  // Manuscripts drifting over the shelves, turning slowly.
  for (let i = 0; i < 7; i++) {
    const h = hash(i, 3, 17);
    const baseX = 8 + (h % (W - 16));
    const baseY = 6 + ((h >>> 8) % Math.max(1, H - 18));
    const t = scene.reduced ? 0 : scene.time / (2200 + (h % 900)) + i;
    const x = baseX + Math.sin(t) * 4;
    const y = baseY + Math.cos(t * 0.8) * 3;
    const flat = scene.reduced ? 1 : Math.abs(Math.sin(t * 1.3)) > 0.3 ? 1 : 0;
    p.rect(x - 1, y - 1, (flat ? 7 : 3) + 2, 6, 'rgba(27, 20, 16, 0.55)');
    p.rect(x, y, flat ? 7 : 3, 4, '#f6ecd2');
    if (flat) {
      p.rect(x + 1, y + 1, 5, 1, '#9e8f73');
      p.rect(x + 1, y + 2.5, 3, 1, '#9e8f73');
    }
  }
}

function runes(scene: Scene, p: Pen, W: number) {
  // Public values cross the bridge both ways: A from the west tower, B from the east tower.
  const t = scene.reduced ? 0.33 : (scene.time / 3200) % 1;
  const lift = scene.reduced ? 0 : Math.round(Math.sin(scene.time / 260) * 1);
  const tablet = (x: number, edge: string, bits: number) => {
    p.rect(x - 1, -1 + lift, 7, 7, OUTLINE);
    p.rect(x, lift, 5, 5, '#fff4cf');
    p.rect(x, lift, 5, 1, edge);
    rune(p.rect, x + 1, 1 + lift, bits, '#5d4037');
  };
  tablet(2 + (W - 10) * t, ALICE, 0b101011010110);
  tablet(W - 8 - (W - 10) * t, BOB, 0b011101100101);
}

function hashStream(scene: Scene, p: Pen, W: number) {
  const { glow } = A.fountain.accent;
  // Channels cut in the cobbles: in from the west, out to the east. The basin sits between.
  const inEnd = 4 * 16; // the fountain starts four tiles into the decor
  const outStart = 7 * 16;
  p.rect(0, 6, inEnd, 4, 'rgba(20, 40, 46, 0.45)');
  p.rect(outStart, 6, W - outStart, 4, 'rgba(20, 40, 46, 0.45)');
  // An arrow on each channel: the runes only ever flow one way.
  for (const x of [inEnd - 10, W - 8]) {
    p.rect(x, 7, 4, 2, 'rgba(127, 243, 255, 0.5)');
    p.rect(x + 4, 6, 1, 4, 'rgba(127, 243, 255, 0.5)');
  }
  const period = 2600;
  const k = scene.reduced ? 3 : Math.floor(scene.time / period);
  const f = scene.reduced ? 0.4 : (scene.time % period) / period;
  // Input: a message of 2 to 6 runes, a different length each time, flowing into the basin.
  const length = 2 + (hash(k, 1, 23) % 5);
  const head = -length * 5 + (inEnd + length * 5) * Math.min(1, f / 0.7);
  for (let i = 0; i < length; i++) {
    const x = head - i * 5;
    if (x < 0 || x > inEnd - 4) continue;
    rune(p.rect, x, 6, hash(k, i, 29), '#f6b26b');
  }
  // Output: always four glowing runes, a new unrelated pattern for each input.
  const shown = scene.reduced ? k : f > 0.55 ? k : k - 1;
  const g = scene.reduced ? 0.5 : f > 0.55 ? (f - 0.55) / 0.45 : 0.55 + f;
  const ox = outStart + 2 + Math.min(1, g) * 10;
  for (let i = 0; i < 4; i++) {
    const x = ox + i * 5;
    if (x > W - 4) continue;
    rune(p.rect, x, 6, hash(shown, i, 31), glow);
  }
}

// ── Lights ───────────────────────────────────────────────────────────────────

export interface Glow {
  x: number;
  y: number;
  colour: string;
  radius: number;
}

/** Extra light from the location art on one tile, in tile units from the tile's top-left. */
export function propGlow(scene: Scene, t: Tile | undefined, x: number, y: number): Glow | null {
  switch (t) {
    case 'lantern': {
      const flick = scene.reduced ? 0 : Math.sin(scene.time / 140 + x * 3) * 0.1;
      return { x: 0.5, y: 0.05, colour: `rgba(255, 190, 90, ${0.2 + flick})`, radius: 2.1 };
    }
    case 'anvil': return { x: 0.55, y: 0.3, colour: 'rgba(255, 140, 50, 0.2)', radius: 1.5 };
    case 'shrine': return shrineLit(scene, x, y) ? { x: 0.5, y: 0, colour: 'rgba(199, 182, 255, 0.26)', radius: 1.6 } : null;
    case 'seal': return litShrines(scene) >= SHARE_THRESHOLD ? { x: 0.5, y: 0.6, colour: 'rgba(170, 150, 255, 0.32)', radius: 2.2 } : null;
    case 'archway': return { x: 0.5, y: -0.3, colour: 'rgba(224, 90, 79, 0.18)', radius: 2.2 };
    case 'stained': return { x: 0.5, y: 1.4, colour: 'rgba(160, 140, 255, 0.12)', radius: 1.8 };
    default: return null;
  }
}

/** Light from a whole landmark, given its footprint, in tile units from its top-left. */
export function landmarkGlow(scene: Scene, t: Tile, x0: number, w: number, h: number): Glow[] {
  const pulse = scene.reduced ? 0 : Math.sin(scene.time / 520) * 0.05;
  switch (t) {
    case 'fountain': return [{ x: w / 2, y: 0.4, colour: `rgba(127, 243, 255, ${0.28 + pulse})`, radius: 2.6 }, { x: w / 2, y: h * 0.65, colour: 'rgba(80, 200, 220, 0.18)', radius: 2.4 }];
    case 'tower': {
      const solved = scene.open.size > 0;
      const west = x0 < scene.map[0].length / 2;
      return [
        { x: w / 2, y: 0.95, colour: west ? 'rgba(244, 143, 177, 0.22)' : 'rgba(100, 181, 246, 0.22)', radius: 1.4 },
        ...(solved ? [{ x: w / 2, y: -1.95, colour: `rgba(246, 212, 107, ${0.32 + pulse})`, radius: 2.4 }] : []),
      ];
    }
    case 'beds': return [{ x: w / 2, y: h / 2, colour: `rgba(215, 196, 255, ${0.2 + pulse})`, radius: 1.6 }];
    case 'stall': return [{ x: w - 0.5, y: 0.25, colour: 'rgba(255, 210, 122, 0.24)', radius: 2.2 }];
    case 'cave': return [{ x: w / 2, y: h - 1.2, colour: `rgba(155, 231, 255, ${(scene.open.size ? 0.3 : 0.16) + pulse})`, radius: 2.4 }];
    case 'table': return [{ x: w / 2, y: 0.3, colour: `rgba(255, 207, 107, ${0.3 + pulse})`, radius: 2.6 }];
    default: return [];
  }
}

// ── Grounds buildings ───────────────────────────────────────────────────────

/**
 * Silhouettes that turn the grounds buildings into their locations, drawn over the base building
 * (walls, roof, windows) in source pixels. `W` and `H` are the footprint in pixels; the roof covers
 * every row but the bottom two, and rises 5 px above the top row.
 */
export function drawBuildingArt(ctx2: CanvasRenderingContext2D, scene: Scene, kind: Tile, w: number, h: number, px: number, py: number, doors: number[]) {
  currentCtx = ctx2;
  const p = pen(ctx2, px, py, scene.unit);
  const W = w * 16;
  const roofH = Math.max(1, h - 2) * 16;
  if (kind === 'library') library(scene, p, W, roofH);
  else if (kind === 'keep') citadel(scene, p, W, roofH);
  else if (kind === 'crypt') forge(scene, p, W, roofH, doors);
  else if (kind === 'temple') ruins(scene, p, W, roofH);
  else if (kind === 'cabin') observatory(scene, p, W, roofH);
  else if (kind === 'greenhouse') conservatory(scene, p, W, roofH);
}

function spire(p: Pen, x: number, top: number, bottom: number, wide: number, body: string, shade: string, cap: string, window: string) {
  p.box(x, top, wide, bottom - top, body);
  p.rect(x + wide - 2, top, 2, bottom - top, shade);
  for (let i = 0; i < 10; i++) {
    const half = Math.max(0.5, (wide / 2) * (i / 10));
    p.rect(x + wide / 2 - half - 1, top - 10 + i, half * 2 + 2, 1, OUTLINE);
    p.rect(x + wide / 2 - half, top - 10 + i, half * 2, 1, cap);
  }
  p.rect(x + wide / 2 - 1, top + 4, 2, 5, window);
  p.rect(x + wide / 2 - 1, top + 12, 2, 5, window);
}

function library(scene: Scene, p: Pen, W: number, roofH: number) {
  const { base, dark, light, glow } = A.library.accent;
  // Two spires at the roof's ends.
  spire(p, -4, -24, roofH, 10, light, dark, base, glow);
  spire(p, W - 6, -24, roofH, 10, light, dark, base, glow);
  // A stained-glass rose window with a key at its heart.
  const cx = W / 2;
  const cy = Math.round(roofH / 2) - 2;
  p.disc(cx, cy, 11, 11, OUTLINE);
  p.disc(cx, cy, 10, 10, '#d9c38a');
  const panes = ['#5c6bc0', '#c62828', '#00897b', '#7e57c2', '#1e88e5', '#f9a825', '#43a047', '#8e24aa'];
  for (let y = -8; y < 8; y++) {
    for (let x = -8; x < 8; x++) {
      if (x * x + y * y > 64) continue;
      const sector = Math.floor(((Math.atan2(y, x) + Math.PI) / (Math.PI * 2)) * 8) % 8;
      p.rect(cx + x, cy + y, 1, 1, panes[sector]);
    }
  }
  p.disc(cx, cy, 3, 3, '#f6d46b');
  p.rect(cx - 1, cy - 1, 2, 2, OUTLINE);
  p.rect(cx - 0.5, cy + 2, 1, 6, '#f6d46b');
  p.rect(cx + 0.5, cy + 5, 2, 1, '#f6d46b');
  // Manuscripts floating up from the roof.
  for (let i = 0; i < 3; i++) {
    const t = scene.reduced ? i : scene.time / (1800 + i * 300) + i * 2;
    const x = cx - 30 + i * 26 + Math.sin(t) * 3;
    const y = -12 - i * 4 + Math.cos(t * 0.9) * 3;
    p.box(x, y, 6, 4, '#f6ecd2');
    p.rect(x + 1, y + 1, 4, 1, '#9e8f73');
  }
}

function citadel(scene: Scene, p: Pen, W: number, roofH: number) {
  const { dark, light, glow } = A.citadel.accent;
  // Twin geometric towers on the front corners.
  for (const [x, key] of [[-7, '#e0b84a'], [W - 7, '#cfd8dc']] as const) {
    p.box(x, -20, 14, roofH + 34, light);
    p.rect(x + 10, -20, 4, roofH + 34, dark);
    for (let y = -16; y < roofH + 12; y += 7) p.rect(x, y, 14, 1, 'rgba(0, 0, 0, 0.2)');
    for (let i = 0; i < 9; i++) {
      const half = 7 - i * 0.75;
      p.rect(x + 7 - half - 1, -29 + i, half * 2 + 2, 1, OUTLINE);
      p.rect(x + 7 - half, -29 + i, half * 2, 1, i < 3 ? glow : '#5b6573');
    }
    // A key on each tower: gold for the public key, silver for the private one.
    p.rect(x + 4, -12, 5, 5, key);
    p.rect(x + 5.5, -10.5, 2, 2, OUTLINE);
    p.rect(x + 6, -7, 1, 9, key);
    p.rect(x + 7, -1, 2, 1, key);
    p.rect(x + 7, 1, 2, 1, key);
  }
  // Prime engravings along the parapet: groups of 2, 3, 5, and 7 marks.
  let x = 14;
  for (const prime of [2, 3, 5, 7, 11]) {
    for (let i = 0; i < prime && x < W - 14; i++, x += 2) p.rect(x, roofH - 4, 1, 2, glow);
    x += 3;
  }
  // The inner vault in the middle of the roof: the private key never leaves it.
  const vx = W / 2 - 9;
  const vy = Math.round(roofH / 2) - 9;
  p.box(vx, vy, 18, 14, '#2b2f36');
  p.rect(vx + 1, vy + 1, 16, 2, '#4a515c');
  const pulse = scene.reduced ? 1 : 0.7 + wave(scene, 700) * 0.3;
  withAlpha(() => {
    p.rect(vx + 7, vy + 4, 4, 4, '#cfd8dc');
    p.rect(vx + 8, vy + 8, 2, 4, '#cfd8dc');
  }, pulse);
  p.rect(vx + 8, vy + 5, 2, 2, OUTLINE);
}

function forge(scene: Scene, p: Pen, W: number, roofH: number, doors: number[]) {
  const { glow } = A.forge.accent;
  // A wide brick chimney stack with the furnace's light at its mouth.
  const cx = W - 24;
  p.box(cx, -24, 16, roofH + 18, '#6d3326');
  for (let y = -20; y < roofH - 8; y += 4) {
    p.rect(cx, y, 16, 1, '#4a2219');
    p.rect(cx + (y % 8 ? 4 : 10), y - 3, 1, 3, '#4a2219');
  }
  p.box(cx - 2, -27, 20, 4, '#3e1d15');
  const flick = scene.reduced ? 1 : 0.7 + Math.sin(scene.time / 110) * 0.2 + Math.sin(scene.time / 47) * 0.1;
  const lick = scene.reduced ? 0 : Math.round(Math.sin(scene.time / 90) * 1.5);
  withAlpha(() => {
    p.rect(cx + 1, -32, 14, 5, glow);
    p.rect(cx + 3, -36 + lick, 10, 4, '#ff6f00');
    p.rect(cx + 5, -39 - lick, 6, 4, '#ffd27a');
    p.rect(cx + 7, -41 + lick, 2, 2, '#fff3c4');
  }, flick);
  // Embers glowing through cracks along the roof ridge: the furnace heats the whole forge.
  withAlpha(() => {
    for (let x = 6; x < cx - 4; x += 7) {
      p.rect(x, Math.round(roofH * 0.42) - 1, 3, 1, glow);
      p.rect(x + 1, Math.round(roofH * 0.42), 1, 2, '#ff6f00');
    }
  }, flick * 0.9);
  // Sparks drifting up.
  if (!scene.reduced) {
    for (let i = 0; i < 5; i++) {
      const t = (scene.time / 1600 + i / 5) % 1;
      p.rect(cx + 4 + i * 2 + Math.sin(t * 6 + i) * 3, -34 - t * 20, 1, 1, t < 0.5 ? '#ffd27a' : glow);
    }
  }
  // A furnace mouth beside the door, glowing and flickering.
  const door = doors[0] ?? 0;
  const mouth = door > 1 ? 1 : 3;
  const fx = mouth * 16 + 2;
  const fy = roofH + 3;
  p.rect(fx - 1, fy - 1, 14, 13, OUTLINE);
  p.rect(fx, fy + 2, 12, 10, '#2a120c');
  p.rect(fx + 2, fy, 8, 2, '#2a120c');
  withAlpha(() => {
    p.rect(fx + 1, fy + 5, 10, 6, glow);
    p.rect(fx + 3, fy + 3, 6, 3, '#ff6f00');
    p.rect(fx + 4, fy + 7, 4, 3, '#ffd27a');
  }, flick);
  // Ingots: messages cut into equal blocks, stacked by the wall.
  const ix = (door > 3 ? 1 : 4) * 16 + 1;
  for (let i = 0; i < 3; i++) p.box(ix + i * 5, roofH + 26, 4, 3, i === 1 ? '#e0b84a' : '#b0bec5');
  p.box(ix + 2, roofH + 22, 4, 3, '#b0bec5');
  p.box(ix + 7, roofH + 22, 4, 3, '#b0bec5');
}

function ruins(scene: Scene, p: Pen, W: number, roofH: number) {
  const { dark, glow } = A.ruins.accent;
  // Missing roof tiles at the corners, and cracks.
  p.rect(-4, -6, 14, 8, OUTLINE);
  p.rect(-3, -5, 12, 6, '#7aa05a');
  p.rect(W - 10, -6, 14, 6, OUTLINE);
  p.rect(W - 9, -5, 12, 4, '#7aa05a');
  for (const [x, y] of [[18, 6], [W - 26, 12], [W / 2 + 14, 4]]) {
    p.rect(x, y, 1, 4, OUTLINE);
    p.rect(x + 1, y + 3, 1, 4, OUTLINE);
    p.rect(x + 2, y + 6, 1, 3, OUTLINE);
  }
  // Vigenère mosaic frieze: a tabula recta of coloured squares, each row shifted by one.
  const tiles = ['#c0563a', '#e8c170', '#4f8a8b', '#f3e3bd'];
  for (let j = 0; j < 2; j++) for (let i = 0; i * 3 < W - 6; i++) p.rect(3 + i * 3, roofH - 7 + j * 3, 3, 3, tiles[(i + j) % 4]);
  p.rect(3, roofH - 8, W - 6, 1, dark);
  // The Caesar wheel on the pediment: the outer ring stays, the inner ring steps three letters at a time.
  const cx = W / 2;
  const cy = -2;
  p.disc(cx, cy, 9, 9, OUTLINE);
  p.disc(cx, cy, 8, 8, '#eadfc6');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.rect(cx + Math.cos(a) * 6.5 - 0.5, cy + Math.sin(a) * 6.5 - 0.5, 1, 1, '#6d4c41');
  }
  p.disc(cx, cy, 5, 5, '#b8860b');
  const step = scene.reduced ? 3 : (Math.floor(scene.time / 1400) * 3) % 26;
  const a = (step / 26) * Math.PI * 2 - Math.PI / 2;
  for (let i = 0; i < 4; i++) p.rect(cx + Math.cos(a) * i - 0.5, cy + Math.sin(a) * i - 0.5, 1, 1, '#b71c1c');
  p.rect(cx - 1, cy - 1, 2, 2, OUTLINE);
  p.rect(cx - 0.5, cy - 9, 1, 2, glow);
  // Alphabet pillars: letters carved up the pillars beside the door and the corners.
  void scene;
}

/** Letters carved on a ruins pillar, drawn after the pillar tiles. */
export function drawPillarLetters(ctx2: CanvasRenderingContext2D, scene: Scene, index: number, px: number, py: number) {
  const p = pen(ctx2, px, py, scene.unit);
  const word = 'ABCDEFHKNQXZ';
  for (let i = 0; i < 3; i++) letter(p.rect, 6, 3 + i * 9, word[(index * 3 + i) % word.length], '#f3e3bd');
}

function observatory(scene: Scene, p: Pen, W: number, roofH: number) {
  const { base, dark, light, glow } = A.observatory.accent;
  const cx = W / 2;
  // A dome over the roof, with a slit.
  p.disc(cx, roofH - 2, 23, 24, OUTLINE);
  p.disc(cx, roofH - 2, 22, 23, base);
  p.disc(cx - 4, roofH - 6, 14, 15, light);
  p.disc(cx - 2, roofH - 4, 16, 17, base);
  p.rect(cx - 24, roofH - 2, 48, 4, dark);
  p.rect(cx - 2, roofH - 24, 4, 20, '#0d1230');
  // Three telescopes: one in the dome, one on each side turret.
  const sway = scene.reduced ? 0 : wave(scene, 2600) * 4;
  const target = { x: cx + sway, y: -38 };
  const scopes = [{ x: 8, y: roofH - 6 }, { x: cx, y: roofH - 22 }, { x: W - 8, y: roofH - 6 }];
  for (const [i, s] of scopes.entries()) {
    if (i !== 1) {
      p.disc(s.x, s.y + 4, 7, 6, OUTLINE);
      p.disc(s.x, s.y + 4, 6, 5, light);
    }
    const dx = target.x - s.x;
    const dy = target.y - s.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    for (let t = 0; t < 7; t++) p.rect(s.x + ux * t - 1, s.y + uy * t - 1, 3, 3, t === 6 ? '#cfd8dc' : '#78909c');
    // Each beam leaves its own telescope and meets the others in one constellation.
    withAlpha(() => {
      for (let t = 8; t < len - 2; t += 2) p.rect(s.x + ux * t, s.y + uy * t, 1, 1, glow);
    }, 0.55);
  }
  // The shared constellation.
  const twinkle = scene.reduced ? 1 : 0.6 + wave(scene, 300) * 0.4;
  const stars = [[-8, 2], [-3, -3], [3, 0], [8, -4], [1, 5]];
  withAlpha(() => {
    for (let i = 0; i < stars.length - 1; i++) {
      const [ax, ay] = stars[i];
      const [bx, by] = stars[i + 1];
      for (let t = 0; t <= 1; t += 0.2) p.rect(target.x + ax + (bx - ax) * t, target.y + ay + (by - ay) * t, 1, 1, '#8c7bd6');
    }
  }, 0.8);
  withAlpha(() => {
    for (const [x, y] of stars) {
      p.rect(target.x + x - 1, target.y + y, 3, 1, '#ffffff');
      p.rect(target.x + x, target.y + y - 1, 1, 3, '#ffffff');
    }
  }, twinkle);
}

function conservatory(scene: Scene, p: Pen, W: number, roofH: number) {
  // Two overlapping beds seen through the glass, the shared lens glowing.
  const cy = Math.round(roofH / 2);
  const pulse = scene.reduced ? 0.5 : 0.45 + wave(scene, 900) * 0.15;
  withAlpha(() => {
    p.disc(W / 2 - 8, cy, 12, 9, '#f48fb1');
    p.disc(W / 2 + 8, cy, 12, 9, '#ffd54f');
  }, 0.35);
  withAlpha(() => p.disc(W / 2, cy, 5, 7, '#ffffff'), pulse);
}
