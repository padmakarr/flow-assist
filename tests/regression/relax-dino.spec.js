'use strict';

const { test, expect } = require('@playwright/test');
const {
  launchFlowAssist,
  getMainWindowPage,
  setMainWindowCompact,
  setMainWindowMaximized,
} = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

async function openRelax(page) {
  await page.locator('.nav-btn[data-view="relax"]').click();
  await expect(page.locator('#view-relax')).toHaveClass(/active/);
}

async function expandDesertRunPanel(page) {
  await page.locator('#relax-toggle-desert-run').click();
  await expect(page.locator('#relax-desert-run-panel')).toBeVisible();
  await expect(page.locator('#relax-toggle-desert-run')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#relax-minigame-dino').scrollIntoViewIfNeeded();
}

/** @type {Array<[string, (app: import('@playwright/test').ElectronApplication) => Promise<void>]>} */
const WINDOW_LAYOUTS = [
  ['compact', setMainWindowCompact],
  ['maximized', setMainWindowMaximized],
];

WINDOW_LAYOUTS.forEach(([layoutName, applyWindowLayout]) => {
  test.describe(`Relax Desert run mini-game (${layoutName})`, () => {
    test('iframe is present and loads the dino entry', async () => {
      const app = await launchFlowAssist();
      try {
        const page = await getMainWindowPage(app);
        await applyWindowLayout(app);
        await waitForProfileLoaded(page);
        await openRelax(page);
        await expandDesertRunPanel(page);

        const iframe = page.locator('#relax-minigame-dino');
        await expect(iframe).toBeVisible();
        await expect(iframe).toHaveAttribute('title', 'Desert run mini-game');
        await expect(iframe).toHaveAttribute('src', /minigames\/dino\/index\.html$/);
      } finally {
        await app.close();
      }
    });

    test('mini-game runs until collision (game over overlay)', async () => {
      const app = await launchFlowAssist();
      try {
        const page = await getMainWindowPage(app);
        await applyWindowLayout(app);
        await waitForProfileLoaded(page);
        await openRelax(page);
        await expandDesertRunPanel(page);

        const frame = page.frameLocator('iframe[title="Desert run mini-game"]');
        const canvas = frame.locator('#dino-canvas');
        await canvas.click({ force: true });
        await canvas.press('Space');

        await expect(frame.locator('body')).toHaveAttribute('data-game-state', 'running', { timeout: 8000 });

        await expect(frame.locator('body')).toHaveAttribute('data-game-state', 'gameover', { timeout: 35000 });

        const overlay = frame.locator('#dino-overlay-msg');
        await expect(overlay).toBeVisible();
        await expect(overlay).toContainText(/Score|New best/);
      } finally {
        await app.close();
      }
    });

    test('persists high score in iframe localStorage after a run', async () => {
      const app = await launchFlowAssist();
      try {
        const page = await getMainWindowPage(app);
        await applyWindowLayout(app);
        await waitForProfileLoaded(page);
        await openRelax(page);
        await expandDesertRunPanel(page);

        const iframeEl = page.locator('#relax-minigame-dino');
        const frame = page.frameLocator('iframe[title="Desert run mini-game"]');
        const canvas = frame.locator('#dino-canvas');

        await canvas.click({ force: true });
        await canvas.press('Space');
        await expect(frame.locator('body')).toHaveAttribute('data-game-state', 'running', { timeout: 8000 });
        await expect(frame.locator('body')).toHaveAttribute('data-game-state', 'gameover', { timeout: 35000 });

        const handle = await iframeEl.elementHandle();
        const content = await handle.contentFrame();
        expect(content).not.toBeNull();
        const stored = await content.evaluate(() =>
          localStorage.getItem('flowassist-minigame-dino-hiscore')
        );
        expect(stored).not.toBeNull();
        expect(Number.parseInt(stored, 10)).toBeGreaterThanOrEqual(0);
      } finally {
        await app.close();
      }
    });

    test('switching views keeps mini-game iframe when returning to Relax', async () => {
      const app = await launchFlowAssist();
      try {
        const page = await getMainWindowPage(app);
        await applyWindowLayout(app);
        await waitForProfileLoaded(page);
        await openRelax(page);
        await expandDesertRunPanel(page);
        await expect(page.locator('#relax-minigame-dino')).toBeVisible();

        await page.locator('.nav-btn[data-view="list"]').click();
        await expect(page.locator('#view-list')).toHaveClass(/active/);

        await page.locator('.nav-btn[data-view="relax"]').click();
        await expect(page.locator('#view-relax')).toHaveClass(/active/);
        await expandDesertRunPanel(page);
        await expect(page.locator('#relax-minigame-dino')).toBeVisible();
        await expect(page.locator('#relax-minigame-dino')).toHaveAttribute('src', /minigames\/dino\/index\.html$/);
      } finally {
        await app.close();
      }
    });
  });
});
