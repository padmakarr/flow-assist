# FlowAssist mini-games

Self-contained games live here so they can be edited, themed, and tested **without** changing FlowAssist core (`renderer.js`, task logic).

## Layout

- One folder per game: `minigames/<game-id>/`
- Entry point: `index.html` (loaded by the main app via `<iframe src="minigames/...">`).
- Keep assets and scripts inside that folder.

## Games

| Folder | Description |
|--------|-------------|
| `dino/` | Desert run — canvas endless runner (placeholder shapes). Open `minigames/dino/index.html` in any browser for quick iteration. |

## Local testing

From the repo root, open in a browser:

- `minigames/dino/index.html`

Or run FlowAssist and use the Relax tab (embedded iframe).

Optional future: add `manifest.json` per game (`id`, `title`, `version`) for a registry-driven picker.
