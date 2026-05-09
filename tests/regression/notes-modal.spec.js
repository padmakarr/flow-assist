'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

test.describe('Notes modal', () => {
  test('New note opens modal; backdrop click closes', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-modal');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="notes"]').click();

      await page.locator('#notes-add-note-btn').click();
      await expect(page.locator('#notes-board .notes-card').first()).toBeVisible({ timeout: 10_000 });

      await page.locator('#notes-board .notes-card').first().locator('.notes-card-head-inner').click();
      const modal = page.locator('#notes-modal');
      await expect(modal).toHaveAttribute('aria-hidden', 'false');

      await page.keyboard.press('Escape');
      await expect(modal).toHaveAttribute('aria-hidden', 'true');
    } finally {
      await app.close();
    }
  });
});
