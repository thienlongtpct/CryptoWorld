// Server-side sponsor configuration. Secrets stay off the Vite client.
// .env.example values are sentinels: leave them unchanged and the feature stays off.

export const PLACEHOLDER_TINYFISH = 'sk-tinyfish-REPLACE_ME';
export const PLACEHOLDER_MARITIME = 'mk_REPLACE_ME';

/** Return a usable secret, or '' when missing / still the example placeholder. */
export function resolveSecret(value, placeholder) {
  const key = typeof value === 'string' ? value.trim() : '';
  if (!key || key === placeholder) return '';
  return key;
}

export function tinyfishKeyFromEnv(env = process.env) {
  return resolveSecret(env.TINYFISH_API_KEY, PLACEHOLDER_TINYFISH);
}

export function maritimeKeyFromEnv(env = process.env) {
  return resolveSecret(env.MARITIME_API_KEY, PLACEHOLDER_MARITIME);
}

/** Booleans only — never include key material in readiness payloads. */
export function readiness({ gemini = '', tinyfish, maritime, store } = {}) {
  return {
    gemini: Boolean(typeof gemini === 'string' ? gemini.trim() : gemini),
    tinyfish: Boolean(tinyfish?.configured),
    maritime: Boolean(maritime?.configured),
    tigerdata: store?.kind === 'tigerdata',
  };
}

/** A Postgres URL for TigerData, or '' when missing / not a postgres:// URL. */
export function tigerUrl(value) {
  const url = typeof value === 'string' ? value.trim() : '';
  return /^postgres(ql)?:\/\/[^<>\s]+$/i.test(url) ? url : '';
}
