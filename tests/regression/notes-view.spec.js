'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Notes view filters', () => {
  test('created filter mode shows day input when Single day selected', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="notes"]').click();
      await expect(page.locator('#view-notes')).toHaveClass(/active/);

      await page.locator('#notes-filter-mode').selectOption('day');
      await expect(page.locator('#notes-filter-day')).toBeVisible();

      await page.locator('#notes-filter-clear').click();
      await expect(page.locator('#notes-filter-mode')).toHaveValue('all');
    } finally {
      await app.close();
    }
  });

  test('notes board is present', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="notes"]').click();
      await expect(page.locator('#notes-board')).toBeVisible();
    } finally {
      await app.close();
    }
  });
});
