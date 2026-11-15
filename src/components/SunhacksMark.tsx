import badge from '../assets/sunhacks-badge.webp';

const HREF = 'https://sunhacks.io/';

/** sunhacks 9.0 mark. `banner` is the home-page credit; `chip` fits a toolbar. */
export function SunhacksMark({ variant = 'chip', tone = 'light' }: { variant?: 'chip' | 'banner'; tone?: 'light' | 'dark' }) {
  const img = <img src={badge} alt="" />;
  if (variant === 'banner') {
    return (
      <a className="sh-banner" href={HREF} target="_blank" rel="noopener noreferrer">
        {img}
        <span>
          <span className="sh-kicker">A project for</span>
          <span className="sh-word">sunhacks <span className="sh-ed">9.0</span></span>
          <span className="sh-meta">November 14–15, 2026 · ASU Tempe</span>
        </span>
      </a>
    );
  }
  return (
    <a className={`sh-chip ${tone === 'dark' ? 'on-dark' : ''}`} href={HREF} target="_blank" rel="noopener noreferrer">
      {img}
      <span className="sh-word">sunhacks <span className="sh-ed">9.0</span></span>
    </a>
  );
}
