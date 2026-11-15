// Postgres account store for TigerData (Tiger Cloud). Same methods as store.mjs and
// dynamo-store.mjs, plus activityFor() for the Journal's activity strip.
//
// On Tiger Cloud the TimescaleDB extension is available, so `evidence` becomes a hypertable
// partitioned by time and `activity_daily` is a real-time continuous aggregate over it.
// On plain Postgres (local development, tests) the same names exist as an ordinary table
// and view, so every query below works either way.
import pg from 'pg';
import { hashToken, newToken, SESSION_MS } from './tokens.mjs';

const LOCK_KEY = 7_401_215; // pg_advisory_lock id so concurrent cold starts migrate once.

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    username text NOT NULL,
    pass_hash text NOT NULL,
    salt text NOT NULL,
    created_at text
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users (lower(username))',
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires bigint NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS sessions_expires ON sessions (expires)',
  `CREATE TABLE IF NOT EXISTS progress (
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id text NOT NULL,
    status text NOT NULL,
    at timestamptz NOT NULL,
    PRIMARY KEY (user_id, item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS research_jobs (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    fingerprint text,
    expires_at bigint NOT NULL DEFAULT 0,
    updated_at text NOT NULL DEFAULT '',
    status text,
    data jsonb NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS research_jobs_fp ON research_jobs (user_id, fingerprint)',
  `CREATE TABLE IF NOT EXISTS lab_jobs (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    fingerprint text,
    expires_at bigint NOT NULL DEFAULT 0,
    updated_at text NOT NULL DEFAULT '',
    status text,
    data jsonb NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS lab_jobs_fp ON lab_jobs (user_id, fingerprint)',
  'CREATE INDEX IF NOT EXISTS lab_jobs_active ON lab_jobs (user_id, status)',
  `CREATE TABLE IF NOT EXISTS usage (
    kind text NOT NULL,
    user_id text NOT NULL,
    day text NOT NULL,
    count integer NOT NULL,
    PRIMARY KEY (kind, user_id, day)
  )`,
  // Hypertable unique keys must include the partition column, hence (id, at).
  `CREATE TABLE IF NOT EXISTS evidence (
    id text NOT NULL,
    seq bigserial,
    user_id text NOT NULL,
    task_id text NOT NULL,
    version integer NOT NULL DEFAULT 1,
    at timestamptz NOT NULL,
    type text NOT NULL,
    result jsonb,
    assistance text NOT NULL,
    PRIMARY KEY (id, at)
  )`,
  'CREATE INDEX IF NOT EXISTS evidence_user_at ON evidence (user_id, at DESC)',
];

const TIMESCALE = [
  "SELECT create_hypertable('evidence', 'at', chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE, migrate_data => TRUE)",
  `CREATE MATERIALIZED VIEW IF NOT EXISTS activity_daily
    WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
    SELECT user_id, time_bucket(INTERVAL '1 day', at) AS day, type, count(*)::integer AS count
    FROM evidence
    GROUP BY user_id, time_bucket(INTERVAL '1 day', at), type
    WITH NO DATA`,
  `SELECT add_continuous_aggregate_policy('activity_daily',
    start_offset => INTERVAL '40 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE)`,
];

const PLAIN_VIEW = `CREATE OR REPLACE VIEW activity_daily AS
  SELECT user_id, date_trunc('day', at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS day, type, count(*)::integer AS count
  FROM evidence
  GROUP BY 1, 2, 3`;

const iso = value => (value instanceof Date ? value.toISOString() : String(value));

/**
 * @param {{ connectionString?: string, pool?: import('pg').Pool, now?: () => number, sessionMs?: number, timescale?: 'auto' | boolean }} options
 */
