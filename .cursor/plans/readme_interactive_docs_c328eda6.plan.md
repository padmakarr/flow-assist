---
name: README interactive docs
overview: Refresh [README.md](README.md) into a scannable, GitHub-friendly user guide by merging the existing accurate reference with product behavior captured across 14 `.cursor/plans/*.plan.md` files—Notes, Relax, reminders, rich text, sub-task UX, calendar day-offs, and drafts—using a table of contents and `<details>` blocks for depth without wall-of-text.
todos:
  - id: verify-drafts-restart
    content: Confirm in renderer.js whether editor drafts persist across app restart (localStorage) before documenting
    status: completed
  - id: draft-readme-outline
    content: "Rewrite README.md: TOC, Quick start views, merged List/Notes/Relax/Calendar sections, details blocks for long export copy"
    status: completed
  - id: polish-consistency
    content: Dedupe table vs prose; align Help menu wording; keep license/dev/build blocks accurate
    status: completed
isProject: false
---

# README: feature guide from plans + interactive layout

## Goals

- **Audience**: People evaluating or learning FlowAssist (not implementers). Lead with value, then **how to use the UI** in a structured way.
- **Sources**: Current [README.md](README.md) (keep license, stack, dev/build, data/schema, export depth where it helps) plus consolidated UX from these plans (all under [.cursor/plans/](.cursor/plans/)): notes shell/data ([notes_tab_and_sub-task_filters](.cursor/plans/notes_tab_and_sub-task_filters_79e4db12.plan.md), [notes_tab_enhancements](.cursor/plans/notes_tab_enhancements_9a4521a5.plan.md), [notes_ui_polish](.cursor/plans/notes_ui_polish_9e95cf0b.plan.md)), modal/focus ([notes_modal_and_todo_ux](.cursor/plans/notes_modal_and_todo_ux_04a981a0.plan.md), [notes_layout_readonly_ux](.cursor/plans/notes_layout_readonly_ux_3638ab03.plan.md)), reminders ([notes_reminders_+_ideas](.cursor/plans/notes_reminders_+_ideas_549d407b.plan.md), [notes_reminder_ui_compact](.cursor/plans/notes_reminder_ui_compact_44a75186.plan.md)), Relax ([notes_reminders_+_ideas](.cursor/plans/notes_reminders_+_ideas_549d407b.plan.md) § Relax), rich text ([rich_wysiwyg_everywhere](.cursor/plans/rich_wysiwyg_everywhere_70377315.plan.md), [task_wysiwyg_description](.cursor/plans/task_wysiwyg_description_5043fa44.plan.md)), list polish ([sub-task_eta_and_effort_pill](.cursor/plans/sub-task_eta_and_effort_pill_c1363196.plan.md), [no_effort_subtask_fix](.cursor/plans/no_effort_subtask_fix_3d0e20ad.plan.md), [task_editor_draft_persistence](.cursor/plans/task_editor_draft_persistence_2653b449.plan.md)), calendar day-offs ([calendar_day_off_ux](.cursor/plans/calendar_day_off_ux_05907801.plan.md)). **Do not** cite plan filenames in the README; treat plans as internal research only.
- **Interactive on GitHub**: Use a **TOC** (anchor links to `##` headings) and **`<details><summary>…</summary>`** for optional depth (export column details, reminder limitations, keyboard/menu). Optional **one small mermaid** diagram for primary views (List → Calendar → Summary → Notes → Relax) and data flow (profile JSON) if it stays readable in dark mode without custom styling.

## Proposed README structure (single file)

1. **Opening** (shorten slightly if needed): one paragraph on local-first JSON, audience, GPLv3 pointer unchanged.
2. **Quick start — where everything lives**: Sidebar / View menu: **List**, **Calendar**, **Summary**, **Notes**, **Relax**; Settings; File menu (profiles). One sentence each.
3. **Table of contents** linking to H2 sections below.
4. **List & tasks** (merge/refine existing “Main list” + “Sub-tasks”):
   - Expand/collapse, status workflow, sorting/filters (keep existing facts).
   - **Rich formatting**: Same mini-markdown dialect across descriptions, progress notes, concerns, add-task and sub-task fields; toolbar + WYSIWYG editing; paste strips to plain text (user-facing wording only—no `renderer.js` API names).
   - **Drafts**: Unsaved typing in expanded task/sub-task/new-sub-task editors can survive **collapse**, **list refilter**, and **switching views** until you save or clear; mention persistence across restart only if the shipped code actually does (plan todos mark localStorage—**verify in [renderer.js](renderer.js) before claiming**).
   - **Sub-tasks**: **View Type** checkboxes (Open / Ongoing / Done / Dropped) next to sort, per main task, saved in profile settings; **ETA** on sub-tasks; **No effort needed** on sub-tasks (persists; rollup/display semantics in plain language); main-task **Effort** chip messaging when parent is exempt (`(Only Main Task)` vs `(All)`); **Effort spent** on ribbons where applicable ([no_effort_subtask_fix](.cursor/plans/no_effort_subtask_fix_3d0e20ad.plan.md), [sub-task_eta_and_effort_pill](.cursor/plans/sub-task_eta_and_effort_pill_c1363196.plan.md)).
