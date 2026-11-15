export type Tile =
  | 'stone' | 'plank' | 'grass' | 'path' | 'tree' | 'water' | 'wall' | 'torch' | 'shelf' | 'desk' | 'gate'
  | 'engraving' | 'chest' | 'door' | 'wheel' | 'block' | 'pedestal' | 'wire' | 'mix'
  // Outdoor decor
  | 'flower' | 'plants' | 'mushroom' | 'bush' | 'rock' | 'deadtree' | 'cobble' | 'bridge'
  // Indoor decor
  | 'paving' | 'carpet' | 'grate' | 'vent' | 'banner' | 'bars' | 'pillar' | 'crystal'
  // Buildings on the grounds. Each footprint is one rectangle of the same tile, with its door on the bottom row.
  | 'library' | 'keep' | 'crypt' | 'temple' | 'cabin' | 'greenhouse';

export const BUILDINGS = new Set<Tile>(['library', 'keep', 'crypt', 'temple', 'cabin', 'greenhouse']);

const SOLID = new Set<Tile>([
  'wall', 'torch', 'shelf', 'desk', 'chest', 'gate', 'tree', 'water', 'block', 'pedestal', 'mix',
  'bush', 'rock', 'deadtree', 'vent', 'banner', 'bars', 'pillar', 'crystal',
  'library', 'keep', 'crypt', 'temple', 'cabin', 'greenhouse',
]);

/**
 * The solid part of a tile, in tile units from its top-left corner: [left, top, right, bottom].
 * Most solids fill their tile. Standing objects collide at their base, the way they are drawn,
 * and a tree's base is wider than one tile.
 */
const SHAPES: Partial<Record<Tile, [number, number, number, number]>> = {
  tree: [-0.2, 0.3, 1.2, 1],
  bush: [0.05, 0.35, 0.95, 1],
  rock: [0.12, 0.45, 0.88, 0.95],
  deadtree: [0.3, 0.55, 0.7, 1],
  crystal: [0.22, 0.45, 0.78, 0.95],
  pillar: [0.05, 0.2, 0.95, 1],
  desk: [0, 0.3, 1, 0.95],
  chest: [0.1, 0.25, 0.9, 0.95],
  pedestal: [0.2, 0.45, 0.8, 0.95],
};

/** The player's feet, relative to their position: half width, then the top and bottom offsets. */
export const BODY = { half: 0.34, top: -0.08, bottom: 0.32 };

/** Another body the player cannot walk through, such as an NPC. */
export interface Blocker { x: number; y: number }

export type SpotKind = 'person' | 'shelf' | 'door' | 'gate' | 'future' | 'chest';

export interface Spot {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: SpotKind;
  topic?: string;
  shelfId?: string;
  characterId?: string;
  regionId?: string;
  place?: string;
  guest: string;
  signed: string;
  mark?: string;
  to?: string;
  /** Where the player appears in the room behind this door: in front of the matching door there. */
  arrive?: { x: number; y: number };
  requires?: string[];
  gate?: { x: number; y: number };
  lesson?: string;
  summary?: string;
  challengeId?: string;
}

export function solidAt(map: Tile[][], x: number, y: number, openCells?: Set<string>): boolean {
  const col = Math.floor(x);
  const row = Math.floor(y);
  if (row < 0 || col < 0 || row >= map.length || col >= map[0].length) return true;
  const tile = map[row][col];
  if (tile === 'gate' && openCells?.has(`${col},${row}`)) return false;
  return SOLID.has(tile);
}

