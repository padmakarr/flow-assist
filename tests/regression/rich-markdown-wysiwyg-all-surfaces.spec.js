'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded, navigateToListView } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

test.describe('Rich WYSIWYG on all formatted fields', () => {
  test('add-task description: bold round-trip on new task card', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-add-task');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('#add-new-task-btn').click();
      const title = 'RichAddTask ' + Date.now();
      await page.locator('#task-title').fill(title);
      const desc = page.locator('#task-description');
      await expect(desc).toBeVisible();
      await desc.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
        el.appendChild(document.createTextNode('BoldLine'));
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('bold', false, null);
      });
      await page.locator('#add-task-btn').click();
      await expect(page.locator('#task-list').getByText(title, { exact: true })).toBeVisible({ timeout: 15_000 });
      const newCard = page.locator('#task-list .task-card').filter({ hasText: title }).first();
      await newCard.locator('.task-bar').click();
      await expect(newCard.locator('.task-description-view strong, .task-description-view b')).toContainText('BoldLine');
    } finally {
      await app.close();
    }
  });

  test('subtask description: spaces preserved after save', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-sub-desc');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const sub = card.locator('.subtask-card').first();
      await sub.locator('.subtask-bar').click();
      await sub.locator('.toggle-subtask-desc-edit').click();
      const editor = sub.locator('.subtask-desc-edit.rich-markdown-wysiwyg');
      const phrase = 'sub one two ' + Date.now();
      await editor.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
      });
      await page.keyboard.type(phrase);
      await sub.locator('.toggle-subtask-desc-edit').click();
      const view = sub.locator('.subtask-description-block .task-description-view');
      const text = await view.innerText();
      expect(text.replace(/\r/g, '')).toMatch(/sub[ \t]+one[ \t]+two/);
    } finally {
      await app.close();
    }
  });

  test('new subtask form description: toolbar bold active', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-new-sub');
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
      const editor = block.locator('.new-subtask-desc-in.rich-markdown-wysiwyg');
      const boldBtn = block.locator('.rich-fmt-btn[data-rich-cmd="bold"]');
      await editor.evaluate(function (el) {
        el.innerHTML = '<strong>x</strong>';
        el.focus();
        var t = el.querySelector('strong').firstChild;
        var range = document.createRange();
        range.selectNodeContents(t);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      await expect(boldBtn).toHaveAttribute('aria-pressed', 'true');
    } finally {
      await app.close();
    }
  });

  test('task progress add: bold persists in progress row view', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-add');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      await progIn.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
        el.appendChild(document.createTextNode('ProgBold'));
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('bold', false, null);
      });
      await card.locator('.add-progress-btn').click();
      const rowText = card.locator('.task-progress-block .progress-list .progress-text').first();
      await expect(rowText).toContainText('ProgBold');
      const html = await rowText.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
    } finally {
      await app.close();
    }
  });

  test('task concern log: description with bold saves', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-concern');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      await card.locator('.btn-add-concern-toggle').click();
      const block = card.locator('.task-concerns-block');
      await expect(block).toBeVisible();
      const descIn = block.locator('.concern-desc-in.rich-markdown-wysiwyg');
      await descIn.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
        el.appendChild(document.createTextNode('RiskNote'));
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('bold', false, null);
      });
      await block.locator('.log-concern-btn').click();
      await expect(block.locator('.concern-description strong, .concern-description b').first()).toContainText('RiskNote');
    } finally {
      await app.close();
    }
  });

  test('progress inline edit: save updates view', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-edit');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      await progIn.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
        el.textContent = 'FirstNote';
      });
      await card.locator('.add-progress-btn').click();
      const li = card.locator('.task-progress-block .progress-list .progress-item').first();
      await li.locator('.btn-edit-progress').click();
      const editEl = li.locator('.progress-edit-text.rich-markdown-wysiwyg');
      await editEl.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
        el.appendChild(document.createTextNode('Edited'));
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('bold', false, null);
      });
      await li.locator('.progress-save-btn').click();
      await expect(li.locator('.progress-text strong, .progress-text b')).toContainText('Edited');
    } finally {
      await app.close();
    }
  });

  test('task progress field: placeholder copy and visible hint for br-only empty', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-placeholder');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      await expect(progIn).toHaveAttribute('data-placeholder', 'Progress here…');
      await progIn.evaluate(function (el) {
        el.innerHTML = '<br>';
      });
      const beforeContent = await progIn.evaluate(function (el) {
        return window.getComputedStyle(el, '::before').getPropertyValue('content');
      });
      expect(String(beforeContent)).toMatch(/Progress here/i);
      expect(String(beforeContent)).not.toBe('none');
    } finally {
      await app.close();
    }
  });

  test('task progress add: toolbar bold then real click stores HTML view not raw ** markers', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-toolbar');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      const boldBtn = card.locator('.task-progress-block .rich-fmt-btn[data-rich-cmd="bold"]');
      await progIn.click();
      await boldBtn.click();
      const token = 'Tb_' + Date.now();
      await page.keyboard.type(token);
      await card.locator('.add-progress-btn').click();
      const rowText = card.locator('.task-progress-block .progress-list .progress-text').first();
      await expect(rowText).toContainText(token);
      const html = await rowText.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).not.toContain('**' + token);
      expect(html).not.toContain(token + '**');
    } finally {
      await app.close();
    }
  });

  test('task progress add: typed markdown **token** renders as bold in row (not literal stars)', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-typed-md');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      const token = 'MdTok_' + Date.now();
      await progIn.evaluate(function (el, mid) {
        el.innerHTML = '';
        el.focus();
        el.appendChild(document.createTextNode('**' + mid + '**'));
      }, token);
      await card.locator('.add-progress-btn').click();
      const rowText = card.locator('.task-progress-block .progress-list .progress-text').first();
      const html = await rowText.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).toContain(token);
      expect(html).not.toContain('**' + token);
    } finally {
      await app.close();
    }
  });

  test('subtask progress add: bold via execCommand survives add button focus (row is rich HTML)', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-sub-prog-bold');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const sub = card.locator('.subtask-card').first();
      await sub.locator('.subtask-bar').click();
      const progIn = sub.locator('.subtask-progress-text.rich-markdown-wysiwyg');
      await expect(progIn).toHaveAttribute('data-placeholder', 'Progress here…');
      await progIn.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
        el.appendChild(document.createTextNode('SubProgBold'));
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('bold', false, null);
      });
      await sub.locator('.add-subtask-progress-btn').click();
      const rowText = sub.locator('.subtask-progress-list .progress-text').first();
      await expect(rowText).toContainText('SubProgBold');
      const html = await rowText.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).not.toMatch(/\*\*SubProgBold/);
    } finally {
      await app.close();
    }
  });

  test('task progress add: repeated bold adds stay rich (stress)', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-stress');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      const addBtn = card.locator('.add-progress-btn');
      for (let i = 0; i < 3; i++) {
        const token = 'Stress_' + i + '_' + Date.now();
        await progIn.evaluate(function (el, label) {
          el.innerHTML = '';
          el.focus();
          el.appendChild(document.createTextNode(label));
          var range = document.createRange();
          range.selectNodeContents(el);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('bold', false, null);
        }, token);
        await addBtn.click();
        const rowText = card.locator('.task-progress-block .progress-list .progress-text').filter({ hasText: token }).first();
        await expect(rowText).toBeVisible();
        const html = await rowText.innerHTML();
        expect(html).toMatch(/<\s*(?:b|strong)\b/i);
        expect(html).not.toContain('**' + token);
      }
    } finally {
      await app.close();
    }
  });

  test('task progress: nested bold+italic DOM round-trips to rich row (no visible **)', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-nested-bi');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);
      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      await progIn.evaluate(function (el) {
        el.innerHTML = '<strong>out<em>mid</em>out2</strong>';
        el.focus();
      });
      await card.locator('.add-progress-btn').click();
      const rowText = card.locator('.task-progress-block .progress-list .progress-text').first();
      await expect(rowText).toContainText('outmidout2');
      const html = await rowText.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).toMatch(/<\s*(?:i|em)\b/i);
      expect(html).not.toMatch(/\*\*out/);
      expect(html).not.toContain('*mid*');
    } finally {
      await app.close();
    }
  });

  test('task progress: plain **Seg*It*Seg** markdown renders nested styles in row', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-md-nested');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);
      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      await progIn.evaluate(function (el) {
        el.innerHTML = '';
        el.appendChild(document.createTextNode('**Seg*It*Seg**'));
      });
      await card.locator('.add-progress-btn').click();
      const rowText = card.locator('.task-progress-block .progress-list .progress-text').first();
      const html = await rowText.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).toMatch(/<\s*(?:i|em)\b/i);
      expect(html).toContain('Seg');
      expect(html).toContain('It');
      expect(html).not.toMatch(/\*\*Seg/);
    } finally {
      await app.close();
    }
  });

  test('task progress: ***triple*** plain text renders bold+italic', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-triple');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);
      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      await progIn.evaluate(function (el) {
        el.innerHTML = '';
        el.appendChild(document.createTextNode('***TriWord***'));
      });
      await card.locator('.add-progress-btn').click();
      const rowText = card.locator('.task-progress-block .progress-list .progress-text').first();
      const html = await rowText.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).toMatch(/<\s*(?:i|em)\b/i);
      expect(html).toContain('TriWord');
      expect(html).not.toContain('***');
    } finally {
      await app.close();
    }
  });

  test('task progress: bold wrapping underline DOM (**++u++** path)', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-bold-u');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);
      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      await progIn.evaluate(function (el) {
        el.innerHTML = '<strong><u>UnLn</u></strong>';
        el.focus();
      });
      await card.locator('.add-progress-btn').click();
      const rowText = card.locator('.task-progress-block .progress-list .progress-text').first();
      await expect(rowText).toContainText('UnLn');
      const html = await rowText.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).toMatch(/<\s*u\b/i);
      expect(html).not.toMatch(/\*\*\+\+/);
    } finally {
      await app.close();
    }
  });

  test('task progress: list item with bold serializes and displays as rich list', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-ul-bold');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);
      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      await progIn.evaluate(function (el) {
        el.innerHTML = '<ul><li><strong>ListBold</strong></li></ul>';
        el.focus();
      });
      await card.locator('.add-progress-btn').click();
      const rowText = card.locator('.task-progress-block .progress-list .progress-text').first();
      await expect(rowText).toContainText('ListBold');
      const html = await rowText.innerHTML();
      expect(html).toMatch(/rich-ul|rich-li|<\s*ul\b/i);
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).not.toMatch(/\*\*ListBold\*\*/);
    } finally {
      await app.close();
    }
  });

  test('task progress: toolbar bold then italic on selection (execCommand combo)', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'rich-wysiwyg-prog-toolbar-bi');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);
      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      const boldBtn = card.locator('.task-progress-block .rich-fmt-btn[data-rich-cmd="bold"]');
      const italBtn = card.locator('.task-progress-block .rich-fmt-btn[data-rich-cmd="italic"]');
      await progIn.click();
      const token = 'Combo_' + Date.now();
      await page.keyboard.type(token);
      await progIn.evaluate(function (el) {
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      await boldBtn.click();
      await italBtn.click();
      await card.locator('.add-progress-btn').click();
      const rowText = card.locator('.task-progress-block .progress-list .progress-text').filter({ hasText: token }).first();
      await expect(rowText).toBeVisible();
      const html = await rowText.innerHTML();
      expect(html).toMatch(/<\s*(?:b|strong)\b/i);
      expect(html).toMatch(/<\s*(?:i|em)\b/i);
      expect(html).not.toMatch(new RegExp('\\*\\*' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    } finally {
      await app.close();
    }
  });
});
