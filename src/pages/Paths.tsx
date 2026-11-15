import { useAccount } from '../account';
import { Ctf } from '../components/Ctf';
import { ctfId } from '../data/ctf';
import {
  PATH_BY_ID,
  PATH_TREE,
  PRACTICAL_PATHS,
  TREE_PATHS,
  stepHref,
  stepTitle,
  type Step,
  type TreeNode,
} from '../data/paths';
import { PracticalPath } from './PracticalPath';

const NW = 156;
const NH = 46;
const GAPX = 36;
const GAPY = 64;

interface Box { id: string; kind: Step['kind']; x: number; y: number; branch?: string; path?: string }

function walk(node: TreeNode, depth: number, leaf: number): { leaf: number; boxes: Box[]; kids: { parent: Box; children: Box[] }[] } {
  const y = depth * (NH + GAPY) + 52;
  if (!node.children?.length) {
    const box: Box = { id: node.id, kind: node.kind, x: leaf * (NW + GAPX) + NW / 2, y, branch: node.branch, path: node.path };
    return { leaf: leaf + 1, boxes: [box], kids: [] };
  }
  const boxes: Box[] = [];
  const kids: { parent: Box; children: Box[] }[] = [];
  const childBoxes: Box[] = [];
  let cursor = leaf;
  for (const child of node.children) {
    const sub = walk(child, depth + 1, cursor);
    cursor = sub.leaf;
    boxes.push(...sub.boxes);
    kids.push(...sub.kids);
    childBoxes.push(sub.boxes[0]);
  }
  const x = childBoxes.reduce((s, b) => s + b.x, 0) / childBoxes.length;
  const box: Box = { id: node.id, kind: node.kind, x, y, branch: node.branch, path: node.path };
  return { leaf: cursor, boxes: [box, ...boxes], kids: [{ parent: box, children: childBoxes }, ...kids] };
}

function lines(title: string): string[] {
  if (title.length <= 20) return [title];
  const cut = title.lastIndexOf(' ', 20);
  const at = cut > 6 ? cut : 20;
  return [title.slice(0, at), title.slice(at).trim()];
}

export function PathTree({ focus }: { focus?: Set<string> }) {
  const { progress } = useAccount();
  const laid = walk(PATH_TREE, 0, 0);
  const width = laid.leaf * (NW + GAPX) - GAPX + 8;
  const height = Math.max(...laid.boxes.map(b => b.y)) + NH + 16;
  return (
    <div className="tree-scroll">
      <svg className="path-tree" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Learning path tree">
        {laid.kids.map(({ parent, children }) => {
          const y1 = parent.y + NH / 2;
          const y2 = children[0].y - NH / 2;
          const mid = (y1 + y2) / 2;
          const left = Math.min(...children.map(c => c.x));
          const right = Math.max(...children.map(c => c.x));
          const dim = focus && !children.some(c => focus.has(c.id));
          return (
            <g key={parent.id} className={dim ? 'dim' : ''}>
              <path d={`M ${parent.x} ${y1} V ${mid} H ${left} H ${right}`} />
              {children.map(c => <path key={c.id} d={`M ${c.x} ${mid} V ${y2}`} />)}
              {children.filter(c => c.branch).map(c => (
                <a key={c.branch} href={`#path-${c.path}`}>
                  <text className="tree-branch" x={(parent.x + c.x) / 2} y={mid - 8} textAnchor="middle">{c.branch}</text>
                </a>
              ))}
            </g>
          );
        })}
        <text className="tree-branch" x={laid.boxes[0].x} y={16} textAnchor="middle">{PATH_TREE.branch}</text>
        {laid.boxes.map(b => {
          const title = stepTitle(b);
          const rows = lines(title);
          const status = progress[b.id];
          const dim = focus && !focus.has(b.id);
          return (
            <a key={b.id} href={stepHref(b)} className={`tree-node ${status ?? ''} ${dim ? 'dim' : ''}`}>
              <rect x={b.x - NW / 2} y={b.y - NH / 2} width={NW} height={NH} rx={6} />
              <text x={b.x} y={b.y - (rows[1] ? 7 : 0)} textAnchor="middle" dominantBaseline="middle">
                {rows.map((row, i) => <tspan key={row} x={b.x} dy={i ? 15 : 0}>{row}</tspan>)}
              </text>
              {status === 'done' && <text className="tree-tick" x={b.x + NW / 2 - 14} y={b.y - NH / 2 + 14}>✓</text>}
            </a>
          );
        })}
      </svg>
    </div>
  );
}

