// Browser end-to-end tests that follow the 3-minute demo in DEMO_VIDEO.md.
//
//   npm run e2e                     builds the page, starts e2e/server.mjs (fake sponsors), runs Chromium
//   E2E_BASE_URL=https://www.cryptoworld.wiki npm run e2e:live
//                                   runs the same walk against a deployed site with the real sponsors
import { defineConfig, devices } from '@playwright/test';

const live = process.env.E2E_BASE_URL;
const port = Number(process.env.E2E_PORT || 8799);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // Real Gemini, TinyFish and Maritime calls can take a while on a live site.
  timeout: live ? 6 * 60_000 : 90_000,
  expect: { timeout: live ? 120_000 : 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: live || `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // E2E_VIDEO=1 records the walk, handy as a rough cut for the demo video.
    video: process.env.E2E_VIDEO ? 'on' : 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
  webServer: live ? undefined : {
    command: 'node --experimental-strip-types e2e/server.mjs',
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: { E2E_PORT: String(port) },
    stdout: 'pipe',
  },
});
