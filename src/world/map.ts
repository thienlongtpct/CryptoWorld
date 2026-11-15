export type Tile = 'stone' | 'plank' | 'grass' | 'path' | 'tree' | 'water' | 'wall' | 'torch' | 'shelf' | 'desk' | 'gate' | 'engraving' | 'chest' | 'door' | 'wheel' | 'block' | 'pedestal' | 'wire' | 'mix';

const SOLID = new Set<Tile>(['wall', 'torch', 'shelf', 'desk', 'chest', 'gate', 'tree', 'water', 'block', 'pedestal', 'mix']);

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

export function move(map: Tile[][], x: number, y: number, dx: number, dy: number, openCells?: Set<string>) {
  const height = map.length;
  const width = map[0].length;
  let nx = x;
  let ny = y;
  if (dx !== 0 && !solidAt(map, x + dx, y, openCells)) nx = x + dx;
  if (dy !== 0 && !solidAt(map, nx, y + dy, openCells)) ny = y + dy;
  return {
    x: Math.min(width - 0.2, Math.max(0.2, nx)),
    y: Math.min(height - 0.2, Math.max(0.2, ny)),
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
