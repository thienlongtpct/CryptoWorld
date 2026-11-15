// Learning-activity summary for GET /api/activity. Rows come from the TigerData store's
// activity_daily aggregate; other stores report the feature as unavailable.

export const ACTIVITY_DAYS = 30;
const DAY_MS = 86_400_000;

const dayKey = ms => new Date(ms).toISOString().slice(0, 10);

/**
 * @param {Array<{ day: string, type: string, count: number }>} rows
 * @param {{ days?: number, at?: number }} [options]
 */
export function summarizeActivity(rows, { days = ACTIVITY_DAYS, at = Date.now() } = {}) {
  const byDay = new Map();
  for (const row of rows) {
    const entry = byDay.get(row.day) ?? { total: 0, byType: {} };
    entry.total += row.count;
    entry.byType[row.type] = (entry.byType[row.type] ?? 0) + row.count;
    byDay.set(row.day, entry);
  }
  const today = Math.floor(at / DAY_MS) * DAY_MS;
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayKey(today - i * DAY_MS);
    const entry = byDay.get(day);
    out.push({ day, total: entry?.total ?? 0, byType: entry?.byType ?? {} });
  }
  // A streak counts back from today, or from yesterday when today has nothing yet.
  let streak = 0;
  let i = out.length - 1;
  if (i >= 0 && out[i].total === 0) i -= 1;
  while (i >= 0 && out[i].total > 0) {
    streak += 1;
    i -= 1;
  }
  return {
    enabled: true,
    days: out,
    streak,
    total: out.reduce((sum, d) => sum + d.total, 0),
    activeDays: out.filter(d => d.total > 0).length,
  };
}

export async function buildActivity(store, userId, { days = ACTIVITY_DAYS, at = Date.now() } = {}) {
  if (typeof store.activityFor !== 'function') {
    return { enabled: false, days: [], streak: 0, total: 0, activeDays: 0 };
  }
  const rows = await store.activityFor(userId, { days, at });
  return summarizeActivity(rows, { days, at });
}