5. **Calendar**: Keep chart styles, assigned vs ETA filter, go-to-date; **Day offs**: form + **scrollable list**, **All / Month / Year** browse with arrows, weekday on each line; clarify that browse mode is **calendar UI only**—summary math still uses the selected summary range ([calendar_day_off_ux](.cursor/plans/calendar_day_off_ux_05907801.plan.md)).
6. **Summary & export**: Retain current HTML/CSS vs Confluence sections; add one line that bandwidth/OOO strings use **weekday + date** where shown ([calendar_day_off_ux](.cursor/plans/calendar_day_off_ux_05907801.plan.md)). Move the longest export sub-bullets into a **`<details>`** block labeled “Export layout (HTML/CSS)” to avoid front-loading.
7. **Notes** (new major section—currently missing from README):
   - **Board**: Scratch **notes** vs **todo lists**; auto-save (debounced + flush on blur/hidden); data lives in the profile JSON with tasks/settings.
   - **Grid vs focus**: Grid is **read-only preview** (title/body/todo text); **checklist checkboxes** still toggle from the grid; **click** card chrome/text to open the **focus modal** for full editing, **Add item**, and reminders; long lists show a **truncated preview** with full list in modal ([notes_layout_readonly_ux](.cursor/plans/notes_layout_readonly_ux_3638ab03.plan.md), [notes_modal_and_todo_ux](.cursor/plans/notes_modal_and_todo_ux_04a981a0.plan.md)).
   - **Toolbar**: New note / new list; **session filter** by created date (All / day / month / range); **created** date pill on cards ([notes_tab_enhancements](.cursor/plans/notes_tab_enhancements_9a4521a5.plan.md)).
   - **Reminders**: Per-note schedules (**at date & time** or **in X minutes/hours**); upcoming row in modal; **Add reminder** compact empty state; when due: in-app reminder surface with **Dismiss / Snooze / Open note**; optional OS notification when minimized—**state plainly that reminders require the app to be running** (no OS scheduler) ([notes_reminders_+_ideas](.cursor/plans/notes_reminders_+_ideas_549d407b.plan.md), [notes_reminder_ui_compact](.cursor/plans/notes_reminder_ui_compact_44a75186.plan.md)).
8. **Relax**: Dedicated **Relax** view—break/work timers, wellbeing tips, calm green nav accent; separate from Notes-owned deadlines ([notes_reminders_+_ideas](.cursor/plans/notes_reminders_+_ideas_549d407b.plan.md) Relax section).
9. **Profiles, settings, shell, security**: Keep/adapt existing README bullets; ensure **Help → Documentation** line still matches (README exists; `DOCUMENTATION.md` / `docs/` optional if absent—say “README” as primary).
10. **Stack / Development / Build / Data & schema / License**: Preserve current technical and legal content with minimal edits (fix only if navigation section reorders duplicate content).

## “Interactive” constraints

- Prefer **GitHub-native** interactivity: TOC + `<details>` + mermaid. Avoid relying on JavaScript-only sites.
- Keep the **feature matrix** at the top either tightened or moved below TOC if the new “Quick start” makes it redundant—pick one to avoid repetition.

## Verification before writing copy

- **Grep or read** [renderer.js](renderer.js) for `editorDrafts`, `localStorage`, and `FLOWASSIST_E2E` only if documenting draft persistence across restart—README must match shipped behavior.
- Skim [index.html](index.html) for stable labels (`data-view` values, Notes toolbar control text) so the guide matches the UI strings.

## Out of scope

- New `docs/` site or separate `DOCUMENTATION.md` unless you later ask for it.
- Changing application code or tests; this task is **README content only**.
