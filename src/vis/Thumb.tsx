import type { Thumb as Kind } from './registry';

// Simple white-line illustrations for the home tiles, one motif per kind of visualization.
const W = { fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const box = (x: number, y: number, w: number, h: number, txt?: string, fill = false) => (
  <g key={`${x},${y}`}><rect x={x} y={y} width={w} height={h} rx={3} {...W} fill={fill ? '#fff' : 'none'} />{txt && <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fill={fill ? '#333' : '#fff'} fontSize={14} fontWeight={700} fontFamily="sans-serif">{txt}</text>}</g>
);

export function Thumb({ kind }: { kind: Kind }) {
  let body: JSX.Element;
  switch (kind) {
    case 'parties': body = <>{box(8, 30, 40, 40, 'A')}{box(112, 30, 40, 40, 'B')}<path d="M54 42 H104 M96 36 l8 6 -8 6 M106 60 H56 M64 54 l-8 6 8 6" {...W} /></>; break;
    case 'matrix': body = <>{Array.from({ length: 16 }, (_, i) => <rect key={i} x={30 + (i % 4) * 26} y={10 + Math.floor(i / 4) * 22} width={20} height={16} rx={2} {...W} fill={(i * 7) % 3 ? 'none' : '#fff'} />)}</>; break;
    case 'bars': body = <>{[50, 22, 36, 64, 30, 44].map((h, i) => <rect key={i} x={18 + i * 22} y={88 - h} width={16} height={h} fill="#fff" opacity={0.9} />)}</>; break;
    case 'wheel': body = <><circle cx={80} cy={50} r={40} {...W} /><circle cx={80} cy={50} r={24} {...W} /><path d="M80 10 v14 M80 76 v14 M40 50 h14 M106 50 h14" {...W} /></>; break;
    case 'curve': body = <><path d="M20 80 C40 80 50 20 80 20 C110 20 120 80 140 80" {...W} /><path d="M40 70 L120 32" {...W} strokeDasharray="5 5" />{[[40, 70], [80, 20], [120, 32]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={5} fill="#fff" />)}</>; break;
    case 'venn': body = <><circle cx={62} cy={50} r={32} {...W} /><circle cx={98} cy={50} r={32} {...W} /><path d="M80 24 A32 32 0 0 1 80 76 A32 32 0 0 1 80 24" fill="#fff" opacity={0.6} /></>; break;
    case 'points': body = <><path d="M15 85 H150 M15 85 V10" {...W} /><path d="M20 70 C50 20 100 90 145 25" {...W} />{[[45, 46], [80, 52], [115, 58]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={5} fill="#fff" />)}</>; break;
    case 'lock': body = <><path d="M60 45 V32 a20 20 0 0 1 40 0 V45" {...W} /><rect x={48} y={45} width={64} height={44} rx={5} fill="#fff" /><circle cx={80} cy={64} r={5} fill="#555" /></>; break;
    case 'squares': body = <>{Array.from({ length: 24 }, (_, i) => <rect key={i} x={20 + (i % 8) * 16} y={22 + Math.floor(i / 8) * 18} width={12} height={12} rx={2} fill="#fff" opacity={(i * 5) % 7 > 3 ? 1 : 0.35} />)}</>; break;
    case 'cave': body = <><path d="M80 90 V72 C25 72 25 15 80 15 C135 15 135 72 80 72" {...W} strokeWidth={9} opacity={0.6} /><rect x={74} y={8} width={12} height={16} fill="#fff" /><circle cx={50} cy={40} r={6} fill="#fff" /></>; break;
    case 'table': body = <>{[0, 1, 2, 3].map(r => <g key={r}>{box(30, 10 + r * 20, 46, 16)}{box(84, 10 + r * 20, 46, 16, undefined, r === 2)}</g>)}</>; break;
    case 'zigzag': body = <><path d="M15 20 L45 80 L75 20 L105 80 L135 20" {...W} />{[[15, 20], [45, 80], [75, 20], [105, 80], [135, 20], [30, 50], [60, 50], [90, 50], [120, 50]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={5} fill="#fff" />)}</>; break;
    case 'pixels': body = <>{Array.from({ length: 64 }, (_, i) => { const x = i % 8, y = Math.floor(i / 8); const on = x > 1 && x < 6 && y > 3; return <rect key={i} x={40 + x * 10} y={12 + y * 10} width={9} height={9} fill="#fff" opacity={on ? 1 : (x + y) % 3 === 0 && y < 4 ? 0.8 : 0.2} />; })}</>; break;
    case 'gate': body = <><path d="M50 20 H80 a30 30 0 0 1 0 60 H50 Z" {...W} /><path d="M20 35 H50 M20 65 H50 M110 50 H140" {...W} /></>; break;
    case 'bins': body = <>{Array.from({ length: 6 }, (_, i) => box(14 + i * 23, 50, 19, 30, undefined, i === 1 || i === 4))}<path d="M48 40 C60 15 100 15 112 40 M106 34 l6 6 2 -8" {...W} /></>; break;
    case 'arrows': body = <>{[0, 1, 2, 3].map(i => <g key={i}>{box(20, 10 + i * 20, 22, 16)}{box(118, 10 + i * 20, 22, 16)}</g>)}<path d="M46 18 L114 78 M46 38 L114 18 M46 58 L114 58 M46 78 L114 38" {...W} strokeWidth={2} /></>; break;
    case 'line': body = <><path d="M15 85 H150 M15 85 V10" {...W} /><path d="M20 80 L145 20" {...W} strokeDasharray="6 6" />{[[40, 70], [70, 56], [100, 41], [130, 27]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={5} fill="#fff" />)}</>; break;
  }
  return <svg viewBox="0 0 160 100" aria-hidden="true">{body}</svg>;
}
