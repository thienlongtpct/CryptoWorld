import { useEffect, useLayoutEffect } from 'react';
import { useAccount } from './account';
import { accessReason, isRestricted, routeBase } from './access';
import { useApp, type View } from './state';
import { ENTRY_BY_ID } from './data/entries';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { Terms } from './pages/Terms';
import { TermPage } from './pages/TermPage';
import { ContentPage } from './pages/ContentPage';
import { Bibliography } from './pages/Bibliography';
import { PathDetail, Paths } from './pages/Paths';
import { Lesson } from './pages/Lesson';
import { Research } from './pages/Research';
import { PATH_BY_ID, LESSON_BY_ID } from './data/paths';
import { TOPIC_PAGES } from './vis/topics';
import { TOPIC_BY_ID } from './vis/registry';
import { SunhacksMark } from './components/SunhacksMark';
import { Tour, tourLabel } from './pages/Tour';
import { World } from './world/World';
import './world/world.css';

const PAGE_TITLES: Record<string, string> = {
  library: 'Library',
  research: 'Research Desk',
  terms: 'All terms', classical: 'Classical cryptography', modern: 'Modern cryptography',
  'lib-psi': 'PSI library', 'lib-psu': 'PSU library', bib: 'Bibliography',
  paths: 'Learning paths',
};

/** Which page owns an in-page anchor such as #cl-caesar or #pp-pt26. */
function pageForAnchor(id: string): string | null {
  if (id.startsWith('L-')) return 'terms';
  if (id.startsWith('cl-')) return 'classical';
  if (id.startsWith('mo-')) return 'modern';
  if (id.startsWith('psu-') || id.startsWith('pp-')) return 'lib-psu';
  if (id.startsWith('psi-') || id.startsWith('ip-')) return 'lib-psi';
  return null;
}

export function App() {
  const { route, view, setView, cite } = useApp();
  const { ready, user, requestAccess } = useAccount();
  const base = routeBase(route);
  const worldRoute = base === '' || base === 'top' || base === 'world';
  const restricted = isRestricted(route, !!ENTRY_BY_ID[base]);
  const checking = !ready && restricted;
  // Guests stay on the world for gated lessons; public desks (research) still open as a World layer.
  const showWorld = !checking && (worldRoute || (!user && restricted));
  const touring = base === 'tour-1' || base === 'tour-2' || base === 'tour-3' || base === 'tour-done';
  const Topic = TOPIC_PAGES[base];
  const lesson = !Topic && base.startsWith('lesson-') ? base.slice('lesson-'.length) : '';
  const path = !Topic && !lesson && base.startsWith('path-') ? base.slice('path-'.length) : '';
  // #def-<id> opens the plain dictionary page of a term that also has a visualization.
  const termId = base.startsWith('def-') && ENTRY_BY_ID[base.slice(4)] ? base.slice(4) : base;
  const entry = Topic || lesson || path ? undefined : ENTRY_BY_ID[termId];
  const page = Topic ? 'vis' : lesson ? 'lesson' : path ? 'path' : entry ? 'term' : PAGE_TITLES[base] ? base : pageForAnchor(base) ?? 'missing';
  const anchor = !Topic && !lesson && !path && !entry && !PAGE_TITLES[base] && page !== 'home' ? base : null;

  useEffect(() => {
    if (!ready || user || !restricted) return;
    requestAccess(route, accessReason(route));
  }, [ready, user, restricted, route, requestAccess]);

  useEffect(() => {
    const label = checking ? 'Checking your session'
      : showWorld ? 'Crypto Dungeon'
      : touring ? tourLabel(base)
      : Topic ? TOPIC_BY_ID[base].title
      : lesson ? LESSON_BY_ID[lesson]?.title ?? 'Lesson'
      : path ? PATH_BY_ID[path]?.title ?? 'Learning path'
      : entry ? entry.headword
      : PAGE_TITLES[page];
    document.title = (label ? label + ' · ' : '') + 'VisuCrypto · sunhacks 9.0';
  }, [Topic, base, entry, page, lesson, path, touring, checking, showWorld]);

  // New page: start at the top. In-page anchor: scroll to it once rendered.
  useLayoutEffect(() => {
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    } else if (route !== 'bib') {
      window.scrollTo(0, 0);
    }
  }, [route, anchor]);

  // Keys A / B / E switch perspective (ignored while typing).
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]')) return;
      if (!document.querySelector('.eyes')) return;
      const v = ({ e: 'all', a: 'alice', b: 'bob' } as Record<string, View>)[e.key.toLowerCase()];
      if (v) setView(v);
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [setView]);

  // Citations inside hand-written HTML (<a class="cite" data-paper=…>) open the bibliography.
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a.cite[data-paper]') as HTMLAnchorElement | null;
      if (!a) return;
      e.preventDefault();
      cite(a.dataset.paper!);
    };
    document.addEventListener('click', on);
    return () => document.removeEventListener('click', on);
  }, [cite]);

  if (checking) return <p className="cw-wait" role="status">Checking your session…</p>;
  // The world stays mounted under every Library page, so returning keeps the room, position, and any open gate.
  if (showWorld) return <World />;

  // The tour and the visualizations take over the whole screen, without the site header.
  if (touring) return <World layer={<Tour key={base} route={base} />} />;
  if (Topic) return <World layer={<Topic key={base} />} />;

  return <World layer={<>
      <Header />
      {view !== 'all' && <Banner view={view} onReset={() => setView('all')} />}
      <main className="wrap" id="top">
        {page === 'library' && <Home />}
        {page === 'research' && <Research />}
        {page === 'missing' && <p className="noresult">That page is not in the library. <a href="#library">Library</a> · <a href="#world">Return to world</a></p>}
        {page === 'terms' && <Terms />}
        {page === 'term' && <TermPage id={termId} />}
        {(page === 'classical' || page === 'modern' || page === 'lib-psi' || page === 'lib-psu') && <ContentPage page={page} />}
        {page === 'bib' && <Bibliography />}
        {page === 'paths' && <Paths />}
        {page === 'path' && <PathDetail id={path} />}
        {page === 'lesson' && <Lesson id={lesson} />}
        <footer>
          <p className="sh-footline"><SunhacksMark /><span>November 14–15, 2026 · Student Pavilion, ASU Tempe</span></p>
        </footer>
      </main>
    </>} />;
}

function Banner({ view, onReset }: { view: 'alice' | 'bob'; onReset: () => void }) {
  const [me, other, col] = view === 'alice' ? ['Alice', 'Bob', 'var(--bob)'] : ['Bob', 'Alice', 'var(--alice)'];
  return (
    <div id="viewbanner" role="status">
      <span>Showing only what <b>{me}</b> sees. <span className="sw2" style={{ background: `repeating-linear-gradient(135deg,${col} 0 1.5px,#fff 1.5px 5px)` }} /> = {other}'s secret.</span>
      <button type="button" onClick={onReset}>Show everything</button>
    </div>
  );
}
