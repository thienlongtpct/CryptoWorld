import { LOCATION_BY_ID, type LandmarkArt, type LocationId } from './locations';

/** One rectangle of a 16 × 16 pixel icon: x, y, w, h, and a colour key or a literal colour. */
type Px = [number, number, number, number, string];

const O = '#1b1410';

/** Map markers: a small pixel version of each landmark's silhouette, in its accent palette. */
const ICONS: Record<LandmarkArt, Px[]> = {
  'compass-plaza': [
    [3, 1, 10, 14, O], [1, 3, 14, 10, O], [4, 2, 8, 12, 'l'], [2, 4, 12, 8, 'l'],
    [7, 2, 2, 12, 'g'], [2, 7, 12, 2, 'g'], [6, 6, 4, 4, 'g'], [7, 7, 2, 2, '#fff4c4'],
  ],
  'arcane-library': [
    [1, 2, 4, 13, O], [11, 2, 4, 13, O], [2, 3, 2, 11, 'l'], [12, 3, 2, 11, 'l'],
    [3, 5, 10, 10, O], [4, 6, 8, 8, 'a'], [4, 6, 8, 1, 'd'],
    [6, 7, 4, 4, O], [7, 8, 2, 2, 'g'], [7, 12, 2, 3, 'd'], [2, 1, 2, 1, 'a'], [12, 1, 2, 1, 'a'],
  ],
  'letter-ruins': [
    [2, 4, 3, 11, O], [3, 5, 1, 9, 'l'], [11, 6, 3, 9, O], [12, 7, 1, 7, 'l'],
    [2, 2, 7, 3, O], [3, 3, 5, 1, 'a'], [6, 7, 5, 5, O], [7, 8, 3, 3, 'g'], [8, 8, 1, 2, 'd'], [1, 14, 14, 1, 'd'],
  ],
  'hash-fountain': [
    [1, 9, 14, 5, O], [2, 10, 12, 3, 'a'], [3, 10, 10, 1, 'l'], [7, 3, 2, 7, O], [7, 4, 2, 5, '#c3ccce'],
    [6, 0, 4, 4, O], [7, 1, 2, 2, 'g'], [4, 6, 1, 1, 'g'], [11, 6, 1, 1, 'g'], [3, 8, 1, 1, 'g'], [12, 8, 1, 1, 'g'],
    [5, 12, 1, 1, 'g'], [7, 12, 1, 1, 'g'], [9, 12, 1, 1, 'g'], [11, 12, 1, 1, 'g'],
  ],
  'twin-towers': [
    [1, 3, 4, 12, O], [2, 4, 2, 10, '#9aa3ad'], [11, 3, 4, 12, O], [12, 4, 2, 10, '#9aa3ad'],
    [2, 1, 2, 2, 'a'], [12, 1, 2, 2, 'a'], [2, 0, 2, 1, 'g'], [12, 0, 2, 1, 'g'],
    [2, 6, 2, 2, '#f48fb1'], [12, 6, 2, 2, '#64b5f6'], [5, 10, 6, 2, O], [5, 10, 6, 1, '#9a6b40'], [7, 8, 2, 2, '#fff4cf'],
  ],
  'key-citadel': [
    [1, 2, 4, 13, O], [11, 2, 4, 13, O], [2, 3, 2, 11, 'a'], [12, 3, 2, 11, 'a'], [2, 1, 2, 1, 'g'], [12, 1, 2, 1, 'g'],
    [4, 6, 8, 9, O], [5, 7, 6, 7, 'l'], [6, 8, 2, 2, 'g'], [8, 9, 2, 1, 'g'], [6, 11, 2, 2, '#cfd8dc'], [8, 12, 2, 1, '#cfd8dc'],
  ],
  'sealed-forge': [
    [2, 6, 10, 9, O], [3, 7, 8, 7, 'a'], [10, 1, 4, 8, O], [11, 2, 2, 6, 'd'], [11, 0, 2, 1, 'g'],
    [4, 9, 4, 5, O], [5, 10, 2, 4, 'g'], [11, 12, 4, 3, O], [12, 12, 2, 1, '#78909c'],
  ],
  'share-shrines': [
    [1, 8, 4, 6, O], [2, 9, 2, 5, 'l'], [6, 4, 4, 10, O], [7, 5, 2, 9, 'l'], [11, 8, 4, 6, O], [12, 9, 2, 5, 'l'],
    [2, 6, 2, 2, 'g'], [7, 2, 2, 2, 'g'], [12, 6, 2, 2, '#5a5c7a'], [5, 14, 6, 2, O], [6, 14, 4, 1, 'g'],
  ],
  'veiled-stall': [
    [1, 2, 14, 4, O], [2, 3, 3, 2, 'a'], [5, 3, 3, 2, '#e9d8a6'], [8, 3, 3, 2, 'a'], [11, 3, 3, 2, '#e9d8a6'],
    [2, 6, 1, 8, O], [13, 6, 1, 8, O], [3, 6, 10, 5, 'd'], [5, 6, 1, 5, 'a'], [10, 6, 1, 5, 'a'],
    [2, 11, 12, 3, O], [3, 11, 10, 2, '#8d6e63'], [4, 9, 2, 2, '#c8a27a'], [7, 9, 2, 2, '#c8a27a'], [10, 9, 2, 2, '#c8a27a'],
  ],
  'overlap-beds': [
    [1, 4, 8, 8, O], [7, 4, 8, 8, O], [2, 5, 6, 6, '#f48fb1'], [8, 5, 6, 6, '#ffd54f'], [7, 5, 2, 6, 'g'], [7, 7, 2, 2, '#ffffff'],
  ],
  'proof-cavern': [
    [1, 5, 14, 10, O], [2, 6, 12, 8, 'a'], [4, 2, 8, 4, O], [5, 3, 6, 3, 'l'], [6, 9, 4, 6, '#0d1220'],
    [3, 8, 1, 3, 'g'], [12, 7, 1, 3, 'g'], [6, 7, 1, 1, 'g'], [8, 7, 1, 1, 'g'], [9, 7, 1, 1, '#3a4766'],
  ],
  'star-observatory': [
    [3, 6, 10, 5, O], [4, 7, 8, 4, 'a'], [5, 5, 6, 1, O], [2, 10, 12, 5, O], [3, 11, 10, 3, 'd'],
    [4, 4, 1, 1, 'g'], [5, 3, 1, 1, 'g'], [11, 4, 1, 1, 'g'], [10, 3, 1, 1, 'g'], [8, 3, 1, 2, 'g'], [7, 1, 3, 1, '#ffffff'], [8, 0, 1, 3, '#ffffff'],
  ],
  'flag-gate': [
    [2, 3, 12, 12, O], [3, 4, 10, 11, '#56636b'], [5, 6, 6, 9, '#0d1220'], [4, 1, 2, 4, 'g'], [10, 1, 2, 4, 'g'],
    [7, 8, 1, 5, 'g'], [8, 8, 2, 2, 'g'],
  ],
};

export function LocationIcon({ id, size = 24, title }: { id: LocationId; size?: number; title?: string }) {
  const location = LOCATION_BY_ID[id];
  const { accent } = location;
  const colour = (key: string) => (key === 'a' ? accent.base : key === 'd' ? accent.dark : key === 'l' ? accent.light : key === 'g' ? accent.glow : key);
  return (
    <svg
      className="loc-icon"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {ICONS[location.art].map(([x, y, w, h, c], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={colour(c)} />)}
    </svg>
  );
}
