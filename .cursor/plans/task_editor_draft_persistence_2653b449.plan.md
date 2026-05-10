---
name: Task editor draft persistence
overview: Persist in-memory drafts for task/sub-task editors across card collapse and view switches by snapshotting DOM before `renderList()`, merging drafts when rendering cards, and clearing drafts only after explicit save actions (not on every `updateTask`).
todos:
  - id: draft-state-capture
    content: Add state.editorDrafts + captureTaskListEditorDrafts() at start of renderList(); snapshot task/subtask/new-subtask inputs
    status: completed
  - id: merge-render
    content: Merge drafts in renderTaskCard / renderSubtaskCard for all captured fields
    status: completed
  - id: clear-on-save
    content: Clear draft slices on Save details, description commit, sub-task/add-sub-task saves; drop on task delete
    status: completed
  - id: todo-1778316097276-755bxlj3i
    content: Persisting drafts across app restart (localStorage).
    status: completed
  - id: todo-1778316105374-bkxijpywe
    content: Remembering which sub-panels were open (Update ETA vs Details) — values-only persistence unless you ask for UI state.
    status: completed
isProject: false
---

# In-memory draft persistence for task/sub-task editors

## Problem

- Collapsing a task ([`bindTaskCardEvents`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) ~2872–2876) toggles `state.expandedTasks` and calls **`renderList()`**, which replaces `#task-list` / `#completed-task-list` HTML.
- Switching to Calendar/Summary calls [`render()`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~6359–6365), which **does not** rebuild the list until you return to List—then **`renderList()`** runs and wipes the DOM.

[`renderTaskCard`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~2401+) always seeds inputs from `task.*` (e.g. `.task-detail-title`, `.task-description-edit` ~2523–2595), so any typing not yet saved is lost.

## Approach (session-only drafts; disk unchanged until Save)

Add **`state.editorDrafts`** (or similar) on the existing [`state`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) object (~910):

- **`tasks[taskId]`** — plain object of field snapshots for that main task (strings/numbers as stored in inputs).
- **`subtasks[taskId + ':' + subId]`** — same for each expanded sub-task card.
- **`newSubtask[taskId]`** — optional object for the “New sub-task” composer (~2634–2656) so half-filled adds survive re-render.

**1. Snapshot before destroy**

At the **very start** of [`renderList()`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~3705), call a new helper e.g. **`captureTaskListEditorDrafts()`** that:

- Queries existing cards under `#view-list` / `#completed-task-list` (and any list container used for today/yesterday/archive branches) while DOM is still the **previous** render.
- For each **`.task-card`** with `data-id`, if the card still has a **`.task-body`** (expanded), read:
  - Task details grid: `.task-detail-title`, `.task-detail-priority`, `.task-detail-tags`, `.task-detail-assigned`, `.task-detail-eta`, `.task-detail-effort`, `.task-detail-bugs`, difficulty select, project select, categories — mirror what [`save-task-details-btn`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~3022–3058) reads (reuse [`getSelectedCategoriesFromWrap`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) / same selectors).
  - Description: **textarea** `.task-description-edit` value (source of truth while editing); optionally note if edit mode is visible vs view mode for UX later.
  - Progress row (optional but consistent): `.progress-text-in`, `.progress-date-in`, `.progress-effort-in`, progress categories if present.
  - **New sub-task** block: `.new-subtask-title-in`, `.new-subtask-desc-in`, priority, dates, etc., keyed under `newSubtask[taskId]`.
- For each **`.subtask-card`** with `data-task-id` / `data-subtask-id`, capture expanded-body fields the same way sub-task save flows use (title, description textarea, flags, etc.) — align with existing sub-task update handlers.

Merge into `state.editorDrafts` (replace per-key object for that id so stale keys don’t linger forever).

**2. Merge when rendering**

- In **`renderTaskCard`**, before building attribute `value=` / textarea body, resolve each field with **`draft[taskId].field ?? task.field`** (only override when draft key is present).
- In **`renderSubtaskCard`**, same using `drafts.subtasks[compositeKey]`.

Keep escaping via existing **`escapeHtml`** for HTML attributes.

**3. Clear drafts only on explicit “recorded” actions**

Do **not** clear on arbitrary [`updateTask`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (status buttons, ETA ribbon updates, etc.).

Clear selectively:

- After **Save details** succeeds: drop corresponding keys in `tasks[taskId]` (or whole bucket for that id).
- After **description** is committed via the toggle ([~3013](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)): clear `description` in draft (or full task draft if simpler).
- After **add sub-task** submit / **sub-task** field save: clear `newSubtask[taskId]` or `subtasks[composite]` as appropriate.

If a task is **deleted**, remove its draft entry.

**4. Edge cases**

- **List filter** changes (today/archive) also call `renderList()` — snapshot-first handles this.
- **Collapsed card**: no `.task-body` in DOM — rely on **last snapshot** from when it was expanded (captured on the re-render triggered by collapse **before** innerHTML is replaced: at capture time the DOM may still show expanded body once—verify ordering: toggle runs `renderList` immediately; first instruction is capture—DOM should still be previous expanded state for that frame). *Confirm in implementation:* capture runs before `innerHTML =`, so expanded content from *before* the click is still present for the card being collapsed—actually after click, `expandedTasks` is false but **old DOM is still there until renderList replaces it**, so the card may still have `.task-body` in DOM from last paint. Good.

- **Description view vs edit**: storing textarea value is enough; view HTML can stay derived from saved task until user opens edit again (draft description applies to textarea).

## Files

- **[renderer.js](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)** only: state, `captureTaskListEditorDrafts`, merge helpers, wire `renderList` + clear calls on save handlers.

## Out of scope (unless you want them)

- Persisting drafts across app restart (localStorage).
- Remembering which sub-panels were open (Update ETA vs Details) — values-only persistence unless you ask for UI state.
