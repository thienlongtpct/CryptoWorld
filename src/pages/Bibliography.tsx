import { PapersExplorer } from '../components/PapersExplorer';

export function Bibliography() {
  return (
    <section id="v-bib">
      <nav className="crumbs"><a href="#library">Library</a> › Bibliography</nav>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '2.4rem', margin: '8px 0 12px' }}>Bibliography</h1>
      <p className="prose" style={{ marginBottom: 14 }}>Papers cited in the entries. Click a dot to see what it builds on (<span className="a">green ring</span>) and what builds on it (<span className="b">orange ring</span>).</p>
      <PapersExplorer />
    </section>
  );
}
