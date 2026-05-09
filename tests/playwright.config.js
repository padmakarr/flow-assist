// @ts-check
const path = require('path');

const testsRoot = __dirname;

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: testsRoot,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      maxDiffPixels: 2500,
      animations: 'disabled',
    },
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(testsRoot, '..', 'playwright-report'), open: 'never' }],
  ],
  outputDir: path.join(testsRoot, '..', 'test-results'),
};
