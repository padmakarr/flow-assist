# UI map (accessibility baseline)

This folder holds the **latest accessibility tree** from the main FlowAssist window so humans and agents can see the current interactive structure without opening the app.

## Refresh after UI changes

```bash
npm run test:ui-map
```

That runs `tests/discovery/ui-mapper.spec.js`, which:

1. Launches Electron with `FLOWASSIST_E2E=1` and loads the golden profile from `tests/fixtures/padmakarr-testing-2.fa.json` by default (see `FLOWASSIST_E2E_PROFILE` in [`helpers/electron-app.js`](../helpers/electron-app.js)).
2. Dumps the Chromium **full AX tree** (via CDP `Accessibility.getFullAXTree`) to:
   - `last-snapshot.json` — structured tree (role, name, state, children).
   - `last-snapshot.txt` — indented outline for quick reading in diffs.

Commit updated snapshots when navigation or labels change on purpose.

## HTML report (all E2E tests)

After `npm run test:regression` or `npm run test:e2e`, open `playwright-report/index.html` in a browser.
