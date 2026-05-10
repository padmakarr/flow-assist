---
name: Notes modal and todo UX
overview: Add a centered Notes/Todo modal opened by clicking a grid card (excluding interactive controls), fix Add-item focus bug (broken :last-of-type selector), wrap checklist text in CSS, and show at most 5 checklist rows in grid view with full list in the modal.
todos:
  - id: notes-modal-shell-css
    content: Add notes modal HTML + CSS overlay/panel; checklist wrap styles
    status: completed
  - id: notes-modal-logic
    content: "renderer: renderNoteCardHtml(compact), grid click → openNotesModal, modal sync/close/Escape"
    status: completed
  - id: notes-focus-truncate
    content: Fix Add-item focus selector; auto-open modal when checklist length > 5 after add
    status: completed
isProject: false
---

# Notes modal, checklist focus, wrapping, compact grid

## 1. Focus jumps to first checklist row (bug)

**Cause:** In [`renderer.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js), after “Add item”, focus uses:

```javascript
document.querySelector('... .notes-todo-text:last-of-type')
```

`:last-of-type` is evaluated **per parent** (`label`). Each row’s text input is `last-of-type` inside its label, so **`querySelector` returns the first match in document order** — the first row ([~1719](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)).

**Fix:** After `renderNotes()`, resolve the last row explicitly, e.g.:

- `card.querySelectorAll('.notes-checklist-item')` → last element → `.notes-todo-text`,  
  or  
- `.notes-checklist-item:last-child .notes-todo-text` scoped to that card.

Apply the same pattern anywhere else that focuses “last” checklist input.

---

## 2. Checklist text wrapping

In [`styles.css`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css), on `.notes-todo-text` (and modal equivalents if needed):

- `white-space: normal`
- `overflow-wrap: anywhere` or `break-word`
- Ensure flex row allows shrink: `.notes-checklist-row` already uses flex; add `min-width: 0` on the text input’s flex child path if anything still clips.

---

## 3. Max 5 checklist rows in grid (“unfocused”) vs full list in modal (“focused”)

**Data model unchanged** — all checklist entries stay in `item.checklist`.

**Rendering:**

- Extend [`renderNoteCardHtml`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) with an options argument, e.g. `renderNoteCardHtml(item, opts)` where `opts.compact === true` (default for `#notes-board` grid):
  - For `kind === 'todo'`, build rows from **`(item.checklist || []).slice(0, 5)`** only.
  - If `(item.checklist || []).length > 5`, append a short hint line (non-interactive), e.g. “+N more — open to view” (wording per your preference).

**Sync:** [`syncNoteCardToModel`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) already updates rows **by `data-item-id`**. Rows not present in the DOM keep their stored values in `item.checklist`. No change required beyond ensuring only visible rows are iterated (already the case).

**Add item in compact view:**

- After push + `renderNotes()`, if `checklist.length > 5`, call **`openNotesModal(noteId)`** so the user always reaches the new item and sees the full list (avoids “invisible” 6th row).

---

## 4. Centered enlarged editor (modal)

**Shell:** Add a modal block in [`index.html`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html) alongside existing modals (e.g. `#notes-modal`, `.modal-backdrop`, `.notes-modal-content`, `#notes-modal-body`, header + close button), following the same `aria-modal` / `aria-hidden` pattern as [`#progress-history-modal`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html)(~148).

**State:** e.g. `state.notesModalNoteId = null | string`.

**Open:** Click on a grid `.notes-card` **only if** the click target is not an interactive control — exclude `input`, `textarea`, `button`, and (recommended) `label` / checkbox row so checklist editing doesn’t open the modal. Optionally allow clicking “empty” card chrome (padding) only; same exclusion list prevents accidental opens while typing.

**Behavior:**

- `openNotesModal(id)`: `flushNotesSave()`, set state, set `aria-hidden="false"`, render modal body by reusing **`renderNoteCardHtml(item, { compact: false })`** (or a thin wrapper that adds a `notes-card--modal` class for styling).
- `closeNotesModal()`: sync from modal root once (`syncNoteCardToModel`), `flushNotesSave()`, clear id, hide modal, **`renderNotes()`** to refresh grid truncation.
- **Backdrop click**, **Close** button, **`Escape`** → close.

**Events:** One-time delegated listeners on `#notes-modal` for `input`/`change` → same `syncNoteCardToModel` + `scheduleNotesSave` as the board (modal container passed as `card` root).

**CSS:** New rules for `#notes-modal` / `.notes-modal-content`: fixed overlay, centered panel, `max-width` ~560–640px, `max-height` ~85vh, `overflow-y: auto`, slightly larger typography optional; reuse theme variables for consistency.

---

## 5. Files to touch

| File | Changes |
|------|---------|
| [`index.html`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html) | Notes modal markup |
| [`styles.css`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) | Modal layout; checklist wrap; optional `.notes-card--modal` / truncated hint |
| [`renderer.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) | `renderNoteCardHtml` options; `renderNotes` / modal render; `openNotesModal` / `closeNotesModal`; grid click delegation; fix Add-item focus; optional auto-open modal when checklist > 5 after add |

---

## 6. Verification

- Add several checklist items in grid: only 5 rows + hint; opening modal shows all items.
- Add item when already at 5: modal opens (or new row visible if ≤5) and **focus lands on the new row’s text field**, not the first.
- Long todo text wraps within the row in grid and modal.
- Click card background opens modal; clicking inputs does not.
