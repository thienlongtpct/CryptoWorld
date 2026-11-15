// The demo walk from DEMO_VIDEO.md, as one browser test. Each test.step matches a scene.
// Locally it runs against e2e/server.mjs (fake Gemini, TinyFish and Maritime at the HTTP boundary).
// With E2E_BASE_URL it runs against a deployed site and the real sponsors.
import { test, expect } from '@playwright/test';

const live = Boolean(process.env.E2E_BASE_URL);
const username = `e2e_${Date.now().toString(36)}`.slice(0, 20);
const password = 'e2e-demo-walk-9';

/** The "Public or Private?" board on the Bridge: row label → the choice that is right. */
const WIRE_BOARD = [
  ['The modulus p', 'Everyone, Eve included'],
  ['The generator g', 'Everyone, Eve included'],
  ['Alice’s exponent a', 'Only Alice'],
  ['Alice’s message A', 'Everyone, Eve included'],
  ['Bob’s exponent b', 'Only Bob'],
  ['Bob’s message B', 'Everyone, Eve included'],
  ['The shared key', 'Alice and Bob, not Eve'],
  ['Alice’s encrypted note', 'Everyone, Eve included'],
];

/** Walk in one direction until the world shows a "Space" prompt that matches `label`. */
async function walkUntilPrompt(page, key, label, maxSteps = 20) {
  const prompt = page.locator('.cw-prompt-btn');
  for (let i = 0; i < maxSteps; i += 1) {
    if (await prompt.isVisible() && label.test(await prompt.innerText())) return prompt;
    await page.keyboard.down(key);
    await page.waitForTimeout(140);
    await page.keyboard.up(key);
  }
  await expect(prompt).toContainText(label);
  return prompt;
}

test.describe.configure({ mode: 'serial' });

