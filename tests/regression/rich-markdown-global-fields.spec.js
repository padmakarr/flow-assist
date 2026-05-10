'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded, navigateToListView } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

/** Mega parent lists many sub-tasks; the new one may be off the first viewport page. */
async function locateSubtaskCardByTitle(card, title) {
  const size = card.locator('.subtask-viewport-page-size');
  if (await size.count()) {
    await size.selectOption('15');
  }
  const next = card.locator('.subtask-viewport-next');
  for (let i = 0; i < 12; i++) {
    const hit = card.locator('.subtask-list .subtask-card').filter({ hasText: title });
    if (await hit.count()) return hit.first();
    if (!(await next.count()) || (await next.isDisabled())) break;
    await next.click();
  }
  return card.locator('.subtask-list .subtask-card').filter({ hasText: title }).first();
}

async function expandSubtaskRow(sub) {
  await sub.scrollIntoViewIfNeeded();
  await sub.locator('.subtask-bar').click({ force: true });
}

/**
 * Snapshot-on-submit + balanced ** markdown apply to every rich field.
 * Nested bold+italic must not surface as literal ** in saved views.
 */
test.describe('Rich markdown across all WYSIWYG fields', () => {
  test('expanded task description: nested bold+italic toggles to view without **', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-global-task-desc');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);
      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      await card.locator('.toggle-desc-edit').click();
      const editor = card.locator('.task-description-wysiwyg');
      await editor.evaluate(function (el) {
        el.innerHTML = '<strong>Da<em>Db</em>Dc</strong>';
        el.focus();
      });
      await card.locator('.toggle-desc-edit').click();
      const view = card.locator('.task-description-view');
      const html = await view.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).toMatch(/<\s*(?:i|em)\b/i);
      expect(html).not.toMatch(/\*\*Da/);
    } finally {
      await app.close();
    }
  });

  test('add-task strip: nested bold+italic in #task-description survives Add Task', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-global-add-strip');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('#add-new-task-btn').click();
      const title = 'RichStrip ' + Date.now();
      await page.locator('#task-title').fill(title);
      const desc = page.locator('#task-description');
      await desc.evaluate(function (el) {
        el.innerHTML = '<strong>Strip<em>Mid</em>End</strong>';
        el.focus();
      });
      await page.locator('#add-task-btn').click();
      await expect(page.locator('#task-list').getByText(title, { exact: true })).toBeVisible({ timeout: 15_000 });
      const card = page.locator('#task-list .task-card').filter({ hasText: title }).first();
      await card.locator('.task-bar').click();
      const view = card.locator('.task-description-view');
      const html = await view.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).toMatch(/<\s*(?:i|em)\b/i);
      expect(html).not.toMatch(/\*\*Strip/);
    } finally {
      await app.close();
    }
  });

  test('new subtask form: nested bold+italic in description on Add Sub-task', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-global-new-sub');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);
      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      await card.locator('.btn-new-subtask').click();
      const block = card.locator('.new-subtask-block');
      await expect(block).toBeVisible();
      const stTitle = 'SubRich ' + Date.now();
      await block.locator('.new-subtask-title-in').fill(stTitle);
      const descIn = block.locator('.new-subtask-desc-in.rich-markdown-wysiwyg');
      await descIn.evaluate(function (el) {
        el.innerHTML = '<strong>Sa<em>Sb</em>Sc</strong>';
        el.focus();
      });
      await block.locator('.add-subtask-submit-btn').click();
      const sub = await locateSubtaskCardByTitle(card, stTitle);
      await expect(sub).toBeVisible({ timeout: 15_000 });
      await expandSubtaskRow(sub);
      const view = sub.locator('.subtask-description-block .task-description-view');
      const html = await view.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).toMatch(/<\s*(?:i|em)\b/i);
      expect(html).not.toMatch(/\*\*Sa/);
    } finally {
      await app.close();
    }
  });

  test('task concern: nested bold+italic in concern body on Log Concern', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-global-concern-task');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);
      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      await card.locator('.btn-add-concern-toggle').click();
      const concerns = card.locator('.task-concerns-block');
      await expect(concerns).toBeVisible();
      const descIn = concerns.locator('.concern-desc-in.rich-markdown-wysiwyg');
      await descIn.evaluate(function (el) {
        el.innerHTML = '<strong>Ca<em>Cb</em>Cc</strong>';
        el.focus();
      });
      await concerns.locator('.log-concern-btn').click();
      const row = concerns.locator('.concern-item .concern-description').last();
      await expect(row).toBeVisible({ timeout: 10_000 });
      const html = await row.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).toMatch(/<\s*(?:i|em)\b/i);
      expect(html).not.toMatch(/\*\*Ca/);
    } finally {
      await app.close();
    }
  });

  test('matrix: plain **X*Y*X** in each surface renders em inside strong', async () => {
    const md = '**Mx*My*Mz**';
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-global-md-matrix');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();

      await card.locator('.toggle-desc-edit').click();
      const taskDescEd = card.locator('.task-description-wysiwyg');
      await taskDescEd.evaluate(function (el, s) {
        el.innerHTML = '';
        el.appendChild(document.createTextNode(s));
      }, md);
      await card.locator('.toggle-desc-edit').click();
      let html = await card.locator('.task-description-view').innerHTML();
      expect(html, 'task desc').toMatch(/<\s*(?:b|strong)\b/i);
      expect(html, 'task desc').toMatch(/<\s*(?:i|em)\b/i);

      await card.locator('.btn-new-subtask').click();
      const block = card.locator('.new-subtask-block');
      const subTitle = 'MxTitle ' + Date.now();
      await block.locator('.new-subtask-title-in').fill(subTitle);
      await block.locator('.new-subtask-desc-in').evaluate(function (el, s) {
        el.innerHTML = '';
        el.appendChild(document.createTextNode(s));
      }, md);
      await block.locator('.add-subtask-submit-btn').click();

      const sub = await locateSubtaskCardByTitle(card, subTitle);
      await expect(sub).toBeVisible({ timeout: 15_000 });
      await expandSubtaskRow(sub);
      html = await sub.locator('.subtask-description-block .task-description-view').innerHTML();
      expect(html, 'new sub desc').toMatch(/<\s*(?:b|strong)\b/i);
      expect(html, 'new sub desc').toMatch(/<\s*(?:i|em)\b/i);

      const progIn = card.locator('> .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      await progIn.evaluate(function (el, s) {
        el.innerHTML = '';
        el.appendChild(document.createTextNode(s));
      }, md);
      await card.locator('.add-progress-btn').click();
      html = await card.locator('.task-progress-block .progress-list .progress-text').last().innerHTML();
      expect(html, 'progress').toMatch(/<\s*(?:b|strong)\b/i);
      expect(html, 'progress').toMatch(/<\s*(?:i|em)\b/i);
    } finally {
      await app.close();
    }
  });
});
