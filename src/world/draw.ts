import floorsUrl from '../assets/pixel-crawler/floors.png';
import dungeonUrl from '../assets/pixel-crawler/dungeon.png';
import waterUrl from '../assets/pixel-crawler/water.png';
import vegetationUrl from '../assets/pixel-crawler/vegetation.png';
import logUrl from '../assets/pixel-crawler/log.png';
import { CHARACTER_BY_ID } from '../characters/cast';
import { SPRITE_H, SPRITE_W, sprite, type Facing } from '../characters/sprites';
import { BUILDINGS, LANDMARKS, type Decor, type Spot, type Tile } from './map';
import {
  OUTLINE, SHARE_THRESHOLD, drawArchway, drawBuildingArt, drawDecor, drawLandmark, drawLetters, drawPillarLetters, drawProp, drawWallPiece,
  landmarkGlow, litShrines, propGlow,
} from './landmarks';
import { LOCATION_BY_ID } from './locations';

export interface PaintState {
  map: Tile[][];
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  spots: Spot[];
  openCells: Set<string>;
  time: number;
  reduced: boolean;
  insetTop: number;
  insetBottom: number;
  /** True while the player is walking, for the walk cycle. */
  walking?: boolean;
  /** The spot the HUD's next goal points at, marked with a ring and an arrow. */
  goal?: Spot | null;
  /** Spot under the player's feet: a soft pulse so interactables read clearly. */
  near?: Spot | null;
  /** Bit, the cipher companion, floating beside the player. `image` is its 16 × 16 sprite frame. */
  companion?: { x: number; y: number; image: HTMLCanvasElement } | null;
  /** Flat location artwork over the ground. */
  decor?: Decor[];
}

function load(src: string) {
  const image = new Image();
  image.src = src;
  return image;
}

const floors = load(floorsUrl);
const dungeon = load(dungeonUrl);
const water = load(waterUrl);
const vegetation = load(vegetationUrl);
const logs = load(logUrl);

/** Pixel rectangles in vegetation.png: [x, y, w, h]. Colour variants sit 48 px apart. */
const VEG = {
  bigBush: [2, 99, 43, 43],
  roundBush: [198, 6, 35, 33],
  shadowBush: [194, 86, 39, 33],
  smallBush: [2, 5, 29, 27],
  leaf: [80, 147, 31, 25],
  fern: [112, 166, 32, 26],
  cattail: [145, 166, 15, 26],
  lupine: [195, 161, 11, 31],
  lupineSmall: [212, 165, 9, 27],
  sprout: [97, 177, 14, 15],
  sproutSmall: [3, 178, 11, 13],
  deadTree: [164, 290, 39, 46],
  mushroom: [49, 338, 14, 14],
  mushroomSmall: [36, 340, 8, 9],
  crystal: [19, 353, 11, 14],
  rocks: [256, 400, 15, 16],
  rock: [224, 416, 11, 10],
  pebble: [242, 403, 10, 8],
} as const;

/** Small flowers: four colour rows, five shapes each. */
const FLOWER_ROWS = [373, 389, 405, 421];
const FLOWER_COLS = [53, 69, 86, 100, 117];

/** Teal flagstones in dungeon.png that tile cleanly. */
const DUNGEON_FLOOR: [number, number][] = [
  [5, 1], [5, 1], [4, 0], [5, 0], [6, 0], [4, 1], [6, 1], [4, 2], [5, 2], [6, 2], [5, 1], [6, 1],
];

type Ground = 'grass' | 'dirt' | 'cobble' | 'water' | 'dungeon' | 'sand' | 'paving' | 'bridge' | 'wall';

/** The ground a tile is painted on. Objects return null and borrow the ground around them. */
function groundOf(tile: Tile | undefined): Ground | null {
  switch (tile) {
    case 'grass': return 'grass';
    case 'path': return 'dirt';
    case 'cobble': return 'cobble';
    case 'water': return 'water';
    case 'bridge': return 'bridge';
    case 'stone': case 'engraving': case 'grate': return 'dungeon';
    case 'plank': return 'sand';
    case 'paving': return 'paving';
    case 'wall': case 'torch': case 'vent': case 'banner': case 'stained': case 'flag': return 'wall';
    default: return null;
  }
}

const WALLISH = new Set<Tile>(['wall', 'torch', 'vent', 'banner', 'stained', 'flag']);

