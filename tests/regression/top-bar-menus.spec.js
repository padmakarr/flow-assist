'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Top bar View menu', () => {
  test('opens menu, switches to Calendar via menuitem, closes on outside click', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const wrap = page.locator('#top-bar-view-wrap');
      const btn = page.locator('#top-bar-view-btn');
      await btn.click();
      await expect(wrap).toHaveClass(/open/);
      await expect(btn).toHaveAttribute('aria-expanded', 'true');

      await wrap.locator('.top-bar-view-screen[data-view="calendar"]').click();
      await expect(page.locator('#view-calendar')).toHaveClass(/active/);
      await expect(wrap).not.toHaveClass(/open/);

      await btn.click();
      await page.locator('aside.sidebar').click({ position: { x: 40, y: 200 }, force: true });
      await expect(wrap).not.toHaveClass(/open/);
      await expect(btn).toHaveAttribute('aria-expanded', 'false');
    } finally {
      await app.close();
    }
  });

  test('sidebar width options in View menu toggle layout class', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const wrap = page.locator('#top-bar-view-wrap');
      await page.locator('#top-bar-view-btn').click();
      await wrap.locator('.top-bar-sidebar-opt[data-sidebar-mode="collapsed"]').click();
      await expect(page.locator('body')).toHaveClass(/sidebar-mode-collapsed/);

      await page.locator('#top-bar-view-btn').click();
      await wrap.locator('.top-bar-sidebar-opt[data-sidebar-mode="full"]').click();
      await expect(page.locator('body')).toHaveClass(/sidebar-mode-full/);
    } finally {
      await app.close();
    }
  });
});

test.describe('Notifications bell', () => {
  test('opens dropdown and shows empty or list state', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('#notif-bell-btn').click();
      await expect(page.locator('#notif-dropdown')).toBeVisible();

      await page.locator('#notif-bell-btn').click();
      await expect(page.locator('#notif-dropdown')).toBeHidden();
      await expect(page.locator('#notif-bell-btn')).toHaveAttribute('aria-expanded', 'false');
    } finally {
      await app.close();
    }
  });
});

test.describe('Sidebar rail toggle', () => {
  test('toggles between full and collapsed sidebar', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('#sidebar-rail-toggle').click();
      await expect(page.locator('body')).toHaveClass(/sidebar-mode-collapsed/);

      await page.locator('#sidebar-rail-toggle').click();
      await expect(page.locator('body')).toHaveClass(/sidebar-mode-full/);
    } finally {
      await app.close();
    }
  });
});

test.describe('Top bar hide sidebar', () => {
  test('top bar sidebar toggle hides then shows sidebar', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('#top-bar-sidebar-toggle').click();
      await expect(page.locator('body')).toHaveClass(/sidebar-mode-hidden/);

      await page.locator('#top-bar-sidebar-toggle').click();
      await expect(page.locator('body')).not.toHaveClass(/sidebar-mode-hidden/);
    } finally {
      await app.close();
    }
  });
});
