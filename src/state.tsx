import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { parseSet } from './lib/crypto';

/** Whose knowledge the page shows: everything, or only what Alice / Bob can see. */
export type View = 'all' | 'alice' | 'bob';

interface AppState {
  /** Current route: the URL hash without '#'. */
  route: string;
  go: (route: string) => void;
  view: View;
  setView: (v: View) => void;
  /** Dictionary search text, shared by the header and the All terms page. */
  query: string;
  setQuery: (q: string) => void;
  /** Playground sets used by the PSI, PSU and PSI-variants demos. */
  setA: string; setB: string;
  setSetA: (s: string) => void; setSetB: (s: string) => void;
  A: string[]; B: string[];
  /** Paper highlighted in the bibliography explorer. */
  paper: string;
  setPaper: (id: string) => void;
  /** Open the bibliography with a paper selected (citation links). */
  cite: (id: string) => void;
  /** Set when the next bibliography visit should scroll to the paper card. */
  scrollToCard: boolean;
  clearScrollToCard: () => void;
}

const Ctx = createContext<AppState | null>(null);

const readHash = () => decodeURIComponent(location.hash.replace(/^#/, ''));

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(readHash);
  const [view, setView] = useState<View>('all');
  const [query, setQuery] = useState('');
  const [setA, setSetA] = useState('ana, ben, cho, dev, eli, fay');
  const [setB, setSetB] = useState('cho, eli, gus, hal, ben');
  const [paper, setPaper] = useState('rr22');
  const [scrollToCard, setScrollToCard] = useState(false);

  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // Redaction is styled through body[data-view] so any element marked .sa / .sb reacts.
  useEffect(() => { document.body.dataset.view = view; }, [view]);

  const go = useCallback((r: string) => {
    if (readHash() === r) setRoute(r); else location.hash = r;
  }, []);
  const cite = useCallback((id: string) => { setPaper(id); setScrollToCard(true); go('bib'); }, [go]);

  const value = useMemo<AppState>(() => ({
    route, go, view, setView, query, setQuery,
    setA, setB, setSetA, setSetB, A: parseSet(setA), B: parseSet(setB),
    paper, setPaper, cite, scrollToCard, clearScrollToCard: () => setScrollToCard(false),
  }), [route, go, view, query, setA, setB, paper, cite, scrollToCard]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
