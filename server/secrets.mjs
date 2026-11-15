/**
 * Load sponsor / Gemini configuration for Lambda.
 * Preferred: Secrets Manager JSON at SPONSOR_SECRET_ARN
 *   { "TINYFISH_API_KEY", "MARITIME_API_KEY", "GEMINI_API_KEY?", "GEMINI_MODEL?", "TIGER_DATABASE_URL?" }
 * Fallback: process env (local .env and existing Gemini Lambda settings).
 * Never log key material. Placeholders from .env.example count as unset.
 */
import { tigerUrl, maritimeKeyFromEnv, resolveSecret, tinyfishKeyFromEnv, PLACEHOLDER_MARITIME, PLACEHOLDER_TINYFISH } from './sponsors.mjs';

let cached = null;

function pick(envValue, secretValue, placeholder) {
  const fromEnv = placeholder
    ? resolveSecret(envValue, placeholder)
    : (typeof envValue === 'string' ? envValue.trim() : '');
  if (fromEnv) return fromEnv;
  if (placeholder) return resolveSecret(secretValue, placeholder);
  return typeof secretValue === 'string' ? secretValue.trim() : '';
}

async function readSecretJson(arn, fetchSecret) {
  if (!arn) return {};
  if (fetchSecret) return fetchSecret(arn);
  const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const client = new SecretsManagerClient({});
  const out = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  const raw = out.SecretString || '';
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw Object.assign(new Error('Sponsor secret must be a JSON object.'), { status: 500 });
  }
}

/**
 * @param {{ env?: NodeJS.ProcessEnv, fetchSecret?: (arn: string) => Promise<Record<string, string>> }} [options]
 */
export async function loadSponsorConfig(options = {}) {
  if (cached && !options.env && !options.fetchSecret) return cached;
  const env = options.env || process.env;
  const arn = typeof env.SPONSOR_SECRET_ARN === 'string' ? env.SPONSOR_SECRET_ARN.trim() : '';
  const secret = await readSecretJson(arn, options.fetchSecret);

  const config = {
    source: arn ? 'secrets-manager' : 'env',
    secretArn: arn || '',
    tinyfish: pick(env.TINYFISH_API_KEY, secret.TINYFISH_API_KEY, PLACEHOLDER_TINYFISH)
      || tinyfishKeyFromEnv(env),
    maritime: pick(env.MARITIME_API_KEY, secret.MARITIME_API_KEY, PLACEHOLDER_MARITIME)
      || maritimeKeyFromEnv(env),
    gemini: pick(env.GEMINI_API_KEY, secret.GEMINI_API_KEY, '')
      || (typeof secret.GEMINI_API_KEY === 'string' ? secret.GEMINI_API_KEY.trim() : ''),
    tigerdata: tigerUrl(env.TIGER_DATABASE_URL) || tigerUrl(secret.TIGER_DATABASE_URL),
    model: pick(env.GEMINI_MODEL, secret.GEMINI_MODEL, '')
      || (typeof secret.GEMINI_MODEL === 'string' ? secret.GEMINI_MODEL.trim() : ''),
  };

  if (!options.env && !options.fetchSecret) cached = config;
  return config;
}

/** Test helper — clear the cold-start cache. */
export function resetSponsorConfigCache() {
  cached = null;
}
