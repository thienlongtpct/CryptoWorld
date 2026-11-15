import {
  MISSION,
  SPONSOR_CREDIT,
  nextMissionStep,
  prevMissionStep,
  type MissionStepId,
} from '../data/mission';

/** Compact journey controls + sponsor credit (no endorsement claim). */
export function MissionRail({
  step,
  className = '',
}: {
  step: MissionStepId;
  className?: string;
}) {
  const index = MISSION.steps.findIndex(s => s.id === step);
  const current = MISSION.steps[index] ?? MISSION.steps[0];
  const prev = prevMissionStep(step);
  const next = nextMissionStep(step);

  return (
    <aside className={`mission-rail ${className}`.trim()} aria-label={`${MISSION.title} journey`}>
      <div className="mission-rail-head">
        <p className="mission-rail-kicker">Mission · {index + 1} of {MISSION.steps.length}</p>
        <p className="mission-rail-title"><a href={MISSION.pathHref}>{MISSION.title}</a></p>
        <p className="mission-rail-here">{current.title}. {current.blurb}</p>
      </div>
      <ol className="mission-rail-steps">
        {MISSION.steps.map((s, i) => (
          <li key={s.id} className={s.id === step ? 'on' : i < index ? 'done' : ''}>
            <a href={s.href}>{s.title}</a>
          </li>
        ))}
      </ol>
      <div className="mission-rail-nav">
        {prev
          ? <a className="btn ghost" href={prev.href}>◂ {prev.title}</a>
          : <span className="mission-rail-spacer" />}
        {next
          ? <a className="btn" href={next.href}>Next: {next.title} ▸</a>
          : <a className="btn" href={MISSION.pathHref}>Path hub</a>}
      </div>
      <p className="mission-rail-credit">{SPONSOR_CREDIT}</p>
    </aside>
  );
}

export function SponsorCredit({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`mission-rail-credit${compact ? ' compact' : ''}`} role="note">
      {compact
        ? 'TinyFish · Maritime · Gemini · JFF Ventures — learning tools only, not endorsement or certification.'
        : SPONSOR_CREDIT}
    </p>
  );
}
