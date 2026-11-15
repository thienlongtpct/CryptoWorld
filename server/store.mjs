import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { hashToken, newToken, SESSION_MS } from './tokens.mjs';

export function emptyDb() {
  return {
    users: [],
    sessions: [],
    progress: [],
    researchJobs: [],
    researchUsage: [],
    labJobs: [],
    labUsage: [],
    evidence: [],
  };
}

export function readDb(dbPath) {
  try {
    const db = JSON.parse(readFileSync(dbPath, 'utf8'));
    return {
      users: db.users ?? [],
      sessions: db.sessions ?? [],
      progress: db.progress ?? [],
      researchJobs: db.researchJobs ?? [],
      researchUsage: db.researchUsage ?? [],
      labJobs: db.labJobs ?? [],
      labUsage: db.labUsage ?? [],
      evidence: db.evidence ?? [],
    };
  } catch {
    return emptyDb();
  }
}

export function saveDb(dbPath, db) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const tmp = `${dbPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, dbPath);
}

/**
 * JSON account store shared by the in-memory tests and the local file server.
 * Writes run one at a time, in the order they were started.
 */
export function createJsonStore(load, save, options = {}) {
  const now = options.now ?? (() => Date.now());
  const sessionMs = options.sessionMs ?? SESSION_MS;
  let chain = Promise.resolve();

  function update(fn) {
    const run = chain.then(async () => {
      const db = load();
      const result = await fn(db);
      if (result.write !== false) save(db);
      return result.value;
    });
    chain = run.then(() => {}, () => {});
    return run;
  }

  function issueSession(db, userId) {
    const token = newToken();
    db.sessions.push({ tokenHash: hashToken(token), userId, expires: now() + sessionMs });
    return token;
  }

  return {
    sessionUser(token) {
      return update(db => {
        const time = now();
        db.sessions = db.sessions.filter(session => session.expires > time);
        if (!token) return { value: null };
        const session = db.sessions.find(item => item.tokenHash === hashToken(token));
        const user = session && db.users.find(item => item.id === session.userId);
        return { value: user ? { id: user.id, username: user.username } : null };
      });
    },

    progressFor(userId) {
      return update(db => ({
        write: false,
        value: db.progress
          .filter(row => row.userId === userId)
          .map(row => ({ itemId: row.itemId, status: row.status, at: row.at })),
      }));
    },

    registerUser(user) {
      return update(db => {
        const key = user.username.toLowerCase();
        if (db.users.some(item => item.username.toLowerCase() === key)) return { write: false, value: null };
        db.users.push({
          id: user.id,
          username: user.username,
          passHash: user.passHash,
          salt: user.salt,
          createdAt: user.createdAt,
        });
        return { value: { token: issueSession(db, user.id), username: user.username } };
      });
    },

    userByName(username) {
      const key = username.toLowerCase();
      return update(db => {
        const user = db.users.find(item => item.username.toLowerCase() === key);
        return {
          write: false,
          value: user
            ? { id: user.id, username: user.username, passHash: user.passHash, salt: user.salt }
            : null,
        };
      });
    },

    createSession(userId) {
      return update(db => ({ value: issueSession(db, userId) }));
    },

    revokeSession(token) {
      return update(db => {
        if (token) {
          const tokenHash = hashToken(token);
          db.sessions = db.sessions.filter(session => session.tokenHash !== tokenHash);
        }
        return { value: null };
      });
    },

    saveProgress(userId, itemId, status) {
      return update(db => {
        if (!db.users.some(user => user.id === userId)) return { write: false, value: null };
        const at = new Date(now()).toISOString();
        const row = db.progress.find(item => item.userId === userId && item.itemId === itemId);
        if (!row) {
          db.progress.push({ userId, itemId, status, at });
          return { value: { itemId, status, at } };
        }
        if (row.status !== 'done') {
          row.status = status;
          row.at = at;
        }
        return { value: { itemId: row.itemId, status: row.status, at: row.at } };
      });
    },

    saveResearchJob(job) {
      return update(db => {
        const ix = db.researchJobs.findIndex(row => row.id === job.id);
        const copy = structuredClone(job);
        if (ix >= 0) db.researchJobs[ix] = copy;
        else db.researchJobs.push(copy);
        return { value: copy };
      });
    },

    getResearchJob(jobId) {
      return update(db => {
        const job = db.researchJobs.find(row => row.id === jobId);
        return { write: false, value: job ? structuredClone(job) : null };
      });
    },

    findResearchJobByFingerprint(userId, fingerprint, at = now()) {
      return update(db => {
        const matches = db.researchJobs
          .filter(row => row.userId === userId && row.fingerprint === fingerprint && row.expiresAt > at)
          .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
        return { write: false, value: matches[0] ? structuredClone(matches[0]) : null };
      });
    },

    researchJobsFor(userId, at = now()) {
      return update(db => ({
        write: false,
        value: db.researchJobs
          .filter(row => row.userId === userId && row.expiresAt > at)
          .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
          .map(row => structuredClone(row)),
      }));
    },

    researchUsageFor(userId, day) {
      return update(db => {
        const row = db.researchUsage.find(item => item.userId === userId && item.day === day);
        return { write: false, value: row?.count ?? 0 };
      });
    },

    incrementResearchUsage(userId, day) {
      return update(db => {
        const row = db.researchUsage.find(item => item.userId === userId && item.day === day);
        if (!row) {
          db.researchUsage.push({ userId, day, count: 1 });
          return { value: 1 };
        }
        row.count += 1;
        return { value: row.count };
      });
    },

    saveLabJob(job) {
      return update(db => {
        const ix = db.labJobs.findIndex(row => row.id === job.id);
        const copy = structuredClone(job);
        if (ix >= 0) db.labJobs[ix] = copy;
        else db.labJobs.push(copy);
        return { value: copy };
      });
    },

    getLabJob(jobId) {
      return update(db => {
        const job = db.labJobs.find(row => row.id === jobId);
        return { write: false, value: job ? structuredClone(job) : null };
      });
    },

    findLabJobByFingerprint(userId, fingerprint, at = now()) {
      return update(db => {
        const matches = db.labJobs
          .filter(row => row.userId === userId && row.fingerprint === fingerprint && row.expiresAt > at)
          .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
        return { write: false, value: matches[0] ? structuredClone(matches[0]) : null };
      });
    },

    countActiveLabJobs(userId, at = now()) {
      return update(db => ({
        write: false,
        value: db.labJobs.filter(row =>
          row.userId === userId
          && row.expiresAt > at
          && (row.status === 'queued' || row.status === 'running')).length,
      }));
    },

    labUsageFor(userId, day) {
      return update(db => {
        const row = db.labUsage.find(item => item.userId === userId && item.day === day);
        return { write: false, value: row?.count ?? 0 };
      });
    },

    incrementLabUsage(userId, day) {
      return update(db => {
        const row = db.labUsage.find(item => item.userId === userId && item.day === day);
        if (!row) {
          db.labUsage.push({ userId, day, count: 1 });
          return { value: 1 };
        }
        row.count += 1;
        return { value: row.count };
      });
    },

    appendEvidence(row) {
      return update(db => {
        if (!db.users.some(user => user.id === row.userId)) return { write: false, value: null };
        const copy = structuredClone(row);
        db.evidence.push(copy);
        return { value: copy };
      });
    },

    evidenceFor(userId) {
      return update(db => ({
        write: false,
        value: db.evidence
          .filter(row => row.userId === userId)
          .map(row => structuredClone(row)),
      }));
    },
  };
}

export function createMemoryStore(options) {
  let current = emptyDb();
  return createJsonStore(
    () => structuredClone(current),
    db => { current = db; },
    options,
  );
}

export function createFileStore(dbPath, options) {
  return createJsonStore(() => readDb(dbPath), db => saveDb(dbPath, db), options);
}
