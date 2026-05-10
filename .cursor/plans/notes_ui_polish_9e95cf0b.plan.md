---
name: Notes UI polish
overview: "Fix Notes readability and layout by updating styles only (plus swapping the Notes SVG icon in index.html): larger cards/type, theme-aware field colors, full-width multi-column grid, and a cleaner sticky-note icon."
todos:
  - id: notes-css-contrast-grid
    content: "Update styles.css Notes section: larger type/cards, theme-aware input colors, wider grid, full-width panel"
    status: completed
  - id: notes-icon-svg
    content: Replace Notes SVG in index.html (sidebar + top bar) with improved sticky-note icon
    status: completed
isProject: false
---

# Notes feature fixes (size, contrast, grid, icon)

## Root causes

- **Contrast**: [styles.css](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) sets `.notes-card-body` to `background: rgba(15, 23, 42, 0.03)` — a **light-theme** tint. On dark surfaces (`--bg-surface` ~ `#161b22`, `--text-primary` ~ `#e6edf3`), native `input`/`textarea` can also pick up wrong inherited colors, so typed text looks muddy or “too dark” relative to the field.
- **“Vertical list” feel**: `#view-notes` uses **`max-width: 1200px`** and the grid uses **`minmax(260px, 1fr)`**. With the main column layout, that yields **few wide columns** or **one column** on many widths, which reads like a scrolling stack instead of a Keep-style board.
- **Small blocks**: Small `--font-sm` usage and **88px** min textarea height keep cards compact.

## Changes (no renderer logic required unless we add a wrapper class — prefer pure CSS)

### 1. Typography and card size

In the Notes block (~5255–5391 in [styles.css](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css)):

- Bump **title** and **body** to at least **base size** (e.g. `1rem` / `15–16px`) and todo row text to match.
- Increase **card padding** (e.g. 14–16px) and **textarea `min-height`** (e.g. 120–140px); slightly increase **line-height** for readability.

### 2. Theme-safe text and field backgrounds

Apply explicitly to `.notes-card-title`, `.notes-card-body`, `.notes-todo-text`:

- `color: var(--text-primary);`
- `caret-color: var(--text-primary);`
- **Idle field background**: `background: var(--bg-surface-raised)` (or a very subtle theme token), **not** fixed light gray RGBA.
- **Focus** (`:focus`): border using `var(--border-strong)` or `var(--accent-blue)`, background `var(--bg-surface)` if contrast needs it.
- **`::placeholder`**: `color: var(--text-muted)` with opacity where needed.

Ensure **checked todo** strikethrough still reads (opacity ~0.75 is OK if base text is readable).

### 3. Keep-like grid / full-width board

- **`#view-notes`**: Remove or **raise** `max-width` (e.g. none or **min(100%, 1600px)**), add **`width: 100%`**, **`box-sizing: border-box`**, and ensure it fills the scroll panel (`align-self: stretch` if needed).
- **`.notes-board`**: Use a wider minimum track, e.g. **`grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`** (or **320px**) and **`gap: 16–20px`**; add **`width: 100%`** and **`align-content: start`** so rows pack like a board.
- Optionally wrap toolbar + board in a single inner container with **`max-width`** only if you still want side margins without capping the grid too aggressively — default plan: **full width with horizontal padding** on `#view-notes` only.

### 4. Sidebar / top-bar Notes icon

In [index.html](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html), replace the current document SVG on **both** the sidebar Notes `nav-btn` and the **View** dropdown Notes option with one cohesive icon (same markup in both places): e.g. a **rounded sticky note** with a **folded corner** (clean 16×16 viewBox, `stroke` + `fill` using `currentColor` for sidebar/top-bar consistency). Keep **`aria-hidden="true"`** on decorative spans.

## Files

| File | Action |
|------|--------|
| [styles.css](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) | Rewrite Notes section: sizing, colors, grid, placeholders |
| [index.html](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html) | Swap Notes icon SVG (2 occurrences) |

## Quick verification

- Toggle **classic vs refined** theme (if both affect vars): text remains readable while typing and after blur.
- Resize window: **multiple columns** appear when width allows; narrow width collapses to one column without breaking contrast.
