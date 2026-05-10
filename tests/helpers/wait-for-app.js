'use strict';

const { expect } = require('@playwright/test');

/** Wait until renderer has applied profile (title comes from `updateDocumentTitleFromPath`). */
async function waitForProfileLoaded(page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveTitle(/FlowAssist|\.fa\.json/i, { timeout: 45000 });
}

/**
 * Open List view. Restores the sidebar when a profile left it hidden (nav lives in `.sidebar`).
 */
async function navigateToListView(page) {
  const hidden = await page.evaluate(function () {
    return document.body.classList.contains('sidebar-mode-hidden');
  });
  if (hidden) {
    const toggle = page.locator('#top-bar-sidebar-toggle');
    await expect(toggle).toBeVisible({ timeout: 15_000 });
    await toggle.click({ force: true });
    await expect(page.locator('body')).not.toHaveClass(/sidebar-mode-hidden/, { timeout: 10_000 });
  }
  const listBtn = page.locator('.nav-btn[data-view="list"]');
  await expect(listBtn).toBeVisible({ timeout: 20_000 });
  await listBtn.evaluate(function (el) {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    el.click();
  });
}

module.exports = { waitForProfileLoaded, navigateToListView };
