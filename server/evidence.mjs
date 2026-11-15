import { randomBytes } from 'node:crypto';

export const EVIDENCE_TYPES = new Set(['graded', 'lab', 'assessment', 'walkthrough', 'research']);

export function newEvidenceId() {
  return `ev_${randomBytes(10).toString('hex')}`;
}

/**
 * Append one evidence row. Callers must strip secrets from `result` first.
 * @returns {Promise<object|null>}
 */
export async function recordEvidence(store, {
  userId,
  taskId,
  version = 1,
  type,
  result,
  assistance = 'unknown',
  at = new Date().toISOString(),
}) {
  if (!userId || typeof taskId !== 'string' || !taskId) return null;
  if (!EVIDENCE_TYPES.has(type)) return null;
  const row = {
    id: newEvidenceId(),
    userId,
    taskId,
    version,
    at,
    type,
    result: result == null ? null : structuredClone(result),
    assistance: assistance === 'none' || assistance === 'walkthrough' || assistance === 'unknown'
      ? assistance
      : 'unknown',
  };
  if (typeof store.appendEvidence !== 'function') return row;
  return store.appendEvidence(row);
}

/** Public shape for learning-record evidence (no answer keys). */
export function publicEvidence(row) {
  if (!row) return null;
  return {
    id: row.id,
    taskId: row.taskId,
    version: row.version,
    at: row.at,
    type: row.type,
    assistance: row.assistance,
    result: row.result,
  };
}
