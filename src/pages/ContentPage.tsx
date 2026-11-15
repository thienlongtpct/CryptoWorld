import { PAGES } from '../data/pages';
import { WIDGETS } from '../demos';
import { Html } from '../components/ui';

const CRUMBS: Record<string, string> = {
  classical: 'Classical cryptography', modern: 'Modern cryptography',
  'lib-psi': 'Libraries › Private set intersection', 'lib-psu': 'Libraries › Private set union',
};

/** Classical, Modern and the two libraries: static text from data/pages.ts around interactive widgets. */
export function ContentPage({ page }: { page: string }) {
  const content = PAGES[page];
  return (
    <section className="lib" id={`v-${page}`}>
      <nav className="crumbs"><a href="#library">Library</a> › {CRUMBS[page]}</nav>
      <Html className="lib-hero" html={content.hero} />
      {content.sections.map(s => {
        const W = s.widget ? WIDGETS[s.widget] : undefined;
        return (
          <section key={s.id} className="lib-sec" id={s.id}>
            <h2 dangerouslySetInnerHTML={{ __html: s.title }} />
            {s.intro && <Html html={s.intro} />}
            {W && <W />}
            {s.outro && <Html html={s.outro} />}
          </section>
        );
      })}
    </section>
  );
}
