'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Navigation (sidebar)', () => {
  test('switches views via sidebar nav buttons', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('.nav-btn[data-view="calendar"]').click();
      await expect(page.locator('#view-calendar')).toHaveClass(/active/);

      await page.locator('.nav-btn[data-view="summary"]').click();
      await expect(page.locator('#view-summary')).toHaveClass(/active/);

      await page.locator('.nav-btn[data-view="notes"]').click();
      await expect(page.locator('#view-notes')).toHaveClass(/active/);

      await page.locator('.nav-btn[data-view="relax"]').click();
      await expect(page.locator('#view-relax')).toHaveClass(/active/);

      await page.locator('.nav-btn[data-view="list"]').click();
      await expect(page.locator('#view-list')).toHaveClass(/active/);
    } finally {
      await app.close();
    }
  });
});
