'use strict';

const { test, expect } = require('@playwright/test');
const { getMainWindowPage, launchFlowAssist } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Smoke', () => {
  test('main window loads and shows app chrome', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await expect(page).toHaveTitle(/FlowAssist/i);
      await expect(page.locator('aside.sidebar')).toBeVisible();
    } finally {
      await app.close();
    }
  });
});
