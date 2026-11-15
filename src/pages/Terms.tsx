import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { ENTRIES, termHref, type Entry } from '../data/entries';
import { DepMap } from '../components/DepMap';

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '');
export const snippet = (e: Entry) => stripTags(e.short ? e.definition : e.senses[0]);
const CATEGORIES = [...new Set(ENTRIES.map(e => e.cat))].sort();
const haystack = (e: Entry) => `${e.headword} ${e.abbr} ${snippet(e)} ${e.cat}`.toLowerCase();

/** Entries matching a search string and (optionally) a category, in A–Z order. */
export function searchEntries(q: string, cat: string): Entry[] {
  const s = q.trim().toLowerCase();
  return ENTRIES.filter(e => (!cat || e.cat === cat) && (!s || haystack(e).includes(s)));
}

export function Terms() {
  const { query } = useApp();
  const [cat, setCat] = useState('');
  const hits = useMemo(() => searchEntries(query, cat), [query, cat]);
  const byLetter = useMemo(() => {
    const m = new Map<string, Entry[]>();
    hits.forEach(e => { const L = e.headword[0].toUpperCase(); m.set(L, [...(m.get(L) ?? []), e]); });
    return [...m];
  }, [hits]);

  return (
    <section id="v-terms">
      <nav className="crumbs"><a href="#library">Library</a> › Dictionary</nav>
      <div className="front">
        <h1>All terms</h1>
        <p className="prose">Pick a term to open its page. Entries marked <span className="demo-tag">demo</span> include an interactive demo. <span className="toy">TOY · NOT SECURE</span></p>
        <details className="try">
          <summary>How to read an entry</summary>
          <div className="howto" style={{ padding: '4px 16px 16px' }}>
            <div><b>Headword</b>Term, abbreviation, part of speech and category.</div>
            <div><b>Senses</b>Numbered meanings, most common first.</div>
            <div><b>Try it</b>An interactive demo. When a demo hides one party's values, <i>Alice sees</i> and <i>Bob sees</i> (or keys A / B / E) turn the other party's secrets into <span className="redact-demo">hidden</span> blocks.</div>
            <div><b>Practice</b>Every term ends with a short question. A correct answer can be saved on your account.</div>
            <div><b>Origin · See also</b>Bracketed citations open the paper in the bibliography; cross-references open related entries.</div>
          </div>
        </details>
        <details className="try"><summary>Map of how the entries depend on each other</summary><DepMap /></details>
      </div>
      <div className="browse">
        <div className="controls" aria-label="Filter by category">
          {['', ...CATEGORIES].map(c => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c || 'All'}</button>)}
        </div>
        <span className="note">{hits.length} of {ENTRIES.length} terms</span>
      </div>
      <div id="listing">
        {byLetter.map(([L, es]) => (
          <section key={L} className="hl" id={`L-${L}`}>
            <h2 className="lh">{L}</h2>
            <ul className="terms">
              {es.map(e => (
                <li key={e.id}>
                  <a href={termHref(e.id)}>
                    <span className="tc-h"><b>{e.headword}</b>{e.abbr && <> <span className="abbr">{e.abbr}</span></>} <i>{e.pos}</i>{!e.short && e.demo && <> <span className="demo-tag">demo</span></>}</span>
                    <span className="tc-s">{snippet(e)}</span>
                    <span className="tc-c">{e.cat}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {!hits.length && <p className="noresult">No entry matches. Try a shorter word or an abbreviation such as OT or VOLE.</p>}
    </section>
  );
}
