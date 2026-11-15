import { useEffect, useRef } from 'react';
import { ENTRIES, ENTRY_BY_ID, termHref, type Entry } from '../data/entries';
import { DEMOS } from '../demos';
import { Html } from '../components/ui';
import { AzBar } from '../components/Header';
import { TOPICS } from '../vis/registry';
import { Practice } from '../components/Practice';

function SeeAlso({ ids }: { ids: string[] }) {
  return <>{ids.filter(i => ENTRY_BY_ID[i]).map((i, n) => <span key={i}>{n > 0 && ', '}<a href={termHref(i)}>{ENTRY_BY_ID[i].headword}</a></span>)}</>;
}

/** A dictionary entry. `lecture` drops the demo (used by the e-Lecture panel on visualization pages). */
export function EntryView({ e, lecture = false }: { e: Entry; lecture?: boolean }) {
  const Demo = !lecture && !e.short && e.demo ? DEMOS[e.demo] : undefined;
  return (
    <article className={`entry${e.short ? ' short' : ''}`} id={e.id}>
      <div className="hw">
        <h3>{e.headword}</h3>
        {e.abbr && <span className="abbr">{e.abbr}</span>}
        <span className="pos">{e.pos}</span>
        <span className="cat">{e.cat}</span>
      </div>
      {e.short ? <Html as="p" className="def" html={e.definition} /> : (
        <>
          <ol className="senses">{e.senses.map((s, i) => <Html key={i} as="li" html={s} />)}</ol>
          {e.func && <Html className="func" html={e.func} />}
          <Html html={e.prose} />
          {Demo && <details className="try" open><summary>Try it: interactive demo</summary><Demo /></details>}
        </>
      )}
      <div className="xref">
        {!e.short && e.uses && <Html html={e.uses} />}
        {!e.short && e.library && <div><b>Library</b><span dangerouslySetInnerHTML={{ __html: e.library }} /></div>}
        {e.origin && <div><b>Origin</b><span dangerouslySetInnerHTML={{ __html: e.origin }} /></div>}
        <div><b>See also</b><SeeAlso ids={e.seeAlso} /></div>
      </div>
    </article>
  );
}

export function TermPage({ id }: { id: string }) {
  const e = ENTRY_BY_ID[id];
  const i = ENTRIES.indexOf(e), prev = ENTRIES[i - 1], next = ENTRIES[i + 1];
  const L = e.headword[0].toUpperCase();
  const idx = useRef<HTMLElement>(null);

  // Keep the current term visible in the side index.
  useEffect(() => {
    const cur = idx.current?.querySelector<HTMLElement>('a.cur');
    if (cur && idx.current) idx.current.scrollTop = cur.offsetTop - idx.current.clientHeight / 2;
  }, [id]);

  let last = '';
  return (
    <div className="dict" id="v-term">
      <aside className="index" ref={idx} aria-label="All terms">
        <a href="#terms" style={{ fontFamily: 'var(--f-ui)', fontSize: '.8rem' }}>← All terms</a>
        <div className="az"><AzBar /></div>
        <ul>
          {ENTRIES.flatMap(x => {
            const l = x.headword[0].toUpperCase(), head = l !== last;
            last = l;
            return [
              head && <li key={'h' + l} className="lt">{l}</li>,
              <li key={x.id} className={x.short ? 'short' : ''}><a href={termHref(x.id)} className={x.id === id ? 'cur' : ''}>{x.headword}</a></li>,
            ];
          })}
          <li className="lt"><a href="#bib" style={{ padding: 0 }}>Bibliography</a></li>
        </ul>
      </aside>
      <div id="entries" key={id}>
        <nav className="crumbs" aria-label="Breadcrumb"><a href="#library">Library</a> › <a href="#terms">Dictionary</a> › <a href={`#L-${L}`}>{L}</a> › {e.headword}</nav>
        {/* key: remount demos when moving between terms so their state starts fresh */}
        {TOPICS.some(t => t.entry === id) && <p className="xref"><span><b>Visualization</b><a href={`#${TOPICS.find(t => t.entry === id)!.id}`}>Open the step-by-step visualization →</a></span></p>}
        <EntryView key={id} e={e} />
        <Practice key={id} entryId={id} />
        <nav className="prevnext" aria-label="Neighbouring terms">
          {prev && <a className="prev" href={termHref(prev.id)}><span>← previous</span><b>{prev.headword}</b></a>}
          {next && <a className="next" href={termHref(next.id)}><span>next →</span><b>{next.headword}</b></a>}
        </nav>
      </div>
    </div>
  );
}
