import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAccount } from '../account';
import { useApp } from '../state';
import {
  RESEARCH_PAPERS,
  RESEARCH_TOPICS,
  parseResearchRoute,
  researchHref,
} from '../data/research';
import { TOPIC_BY_ID } from '../vis/registry';
import { MissionRail, SponsorCredit } from '../components/MissionRail';
import { MISSION } from '../data/mission';
import { NewsWatch } from '../components/NewsWatch';

type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'expired';

interface ResourceCard {
  kind?: string;
  title: string;
  publisher: string;
  url: string;
  summary: string;
  excerpt: string;
  retrievedAt?: string;
  relatedVisualizations?: string[];
  verified?: boolean;
}

interface BibCard {
  kind?: string;
  paperId?: string;
  title: string;
  publisher?: string;
  authors?: string;
  year?: number;
  note?: string;
  relatedVisualizations?: string[];
}

interface ResearchJob {
  id: string;
  status: JobStatus;
  subject?: { id: string; kind: string; title: string };
  goal?: string;
  cacheHit?: boolean;
  resources?: ResourceCard[];
  bibliography?: BibCard[];
  provenance?: { note?: string; providerRunId?: string | null; startingUrl?: string | null };
  error?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: number;
  configured?: boolean;
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function statusLabel(status: JobStatus, cacheHit?: boolean) {
  if (cacheHit && status === 'completed') return 'Cached result';
  if (status === 'queued') return 'Queued';
  if (status === 'running') return 'Researching…';
  if (status === 'completed') return 'Ready';
  if (status === 'failed') return 'Failed';
  if (status === 'expired') return 'Expired';
  return status;
}

export function Research() {
  const { route, go, cite } = useApp();
  const { user, openAuth } = useAccount();
  const parsed = useMemo(() => parseResearchRoute(route) ?? { topicId: '', paperId: '', goal: '', jobId: '' }, [route]);
  const formId = useId();
  const liveRef = useRef<HTMLParagraphElement>(null);

  const [mode, setMode] = useState<'topic' | 'paper'>(parsed.paperId ? 'paper' : 'topic');
  const [topicId, setTopicId] = useState(parsed.topicId || 'hash');
  const [paperId, setPaperId] = useState(parsed.paperId || 'pagh01');
  const [goal, setGoal] = useState(parsed.goal);
  const [job, setJob] = useState<ResearchJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState<{ tinyfish?: boolean } | null>(null);

  // Sync form from deep links without wiping an in-flight job the user already started.
  useEffect(() => {
    if (parsed.paperId) {
      setMode('paper');
      setPaperId(parsed.paperId);
    } else if (parsed.topicId) {
      setMode('topic');
      setTopicId(parsed.topicId);
    }
    if (parsed.goal) setGoal(parsed.goal);
  }, [parsed.topicId, parsed.paperId, parsed.goal]);

  useEffect(() => {
    let live = true;
    fetch('/api/health', { credentials: 'same-origin' })
      .then(res => res.json())
      .then(body => { if (live) setHealth(body); })
      .catch(() => { if (live) setHealth({ tinyfish: false }); });
    return () => { live = false; };
  }, []);

  const applyDefaultGoal = useCallback((nextMode: 'topic' | 'paper', id: string) => {
    if (nextMode === 'topic') {
      const t = RESEARCH_TOPICS.find(row => row.id === id);
      if (t) setGoal(t.defaultGoal);
    } else {
      const p = RESEARCH_PAPERS.find(row => row.id === id);
      if (p) setGoal(p.defaultGoal);
    }
  }, []);

  useEffect(() => {
    if (!parsed.goal) applyDefaultGoal(parsed.paperId ? 'paper' : 'topic', parsed.paperId || parsed.topicId || 'hash');
  }, [parsed.goal, parsed.paperId, parsed.topicId, applyDefaultGoal]);

  const loadJob = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/research/${encodeURIComponent(jobId)}`, { credentials: 'same-origin' });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      openAuth('signin', 'Log in to view your research job.');
      throw new Error(typeof body.error === 'string' ? body.error : 'Log in to view research.');
    }
    if (res.status === 404) throw new Error(typeof body.error === 'string' ? body.error : 'Research job not found.');
    if (!res.ok && res.status !== 410) {
      throw new Error(typeof body.error === 'string' ? body.error : 'Could not load research.');
    }
    return body as ResearchJob;
  }, [openAuth]);

  useEffect(() => {
    if (!parsed.jobId || !user) return;
    let live = true;
    setBusy(true);
    setError('');
    void loadJob(parsed.jobId)
      .then(next => { if (live) setJob(next); })
      .catch(err => { if (live) setError(err instanceof Error ? err.message : 'Could not load research.'); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [parsed.jobId, user, loadJob]);

  // Poll while the provider run is still open — each GET is the progress check (no background worker).
  useEffect(() => {
    if (!user || !job?.id) return;
    if (job.status !== 'queued' && job.status !== 'running') return;
    let live = true;
    const timer = window.setInterval(() => {
      void loadJob(job.id)
        .then(next => { if (live) setJob(next); })
        .catch(err => { if (live) setError(err instanceof Error ? err.message : 'Could not refresh research.'); });
    }, 2500);
    return () => { live = false; clearInterval(timer); };
  }, [user, job?.id, job?.status, loadJob]);

  async function onStart(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      openAuth('signin', 'Log in to start research at the Research Desk. You can read this introduction without an account.');
      return;
    }
    const trimmed = goal.trim();
    if (!trimmed) {
      setError('Write a short learning goal before starting.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = mode === 'topic'
        ? { topicId, goal: trimmed }
        : { paperId, goal: trimmed };
      const res = await fetch('/api/research', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        openAuth('signin', 'Log in to start research at the Research Desk.');
        throw new Error(typeof data.error === 'string' ? data.error : 'Log in to start research.');
      }
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not start research.');
      const started = data as ResearchJob;
      setJob(started);
      go(researchHref({
        topic: mode === 'topic' ? topicId : undefined,
        paper: mode === 'paper' ? paperId : undefined,
        goal: trimmed,
        job: started.id,
      }));
      liveRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start research.');
    } finally {
      setBusy(false);
    }
  }

  const resources = job?.resources ?? [];
  const bibliography = job?.bibliography ?? [];
  const showEmpty = user && !job && !busy && !error;
  const tinyfishOff = health && health.tinyfish === false;

  return (
    <section className="cw-research" aria-labelledby={`${formId}-title`}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#world">World</a>
        {' › '}
        <a href="#library">Library</a>
        {' › '}
        Research Desk
      </nav>

      <header className="cw-research-hero">
        <p className="cw-research-kicker">The Library of Arcane Ciphers · Research Desk</p>
        <h1 id={`${formId}-title`}>Research Desk</h1>
        <p>
          Gather published sources for an approved topic or paper, starting with hashing.
          Summaries are extracted for learning — they are not independently verified.
          Character tutors (Shannon, Alice, Bob, Eve, and the rest) keep their usual teaching scope on Gemini, and cite the sources you gather here when a question in their region touches the same topic.
        </p>
        <MissionRail step="research" />
      </header>

      {!user && (
        <div className="cw-research-banner" role="status">
          <p>Guests can read this desk and choose a subject. Starting a run needs an account so the job stays on your progress.</p>
          <button type="button" className="btn" onClick={() => openAuth('signin', 'Log in to start research at the Research Desk.')}>
            Log in to research
          </button>
        </div>
      )}

      {tinyfishOff && (
        <p className="cw-research-banner warn" role="status">
          TinyFish research is not configured on this server yet. You can still explore the desk; starting a run will stay unavailable until a key is set.
        </p>
      )}

      <form className="cw-research-form" onSubmit={onStart} aria-describedby={`${formId}-hint`}>
        <fieldset>
          <legend>Subject</legend>
          <div className="cw-research-seg" role="group" aria-label="Subject kind">
            <button type="button" className="btn ghost" aria-pressed={mode === 'topic'} onClick={() => { setMode('topic'); applyDefaultGoal('topic', topicId); }}>
              Topic
            </button>
            <button type="button" className="btn ghost" aria-pressed={mode === 'paper'} onClick={() => { setMode('paper'); applyDefaultGoal('paper', paperId); }}>
              Bibliography paper
            </button>
          </div>
          {mode === 'topic' ? (
            <label>
              Topic
              <select value={topicId} onChange={e => { setTopicId(e.target.value); applyDefaultGoal('topic', e.target.value); }} aria-label="Research topic">
                {RESEARCH_TOPICS.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </label>
          ) : (
            <label>
              Paper
              <select value={paperId} onChange={e => { setPaperId(e.target.value); applyDefaultGoal('paper', e.target.value); }} aria-label="Research paper">
                {RESEARCH_PAPERS.map(p => <option key={p.id} value={p.id}>{p.label} · {p.title}</option>)}
              </select>
            </label>
          )}
          <p className="cw-research-hint" id={`${formId}-hint`}>
            {mode === 'topic'
              ? RESEARCH_TOPICS.find(t => t.id === topicId)?.blurb
              : RESEARCH_PAPERS.find(p => p.id === paperId)?.blurb}
          </p>
        </fieldset>

        <label>
          Learning goal
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            rows={3}
            maxLength={500}
            required
            aria-required="true"
            placeholder="What should the sources help you understand?"
          />
        </label>

        <div className="cw-research-actions">
          <button type="submit" className="btn" disabled={busy || Boolean(user && tinyfishOff)}>
            {!user ? 'Log in to start' : busy ? 'Working…' : 'Start research'}
          </button>
          {job && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setJob(null);
                setError('');
                go(researchHref({
                  topic: mode === 'topic' ? topicId : undefined,
                  paper: mode === 'paper' ? paperId : undefined,
                  goal: goal.trim() || undefined,
                }));
              }}
            >
              New search
            </button>
          )}
        </div>
      </form>

      <p className="cw-research-live" ref={liveRef} tabIndex={-1} role="status" aria-live="polite">
        {busy && !job && 'Starting research…'}
        {job && statusLabel(job.status, job.cacheHit)}
        {job?.cacheHit && job.resources?.[0]?.retrievedAt && (
          <> · retrieved {formatWhen(job.resources[0].retrievedAt)}</>
        )}
        {job?.cacheHit && !job.resources?.[0]?.retrievedAt && job.createdAt && (
          <> · first saved {formatWhen(job.createdAt)}</>
        )}
      </p>

      {error && <p className="cw-research-error" role="alert">{error}</p>}

      {showEmpty && (
        <div className="cw-research-empty">
          <h2>No run yet</h2>
          <p>Pick a hashing topic or an approved paper, write a goal, and start. Results land here as cited resource cards beside the curated bibliography.</p>
        </div>
      )}

      {job && (
        <div className={`cw-research-job status-${job.status}${job.cacheHit ? ' cached' : ''}`}>
          <header className="cw-research-job-head">
            <h2>{job.subject?.title ?? 'Research job'}</h2>
            <p>
              <span className="cw-research-pill">{statusLabel(job.status, job.cacheHit)}</span>
              {job.goal && <span className="cw-research-goal">Goal: {job.goal}</span>}
            </p>
            {(job.status === 'queued' || job.status === 'running') && (
              <p className="cw-research-progress">Checking the automation run… progress updates when you stay on this page.</p>
            )}
            {job.status === 'expired' && (
              <p className="cw-research-error" role="status">This job expired. Start a new search with the same goal to reuse a fresh run.</p>
            )}
            {job.status === 'failed' && (
              <p className="cw-research-error" role="status">
                {job.error || 'Research failed. Try again with a clearer goal.'}
                {' '}Authored lessons, the hash visualization, and dungeon hints stay available while research is down.
              </p>
            )}
            {job.provenance?.note && <p className="cw-research-note">{job.provenance.note}</p>}
            {job.cacheHit && <p className="cw-research-note" role="status">Cached result — reused from your earlier identical goal on this account.</p>}
          </header>

          {job.status === 'completed' && (job.subject?.id === 'hash' || topicId === 'hash') && (
            <div className="cw-research-viz" role="navigation" aria-label="Continue the mission">
              <a className="btn" href="#hash">Continue: hash visualization</a>
              <a className="btn ghost" href={MISSION.steps.find(s => s.id === 'lab')!.href}>Skip to Maritime lab</a>
              <a className="btn ghost" href="#world">Return to world (position kept)</a>
            </div>
          )}

          {job.status === 'completed' && resources.length === 0 && (
            <p className="cw-research-empty">No resource cards were returned.</p>
          )}

          {resources.length > 0 && (
            <section aria-label="Discovered sources">
              <h3>Discovered sources</h3>
              <ul className="cw-research-cards">
                {resources.map(card => (
                  <li key={`${card.url}-${card.title}`} className="cw-research-card">
                    <h4>{card.title}</h4>
                    <p className="cw-research-meta">{card.publisher}</p>
                    <p>
                      <a href={card.url} target="_blank" rel="noopener noreferrer">{card.url}</a>
                    </p>
                    <p>{card.summary}</p>
                    <blockquote>
                      <p>{card.excerpt}</p>
                    </blockquote>
                    {card.retrievedAt && <p className="cw-research-meta">Retrieved {formatWhen(card.retrievedAt)}</p>}
                    {card.verified === false && <p className="cw-research-meta">Automation extraction · not independently verified</p>}
                    {!!card.relatedVisualizations?.length && (
                      <div className="cw-research-viz">
                        {card.relatedVisualizations.map(id => {
                          const topic = TOPIC_BY_ID[id];
                          if (!topic) return null;
                          return <a key={id} className="btn ghost" href={`#${id}`}>Open {topic.title}</a>;
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {bibliography.length > 0 && (
            <section aria-label="Curated bibliography">
              <h3>Curated bibliography</h3>
              <ul className="cw-research-cards bib">
                {bibliography.map(card => (
                  <li key={card.paperId || card.title} className="cw-research-card">
                    <h4>{card.title}</h4>
                    <p className="cw-research-meta">
                      {[card.authors, card.publisher, card.year].filter(Boolean).join(' · ')}
                    </p>
                    {card.note && <p>{card.note}</p>}
                    {card.paperId && (
                      <button type="button" className="btn ghost" onClick={() => cite(card.paperId!)}>
                        Open in bibliography
                      </button>
                    )}
                    {!!card.relatedVisualizations?.length && (
                      <div className="cw-research-viz">
                        {card.relatedVisualizations.map(id => {
                          const topic = TOPIC_BY_ID[id];
                          if (!topic) return null;
                          return <a key={id} className="btn ghost" href={`#${id}`}>Open {topic.title}</a>;
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <NewsWatch signedIn={!!user} />

      <SponsorCredit compact />
    </section>
  );
}
