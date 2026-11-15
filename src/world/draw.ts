import floorsUrl from '../assets/pixel-crawler/floors.png';
import dungeonUrl from '../assets/pixel-crawler/dungeon.png';
import waterUrl from '../assets/pixel-crawler/water.png';
import vegetationUrl from '../assets/pixel-crawler/vegetation.png';
import logUrl from '../assets/pixel-crawler/log.png';
import knightUrl from '../assets/pixel-crawler/people/knight.png';
import skeletonUrl from '../assets/pixel-crawler/people/skeleton.png';
import archerUrl from '../assets/pixel-crawler/people/archer.png';
import warriorUrl from '../assets/pixel-crawler/people/warrior.png';
import mageUrl from '../assets/pixel-crawler/people/mage.png';
import aliceUrl from '../assets/pixel-crawler/people/alice.png';
import bobUrl from '../assets/pixel-crawler/people/bob.png';
import shannonUrl from '../assets/pixel-crawler/people/shannon.png';
import { CHARACTER_BY_ID } from '../characters/cast';
import type { Spot, Tile } from './map';

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
const people: Record<string, HTMLImageElement> = {
  player: load(knightUrl),
  alice: load(aliceUrl),
  bob: load(bobUrl),
  shannon: load(shannonUrl),
  eve: load(archerUrl),
  caesar: load(skeletonUrl),
  vigenere: load(warriorUrl),
  kindi: load(mageUrl),
};

export function paint(ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number, state: PaintState) {
  const padTop = state.insetTop * dpr;
  const padBottom = state.insetBottom * dpr;
  const viewPxW = width;
  const viewPxH = Math.max(1, height - padTop - padBottom);
  const cols = state.map[0].length;
  const rows = state.map.length;
  // Grow the room until it touches the screen, and keep the whole map visible.
  const zoom = Math.min(viewPxW / (cols * 16 * dpr), viewPxH / (rows * 16 * dpr));
  const unit = zoom * dpr;
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

  const x0 = Math.max(0, Math.floor(camX));
  const y0 = Math.max(0, Math.floor(camY));
  const x1 = Math.min(cols - 1, Math.ceil(camX + viewW));
  const y1 = Math.min(rows - 1, Math.ceil(camY + viewH));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const sx = Math.round((x - camX) * tile);
      const sy = Math.round((y - camY) * tile);
      const open = state.openCells.has(`${x},${y}`);
      const wooden = near(state.map, x, y, ['grass', 'path', 'tree', 'water', 'plank', 'shelf', 'desk']);
      drawTile(ctx, state.map[y][x], sx, sy, tile, unit, x, y, state.time, state.reduced, open, wooden);
    }
  }

  const sprites: { y: number; draw: () => void }[] = [];
  for (const spot of state.spots) {
    const character = spot.characterId ? CHARACTER_BY_ID[spot.characterId] : undefined;
    if (character) {
      sprites.push({
        y: spot.y,
        draw: () => {
          drawActor(ctx, spot.x, spot.y, camX, camY, tile, 'down', people[character.id] ?? people.player);
          drawTag(ctx, character.tag, spot.x, spot.y, camX, camY, tile);
        },
      });
    } else if (spot.mark) {
      sprites.push({
        y: spot.y,
        draw: () => drawTag(ctx, spot.mark!, spot.x, spot.y, camX, camY, tile),
      });
    }
  }
  sprites.push({
    y: state.y,
    draw: () => drawActor(ctx, state.x, state.y, camX, camY, tile, state.facing, people.player),
  });
  sprites.sort((a, b) => a.y - b.y);
  for (const sprite of sprites) sprite.draw();
  ctx.restore();
}

function ready(image: HTMLImageElement) {
  return image.complete && image.naturalWidth > 0;
}

