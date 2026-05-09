# FlowAssist Playwright (Electron) tests

- **`discovery/`** — tools that document the app (e.g. UI mapper / AX tree via CDP).
- **`regression/`** — functional and visual regression specs (grow here).
  - `app-launches.spec.js` — smoke: window + profile load
  - `navigation.spec.js` — sidebar views
  - `top-bar-menus.spec.js` — View menu, notifications, sidebar toggles
  - `list-view-tasks.spec.js` / `list-filters-sort.spec.js` — list CRUD edges, tabs, sort
  - `calendar-view.spec.js` — calendar toolbar and day-off panel
  - `summary-view.spec.js` — generate summary, export options
  - `notes-view.spec.js` / `notes-modal.spec.js` — notes filters and modal
  - `relax-view.spec.js` — Relax tab smoke
  - `settings-modal.spec.js` — settings dialog and theme persistence
  - `profiles-ipc.spec.js` — `profileActivateFromPath` + reload
  - `visual-smoke.spec.js` — sidebar screenshot baseline (`*.spec.js-snapshots/`)
- **`helpers/`** — shared launch helpers (`FLOWASSIST_E2E`, repo paths, CDP AX tree).
- **`fixtures/`** — golden profile [`padmakarr-testing-2.fa.json`](fixtures/padmakarr-testing-2.fa.json) loaded on every E2E launch unless overridden.
- **`playwright.config.js`** — Playwright config (CommonJS for reliable Windows runs).

## Golden profile (`FLOWASSIST_E2E_PROFILE`)

On launch, [`electron-app.js`](helpers/electron-app.js) sets `FLOWASSIST_E2E_PROFILE` to the committed fixture by default. [`main.js`](../main.js) reads it inside `app.whenReady` (before the window loads) and writes `profilePath` into the isolated E2E prefs so `load-tasks` uses that `.fa.json`.

Override for local experiments:

```bash
set FLOWASSIST_E2E_PROFILE=C:\path\to\other.fa.json
npm run test:regression
```

## Mutating tests (do not corrupt the fixture)

For specs that save tasks, use [`helpers/profile-copy.js`](helpers/profile-copy.js):

```js
const { copyProfileForMutation } = require('../helpers/profile-copy');
const { DEFAULT_E2E_PROFILE, launchFlowAssist } = require('../helpers/electron-app');
const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, test.info().title);
const app = await launchFlowAssist({ profilePath: mutPath });
```

## Commands

| Command | Purpose |
|--------|---------|
| `npm run test:ui-map` | Regenerate `tests/ui-map/last-snapshot.*` from the live UI |
| `npm run test:regression` | Run `tests/regression` only + HTML report under `playwright-report/` |
| `npm run test:e2e` | Run all Playwright tests under `tests/` (discovery + regression) |

Close any manually started `npm start` instance if you **omit** `FLOWASSIST_E2E` (not used by these scripts). Test launches set `FLOWASSIST_E2E=1` automatically.
