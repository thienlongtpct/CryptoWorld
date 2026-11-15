import { useEffect, useState } from 'react';
import { TOPIC_BY_ID } from '../vis/registry';

interface NewsItem {
  title: string;
  url: string;
  date: string | null;
  summary: string;
  topics: string[];
}

interface NewsSource {
  id: string;
  title: string;
  url: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'expired' | 'unconfigured';
  day: string | null;
  stale: boolean;
  retrievedAt: string | null;
  items: NewsItem[];
}

interface NewsPayload {
  configured: boolean;
  note: string;
  sources: NewsSource[];
}

const POLL_MS = 30_000;

function isHttps(url: string) {
  return /^https:\/\//.test(url);
}

/** Shared daily TinyFish digest of NIST CSRC and IACR ePrint, linked to lessons. */
export function NewsWatch({ signedIn }: { signedIn: boolean }) {
  const [news, setNews] = useState<NewsPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!signedIn) {
      setNews(null);
      return;
    }
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const res = await fetch('/api/news', { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!live) return;
        if (!res.ok) {
          setError(typeof data.error === 'string' ? data.error : 'Could not load the news watch.');
          return;
        }
        const payload = data as NewsPayload;
        setNews(payload);
        setError('');
        const waiting = payload.sources?.some(source => (source.status === 'queued' || source.status === 'running') && !source.items.length);
        if (waiting) timer = setTimeout(load, POLL_MS);
      } catch {
        if (live) setError('Could not load the news watch.');
      }
    }
    void load();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [signedIn]);

  function noteRead(sourceId: string, url: string) {
    void fetch('/api/news/read', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId, url }),
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <section className="cw-research-job cw-news" aria-labelledby="cw-news-title">
      <h2 id="cw-news-title">What’s new in cryptography</h2>
      <p className="cw-research-note">
        Once a day TinyFish reads NIST’s Computer Security Resource Center and the IACR ePrint archive, and every learner shares the result. Headlines link to the lessons they touch.
      </p>
      {!signedIn && <p className="cw-research-empty">Log in to read today’s headlines.</p>}
      {signedIn && error && <p className="cw-research-empty" role="alert">{error}</p>}
      {signedIn && !news && !error && <p className="cw-research-empty">Loading headlines…</p>}
      {news && !news.configured && news.sources.every(source => !source.items.length) && (
        <p className="cw-research-empty">TinyFish is not configured on this server, so the news watch is off.</p>
      )}
      {news?.sources.map(source => (
        <section key={source.id} aria-label={source.title}>
          <h3>
            <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
          </h3>
          <p className="cw-research-meta">
            {source.items.length
              ? `${source.stale ? 'Most recent digest' : 'Today’s digest'}${source.day ? ` · ${source.day}` : ''}`
              : source.status === 'queued' || source.status === 'running'
                ? 'TinyFish is reading this page now. Headlines appear here in a minute or two.'
                : source.status === 'failed'
                  ? 'Today’s run did not return headlines. It retries within the hour.'
                  : 'No digest yet.'}
          </p>
          {source.items.length > 0 && (
            <ul className="cw-research-cards">
              {source.items.filter(item => isHttps(item.url)).map(item => (
                <li key={item.url} className="cw-research-card">
                  <h4>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => noteRead(source.id, item.url)}>{item.title}</a>
                  </h4>
                  {item.date && <p className="cw-research-meta">{item.date}</p>}
                  <p>{item.summary}</p>
                  {item.topics.some(id => TOPIC_BY_ID[id]) && (
                    <div className="cw-research-viz">
                      {item.topics.map(id => TOPIC_BY_ID[id] && (
                        <a key={id} className="btn ghost" href={`#${id}`}>Lesson: {TOPIC_BY_ID[id].title}</a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {news && <p className="cw-research-meta">{news.note}</p>}
    </section>
  );
}