function cell(ctx: CanvasRenderingContext2D, image: HTMLImageElement, col: number, row: number, x: number, y: number, unit: number) {
  if (!ready(image)) return false;
  ctx.drawImage(image, col * 16, row * 16, 16, 16, x, y, 16 * unit, 16 * unit);
  return true;
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  x: number,
  y: number,
  size: number,
  unit: number,
  col: number,
  row: number,
  time: number,
  reduced: boolean,
  open: boolean,
  wooden: boolean,
) {
  const grass = 1 + ((col + row) % 3);
  const dirt = 11 + ((col + row) % 3);
  const wood = (col + row) % 2 === 0 ? 7 : 8;
  if (tile === 'grass' || tile === 'tree') {
    if (!cell(ctx, floors, grass, 10, x, y, unit)) fill(ctx, (col + row) % 2 === 0 ? '#7cb342' : '#689f38', x, y, size);
  }
  if (tile === 'path') {
    if (!cell(ctx, floors, dirt, 10, x, y, unit)) fill(ctx, '#a97845', x, y, size);
  }
  if (tile === 'water') {
    if (!cell(ctx, water, 2, 7, x, y, unit)) fill(ctx, '#1565c0', x, y, size);
  }
  if (tile === 'stone' || tile === 'engraving' || tile === 'door' || tile === 'chest' || (tile === 'gate' && open)) {
    if (!cell(ctx, dungeon, (col + row) % 2, 0, x, y, unit)) fill(ctx, '#5d4e45', x, y, size);
  }
  if (tile === 'plank' || tile === 'shelf' || tile === 'desk') {
    if (!cell(ctx, floors, wood, 22, x, y, unit)) fill(ctx, '#c4a574', x, y, size);
  }
  if (tile === 'wall' || tile === 'torch' || (tile === 'gate' && !open)) {
    if (wooden) {
      if (!ready(logs)) fill(ctx, '#8d5a32', x, y, size);
      else ctx.drawImage(logs, x, y, size, size);
    } else if (!cell(ctx, dungeon, 0, 14, x, y, unit)) fill(ctx, '#3e342f', x, y, size);
  }
  if (tile === 'tree' && ready(vegetation)) {
    ctx.drawImage(vegetation, 0, 0, 32, 32, x - 8 * unit, y - 16 * unit, 32 * unit, 32 * unit);
  }
  if (tile === 'torch') {
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x + 7 * unit, y + 8 * unit, 2 * unit, 5 * unit);
    const flicker = reduced ? 0 : Math.floor(time / 180) % 2;
    ctx.fillStyle = flicker ? '#ffb300' : '#ff6f00';
    ctx.fillRect(x + 6 * unit, y + 3 * unit, 4 * unit, 4 * unit);
  }
  if (tile === 'door') {
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(x + 3 * unit, y + unit, 10 * unit, 14 * unit);
    ctx.fillStyle = '#f6d46b';
    ctx.fillRect(x + 10 * unit, y + 8 * unit, 2 * unit, 2 * unit);
  }
  if (tile === 'gate' && !open) {
    ctx.fillStyle = '#212121';
    ctx.fillRect(x + 3 * unit, y + unit, 2 * unit, size - 2 * unit);
    ctx.fillRect(x + 7 * unit, y + unit, 2 * unit, size - 2 * unit);
    ctx.fillRect(x + 11 * unit, y + unit, 2 * unit, size - 2 * unit);
  }
  if (tile === 'gate' && open) {
    ctx.fillStyle = '#81c784';
    ctx.fillRect(x + 6 * unit, y + 6 * unit, 4 * unit, 4 * unit);
  }
  if (tile === 'shelf') {
    const spines = ['#c62828', '#f6d46b', '#5c6bc0', '#72b043', '#ef6c00', '#00897b'];
    spines.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + unit + index * 2 * unit, y + 3 * unit, 2 * unit, 10 * unit);
    });
  }
  if (tile === 'engraving') {
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(x + 3 * unit, y + 6 * unit, 10 * unit, 2 * unit);
  }
  if (tile === 'desk') {
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(x + unit, y + 6 * unit, size - 2 * unit, 6 * unit);
  }
  if (tile === 'chest') {
    ctx.fillStyle = '#f6d46b';
    ctx.fillRect(x + 3 * unit, y + 5 * unit, 10 * unit, 8 * unit);
    ctx.fillStyle = '#212121';
    ctx.fillRect(x + 7 * unit, y + 8 * unit, 2 * unit, 2 * unit);
  }
  if (tile === 'wheel') {
    if (!cell(ctx, dungeon, (col + row) % 2, 0, x, y, unit)) fill(ctx, '#5d4e45', x, y, size);
    ctx.fillStyle = '#f6d46b';
    ctx.fillRect(x + 7 * unit, y + 7 * unit, 2 * unit, 2 * unit);
    ctx.fillRect(x + 3 * unit, y + 7 * unit, 3 * unit, 2 * unit);
    ctx.fillRect(x + 10 * unit, y + 7 * unit, 3 * unit, 2 * unit);
    ctx.fillRect(x + 7 * unit, y + 3 * unit, 2 * unit, 3 * unit);
    ctx.fillRect(x + 7 * unit, y + 10 * unit, 2 * unit, 3 * unit);
    ctx.fillStyle = '#efe6d4';
    ctx.fillRect(x + 4 * unit, y + 4 * unit, 2 * unit, 2 * unit);
    ctx.fillRect(x + 10 * unit, y + 4 * unit, 2 * unit, 2 * unit);
    ctx.fillRect(x + 4 * unit, y + 10 * unit, 2 * unit, 2 * unit);
    ctx.fillRect(x + 10 * unit, y + 10 * unit, 2 * unit, 2 * unit);
  }
  if (tile === 'block') {
    fill(ctx, '#1b242c', x, y, size);
    ctx.fillStyle = '#4db6ac';
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) ctx.fillRect(x + (2 + i * 7) * unit, y + (2 + j * 7) * unit, 5 * unit, 5 * unit);
    }
  }
  if (tile === 'pedestal') {
    if (!cell(ctx, floors, wood, 22, x, y, unit)) fill(ctx, '#c4a574', x, y, size);
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(x + 4 * unit, y + 9 * unit, 8 * unit, 4 * unit);
    ctx.fillStyle = '#f6d46b';
    ctx.fillRect(x + 6 * unit, y + 3 * unit, 4 * unit, 4 * unit);
    ctx.fillRect(x + 7 * unit, y + 6 * unit, 2 * unit, 4 * unit);
    ctx.fillRect(x + 4 * unit, y + 8 * unit, 3 * unit, 2 * unit);
  }
  if (tile === 'wire') {
    if (!cell(ctx, floors, wood, 22, x, y, unit)) fill(ctx, '#c4a574', x, y, size);
    ctx.fillStyle = '#00897b';
    ctx.fillRect(x, y + 7 * unit, size, 2 * unit);
    ctx.fillRect(x + 7 * unit, y, 2 * unit, size);
    ctx.fillStyle = '#f6d46b';
    ctx.fillRect(x + 6 * unit, y + 6 * unit, 4 * unit, 4 * unit);
  }
  if (tile === 'mix') {
    fill(ctx, '#5e35b1', x, y, size);
    ctx.fillStyle = '#b39ddb';
    ctx.fillRect(x + 4 * unit, y + 4 * unit, 8 * unit, 8 * unit);
  }
}

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, size: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

function near(map: Tile[][], x: number, y: number, kinds: Tile[]) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tile = map[y + dy]?.[x + dx];
      if (tile && kinds.includes(tile)) return true;
    }
  }
  return false;
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  worldX: number,
  worldY: number,
  camX: number,
  camY: number,
  tile: number,
  facing: 'up' | 'down' | 'left' | 'right',
  image: HTMLImageElement,
) {
  if (!ready(image)) return;
  // Fit the sprite to the tile so a person stands in the room instead of covering it.
  let height = tile * 1.2;
  let width = image.naturalWidth * (height / image.naturalHeight);
  if (width > tile * 1.15) {
    width = tile * 1.15;
    height = image.naturalHeight * (width / image.naturalWidth);
  }
  const dx = Math.round(worldX * tile - camX * tile - width / 2);
  const dy = Math.round((worldY + 0.35) * tile - camY * tile - height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (facing === 'left') {
    ctx.translate(dx + width, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, width, height);
  } else {
    ctx.drawImage(image, dx, dy, width, height);
  }
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
  const y = Math.round((spotY - 1.45 - camY) * tile);
  const font = Math.max(8, tile * 0.32);
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
