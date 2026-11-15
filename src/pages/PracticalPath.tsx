import { AssessmentPanel } from './AssessmentPanel';
import { MissionRail, SponsorCredit } from '../components/MissionRail';
import { MISSION } from '../data/mission';
import { PATH_BY_ID, stepHref, stepTitle, type Step } from '../data/paths';

const NEXT_LESSON = { href: '#path-sets', title: 'Private sets' };

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="practical-steps">
      {steps.map(step => (
        <li key={step.id}>
          <a href={stepHref(step)}>{stepTitle(step)}</a>
          <span className="practical-kind">{step.kind}</span>
        </li>
      ))}
    </ol>
  );
}

/** Practical Future of Work path — not a certification. */
export function PracticalPath({ id }: { id: string }) {
  const path = PATH_BY_ID[id];
  if (!path || path.kind !== 'practical') return null;

  return (
    <section className="paths practical-path">
      <nav className="crumbs"><a href="#library">Library</a> › <a href="#paths">Learning path</a> › {path.title}</nav>
      <h1>{path.title}</h1>
      <p className="paths-lead">{path.blurb}</p>
      <p className="paths-lead">
        This path supports workplace digital skills practice for verifying software downloads.
        It is a learning record of checked work on your account — not a professional certification or job outcome claim.
      </p>

      <MissionRail step="research" />
      <p className="paths-lead">
        Suggested order: Research Desk → hash visualization (and Gemini tutors in the Fountain of Hash) → Maritime lab beside the gate → submit the collision → Journal Skills.
        Leaving for Library pages keeps your world position and any open gate draft under the Crypto Dungeon strip.
      </p>
      <div className="mission-rail-nav">
        <a className="btn-l primary" href={MISSION.steps[0].href}>Start at Research Desk</a>
        <a className="btn-l outline" href={MISSION.steps[2].href}>Open seal lab in world</a>
      </div>

      <StepList steps={path.steps} />

      <AssessmentPanel
        taskId="vd-assess-1"
        intro="Short initial check. Comparable questions appear again in the workplace scenario, with different wording."
      />

      <section className="practical-block" id="hash-step">
        <p className="practice-kicker">Visualization</p>
        <h2>Hash functions</h2>
        <p>Open the existing hash visualization. Digests change when the input changes; a checksum alone is not authentication.</p>
        <a className="btn-l primary" href="#hash">Open hash visualization</a>
      </section>

      <section className="practical-block" id="vd-research">
        <p className="practice-kicker">Research resource</p>
        <h2>TinyFish Research Desk</h2>
        <p>Gather published sources on hashing and digests. Completing a hash research run counts as practiced evidence, not an assessed skill by itself.</p>
        <a className="btn-l primary" href="#research?topic=hash&goal=Explain%20what%20SHA-256%20guarantees%20when%20checking%20a%20published%20software%20digest.">
          Open Research Desk
        </a>
      </section>

      <section className="practical-block" id="vd-lab">
        <p className="practice-kicker">Maritime experiment</p>
        <h2>Toy-seal workbench</h2>
        <p>
          In the Fountain of Hash, open the Forged seal challenge and use the Maritime workbench beside it.
          The experiment shows weakness in the toy seal: a hash alone does not authenticate a sender.
          Running code or printing PASS does not unlock the gate or grant assessed skills.
        </p>
        <a className="btn-l primary" href="#world">Enter the world for the lab</a>
      </section>

      <section className="practical-block" id="seal-step">
        <p className="practice-kicker">Collision challenge</p>
        <h2>Forged seal</h2>
        <p>Submit a colliding word through the existing dungeon challenge endpoint. Only a server-checked correct answer creates assessed evidence for this gate.</p>
        <a className="btn-l primary" href="#world">Open the Fountain of Hash</a>
      </section>

      <AssessmentPanel
        taskId="vd-workplace"
        intro="Workplace scenario: before you run an installer, check it against a trusted digest or a signature from a key you already trust. Matching a digest on an untrusted page is not enough."
      />

      <section className="practical-block" id="vd-skills">
        <p className="practice-kicker">Skills summary</p>
        <h2>Learning record</h2>
        <p>
          Open the Journal in the world for your Skills view. It lists viewed, practiced, and assessed results from server evidence only.
          Assistance is marked unknown when hint use was not recorded; walkthrough use is recorded when you load a labeled walkthrough.
        </p>
        <p>Suggested next lesson: continue into <a href={NEXT_LESSON.href}>{NEXT_LESSON.title}</a> after hashing, or revisit <a href="#hash">Hash Functions</a>.</p>
        <a className="btn-l primary" href={MISSION.steps[4].href}>Open Journal Skills</a>
      </section>

      <SponsorCredit />
    </section>
  );
}
