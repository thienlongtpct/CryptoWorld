/**
 * Lab run queue.
 * - inline: local/dev path — process after enqueue (and on GET if still queued)
 * - sqs: production — API enqueues; lab-worker Lambda consumes
 */
export function createInlineLabQueue({ processJob }) {
  const pending = new Set();
  return {
    kind: 'inline',
    async enqueue(jobId) {
      if (pending.has(jobId)) return { ok: true, duplicate: true };
      pending.add(jobId);
      queueMicrotask(() => {
        Promise.resolve()
          .then(() => processJob(jobId))
          .catch(() => {})
          .finally(() => pending.delete(jobId));
      });
      return { ok: true, duplicate: false };
    },
  };
}

export function createSqsLabQueue({ queueUrl, sendMessage, processJob }) {
  return {
    kind: 'sqs',
    async enqueue(jobId) {
      await sendMessage({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ jobId }),
      });
      return { ok: true, duplicate: false };
    },
    // Optional sync fallback used only in tests.
    processJob,
  };
}

export async function createLabQueueFromEnv({ processJob, env = process.env } = {}) {
  const queueUrl = env.LAB_QUEUE_URL || '';
  if (queueUrl) {
    const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs');
    const client = new SQSClient({});
    return createSqsLabQueue({
      queueUrl,
      processJob,
      async sendMessage(input) {
        await client.send(new SendMessageCommand(input));
      },
    });
  }
  return createInlineLabQueue({ processJob });
}
