import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { GROUPS, TOPICS, type Topic } from '../vis/registry';
import { Thumb } from '../vis/Thumb';
import { SunhacksMark } from '../components/SunhacksMark';

/** Bookmarked topics, in the order they lead the gallery. */
const POPULAR = ['rsa', 'ecc', 'dh', 'caesar'];

const TIPS = [
  <>Press <b>space</b> to play or pause any animation, and <b>←</b> / <b>→</b> to step through it one line of pseudo-code at a time.</>,
  <>Switch <b>Alice sees</b> / <b>Bob sees</b> in the top bar (or press <b>A</b> / <b>B</b>) and every value that party never learns turns into a striped block.</>,
  <>Each visualization has an <b>e-Lecture</b> button with the full dictionary entry, its origin papers and related terms.</>,
  <>Open <a href="#psufw">PSU Frameworks &amp; Aborts</a>, tick “connection drops”, and stop after step 2: RPMT has already leaked the intersection size.</>,
  <>Use the yellow <b>actions</b> menu at the bottom-left of a visualization to enter your own messages, sets or keys, then press <b>Go</b>.</>,
  <>The <a href="#lib-psu">PSU library</a> has measured benchmarks from the SoK and a chooser that ranks protocols for your setting.</>,
];

export function Home() {
  const { go } = useApp();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [tip, setTip] = useState(0);
  const s = q.trim().toLowerCase();
  const shown = useMemo(() => {
    const match = (t: Topic) =>
      (tag === 'popular' ? POPULAR.includes(t.id) : !tag || t.group === tag || t.tags.includes(tag)) &&
      (!s || `${t.title} ${t.abbr} ${t.tags.join(' ')} ${t.blurb} ${t.group}`.toLowerCase().includes(s));
    const list = TOPICS.filter(match);
    if (tag && tag !== 'popular') return list;
    const pinned = POPULAR.map(id => list.find(t => t.id === id)).filter((t): t is Topic => !!t);
    return [...pinned, ...list.filter(t => !POPULAR.includes(t.id))];
  }, [s, tag]);

  return (
    <section className="vhome">
      <div className="vhome-hero">
        <SunhacksMark variant="banner" />
        <div className="vhome-logo" aria-label="VisuCrypto">VISU<span>CRYPTO</span></div>
        <p className="vhome-tag">visualising cryptographic protocols through step-by-step animation</p>
        <form className="vhome-search" role="search" onSubmit={e => { e.preventDefault(); if (shown.length === 1) go(shown[0].id); }}>
          <input type="search" placeholder="Search… e.g. OT, PSU, RSA, shuffle" aria-label="Search visualizations" value={q} onChange={e => setQ(e.target.value)} />
          {(q || tag) && <button type="button" className="btn ghost" onClick={() => { setQ(''); setTag(''); }}>Clear</button>}
        </form>
        <div className="vhome-groups">
          <button type="button" className="chip pop" aria-pressed={tag === 'popular'} onClick={() => setTag('popular')}>★ Popular</button>
          {['', ...GROUPS].map(g => <button key={g} type="button" className="chip" aria-pressed={tag === g} onClick={() => setTag(g)}>{g || 'All topics'}</button>)}
        </div>
      </div>

      <a className="vpath-link" href="#paths">
        <b>Learning path</b>
        <span>One tree, from modular arithmetic into ciphers, public-key cryptography, oblivious computation, and private sets.</span>
      </a>

      <div className="vhome-tip">
        <div className="vhome-tip-h"><span>Do you know?</span><button type="button" onClick={() => setTip(x => (x + 1) % TIPS.length)}>Next random tip</button></div>
        <div>{TIPS[tip]}</div>
      </div>

      <div className="vgrid">
        {shown.map(t => (
          <a key={t.id} className="vtile" href={`#${t.id}`}>
            {POPULAR.includes(t.id) && <span className="vtile-star" title="Popular"><span className="vtile-star-label">Popular</span>★</span>}
            <div className="vtile-img" style={{ background: t.color }}><Thumb kind={t.thumb} /></div>
            <div className="vtile-h"><b>{t.title}</b><span className={`vtile-badge ${t.animated ? '' : 'int'}`}>{t.animated ? 'Animated' : 'Interactive'}</span></div>
            <div className="vtile-tags">
              {t.tags.slice(0, 4).map(x => <button key={x} type="button" onClick={e => { e.preventDefault(); setTag(x); }}>{x}</button>)}
            </div>
          </a>
        ))}
      </div>
      {!shown.length && <p className="noresult" style={{ textAlign: 'center' }}>No visualization matches.</p>}
    </section>
  );
}
