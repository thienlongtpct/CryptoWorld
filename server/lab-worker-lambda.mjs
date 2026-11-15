// SQS-triggered lab worker. Runs outside the 20s API Lambda timeout.
import { createMaritime } from './maritime.mjs';
import { processLabJob } from './lab-worker.mjs';
import { loadSponsorConfig } from './secrets.mjs';
import { selectStore } from './store-select.mjs';

let store;
let maritime;

async function deps() {
  if (!store) {
    const cfg = await loadSponsorConfig();
    store = await selectStore(cfg, async () => {
      const { createDynamoStore } = await import('./dynamo-store.mjs');
      return createDynamoStore(process.env.TABLE_NAME);
    });
    maritime = createMaritime({ apiKey: cfg.maritime });
  }
  return { store, maritime };
}

export async function handler(event) {
  const { store: db, maritime: m } = await deps();
  for (const record of event.Records || []) {
    let jobId = '';
    try {
      const body = JSON.parse(record.body || '{}');
      jobId = typeof body.jobId === 'string' ? body.jobId : '';
    } catch {
      continue;
    }
    if (!jobId) continue;
    await processLabJob({ store: db, maritime: m, jobId });
  }
  return { ok: true };
}
