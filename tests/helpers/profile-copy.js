'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Copy the golden fixture to a unique temp file so tests can call save-tasks without mutating the repo fixture.
 * @param {string} fixturePath Absolute path to .fa.json
 * @param {string} [label] Optional suffix for temp dir name
 * @returns {string} Absolute path to the writable copy
 */
function copyProfileForMutation(fixturePath, label) {
  const safe = label != null ? String(label).replace(/[^a-zA-Z0-9_-]/g, '_') : 'run';
  const dir = path.join(os.tmpdir(), 'flowassist-mut-' + process.pid + '-' + safe + '-' + Date.now());
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'mutating.fa.json');
  fs.copyFileSync(fixturePath, dest);
  return dest;
}

module.exports = { copyProfileForMutation };
