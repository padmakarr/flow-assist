'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Visual smoke', () => {
  test('sidebar matches screenshot baseline', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(page.locator('aside.sidebar')).toHaveScreenshot('sidebar.png', {
        animations: 'disabled',
        maxDiffPixels: 2500,
      });
    } finally {
      await app.close();
    }
  });
});
