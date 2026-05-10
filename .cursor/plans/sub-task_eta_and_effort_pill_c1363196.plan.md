---
name: Sub-task ETA and Effort pill
overview: "Restore sub-task ETA editing (form field + persistence) independent of the main task, and replace the hidden main-task Effort chip with explicit ribbon text when the parent is exempt: \"(Only Main Task)\" vs \"(All)\" based on whether every sub-task is also marked No Effort Needed."
todos:
  - id: eta-model-ui
    content: Add sub-task eta normalize, addSubtask/updateSubtask, ETA input + save wiring
    status: completed
  - id: eta-ribbon
    content: "Optional: ETA meta chip on sub-task ribbon"
    status: completed
  - id: effort-pill-labels
    content: Helper + renderTaskCard Effort chip for no_effort_needed parents
    status: completed
isProject: false
---

# Sub-task ETA restoration and main Effort ribbon labels

## Problem summary

1. **ETA “removed”**: [`renderSubtaskCard`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) sub-task details grid (~2326–2332) includes Assigned and Effort but **no ETA input**. The model already uses `s.eta` elsewhere (`daysUntilDeadline(s.eta)`, summary/notifications). [`updateSubtask`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~1566–1595) has no `updates.eta` branch; [`addSubtask`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~1545–1562) does not set `eta`. So ETAs cannot be edited from the UI even though data may exist.

2. **Main Effort pill**: [`renderTaskCard`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~2399–2402) **omits** the Effort chip entirely when `task.no_effort_needed`. You want it **visible** with scoped messaging instead.

---

## 1. Sub-task ETA (data + UI)

| Step | Change |
|------|--------|
| **Normalize** | In [`normalizeTask`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) sub-task loop (~362–388), set `s.eta = s.eta != null && String(s.eta).trim() !== '' ? String(s.eta).trim().slice(0, 10) : ''` (or equivalent) so loaded tasks always have a stable `eta` field. |
| **addSubtask** | Add `eta: (payload.eta != null && String(payload.eta).trim()) ? String(payload.eta).trim().slice(0, 10) : ''`. |
| **updateSubtask** | Add `if (updates.eta !== undefined) s.eta = (updates.eta != null && String(updates.eta).trim()) ? String(updates.eta).trim().slice(0, 10) : '';` |
| **renderSubtaskCard** | In the sub-task details grid, add an ETA row mirroring the main task pattern (e.g. after Assigned): `<label>ETA <input type="date" class="subtask-detail-eta" value="' + escapeHtml(s.eta || '') + '" placeholder="YYYY-MM-DD"></label>`. |
| **Save handler** | In the `.save-subtask-details-btn` block (~3256–3258), read `subCard.querySelector('.subtask-detail-eta')`, pass `eta` into `updateSubtask` alongside existing fields. |

**Optional parity**: Add an **ETA** meta chip on the sub-task ribbon (`subMetaChips`), matching the main task’s [`meta-chip-eta`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) pattern (~2397–2398), so ETA is visible without expanding details. Recommended for consistency with main-task ribbons.

---

## 2. Main-task Effort pill when parent has No Effort Needed

Introduce a small helper (e.g. `mainTaskEffortChipValue(task)`) used only when `isTruthyFlag(task.no_effort_needed)`:

- Let `subs = task.subtasks || []`.
- If **`subs.length === 0`**: treat as **only main** scope → display value **`— (Only Main Task)`** (matches “only main exempt”; no subtasks to contradict).
- Else if **every** sub-task has `no_effort_needed` → **`— (All)`**.
- Else (at least one sub-task still tracks effort) → **`— (Only Main Task)`**.

**Ribbon markup**: Stop skipping the Effort chip when `no_effort_needed`. Always include the Effort meta chip for exempt parents; set **meta-value** to the helper output above (label remains **Effort**). Use the same styling classes as today (`default-value` where appropriate).

Copy can follow your wording with minor normalization for the chip (e.g. hyphen vs em dash); keep strings grep-friendly: `(Only Main Task)` and `(All)`.

---

## 3. Files to touch

- **[renderer.js](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js)** only: `normalizeTask`, `addSubtask`, `updateSubtask`, `renderSubtaskCard`, save handler, `renderTaskCard` + helper.

No migration required beyond normalize-on-load for `eta`.

---

## 4. Verification

- Sub-task: set ETA in details, Save, collapse/expand or reload — ETA persists and appears in highlights/deadline strip.
- Main task with No Effort Needed, no subtasks — Effort chip shows **`— (Only Main Task)`**.
- Main exempt, all subs exempt — **`— (All)`**.
- Main exempt, at least one sub not exempt — **`— (Only Main Task)`**.
