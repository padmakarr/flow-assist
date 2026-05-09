'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

test.describe('List view — add task', () => {
  test('happy path: add task with title appears in list', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'add-task');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const before = await page.locator('#task-list .task-card').count();

      await page.locator('#add-new-task-btn').click();
      await page.locator('#task-title').fill('E2E Playwright task ' + Date.now());
      await page.locator('#add-task-btn').click();

      await expect(page.locator('#task-list .task-card')).toHaveCount(before + 1, { timeout: 15_000 });
      await expect(page.locator('#task-list').getByText(/E2E Playwright task/i).first()).toBeVisible();
    } finally {
      await app.close();
    }
  });

  test('edge: empty title does not add a task', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const before = await page.locator('#task-list .task-card').count();
      await page.locator('#add-new-task-btn').click();
      await page.locator('#task-title').fill('');
      await page.locator('#add-task-btn').click();
      await expect(page.locator('#task-list .task-card')).toHaveCount(before, { timeout: 3000 });
    } finally {
      await app.close();
    }
  });
});