function hash(x: number, y: number, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export function paint(ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number, state: PaintState) {
  const padTop = state.insetTop * dpr;
  const padBottom = state.insetBottom * dpr;
  const viewPxW = width;
  const viewPxH = Math.max(1, height - padTop - padBottom);
  const map = state.map;
  const cols = map[0].length;
  const rows = map.length;
  // Grow the room until it touches the screen, and keep the whole map visible.
  const fit = Math.min(viewPxW / (cols * 16 * dpr), viewPxH / (rows * 16 * dpr));
  // On a narrow screen a large room would shrink to unreadable tiles: keep tiles at least 26 px and follow the player.
  const narrow = viewPxW / dpr < 640;
  const zoom = narrow ? Math.max(fit, 26 / 16) : fit;
  // Snap each source pixel to a whole number of device pixels when that costs little, so the
  // pixel art stays crisp: round up when the camera follows the player, round down when the room
  // must fit on screen.
  const raw = zoom * dpr;
  const unit = narrow ? Math.ceil(raw) : Math.floor(raw) >= 1 && Math.floor(raw) / raw >= 0.75 ? Math.floor(raw) : raw;
  const tile = 16 * unit;
  const viewW = viewPxW / tile;
  const viewH = viewPxH / tile;
  let camX = state.x - viewW / 2;
  let camY = state.y - viewH / 2;
  const maxX = cols - viewW;
  const maxY = rows - viewH;
  camX = maxX < 0 ? maxX / 2 : Math.min(maxX, Math.max(0, camX));
  camY = maxY < 0 ? maxY / 2 : Math.min(maxY, Math.max(0, camY));

  ctx.canvas.width = width;
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#241c18';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, padTop, viewPxW, viewPxH);
  ctx.clip();
  ctx.translate(0, padTop);

  const x0 = Math.max(0, Math.floor(camX) - 8);
  const y0 = Math.max(0, Math.floor(camY) - 6);
  const x1 = Math.min(cols - 1, Math.ceil(camX + viewW) + 1);
  const y1 = Math.min(rows - 1, Math.ceil(camY + viewH) + 3);
  const frame = state.reduced ? 0 : Math.floor(state.time / 450) % 4;
  const ctxInfo: Room = { map, cols, rows, unit, tile, camX, camY, frame, time: state.time, reduced: state.reduced, open: state.openCells };
  const sx = (x: number) => Math.round((x - camX) * tile);
  const sy = (y: number) => Math.round((y - camY) * tile);

  // 1. Ground.
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) drawGround(ctx, ctxInfo, x, y, sx(x), sy(y));
  }
  // 2. Flat decoration on the ground and on wall faces, then the location's flat artwork.
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) drawDecal(ctx, ctxInfo, x, y, sx(x), sy(y));
  }
  for (const decor of state.decor ?? []) drawDecor(ctx, ctxInfo, decor, sx(decor.x), sy(decor.y));

  // Soft pulse under whatever the player can use right now.
  if (state.near) {
    const pulse = state.reduced ? 0.55 : (Math.sin(state.time / 200) + 1) / 2;
    const nx = (state.near.x - camX) * tile;
    const ny = (Math.floor(state.near.y) + 0.82 - camY) * tile;
    ctx.fillStyle = `rgba(246, 212, 107, ${0.12 + pulse * 0.18})`;
    ctx.beginPath();
    ctx.ellipse(nx, ny, tile * (0.55 + pulse * 0.1), tile * (0.2 + pulse * 0.04), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 248, 225, ${0.45 + pulse * 0.4})`;
    ctx.lineWidth = Math.max(2, unit * 1.5);
    ctx.beginPath();
    ctx.ellipse(nx, ny, tile * (0.48 + pulse * 0.08), tile * (0.18 + pulse * 0.03), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // A ring on the ground under the next goal (skipped when it is already the near spot).
  if (state.goal && state.goal.id !== state.near?.id) {
    const pulse = state.reduced ? 0.5 : (Math.sin(state.time / 260) + 1) / 2;
    const gx = (state.goal.x - camX) * tile;
    const gy = (Math.floor(state.goal.y) + 0.82 - camY) * tile;
    ctx.strokeStyle = `rgba(246, 212, 107, ${0.55 + pulse * 0.4})`;
    ctx.lineWidth = Math.max(3, unit * 2);
    ctx.beginPath();
    ctx.ellipse(gx, gy, tile * (0.42 + pulse * 0.08), tile * (0.16 + pulse * 0.03), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Standing objects and people, sorted by their feet.
  const sprites: { y: number; draw: () => void }[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const draw = standing(ctx, ctxInfo, x, y, sx(x), sy(y));
      if (draw) sprites.push({ y: draw.depth ?? y + 0.9, draw });
    }
  }
  for (const spot of state.spots) {
    const character = spot.characterId ? CHARACTER_BY_ID[spot.characterId] : undefined;
    if (character) {
      // NPCs turn to face the player when the player comes close.
      const dx = state.x - spot.x;
      const dy = state.y - spot.y;
      const near = Math.hypot(dx, dy) < 3;
      const facing: Facing = !near ? 'down' : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy < 0 ? 'up' : 'down';
      sprites.push({ y: spot.y, draw: () => drawActor(ctx, spot.x, spot.y, camX, camY, unit, sprite(character.id, facing, 0)) });
    }
  }
  const step = state.walking && !state.reduced ? [1, 0, 2, 0][Math.floor(state.time / 130) % 4] : 0;
  sprites.push({ y: state.y, draw: () => drawActor(ctx, state.x, state.y, camX, camY, unit, sprite('player', state.facing, step)) });
  const bit = state.companion;
  if (bit) sprites.push({ y: bit.y, draw: () => drawCompanion(ctx, bit.x, bit.y, camX, camY, unit, bit.image, state.time, state.reduced) });
  sprites.sort((a, b) => a.y - b.y);
  for (const sprite of sprites) sprite.draw();

  // 4. Light, then labels on top so nothing hides them.
  drawLight(ctx, ctxInfo, x0, y0, x1, y1, sx, sy);
  for (const spot of state.spots) {
    const character = spot.characterId ? CHARACTER_BY_ID[spot.characterId] : undefined;
    const label = character ? character.tag : spot.mark;
    if (label) drawTag(ctx, label, spot.x, labelY(map, spot), camX, camY, tile);
  }
  if (state.goal) {
    const gx = state.goal.x;
    const gy = state.goal.y;
    const inView = gx > camX + 0.3 && gx < camX + viewW - 0.3 && gy > camY + 0.3 && gy < camY + viewH - 0.3;
    if (inView) drawGoalArrow(ctx, state.goal, labelY(map, state.goal), camX, camY, tile, unit, state.time, state.reduced);
    else drawEdgePointer(ctx, gx, gy, state.x, state.y, camX, camY, viewPxW, viewPxH, tile, unit, state.time, state.reduced);
  }
  ctx.restore();
}

interface Room {
  map: Tile[][];
  cols: number;
  rows: number;
  unit: number;
  tile: number;
  camX: number;
  camY: number;
  frame: number;
  time: number;
  reduced: boolean;
  open: Set<string>;
}

/** A door in a building wears its label above the roof, clear of the emblem over the door. */
function labelY(map: Tile[][], spot: Spot) {
  const x = Math.floor(spot.x);
  let y = Math.floor(spot.y);
  if (spot.kind !== 'door' || !BUILDINGS.has(map[y - 1]?.[x] as Tile)) return spot.y;
  while (BUILDINGS.has(map[y - 1]?.[x] as Tile)) y--;
  return y + 1.45 - 0.45;
}

function ready(image: HTMLImageElement) {
  return image.complete && image.naturalWidth > 0;
}

function cell(ctx: CanvasRenderingContext2D, image: HTMLImageElement, col: number, row: number, x: number, y: number, unit: number) {
  if (!ready(image)) return false;
  // Round up so neighbouring tiles overlap by a fraction of a pixel instead of leaving seams.
  const size = Math.ceil(16 * unit) + 1;
  ctx.drawImage(image, col * 16, row * 16, 16, 16, x, y, size, size);
  return true;
}

/** Draw a sprite rectangle with its bottom centre at (cx, bottom). */
function stamp(ctx: CanvasRenderingContext2D, image: HTMLImageElement, rect: readonly number[], cx: number, bottom: number, unit: number, scale = 1) {
  if (!ready(image)) return;
  const [rx, ry, rw, rh] = rect;
  const w = rw * unit * scale;
  const h = rh * unit * scale;
  ctx.drawImage(image, rx, ry, rw, rh, Math.round(cx - w / 2), Math.round(bottom - h), Math.round(w), Math.round(h));
}

function variant(rect: readonly number[], k: number): number[] {
  return [rect[0] + 48 * k, rect[1], rect[2], rect[3]];
}

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, size: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.ceil(size) + 1, Math.ceil(size) + 1);
}

function at(room: Room, x: number, y: number): Tile | undefined {
  return room.map[y]?.[x];
}

/** Ground under an object: the first ground found around it. */
function baseGround(room: Room, x: number, y: number): Ground {
  const own = groundOf(at(room, x, y));
  if (own && own !== 'wall') return own;
  const ring: [number, number][] = [[0, 1], [0, -1], [-1, 0], [1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0], [0, -2]];
  for (const [dx, dy] of ring) {
    const g = groundOf(at(room, x + dx, y + dy));
    if (g && g !== 'wall' && g !== 'water' && g !== 'bridge') return g;
  }
  // An object in the middle of a bridge (the bridge gate) stands on the planks.
  if (groundOf(at(room, x - 1, y)) === 'bridge' || groundOf(at(room, x, y - 1)) === 'bridge') return 'bridge';
  return stoneRoom(room.map) ? 'dungeon' : 'grass';
}

const themes = new WeakMap<Tile[][], boolean>();

/** A room with more flagstone or paving than grass, sand, or dirt gets stone walls; the rest get timber. */
function stoneRoom(map: Tile[][]): boolean {
  const known = themes.get(map);
  if (known !== undefined) return known;
  let stone = 0;
  let other = 0;
  for (const row of map) {
    for (const t of row) {
      const g = groundOf(t);
      if (g === 'dungeon' || g === 'paving') stone++;
      else if (g === 'grass' || g === 'sand' || g === 'dirt' || g === 'cobble') other++;
    }
  }
  const result = stone > other;
  themes.set(map, result);
  return result;
}

/** Stone rooms get dungeon walls. Outdoor buildings and timber rooms keep log walls. */
function dungeonWall(room: Room) {
  return stoneRoom(room.map);
}

/** Ground the water shore should curve towards. Bridges, walls, and objects on a bridge are not land. */
function isLand(room: Room, x: number, y: number) {
  const tile = at(room, x, y);
  if (!tile) return false;
  const g = groundOf(tile) ?? baseGround(room, x, y);
  return g !== 'water' && g !== 'wall' && g !== 'bridge';
}

function drawGroundKind(ctx: CanvasRenderingContext2D, room: Room, kind: Ground, x: number, y: number, px: number, py: number) {
  const { unit, tile } = room;
  const h = hash(x, y);
  if (kind === 'grass') {
    if (!cell(ctx, floors, 1 + (h % 3), (h >>> 3) % 5 === 0 ? 11 : 10, px, py, unit)) fill(ctx, '#7cb342', px, py, tile);
  } else if (kind === 'dirt') {
    if (!cell(ctx, floors, 11 + (h % 3), (h >>> 3) % 5 === 0 ? 11 : 10, px, py, unit)) fill(ctx, '#a97845', px, py, tile);
  } else if (kind === 'cobble') {
    if (!cell(ctx, floors, 6 + (h % 3), (h >>> 3) % 5 === 0 ? 11 : 10, px, py, unit)) fill(ctx, '#9e9278', px, py, tile);
  } else if (kind === 'paving') {
    if (!cell(ctx, floors, 16 + (h % 3), 1 + ((h >>> 3) % 3), px, py, unit)) fill(ctx, '#a1958a', px, py, tile);
  } else if (kind === 'sand') {
    if (!cell(ctx, floors, (x + y) % 2 === 0 ? 7 : 8, 22, px, py, unit)) fill(ctx, '#c4a574', px, py, tile);
  } else if (kind === 'dungeon') {
    const [c, r] = DUNGEON_FLOOR[h % DUNGEON_FLOOR.length];
    if (!cell(ctx, dungeon, c, r, px, py, unit)) fill(ctx, '#3d4f4c', px, py, tile);
  } else if (kind === 'water' || kind === 'bridge') {
    drawWater(ctx, room, x, y, px, py);
    if (kind === 'bridge') drawBridge(ctx, room, x, y, px, py);
  }
}

function drawWater(ctx: CanvasRenderingContext2D, room: Room, x: number, y: number, px: number, py: number) {
  const { unit, tile, frame } = room;
  const off = 6 * frame;
  // Shore pieces come from the island in water.png: land on one side, water on the other.
  let col = 5 + off;
  let row = (x + y) % 5;
  if (isLand(room, x, y - 1)) { col = 2 + off; row = 4; }
  else if (isLand(room, x, y + 1)) { col = 2 + off; row = 0; }
  else if (isLand(room, x - 1, y)) { col = 4 + off; row = 2; }
  else if (isLand(room, x + 1, y)) { col = 0 + off; row = 2; }
  if (!cell(ctx, water, col, row, px, py, unit)) fill(ctx, '#4f8ccf', px, py, tile);
}

function drawBridge(ctx: CanvasRenderingContext2D, room: Room, x: number, y: number, px: number, py: number) {
  const { unit } = room;
  const across = at(room, x - 1, y) === 'bridge' || at(room, x + 1, y) === 'bridge' || groundOf(at(room, x - 1, y)) !== 'water';
  ctx.save();
  if (!across) {
    ctx.translate(px + 8 * unit, py + 8 * unit);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-px - 8 * unit, -py - 8 * unit);
  }
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = (i + x) % 2 === 0 ? '#9a6b40' : '#86592f';
    ctx.fillRect(px + i * 4 * unit, py + 2 * unit, 3.5 * unit, 12 * unit);
    ctx.fillStyle = '#5d3b1e';
    ctx.fillRect(px + i * 4 * unit + unit, py + 4 * unit, unit, unit);
  }
  ctx.fillStyle = '#4e2f17';
  ctx.fillRect(px, py + unit, 16 * unit, 1.5 * unit);
  ctx.fillRect(px, py + 13.5 * unit, 16 * unit, 1.5 * unit);
  ctx.restore();
}

/** A torch with no wall behind it stands on the floor as a brazier. */
function brazier(room: Room, x: number, y: number) {
  const behind = at(room, x, y - 1);
  return at(room, x, y) === 'torch' && behind !== undefined && !WALLISH.has(behind);
}

function drawGround(ctx: CanvasRenderingContext2D, room: Room, x: number, y: number, px: number, py: number) {
  const t = at(room, x, y)!;
  const g = groundOf(t);
  if (brazier(room, x, y)) {
    drawGroundKind(ctx, room, baseGround(room, x, y), x, y, px, py);
    return;
  }
  if (g === 'wall') {
    drawWall(ctx, room, x, y, px, py);
    return;
  }
  drawGroundKind(ctx, room, g ?? baseGround(room, x, y), x, y, px, py);
}

function drawWall(ctx: CanvasRenderingContext2D, room: Room, x: number, y: number, px: number, py: number) {
  const { unit, tile } = room;
  if (!dungeonWall(room)) {
    if (!ready(logs)) fill(ctx, '#8d5a32', px, py, tile);
    else ctx.drawImage(logs, px, py, Math.ceil(tile) + 1, Math.ceil(tile) + 1);
    return;
  }
  const below = at(room, x, y + 1);
  const side = WALLISH.has(at(room, x - 1, y) as Tile) || WALLISH.has(at(room, x + 1, y) as Tile);
  const face = below !== undefined && !WALLISH.has(below) && side;
  if (face) {
    if (!cell(ctx, dungeon, x % 3, 1, px, py, unit)) fill(ctx, '#4a4a55', px, py, tile);
    return;
  }
  const belowFace = below !== undefined && WALLISH.has(below) && !WALLISH.has(at(room, x, y + 2) as Tile);
  if (belowFace) {
    if (!cell(ctx, dungeon, 1, 14, px, py, unit)) fill(ctx, '#1c1a1f', px, py, tile);
    return;
  }
  fill(ctx, '#1d1b20', px, py, tile);
  ctx.fillStyle = '#2a2830';
  ctx.fillRect(px, py, tile, unit);
}

function drawDecal(ctx: CanvasRenderingContext2D, room: Room, x: number, y: number, px: number, py: number) {
  const t = at(room, x, y)!;
  const { unit, tile } = room;
  const h = hash(x, y, 7);
  // Dirt and cobble paths bleed into the grass beside them.
  if (groundOf(t) === 'grass' || (groundOf(t) === null && !WALLISH.has(t) && baseGround(room, x, y) === 'grass')) {
    const edges: [number, number, number, number][] = [[0, -1, 0, -1], [0, 1, 0, 1], [-1, 0, -1, 0], [1, 0, 1, 0]];
    for (const [dx, dy, ox, oy] of edges) {
      const n = groundOf(at(room, x + dx, y + dy));
      const centre = n === 'dirt' ? 12 : n === 'cobble' ? 7 : 0;
      if (centre) cell(ctx, floors, centre + ox, 2 + oy, px, py, unit);
    }
  }
  if (t === 'flower') {
    const count = 2 + (h % 2);
    const colour = FLOWER_ROWS[(h >>> 4) % FLOWER_ROWS.length];
    for (let i = 0; i < count; i++) {
      const fx = FLOWER_COLS[(h >>> (6 + i * 3)) % FLOWER_COLS.length];
      const ox = 3 + ((h >>> (9 + i * 4)) % 10);
      const oy = 6 + ((h >>> (12 + i * 5)) % 9);
      stamp(ctx, vegetation, [fx, colour, 8, 7], px + ox * unit, py + oy * unit, unit);
    }
  }
  if (t === 'plants') {
    const pick = [VEG.fern, VEG.cattail, VEG.lupine, VEG.sprout, VEG.leaf, VEG.lupineSmall, VEG.sproutSmall][h % 7];
    stamp(ctx, vegetation, pick, px + 8 * unit, py + 15 * unit, unit, pick[2] > 20 ? 0.7 : 1);
  }
  if (t === 'mushroom') {
    stamp(ctx, vegetation, VEG.mushroom, px + 6 * unit, py + 13 * unit, unit);
    stamp(ctx, vegetation, VEG.mushroomSmall, px + 12 * unit, py + 15 * unit, unit);
  }
  if (t === 'carpet') {
    const vertical = at(room, x, y - 1) === 'carpet' || at(room, x, y + 1) === 'carpet';
    // The runner sits half a tile off the grid in dungeon.png, at x 88 to 103.
    const size = Math.ceil(tile) + 1;
    if (ready(dungeon)) {
      if (vertical) ctx.drawImage(dungeon, 88, 176, 16, 16, px, py, size, size);
      else {
        ctx.save();
        ctx.translate(px + tile / 2, py + tile / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(dungeon, 88, 176, 16, 16, -tile / 2, -tile / 2, size, size);
        ctx.restore();
      }
    }
  }
  if (t === 'grate') cell(ctx, dungeon, 7, 10, px, py, unit);
  if (t === 'letters') drawLetters(ctx, room, x, y, px, py);
  if (t === 'stained' || t === 'flag') drawWallPiece(ctx, room, t, x, px, py);
  if (t === 'engraving') {
    ctx.fillStyle = 'rgba(15, 30, 30, 0.55)';
    ctx.fillRect(px + 2 * unit, py + 3 * unit, 12 * unit, 10 * unit);
    ctx.fillStyle = '#9fd3c7';
    const glyphs = 3;
    for (let i = 0; i < glyphs; i++) {
      const gx = px + (3 + i * 4) * unit;
      const shape = (h >>> (i * 3)) % 4;
      ctx.fillRect(gx, py + 5 * unit, 2 * unit, unit);
      if (shape !== 0) ctx.fillRect(gx + (shape === 1 ? 0 : unit), py + 6 * unit, unit, 3 * unit);
      if (shape === 2) ctx.fillRect(gx, py + 9 * unit, 2 * unit, unit);
      if (shape === 3) ctx.fillRect(gx + unit, py + 8 * unit, 2 * unit, unit);
    }
  }
  if (t === 'vent') {
    cell(ctx, dungeon, 4, 18, px, py, unit);
  }
  if (t === 'banner') {
    cell(ctx, dungeon, 6, 12, px, py, unit);
  }
  if (t === 'torch' && brazier(room, x, y)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(px + 8 * unit, py + 14 * unit, 5 * unit, 1.5 * unit, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#37474f';
    ctx.fillRect(px + 4 * unit, py + 12 * unit, unit, 2.5 * unit);
    ctx.fillRect(px + 11 * unit, py + 12 * unit, unit, 2.5 * unit);
    ctx.fillRect(px + 7 * unit, py + 9 * unit, 2 * unit, 4 * unit);
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(px + 3 * unit, py + 7 * unit, 10 * unit, 3 * unit);
    ctx.fillStyle = '#263238';
    ctx.fillRect(px + 4 * unit, py + 9 * unit, 8 * unit, unit);
    const flicker = room.reduced ? 0 : Math.floor(room.time / 150 + x) % 3;
    ctx.fillStyle = ['#ff6f00', '#ffa000', '#ffca28'][flicker];
    ctx.fillRect(px + 4 * unit, py + 3 * unit, 8 * unit, 4 * unit);
    ctx.fillRect(px + (6 + (flicker === 1 ? 1 : 0)) * unit, py + unit, 3 * unit, 2 * unit);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(px + 6 * unit, py + 4 * unit, 4 * unit, 2 * unit);
  } else if (t === 'torch') {
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(px + 7 * unit, py + 8 * unit, 2 * unit, 5 * unit);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(px + 6 * unit, py + 7 * unit, 4 * unit, 2 * unit);
    const flicker = room.reduced ? 0 : Math.floor(room.time / 160 + x) % 3;
    ctx.fillStyle = ['#ff6f00', '#ffa000', '#ffca28'][flicker];
    ctx.fillRect(px + 6 * unit, py + 3 * unit, 4 * unit, 4 * unit);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(px + 7 * unit, py + 4 * unit, 2 * unit, 2 * unit);
  }
  // Glow pooled on the floor in front of a vent, from the 3 × 3 glow block in dungeon.png.
  for (let dy = 1; dy <= 3; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (at(room, x - dx, y - dy) === 'vent' && groundOf(t) === 'dungeon' && t !== 'carpet') {
        ctx.globalAlpha = 0.6;
        cell(ctx, dungeon, 4 + dx, 18 + dy, px, py, unit);
        ctx.globalAlpha = 1;
      }
    }
  }
  if (t === 'shelf') drawShelf(ctx, room, x, y, px, py);
  if (t === 'desk') {
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(px + unit, py + 11 * unit, 2 * unit, 4 * unit);
    ctx.fillRect(px + 13 * unit, py + 11 * unit, 2 * unit, 4 * unit);
    ctx.fillStyle = '#795548';
    ctx.fillRect(px, py + 5 * unit, tile, 6 * unit);
    ctx.fillStyle = '#a1887f';
    ctx.fillRect(px, py + 5 * unit, tile, unit);
    ctx.fillStyle = '#efe6d4';
    ctx.fillRect(px + 3 * unit, py + 3 * unit, 5 * unit, 3 * unit);
    ctx.fillStyle = '#3949ab';
    ctx.fillRect(px + 10 * unit, py + 2 * unit, 2 * unit, 4 * unit);
  }
  if (t === 'wheel') {
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath();
    ctx.arc(px + 8 * unit, py + 8 * unit, 6.5 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6d46b';
    ctx.beginPath();
    ctx.arc(px + 8 * unit, py + 8 * unit, 5 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6d4c41';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + (room.reduced ? 0 : room.time / 4000);
      ctx.fillRect(px + 8 * unit + Math.cos(a) * 4 * unit - unit / 2, py + 8 * unit + Math.sin(a) * 4 * unit - unit / 2, unit, unit);
    }
    ctx.fillRect(px + 7 * unit, py + 7 * unit, 2 * unit, 2 * unit);
  }
  if (t === 'block') {
    fill(ctx, '#1b242c', px, py, tile);
    ctx.fillStyle = '#26323c';
    ctx.fillRect(px, py, tile, unit);
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const lit = ((h >>> (i + j * 2)) & 1) === 1;
        ctx.fillStyle = lit ? '#4dd0e1' : '#00695c';
        ctx.fillRect(px + (2 + i * 7) * unit, py + (2 + j * 7) * unit, 5 * unit, 5 * unit);
      }
    }
  }
  if (t === 'pedestal') {
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(px + 4 * unit, py + 9 * unit, 8 * unit, 5 * unit);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(px + 3 * unit, py + 8 * unit, 10 * unit, 2 * unit);
    ctx.fillStyle = '#f6d46b';
    ctx.fillRect(px + 6 * unit, py + 2 * unit, 4 * unit, 4 * unit);
    ctx.fillRect(px + 7 * unit, py + 5 * unit, 2 * unit, 3 * unit);
    ctx.fillRect(px + 9 * unit, py + 6 * unit, 2 * unit, unit);
  }
  if (t === 'wire') {
    ctx.fillStyle = '#00897b';
    const n = at(room, x, y - 1) === 'wire' || at(room, x, y + 1) === 'wire';
    const e = at(room, x - 1, y) === 'wire' || at(room, x + 1, y) === 'wire';
    if (e || !n) ctx.fillRect(px, py + 7 * unit, tile, 2 * unit);
    if (n) ctx.fillRect(px + 7 * unit, py, 2 * unit, tile);
    const pulse = room.reduced ? 0 : Math.floor(room.time / 250 + x) % 4;
    ctx.fillStyle = pulse === 0 ? '#fff59d' : '#f6d46b';
    ctx.fillRect(px + 6 * unit, py + 6 * unit, 4 * unit, 4 * unit);
  }
  if (t === 'mix') {
    fill(ctx, '#4527a0', px, py, tile);
    ctx.fillStyle = '#7e57c2';
    ctx.fillRect(px + 2 * unit, py + 2 * unit, 12 * unit, 12 * unit);
    ctx.fillStyle = '#d1c4e9';
    ctx.fillRect(px + 4 * unit + (room.reduced ? 0 : (room.frame % 2) * unit), py + 4 * unit, 4 * unit, 4 * unit);
    ctx.fillStyle = '#80deea';
    ctx.fillRect(px + 8 * unit, py + 8 * unit, 4 * unit, 4 * unit);
  }
}

function drawShelf(ctx: CanvasRenderingContext2D, room: Room, x: number, y: number, px: number, py: number) {
  const { unit, tile } = room;
  const h = hash(x, y, 3);
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(px, py, tile, tile);
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(px, py, tile, unit);
  ctx.fillRect(px, py + 7 * unit, tile, unit);
  ctx.fillRect(px, py + 15 * unit, tile, unit);
  const spines = ['#c62828', '#f6d46b', '#5c6bc0', '#72b043', '#ef6c00', '#00897b', '#8e24aa', '#efe6d4'];
  for (const shelf of [1, 8]) {
    let bx = 1;
    let i = 0;
    while (bx < 15) {
      const w = 1 + ((h >>> (i % 16)) & 1);
      const hgt = 4 + ((h >>> ((i * 3) % 24)) % 3);
      if (bx + w > 15) break;
      ctx.fillStyle = spines[(h >>> ((i * 5 + shelf) % 26)) % spines.length];
      ctx.fillRect(px + bx * unit, py + (shelf + 6 - hgt) * unit, w * unit, hgt * unit);
      bx += w + ((h >>> (i + 2)) % 5 === 0 ? 1 : 0);
      i++;
    }
  }
}

type Standing = (() => void) & { depth?: number };

/** Objects that stand up from the floor. They are depth-sorted with the people. */
function standing(ctx: CanvasRenderingContext2D, room: Room, x: number, y: number, px: number, py: number): Standing | null {
  const t = at(room, x, y)!;
  if (BUILDINGS.has(t)) {
    // Draw a building once, from its top-left tile, sorted by its front wall.
    if (at(room, x - 1, y) === t || at(room, x, y - 1) === t) return null;
    let w = 0;
    while (at(room, x + w, y) === t) w++;
    let h = 0;
    while (at(room, x, y + h) === t) h++;
    const doors: number[] = [];
    for (let i = 0; i < w; i++) if (at(room, x + i, y + h - 1) === 'door') doors.push(i);
    const draw: Standing = () => drawBuilding(ctx, room, t, x, y, w, h, px, py, doors);
    // Sort by the top of the front row: someone standing in the doorway is drawn in front of the wall.
    draw.depth = y + h - 1;
    return draw;
  }
  if (LANDMARKS.has(t)) {
    if (at(room, x - 1, y) === t || at(room, x, y - 1) === t) return null;
    let w = 0;
    while (at(room, x + w, y) === t) w++;
    let h = 0;
    while (at(room, x, y + h) === t) h++;
    const draw: Standing = () => drawLandmark(ctx, room, t, x, y, w, h, px, py);
    draw.depth = y + h - 1 + 0.9;
    return draw;
  }
  if (t === 'lantern' || t === 'signpost' || t === 'shrine' || t === 'seal' || t === 'anvil' || t === 'marker') {
    return () => drawProp(ctx, room, t, x, y, px, py);
  }
  if (t === 'archway') {
    const arch: Standing = () => {
      if (ready(dungeon)) ctx.drawImage(dungeon, 0, 7 * 16, 32, 48, px, py - room.tile / 2, room.tile, room.tile * 1.5);
      drawArchway(ctx, room, px, py);
    };
    arch.depth = y - 0.6;
    return arch;
  }
  const { unit, tile } = room;
  const h = hash(x, y, 11);
  const cx = px + tile / 2;
  const bottom = py + tile;
  const shadow = (w: number) => () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, bottom - 2 * unit, w * unit, 2.5 * unit, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  if (t === 'tree') {
    // Mostly green, some yellow-green, the odd autumn tree.
    const k = [0, 0, 0, 1, 0, 1, 2, 0, 0, 3][h % 10];
    return () => { shadow(12)(); stamp(ctx, vegetation, variant(VEG.bigBush, k), cx, bottom + 2 * unit, unit); };
  }
  if (t === 'bush') {
    const k = [0, 0, 1, 0, 2, 1][h % 6];
    const shape = [VEG.roundBush, VEG.shadowBush, VEG.smallBush][(h >>> 5) % 3];
    return () => stamp(ctx, vegetation, variant(shape, k), cx, bottom + unit, unit, 0.62);
  }
  if (t === 'rock') {
    const shape = [VEG.rocks, VEG.rock, VEG.pebble][h % 3];
    return () => { shadow(5)(); stamp(ctx, vegetation, shape, cx, bottom - unit, unit, shape === VEG.rocks ? 1 : 1.3); };
  }
  if (t === 'deadtree') return () => { shadow(9)(); stamp(ctx, vegetation, VEG.deadTree, cx, bottom, unit); };
  if (t === 'crystal') {
    return () => {
      shadow(4)();
      const bob = room.reduced ? 0 : Math.round(Math.sin(room.time / 500 + x) * 1.2) * unit;
      stamp(ctx, vegetation, VEG.crystal, cx, bottom - 3 * unit + bob, unit);
    };
  }
  if (t === 'pillar') {
    return () => {
      cell(ctx, dungeon, 3, 2, px, py, unit);
      cell(ctx, dungeon, 3, 1, px, py - tile, unit);
    };
  }
  if (t === 'bars') return () => cell(ctx, dungeon, 9, 5, px, py, unit);
  if (t === 'sign') {
    // A wooden signpost by a map exit.
    return () => {
      shadow(4)();
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(px + 6.5 * unit, py + 5 * unit, 3 * unit, 10 * unit);
      ctx.fillRect(px + 1 * unit, py + 1 * unit, 14 * unit, 7 * unit);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(px + 7 * unit, py + 6 * unit, 2 * unit, 9 * unit);
      ctx.fillStyle = '#c8a27a';
      ctx.fillRect(px + 2 * unit, py + 2 * unit, 12 * unit, 5 * unit);
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(px + 4 * unit, py + 3.5 * unit, 8 * unit, unit);
      ctx.fillRect(px + 4 * unit, py + 5 * unit, 5 * unit, unit);
    };
  }
  if (t === 'door') {
    // Arched door at half scale: 32 × 48 source pixels become one tile wide and one and a half tall.
    const door: Standing = () => {
      if (!ready(dungeon)) {
        fill(ctx, '#6d4c41', px, py, tile);
        return;
      }
      ctx.drawImage(dungeon, 0, 7 * 16, 32, 48, px, py - tile / 2, tile, tile * 1.5);
    };
    // A door is flat against its wall, so people around it are always drawn in front of it.
    // A building door only has to come after the building's own front wall.
    door.depth = BUILDINGS.has(at(room, x, y - 1) as Tile) ? y + 0.001 : y - 0.6;
    return door;
  }
  if (t === 'gate') {
    const open = room.open.has(`${x},${y}`);
    // Like a door, the gate's arch rises above its tile: keep it behind people standing next to it.
    const gate: Standing = () => {
      if (!ready(dungeon)) {
        fill(ctx, open ? '#81c784' : '#212121', px, py, tile);
        return;
      }
      if (open) ctx.drawImage(dungeon, 0, 10 * 16, 32, 48, px, py - tile / 2, tile, tile * 1.5);
      else ctx.drawImage(dungeon, 2 * 16, 7 * 16, 32, 48, px, py - tile / 2, tile, tile * 1.5);
    };
    gate.depth = y - 0.6;
    return gate;
  }
  if (t === 'chest') {
    return () => {
      shadow(6)();
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(px + 2 * unit, py + 6 * unit, 12 * unit, 8 * unit);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(px + 2 * unit, py + 4 * unit, 12 * unit, 4 * unit);
      ctx.fillStyle = '#f6d46b';
      ctx.fillRect(px + 2 * unit, py + 8 * unit, 12 * unit, unit);
      ctx.fillRect(px + 7 * unit, py + 7 * unit, 2 * unit, 3 * unit);
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(px + 7.5 * unit, py + 9 * unit, unit, unit);
    };
  }
  return null;
}

interface BuildingStyle {
  roof: 'pitched' | 'flat' | 'glass';
  base: string;
  dark: string;
  light: string;
  emblem: 'book' | 'key' | 'flame' | 'wheel' | 'star' | 'venn';
}

/** Each grounds building is a location; its roof takes the location's accent palette. */
const style = (id: keyof typeof LOCATION_BY_ID, roof: BuildingStyle['roof'], emblem: BuildingStyle['emblem']): BuildingStyle => {
  const { base, dark, light } = LOCATION_BY_ID[id].accent;
  return { roof, base, dark, light, emblem };
};

const BUILDING_STYLES: Partial<Record<Tile, BuildingStyle>> = {
  library: style('library', 'pitched', 'book'),
  temple: style('ruins', 'pitched', 'wheel'),
  cabin: style('observatory', 'pitched', 'star'),
  crypt: style('forge', 'pitched', 'flame'),
  keep: style('citadel', 'flat', 'key'),
  greenhouse: { roof: 'glass', base: '#a9dbe0', dark: '#6fa8ae', light: '#e6f7f8', emblem: 'venn' },
};


/** One building: shadow, two rows of facade, a roof over the rest, and an emblem over the door. */
function drawBuilding(
  ctx: CanvasRenderingContext2D,
  room: Room,
  kind: Tile,
  x0: number,
  y0: number,
  w: number,
  h: number,
  px: number,
  py: number,
  doors: number[],
) {
  const style = BUILDING_STYLES[kind];
  if (!style) return;
  const { unit: u, tile: T } = room;
  const roofRows = Math.max(1, h - 2);
  const facadeY = py + roofRows * T;
  const edge = (i: number) => (i === 0 ? 0 : i === w - 1 ? 2 : 1);

  // Ground shadow to the south-east.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(px + 4 * u, py + h * T - u, w * T, 3 * u);
  ctx.fillRect(px + w * T, py + 8 * u, 4 * u, h * T - 6 * u);

  // Facade: the bottom two rows.
  for (let i = 0; i < w; i++) {
    const fx = px + i * T;
    for (let r = 0; r < 2; r++) {
      const fy = facadeY + r * T;
      if (kind === 'library') cell(ctx, dungeon, i % 3, 1 + r, fx, fy, u);
      else if (kind === 'keep') cell(ctx, dungeon, edge(i), 16 + r, fx, fy, u);
      else if (kind === 'crypt') cell(ctx, dungeon, 3 + edge(i), 16 + r, fx, fy, u);
      else if (kind === 'temple') cell(ctx, floors, 16 + (i % 3), 1 + ((i + r) % 3), fx, fy, u);
      else if (kind === 'cabin') {
        // Dressed stone in the Observatory's night blue.
        fill(ctx, style.dark, fx, fy, T);
        ctx.fillStyle = style.base;
        for (let b = 0; b < 4; b++) {
          const off = (b + i) % 2 ? 0 : 4 * u;
          for (let c = -1; c < 2; c++) ctx.fillRect(fx + off + c * 8 * u + u, fy + b * 4 * u + u, 7 * u, 3 * u);
        }
      } else if (kind === 'greenhouse') {
        if (r === 1) cell(ctx, dungeon, 6 + edge(i), 17, fx, fy, u);
        else drawGlass(ctx, fx, fy, T, T, u, style, x0 + i);
      }
    }
  }
  // Facade details on the non-door columns.
  for (let i = 0; i < w; i++) {
    if (doors.includes(i)) continue;
    const fx = px + i * T;
    const upper = facadeY;
    const nearDoor = doors.some(d => Math.abs(d - i) === 1);
    if (kind === 'temple' && (i === 0 || i === w - 1 || nearDoor)) {
      cell(ctx, dungeon, 3, 1, fx, upper, u);
      cell(ctx, dungeon, 3, 2, fx, upper + T, u);
    } else if (kind === 'library' && i % 2 === 1) {
      drawWindow(ctx, fx, upper, u, '#2b2b33', '#ffcf6b', true);
    } else if (kind === 'cabin' && i % 2 === 1) {
      drawWindow(ctx, fx, upper, u, '#141a33', '#bfa8ff', true);
    } else if (kind === 'keep' && i % 2 === 1) {
      ctx.fillStyle = '#111';
      ctx.fillRect(fx + 7 * u, upper + 5 * u, 2 * u, 8 * u);
      ctx.fillRect(fx + 5.5 * u, upper + 8 * u, 5 * u, 1.5 * u);
    }
    if (kind === 'temple' && (i === 0 || i === w - 1 || nearDoor)) drawPillarLetters(ctx, room, i, fx, upper);
  }

  // Roof over the remaining rows, overhanging the walls a little and rising above the top row.
  const ov = 3 * u;
  const raise = 5 * u;
  const rx = px - ov;
  const ry = py - raise;
  const rw = w * T + 2 * ov;
  const rh = roofRows * T + raise;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(rx - u, ry - u, rw + 2 * u, rh + 2 * u);
  if (style.roof === 'pitched') {
    const ridge = Math.round(rh * 0.42);
    ctx.fillStyle = style.light;
    ctx.fillRect(rx, ry, rw, ridge);
    ctx.fillStyle = style.base;
    ctx.fillRect(rx, ry + ridge, rw, rh - ridge);
    // Shingle courses, staggered.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    let row = 0;
    for (let yy = ry + 4 * u; yy < ry + rh - 2 * u; yy += 4 * u, row++) {
      ctx.fillRect(rx, yy, rw, u);
      for (let xx = rx + (row % 2 ? 3 : 0) * u; xx < rx + rw; xx += 6 * u) ctx.fillRect(xx, yy - 3 * u, u, 3 * u);
    }
    ctx.fillStyle = style.dark;
    ctx.fillRect(rx, ry + ridge - u, rw, 2 * u);
    ctx.fillRect(rx, ry + rh - 2 * u, rw, 2 * u);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(rx, ry, rw, u);
  } else if (style.roof === 'flat') {
    for (let j = 0; j < Math.ceil(rh / T) + 1; j++) {
      for (let i = 0; i < Math.ceil(rw / T) + 1; i++) {
        const [c, r] = DUNGEON_FLOOR[hash(x0 + i, y0 + j, 5) % DUNGEON_FLOOR.length];
        ctx.save();
        ctx.beginPath();
        ctx.rect(rx, ry, rw, rh);
        ctx.clip();
        cell(ctx, dungeon, c, r, rx + i * T, ry + j * T, u);
        ctx.restore();
      }
    }
    // Battlements around the edge.
    const merlon = (mx: number, my: number, mw: number, mh: number) => {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(mx - u, my - u, mw + 2 * u, mh + 2 * u);
      ctx.fillStyle = style.light;
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = style.dark;
      ctx.fillRect(mx, my + mh - u, mw, u);
    };
    for (let xx = rx; xx < rx + rw - 3 * u; xx += 7 * u) {
      merlon(xx, ry, 4 * u, 4 * u);
      merlon(xx, ry + rh - 4 * u, 4 * u, 4 * u);
    }
    for (let yy = ry + 7 * u; yy < ry + rh - 7 * u; yy += 7 * u) {
      merlon(rx, yy, 4 * u, 4 * u);
      merlon(rx + rw - 4 * u, yy, 4 * u, 4 * u);
    }
  } else {
    drawGlass(ctx, rx, ry, rw, rh, u, style, x0, true);
  }

  // The Ruins keep a cracked pediment.
  if (kind === 'temple') {
    const cx = px + (w * T) / 2;
    const base = ry + rh;
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(cx - 1.6 * T - u, base);
    ctx.lineTo(cx, base - 0.9 * T - u);
    ctx.lineTo(cx + 1.6 * T + u, base);
    ctx.fill();
    ctx.fillStyle = '#eadfc6';
    ctx.beginPath();
    ctx.moveTo(cx - 1.6 * T + u, base - u);
    ctx.lineTo(cx, base - 0.9 * T + u);
    ctx.lineTo(cx + 1.6 * T - u, base - u);
    ctx.fill();
  }
  // The location's silhouette: spires, towers, chimney, wheel, dome.
  drawBuildingArt(ctx, room, kind, w, h, px, py, doors);

  // Emblem plaque over the first door.
  const door = doors[0] ?? Math.floor(w / 2);
  drawEmblem(ctx, style.emblem, px + door * T + T / 2, facadeY - 4 * u, u);
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, frame: string, glass: string, arched: boolean) {
  ctx.fillStyle = frame;
  ctx.fillRect(x + 4 * u, y + 4 * u, 8 * u, 10 * u);
  if (arched) ctx.fillRect(x + 5 * u, y + 3 * u, 6 * u, u);
  ctx.fillStyle = glass;
  ctx.fillRect(x + 5 * u, y + 5 * u, 6 * u, 8 * u);
  if (arched) ctx.fillRect(x + 6 * u, y + 4 * u, 4 * u, u);
  ctx.fillStyle = frame;
  ctx.fillRect(x + 7.5 * u, y + 5 * u, u, 8 * u);
  ctx.fillRect(x + 5 * u, y + 8.5 * u, 6 * u, u);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillRect(x + 5 * u, y + 5 * u, 2 * u, u);
}

function drawGlass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, u: number, style: BuildingStyle, seed: number, roof = false) {
  if (roof) {
    // Plants inside, seen through the glass.
    const picks = [VEG.fern, VEG.lupine, VEG.leaf, VEG.cattail, VEG.sprout];
    for (let i = 0, xx = x + 6 * u; xx < x + w - 10 * u; xx += 13 * u, i++) {
      stamp(ctx, vegetation, picks[(seed + i) % picks.length], xx + 6 * u, y + h - 3 * u - ((i % 2) * 6 * u), u, 0.8);
    }
  }
  ctx.fillStyle = roof ? 'rgba(169, 219, 224, 0.62)' : style.base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = style.light;
  for (let xx = x; xx <= x + w; xx += 8 * u) ctx.fillRect(xx, y, u, h);
  for (let yy = y; yy <= y + h; yy += 8 * u) ctx.fillRect(x, yy, w, u);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let xx = x + 2 * u; xx < x + w - 4 * u; xx += 16 * u) ctx.fillRect(xx, y + 2 * u, 2 * u, Math.min(h - 4 * u, 5 * u));
  ctx.fillStyle = style.dark;
  ctx.fillRect(x, y + h - u, w, u);
}

function drawEmblem(ctx: CanvasRenderingContext2D, emblem: BuildingStyle['emblem'], cx: number, cy: number, u: number) {
  const x = Math.round(cx - 7 * u);
  const y = Math.round(cy - 5 * u);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - u, y - u, 16 * u, 12 * u);
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(x, y, 14 * u, 10 * u);
  ctx.fillStyle = '#f3e3bd';
  ctx.fillRect(x + u, y + u, 12 * u, 8 * u);
  const ix = x + 2 * u;
  const iy = y + 2 * u;
  if (emblem === 'book') {
    ctx.fillStyle = '#3949ab';
    ctx.fillRect(ix, iy, 10 * u, 6 * u);
    ctx.fillStyle = '#fff';
    ctx.fillRect(ix + u, iy + u, 3.5 * u, 4 * u);
    ctx.fillRect(ix + 5.5 * u, iy + u, 3.5 * u, 4 * u);
  } else if (emblem === 'key') {
    // Twin keys: the gold one is public, the silver one stays in the vault.
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(ix + 5, iy + 4 * u, 9 * u, u);
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(ix, iy + u, 4 * u, 4 * u);
    ctx.fillRect(ix + 4 * u, iy + 2.5 * u, 6 * u, u);
    ctx.fillRect(ix + 8 * u, iy + 3.5 * u, u, 2 * u);
    ctx.fillRect(ix + 6 * u, iy + 3.5 * u, u, 1.5 * u);
    ctx.fillStyle = '#f3e3bd';
    ctx.fillRect(ix + 1.5 * u, iy + 2.5 * u, u, u);
  } else if (emblem === 'flame') {
    // A flame over a key: one key seals and opens.
    ctx.fillStyle = '#ff6f00';
    ctx.fillRect(ix + 1, iy, 3 * u, 4 * u);
    ctx.fillRect(ix + 1.5 * u, iy - u, 2 * u, u);
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(ix + 1.5 * u, iy + 1.5 * u, 1.5 * u, 2 * u);
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(ix + 5 * u, iy + 2 * u, 3 * u, 3 * u);
    ctx.fillRect(ix + 8 * u, iy + 3 * u, 2 * u, u);
    ctx.fillRect(ix + 9 * u, iy + 4 * u, u, 1.5 * u);
  } else if (emblem === 'wheel') {
    ctx.fillStyle = '#b8860b';
    ctx.beginPath();
    ctx.arc(ix + 5 * u, iy + 3 * u, 3 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3e3bd';
    ctx.beginPath();
    ctx.arc(ix + 5 * u, iy + 3 * u, 1.8 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(ix + 4.5 * u, iy, u, 6 * u);
    ctx.fillRect(ix + 2 * u, iy + 2.5 * u, 6 * u, u);
  } else if (emblem === 'star') {
    // Three beams meeting in one star.
    ctx.fillStyle = '#5c6fb8';
    ctx.fillRect(ix, iy + 5 * u, u, u);
    ctx.fillRect(ix + u, iy + 4 * u, u, u);
    ctx.fillRect(ix + 4.5 * u, iy + 3 * u, u, 3 * u);
    ctx.fillRect(ix + 9 * u, iy + 5 * u, u, u);
    ctx.fillRect(ix + 8 * u, iy + 4 * u, u, u);
    ctx.fillStyle = '#7e57c2';
    ctx.fillRect(ix + 3.5 * u, iy + 1 * u, 3 * u, u);
    ctx.fillRect(ix + 4.5 * u, iy, u, 3 * u);
  } else {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#1e88e5';
    ctx.beginPath();
    ctx.arc(ix + 3.5 * u, iy + 3 * u, 3 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f9a825';
    ctx.beginPath();
    ctx.arc(ix + 6.5 * u, iy + 3 * u, 3 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Warm torch light and cool crystal and vent light, added on top of the scene. */
function drawLight(
  ctx: CanvasRenderingContext2D,
  room: Room,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sx: (x: number) => number,
  sy: (y: number) => number,
) {
  const { tile } = room;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = at(room, x, y);
      let colour = '';
      let radius = 0;
      let cy = sy(y) + tile / 2;
      if (t === 'torch') {
        const flicker = room.reduced ? 0 : Math.sin(room.time / 140 + x * 3) * 0.12;
        colour = `rgba(255, 170, 60, ${0.22 + flicker * 0.5})`;
        radius = tile * (2.6 + flicker);
        cy = sy(y) + tile * 0.3;
      } else if (t === 'crystal') {
        colour = 'rgba(90, 200, 255, 0.2)';
        radius = tile * 1.6;
      } else if (t === 'vent') {
        colour = 'rgba(80, 140, 255, 0.16)';
        radius = tile * 2.2;
        cy = sy(y) + tile * 1.4;
      }
      const extra = [
        ...(t && LANDMARKS.has(t) && at(room, x - 1, y) !== t && at(room, x, y - 1) !== t ? landmarkGlow(room, t, x, span(room, x, y, 1, 0), span(room, x, y, 0, 1)) : []),
        ...(t && BUILDINGS.has(t) && at(room, x - 1, y) !== t && at(room, x, y - 1) !== t ? buildingGlow(room, t, span(room, x, y, 1, 0), span(room, x, y, 0, 1)) : []),
      ];
      const prop = propGlow(room, t, x, y);
      if (prop) extra.push(prop);
      for (const g of extra) glowAt(ctx, sx(x) + g.x * tile, sy(y) + g.y * tile, g.radius * tile, g.colour);
      if (!colour) continue;
      const cx = sx(x) + tile / 2;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, colour);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
  }
  // Peaks of Shattered Secrets: each lit shrine sends its share toward the seal. The seal itself
  // lights only once the threshold is met (see the seal prop), so one beam alone opens nothing.
  const lit = litShrines(room);
  const shrineCells: [number, number][] = [];
  let seal: [number, number] | null = null;
  for (let y = 0; y < room.rows; y++) {
    for (let x = 0; x < room.cols; x++) {
      if (room.map[y][x] === 'shrine') shrineCells.push([x, y]);
      else if (room.map[y][x] === 'seal') seal = [x, y];
    }
  }
  if (seal && shrineCells.length) {
    shrineCells.sort((a, b) => a[0] - b[0]);
    const alpha = lit >= SHARE_THRESHOLD ? 0.5 : 0.28;
    ctx.fillStyle = `rgba(199, 182, 255, ${alpha})`;
    const dot = Math.max(2, room.unit);
    for (const [index, [x, y]] of shrineCells.entries()) {
      if (index >= lit) continue;
      const ax = sx(x) + tile / 2;
      const ay = sy(y) - tile * 0.1;
      const bx = sx(seal[0]) + tile / 2;
      const by = sy(seal[1]) + tile * 0.55;
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / (dot * 2));
      const drift = room.reduced ? 0 : (room.time / 120) % 2;
      for (let k = 0; k < steps; k++) {
        if ((k + Math.floor(drift)) % 2) continue;
        ctx.fillRect(Math.round(ax + ((bx - ax) * k) / steps), Math.round(ay + ((by - ay) * k) / steps), dot, dot);
      }
    }
  }
  ctx.restore();
}

/** How many tiles of the same kind run from (x, y) in one direction. */
function span(room: Room, x: number, y: number, dx: number, dy: number) {
  const t = at(room, x, y);
  let n = 0;
  while (at(room, x + dx * n, y + dy * n) === t) n++;
  return n;
}

function glowAt(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, colour: string) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, colour);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

/** Light from the grounds landmarks: the forge furnace, library windows, observatory beams. */
function buildingGlow(room: Room, t: Tile, w: number, h: number) {
  const flick = room.reduced ? 0 : Math.sin(room.time / 120) * 0.06;
  const facade = h - 2;
  switch (t) {
    case 'crypt': return [
      { x: w - 1.2, y: -0.6, colour: `rgba(255, 140, 50, ${0.26 + flick})`, radius: 2 },
      { x: 1.5, y: facade + 1.3, colour: `rgba(255, 120, 40, ${0.22 + flick})`, radius: 2.2 },
    ];
    case 'library': return [{ x: w / 2, y: 0.6, colour: 'rgba(255, 207, 107, 0.16)', radius: 2.6 }];
    case 'cabin': return [{ x: w / 2, y: -1.2, colour: 'rgba(191, 168, 255, 0.22)', radius: 2.2 }];
    case 'keep': return [{ x: w / 2, y: 1, colour: 'rgba(224, 184, 74, 0.14)', radius: 1.8 }];
    case 'temple': return [{ x: w / 2, y: 0.4, colour: 'rgba(246, 178, 107, 0.14)', radius: 1.8 }];
    case 'greenhouse': return [{ x: w / 2, y: 1, colour: 'rgba(249, 168, 212, 0.14)', radius: 2.2 }];
    default: return [];
  }
}

/** A person at the same pixel scale as the tiles, standing on a soft shadow. */
function drawActor(ctx: CanvasRenderingContext2D, worldX: number, worldY: number, camX: number, camY: number, unit: number, frame: HTMLCanvasElement) {
  const tile = 16 * unit;
  const footX = (worldX - camX) * tile;
  const footY = (worldY + 0.35 - camY) * tile;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(footX, footY - unit, 5.5 * unit, 2 * unit, 0, 0, Math.PI * 2);
  ctx.fill();
  const w = SPRITE_W * unit;
  const h = SPRITE_H * unit;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame, Math.round(footX - w / 2), Math.round(footY - h + unit), Math.round(w), Math.round(h));
}

/** Bit floats about a tile above the floor, with a small shadow and a slow two-pixel bob. */
function drawCompanion(ctx: CanvasRenderingContext2D, worldX: number, worldY: number, camX: number, camY: number, unit: number, image: HTMLCanvasElement, time: number, reduced: boolean) {
  const tile = 16 * unit;
  const scale = unit * 0.8;
  const footX = (worldX - camX) * tile;
  const footY = (worldY + 0.35 - camY) * tile;
  const bob = reduced ? 0 : Math.round(Math.sin(time / 380) * 1.5) * unit;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.ellipse(footX, footY - unit, 4 * unit, 1.4 * unit, 0, 0, Math.PI * 2);
  ctx.fill();
  const size = 16 * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, Math.round(footX - size / 2), Math.round(footY - size - 7 * unit + bob), Math.round(size), Math.round(size));
}

/** A bouncing gold arrow above the goal's label, or below the goal pointing up when there is no room above. */
function drawGoalArrow(ctx: CanvasRenderingContext2D, spot: Spot, labelAt: number, camX: number, camY: number, tile: number, unit: number, time: number, reduced: boolean) {
  const bob = reduced ? 0 : Math.round(Math.sin(time / 220) * 2) * unit;
  const u = Math.max(2.4, unit * 1.4);
  const cx = Math.round((spot.x - camX) * tile);
  let tip = Math.round((labelAt - 1.45 - camY) * tile - Math.max(8, tile * 0.32) - 5 * unit) + bob;
  let dir = 1;
  if (tip - 12 * u < 0) {
    // Not enough room above: point up from just below the goal's ring.
    tip = Math.round((Math.floor(spot.y) + 1.05 - camY) * tile) - bob;
    dir = -1;
  }
  const shape = (inset: number, colour: string) => {
    const head = 5 * u - inset;
    const half = 6 * u - inset * 1.4;
    const stem = 2.5 * u - inset * 0.8;
    const tail = 11 * u - inset;
    const y = (d: number) => tip - dir * d;
    const t = tip + dir * (inset ? 0 : 2 * u);
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(cx, inset ? tip : t);
    ctx.lineTo(cx - half, y(head));
    ctx.lineTo(cx - stem, y(head));
    ctx.lineTo(cx - stem, y(tail));
    ctx.lineTo(cx + stem, y(tail));
    ctx.lineTo(cx + stem, y(head));
    ctx.lineTo(cx + half, y(head));
    ctx.closePath();
    ctx.fill();
  };
  shape(0, '#111');
  shape(u, '#f6d46b');
}

/** A goal off screen: a gold pointer on the edge of the view, aimed at it. */
function drawEdgePointer(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  px: number,
  py: number,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  tile: number,
  unit: number,
  time: number,
  reduced: boolean,
) {
  const from = { x: (px - camX) * tile, y: (py - camY) * tile };
  const to = { x: (gx - camX) * tile, y: (gy - camY) * tile };
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const margin = 26 * Math.max(1, unit * 0.6);
  // Where the line from the player towards the goal leaves the view, pulled in by the margin.
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tx = dx > 0 ? (viewW - margin - from.x) / dx : dx < 0 ? (margin - from.x) / dx : Infinity;
  const ty = dy > 0 ? (viewH - margin - from.y) / dy : dy < 0 ? (margin - from.y) / dy : Infinity;
  const t = Math.max(0, Math.min(tx, ty));
  const pulse = reduced ? 0 : Math.sin(time / 220) * 3;
  const x = from.x + dx * (t + pulse);
  const y = from.y + dy * (t + pulse);
  const s = Math.max(2.4, unit * 1.4);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(9 * s, 0);
  ctx.lineTo(-5 * s, -7 * s);
  ctx.lineTo(-2 * s, 0);
  ctx.lineTo(-5 * s, 7 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f6d46b';
  ctx.beginPath();
  ctx.moveTo(6.5 * s, 0);
  ctx.lineTo(-3.5 * s, -5 * s);
  ctx.lineTo(-0.8 * s, 0);
  ctx.lineTo(-3.5 * s, 5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTag(
  ctx: CanvasRenderingContext2D,
  label: string,
  spotX: number,
  spotY: number,
  camX: number,
  camY: number,
  tile: number,
) {
  const x = Math.round((spotX - camX) * tile);
  const font = Math.max(8, tile * 0.32);
  let y = Math.round((spotY - 1.45 - camY) * tile);
  // No room above (a person on the top row): put the label under their feet instead.
  if (y - font - Math.max(2, tile * 0.08) * 2 < 0) y = Math.round((spotY + 0.55 - camY) * tile) + font;
  ctx.font = `${font}px Silkscreen, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const pad = Math.max(2, tile * 0.08);
  const width = ctx.measureText(label).width + pad * 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(x - width / 2, y - font - pad, width, font + pad * 2);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, x, y - pad);
}
