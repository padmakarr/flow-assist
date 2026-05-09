'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { getMainWindowPage, launchFlowAssist, REPO_ROOT } = require('../helpers/electron-app');
const { snapshotAxTreeViaCdp } = require('../helpers/ax-cdp');

const UI_MAP_DIR = path.join(REPO_ROOT, 'tests', 'ui-map');
const SNAPSHOT_JSON = path.join(UI_MAP_DIR, 'last-snapshot.json');
const SNAPSHOT_TXT = path.join(UI_MAP_DIR, 'last-snapshot.txt');

/** @param {Record<string, unknown>} node */
function pickAxFields(node) {
  const out = {
    role: node.role,
    name: node.name,
  };
  if (node.value) out.value = node.value;
  if (node.description) out.description = node.description;
  if (node.keyshortcuts) out.keyshortcuts = node.keyshortcuts;
  if (node.roledescription) out.roledescription = node.roledescription;
  if (node.checked != null) out.checked = node.checked;
  if (node.disabled != null) out.disabled = node.disabled;
  if (node.expanded != null) out.expanded = node.expanded;
  if (node.pressed != null) out.pressed = node.pressed;
  if (node.children && node.children.length) {
    out.children = node.children.map((ch) => pickAxFields(/** @type {Record<string, unknown>} */ (ch)));
  }
  return out;
}

/** @param {Record<string, unknown>} node */
function formatAxLines(node, depth = 0) {
  const pad = '  '.repeat(depth);
  const label = [node.role, node.name ? JSON.stringify(node.name) : ''].filter(Boolean).join(' ');
  const lines = [pad + label];
  for (const ch of node.children || []) {
    lines.push(...formatAxLines(/** @type {Record<string, unknown>} */ (ch), depth + 1));
  }
  return lines;
}

test.describe('UI mapper (accessibility tree)', () => {
  test('captures main window AX tree to tests/ui-map/', async () => {
    fs.mkdirSync(UI_MAP_DIR, { recursive: true });

    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });

      const snapshot = await snapshotAxTreeViaCdp(page);
      expect(snapshot, 'accessibility snapshot should be present').toBeTruthy();

      const trimmed = pickAxFields(/** @type {Record<string, unknown>} */ (snapshot));
      const meta = {
        generatedAt: new Date().toISOString(),
        url: page.url(),
        title: await page.title(),
      };

      fs.writeFileSync(SNAPSHOT_JSON, JSON.stringify({ meta, axTree: trimmed }, null, 2), 'utf8');

      const txtBody = [
        '# FlowAssist UI map (Chromium accessibility tree)',
        `# Generated: ${meta.generatedAt}`,
        `# URL: ${meta.url}`,
        `# Title: ${meta.title}`,
        '',
        ...formatAxLines(/** @type {Record<string, unknown>} */ (snapshot)),
        '',
      ].join('\n');
      fs.writeFileSync(SNAPSHOT_TXT, txtBody, 'utf8');

      // eslint-disable-next-line no-console
      console.log('\n--- UI map written ---\n', SNAPSHOT_JSON, '\n', SNAPSHOT_TXT, '\n');
    } finally {
      await app.close();
    }
  });
});
