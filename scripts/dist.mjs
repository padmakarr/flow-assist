/**
 * Interactive dist: choose major / minor / patch (bumps package.json + package-lock root) or local (no bump).
 * Non-interactive: --local | -l, or env FLOWASSIST_RELEASE=major|minor|patch|local
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function parseSemver(v) {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function bumpVersion(ver, kind) {
  const s = parseSemver(ver);
  if (!s) throw new Error('package.json version must be semver x.y.z (no prerelease): got "' + ver + '"');
  if (kind === 'major') return `${s.major + 1}.0.0`;
  if (kind === 'minor') return `${s.major}.${s.minor + 1}.0`;
  if (kind === 'patch') return `${s.major}.${s.minor}.${s.patch + 1}`;
  throw new Error('Invalid release kind: ' + kind);
}

function syncLockfileVersion(newVersion) {
  if (!fs.existsSync(lockPath)) return;
  const lock = readJson(lockPath);
  if (lock.version != null) lock.version = newVersion;
  if (lock.packages && lock.packages[''] && lock.packages[''].version != null) {
    lock.packages[''].version = newVersion;
  }
  writeJson(lockPath, lock);
}

function applyVersion(newVersion) {
  const pkg = readJson(pkgPath);
  const prev = pkg.version;
  pkg.version = newVersion;
  writeJson(pkgPath, pkg);
  syncLockfileVersion(newVersion);
  return { prev, next: newVersion };
}

function runElectronBuilder() {
  const r = spawnSync('npx', ['electron-builder', '--win'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env
  });
  if (r.error) throw r.error;
  process.exit(r.status === null ? 1 : r.status);
}

function askLine(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(function (resolve) {
    rl.question(prompt, function (ans) {
      rl.close();
      resolve(String(ans || '').trim());
    });
  });
}

function releaseFromEnv() {
  const raw = (process.env.FLOWASSIST_RELEASE || '').toLowerCase().trim();
  if (!raw) return null;
  if (raw === 'local' || raw === 'l' || raw === 'none') return 'local';
  if (raw === 'major' || raw === 'minor' || raw === 'patch') return raw;
  console.error('FLOWASSIST_RELEASE must be major, minor, patch, or local (got: ' + raw + ')');
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  const forceLocal = argv.includes('--local') || argv.includes('-l');
  const envKind = releaseFromEnv();

  let kind = null;
  if (forceLocal || envKind === 'local') {
    kind = 'local';
  } else if (envKind === 'major' || envKind === 'minor' || envKind === 'patch') {
    kind = envKind;
  }

  if (!kind) {
    if (!process.stdin.isTTY) {
      console.error(
        'No TTY: use npm run dist:local, or set FLOWASSIST_RELEASE=major|minor|patch|local, or pass --local.'
      );
      process.exit(1);
    }
    console.log('');
    console.log('FlowAssist — create Windows dist (electron-builder)');
    console.log('');
    console.log('  1) Major release  — bump x.0.0');
    console.log('  2) Minor release  — bump 0.x.0');
    console.log('  3) Patch release  — bump 0.0.x');
    console.log('  4) Local build    — dist only (do not change version)');
    console.log('');
    const ans = await askLine('Choose 1–4 [4]: ');
    const c = (ans || '4').charAt(0);
    if (c === '1') kind = 'major';
    else if (c === '2') kind = 'minor';
    else if (c === '3') kind = 'patch';
    else kind = 'local';
  }

  const pkg = readJson(pkgPath);
  const current = pkg.version;

  if (kind === 'local') {
    console.log('\nLocal dist — version unchanged (' + current + ').\n');
    runElectronBuilder();
    return;
  }

  const next = bumpVersion(current, kind);
  console.log('\nRelease bump: ' + kind + '  ' + current + ' → ' + next);
  applyVersion(next);
  console.log('Updated package.json and package-lock.json (root version).\n');
  console.log('Optional: git add package.json package-lock.json && git commit -m "chore: release v' + next + '"');
  console.log('          git tag v' + next + ' && git push && git push --tags\n');
  runElectronBuilder();
}

main().catch(function (e) {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
