// Pick the account store: TigerData (Postgres) when a URL is configured, otherwise the
// given fallback (the JSON file locally, DynamoDB on AWS). pg loads only when needed.

export async function selectStore(cfg, fallback) {
  if (cfg?.tigerdata) {
    const { createPgStore } = await import('./pg-store.mjs');
    return createPgStore({ connectionString: cfg.tigerdata });
  }
  return fallback();
}
