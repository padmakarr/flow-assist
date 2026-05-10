---
name: Relax Dino minigame
overview: Add a self-contained endless runner in `minigames/dino/` using generic placeholder visuals (IP-safe); embed via iframe in Relax with calm UI polish and aggressive Playwright coverage. Art and juice can be enhanced later entirely inside `minigames/dino/` without touching FlowAssist core.
todos:
  - id: scaffold-minigame
    content: Create minigames/dino/ (index.html, dino.js, dino.css), README; generic sprites or canvas primitives only; localStorage hi-score; engine structured for later asset swaps
    status: completed
  - id: integrate-relax
    content: Add iframe + Relax layout/CSS polish; package.json build.files for minigames
    status: completed
  - id: pw-dino-suite
    content: Add tests/regression/relax-dino.spec.js + extend relax-view.spec.js; run npm run test:regression
    status: completed
  - id: pack-smoke
    content: Verify minigames load in packaged build (manual or scripted check)
    status: completed
isProject: false
---

# Relax tab: standalone Desert Run mini-game + UI polish + tests

## Visuals, naming, and IP safety

- **No Chrome/Google sprites or marks.** v1 uses **generic placeholders only**: simple geometric shapes, flat rectangles/circles drawn on canvas, or royalty-free-style abstract blocks—not recognizable “dino” artwork.
- **Neutral product copy** in FlowAssist (e.g. **“Desert run”**, **“Endless stride”**) so the Relax tab does not imply an official Chrome game.

## Separate engine so you can enhance later

The goal is to keep **all gameplay, rendering, and future sprite swaps** inside [`minigames/dino/`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\minigames\dino) (and siblings under `minigames/`):

- **Enhancements** (better sprites, particles, sound packs, difficulty curves) are edited **only** under that folder; [`renderer.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) stays unaware except hosting the iframe `src`.
- **Testing:** Open `minigames/dino/index.html` in a normal browser or run E2E against the iframe—no need to rebuild the task app to iterate on art.
- Optional later: split pure logic (`physics.js`) vs presentation (`render.js`) inside the game folder if the codebase grows—still no import from FlowAssist.

## Architecture: standalone mini-game package

```mermaid
flowchart TB
  subgraph repo [Repository]
    mainApp[index.html + renderer.js]
    mg[minigames/dino/]
    mg --> entry[index.html]
    mg --> game[dino.js]
    mg --> style[dino.css]
  end
  mainApp -->|"iframe src=minigames/dino/index.html"| entry
```

- **Folder:** [`minigames/dino/`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\minigames\dino) (new), fully self-contained:
  - `index.html` — minimal shell: canvas, HUD (score / high score / game over), touch targets for mobile-style tap (optional).
  - `dino.js` — game loop only (no imports from FlowAssist). Use `<canvas>` + `requestAnimationFrame`. Store high score in `localStorage` under a namespaced key e.g. `flowassist-minigame-dino-hiscore`.
  - `dino.css` — fullscreen canvas area, dark calm palette aligned with Relax but distinct from app chrome.
- **No dependency** on [`renderer.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) inside the game files. Communication with the parent app is **optional** and minimal (e.g. `postMessage` only if you later add pause-on-tab-switch); start with **zero** coupling.

**Why iframe:** Keeps the game out of the main bundle, loads as a separate document, matches “called and rendered separately,” and matches future games (`minigames/snake/index.html`, etc.).

**Electron loading:** Main window uses [`mainWindow.loadFile(path.join(__dirname, 'index.html'))`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\main.js). A child iframe with `src="minigames/dino/index.html"` resolves relative to the loaded HTML file’s directory (same pattern as existing [`reminder.html`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\reminder.html)).

**Packaging:** Extend [`package.json`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\package.json) `build.files` with `"minigames/**/*"` (or explicit `minigames/dino/**/*`) so electron-builder copies the mini-game into packaged builds.

