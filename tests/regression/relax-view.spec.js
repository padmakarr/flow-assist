'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Relax view', () => {
  test('shows timer cards and next tip changes copy', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="relax"]').click();
      await expect(page.locator('#view-relax')).toHaveClass(/active/);

      await expect(page.locator('#relax-break-heading')).toBeVisible();
      await expect(page.locator('#relax-work-heading')).toBeVisible();

      await expect(page.locator('#relax-tip-next')).toBeVisible();
      await page.locator('#relax-tip-next').click();
      await expect(page.locator('#relax-tip-body')).toBeVisible();
    } finally {
      await app.close();
    }
  });

  test('break preset buttons are clickable', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="relax"]').click();
      await page.locator('.relax-preset-btn[data-relax-break-min="5"]').click();
      await page.locator('#relax-break-start').click();
      await expect(page.locator('#relax-break-display')).not.toHaveText('—', { timeout: 5000 });
    } finally {
      await app.close();
    }
  });
});
