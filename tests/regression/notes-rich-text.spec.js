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

test.describe('Notes rich text', () => {
  test('note modal shows formatting toolbar directly above body editor', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-rich-toolbar');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openFreshNoteModal(page);
      const wrap = page.locator('#notes-modal .notes-note-body-wrap');
      await expect(wrap).toBeVisible();
      const toolbar = wrap.locator('.rich-format-toolbar');
      const editor = wrap.locator('.notes-card-body.rich-markdown-wysiwyg');
      await expect(toolbar).toBeVisible();
      await expect(editor).toBeVisible();
      const tbBox = await toolbar.boundingBox();
      const edBox = await editor.boundingBox();
      expect(tbBox && edBox).toBeTruthy();
      expect(tbBox.y).toBeLessThan(edBox.y);
    } finally {
      await app.close();
    }
  });

  test('bold via toolbar survives modal close and reopen', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-rich-bold');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openFreshNoteModal(page);
      const ed = page.locator('#notes-modal .notes-card-body.rich-markdown-wysiwyg');
      await ed.click();
      await page.keyboard.type('RichHello');
      await ed.evaluate(function (el) {
        var r = document.createRange();
        r.selectNodeContents(el);
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
      });
      await page.locator('#notes-modal .notes-note-body-wrap .rich-fmt-btn[data-rich-cmd="bold"]').click();
      await expect(ed.locator('strong, b')).toHaveCount(1);

      await page.keyboard.press('Escape');
      await expect(page.locator('#notes-modal')).toHaveAttribute('aria-hidden', 'true');

      await page.locator('#notes-board .notes-card').first().locator('.notes-card-head-inner').click();
      await expect(page.locator('#notes-modal')).toHaveAttribute('aria-hidden', 'false');
      await expect(page.locator('#notes-modal .notes-card-body.rich-markdown-wysiwyg strong, #notes-modal .notes-card-body.rich-markdown-wysiwyg b')).toHaveCount(1);
    } finally {
      await app.close();
    }
  });

  test('todo modal has no per-item formatting toolbar; bold via execCommand round-trip', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-rich-todo');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="notes"]').click();
      await page.locator('#notes-add-todo-btn').click();
      await expect(page.locator('#notes-board .notes-card--todo').first()).toBeVisible({ timeout: 10_000 });
      await page.locator('#notes-board .notes-card--todo').first().locator('.notes-card-head-inner').click();
      await expect(page.locator('#notes-modal')).toHaveAttribute('aria-hidden', 'false');

      const wrap = page.locator('#notes-modal .notes-todo-rich-wrap').first();
      await expect(wrap.locator('.rich-format-toolbar')).toHaveCount(0);
      const editor = wrap.locator('.notes-todo-text.rich-markdown-wysiwyg');
      await editor.click();
      await page.keyboard.type('TodoBold');
      await editor.evaluate(function (el) {
        var r = document.createRange();
        r.selectNodeContents(el);
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        document.execCommand('bold', false, null);
      });
      await expect(editor.locator('strong, b')).toHaveCount(1);
    } finally {
      await app.close();
    }
  });

  test('todo checklist remove item deletes one row and keeps one item', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-todo-delete-item');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="notes"]').click();
      await page.locator('#notes-add-todo-btn').click();
      await expect(page.locator('#notes-board .notes-card--todo').first()).toBeVisible({ timeout: 10_000 });
      await page.locator('#notes-board .notes-card--todo').first().locator('.notes-card-head-inner').click();
      await expect(page.locator('#notes-modal')).toHaveAttribute('aria-hidden', 'false');
      await page.locator('#notes-modal .notes-checklist-add').click();
      await expect(page.locator('#notes-modal .notes-checklist-item')).toHaveCount(2);
      await page.locator('#notes-modal .notes-checklist-item').last().locator('.notes-checklist-item-delete').click();
      await expect(page.locator('#notes-modal .notes-checklist-item')).toHaveCount(1);
    } finally {
      await app.close();
    }
  });

  test('grid note card is preview-only without formatting toolbar; modal has toolbar when opened', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'notes-rich-grid-preview');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="notes"]').click();
      await page.locator('#notes-add-note-btn').click();
      await expect(page.locator('#notes-board .notes-card').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('#notes-board .notes-note-body-wrap')).toHaveCount(0);
      await page.locator('#notes-board .notes-card').first().locator('.notes-card-head-inner').click();
      await expect(page.locator('#notes-modal .notes-note-body-wrap .rich-format-toolbar')).toBeVisible();
    } finally {
      await app.close();
    }
  });
});
