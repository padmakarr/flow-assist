---
name: Notes reminder UI compact
overview: Tighten the notes/todo **modal (focused) reminder** block so the "Reminder" heading, hint text, and subtitle only appear after a scheduled reminder exists; add Playwright coverage for the empty state, post-add state, and todo flow.
todos:
  - id: renderer-split-modal
    content: "Update renderNoteRemindersSection modal branch: remove subtitle; empty vs has-reminder markup + modal-empty class"
    status: completed
  - id: css-modal-empty
    content: Add styles for notes-card-reminders--modal-empty (tighter spacing)
    status: completed
  - id: pw-reminder-tests
    content: "Extend notes-reminder.spec.js: empty state, post-add heading, remove collapse, todo parity"
    status: completed
  - id: run-regression
    content: Run npm run test:regression (or targeted notes-reminder spec)
    status: completed
isProject: false
---

# Compact reminder area in focused note view + Playwright

## Current behavior (to change)

In [`renderer.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js), `renderNoteRemindersSection` (around **2027–2096**) builds the **modal** branch when `isModal` is true. That is what [`renderNotesModal`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) uses via `renderNoteCardHtml(item, { compact: false, modal: true })` for the opened card—**both** regular notes and **todo list** cards use the same HTML.

Today, the modal always renders:

- A **section head** with title `Reminder` and a **subtitle** (`.notes-reminder-section-sub`: "One schedule per note…")
- Either a **list row** or the **hint** "No reminder scheduled yet."
- The **Add reminder** toolbar and hidden dropdown

That fixed chrome plus the hint creates the “empty” vertical space you want to remove. You also asked to **drop the subtitle** entirely and to **show the “Reminder” heading only after a reminder exists**.

## Implementation

### 1. [`renderer.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) — `renderNoteRemindersSection`

- **Remove** the `.notes-reminder-section-sub` line (and any string "One schedule per note…") from the template so it never appears.
- **Split modal output** on `hasReminder = scheduledRows.length > 0`:

  - **No reminder yet** (`!hasReminder`):
    - **Do not** render `.notes-reminder-section-head` (no “Reminder” label).
    - **Do not** render “No reminder scheduled yet.” (`.notes-reminder-hint`).
    - Keep a **single compact block**: wrapper with a new modifier class (e.g. `notes-card-reminders--modal-empty`) containing only `.notes-reminder-toolbar` (button **Add reminder**) and the existing hidden `.notes-reminder-dropdown` tree unchanged so current click/save behavior keeps working.

  - **At least one scheduled reminder** (`hasReminder`):
    - Render `.notes-reminder-section-head` with **only** `.notes-reminder-section-title` (text `Reminder`)—no subtitle.
    - Render the existing `<ul class="notes-reminder-list notes-reminder-list--single">` row + Remove.
    - Toolbar label continues to use the existing **Change reminder** when `scheduledRows.length` (unchanged logic).

- **No change** to the **board/preview** branch (`readonlyPreview` / compact cards) or to `addNoteReminderForNoteId` / `removeNoteReminder` (they already call `renderNotesModal()` when the modal is open).

### 2. [`styles.css`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css)

- Add rules for **`.notes-card-reminders--modal-empty`** (and optionally tighten `.notes-reminder-toolbar` inside it) so bottom margin/padding matches the “compact and clean” goal—e.g. smaller **margin-bottom** on the reminders wrapper than `.notes-card-reminders--modal` default (~[`6266–6268`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css)), and avoid extra top gap where the old section head + hint used to be.
- **Remove or leave unused** `.notes-reminder-section-sub` / `.notes-reminder-hint` rules if nothing else uses them; if `notes-reminder-hint` is still referenced elsewhere, keep rules.

### 3. Playwright — extend [`tests/regression/notes-reminder.spec.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\tests\regression\notes-reminder.spec.js)

Reuse existing helpers: `launchFlowAssist`, `waitForProfileLoaded`, `copyProfileForMutation`, pattern `openFreshNoteModal`.

Add tests (names illustrative):

1. **Modal empty state (new note)**  
   After opening a fresh note modal:  
   - `#notes-modal .notes-reminder-section-title` **not** attached / **0** count (or `hidden`).  
   - `#notes-modal .notes-reminder-hint` **absent**.  
   - No visible copy matching **One schedule per note** (optional assertion—DOM removal makes this redundant).  
   - `#notes-modal .notes-reminder-dropdown-toggle` visible with **Add reminder**.

2. **After saving a reminder, heading and row appear**  
   Reuse the existing preset flow (or short variant): after save,  
   - `.notes-reminder-section-title` visible with text **Reminder**.  
   - `.notes-reminder-when` non-empty (existing assertions).

3. **Remove returns to compact layout**  
   After (2), click **Remove** on `.notes-reminder-remove`, then assert empty-state selectors again (section title gone, Add reminder back).

4. **Todo list modal parity**  
   Small helper: Notes view → `#notes-add-todo-btn` → open first **todo** card modal (`notes-card--todo` / same head click pattern). Assert same **empty** reminders chrome as (1), then optional minimal reminder add (same preset flow) and assert heading + row—mirrors **note vs todo** focused view without duplicating all edge cases.

Existing tests in this file already validate preset/datetime save paths; extend—not replace—unless selectors must tighten (e.g. scope to `#notes-modal`).

### 4. Verification

- Run `npm run test:regression` (or `npx playwright test tests/regression/notes-reminder.spec.js`) per [`package.json`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\package.json) **`test:regression`** script.

## Scope note

The **grid cards** keep compact reminder pills as today; only the **focused modal** layout changes per your request.
