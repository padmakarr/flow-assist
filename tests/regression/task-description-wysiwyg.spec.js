'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded, navigateToListView } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

test.describe('Task description WYSIWYG (expanded card)', () => {
  test('bold formats in editor without markdown markers; persists to view', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'task-desc-wysiwyg-bold');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);
      await expect(page.locator('#view-list')).toHaveClass(/active/);

      const card = page.locator('#task-list .task-card').first();
      await card.locator('.task-bar').click();
      await expect(card).toHaveClass(/expanded/);

      await card.locator('.toggle-desc-edit').click();
      const editor = card.locator('.task-description-wysiwyg');
      await expect(editor).toBeVisible();

      const token = 'WysiwygBoldToken' + Date.now();
      await editor.evaluate(function (el, tok) {
        el.innerHTML = '';
        el.appendChild(document.createTextNode(tok));
        el.focus();
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('bold', false, null);
      }, token);

      await expect(editor).not.toContainText('**');
      await expect(editor.locator('strong, b')).toContainText(token);

      const editorHtml = await editor.innerHTML();
      expect(editorHtml).toMatch(/<\s*(?:b|strong)\b/i);

      await card.locator('.toggle-desc-edit').click();
      const view = card.locator('.task-description-view');
      await expect(view).toBeVisible();
      const viewHtml = await view.innerHTML();
      expect(viewHtml).toContain(token);
      expect(viewHtml).toMatch(/<\s*(?:b|strong)\b/i);
    } finally {
      await app.close();
    }
  });

  test('bullet list in editor round-trips to rendered list in view', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'task-desc-wysiwyg-ul');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').first();
      await card.locator('.task-bar').click();
      await card.locator('.toggle-desc-edit').click();
      const editor = card.locator('.task-description-wysiwyg');
      const row = 'BulletRow' + Date.now();
      await editor.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
      });
      await page.keyboard.type(row);
      await page.keyboard.press('Control+a');
      await card.locator('.task-description-block .rich-fmt-btn[data-rich-cmd="bullet"]').click();

      await expect(editor.locator('ul li')).toContainText(row);
      await expect(editor).not.toContainText('- ');

      await card.locator('.toggle-desc-edit').click();
      await expect(card.locator('.task-description-view ul li')).toContainText(row);
    } finally {
      await app.close();
    }
  });

  test('plain spaces survive save and view', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'task-desc-wysiwyg-space');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').first();
      await card.locator('.task-bar').click();
      await card.locator('.toggle-desc-edit').click();
      const editor = card.locator('.task-description-wysiwyg');
      const phrase = 'one two three ' + Date.now();
      await editor.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
      });
      await page.keyboard.type(phrase);
      await card.locator('.toggle-desc-edit').click();
      const view = card.locator('.task-description-view');
      const viewText = await view.innerText();
      expect(viewText.replace(/\r/g, '')).toMatch(new RegExp('one[ \\t]+two[ \\t]+three'));
    } finally {
      await app.close();
    }
  });

  test('formatting toolbar highlights active styles (bold, lists, code)', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'task-desc-wysiwyg-toolbar');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').first();
      await card.locator('.task-bar').click();
      await card.locator('.toggle-desc-edit').click();
      const editor = card.locator('.task-description-wysiwyg');
      const toolbar = card.locator('.task-description-block .rich-format-toolbar');
      const boldBtn = toolbar.locator('[data-rich-cmd="bold"]');
      const italicBtn = toolbar.locator('[data-rich-cmd="italic"]');
      const underlineBtn = toolbar.locator('[data-rich-cmd="underline"]');
      const ulBtn = toolbar.locator('[data-rich-cmd="bullet"]');
      const olBtn = toolbar.locator('[data-rich-cmd="numlist"]');
      const codeBtn = toolbar.locator('[data-rich-cmd="code"]');
      const codeBlockBtn = toolbar.locator('[data-rich-cmd="codeblock"]');

      await expect(boldBtn).toHaveAttribute('aria-pressed', 'false');

      await editor.evaluate(function (el) {
        el.innerHTML = '<strong>boldbit</strong>plain';
        el.focus();
        var strong = el.querySelector('strong');
        var t = strong.firstChild;
        var range = document.createRange();
        range.setStart(t, 1);
        range.setEnd(t, 3);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      await expect(boldBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(boldBtn).toHaveClass(/is-active/);

      await editor.evaluate(function (el) {
        el.focus();
        var tail = el.childNodes[el.childNodes.length - 1];
        var range = document.createRange();
        range.setStart(tail, 2);
        range.collapse(true);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      await expect(boldBtn).toHaveAttribute('aria-pressed', 'false');

      await editor.evaluate(function (el) {
        el.innerHTML = '<em>it</em>';
        el.focus();
        var em = el.querySelector('em').firstChild;
        var range = document.createRange();
        range.selectNodeContents(em);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      await expect(italicBtn).toHaveAttribute('aria-pressed', 'true');

      await editor.evaluate(function (el) {
        el.innerHTML = '<u>un</u>';
        el.focus();
        var u = el.querySelector('u').firstChild;
        var range = document.createRange();
        range.selectNodeContents(u);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      await expect(underlineBtn).toHaveAttribute('aria-pressed', 'true');

      await editor.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
      });
      await page.keyboard.type('ListLine');
      await page.keyboard.press('Control+a');
      await ulBtn.click();
      await expect(ulBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(olBtn).toHaveAttribute('aria-pressed', 'false');

      await editor.evaluate(function (el) {
        el.innerHTML = '<ol><li>num</li></ol>';
        el.focus();
        var li = el.querySelector('li').firstChild;
        var range = document.createRange();
        range.setStart(li, 0);
        range.setEnd(li, 1);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      await expect(olBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(ulBtn).toHaveAttribute('aria-pressed', 'false');

      await editor.evaluate(function (el) {
        el.innerHTML = '<code class="rich-code">x</code>';
        el.focus();
        var t = el.querySelector('code').firstChild;
        var range = document.createRange();
        range.selectNodeContents(t);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      await expect(codeBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(codeBlockBtn).toHaveAttribute('aria-pressed', 'false');

      await editor.evaluate(function (el) {
        el.innerHTML = '<pre class="rich-code-block"><code>block</code></pre>';
        el.focus();
        var t = el.querySelector('pre code').firstChild;
        var range = document.createRange();
        range.setStart(t, 1);
        range.collapse(true);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      await expect(codeBlockBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(codeBtn).toHaveAttribute('aria-pressed', 'false');

      await editor.evaluate(function (el) {
        el.innerHTML = 'plainword';
        el.focus();
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      await boldBtn.click();
      await expect(boldBtn).toHaveAttribute('aria-pressed', 'true');

      await card.locator('.toggle-desc-edit').click();
      await expect(boldBtn).toHaveAttribute('aria-pressed', 'false');
    } finally {
      await app.close();
    }
  });
});
