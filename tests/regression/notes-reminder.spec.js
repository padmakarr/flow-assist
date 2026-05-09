'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

async function openFreshNoteModal(page) {
  await page.locator('.nav-btn[data-view="notes"]').click();
  await page.locator('#notes-add-note-btn').click();
  await expect(page.locator('#notes-board .notes-card').first()).toBeVisible({ timeout: 10_000 });
  await page.locator('#notes-board .notes-card').first().locator('.notes-card-head-inner').click();
  await expect(page.locator('#notes-modal')).toHaveAttribute('aria-hidden', 'false');
}

test.describe('Notes reminder UI', () => {
  test('1 min preset saves a scheduled reminder row', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-reminder-1m');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openFreshNoteModal(page);

      await page.locator('#notes-modal .notes-reminder-dropdown-toggle').click();
      await expect(page.locator('#notes-modal .notes-reminder-dropdown')).toBeVisible();

      await page.locator('#notes-modal .notes-reminder-preset[data-min="1"]').click();
      await page.locator('#notes-modal .notes-reminder-save-btn').click();

      await expect(page.locator('#notes-modal .notes-reminder-when')).toBeVisible();
      await expect(page.locator('#notes-modal .notes-reminder-when')).not.toHaveText('');
      await expect(page.locator('#notes-modal .notes-reminder-dropdown')).toBeHidden();
    } finally {
      await app.close();
    }
  });

  test('datetime ~1 minute ahead saves scheduled row', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-reminder-dt');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openFreshNoteModal(page);

      await page.locator('#notes-modal .notes-reminder-dropdown-toggle').click();
      await expect(page.locator('#notes-modal .notes-reminder-dropdown')).toBeVisible();

      const abs = page.locator('#notes-modal .notes-reminder-mode[value="absolute"]');
      await abs.check();
      await expect(page.locator('#notes-modal .notes-reminder-abs')).toBeVisible();

      const localValue = await page.evaluate(() => {
        const d = new Date(Date.now() + 70_000);
        const pad = function (n) {
          return n < 10 ? '0' + n : String(n);
        };
        return (
          d.getFullYear() +
          '-' +
          pad(d.getMonth() + 1) +
          '-' +
          pad(d.getDate()) +
          'T' +
          pad(d.getHours()) +
          ':' +
          pad(d.getMinutes())
        );
      });
      await page.locator('#notes-modal .notes-reminder-datetime').fill(localValue);
      await page.locator('#notes-modal .notes-reminder-save-btn').click();

      await expect(page.locator('#notes-modal .notes-reminder-when')).toBeVisible();
      await expect(page.locator('#notes-modal .notes-reminder-when')).not.toHaveText('');
    } finally {
      await app.close();
    }
  });
});
