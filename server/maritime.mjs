// Maritime ephemeral-sandbox REST adapter (official sandboxes docs).
// Create: POST /api/sandboxes/ephemeral → dataPlaneUrl + secret
// Run:    POST {dataPlaneUrl}/commands with {"cmd": "..."} and X-Maritime-Token
// Uses built-in fetch — no SDK in the Lambda bundle.
import { PLACEHOLDER_MARITIME, resolveSecret } from './sponsors.mjs';

const DEFAULT_BASE = 'https://api.maritime.sh';
const MISSING = 'Maritime is not configured on the account server. Set MARITIME_API_KEY to enable code experiments.';

function safeError(data, fallback, apiKey) {
  const message = data?.message || data?.error?.message || data?.detail?.message
    || (typeof data?.detail === 'string' ? data.detail : '')
    || data?.error;
  if (typeof message === 'string' && message && (!apiKey || !message.includes(apiKey))) return message;
  return fallback;
}

async function readBody(response) {
  const text = await response.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 200) };
  }
}

export function createMaritime({
  apiKey = '',
  baseUrl = DEFAULT_BASE,
  fetchImpl = globalThis.fetch,
  timeoutMs = 30_000,
} = {}) {
  const key = resolveSecret(apiKey, PLACEHOLDER_MARITIME);
  const configured = Boolean(key);
  const root = String(baseUrl || DEFAULT_BASE).replace(/\/$/, '');

  async function request(path, { method = 'GET', body, headers = {} } = {}) {
    if (!configured) {
      return { ok: false, status: 503, configured: false, error: MISSING };
    }
    let response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${key}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return { ok: false, status: 504, configured: true, error: 'Maritime did not answer in time.' };
    }
    const data = await readBody(response);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        configured: true,
        error: safeError(data, 'Maritime request failed.', key),
        data,
        rateLimited: response.status === 429,
      };
    }
    return { ok: true, status: response.status, configured: true, data };
  }

  async function planeRequest(dataPlaneUrl, secret, path, { method = 'GET', body, headers = {}, rawBody, contentType } = {}) {
    if (!configured) {
      return { ok: false, status: 503, configured: false, error: MISSING };
    }
    const plane = typeof dataPlaneUrl === 'string' ? dataPlaneUrl.replace(/\/$/, '') : '';
    const token = typeof secret === 'string' ? secret.trim() : '';
    if (!plane || !token) {
      return { ok: false, status: 400, configured: true, error: 'Sandbox data plane credentials are required.' };
    }
    let response;
    try {
      response = await fetchImpl(`${plane}${path}`, {
        method,
        headers: {
          'X-Maritime-Token': token,
          ...(rawBody !== undefined || body !== undefined
            ? { 'content-type': contentType || 'application/json' }
            : {}),
          ...headers,
        },
        body: rawBody !== undefined ? rawBody : body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return { ok: false, status: 504, configured: true, error: 'Maritime data plane did not answer in time.' };
    }
    const data = await readBody(response);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        configured: true,
        error: safeError(data, 'Maritime data plane request failed.', key),
        data,
      };
    }
    return { ok: true, status: response.status, configured: true, data };
  }

  return {
    get configured() {
      return configured;
    },

    async createEphemeral(options = {}) {
      const body = {};
      if (typeof options.name === 'string' && options.name.trim()) body.name = options.name.trim();
      if (Number.isFinite(options.idleMinutes)) body.idleMinutes = options.idleMinutes;
      if (Number.isFinite(options.timeLimitMinutes)) body.timeLimitMinutes = options.timeLimitMinutes;
      if (options.onIdle === 'pause' || options.onIdle === 'kill') body.onIdle = options.onIdle;
      if (typeof options.from === 'string' && options.from.trim()) body.from = options.from.trim();
      if (typeof options.size === 'string' && options.size.trim()) body.size = options.size.trim();
      if (options.env && typeof options.env === 'object') body.env = options.env;
      if (options.metadata && typeof options.metadata === 'object') body.metadata = options.metadata;
      if (typeof options.endUser === 'string' && options.endUser.trim()) body.endUser = options.endUser.trim();
      const headers = {};
      if (typeof options.idempotencyKey === 'string' && options.idempotencyKey.trim()) {
        headers['Idempotency-Key'] = options.idempotencyKey.trim();
      }
      return request('/api/sandboxes/ephemeral', { method: 'POST', body, headers });
    },

    async listEphemeral() {
      return request('/api/sandboxes/ephemeral');
    },

    async extendEphemeral(sandboxId, { timeLimitMinutes } = {}) {
      const id = typeof sandboxId === 'string' ? sandboxId.trim() : '';
      if (!id) return { ok: false, status: 400, configured, error: 'Send a sandbox id.' };
      const body = {};
      if (Number.isFinite(timeLimitMinutes)) body.timeLimitMinutes = timeLimitMinutes;
      return request(`/api/sandboxes/ephemeral/${encodeURIComponent(id)}`, { method: 'POST', body });
    },

    async killEphemeral(sandboxId) {
      const id = typeof sandboxId === 'string' ? sandboxId.trim() : '';
      if (!id) return { ok: false, status: 400, configured, error: 'Send a sandbox id.' };
      return request(`/api/sandboxes/ephemeral/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },

    /**
     * Write a UTF-8 file on the sandbox data plane without shell interpolation.
     * Tries PUT /files?path=… then POST /files with JSON {path,content}.
     */
    async writeFile({ dataPlaneUrl, secret, path, content } = {}) {
      const filePath = typeof path === 'string' ? path.trim() : '';
      if (!filePath.startsWith('/')) {
        return { ok: false, status: 400, configured, error: 'File path must be absolute.' };
      }
      const text = typeof content === 'string' ? content : '';
      const put = await planeRequest(dataPlaneUrl, secret, `/files?path=${encodeURIComponent(filePath)}`, {
        method: 'PUT',
        rawBody: text,
        contentType: 'application/octet-stream',
      });
      if (put.ok || put.status === 503) return put;
      return planeRequest(dataPlaneUrl, secret, '/files', {
        method: 'POST',
        body: { path: filePath, content: text },
      });
    },

    /**
     * Run a fixed command string on the data plane.
     * Contract uses {"cmd": "..."} (not shell interpolation of learner source).
     */
    async runCommand({ dataPlaneUrl, secret, cmd, timeoutMs: cmdTimeout } = {}) {
      const command = typeof cmd === 'string' ? cmd.trim() : '';
      if (!command) return { ok: false, status: 400, configured, error: 'Send a command to run.' };
      const body = { cmd: command };
      if (Number.isFinite(cmdTimeout)) body.timeoutMs = cmdTimeout;
      return planeRequest(dataPlaneUrl, secret, '/commands', { method: 'POST', body });
    },
  };
}
