'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Calendar view', () => {
  test('navigates period, changes view mode, filter, and day-off panel', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="calendar"]').click();
      await expect(page.locator('#view-calendar')).toHaveClass(/active/);

      await page.locator('.calendar-view-btn[data-calendar-view="week"]').click();
      await expect(page.locator('.calendar-view-btn[data-calendar-view="week"]')).toHaveClass(/active/);

      await page.locator('#calendar-prev-btn').click();
      await page.locator('#calendar-next-btn').click();

      await page.locator('#calendar-goto-date').fill('2026-06-15');
      await page.locator('#calendar-goto-date').press('Enter');

      await page.locator('#calendar-filter').selectOption('eta');

      await page.locator('#calendar-dayoff-toggle').click();
      await expect(page.locator('#calendar-dayoff-panel')).not.toHaveClass(/task-block-collapsed/);

      await page.locator('#calendar-dayoff-toggle').click();
      await expect(page.locator('#calendar-dayoff-panel')).toHaveClass(/task-block-collapsed/);
    } finally {
      await app.close();
    }
  });
});
