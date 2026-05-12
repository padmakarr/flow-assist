'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

test.describe('Notes persistence', () => {
  test('modal note body survives close (rich editor)', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-persist-note');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="notes"]').click();

      await page.locator('#notes-add-note-btn').click();
      await expect(page.locator('#notes-board .notes-card').first()).toBeVisible({ timeout: 10_000 });

      await page.locator('#notes-board .notes-card').first().locator('.notes-card-head-inner').click();
      await expect(page.locator('#notes-modal')).toHaveAttribute('aria-hidden', 'false');

      const bodyEd = page.locator('#notes-modal .notes-card-body.rich-markdown-wysiwyg');
      await expect(bodyEd).toBeVisible();
      await bodyEd.click();
      const marker = 'E2E_NOTE_BODY_' + Date.now();
      await bodyEd.evaluate((el, m) => {
        el.focus();
        el.textContent = m;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, marker);

      await page.keyboard.press('Escape');
      await expect(page.locator('#notes-modal')).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 });

      await expect(page.locator('#notes-board').getByText(marker, { exact: true })).toBeVisible({ timeout: 5000 });
    } finally {
      await app.close();
    }
  });

  test('todo checklist text in modal survives a few seconds', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-persist-todo');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="notes"]').click();

      await page.locator('#notes-add-todo-btn').click();
      const head = page.locator('#notes-board .notes-card').first().locator('.notes-card-head-inner');
      await expect(head).toBeVisible({ timeout: 10_000 });
      await head.click();
      await expect(page.locator('#notes-modal')).toHaveAttribute('aria-hidden', 'false');

      const txt = page.locator('#notes-modal .notes-todo-text.rich-markdown-wysiwyg').first();
      await expect(txt).toBeVisible({ timeout: 10_000 });
      const marker = 'E2E_TODO_' + Date.now();
      await txt.evaluate((el, m) => {
        el.focus();
        el.textContent = m;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, marker);

      await page.waitForTimeout(3200);

      await expect(txt).toContainText(marker, { timeout: 3000 });
    } finally {
      await app.close();
    }
  });
});
