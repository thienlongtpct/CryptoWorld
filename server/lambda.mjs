import { createHandler } from './app.mjs';
import { loadAllowed } from './allowed.mjs';
import { createTinyFish } from './tinyfish.mjs';
import { createMaritime } from './maritime.mjs';
import { createLabQueueFromEnv } from './lab-queue.mjs';
import { processLabJob } from './lab-worker.mjs';
import { loadSponsorConfig } from './secrets.mjs';
import { selectStore } from './store-select.mjs';

/** Turn a Lambda result into an API Gateway HTTP API (payload 2.0) response. */
export function apigwResponse(result) {
  const headers = { ...result.headers };
  const cookies = [];
  if (headers['set-cookie']) {
    cookies.push(headers['set-cookie']);
    delete headers['set-cookie'];
  }
  return {
    statusCode: result.status,
    headers,
    cookies,
    body: JSON.stringify(result.body),
  };
}

/**
 * The learner's address, for rate limits. Behind CloudFront, API Gateway's sourceIp is a
 * CloudFront edge shared by many viewers, and CloudFront appends the real viewer address to
 * X-Forwarded-For. Entries before it come from the client and can be forged, so take the last
 * entry that is not the edge address itself.
 */
export function clientIp(event) {
  const source = event.requestContext?.http?.sourceIp || '';
  const raw = event.headers?.['x-forwarded-for'] || event.headers?.['X-Forwarded-For'] || '';
  const hops = String(raw).split(',').map(hop => hop.trim()).filter(Boolean);
  while (hops.length && hops[hops.length - 1] === source) hops.pop();
  return hops[hops.length - 1] || source;
}

/** Turn an API Gateway HTTP API event into the request the account handler expects. */
export function apigwRequest(event) {
  const rawBody = event.body
    ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
    : Buffer.alloc(0);
  const headerCookie = event.headers?.cookie || event.headers?.Cookie || '';
  return {
    method: event.requestContext.http.method,
    path: event.rawPath,
    headers: { ...(event.headers || {}), cookie: event.cookies?.length ? event.cookies.join('; ') : headerCookie },
    body: rawBody,
    ip: clientIp(event),
  };
}

let handle;

async function accountHandler() {
  if (!handle) {
    const cfg = await loadSponsorConfig();
    const store = await selectStore(cfg, async () => {
      const { createDynamoStore } = await import('./dynamo-store.mjs');
      return createDynamoStore(process.env.TABLE_NAME);
    });
    const maritime = createMaritime({ apiKey: cfg.maritime });
    const labQueue = await createLabQueueFromEnv({
      processJob: jobId => processLabJob({ store, maritime, jobId }),
    });
    handle = createHandler({
      store,
      allowed: loadAllowed(),
      secureCookie: process.env.COOKIE_SECURE === '1',
      gemini: cfg.gemini,
      model: cfg.model,
      tinyfish: createTinyFish({ apiKey: cfg.tinyfish }),
      maritime,
      labQueue,
    });
  }
  return handle;
}

export async function handler(event) {
  return apigwResponse(await (await accountHandler())(apigwRequest(event)));
}