test('demo walk: library → bridge gate + Gemini → Maritime seal lab → TinyFish research → journal', async ({ page, request }) => {
  // Bit, the cipher companion, opens tutorials on its own as you move. Close it whenever it shows up.
  await page.addLocatorHandler(page.getByRole('button', { name: 'Close Bit' }), async close => { await close.click(); });

  await test.step('0:00 landing and sign-up', async () => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CryptoWorld/);
    await page.getByRole('button', { name: 'Create an account' }).click();
    await page.getByLabel('Username').fill(username);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: 'Sign up', exact: true }).last().click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  await test.step('0:15 oblivious transfer, step through and switch to Alice’s view', async () => {
    await page.goto('/#ot');
    const next = page.getByRole('button', { name: 'Next step' });
    await expect(next).toBeVisible();
    const scrub = page.getByRole('slider', { name: 'Step' });
    for (let i = 0; i < 3; i += 1) await next.click();
    await expect(scrub).toHaveValue('3');
    await page.getByRole('radio', { name: 'Alice sees' }).first().click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'alice');
    await page.getByRole('radio', { name: 'Everything' }).first().click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'all');
  });

  await test.step('0:45 Bridge of Shared Secrets: board, Gemini tutor, gate opens', async () => {
    await page.goto('/#world');
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    const bridge = page.locator('.cw-item').filter({ has: page.locator('b', { hasText: /^The Bridge of Shared Secrets$/ }) });
    await bridge.getByRole('button', { name: 'Go' }).click();
    await (await walkUntilPrompt(page, 'ArrowRight', /gate|board|sort/i)).click();

    // A board with one wrong row comes back with only that row flagged.
    for (const [row, choice] of WIRE_BOARD) {
      const pick = row === 'Alice’s exponent a' ? 'Everyone, Eve included' : choice;
      await page.getByRole('group', { name: new RegExp(row) }).getByLabel(pick).check();
    }
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.locator('.cw-nudge')).toHaveCount(1);
    await expect(page.getByRole('group', { name: /Alice’s exponent a/ }).locator('.cw-nudge')).toBeVisible();

    // The Gemini tutor answers from its permitted view.
    await page.getByLabel('Question').fill('Why can Eve not compute the shared key from A and B?');
    await page.getByRole('button', { name: 'Ask Gemini' }).click();
    await expect(page.locator('.cw-panel, [role="dialog"]').getByText(live ? /\w{20,}/ : /fake Gemini tutor/).first()).toBeVisible();

    await page.getByRole('group', { name: /Alice’s exponent a/ }).getByLabel('Only Alice').check();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByRole('button', { name: 'Close and continue' })).toBeVisible();
    await page.getByRole('button', { name: 'Close and continue' }).click();
  });

  await test.step('1:10 Fountain of Hash: forge the seal in the Maritime sandbox', async () => {
    await page.goto('/#world?mission=verify-download&gate=seal');
    await expect(page.getByRole('heading', { name: 'Maritime workbench' })).toBeVisible();
    const editor = page.getByRole('textbox', { name: 'Toy seal Python template' });
    await editor.fill((await editor.inputValue()).replace('CANDIDATE = "LEAF"', 'CANDIDATE = "FLEA"'));
    await page.getByRole('button', { name: 'Run in fresh sandbox' }).click();
    const run = page.locator('.cw-lab-run');
    await expect(run).toHaveClass(/status-completed/);
    await expect(run).toContainText('Maritime');
    await expect(run.locator('.cw-lab-out').first()).toContainText('FLEA');
    await expect(run).toContainText('same toy seal as LEAF');
    await run.getByRole('button', { name: 'Copy into answer' }).click();
    await expect(page.getByLabel('Answer')).toHaveValue(/FLEA/i);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByRole('button', { name: 'Go through' })).toBeVisible();
  });

  await test.step('1:50 Research Desk and the daily news watch (TinyFish)', async () => {
    await page.goto('/#research?topic=hash');
    await page.getByRole('button', { name: 'Start research' }).click();
    const job = page.locator('.cw-research-job').first();
    await expect(job).toContainText(live ? /NIST|RFC|SHA/ : 'Secure Hash Standard (FIPS 180-4)');
    const news = page.locator('.cw-news');
    await expect(news).toBeVisible();
    // The server polls TinyFish for news at most every 20 s, and the panel re-asks every 30 s.
    // Locally, move the harness clock past the throttle and reload; live, keep reloading until it lands.
    await expect(async () => {
      if (!live) await request.post('/__e2e/advance?ms=21000');
      await page.reload();
      await expect(page.locator('.cw-news section').first()).not.toContainText('reading this page now', { timeout: 2_000 });
    }).toPass({ timeout: live ? 5 * 60_000 : 20_000, intervals: [500, 1_000, 2_000] });
    if (!live) await expect(news).toContainText('E2E headline');
  });

  await test.step('2:30 Journal → Skills shows the server-checked seal', async () => {
    await page.goto('/#world?mission=verify-download&journal=skills');
    await expect(page.getByRole('tab', { name: 'Skills' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Learning record' })).toBeVisible();
    await expect(page.locator('.cw-panel-lede').filter({ hasText: 'not a professional certification' })).toBeVisible();
    const skill = title => page.locator('.cw-item').filter({ has: page.locator('b', { hasText: title }) }).locator('.cw-state');
    await expect(skill('Research Desk sources on hashing')).toHaveText('practiced');
    await expect(skill('Maritime toy-seal experiment')).toHaveText('practiced');
    await expect(skill('Forged seal collision challenge')).toHaveText('assessed');
    await page.getByRole('tab', { name: 'Challenges' }).click();
    for (const title of ['Public or Private?', 'Forged seal']) {
      await expect(page.locator('.cw-item, li').filter({ hasText: title }).getByText('Solved', { exact: true }).first()).toBeVisible();
    }
  });

  if (!live) {
    await test.step('sponsor wiring: each fake saw the calls the demo describes', async () => {
      const calls = await (await request.get('/__e2e/calls')).json();
      const saw = (sponsor, method, path) => calls.some(c => c.sponsor === sponsor && c.method === method && (!path || c.path.includes(path)));
      expect(saw('gemini', 'POST', ':generateContent')).toBe(true);
      expect(calls.some(c => c.sponsor === 'tinyfish' && c.detail?.kind === 'research')).toBe(true);
      expect(calls.some(c => c.sponsor === 'tinyfish' && c.detail?.kind === 'news')).toBe(true);
      for (const [method, path] of [['POST', '/api/sandboxes/ephemeral'], ['PUT', '/files'], ['POST', '/commands'], ['DELETE', '/api/sandboxes/ephemeral/']]) {
        expect(saw('maritime', method, path), `${method} ${path}`).toBe(true);
      }
      // The tutor's prompt carries the permitted view, never the board's answers.
      const gemini = calls.find(c => c.sponsor === 'gemini');
      expect(gemini.detail.view).toContain('Permitted view');
      expect(gemini.detail.view).not.toMatch(/"key"\s*:\s*"pair"/);
    });
  }
});
