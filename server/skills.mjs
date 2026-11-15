import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicEvidence } from './evidence.mjs';
import { listPublicAssessments } from './assessments.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const DISCLAIMER =
  'This is a CryptoWorld learning record from checked practice on this account. It is not a professional certification, employment credential, or claim about job outcomes.';

/** Skills tied to the Verify a software download practical path. */
export const SKILL_DEFS = [
  {
    id: 'vd-hash-basics',
    title: 'Checksums, digests, and what they prove',
    pathId: 'verify-download',
    assessedTaskIds: ['vd-assess-1'],
    practicedTaskIds: [],
    viewedItemIds: ['hash'],
  },
  {
    id: 'vd-hash-visualization',
    title: 'Hash visualization explored',
    pathId: 'verify-download',
    assessedTaskIds: [],
    practicedTaskIds: [],
    viewedItemIds: ['hash'],
  },
  {
    id: 'vd-research-hash',
    title: 'Research Desk sources on hashing',
    pathId: 'verify-download',
    assessedTaskIds: [],
    practicedTaskIds: ['vd-research'],
    viewedItemIds: [],
  },
  {
    id: 'vd-toy-seal-lab',
    title: 'Maritime toy-seal experiment',
    pathId: 'verify-download',
    assessedTaskIds: [],
    practicedTaskIds: ['vd-lab'],
    viewedItemIds: [],
  },
  {
    id: 'vd-collision-gate',
    title: 'Forged seal collision challenge',
    pathId: 'verify-download',
    assessedTaskIds: ['seal'],
    practicedTaskIds: ['vd-lab'],
    viewedItemIds: [],
  },
  {
    id: 'vd-verify-download',
    title: 'Workplace download verification',
    pathId: 'verify-download',
    assessedTaskIds: ['vd-workplace'],
    practicedTaskIds: [],
    viewedItemIds: [],
  },
];

function loadPath(from = root) {
  const catalog = JSON.parse(readFileSync(join(from, 'src/data/catalog.json'), 'utf8'));
  return catalog.paths.find(path => path.id === 'verify-download') || null;
}

function evidenceForTask(evidence, taskId, types) {
  return evidence.filter(row => row.taskId === taskId && types.includes(row.type));
}

function latestPassedAssessment(evidence, taskId) {
  const rows = evidenceForTask(evidence, taskId, ['assessment'])
    .filter(row => row.result?.passed === true)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return rows[0] || null;
}

function latestGradedSuccess(evidence, taskId) {
  const rows = evidenceForTask(evidence, taskId, ['graded'])
    .filter(row => row.result?.correct === true)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return rows[0] || null;
}

function latestPractice(evidence, taskId) {
  const rows = evidence
    .filter(row => row.taskId === taskId && (row.type === 'lab' || row.type === 'research')
      && (row.result?.status === 'completed' || row.result?.ok === true))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return rows[0] || null;
}

function progressStatus(progress, itemId) {
  const row = progress.find(item => item.itemId === itemId);
  return row?.status || null;
}

function assistanceForChallenge(evidence, taskId, assessedAt) {
  const walks = evidenceForTask(evidence, taskId, ['walkthrough']);
  if (walks.some(row => !assessedAt || String(row.at) <= String(assessedAt))) {
    return 'walkthrough';
  }
  // Authored hints are client-only today — assistance is unknown when not recorded.
  return 'unknown';
}

function deriveSkill(def, { evidence, progress }) {
  const related = [];
  let assessed = null;
  let practiced = null;
  let viewed = false;
  let assistance = null;

  for (const taskId of def.assessedTaskIds) {
    const pass = latestPassedAssessment(evidence, taskId) || latestGradedSuccess(evidence, taskId);
    if (pass) {
      assessed = pass;
      related.push(publicEvidence(pass));
      if (taskId === 'seal') {
        assistance = assistanceForChallenge(evidence, taskId, pass.at);
      } else {
        assistance = pass.assistance === 'none' ? 'none' : pass.assistance || 'unknown';
      }
    } else {
      related.push(...evidenceForTask(evidence, taskId, ['assessment', 'graded', 'walkthrough']).map(publicEvidence));
    }
  }

  for (const taskId of def.practicedTaskIds) {
    const row = latestPractice(evidence, taskId);
    if (row) {
      practiced = practiced || row;
      related.push(publicEvidence(row));
    }
  }

  for (const itemId of def.viewedItemIds) {
    const status = progressStatus(progress, itemId);
    if (status === 'seen' || status === 'done') viewed = true;
  }

  let status = 'none';
  if (assessed) status = 'assessed';
  else if (practiced) status = 'practiced';
  else if (viewed) status = 'viewed';

  // Dedupe evidence ids while preserving order.
  const seen = new Set();
  const evidenceOut = [];
  for (const row of related) {
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    evidenceOut.push(row);
  }

  return {
    id: def.id,
    title: def.title,
    pathId: def.pathId,
    status,
    assistance: status === 'assessed' ? (assistance || 'unknown') : null,
    evidence: evidenceOut,
  };
}

function stepRecord(step, { evidence, progress }) {
  const base = { id: step.id, kind: step.kind, status: 'none', assistance: null };
  if (step.kind === 'topic') {
    const st = progressStatus(progress, step.id);
    if (st === 'done' || st === 'seen') base.status = st === 'done' ? 'practiced' : 'viewed';
    return base;
  }
  if (step.kind === 'assessment' || step.kind === 'scenario') {
    const pass = latestPassedAssessment(evidence, step.id);
    if (pass) {
      base.status = 'assessed';
      base.assistance = pass.assistance || 'unknown';
      base.result = {
        correctCount: pass.result?.correctCount ?? null,
        total: pass.result?.total ?? null,
        passed: true,
        at: pass.at,
      };
    } else {
      const attempt = evidenceForTask(evidence, step.id, ['assessment'])
        .sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
      if (attempt) {
        base.status = 'practiced';
        base.result = {
          correctCount: attempt.result?.correctCount ?? null,
          total: attempt.result?.total ?? null,
          passed: attempt.result?.passed === true,
          at: attempt.at,
        };
      }
    }
    return base;
  }
  if (step.kind === 'research') {
    if (latestPractice(evidence, step.id)) base.status = 'practiced';
    return base;
  }
  if (step.kind === 'lab') {
    if (latestPractice(evidence, step.id)) base.status = 'practiced';
    return base;
  }
  if (step.kind === 'challenge') {
    const pass = latestGradedSuccess(evidence, step.id);
    if (pass) {
      base.status = 'assessed';
      base.assistance = assistanceForChallenge(evidence, step.id, pass.at);
    } else if (progressStatus(progress, `dungeon-${step.id}`) === 'done') {
      // Progress without graded evidence should not appear as assessed.
      base.status = 'none';
    }
    return base;
  }
  if (step.kind === 'summary') {
    base.status = 'viewed';
    return base;
  }
  return base;
}

export async function buildSkillsRecord(store, userId, { from = root } = {}) {
  const [evidence, progress] = await Promise.all([
    store.evidenceFor(userId),
    store.progressFor(userId),
  ]);
  const path = loadPath(from);
  const skills = SKILL_DEFS.map(def => deriveSkill(def, { evidence, progress }));
  return {
    disclaimer: DISCLAIMER,
    assessments: listPublicAssessments(),
    path: path
      ? {
          id: path.id,
          title: path.title,
          blurb: path.blurb,
          steps: path.steps.map(step => stepRecord(step, { evidence, progress })),
        }
      : null,
    skills,
    evidence: evidence
      .slice()
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .map(publicEvidence),
  };
}
