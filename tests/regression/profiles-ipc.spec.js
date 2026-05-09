'use strict';

const path = require('path');
const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, REPO_ROOT } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Profile activation (IPC)', () => {
  test('profileActivateFromPath switches data and returns to golden fixture', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const altPath = path.join(REPO_ROOT, 'tests', 'fixtures', 'alt-empty.fa.json');
      const res = await page.evaluate(async (p) => {
        return window.taskAPI.profileActivateFromPath(p);
      }, altPath);
      expect(res && res.success).toBeTruthy();
      expect(Array.isArray(res.data.tasks) ? res.data.tasks.length : -1).toBe(0);

      await page.reload();
      await waitForProfileLoaded(page);
      await expect(page.locator('#task-list .task-card')).toHaveCount(0, { timeout: 15_000 });

      const goldenPath = path.join(REPO_ROOT, 'tests', 'fixtures', 'padmakarr-testing-2.fa.json');
      const res2 = await page.evaluate(async (p) => {
        return window.taskAPI.profileActivateFromPath(p);
      }, goldenPath);
      expect(res2 && res2.success).toBeTruthy();
      expect((res2.data.tasks || []).length).toBeGreaterThan(0);

      await page.reload();
      await waitForProfileLoaded(page);
      await expect(page.locator('#task-list .task-card').first()).toBeVisible({ timeout: 15_000 });
    } finally {
      await app.close();
    }
  });
});
