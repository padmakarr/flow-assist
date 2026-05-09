'use strict';

const fs = require('fs');
const path = require('path');
const { _electron: electron } = require('@playwright/test');

/** Repository root (folder that contains package.json and main.js). */
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Default golden profile for E2E (committed fixture). */
const DEFAULT_E2E_PROFILE = path.join(REPO_ROOT, 'tests', 'fixtures', 'padmakarr-testing-2.fa.json');

/** Path to the Electron binary (same resolution as `require('electron')` in Node). */
function getElectronExecutablePath() {
  const electronPkg = path.join(REPO_ROOT, 'node_modules', 'electron');
  const rel = fs.readFileSync(path.join(electronPkg, 'path.txt'), 'utf8').trim();
  return path.join(electronPkg, 'dist', rel);
}

/**
 * Launches FlowAssist with E2E env so tests do not fight single-instance lock or touch real userData.
 * @param {{ profilePath?: string }} [options] profilePath overrides FLOWASSIST_E2E_PROFILE / default fixture.
 * @returns {Promise<import('@playwright/test').ElectronApplication>}
 */
async function launchFlowAssist(options) {
  options = options || {};
  const fromOpt = options.profilePath && String(options.profilePath).trim();
  const fromEnv = process.env.FLOWASSIST_E2E_PROFILE && String(process.env.FLOWASSIST_E2E_PROFILE).trim();
  const defaultPath = fs.existsSync(DEFAULT_E2E_PROFILE) ? DEFAULT_E2E_PROFILE : '';
  const profilePath = fromOpt || fromEnv || defaultPath;

  const executablePath = getElectronExecutablePath();
  /** @type {NodeJS.ProcessEnv} */
  const env = {
    ...process.env,
    FLOWASSIST_E2E: '1',
  };
  if (profilePath) {
    env.FLOWASSIST_E2E_PROFILE = path.isAbsolute(profilePath)
      ? path.normalize(profilePath)
      : path.resolve(REPO_ROOT, profilePath);
  }
  return electron.launch({
    executablePath,
    cwd: REPO_ROOT,
    args: [REPO_ROOT],
    env,
  });
}

/**
 * @param {import('@playwright/test').ElectronApplication} app
 * @returns {Promise<import('@playwright/test').Page>}
 */
async function getMainWindowPage(app) {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return page;
}

module.exports = {
  REPO_ROOT,
  DEFAULT_E2E_PROFILE,
  getElectronExecutablePath,
  launchFlowAssist,
  getMainWindowPage,
};
