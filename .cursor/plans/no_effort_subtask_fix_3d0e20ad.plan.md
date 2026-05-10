---
name: No Effort Subtask Fix
overview: Fix sub-task "No Effort Needed" by persisting the flag in `updateSubtask`, then align main-task ribbon behavior for `no_effort_needed` parents (effort spent should reflect sub-task work only; rollup helpers should treat exempt subs as non–dedicated effort).
todos:
  - id: persist-sub-no-effort
    content: Add no_effort_needed to updateSubtask (+ optional addSubtask default)
    status: completed
  - id: dedicated-effort-flag
    content: Extend subtaskHasDedicatedEffort to return false when no_effort_needed
    status: completed
  - id: main-ribbon-spent
    content: Add taskEffortSpentForRibbon / adjust renderTaskCard for no-effort parents
    status: completed
  - id: sub-ribbon-spent-chip
    content: Add Effort spent meta chip to renderSubtaskCard
    status: completed
  - id: todo-1778301612151-w6i61wndy
    content: Populate the tasks.json file with more random but readable and meaningful data with more recent timelines for the sake of robust manual testing. This is to avoid the developer manually adding content again and again just for the sake of testing.
    status: completed
isProject: false
---

# Fix "No Effort Needed" for sub-tasks and main-task ribbons

## Root cause (sub-task checkbox)

[`updateSubtask`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) lists explicit field updates for `exclude_from_summary` / `exclude_from_export` but **never handles `no_effort_needed`**. The checkbox handler calls `updateSubtask(subTaskId, subId, { no_effort_needed: inp.checked })` ([~3155–3160](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)), so the value is dropped; after `save()` / `render()`, state reloads from disk and the checkbox snaps back.

**Fix:** Add:

```js
if (updates.no_effort_needed !== undefined) s.no_effort_needed = !!updates.no_effort_needed;
```

Place it next to the other exclude flags (~1575–1577). Optionally set `no_effort_needed: !!payload.no_effort_needed` in [`addSubtask`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~1543–1544) for consistency when creating subs via API-style payloads (defaults false).

Main-task updates already work because [`updateTask`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) assigns generic keys (~1391–1396).

---

## Main-task ribbon when parent has `no_effort_needed`

Desired behavior you described:

| Area | Behavior |
|------|----------|
| Effort (required) chip | `—` ([already ~2355–2356](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)) |
| Highlights “Remaining” | `—` ([already ~2391](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)) |
| Effort spent | Should represent **work on sub-tasks only** when the parent is exempt: exclude hours logged on the **main** task’s `progress_updates` so the parent acts as a container. |

**Implementation:** Introduce a small helper, e.g. `taskEffortSpentForRibbon(task)`:

- If `!no_effort_needed`: return existing `taskEffortSpent(task)` (unchanged).
- If `no_effort_needed`: return `taskEffortSpent(task) - sum(progress_effort on task.progress_updates)` (reuse [`progressEffortHours`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) over main progress only).

Use this helper in [`renderTaskCard`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) wherever `effortSpentHrs` / `effortSpentStr` are computed (~2363–2365, and any duplicate `spentTotal` used only for display consistency).

This keeps overall rollup math used for summaries/exports intact while fixing the **list ribbon** display per your spec.

**Optional UX polish (same function):** When `no_effort_needed`, omit the redundant **Effort** meta chip that only shows `—`, and keep **Effort spent** as the sole effort-related chip—reduces noise while matching “only Effort Spent.” Only do this if you want a tighter ribbon; behavior is correct either way.

---

## Rollup: `no_effort_needed` sub-tasks are not “dedicated” planned effort

[`subtaskHasDedicatedEffort`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~725–731) currently keys only off `effort_required_hours > 0`. A sub-task marked **No Effort Needed** can still have stale positive hours in data; it would incorrectly stay on the “dedicated” path for [`taskEffortSpentMainAttributed`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) / [`taskEffortSpentSubOnlyTask`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js).

**Fix:** Return `false` from `subtaskHasDedicatedEffort` when `isTruthyFlag(s.no_effort_needed)` (check before or after the numeric parse). That aligns semantics with “no planned effort tracking” and keeps spent attribution consistent with exempt subs.

---

## Sub-task ribbons: surface spent hours

Sub-task bars show Effort (required) and “Remaining” in highlights ([~2237–2261](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)) but **no “Effort spent” chip**, unlike the main task ([~2379–2380](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)). To match your requirement that sub-level detail lives on sub ribbons, add a **Effort spent** meta chip using existing [`subtaskEffortSpent(s)`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (same formatting pattern as main: `X hrs` / `0 hrs`).

---

## Files to touch

- **[renderer.js](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)** only: `updateSubtask`, `subtaskHasDedicatedEffort`, new ribbon helper + `renderTaskCard`, `renderSubtaskCard`, optionally `addSubtask`.

No schema migration: `normalizeTask` already coerces `s.no_effort_needed` (~374).

---

## Verification (manual)

1. Toggle sub-task **No Effort Needed**, collapse/expand or reload app—checkbox stays checked; ribbon shows `—` for Effort and Remaining where applicable.
2. Main task **No Effort Needed** with sub-tasks that have planned/spent effort: main ribbon shows `—` for required/remaining; **Effort spent** equals sum consistent with sub progress (no double-count from parent progress rows).
3. Sub-task ribbon shows **Effort spent** next to other meta chips.