export function createPgStore(options = {}) {
  const now = options.now ?? (() => Date.now());
  const sessionMs = options.sessionMs ?? SESSION_MS;
  const pool = options.pool ?? new pg.Pool({
    connectionString: options.connectionString,
    max: Number(process.env.TIGER_POOL_MAX || 2),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  let timescale = false;
  let ready = null;

  async function migrate() {
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
      for (const sql of TABLES) await client.query(sql);
      let useTimescale = options.timescale ?? 'auto';
      if (useTimescale === 'auto') {
        const found = await client.query("SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb'");
        useTimescale = found.rowCount > 0;
      }
      if (useTimescale) {
        await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb');
        // Each statement runs on its own: continuous aggregates refuse transaction blocks.
        for (const sql of TIMESCALE) await client.query(sql);
      } else {
        await client.query(PLAIN_VIEW);
      }
      timescale = Boolean(useTimescale);
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
      client.release();
    }
  }

  async function q(sql, params) {
    if (!ready) ready = migrate().catch(err => { ready = null; throw err; });
    await ready;
    return pool.query(sql, params);
  }

  async function issueSession(userId) {
    const token = newToken();
    await q('INSERT INTO sessions (token_hash, user_id, expires) VALUES ($1, $2, $3)', [hashToken(token), userId, now() + sessionMs]);
    return token;
  }

  function jobMethods(table) {
    return {
      async save(job) {
        const copy = structuredClone(job);
        await q(
          `INSERT INTO ${table} (id, user_id, fingerprint, expires_at, updated_at, status, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, fingerprint = EXCLUDED.fingerprint,
             expires_at = EXCLUDED.expires_at, updated_at = EXCLUDED.updated_at, status = EXCLUDED.status, data = EXCLUDED.data`,
          [copy.id, copy.userId, copy.fingerprint ?? null, Number(copy.expiresAt) || 0, String(copy.updatedAt ?? ''), copy.status ?? null, copy],
        );
        return copy;
      },
      async get(jobId) {
        const { rows } = await q(`SELECT data FROM ${table} WHERE id = $1`, [jobId]);
        return rows[0]?.data ?? null;
      },
      async byFingerprint(userId, fingerprint, at) {
        const { rows } = await q(
          `SELECT data FROM ${table} WHERE user_id = $1 AND fingerprint = $2 AND expires_at > $3
           ORDER BY updated_at DESC LIMIT 1`,
          [userId, fingerprint, at],
        );
        return rows[0]?.data ?? null;
      },
    };
  }

  async function usageFor(kind, userId, day) {
    const { rows } = await q('SELECT count FROM usage WHERE kind = $1 AND user_id = $2 AND day = $3', [kind, userId, day]);
    return rows[0]?.count ?? 0;
  }

  async function incrementUsage(kind, userId, day) {
    const { rows } = await q(
      `INSERT INTO usage (kind, user_id, day, count) VALUES ($1, $2, $3, 1)
       ON CONFLICT (kind, user_id, day) DO UPDATE SET count = usage.count + 1 RETURNING count`,
      [kind, userId, day],
    );
    return rows[0].count;
  }

  const research = jobMethods('research_jobs');
  const lab = jobMethods('lab_jobs');

  return {
    kind: 'tigerdata',
    get timescale() {
      return timescale;
    },
    /** Run migrations now instead of on the first request. */
    ready() {
      return q('SELECT 1').then(() => undefined);
    },
    close() {
      return pool.end();
    },

    async sessionUser(token) {
      await q('DELETE FROM sessions WHERE expires <= $1', [now()]);
      if (!token) return null;
      const { rows } = await q(
        'SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1',
        [hashToken(token)],
      );
      return rows[0] ? { id: rows[0].id, username: rows[0].username } : null;
    },

    async progressFor(userId) {
      const { rows } = await q('SELECT item_id, status, at FROM progress WHERE user_id = $1 ORDER BY at, item_id', [userId]);
      return rows.map(row => ({ itemId: row.item_id, status: row.status, at: iso(row.at) }));
    },

    async registerUser(user) {
      const { rowCount } = await q(
        `INSERT INTO users (id, username, pass_hash, salt, created_at) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [user.id, user.username, user.passHash, user.salt, user.createdAt ?? null],
      );
      if (!rowCount) return null;
      return { token: await issueSession(user.id), username: user.username };
    },

    async userByName(username) {
      const { rows } = await q('SELECT id, username, pass_hash, salt FROM users WHERE lower(username) = lower($1)', [username]);
      const row = rows[0];
      return row ? { id: row.id, username: row.username, passHash: row.pass_hash, salt: row.salt } : null;
    },

    createSession(userId) {
      return issueSession(userId);
    },

    async revokeSession(token) {
      if (token) await q('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
      return null;
    },

    async saveProgress(userId, itemId, status) {
      const at = new Date(now()).toISOString();
      const { rows } = await q(
        `INSERT INTO progress (user_id, item_id, status, at)
         SELECT $1, $2, $3, $4 WHERE EXISTS (SELECT 1 FROM users WHERE id = $1)
         ON CONFLICT (user_id, item_id) DO UPDATE SET status = EXCLUDED.status, at = EXCLUDED.at
           WHERE progress.status <> 'done'
         RETURNING item_id, status, at`,
        [userId, itemId, status, at],
      );
      const row = rows[0] ?? (await q('SELECT item_id, status, at FROM progress WHERE user_id = $1 AND item_id = $2', [userId, itemId])).rows[0];
      return row ? { itemId: row.item_id, status: row.status, at: iso(row.at) } : null;
    },

    saveResearchJob: research.save,
    getResearchJob: research.get,
    findResearchJobByFingerprint(userId, fingerprint, at = now()) {
      return research.byFingerprint(userId, fingerprint, at);
    },
    async researchJobsFor(userId, at = now()) {
      const { rows } = await q(
        'SELECT data FROM research_jobs WHERE user_id = $1 AND expires_at > $2 ORDER BY updated_at DESC LIMIT 25',
        [userId, at],
      );
      return rows.map(row => row.data);
    },
    researchUsageFor: (userId, day) => usageFor('research', userId, day),
    incrementResearchUsage: (userId, day) => incrementUsage('research', userId, day),

    saveLabJob: lab.save,
    getLabJob: lab.get,
    findLabJobByFingerprint(userId, fingerprint, at = now()) {
      return lab.byFingerprint(userId, fingerprint, at);
    },
    async countActiveLabJobs(userId, at = now()) {
      const { rows } = await q(
        `SELECT count(*)::integer AS n FROM lab_jobs
         WHERE user_id = $1 AND expires_at > $2 AND status IN ('queued', 'running')`,
        [userId, at],
      );
      return rows[0].n;
    },
    labUsageFor: (userId, day) => usageFor('lab', userId, day),
    incrementLabUsage: (userId, day) => incrementUsage('lab', userId, day),

    async appendEvidence(row) {
      const copy = structuredClone(row);
      const { rowCount } = await q(
        `INSERT INTO evidence (id, user_id, task_id, version, at, type, result, assistance)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8 WHERE EXISTS (SELECT 1 FROM users WHERE id = $2)`,
        [copy.id, copy.userId, copy.taskId, copy.version ?? 1, copy.at, copy.type,
          copy.result == null ? null : JSON.stringify(copy.result), copy.assistance],
      );
      return rowCount ? copy : null;
    },

    async evidenceFor(userId) {
      const { rows } = await q(
        `SELECT id, user_id, task_id, version, at, type, result, assistance FROM evidence
         WHERE user_id = $1 ORDER BY at, seq`,
        [userId],
      );
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        taskId: row.task_id,
        version: row.version,
        at: iso(row.at),
        type: row.type,
        result: row.result,
        assistance: row.assistance,
      }));
    },

    /** Per-day evidence counts by type from the activity_daily aggregate, newest window only. */
    async activityFor(userId, { days = 30, at = now() } = {}) {
      const since = new Date(at - days * 86_400_000).toISOString();
      const { rows } = await q(
        `SELECT day, type, count FROM activity_daily
         WHERE user_id = $1 AND day >= date_trunc('day', $2::timestamptz AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
         ORDER BY day, type`,
        [userId, since],
      );
      return rows.map(row => ({ day: iso(row.day).slice(0, 10), type: row.type, count: Number(row.count) }));
    },
  };
}
