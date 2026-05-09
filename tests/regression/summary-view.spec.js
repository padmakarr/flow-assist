'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Summary view', () => {
  test('generate summary fills output; export options modal opens and closes', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="summary"]').click();
      await expect(page.locator('#view-summary')).toHaveClass(/active/);

      await expect(page.locator('#summary-from')).toBeVisible();
      await expect(page.locator('#summary-to')).toBeVisible();

      await page.locator('#generate-summary-btn').click();
      await expect(page.locator('#summary-output')).toContainText(/./, { timeout: 30_000 });

      await page.locator('#export-options-btn').click();
      const exportModal = page.locator('#export-options-modal');
      await expect(exportModal).toHaveAttribute('aria-hidden', 'false');
      await page.locator('#export-options-done-btn').click();
      await expect(exportModal).toHaveAttribute('aria-hidden', 'true');
    } finally {
      await app.close();
    }
  });

  test('export format select changes value', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="summary"]').click();
      await page.locator('#summary-export-format').selectOption('confluence-markdown');
      await expect(page.locator('#summary-export-format')).toHaveValue('confluence-markdown');
    } finally {
      await app.close();
    }
  });
});
