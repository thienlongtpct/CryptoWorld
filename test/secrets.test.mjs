import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLACEHOLDER_MARITIME, PLACEHOLDER_TINYFISH } from '../server/sponsors.mjs';
import { loadSponsorConfig, resetSponsorConfigCache } from '../server/secrets.mjs';

test('sponsor config prefers env over secret and ignores placeholders', async () => {
  resetSponsorConfigCache();
  const cfg = await loadSponsorConfig({
    env: {
      TINYFISH_API_KEY: PLACEHOLDER_TINYFISH,
      MARITIME_API_KEY: 'live-maritime-test-key',
      GEMINI_API_KEY: 'live-gemini',
      GEMINI_MODEL: 'gemini-test',
      SPONSOR_SECRET_ARN: 'arn:aws:secretsmanager:us-west-2:123:secret:x',
    },
    fetchSecret: async () => ({
      TINYFISH_API_KEY: 'from-secret-tinyfish',
      MARITIME_API_KEY: 'from-secret-maritime',
      GEMINI_API_KEY: 'from-secret-gemini',
      GEMINI_MODEL: 'from-secret-model',
    }),
  });
  assert.equal(cfg.source, 'secrets-manager');
  assert.equal(cfg.tinyfish, 'from-secret-tinyfish');
  assert.equal(cfg.maritime, 'live-maritime-test-key');
  assert.equal(cfg.gemini, 'live-gemini');
  assert.equal(cfg.model, 'gemini-test');
  assert.equal(JSON.stringify(cfg).includes(PLACEHOLDER_TINYFISH), false);
  assert.equal(JSON.stringify(cfg).includes(PLACEHOLDER_MARITIME), false);
});

test('missing secret ARN uses env only', async () => {
  resetSponsorConfigCache();
  const cfg = await loadSponsorConfig({
    env: {
      TINYFISH_API_KEY: 'env-tf',
      MARITIME_API_KEY: PLACEHOLDER_MARITIME,
    },
  });
  assert.equal(cfg.source, 'env');
  assert.equal(cfg.tinyfish, 'env-tf');
  assert.equal(cfg.maritime, '');
});
