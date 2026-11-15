import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { hashToken, newToken, SESSION_MS } from './tokens.mjs';

const PROFILE = 'PROFILE';

function nameKey(username) {
  return `NAME#${username.toLowerCase()}`;
}

function cancelled(err) {
  return err?.name === 'TransactionCanceledException'
    && (err.CancellationReasons ?? []).some(reason => reason.Code === 'ConditionalCheckFailed');
}

/**
 * Production account store. The Lambda runtime provides the AWS SDK.
 * Sessions expire with the table's TTL and are also rejected by `expires`.
 */
export function createDynamoStore(tableName, options = {}) {
  const now = options.now ?? (() => Date.now());
  const sessionMs = options.sessionMs ?? SESSION_MS;
  const client = options.client ?? DynamoDBDocumentClient.from(new DynamoDBClient({}));

  function sessionItem(tokenHash, userId) {
    const expires = now() + sessionMs;
    return {
      pk: `SESSION#${tokenHash}`,
      sk: 'SESSION',
      userId,
      expires,
      ttl: Math.floor(expires / 1000),
    };
  }

  async function putSession(userId) {
    const token = newToken();
    await client.send(new PutCommand({ TableName: tableName, Item: sessionItem(hashToken(token), userId) }));
    return token;
  }

  return {
    async sessionUser(token) {
      if (!token) return null;
      const key = { pk: `SESSION#${hashToken(token)}`, sk: 'SESSION' };
      const found = await client.send(new GetCommand({ TableName: tableName, Key: key }));
      const session = found.Item;
      if (!session || session.expires <= now()) {
        if (session) await client.send(new DeleteCommand({ TableName: tableName, Key: key }));
        return null;
      }
      const user = await client.send(new GetCommand({
        TableName: tableName,
        Key: { pk: `USER#${session.userId}`, sk: PROFILE },
      }));
      if (!user.Item) return null;
      return { id: user.Item.userId, username: user.Item.username };
    },

    async progressFor(userId) {
      const found = await client.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'PROGRESS#' },
      }));
      return (found.Items ?? []).map(row => ({ itemId: row.itemId, status: row.status, at: row.at }));
    },

    async registerUser(user) {
      const token = newToken();
      const session = sessionItem(hashToken(token), user.id);
      try {
        await client.send(new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: tableName,
                Item: { pk: nameKey(user.username), sk: PROFILE, userId: user.id },
                ConditionExpression: 'attribute_not_exists(pk)',
              },
            },
            {
              Put: {
                TableName: tableName,
                Item: {
                  pk: `USER#${user.id}`,
                  sk: PROFILE,
                  userId: user.id,
                  username: user.username,
                  passHash: user.passHash,
                  salt: user.salt,
                  createdAt: user.createdAt,
                },
              },
            },
            { Put: { TableName: tableName, Item: session } },
          ],
        }));
      } catch (err) {
        if (cancelled(err)) return null;
        throw err;
      }
      return { token, username: user.username };
    },

    async userByName(username) {
      const name = await client.send(new GetCommand({
        TableName: tableName,
        Key: { pk: nameKey(username), sk: PROFILE },
      }));
      if (!name.Item) return null;
      const user = await client.send(new GetCommand({
        TableName: tableName,
        Key: { pk: `USER#${name.Item.userId}`, sk: PROFILE },
      }));
      if (!user.Item) return null;
      return {
        id: user.Item.userId,
        username: user.Item.username,
        passHash: user.Item.passHash,
        salt: user.Item.salt,
      };
    },

    createSession: putSession,

    async revokeSession(token) {
      if (!token) return;
      await client.send(new DeleteCommand({
        TableName: tableName,
        Key: { pk: `SESSION#${hashToken(token)}`, sk: 'SESSION' },
      }));
    },

    async saveProgress(userId, itemId, status) {
      const at = new Date(now()).toISOString();
      const key = { pk: `USER#${userId}`, sk: `PROGRESS#${itemId}` };
      try {
        await client.send(new UpdateCommand({
          TableName: tableName,
          Key: key,
          UpdateExpression: 'SET itemId = :itemId, #status = :status, #at = :at, userId = :userId',
          ConditionExpression: 'attribute_not_exists(#status) OR #status <> :done',
          ExpressionAttributeNames: { '#status': 'status', '#at': 'at' },
          ExpressionAttributeValues: {
            ':itemId': itemId,
            ':status': status,
            ':at': at,
            ':userId': userId,
            ':done': 'done',
          },
        }));
        return { itemId, status, at };
      } catch (err) {
        if (err?.name !== 'ConditionalCheckFailedException') throw err;
        const existing = await client.send(new GetCommand({ TableName: tableName, Key: key }));
        return {
          itemId,
          status: existing.Item?.status ?? 'done',
          at: existing.Item?.at ?? at,
        };
      }
    },

    async saveResearchJob(job) {
      const ttl = Math.floor(job.expiresAt / 1000);
      const item = {
        pk: `RESEARCH#${job.id}`,
        sk: 'JOB',
        ...job,
        ttl,
      };
      await client.send(new PutCommand({ TableName: tableName, Item: item }));
      await client.send(new PutCommand({
        TableName: tableName,
        Item: {
          pk: `USER#${job.userId}`,
          sk: `RFP#${job.fingerprint}`,
          jobId: job.id,
          status: job.status,
          expiresAt: job.expiresAt,
          updatedAt: job.updatedAt,
          ttl,
        },
      }));
      return job;
    },

    async getResearchJob(jobId) {
      const found = await client.send(new GetCommand({
        TableName: tableName,
        Key: { pk: `RESEARCH#${jobId}`, sk: 'JOB' },
      }));
      if (!found.Item) return null;
      const { pk, sk, ttl, ...job } = found.Item;
      return job;
    },

    async findResearchJobByFingerprint(userId, fingerprint, at = now()) {
      const pointer = await client.send(new GetCommand({
        TableName: tableName,
        Key: { pk: `USER#${userId}`, sk: `RFP#${fingerprint}` },
      }));
      if (!pointer.Item || pointer.Item.expiresAt <= at) return null;
      const job = await this.getResearchJob(pointer.Item.jobId);
      if (!job || job.userId !== userId || job.fingerprint !== fingerprint || job.expiresAt <= at) return null;
      return job;
    },

    /** Unexpired research jobs for one user, newest first, via the RFP# pointers. */
    async researchJobsFor(userId, at = now()) {
      const found = await client.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'RFP#' },
      }));
      const pointers = (found.Items ?? []).filter(item => item.expiresAt > at).slice(0, 25);
      const jobs = await Promise.all(pointers.map(item => this.getResearchJob(item.jobId)));
      return jobs
        .filter(job => job && job.userId === userId && job.expiresAt > at)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    },

    async researchUsageFor(userId, day) {
      const found = await client.send(new GetCommand({
        TableName: tableName,
        Key: { pk: `USER#${userId}`, sk: `RUSAGE#${day}` },
      }));
      return found.Item?.count ?? 0;
    },

    async incrementResearchUsage(userId, day) {
      const result = await client.send(new UpdateCommand({
        TableName: tableName,
        Key: { pk: `USER#${userId}`, sk: `RUSAGE#${day}` },
        UpdateExpression: 'ADD #count :one SET userId = :userId, #day = :day',
        ExpressionAttributeNames: { '#count': 'count', '#day': 'day' },
        ExpressionAttributeValues: {
          ':one': 1,
          ':userId': userId,
          ':day': day,
        },
        ReturnValues: 'UPDATED_NEW',
      }));
      return result.Attributes?.count ?? 1;
    },

    async saveLabJob(job) {
      const ttl = Math.floor(job.expiresAt / 1000);
      const item = { pk: `LAB#${job.id}`, sk: 'JOB', ...job, ttl };
      await client.send(new PutCommand({ TableName: tableName, Item: item }));
      await client.send(new PutCommand({
        TableName: tableName,
        Item: {
          pk: `USER#${job.userId}`,
          sk: `LFP#${job.fingerprint}`,
          jobId: job.id,
          status: job.status,
          expiresAt: job.expiresAt,
          updatedAt: job.updatedAt,
          ttl,
        },
      }));
      const activeKey = { pk: `USER#${job.userId}`, sk: `LABACTIVE#${job.id}` };
      if (job.status === 'queued' || job.status === 'running') {
        await client.send(new PutCommand({
          TableName: tableName,
          Item: {
            ...activeKey,
            jobId: job.id,
            status: job.status,
            expiresAt: job.expiresAt,
            ttl,
          },
        }));
      } else {
        await client.send(new DeleteCommand({ TableName: tableName, Key: activeKey }));
      }
      return job;
    },

    async getLabJob(jobId) {
      const found = await client.send(new GetCommand({
        TableName: tableName,
        Key: { pk: `LAB#${jobId}`, sk: 'JOB' },
      }));
      if (!found.Item) return null;
      const { pk, sk, ttl, ...job } = found.Item;
      return job;
    },

    async findLabJobByFingerprint(userId, fingerprint, at = now()) {
      const pointer = await client.send(new GetCommand({
        TableName: tableName,
        Key: { pk: `USER#${userId}`, sk: `LFP#${fingerprint}` },
      }));
      if (!pointer.Item || pointer.Item.expiresAt <= at) return null;
      const job = await this.getLabJob(pointer.Item.jobId);
      if (!job || job.userId !== userId || job.fingerprint !== fingerprint || job.expiresAt <= at) return null;
      return job;
    },

    async countActiveLabJobs(userId, at = now()) {
      const found = await client.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'LABACTIVE#' },
      }));
      return (found.Items ?? []).filter(item =>
        item.expiresAt > at && (item.status === 'queued' || item.status === 'running')).length;
    },

    async labUsageFor(userId, day) {
      const found = await client.send(new GetCommand({
        TableName: tableName,
        Key: { pk: `USER#${userId}`, sk: `LUSAGE#${day}` },
      }));
      return found.Item?.count ?? 0;
    },

    async incrementLabUsage(userId, day) {
      const result = await client.send(new UpdateCommand({
        TableName: tableName,
        Key: { pk: `USER#${userId}`, sk: `LUSAGE#${day}` },
        UpdateExpression: 'ADD #count :one SET userId = :userId, #day = :day',
        ExpressionAttributeNames: { '#count': 'count', '#day': 'day' },
        ExpressionAttributeValues: {
          ':one': 1,
          ':userId': userId,
          ':day': day,
        },
        ReturnValues: 'UPDATED_NEW',
      }));
      return result.Attributes?.count ?? 1;
    },

    async appendEvidence(row) {
      const atMs = Date.parse(row.at) || now();
      await client.send(new PutCommand({
        TableName: tableName,
        Item: {
          pk: `USER#${row.userId}`,
          sk: `EVIDENCE#${atMs.toString(36)}#${row.id}`,
          ...row,
        },
      }));
      return row;
    },

    async evidenceFor(userId) {
      const found = await client.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'EVIDENCE#' },
      }));
      return (found.Items ?? []).map(item => {
        const { pk, sk, ...row } = item;
        return row;
      });
    },
  };
}