function overlaps(a: [number, number, number, number], b: [number, number, number, number]) {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

function bodyBox(x: number, y: number): [number, number, number, number] {
  return [x - BODY.half, y + BODY.top, x + BODY.half, y + BODY.bottom];
}

/** True when the player's body at (x, y) would overlap a wall, an object, an NPC, or the room edge. */
export function blocked(map: Tile[][], x: number, y: number, openCells?: Set<string>, blockers: Blocker[] = []): boolean {
  const box = bodyBox(x, y);
  const height = map.length;
  const width = map[0].length;
  if (box[0] < 0 || box[1] < 0 || box[2] > width || box[3] > height) return true;
  for (let ty = Math.floor(box[1]) - 1; ty <= Math.floor(box[3]) + 1; ty++) {
    for (let tx = Math.floor(box[0]) - 1; tx <= Math.floor(box[2]) + 1; tx++) {
      if (ty < 0 || tx < 0 || ty >= height || tx >= width) continue;
      const tile = map[ty][tx];
      if (!SOLID.has(tile)) continue;
      if (tile === 'gate' && openCells?.has(`${tx},${ty}`)) continue;
      const shape = SHAPES[tile] ?? [0, 0, 1, 1];
      if (overlaps(box, [tx + shape[0], ty + shape[1], tx + shape[2], ty + shape[3]])) return true;
    }
  }
  for (const other of blockers) {
    const them: [number, number, number, number] = [other.x - 0.3, other.y - 0.05, other.x + 0.3, other.y + 0.3];
    if (overlaps(box, them)) return true;
  }
  return false;
}

/** Whether the player can stand at (x, y). */
export function fits(map: Tile[][], x: number, y: number, openCells?: Set<string>, blockers: Blocker[] = []): boolean {
  return !blocked(map, x, y, openCells, blockers);
}

/**
 * Move the player's body, sliding along whatever stops it.
 * Long moves are split into short steps so a fast or large move cannot pass through a thin wall.
 * A body that already overlaps something (an old checkpoint) may always move, so it can walk free.
 */
export function move(map: Tile[][], x: number, y: number, dx: number, dy: number, openCells?: Set<string>, blockers: Blocker[] = []) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.2));
  let nx = x;
  let ny = y;
  for (let i = 0; i < steps; i++) {
    const stuck = blocked(map, nx, ny, openCells, blockers);
    const sx = dx / steps;
    const sy = dy / steps;
    let movedX = false;
    let movedY = false;
    if (sx !== 0 && (stuck || !blocked(map, nx + sx, ny, openCells, blockers))) { nx += sx; movedX = true; }
    if (sy !== 0 && (stuck || !blocked(map, nx, ny + sy, openCells, blockers))) { ny += sy; movedY = true; }
    // Corner sliding: walking straight into the edge of a doorway or a gap eases the body towards
    // the middle of the tile, so it slips through instead of catching on the corner.
    if (sy !== 0 && sx === 0 && !movedY) {
      const centre = Math.floor(nx) + 0.5;
      const offset = centre - nx;
      const nudge = Math.sign(offset) * Math.min(Math.abs(offset), Math.abs(sy));
      if (Math.abs(offset) > 0.01 && Math.abs(offset) < 0.45 && !blocked(map, nx + nudge, ny, openCells, blockers)
        && !blocked(map, centre, ny + sy, openCells, blockers)) nx += nudge;
    }
    if (sx !== 0 && sy === 0 && !movedX) {
      const centre = Math.floor(ny) + 0.5;
      const offset = centre - ny;
      const nudge = Math.sign(offset) * Math.min(Math.abs(offset), Math.abs(sx));
      if (Math.abs(offset) > 0.01 && Math.abs(offset) < 0.45 && !blocked(map, nx, ny + nudge, openCells, blockers)
        && !blocked(map, nx + sx, centre, openCells, blockers)) ny += nudge;
    }
  }
  const height = map.length;
  const width = map[0].length;
  return {
    x: Math.min(width - BODY.half, Math.max(BODY.half, nx)),
    y: Math.min(height - BODY.bottom, Math.max(-BODY.top, ny)),
  };
}

export function nearestSpot(spots: Spot[], x: number, y: number, reach = 1.05): Spot | null {
  let best: Spot | null = null;
  let bestD = reach;
  for (const spot of spots) {
    const distance = Math.max(Math.abs(spot.x - x), Math.abs(spot.y - y));
    if (distance <= bestD) {
      best = spot;
      bestD = distance;
    }
  }
  return best;
}
