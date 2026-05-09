'use strict';

const { expect } = require('@playwright/test');

/** Wait until renderer has applied profile (title comes from `updateDocumentTitleFromPath`). */
async function waitForProfileLoaded(page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveTitle(/FlowAssist|\.fa\.json/i, { timeout: 45000 });
}

module.exports = { waitForProfileLoaded };
