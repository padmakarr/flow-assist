---
name: Notes Todo rich WYSIWYG
overview: "Bring the same rich-markdown WYSIWYG pattern used for task descriptions to editable note bodies and todo item rows: toolbar directly above each editor, persistence as the existing markdown-like string in `item.body` and `checklist[].text`, plus wiring for modal readonly-unlock, sync, board click guards, CSS, and Playwright regression tests."
todos:
  - id: render-note-todo-html
    content: Replace note textarea + todo inputs with rich-textarea-wrap + toolbar + contenteditable; readonly preview via formatRichDescription
    status: completed
  - id: sync-unlock-bind
    content: Update syncNoteCardToModel, modal unlock/focusin, bindRichFormatToolbars after renderNotes/renderNotesModal
    status: completed
  - id: click-guard-css
    content: "Board click: ignore rich toolbar/editor; extend styles.css for notes rich editors + readonly"
    status: completed
  - id: pw-notes-rich
    content: Add tests/regression/notes-rich-text.spec.js and run npm run test:regression
    status: completed
isProject: false
---

# Notes and Todo List rich text (toolbar above editors)

## Baseline (reuse)

The app’s rich pipeline already lives in [`renderer.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js):

- **Toolbar markup:** [`renderRichFormatToolbarHtml`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) / `.rich-format-toolbar`
- **Wrap:** `.rich-textarea-wrap[data-rich-wysiwyg="1"]` with toolbar **first**, then [`bindRichFormatToolbars`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) finding `.rich-markdown-wysiwyg[contenteditable="true"]`
- **Markdown round-trip:** [`setRichWysiwygFromMarkdown`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js), [`getRichWysiwygMarkdown`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js), [`wysiwygHtmlToTaskDescriptionMarkdown`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js), [`formatRichDescription`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)

Today, notes still use a **textarea** ([`renderNoteCardHtml`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) ~2342–2346) and todos use **`input.notes-todo-text`** (~2312–2316). Sync reads `.value` in [`syncNoteCardToModel`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~2008–2024).

## 1. Render HTML for editable note body

In `renderNoteCardHtml`, for the **non–readonly-preview** note branch (`item.kind === 'note'`, not `readonlyPreview`):

- Replace the lone `<textarea class="notes-card-body …">` with:

```html
<div class="rich-textarea-wrap notes-note-body-wrap" data-rich-wysiwyg="1">
  <!-- renderRichFormatToolbarHtml() -->
  <div tabindex="0" role="textbox" aria-multiline="true"
       class="notes-card-body rich-markdown-wysiwyg auto-resize …"
       contenteditable="true|false" data-placeholder="Take a note…">
       <!-- innerHTML from formatRichDescription(rawBody) or <br> if empty -->
  </div>
</div>
```

- **Modal readonly:** mirror the existing pattern: when `isModal`, start with `contenteditable="false"` (instead of `readonly` on textarea) so first focus can unlock editing ([`notesModalUnlockLazyFields`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js), [`bindNotesModalEventsOnce` focusin](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) ~2435–2444).

- **Board:** `contenteditable="true"` immediately (no unlock).

- **Inner HTML:** build from `formatRichDescription(String(item.body || ''))` or `'&lt;br&gt;'` when empty — same pattern as task description WYSIWYG inner (do **not** put raw markdown in the DOM as text).

## 2. Render HTML for editable todo rows

For each editable checklist row (not `readonlyPreview`):

- Replace `<input class="notes-todo-text">` with a column stack: checkbox stays; beside it, `rich-textarea-wrap` + toolbar + contenteditable editor using classes **`notes-todo-text rich-markdown-wysiwyg`** so existing selectors can be updated minimally.

- Inner HTML from `formatRichDescription(String(row.text || ''))` or `<br>`.

- Modal: same `contenteditable="false"` when `isModal` until unlock.

- Adjust markup so the row is still one `<li class="notes-checklist-item">`; use a wrapper (e.g. `.notes-todo-rich-column`) for toolbar+editor so layout stays a row with checkbox + column.

## 3. Readonly preview (compact grid)

When `readonlyPreview` is true:

- **Note:** replace plain escaped text in `.notes-card-body-display` with rendered rich HTML via `formatRichDescription(rawBody)` for non-empty body (empty keeps “No content” / empty styling). Ensures stored markdown **displays** formatted on cards.

- **Todo:** replace escaped span in `.notes-todo-text-display` with `formatRichDescription(row.text)` (or empty) so list preview shows formatting consistently.

## 4. Sync and unlock

- **`syncNoteCardToModel`:**  
  - Body: `item.body = getRichWysiwygMarkdown(card.querySelector('.notes-card-body.rich-markdown-wysiwyg'))` (fallback if missing).  
  - Todo: for each row, `getRichWysiwygMarkdown(row.querySelector('.notes-todo-text.rich-markdown-wysiwyg'))`.

- **`notesModalUnlockLazyFields`:** remove `readonly` from legacy fields; add handling for `.notes-card-body[contenteditable="false"]` and `.notes-todo-text[contenteditable="false"]` → set `contenteditable="true"`.

- **`bindNotesModalEventsOnce` focusin:** extend `t.matches(...)` to include the contenteditable selectors above.

## 5. Bind toolbars after DOM insertion

After **`renderNotes()`** (board) and **`renderNotesModal()`** (modal body):

- Call **`bindRichFormatToolbars`** on `#notes-board` and `#notes-modal-body` respectively (same as task list does on fragments).

- Update [`renderNotesModal`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) post-processing: replace `textarea.notes-card-body.auto-resize` loop with targeting the new editors if needed (e.g. datetime preset only touched reminder inputs today ~1893–1901).

## 6. Stop modal opening when using formatting

In **`bindNotesEventsOnce`** board click handler (~2400–2406), if the click target is inside **`.rich-format-toolbar`** or **`.rich-textarea-wrap[data-rich-wysiwyg="1"]`** (editor surface), **do not** call `openNotesModal` — otherwise toolbar clicks would open the modal.

## 7. CSS ([`styles.css`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css))

- Scope rules under `.notes-card` / `.notes-card--modal` so global rich-task styles still apply but notes keep spacing:

  - `.notes-note-body-wrap .rich-format-toolbar` — margin below toolbar, full width above body editor.

  - `.notes-card-body.rich-markdown-wysiwyg` — min-height, borders/padding aligned with existing `.notes-card-body` textarea rules (~6116+).

  - Todo: `.notes-checklist-row` flex / gap so checkbox aligns with the **column** containing toolbar + editor; shrink toolbar font if needed on narrow cards.

  - Update selectors that mention `textarea.notes-card-body[readonly]` (~2989) to include `[contenteditable="false"]` for muted readonly appearance in modal.

## 8. Tests

Add [`tests/regression/notes-rich-text.spec.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\tests\regression\notes-rich-text.spec.js) (same helpers as [`notes-reminder.spec.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\tests\regression\notes-reminder.spec.js): `launchFlowAssist`, `waitForProfileLoaded`, `copyProfileForMutation`):

1. **Note modal:** New note → open modal → expect `#notes-modal .notes-note-body-wrap .rich-format-toolbar` visible above `#notes-modal .notes-card-body.rich-markdown-wysiwyg`. Type/select, apply **Bold** via toolbar (`.rich-fmt-btn[data-rich-cmd="bold"]`), assert editor HTML contains `strong` or bold styling; close/save flow or sync via blur — assert persisted data shows formatted preview on board **or** re-open modal and body still bold (choose one stable assertion).

2. **Todo modal:** New list → open modal → expect toolbar above todo editor; minimal bold round-trip similar to above.

3. **Toolbar click does not open duplicate modal:** With note card on board, click a toolbar button on the **grid card** (if board shows toolbar — it will after change): modal should not navigate incorrectly (assert single modal / no unwanted open). Alternatively click editor then toolbar on board card.

Run **`npm run test:regression`** and fix any selector breaks in existing notes tests.

## Scope / risks

- **Data:** Still plain markdown-like strings in JSON; no schema change.

- **Todo lines:** Multi-line rich items are allowed (contenteditable); layout may grow row height — acceptable per product ask.

- **Performance:** Many todos × toolbar on board — acceptable for typical list sizes; if needed later, hide toolbars on compact cards (out of scope unless you want it now).
