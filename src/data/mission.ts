import { researchHref } from './research.ts';

/** One coherent Verify-a-download journey across Library → viz → lab → gate → Journal. */
export const MISSION_ID = 'verify-download';

export type MissionStepId = 'research' | 'visualize' | 'lab' | 'challenge' | 'skills';

export interface MissionStep {
  id: MissionStepId;
  title: string;
  blurb: string;
  href: string;
}

export const MISSION = {
  id: MISSION_ID,
  title: 'Verify a software download',
  blurb: 'Research digests, explore the hash visualization, run the Maritime toy-seal lab, submit a server-checked collision, then open your Journal skills record.',
  pathHref: '#path-verify-download',
  steps: [
    {
      id: 'research',
      title: 'Research Desk',
      blurb: 'Gather published hashing sources (TinyFish when configured).',
      href: `#${researchHref({
        topic: 'hash',
        goal: 'Explain what SHA-256 guarantees when checking a published software digest.',
      })}`,
    },
    {
      id: 'visualize',
      title: 'Hash visualization',
      blurb: 'See avalanche in the existing hash lesson; ask Forest tutors with Gemini.',
      href: '#hash',
    },
    {
      id: 'lab',
      title: 'Maritime lab',
      blurb: 'Run the toy-seal experiment beside the Forged seal gate.',
      href: `#world?mission=${MISSION_ID}&gate=seal`,
    },
    {
      id: 'challenge',
      title: 'Server-checked gate',
      blurb: 'Submit a colliding word. Only the dungeon endpoint awards assessed evidence.',
      href: `#world?mission=${MISSION_ID}&gate=seal`,
    },
    {
      id: 'skills',
      title: 'Journal skills',
      blurb: 'Read your learning record — not a certification.',
      href: `#world?mission=${MISSION_ID}&journal=skills`,
    },
  ] as MissionStep[],
};

export const SPONSOR_CREDIT =
  'Tools used in this mission may include TinyFish, Maritime, Gemini, and JFF Ventures Future of Work framing. Their presence here is for learning practice only — not an endorsement, employment credential, or professional certification.';

export function parseWorldMission(route: string): { mission: string; gate: string; journal: string } | null {
  if (route !== 'world' && !route.startsWith('world?')) return null;
  const qs = route.startsWith('world?') ? new URLSearchParams(route.slice('world?'.length)) : new URLSearchParams();
  const mission = qs.get('mission')?.trim() || '';
  if (!mission) return null;
  return {
    mission,
    gate: qs.get('gate')?.trim() || '',
    journal: qs.get('journal')?.trim() || '',
  };
}

export function missionStepIndex(stepId: MissionStepId): number {
  return MISSION.steps.findIndex(step => step.id === stepId);
}

export function nextMissionStep(stepId: MissionStepId): MissionStep | null {
  const i = missionStepIndex(stepId);
  if (i < 0 || i >= MISSION.steps.length - 1) return null;
  return MISSION.steps[i + 1];
}

export function prevMissionStep(stepId: MissionStepId): MissionStep | null {
  const i = missionStepIndex(stepId);
  if (i <= 0) return null;
  return MISSION.steps[i - 1];
}
