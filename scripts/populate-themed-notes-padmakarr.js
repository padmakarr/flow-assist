/**
 * One-off: themed notes/todos for padmakarr-testing-2.fa.json (QA fixture themes).
 */
const fs = require('fs');
const path = require('path');

const PROFILE = path.join(
  __dirname,
  '..',
  '..',
  'padmakarr-testing-2.fa.json'
);

function nid() {
  return 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

const iso = new Date().toISOString();

/** By notes.items index 0..38 */
const patches = [
  // 0–3 notes
  {
    title: 'VIS-QA: mega parent / 24 sub-tasks',
    body:
      'Synthetic parent used for sub-task visibility toggles, sorting, and expand/collapse.\n\nWhen paging or resizing the sub-task viewport, confirm no rows disappear while filters change. Compare expanded vs collapsed counts against the task list totals.'
  },
  {
    title: '[T01] Mixed effort flags under exempt parent',
    body:
      'Main task marked no-effort; sub-tasks mix tracked vs no-effort.\n\nVerify rollups and summary math only include intended rows. Spot-check that exempt parents still show child effort where configured.'
  },
  {
    title: '[T02] All no-effort (main + subs)',
    body:
      'Everything in this fixture should read as zero tracked effort end-to-end.\n\nConfirm list badges, calendar hints, and export columns stay consistent with “no effort” expectations.'
  },
  {
    title: '[T03] Excluded from summary + export',
    body:
      'This task must stay out of aggregate summary and export payloads.\n\nRegression: toggle nearby filters and confirm exclusion survives reload and HTML/markdown export.'
  },
  // 4 todo — export / exclusions
  {
    kind: 'todo',
    title: 'Regression — summary exclusions & export slices',
    body:
      'Batch check [T03], [T22], [T23], [T24], [T42], [T43]: excluded subs, HTML tags, markdown slices.',
    checklistRows: [
      { text: 'Summary totals omit [T03] and sub-exclusion fixtures.', done: true },
      { text: 'Export HTML: escape/render check for [T23].', done: true },
      { text: 'Markdown export slice boundaries for [T24].', done: false },
      { text: '[T42]/[T43] sub-only exclusions in summary vs export.', done: false },
      { text: 'Range overlap sanity on [T22] vs calendar selection.', done: false }
    ]
  },
  // 5 todo — VIS-QA
  {
    kind: 'todo',
    title: 'VIS-QA — viewport & visibility toggles',
    body:
      'Focused pass on the mega parent: filters, sort order, and per-task visibility persistence.',
    checklistRows: [
      { text: 'Expand parent; scroll sub-task viewport; no missing rows.', done: true },
      { text: 'Collapse + re-expand preserves scroll sanity.', done: false },
      { text: 'Flip visibility presets; reload profile; settings stick.', done: false },
      { text: 'Sort subs by title/status; compare against baseline order.', done: false }
    ]
  },
  // 6 todo — calendar density
  {
    kind: 'todo',
    title: 'May calendar density — Mon→Fri cluster',
    body:
      'Uses [T15]–[T19]. Watch for overlap stacking and week/month boundaries around May regression dates.',
    checklistRows: [
      { text: 'Mon [T15]: density bar matches task count.', done: true },
      { text: 'Tue–Wed [T16]/[T17]: no duplicate chips.', done: false },
      { text: 'Thu–Fri [T18]/[T19]: overflow tooltip readable.', done: false },
      { text: 'Cross-check week strip vs List view for same IDs.', done: false }
    ]
  },
  // 7 todo — filters / hooks
  {
    kind: 'todo',
    title: 'List filters + bandwidth hooks',
    body:
      'Pair [T26] Today / [T27] Yesterday with bandwidth hooks [T20]/[T21] and daily formatted [T25].',
    checklistRows: [
      { text: 'Today filter: expected subset only.', done: true },
      { text: 'Yesterday filter: no stray midnight-boundary tasks.', done: false },
      { text: 'Bandwidth hooks A/B: ordering stable when toggling filters.', done: false },
      { text: 'Daily formatted hook still fires after filter change.', done: false }
    ]
  },
  // 8 todo — notifications / ETA
  {
    kind: 'todo',
    title: 'Notifications & ETA pressure spots',
    body:
      'Cover [T29] notifications, same-day [T48], and month-end pressure [T49]/[T50].',
    checklistRows: [
      { text: '[T29] “ETA soon” surfaces without duplicate banners.', done: true },
      { text: '[T48] same-day May 9 handling vs calendar dot.', done: false },
      { text: '[T49]/[T50] May 30–31 ordering under load.', done: false },
      { text: 'No false positives when archive mix [T28] enabled.', done: false },
      { text: 'Spot-check stale vs idle pair [T31]/[T32].', done: false }
    ]
  },
  // 9–14 notes
  {
    title: '[T04] Done + archived (May close)',
    body:
      'Represents completed work kept for archive tab scenarios.\n\nConfirm archived styling does not leak into active lists; reopen path matches [T35] expectations if toggled.'
  },
  {
    title: '[T05] Dropped main task',
    body:
      'Dropped parent state should stay visually distinct from Done.\n\nRegression: export and summary treat dropped mains per product rules without affecting sibling fixtures.'
  },
  {
    title: '[T06] ETA slip + effort increase',
    body:
      'Use when testing ETA drift and upward effort adjustments.\n\nVerify timeline annotations and any “effort increased” hints stay in sync after edits.'
  },
  {
    title: '[T07] Open + addressed concerns',
    body:
      'Concern workflow mix: open items vs addressed.\n\nCheck badges, filters that surface “needs attention”, and that addressed rows drop out of alert-style views.'
  },
  {
    title: '[T08] Multi-category progress',
    body:
      'Multiple categories on one logical thread.\n\nEnsure category chips filter correctly and progress rollups do not double-count shared parents.'
  },
  {
    title: '[T09] Multiple bug IDs',
    body:
      'Several external IDs attached.\n\nConfirm search-by-ID, copy/export formatting, and tooltip truncation on narrow layouts.'
  },
  // 15 todo — 10 rows (fill existing ids only via merge)
  {
    kind: 'todo',
    title: 'Archive / tags / multi-project sweep',
    body:
      'Wide checklist for mixed fixtures: archive tab [T28], tags [T36]/[T37], multi-project [T38]/[T39], rollup [T44]–[T46].',
    checklistRows: [
      { text: 'VIS-QA parent: 24 subs visible when expanded.', done: true },
      { text: 'Per-task sub visibility persisted after reload.', done: false },
      { text: '[T28] Archive tab mix—done/dropped/open buckets.', done: true },
      { text: '[T36] #default vs [T37] #sprint filters.', done: false },
      { text: '[T38] SR100 vs [T39] F16 cross-project headers.', done: true },
      { text: '[T44] Three subs rollup totals.', done: false },
      { text: '[T45] Dedicated sub effort split vs parent.', done: false },
      { text: '[T46] Zero-hour main progress-only edge.', done: false },
      { text: '[T30] Partial day-off math vs calendar hours.', done: false },
      { text: '[T35] Re-open styling after drop.', done: false }
    ]
  },
  // 16–35 notes
  {
    title: '[T10] Very Hard / P10 priority bar color',
    body:
      'Stress-test priority visualization.\n\nConfirm bar color slot P10 remains readable in dark/light assumptions and does not collide with warning hues used elsewhere.'
  },
  {
    title: '[T11]–[T14] May week — kickoff through exec',
    body:
      'Week-of-May placeholders for planning vs execution density.\n\nUse when validating week strip summaries and “May regression” labeling in UI copy.'
  },
  {
    title: '[T15]–[T19] Calendar density Mon→Fri',
    body:
      'One task per weekday cluster to overload the calendar strip.\n\nLook for clipping, tooltips, and hover affordances when multiple fixtures share the same day.'
  },
  {
    title: '[T20]/[T21] Bandwidth hooks A & B',
    body:
      'Hook ordering experiments.\n\nAfter navigation or filter changes, bandwidth-derived hints should remain deterministic for comparisons across sessions.'
  },
  {
    title: '[T22] Summary range overlap',
    body:
      'Overlapping summary windows vs calendar selection.\n\nVerify counts do not duplicate tasks straddling boundary dates.'
  },
  {
    title: '[T23]/[T24] Export — HTML tags & markdown slice',
    body:
      'HTML export must not execute injected tags; markdown slice should respect start/end markers.\n\nCompare rendered preview with raw export output.'
  },
  {
    title: '[T25] Daily formatted hook',
    body:
      'Daily rollup narrative / formatted block.\n\nCheck timezone edges near midnight and DST-free May fixtures.'
  },
  {
    title: '[T26]/[T27] List filters — Today / Yesterday',
    body:
      'Relative date filters.\n\nValidate boundary at local midnight and that tasks exactly on boundary appear only once.'
  },
  {
    title: '[T29] Notifications — ETA soon',
    body:
      'Soon-ETA banner / toast behavior.\n\nEnsure suppressed when task marked done or dropped; no spam on refresh.'
  },
  {
    title: '[T30] Partial day-off math',
    body:
      'Fractional availability.\n\nCapacity calculations should reflect partial day-off without breaking weekly totals.'
  },
  {
    title: '[T31]/[T32] Ongoing stale vs open idle',
    body:
      'Contrast long-running ongoing vs idle open tasks.\n\nStale indicators should track last activity fields if surfaced.'
  },
  {
    title: '[T33]/[T34]/[T35] Done no archive / dropped late / re-open',
    body:
      'Lifecycle edges.\n\n[Dropped late] vs [done without archive] vs [re-open style] should stay visually distinct in list + archive surfaces.'
  },
  {
    title: '[T36]/[T37] Tags — #default vs #sprint',
    body:
      'Tag facets for filtering and export.\n\nCollision tests with category-only fixtures below.'
  },
  {
    title: '[T38]/[T39] Multi-project SR100 & F16',
    body:
      'Cross-project identifiers on one profile.\n\nEnsure project headers/group-bys remain stable when sorting.'
  },
  {
    title: '[T40]/[T41] Category-only — Design / Meeting',
    body:
      'Tasks that exist purely as category probes.\n\nEmpty or minimal descriptions should still list correctly under category-only filters.'
  },
  {
    title: '[T42]/[T43] Sub exclude — summary vs export only',
    body:
      'Subs excluded from summary only or export only.\n\nRegression matrix: toggle each flag independently and re-export.'
  },
  {
    title: '[T44]/[T45]/[T46] Rollups — three subs / split effort / zero-hour main',
    body:
      'Rollup arithmetic torture tests.\n\nThree-sub rollup vs dedicated sub effort split vs zero-hour main progress-only — totals must reconcile with inspector.'
  },
  {
    title: '[T47] Large description rendered short',
    body:
      'Very long description body with abbreviated display.\n\nExpand/collapse and tooltip preview should stay performant with markdown-ish noise.'
  },
  {
    title: '[T48]/[T49]/[T50] ETA — same day & month-end pressure',
    body:
      'Same-day May 9 vs heavy load May 30–31.\n\nCalendar + list should agree on ordering under “pressure” sorting if enabled.'
  },
  {
    title: '[T28] Archive tab mix',
    body:
      'Mixed statuses coexisting in archive-oriented views.\n\nArchive tab chips should not resurrect dropped tasks into active swimlanes.'
  },
  // 36 todo — 16 rows
  {
    kind: 'todo',
    title: 'Full May regression — ordered smoke list',
    body:
      'Long checklist spanning fixtures T01–T50 + VIS-QA; use as session guide, not blocking.',
    checklistRows: [
      { text: 'Load profile cold start; no console errors.', done: true },
      { text: 'VIS-QA expand/collapse + viewport scroll.', done: true },
      { text: '[T01]/[T02] effort exemption matrix.', done: false },
      { text: '[T03]/[T42]/[T43] exclusions throughout.', done: false },
      { text: '[T04]/[T05]/[T33]–[T35] lifecycle visuals.', done: false },
      { text: '[T06]/[T07] ETA + concerns.', done: false },
      { text: '[T08]/[T09]/[T10] categories / bugs / P10 bar.', done: false },
      { text: '[T11]–[T14] May week labels.', done: false },
      { text: '[T15]–[T19] calendar density.', done: false },
      { text: '[T20]/[T21]/[T25] hooks.', done: false },
      { text: '[T22]–[T24] summary + exports.', done: false },
      { text: '[T26]/[T27] date filters.', done: false },
      { text: '[T29]/[T48]–[T50] notifications & ETA pressure.', done: false },
      { text: '[T30]–[T32] math + staleness.', done: false },
      { text: '[T36]–[T41] tags & categories.', done: false },
      { text: '[T44]–[T47] rollups & large text.', done: false }
    ]
  },
  // 37–38 notes
  {
    title: 'Profile QA — padmakarr-testing-2 load sanity',
    body:
      'This JSON is a deliberate torture fixture for FlowAssist.\n\nAfter edits, always File → Load Profile and confirm Notes board renders without normalization warnings.'
  },
  {
    title: 'Regression notes — how to use this board',
    body:
      'Prefer linking mentally from a note to its matching task title (e.g. search “[T17]”).\n\nTodos above are actionable sweeps; free-form notes capture observations while clicking through May scenarios.'
  }
];

function buildPatchItem(p) {
  const base = { color: '', updatedAt: iso };
  if (p.kind === 'todo') {
    return {
      id: nid(),
      kind: 'todo',
      title: p.title,
      body: p.body,
      checklist: (p.checklistRows || []).map(function (r) {
        return { id: nid(), text: r.text, done: r.done };
      }),
      ...base
    };
  }
  return {
    id: nid(),
    kind: 'note',
    title: p.title,
    body: p.body,
    checklist: [],
    ...base
  };
}

function apply() {
  const raw = fs.readFileSync(PROFILE, 'utf8');
  const data = JSON.parse(raw);
  const items = data.notes.items;

  if (items.length === 0) {
    data.notes.items = patches.map(buildPatchItem);
    fs.writeFileSync(PROFILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log('OK wrote', PROFILE, '(' + data.notes.items.length + ' new items)');
    return;
  }

  if (items.length !== patches.length) {
    console.error(
      'Expected 0 or',
      patches.length,
      'notes.items, got',
      items.length,
      '(clear notes.items to regenerate from scratch)'
    );
    process.exit(1);
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const p = patches[i];
    if (p.kind === 'todo' || item.kind === 'todo') {
      if (item.kind !== 'todo') throw new Error('kind mismatch at ' + i);
      item.title = p.title;
      item.body = p.body;
      item.updatedAt = iso;
      const rows = p.checklistRows;
      const existing = item.checklist || [];
      if (rows.length < existing.length) {
        throw new Error('Patch rows < existing at ' + i);
      }
      for (let r = 0; r < rows.length; r++) {
        const rowPatch = rows[r];
        if (r < existing.length) {
          existing[r].text = rowPatch.text;
          existing[r].done = rowPatch.done;
        } else {
          existing.push({
            id: nid(),
            text: rowPatch.text,
            done: rowPatch.done
          });
        }
      }
      item.checklist = existing;
    } else {
      if (item.kind !== 'note') throw new Error('note expected at ' + i);
      item.title = p.title;
      item.body = p.body;
      item.updatedAt = iso;
    }
  }
  fs.writeFileSync(PROFILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('OK wrote', PROFILE);
}

apply();
