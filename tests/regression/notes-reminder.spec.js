'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

async function openFreshNoteModal(page) {
  await page.locator('.nav-btn[data-view="notes"]').click();
  await page.locator('#notes-add-note-btn').click();
  await expect(page.locator('#notes-board .notes-card').first()).toBeVisible({ timeout: 10_000 });
  await page.locator('#notes-board .notes-card').first().locator('.notes-card-head-inner').click();
  await expect(page.locator('#notes-modal')).toHaveAttribute('aria-hidden', 'false');
}

async function openFreshTodoModal(page) {
  await page.locator('.nav-btn[data-view="notes"]').click();
  await page.locator('#notes-add-todo-btn').click();
  await expect(page.locator('#notes-board .notes-card--todo').first()).toBeVisible({ timeout: 10_000 });
  await page.locator('#notes-board .notes-card--todo').first().locator('.notes-card-head-inner').click();
  await expect(page.locator('#notes-modal')).toHaveAttribute('aria-hidden', 'false');
}

async function assertModalReminderCompactEmpty(page) {
  await expect(page.locator('#notes-modal .notes-reminder-section-title')).toHaveCount(0);
  await expect(page.locator('#notes-modal .notes-reminder-hint')).toHaveCount(0);
  await expect(page.locator('#notes-modal .notes-card-reminders--modal-empty')).toBeVisible();
  await expect(page.locator('#notes-modal .notes-reminder-dropdown-toggle')).toHaveText('Add reminder');
}

test.describe('Notes reminder UI', () => {
  test('focused modal has compact reminder chrome before any reminder is set', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-reminder-empty-ui');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openFreshNoteModal(page);
      await assertModalReminderCompactEmpty(page);
      await expect(page.getByText('One schedule per note')).toHaveCount(0);
    } finally {
      await app.close();
    }
  });

  test('1 min preset saves a scheduled reminder row', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-reminder-1m');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openFreshNoteModal(page);

      await page.locator('#notes-modal .notes-reminder-dropdown-toggle').click();
      await expect(page.locator('#notes-modal .notes-reminder-dropdown')).toBeVisible();

      await page.locator('#notes-modal .notes-reminder-preset[data-min="1"]').click();
      await page.locator('#notes-modal .notes-reminder-save-btn').click();

      await expect(page.locator('#notes-modal .notes-reminder-section-title')).toBeVisible();
      await expect(page.locator('#notes-modal .notes-reminder-section-title')).toHaveText('Reminder');
      await expect(page.locator('#notes-modal .notes-card-reminders--modal-empty')).toHaveCount(0);
      await expect(page.locator('#notes-modal .notes-reminder-when')).toBeVisible();
      await expect(page.locator('#notes-modal .notes-reminder-when')).not.toHaveText('');
      await expect(page.locator('#notes-modal .notes-reminder-dropdown')).toBeHidden();
      await expect(page.locator('#notes-modal .notes-reminder-dropdown-toggle')).toHaveText('Change reminder');
    } finally {
      await app.close();
    }
  });

  test('datetime ~1 minute ahead saves scheduled row', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-reminder-dt');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openFreshNoteModal(page);

      await page.locator('#notes-modal .notes-reminder-dropdown-toggle').click();
      await expect(page.locator('#notes-modal .notes-reminder-dropdown')).toBeVisible();

      const abs = page.locator('#notes-modal .notes-reminder-mode[value="absolute"]');
      await abs.check();
      await expect(page.locator('#notes-modal .notes-reminder-abs')).toBeVisible();

      const localValue = await page.evaluate(() => {
        const d = new Date(Date.now() + 70_000);
        const pad = function (n) {
          return n < 10 ? '0' + n : String(n);
        };
        return (
          d.getFullYear() +
          '-' +
          pad(d.getMonth() + 1) +
          '-' +
          pad(d.getDate()) +
          'T' +
          pad(d.getHours()) +
          ':' +
          pad(d.getMinutes())
        );
      });
      await page.locator('#notes-modal .notes-reminder-datetime').fill(localValue);
      await page.locator('#notes-modal .notes-reminder-save-btn').click();

      await expect(page.locator('#notes-modal .notes-reminder-section-title')).toBeVisible();
      await expect(page.locator('#notes-modal .notes-reminder-when')).toBeVisible();
      await expect(page.locator('#notes-modal .notes-reminder-when')).not.toHaveText('');
    } finally {
      await app.close();
    }
  });

  test('remove reminder restores compact modal reminder chrome', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-reminder-remove');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openFreshNoteModal(page);

      await page.locator('#notes-modal .notes-reminder-dropdown-toggle').click();
      await page.locator('#notes-modal .notes-reminder-preset[data-min="1"]').click();
      await page.locator('#notes-modal .notes-reminder-save-btn').click();
      await expect(page.locator('#notes-modal .notes-reminder-when')).toBeVisible();

      await page.locator('#notes-modal .notes-reminder-remove').click();
      await assertModalReminderCompactEmpty(page);
    } finally {
      await app.close();
    }
  });

  test('todo list focused modal matches compact empty state and reminder flow', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-reminder-todo');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openFreshTodoModal(page);
      await assertModalReminderCompactEmpty(page);

      await page.locator('#notes-modal .notes-reminder-dropdown-toggle').click();
      await expect(page.locator('#notes-modal .notes-reminder-dropdown')).toBeVisible();
      await page.locator('#notes-modal .notes-reminder-preset[data-min="5"]').click();
      await page.locator('#notes-modal .notes-reminder-save-btn').click();

      await expect(page.locator('#notes-modal .notes-reminder-section-title')).toHaveText('Reminder');
      await expect(page.locator('#notes-modal .notes-reminder-when')).toBeVisible();
      await expect(page.locator('#notes-modal .notes-card-reminders--modal-empty')).toHaveCount(0);
    } finally {
      await app.close();
    }
  });
});
