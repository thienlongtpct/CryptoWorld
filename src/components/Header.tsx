import { useMemo } from 'react';
import { useApp } from '../state';
import { ENTRIES, ENTRY_BY_ID, termRoute } from '../data/entries';
import { SunhacksMark } from './SunhacksMark';
import { AccountButton } from '../account';
import { searchEntries } from '../pages/Terms';

export const LETTERS = [...new Set(ENTRIES.map(e => e.headword[0].toUpperCase()))];

export function AzBar({ className }: { className?: string }) {
  return (
    <>
      {[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(L => LETTERS.includes(L) ? <a key={L} href={`#L-${L}`}>{L}</a> : <span key={L}>{L}</span>)}
      {className === 'azbar' && <a href="#bib" style={{ width: 'auto', padding: '0 6px' }}>Bib</a>}
    </>
  );
}

const NAV = [
  { href: '#world', id: 'world', label: 'World' },
  { href: '#library', id: 'library', label: 'Library' },
  { href: '#paths', id: 'paths', label: 'Paths' },
  { href: '#terms', id: 'terms', label: 'Dictionary' },
  { href: '#classical', id: 'classical', label: 'Classical' },
  { href: '#modern', id: 'modern', label: 'Modern' },
  { href: '#lib-psi', id: 'lib-psi', label: 'PSI' },
  { href: '#lib-psu', id: 'lib-psu', label: 'PSU' },
  { href: '#bib', id: 'bib', label: 'Bibliography' },
];

function navOn(route: string, id: string): boolean {
  if (id === 'world') return route === '' || route === 'top' || route === 'world';
  if (id === 'library') return route === 'library';
  if (id === 'paths') return route === 'paths' || route.startsWith('path-') || route.startsWith('lesson-');
  if (id === 'terms') return route === 'terms' || route.startsWith('L-') || route.startsWith('def-') || !!ENTRY_BY_ID[route];
  return route === id || route.startsWith(id + '-');
}

export function Header() {
  const { route, go, query, setQuery } = useApp();
  const hits = useMemo(() => searchEntries(query, ''), [query]);
  return (
    <header className="bar">
      <div className="uni-top">
        <a className="uni-logo" href="#world" aria-label="Crypto Dungeon">VISU<span>CRYPTO</span></a>
        <SunhacksMark tone="dark" />
        <nav className="sitenav" aria-label="Site">
          {NAV.map(item => <a key={item.id} href={item.href} className={navOn(route, item.id) ? 'on' : ''} aria-current={navOn(route, item.id) ? 'page' : undefined}>{item.label}</a>)}
        </nav>
        <AccountButton tone="dark" />
      </div>
      <div className="wrap">
        <input type="search" id="dsearch" placeholder="Look up a term…" aria-label="Search the dictionary" value={query}
          onChange={e => { setQuery(e.target.value); if (route !== 'terms') go('terms'); }}
          onKeyDown={e => { if (e.key === 'Enter' && hits[0]) go(termRoute(hits[0].id)); }} />
      </div>
      <div className="wrap azbar"><AzBar className="azbar" /></div>
    </header>
  );
}