function stats(steps: Step[], progress: Record<string, string>) {
  const done = steps.filter(s => progress[s.id] === 'done').length;
  const next = steps.find(s => progress[s.id] !== 'done') ?? steps[0];
  return { done, total: steps.length, next };
}

export function Paths() {
  const { user, progress, openAuth } = useAccount();
  return (
    <section className="paths">
      <nav className="crumbs"><a href="#library">Library</a> › Learning path</nav>
      <h1>Learning path</h1>
      <p className="paths-lead">Start at modular arithmetic. The tree splits into classical ciphers, public-key cryptography, oblivious computation, and private sets.</p>
      {!user && <p className="paths-signin">Sign in to keep this progress on your account. <button type="button" className="btn" onClick={() => openAuth()}>Create an account</button></p>}
      <p className="tree-key"><i className="done" /> Learned <i className="seen" /> In progress</p>
      <PathTree />
      <div className="path-grid">
        {TREE_PATHS.map(p => {
          const s = stats(p.steps, progress);
          const captured = progress[ctfId(p.id)] === 'done';
          return (
            <a key={p.id} className="path-card" href={`#path-${p.id}`} style={{ ['--pc' as string]: p.color }}>
              <b>{p.title}</b>
              <span>{s.done} of {s.total} learned</span>
              <span>{captured ? 'Flag captured' : 'Final challenge'}</span>
            </a>
          );
        })}
      </div>
      <h2 className="practical-heading">Practical workplace path</h2>
      <p className="paths-lead">A Future of Work practice path on verifying a software download. Results are a learning record, not a certification.</p>
      <div className="path-grid">
        {PRACTICAL_PATHS.map(p => (
          <a key={p.id} className="path-card" href={`#path-${p.id}`} style={{ ['--pc' as string]: p.color }}>
            <b>{p.title}</b>
            <span>{p.steps.length} guided steps</span>
            <span>Assessment · lab · challenge</span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function PathDetail({ id }: { id: string }) {
  const path = PATH_BY_ID[id];
  const { user, progress, openAuth } = useAccount();
  if (!path) return <p className="noresult">That learning path is not in the catalog. <a href="#paths">The learning tree</a></p>;
  if (path.kind === 'practical') return <PracticalPath id={id} />;
  const s = stats(path.steps, progress);
  const finished = s.done === s.total;
  return (
    <section className="paths">
      <nav className="crumbs"><a href="#library">Library</a> › <a href="#paths">Learning path</a> › {path.title}</nav>
      <h1>{path.title}</h1>
      <p className="paths-lead">{path.blurb}</p>
      <p className="path-progress" style={{ ['--pc' as string]: path.color }}><i style={{ width: `${(100 * s.done) / s.total}%` }} />{finished ? 'You finished this path.' : `${s.done} of ${s.total} learned`}</p>
      {!finished && <a className="btn-l primary" href={stepHref(s.next)}>Continue with {stepTitle(s.next)}</a>}
      {!user && <p className="paths-signin">These checkmarks are saved only while you are signed in. <button type="button" className="btn" onClick={() => openAuth()}>Sign in</button></p>}
      <PathTree focus={new Set(path.steps.map(step => step.id))} />
      <Ctf pathId={id} />
    </section>
  );
}
