'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('List view — tabs and sort', () => {
  test('list filter tabs switch without error', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('.list-view-tab[data-list-filter="today"]').click();
      await expect(page.locator('#view-list')).toHaveClass(/active/);

      await page.locator('.list-view-tab[data-list-filter="archive"]').click();
      await page.locator('.list-view-tab[data-list-filter="all"]').click();
      await expect(page.locator('.list-view-tab[data-list-filter="all"]')).toHaveClass(/active/);
    } finally {
      await app.close();
    }
  });

  test('sort menu opens and closes; selecting an option closes menu', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const wrap = page.locator('.main-task-filter-wrap');
      await page.locator('#main-task-filter-btn').click();
      await expect(wrap).toHaveClass(/open/);

      const firstOpt = wrap.locator('#main-task-filter-menu .filter-option').first();
      await firstOpt.click();
      await expect(wrap).not.toHaveClass(/open/);
    } finally {
      await app.close();
    }
  });

  test('completed task section lists Done area', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await expect(page.locator('section.completed-tasks-section')).toBeVisible();
      await expect(page.locator('#completed-task-list')).toBeAttached();
    } finally {
      await app.close();
    }
  });
});
