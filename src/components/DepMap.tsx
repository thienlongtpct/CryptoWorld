import { useState } from 'react';
import { useApp } from '../state';

// Nodes: [x, y, label, route]. Columns run from foundations (left) to applications (right).
const N: Record<string, [number, number, string, string]> = {
  dh: [70, 50, 'Diffie–Hellman', 'dh'], ss: [70, 130, 'Secret sharing', 'ss'], com: [70, 210, 'Commitment', 'commit'], he: [70, 290, 'Homomorphic enc.', 'he'],
  ot: [240, 50, 'Oblivious Transfer', 'ot'], gc: [240, 130, 'Garbled circuits', 'gc'], ck: [240, 290, 'Cuckoo hashing', 'cuckoo'],
  ext: [410, 50, 'OT extension', 'otext'], sh: [410, 210, 'Oblivious shuffle', 'shuffle'], okvs: [410, 290, 'OKVS', 'okvs'],
  pcg: [580, 50, 'Silent OT / PCG', 'pcg'], vole: [580, 130, 'VOLE', 'vole'],
  oprf: [750, 70, 'OPRF', 'oprf'], opprf: [750, 170, 'OPPRF', 'opprf'], zk: [750, 270, 'Zero-knowledge', 'zk'],
  psi: [920, 70, 'PSI', 'psi'], cpsi: [920, 170, 'Circuit-PSI', 'circuit-psi'], psu: [920, 270, 'PSU', 'psu'],
};
const E: [string, string][] = [['dh', 'ot'], ['ot', 'ext'], ['ot', 'gc'], ['ext', 'pcg'], ['pcg', 'vole'], ['ext', 'oprf'], ['vole', 'oprf'], ['okvs', 'oprf'], ['dh', 'oprf'],
  ['oprf', 'opprf'], ['okvs', 'opprf'], ['oprf', 'psi'], ['ck', 'psi'], ['he', 'psi'], ['opprf', 'cpsi'], ['gc', 'cpsi'], ['ss', 'cpsi'], ['ck', 'cpsi'],
  ['sh', 'psu'], ['ot', 'psu'], ['opprf', 'psu'], ['okvs', 'psu'], ['ss', 'sh'], ['ext', 'sh'], ['com', 'zk'], ['vole', 'zk']];
const COLS: [number, string][] = [[70, 'FOUNDATIONS'], [240, 'BASE'], [410, 'SCALING'], [580, 'CORRELATIONS'], [750, 'FUNCTIONALITIES'], [920, 'APPLICATIONS']];
const W = 128, H = 34;

/** Everything reachable from k following edges forwards (descendants) or backwards (prerequisites). */
function closure(k: string, forward: boolean): Set<string> {
  const out = new Set<string>(), st = [k];
  while (st.length) {
    const c = st.pop()!;
    E.forEach(([a, b]) => { const [f, t] = forward ? [a, b] : [b, a]; if (f === c && !out.has(t)) { out.add(t); st.push(t); } });
  }
  return out;
}

export function DepMap() {
  const { go } = useApp();
  const [focus, setFocus] = useState<string | null>(null);
  const pre = focus ? closure(focus, false) : new Set<string>(), post = focus ? closure(focus, true) : new Set<string>();
  const inPre = (x: string) => x === focus || pre.has(x), inPost = (x: string) => x === focus || post.has(x);
  return (
    <div className="lab depmap"><div className="scroll-x">
      <svg viewBox="0 0 1000 340" role="img" aria-label="Dependency map of cryptographic primitives">
        {COLS.map(([x, l]) => <text key={l} className="dcol" x={x} y={14} textAnchor="middle">{l}</text>)}
        {E.map(([a, b]) => {
          const [x1, y1] = N[a], [x2, y2] = N[b];
          const on = focus && ((inPre(a) && inPre(b)) || (inPost(a) && inPost(b)));
          const d = x1 === x2 ? `M${x1} ${y1 + H / 2} L${x2} ${y2 - H / 2}`
            : `M${x1 + W / 2} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2 - W / 2} ${y2}`;
          return <path key={a + b} className={`de ${focus ? (on ? 'on' : 'dim') : ''}`} d={d} />;
        })}
        {Object.entries(N).map(([k, [x, y, label, route]]) => {
          const cls = !focus ? '' : k === focus ? 'focus' : pre.has(k) ? 'pre' : post.has(k) ? 'post' : 'dim';
          return (
            <g key={k} className={`dn ${cls}`} tabIndex={0} role="link" aria-label={label}
              onMouseEnter={() => setFocus(k)} onFocus={() => setFocus(k)} onMouseLeave={() => setFocus(null)} onBlur={() => setFocus(null)}
              onClick={() => go(route)} onKeyDown={e => { if (e.key === 'Enter') go(route); }}>
              <rect x={x - W / 2} y={y - H / 2} width={W} height={H} rx={5} />
              <text x={x} y={y}>{label}</text>
            </g>
          );
        })}
      </svg>
    </div></div>
  );
}
