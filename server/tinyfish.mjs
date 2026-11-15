// TinyFish Web Agent automation adapter (official async run + get-run contracts).
// POST /v1/automation/run-async  → { run_id, error }
// GET  /v1/runs/{id}             → run status + structured result
// Uses built-in fetch — no SDK in the Lambda bundle.
import { PLACEHOLDER_TINYFISH, resolveSecret } from './sponsors.mjs';

const DEFAULT_BASE = 'https://agent.tinyfish.ai';
const MISSING = 'TinyFish is not configured on the account server. Set TINYFISH_API_KEY to enable research.';

function safeError(data, fallback, apiKey) {
  const message = data?.error?.message || data?.message || data?.error;
  if (typeof message === 'string' && message && (!apiKey || !message.includes(apiKey))) return message;
  return fallback;
}

export function createTinyFish({
  apiKey = '',
  baseUrl = DEFAULT_BASE,
  fetchImpl = globalThis.fetch,
  timeoutMs = 20_000,
} = {}) {
  const key = resolveSecret(apiKey, PLACEHOLDER_TINYFISH);
  const configured = Boolean(key);
  const root = String(baseUrl || DEFAULT_BASE).replace(/\/$/, '');

  async function request(path, { method = 'GET', body } = {}) {
    if (!configured) {
      return { ok: false, status: 503, configured: false, error: MISSING };
    }
    let response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          'X-API-Key': key,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return { ok: false, status: 504, configured: true, error: 'TinyFish did not answer in time.' };
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        configured: true,
        error: safeError(data, 'TinyFish request failed.', key),
        data,
        rateLimited: response.status === 429,
      };
    }
    return { ok: true, status: response.status, configured: true, data };
  }

  return {
    get configured() {
      return configured;
    },

    /**
     * Start an asynchronous browser automation run.
     * Contract: POST https://agent.tinyfish.ai/v1/automation/run-async
     */
    async startAutomation({
      url,
      goal,
      outputSchema,
      browserProfile = 'lite',
      agentConfig,
      apiIntegration = 'visucrypto',
    } = {}) {
      const target = typeof url === 'string' ? url.trim() : '';
      const task = typeof goal === 'string' ? goal.trim() : '';
      if (!target) return { ok: false, status: 400, configured, error: 'Send a starting URL.' };
      if (!task) return { ok: false, status: 400, configured, error: 'Send an automation goal.' };
      const body = {
        url: target,
        goal: task,
        browser_profile: browserProfile === 'stealth' ? 'stealth' : 'lite',
        api_integration: apiIntegration,
      };
      if (outputSchema && typeof outputSchema === 'object') body.output_schema = outputSchema;
      if (agentConfig && typeof agentConfig === 'object') body.agent_config = agentConfig;
      const started = await request('/v1/automation/run-async', { method: 'POST', body });
      if (!started.ok) return started;
      const runId = started.data?.run_id;
      const err = started.data?.error;
      if (!runId || err) {
        return {
          ok: false,
          status: 502,
          configured: true,
          error: err?.message || 'TinyFish did not return a run id.',
          data: started.data,
        };
      }
      return { ok: true, status: started.status, configured: true, data: started.data, runId };
    },

    /**
     * Poll an automation run.
     * Contract: GET https://agent.tinyfish.ai/v1/runs/{id}
     */
    async getRun(runId, { screenshots = 'none', html = 'none' } = {}) {
      const id = typeof runId === 'string' ? runId.trim() : '';
      if (!id) return { ok: false, status: 400, configured, error: 'Send a TinyFish run id.' };
      if (!/^[A-Za-z0-9_-]+$/.test(id)) {
        return { ok: false, status: 400, configured, error: 'TinyFish run id looks invalid.' };
      }
      const params = new URLSearchParams({ screenshots, html });
      return request(`/v1/runs/${encodeURIComponent(id)}?${params}`);
    },
  };
}
