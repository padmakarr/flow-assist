---
name: Calendar Day Off UX
overview: Add a scrollable day-off list in Calendar view, month/year/all browsing with arrow navigation, weekday labels on each entry, and align Summary + HTML export bandwidth/OOO text to include the same weekday formatting (summary range logic unchanged).
todos:
  - id: html-css-scroll
    content: Add day-off list scroll wrapper + CSS max-height/overflow-y in index.html + styles.css
    status: completed
  - id: browse-ui-state
    content: Add All/Month/Year UI, state fields, prev/next handlers; refactor refreshCalendarDayOffList filter/sort
    status: completed
  - id: weekday-helper-list
    content: Add weekdayShortFromYMD and use in calendar list rows
    status: completed
  - id: summary-export-weekday
    content: Update computeBandwidthUtilized strings + formatOooExportDetailLine (+ optional Confluence OOO bullets)
    status: completed
isProject: false
---

# Calendar Day Offs list + Summary parity

## Context

- Day offs live in [`settings.dayOffs`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (same source everywhere).
- The list is rendered in [`refreshCalendarDayOffList`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~3753) into `#calendar-dayoff-list` ([`index.html`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html) ~342–363).
- With **Basic** calendar layout, [`#view-calendar.calendar-basic-fill`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) uses `overflow: hidden`806–807 while the grid grows in `#calendar-container`; a long `#calendar-dayoff-list` has **no max-height**, so the panel can extend past the visible viewport without its own scrollbar—fix by giving the **list** an internal scroll region, not by changing global calendar overflow.

## 1. Scrollable day-off list

- In [`index.html`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html), wrap `#calendar-dayoff-list` in a container, e.g. `#calendar-dayoff-list-scroll`, placed **below** the new controls row (see §2).
- In [`styles.css`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) (~3439+), style that wrapper with something like `max-height: min(45vh, 360px)` (tunable), `overflow-y: auto`, optional `-webkit-overflow-scrolling: touch`, and keep list padding/margins so the scrollbar feels attached to the list only.

## 2. Browse mode: All / Month / Year + arrows

**Semantics (recommended)**

| Mode | List contents | Navigation |
|------|----------------|------------|
| **All** | Every logged day off, sorted ascending by `date` | No prev/next (or hide nav) |
| **Month** | Entries where `o.date` starts with `YYYY-MM` for the selected month | ◀ ▶ change month; label e.g. “May 2026” |
| **Year** | Entries where `o.date` starts with `YYYY-` for the selected year | ◀ ▶ change year; label e.g. “2026” |

- Add UI in the day-off panel (new row between form and scroll wrapper): a `<select>` or segmented control for **All / Month / Year**, plus a compact **nav group** (reuse styling patterns from [`calendar-nav-group`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html) ~321–324): prev button, `#calendar-dayoff-period-label`, next button. Show nav only when mode is Month or Year.
- **State** (in-memory on `state`, next to [`calendarFocusDate`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) ~919): e.g. `dayOffBrowseMode` (`'all' \| 'month' \| 'year'`), `dayOffBrowseYM` (string `'YYYY-MM'` for month mode), `dayOffBrowseYear` (number for year mode). Initialize Month/Year from `state.calendarFocusDate` on first open or when switching mode so it matches what the user is already looking at on the calendar.
- Refactor **`refreshCalendarDayOffList`** to: read `getSettings().dayOffs`, **filter** by mode, **sort** by date, then render `<li>`s. Empty filtered set: show a muted line like “No day offs in this month.” (not “No day offs logged.”).
- Wire change handlers: mode select, prev/next (use `Date` arithmetic for month/year boundaries so Feb/leap years are correct).

## 3. Weekday on each calendar list row

- Add a small helper, e.g. `weekdayShortFromYMD(ymd)`, using existing [`parseYMD`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) / `Date` and `toLocaleDateString('en-US', { weekday: 'short' })` (or project locale if you standardize elsewhere).
- Update each list line format from raw `o.date` to something like: **`Mon · 2026-05-07 · PTO · Full day`** (order can match your preference; keep reason/type text from current [`refreshCalendarDayOffList`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) lines ~3761–3765).

## 4. Summary + export: same weekday detail (range logic unchanged)

**Important:** Summary **bandwidth / OOO math** stays tied to the **summary From–To range** ([`computeBandwidthUtilized`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) ~1135–1196). The new calendar **browse mode does not filter** summary output—only the calendar list UI.

Do align **wording** wherever dates are shown:

1. **`computeBandwidthUtilized`** — When building strings passed to `noteReason` (~1171–1177), include the short weekday for that calendar day (the loop already has a `Date` `d`; use it so timezone matches `ymd`). Example shape: `2026-05-07 Wed (full day)` / partial line similarly.

2. **HTML/CSS export OOO breakdown** — Extend [`formatOooExportDetailLine`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~4194–4204) to include the same weekday next to the formatted date (reuse `weekdayShortFromYMD`).

3. **On-screen Summary bandwidth table** — It already uses `bw.ptoStr` / `sickStr` / `otherStr` from `computeBandwidthUtilized` (~5829–5842); no separate template change once (1) is done.

4. **Confluence markdown** — Today only the aggregate line `- **OOO:** …` appears (~5266). Optional parity: add a short bullet list under Bandwidth for each OOO entry in range (same sort as export), each line including weekday—only if you want export-like detail in markdown; otherwise (1)–(3) satisfy “summary strings include weekday.”

## 5. Files to touch

| File | Changes |
|------|---------|
| [`index.html`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html) | Day-off browse controls + scroll wrapper around list |
| [`styles.css`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) | Scroll area, optional toolbar row layout for day-off nav |
| [`renderer.js`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) | State, `refreshCalendarDayOffList`, event listeners, `weekdayShortFromYMD`, `computeBandwidthUtilized`, `formatOooExportDetailLine`, optional Confluence OOO bullets |

## 6. Testing checklist

- Log many day offs (more than ~15); expand Day offs panel; list scrolls inside wrapper; calendar grid still usable.
- Month mode: arrows move across months; list filters correctly; weekday matches OS calendar for sample dates.
- Year mode: arrows change year.
- Generate Summary for a range overlapping logged offs: PTO/Sick/Other cells show weekdays; HTML export “OOO details” matches.