**Future games:** Add [`minigames/README.md`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\minigames\README.md) describing convention: one folder per game, `index.html` entry, optional `manifest.json` (`id`, `title`, `version`). Relax tab can later list games from a small registry array in [`renderer.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) or a static JSON—out of scope for v1 except leaving a clear folder shape.

## Game design (Dino Run–style)

| Piece | Behavior |
|--------|----------|
| Input | Space / ↑ jump; optional ↓ duck (phase 2). Click/tap on canvas to jump for pointer users. |
| World | Side-scrolling ground line; obstacles (pillars / rocks) with gap randomization; speed ramps slowly. |
| Player | Single gravity + jump physics; collision AABB vs obstacles. |
| States | Title / ready → running → game over → restart (Space). |
| HUD | Current score (distance or time); best score; “Tap Space to start” copy. |

Performance: fixed timestep or single update pass per frame; pause `requestAnimationFrame` when `document.hidden` (battery-friendly).

## Relax tab UI/UX (calmer, clearer)

Current structure lives in [`index.html`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html) `#view-relax` (~454+) and styles under `.relax-*` in [`styles.css`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) (~6635+).

Planned adjustments (incremental, no redesign of timer logic in [`renderer.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) ~8638+):

1. **Hierarchy:** Split content into two visual groups: **“Timers”** (break + focus cards) and **“Wind down”** (tips + new mini-game card)—use subtle section labels or spacing, not heavy chrome.
2. **Mini-game card:** New section with a calm one-line description (e.g. a tiny movement break; placeholder graphics). Accessible **iframe** (`title`, `aria-label`), fixed **aspect ratio** container (e.g. 16:5 or max-height ~280px) so the Relax view does not feel dominated by the canvas.
3. **Tone:** Softer panel backgrounds (`color-mix` / lower contrast borders already used elsewhere), slightly increased card padding and grid gap, shorten toolbar subtitle line if it feels noisy.
4. **iframe focus:** Document that users may need to **click once** inside the game area before Space works (browser security); optional “Click game to focus” hint below iframe.

**Integration touchpoints:** Only [`index.html`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html) (markup) and [`styles.css`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css); **no** timer logic changes unless a bug appears.

## Testing strategy (“aggressive” Playwright)

Existing Relax tests: [`tests/regression/relax-view.spec.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\tests\regression\relax-view.spec.js).

Add **`tests/regression/relax-dino.spec.js`** (and optionally split helpers):

1. **Smoke:** Navigate to Relax (`#view-relax.active`), mini-game iframe/container visible, iframe `src` ends with `minigames/dino/index.html` (or stable `data-testid` on wrapper).
2. **Frame interaction:** `page.frameLocator('iframe[title="..."]')` — click canvas center, press `Space` to start, wait for score element to change from idle text (or wait for HUD class `running`).
3. **Game over path:** Hold or repeat frames until collision (bounded timeout), assert **Game over** / restart prompt visible.
4. **High score persistence (optional):** After one run, reload is heavy in Electron E2E; alternatively assert `localStorage` via `page.evaluate` in iframe context — only if stable.
5. **Regression guard:** Opening another view (e.g. List) does not throw; returning to Relax iframe still present (`navigation.spec.js` already switches views—extend or cross-check).

Update **[`tests/regression/relax-view.spec.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\tests\regression\relax-view.spec.js)** with one assertion that the new mini-game region exists (avoid duplicating full game tests).

**Standalone dev test:** In [`minigames/README.md`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\minigames\README.md), document opening `minigames/dino/index.html` directly in a browser for rapid iteration—no Electron required.

**CI:** Run full [`npm run test:regression`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\package.json) after changes.

## Implementation order

1. Scaffold `minigames/dino/` + playable loop + README.
2. Wire iframe + Relax layout/CSS polish + `build.files`.
3. Playwright: `relax-dino.spec.js` + relax-view tweak.
4. Manual smoke in packaged `electron-builder` output (verify iframe path).

## Risks / mitigations

| Risk | Mitigation |
|------|------------|
| iframe keyboard focus | Click-before-keyboard in tests; short UX hint |
| File URL in packaged app | Relative `src`; verify after `npm run pack` |
| Test flakiness (timing) | Use `data-game-state` attributes on `body` or canvas wrapper for deterministic assertions |
