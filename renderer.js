(function () {
  'use strict';

  if (window.taskAPI && window.taskAPI.debugMode) {
    window.__FLOWASSIST_DEBUG__ = true;
    console.log('[DBG] Debug mode activated via preload. taskAPI.debugMode =', window.taskAPI.debugMode);
  } else {
    console.log('[DBG] taskAPI present:', !!(window.taskAPI), '| debugMode flag:', window.taskAPI && window.taskAPI.debugMode);
  }

  try {
    var savedTheme = localStorage.getItem('flowassist_theme');
    if (savedTheme) {
      document.body.classList.remove('theme-classic', 'theme-refined');
      document.body.classList.add('theme-' + savedTheme);
    }
  } catch (e) {}

  var DEFAULT_PRIORITY_COLORS = {
    '1': '#2e4a6e', '2': '#2e4a6e', '3': '#2e4a6e', '4': '#2e4a6e',
    '5': '#7a5c2e', '6': '#7a5c2e', '7': '#7a5c2e', '8': '#7a5c2e',
    '9': '#7a3d3d', '10': '#7a3d3d'
  };

  var SVG_ICON_EDIT = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L3.463 11.098a.25.25 0 00-.064.108l-.631 2.21 2.21-.632a.25.25 0 00.108-.063l8.61-8.61a.25.25 0 000-.354l-1.086-1.086z"/></svg>';
  var SVG_ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>';
  var SVG_ICON_CHEVRON_DOWN = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/></svg>';

  var DEFAULT_CATEGORIES = ['Design', 'DV', 'Support', 'Debug', 'Meeting', 'Skillup'];

  var DEFAULT_SETTINGS = {
    priorityColors: Object.assign({}, DEFAULT_PRIORITY_COLORS),
    categories: DEFAULT_CATEGORIES.slice(),
    projects: [],
    workingHoursPerDay: 8,
    dayOffs: [],
    theme: 'classic',
    /** Notes board: how many columns when the Notes panel is wide (1–5). Narrow layouts still collapse to one column. */
    notesGridColumns: 5,
    /** Relax tab defaults (wellbeing / break timers). */
    relax: {
      breakPresetMinutes: 10,
      workPresetMinutes: 25,
      soundEnabled: false,
      tipIndex: 0
    }
  };

  var TASK_DIFFICULTY_LEVELS = ['Very Easy', 'Easy', 'Moderate', 'Hard', 'Very Hard'];
  var DEFAULT_TASK_DIFFICULTY = 'Easy';

  function normalizeTaskDifficulty(raw) {
    var v = raw != null ? String(raw).trim() : '';
    if (TASK_DIFFICULTY_LEVELS.indexOf(v) !== -1) return v;
    return DEFAULT_TASK_DIFFICULTY;
  }

  function getProjectList() {
    var list = state.data.settings && state.data.settings.projects;
    if (!Array.isArray(list)) return [];
    return list.map(function (p) { return String(p).trim(); }).filter(Boolean);
  }

  function renderProjectBarChip(project) {
    var p = project != null ? String(project).trim() : '';
    if (!p) return '';
    return '<span class="task-bar-project-pill" role="text" aria-label="Project">' + escapeHtml(p) + '</span>';
  }

  /** Optional project label for summaries / export (className e.g. 'export-project-pill' for HTML export). */
  function summaryProjectPillHtml(project, pillClass) {
    var p = project != null ? String(project).trim() : '';
    if (!p) return '';
    var cls = pillClass || 'summary-project-pill';
    return '<span class="' + cls + '">' + escapeHtml(p) + '</span>';
  }

  /** Pink pill: sub-task progress rolls into main task totals (no dedicated planned effort on sub-task). */
  function summaryIncludedPillHtml(pillClass) {
    var cls = pillClass || 'summary-included-pill';
    return '<span class="' + cls + '">Included</span>';
  }

  function renderProjectSelectInnerHtml(selectedValue) {
    var sel = selectedValue != null ? String(selectedValue).trim() : '';
    var list = getProjectList();
    var html = '<option value=""' + (!sel ? ' selected' : '') + '>None</option>';
    var seen = {};
    list.forEach(function (p) {
      if (!p || seen[p]) return;
      seen[p] = true;
      html += '<option value="' + escapeHtml(p) + '"' + (p === sel ? ' selected' : '') + '>' + escapeHtml(p) + '</option>';
    });
    if (sel && !seen[sel]) {
      html += '<option value="' + escapeHtml(sel) + '" selected>' + escapeHtml(sel) + '</option>';
    }
    return html;
  }

  function renderProjectSelectHtml(selectedValue, elementId) {
    var idAttr = elementId ? ' id="' + escapeHtml(elementId) + '"' : '';
    return '<select class="task-project-select"' + idAttr + ' aria-label="Project">' +
      renderProjectSelectInnerHtml(selectedValue) + '</select>';
  }

  function syncAddTaskProjectSelect() {
    var el = document.getElementById('task-project');
    if (!el) return;
    var prev = el.value || '';
    el.innerHTML = renderProjectSelectInnerHtml(prev);
  }

  function getCategoryList() {
    var list = state.data.settings && state.data.settings.categories;
    if (Array.isArray(list) && list.length > 0) return list;
    return DEFAULT_CATEGORIES.slice();
  }

  function renderCategoryDropdownHtml(selectedArr, idPrefix, options) {
    options = options || {};
    var plainBtn = !!options.plainButton;
    var list = getCategoryList();
    var selected = selectedArr || [];
    var label = selected.length ? selected.join(', ') : '—';
    var idAttr = idPrefix ? ' id="' + escapeHtml(idPrefix) + '"' : '';
    var plainAttr = plainBtn ? ' data-category-btn-plain="true"' : '';
    var btnText = plainBtn ? escapeHtml(label) : ('Category: ' + escapeHtml(label));
    var html = '<div class="category-dropdown-wrap"' + idAttr + plainAttr + '>' +
      '<button type="button" class="category-dropdown-btn" title="Category">' + btnText + '</button>' +
      '<div class="category-dropdown-panel">' +
      list.map(function (cat) {
        var checked = selected.indexOf(cat) !== -1;
        return '<label class="category-checkbox-label"><input type="checkbox" class="category-checkbox" value="' + escapeHtml(cat) + '"' + (checked ? ' checked' : '') + '> ' + escapeHtml(cat) + '</label>';
      }).join('') +
      '</div></div>';
    return html;
  }

  /** Categories for a progress update (supports legacy single `category` until normalized). */
  function progressUpdateCategoriesArray(p) {
    if (!p) return [];
    if (Array.isArray(p.categories) && p.categories.length) {
      return p.categories.map(function (c) { return String(c).trim(); }).filter(Boolean);
    }
    if (p.category != null && String(p.category).trim()) {
      var leg = String(p.category).trim();
      if (leg.indexOf(',') >= 0) {
        return leg.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      }
      return [leg];
    }
    return [];
  }

  /** Preserve newlines for summary/export; optional max length (characters). */
  function formatProgressSummaryTextHtml(raw, maxLen) {
    var s = (raw == null ? '' : String(raw)).trim();
    if (!s) return '';
    if (maxLen != null && maxLen > 0 && s.length > maxLen) {
      s = s.slice(0, maxLen) + '…';
    }
    return formatRichDescription(s);
  }

  /** One pill per category (Included-style), for summary / export progress rows. */
  function summaryProgressCategoryPillsHtml(categories, pillClass) {
    var cls = pillClass || 'summary-progress-category-pill';
    return (categories || []).map(function (c) {
      var t = String(c).trim();
      if (!t) return '';
      return '<span class="' + cls + '">' + escapeHtml(t) + '</span>';
    }).join('');
  }

  function summaryProgressEffortHtml(p, spanClass) {
    var sc = spanClass || 'summary-progress-effort';
    if (p.effort_consumed_hours == null || p.effort_consumed_hours === '') return '';
    return '<span class="' + sc + '">' + escapeHtml(String(p.effort_consumed_hours)) + ' hrs</span>';
  }

  /** Summary detailed card: line 1 = number, category pills, effort; line 2 = indented description only. */
  function renderSummaryProgressLiHtml(p, indexZeroBased, maxDescLen) {
    var num = '<span class="summary-progress-li-num">' + escapeHtml(String(indexZeroBased + 1) + '.') + '</span>';
    var pills = summaryProgressCategoryPillsHtml(progressUpdateCategoriesArray(p));
    var effort = summaryProgressEffortHtml(p);
    var line1 = '<div class="summary-progress-line1">' + num + pills + effort + '</div>';
    var desc = formatProgressSummaryTextHtml(p.text, maxDescLen);
    var line2 = desc ? '<div class="summary-progress-desc">' + desc + '</div>' : '';
    return '<li class="summary-progress-item">' + line1 + line2 + '</li>';
  }

  /** Same layout as task/sub-task details: label left, checkbox dropdown (plain button text). */
  function renderProgressCategoryRowHtml(selectedArr, idPrefix) {
    var cats = Array.isArray(selectedArr) ? selectedArr.filter(Boolean) : [];
    return '<div class="task-detail-category-wrap progress-category-row">' +
      '<span class="task-detail-label">Category</span>' +
      renderCategoryDropdownHtml(cats, idPrefix, { plainButton: true }) +
      '</div>';
  }

  function getSelectedCategoriesFromWrap(wrapEl) {
    if (!wrapEl) return [];
    var checked = wrapEl.querySelectorAll('.category-checkbox:checked');
    return Array.prototype.map.call(checked, function (cb) { return cb.value; });
  }

  function bindCategoryDropdownInWrap(containerOrWrapEl) {
    var wrap = (containerOrWrapEl && containerOrWrapEl.classList && containerOrWrapEl.classList.contains('category-dropdown-wrap'))
      ? containerOrWrapEl
      : (containerOrWrapEl && containerOrWrapEl.querySelector ? containerOrWrapEl.querySelector('.category-dropdown-wrap') : null);
    if (!wrap) return;
    var btn = wrap.querySelector('.category-dropdown-btn');
    var checkboxes = wrap.querySelectorAll('.category-checkbox');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        wrap.classList.toggle('open');
      });
    }
    function updateBtnLabel() {
      var sel = getSelectedCategoriesFromWrap(wrap);
      if (btn) {
        var plain = wrap.getAttribute('data-category-btn-plain') === 'true';
        btn.textContent = plain ? (sel.length ? sel.join(', ') : '—') : ('Category: ' + (sel.length ? sel.join(', ') : '—'));
      }
    }
    Array.prototype.forEach.call(checkboxes, function (cb) {
      cb.addEventListener('change', updateBtnLabel);
    });
    updateBtnLabel();
  }

  function setCategoryDropdownSelection(wrapEl, selectedArr) {
    if (!wrapEl) return;
    var sel = selectedArr || [];
    wrapEl.querySelectorAll('.category-checkbox').forEach(function (cb) {
      cb.checked = sel.indexOf(cb.value) !== -1;
    });
    var btn = wrapEl.querySelector('.category-dropdown-btn');
    if (btn) {
      var plain = wrapEl.getAttribute('data-category-btn-plain') === 'true';
      btn.textContent = plain ? (sel.length ? sel.join(', ') : '—') : ('Category: ' + (sel.length ? sel.join(', ') : '—'));
    }
  }

  function resetCategoryDropdownWrap(wrapEl) {
    setCategoryDropdownSelection(wrapEl, []);
  }

  function getDefaultPriorityColor(priority) {
    var p = Math.min(10, Math.max(1, parseInt(priority, 10) || 1));
    return DEFAULT_PRIORITY_COLORS[String(p)] || '#2e4a6e';
  }

  function getPriorityColor(priority, settings) {
    var colors = (settings && settings.priorityColors) || DEFAULT_PRIORITY_COLORS;
    var p = Math.min(10, Math.max(1, parseInt(priority, 10) || 1));
    if (colors[String(p)]) return colors[String(p)];
    if (p <= 4) return colors['1-4'] || colors['1'] || '#2e4a6e';
    if (p <= 8) return colors['5-8'] || colors['5'] || '#7a5c2e';
    return colors['9-10'] || colors['9'] || '#7a3d3d';
  }

  function darkenColor(hex, factor) {
    if (!hex || typeof hex !== 'string') return hex;
    hex = hex.replace(/^#/, '');
    if (hex.length !== 6) return hex;
    var r = Math.max(0, Math.floor(parseInt(hex.slice(0, 2), 16) * factor));
    var g = Math.max(0, Math.floor(parseInt(hex.slice(2, 4), 16) * factor));
    var b = Math.max(0, Math.floor(parseInt(hex.slice(4, 6), 16) * factor));
    return '#' + [r, g, b].map(function (x) {
      var s = x.toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }

  function generateId() {
    return 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function parseBugNumbers(input) {
    if (!input || typeof input !== 'string') return [];
    return input.split(',').map(function (s) { return parseInt(s.trim(), 10); }).filter(function (n) { return !isNaN(n); });
  }

  function createTask(overrides) {
    var o = overrides || {};
    var now = new Date();
    var today = now.toISOString().slice(0, 10);
    var bugNums = o.bug_numbers;
    if (bugNums == null && o.bug_number !== undefined && o.bug_number !== '' && o.bug_number !== 0) {
      bugNums = [].concat(o.bug_number);
    }
    if (!Array.isArray(bugNums)) bugNums = [];
    var assigned_date = o.assigned_date || today;
    var statusVal = o.status || 'Open';
    var done_date = o.done_date || '';
    var status_changes = Array.isArray(o.status_changes) ? o.status_changes.slice() : [];
    var t = {
      id: o.id || generateId(),
      title: o.title || 'Untitled',
      description: o.description ?? '',
      priority: Math.min(10, Math.max(1, (o.priority != null ? o.priority : 1))),
      tags: Array.isArray(o.tags) ? o.tags : (o.tags ? [o.tags] : ['#default']),
      assigned_date: assigned_date,
      eta: o.eta ?? '',
      effort_required_hours: o.effort_required_hours ?? 1,
      bug_numbers: bugNums,
      status: statusVal,
      difficulty: normalizeTaskDifficulty(o.difficulty),
      created_at: o.created_at || now.toISOString(),
      progress_updates: o.progress_updates || [],
      eta_updates: o.eta_updates || [],
      effort_updates: o.effort_updates || [],
      concerns: o.concerns || [],
      subtasks: o.subtasks || [],
      categories: Array.isArray(o.categories) ? o.categories.slice() : [],
      project: (o.project != null && String(o.project).trim()) ? String(o.project).trim() : '',
      done_date: done_date,
      status_changes: status_changes,
      exclude_from_summary: !!o.exclude_from_summary,
      exclude_from_export: !!o.exclude_from_export,
      no_effort_needed: !!o.no_effort_needed,
      archived: !!o.archived
    };
    if (!t.status_changes.length) {
      t.status_changes.push({ id: generateId(), status: 'Open', date: assigned_date });
      var sn = normalizeStatusForHistory(statusVal);
      if (sn === 'Ongoing') {
        t.status_changes.push({ id: generateId(), status: 'Ongoing', date: assigned_date });
      } else if (sn === 'Done') {
        t.status_changes.push({ id: generateId(), status: 'Ongoing', date: assigned_date });
        t.status_changes.push({ id: generateId(), status: 'Done', date: done_date || assigned_date });
      } else if (sn === 'Dropped') {
        t.status_changes.push({ id: generateId(), status: 'Dropped', date: assigned_date });
      }
    }
    return t;
  }

  function normalizeTask(t) {
    if (!t.bug_numbers && (t.bug_number !== undefined && t.bug_number !== 0 && t.bug_number !== '')) {
      t.bug_numbers = [].concat(t.bug_number);
    }
    if (!t.bug_numbers) t.bug_numbers = [];
    if (!t.eta_updates) t.eta_updates = [];
    if (!t.effort_updates) t.effort_updates = [];
    if (!Array.isArray(t.concerns)) t.concerns = [];
    if (!t.subtasks) t.subtasks = [];
    if (!Array.isArray(t.categories)) t.categories = [];
    if (!Array.isArray(t.progress_updates)) t.progress_updates = [];
    t.progress_updates.forEach(function (p) {
      if (!Array.isArray(p.categories)) p.categories = [];
      if (p.category != null && String(p.category).trim() !== '') {
        var legacy = String(p.category).trim();
        if (!p.categories.length) {
          p.categories = legacy.indexOf(',') >= 0
            ? legacy.split(',').map(function (x) { return x.trim(); }).filter(Boolean)
            : [legacy];
        }
      }
      delete p.category;
    });
    t.project = (t.project != null && String(t.project).trim()) ? String(t.project).trim() : '';
    t.difficulty = normalizeTaskDifficulty(t.difficulty);
    t.exclude_from_summary = !!t.exclude_from_summary;
    t.exclude_from_export = !!t.exclude_from_export;
    t.no_effort_needed = !!t.no_effort_needed;
    t.archived = !!t.archived;
    migrateTaskStatusChangesIfNeeded(t);
    t.subtasks.forEach(function (s) {
      if (!s.priority && s.priority !== 0) s.priority = 1;
      if (!s.description) s.description = '';
      if (!s.progress_updates) s.progress_updates = [];
      if (!s.effort_updates) s.effort_updates = [];
      if (!Array.isArray(s.categories)) s.categories = [];
      if (!Array.isArray(s.concerns)) s.concerns = [];
      if (s.done_date == null) s.done_date = '';
      var subEtaRaw = s.eta;
      s.eta = (subEtaRaw != null && String(subEtaRaw).trim() !== '') ? String(subEtaRaw).trim().slice(0, 10) : '';
      s.difficulty = normalizeTaskDifficulty(s.difficulty);
      s.project = (s.project != null && String(s.project).trim()) ? String(s.project).trim() : '';
      s.exclude_from_summary = !!s.exclude_from_summary;
      s.exclude_from_export = !!s.exclude_from_export;
      s.no_effort_needed = !!s.no_effort_needed;
      (s.progress_updates || []).forEach(function (p) {
        if (!Array.isArray(p.categories)) p.categories = [];
        if (p.category != null && String(p.category).trim() !== '') {
          var legacyS = String(p.category).trim();
          if (!p.categories.length) {
            p.categories = legacyS.indexOf(',') >= 0
              ? legacyS.split(',').map(function (x) { return x.trim(); }).filter(Boolean)
              : [legacyS];
          }
        }
        delete p.category;
      });
      migrateSubtaskStatusChangesIfNeeded(s);
    });
    return t;
  }

  function parseTags(input) {
    if (!input || typeof input !== 'string') return ['#default'];
    var raw = input.trim().split(/[\s,]+/).filter(Boolean);
    if (!raw.length) return ['#default'];
    return raw.map(function (t) { return t.startsWith('#') ? t : '#' + t; });
  }

  function hoursToDays(hours) {
    if (hours == null || isNaN(hours)) return 0;
    return Math.round((hours / 8) * 10) / 10;
  }

  function daysUntilDeadline(etaStr) {
    if (!etaStr) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var parts = etaStr.split('-');
    if (parts.length !== 3) return null;
    var eta = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(eta.getTime())) return null;
    return Math.round((eta - today) / 86400000);
  }

  function formatDeadlineLabel(days) {
    if (days === null) return null;
    if (days < 0) return Math.abs(days) + 'd overdue';
    if (days === 0) return 'Due today';
    return days + 'd left';
  }

  function compareDateStr(a, b) {
    if (!a || !b) return 0;
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  }

  /** Canonical values for status history: Open | Ongoing | Done | Dropped */
  function normalizeStatusForHistory(st) {
    if (st == null || st === '') return 'Open';
    if (st === 'Completed') return 'Done';
    if (st === 'Closed') return 'Dropped';
    return st;
  }

  /** Logical rank: Open=0, Ongoing=1, Done=2, Dropped=3. */
  function statusChangeRank(st) {
    var n = normalizeStatusForHistory(st);
    if (n === 'Open') return 0;
    if (n === 'Ongoing') return 1;
    if (n === 'Done') return 2;
    if (n === 'Dropped') return 3;
    return 4;
  }

  function sortedStatusChanges(changes) {
    if (!changes || !changes.length) return [];
    var list = changes.slice().sort(function (a, b) {
      var da = (a.date && String(a.date).trim()) || '';
      var db = (b.date && String(b.date).trim()) || '';
      var c = compareDateStr(da, db);
      if (c !== 0) return c;
      var ra = statusChangeRank(a.status);
      var rb = statusChangeRank(b.status);
      if (ra !== rb) return ra - rb;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    for (var i = 1; i < list.length; i++) {
      var prevRank = statusChangeRank(list[i - 1].status);
      var curRank = statusChangeRank(list[i].status);
      var prevDate = (list[i - 1].date && String(list[i - 1].date).trim()) || '';
      var curDate = (list[i].date && String(list[i].date).trim()) || '';
      if (curRank > prevRank && curDate && prevDate && curDate < prevDate) {
        list[i].date = prevDate;
      }
    }
    return list;
  }

  /**
   * Mutate dates in-place so that logical order is respected:
   *   Open(0) ≤ Ongoing(1) ≤ Done(2) ≤ Dropped(3)
   * If a higher-rank entry has a date earlier than a lower-rank entry,
   * pull it forward; if a lower-rank entry has a date later than the
   * next higher-rank entry, push it back.  Two passes (forward + backward)
   * guarantee full consistency.
   */
  function enforceStatusChangeDateOrder(changes) {
    if (!changes || changes.length < 2) return;
    changes.sort(function (a, b) {
      var ra = statusChangeRank(a.status);
      var rb = statusChangeRank(b.status);
      if (ra !== rb) return ra - rb;
      var da = (a.date && String(a.date).trim()) || '';
      var db = (b.date && String(b.date).trim()) || '';
      return compareDateStr(da, db);
    });
    for (var i = 1; i < changes.length; i++) {
      var prev = (changes[i - 1].date && String(changes[i - 1].date).trim()) || '';
      var cur = (changes[i].date && String(changes[i].date).trim()) || '';
      if (cur && prev && cur < prev) {
        changes[i].date = prev;
      }
    }
    for (var j = changes.length - 2; j >= 0; j--) {
      var next = (changes[j + 1].date && String(changes[j + 1].date).trim()) || '';
      var cj = (changes[j].date && String(changes[j].date).trim()) || '';
      if (cj && next && cj > next) {
        changes[j].date = next;
      }
    }
  }

  function syncTaskFromStatusChanges(task) {
    if (!Array.isArray(task.status_changes)) task.status_changes = [];
    var list = sortedStatusChanges(task.status_changes);
    if (!list.length) {
      task.status = 'Open';
      task.done_date = '';
      return;
    }
    var last = list[list.length - 1];
    var lastNorm = normalizeStatusForHistory(last.status);
    task.status = lastNorm === 'Done' ? 'Done' : (lastNorm === 'Dropped' ? 'Dropped' : lastNorm);
    if (lastNorm === 'Done') {
      task.done_date = (last.date && String(last.date).trim()) || '';
    } else {
      task.done_date = '';
    }
  }

  function syncSubtaskFromStatusChanges(s) {
    if (!Array.isArray(s.status_changes)) s.status_changes = [];
    var list = sortedStatusChanges(s.status_changes);
    if (!list.length) {
      s.status = 'Open';
      s.done_date = '';
      return;
    }
    var last = list[list.length - 1];
    var lastNorm = normalizeStatusForHistory(last.status);
    s.status = lastNorm === 'Done' ? 'Done' : (lastNorm === 'Dropped' ? 'Dropped' : lastNorm);
    if (lastNorm === 'Done') {
      s.done_date = (last.date && String(last.date).trim()) || '';
    } else {
      s.done_date = '';
    }
  }

  function migrateTaskStatusChangesIfNeeded(task) {
    if (!Array.isArray(task.status_changes)) task.status_changes = [];
    if (task.status_changes.length > 0) return;
    var openD = task.assigned_date || (task.created_at && String(task.created_at).slice(0, 10)) || new Date().toISOString().slice(0, 10);
    task.status_changes.push({ id: generateId(), status: 'Open', date: openD });
    var st = normalizeStatusForHistory(task.status);
    if (st === 'Ongoing') {
      task.status_changes.push({ id: generateId(), status: 'Ongoing', date: openD });
    } else if (st === 'Done') {
      var doneD = (task.done_date && String(task.done_date).trim()) || openD;
      task.status_changes.push({ id: generateId(), status: 'Ongoing', date: openD });
      task.status_changes.push({ id: generateId(), status: 'Done', date: doneD });
    } else if (st === 'Dropped') {
      task.status_changes.push({ id: generateId(), status: 'Dropped', date: openD });
    }
  }

  function migrateSubtaskStatusChangesIfNeeded(s) {
    if (!Array.isArray(s.status_changes)) s.status_changes = [];
    if (s.status_changes.length > 0) return;
    var openD = s.assigned_date || new Date().toISOString().slice(0, 10);
    s.status_changes.push({ id: generateId(), status: 'Open', date: openD });
    var st = normalizeStatusForHistory(s.status);
    if (st === 'Ongoing') {
      s.status_changes.push({ id: generateId(), status: 'Ongoing', date: openD });
    } else if (st === 'Done') {
      var doneD = (s.done_date && String(s.done_date).trim()) || openD;
      s.status_changes.push({ id: generateId(), status: 'Ongoing', date: openD });
      s.status_changes.push({ id: generateId(), status: 'Done', date: doneD });
    } else if (st === 'Dropped') {
      s.status_changes.push({ id: generateId(), status: 'Dropped', date: openD });
    }
  }

  /**
   * Resolve the effective status of a task/sub-task as seen from within a date range.
   * Returns { statusAtStart, statusAtEnd, transitions[] }.
   * transitions = array of { from, to, date } where date is within [rangeFrom, rangeTo].
   */
  function resolveStatusInRange(taskLike, rangeFrom, rangeTo) {
    migrateTaskStatusChangesIfNeeded(taskLike);
    var sorted = sortedStatusChanges(taskLike.status_changes || []);
    var statusAtStart = 'Open';
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].date && sorted[i].date <= rangeFrom) {
        statusAtStart = normalizeStatusForHistory(sorted[i].status);
      }
    }
    var statusAtEnd = statusAtStart;
    var transitions = [];
    var prev = statusAtStart;
    for (var j = 0; j < sorted.length; j++) {
      var d = sorted[j].date || '';
      var s = normalizeStatusForHistory(sorted[j].status);
      if (d > rangeFrom && d <= rangeTo) {
        if (s !== prev) {
          transitions.push({ from: prev, to: s, date: d });
          prev = s;
        }
      } else if (d > rangeTo) {
        break;
      }
    }
    statusAtEnd = prev;
    return { statusAtStart: statusAtStart, statusAtEnd: statusAtEnd, transitions: transitions };
  }

  function resolveSubtaskStatusInRange(s, rangeFrom, rangeTo) {
    migrateSubtaskStatusChangesIfNeeded(s);
    var sorted = sortedStatusChanges(s.status_changes || []);
    var statusAtStart = 'Open';
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].date && sorted[i].date <= rangeFrom) {
        statusAtStart = normalizeStatusForHistory(sorted[i].status);
      }
    }
    var statusAtEnd = statusAtStart;
    var transitions = [];
    var prev = statusAtStart;
    for (var j = 0; j < sorted.length; j++) {
      var d = sorted[j].date || '';
      var st = normalizeStatusForHistory(sorted[j].status);
      if (d > rangeFrom && d <= rangeTo) {
        if (st !== prev) {
          transitions.push({ from: prev, to: st, date: d });
          prev = st;
        }
      } else if (d > rangeTo) {
        break;
      }
    }
    statusAtEnd = prev;
    return { statusAtStart: statusAtStart, statusAtEnd: statusAtEnd, transitions: transitions };
  }

  /** Date when the task/subtask first entered 'Open' (i.e. was created/assigned). */
  function taskOpenDate(taskLike) {
    var changes = sortedStatusChanges(taskLike.status_changes || []);
    for (var i = 0; i < changes.length; i++) {
      if (normalizeStatusForHistory(changes[i].status) === 'Open') {
        return changes[i].date || '';
      }
    }
    return taskLike.assigned_date || taskLike.created_at && String(taskLike.created_at).slice(0, 10) || '';
  }

  /** Was task/sub-task fully Done or Dropped before a date? (all status changes resolved before rangeFrom) */
  function wasCompletedOrDroppedBefore(taskLike, rangeFrom) {
    var sorted = sortedStatusChanges(taskLike.status_changes || []);
    if (!sorted.length) return false;
    var lastBeforeRange = null;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].date && sorted[i].date < rangeFrom) {
        lastBeforeRange = normalizeStatusForHistory(sorted[i].status);
      }
    }
    return lastBeforeRange === 'Done' || lastBeforeRange === 'Dropped';
  }

  /** Was the task/subtask opened (first Open status) at or before rangeTo? */
  function wasOpenedByEndOfRange(taskLike, rangeTo) {
    var d = taskOpenDate(taskLike);
    return d && d <= rangeTo;
  }

  /** Filter concerns for range-aware export: skip addressed before range start; keep open + addressed-in-range. */
  function filterConcernsForRange(concerns, rangeFrom, rangeTo) {
    return (concerns || []).filter(function (c) {
      if (c.status === 'Addressed') {
        if (c.addressed_date && c.addressed_date < rangeFrom) return false;
        return true;
      }
      return true;
    });
  }

  /** Is this concern addressed within the range? */
  function isConcernAddressedInRange(c, rangeFrom, rangeTo) {
    return c.status === 'Addressed' && c.addressed_date && c.addressed_date >= rangeFrom && c.addressed_date <= rangeTo;
  }

  /** Build a status badge or transition chain HTML for export. */
  function rangeStatusBadgeHtml(resolved, statusBadgeFn) {
    if (!resolved.transitions.length) {
      return statusBadgeFn(resolved.statusAtEnd);
    }
    var parts = [statusBadgeFn(resolved.statusAtStart)];
    resolved.transitions.forEach(function (tr) {
      parts.push('<span class="export-status-arrow"> → </span>');
      parts.push(statusBadgeFn(tr.to));
    });
    return '<span class="export-status-transition">' + parts.join('') + '</span>';
  }

  /** Progress log: oldest → newest by date_added; undated entries last; same-day ties by id. */
  function sortProgressUpdatesOldestFirst(updates) {
    if (!updates || !updates.length) return [];
    return updates.slice().sort(function (a, b) {
      var da = (a.date_added && String(a.date_added).trim()) || '';
      var db = (b.date_added && String(b.date_added).trim()) || '';
      if (da && !db) return -1;
      if (!da && db) return 1;
      if (!da && !db) return String(a.id || '').localeCompare(String(b.id || ''));
      if (da < db) return -1;
      if (da > db) return 1;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }

  function subtaskCounts(subtasks) {
    var open = 0, ongoing = 0, done = 0, dropped = 0;
    (subtasks || []).forEach(function (s) {
      if (s.status === 'Dropped' || s.status === 'Closed') dropped++;
      else if (s.status === 'Done' || s.status === 'Completed') done++;
      else if (s.status === 'Ongoing') ongoing++;
      else open++;
    });
    return { open: open, ongoing: ongoing, done: done, dropped: dropped, total: (subtasks || []).length };
  }

  function isTruthyFlag(v) {
    return v === true || v === 1 || v === 'true';
  }

  /** Main-task ribbon Effort chip when parent has No Effort Needed (subs determine All vs only-main scope). */
  function mainTaskEffortChipValueWhenExempt(task) {
    var subs = task.subtasks || [];
    if (!subs.length) return '— (Only Main Task)';
    var allNo = subs.every(function (s) {
      return isTruthyFlag(s.no_effort_needed);
    });
    if (allNo) return '— (All)';
    return '— (Only Main Task)';
  }

  /** Sub-task has its own planned effort (>0); otherwise its logged hours roll up to main-task summary totals. */
  function subtaskHasDedicatedEffort(s) {
    if (isTruthyFlag(s.no_effort_needed)) return false;
    var h = s.effort_required_hours;
    if (h == null || h === '') return false;
    var n = parseFloat(h);
    return !isNaN(n) && n > 0;
  }

  function progressEffortHours(p) {
    var h = p && p.effort_consumed_hours;
    if (h == null || h === '') return 0;
    var n = typeof h === 'number' ? h : parseFloat(h);
    return isNaN(n) ? 0 : n;
  }

  function subtaskEffortSpent(s) {
    var updates = s.progress_updates || [];
    return updates.reduce(function (sum, p) {
      return sum + progressEffortHours(p);
    }, 0);
  }

  function taskEffortSpent(task) {
    return taskEffortSpentMainAttributed(task) + taskEffortSpentSubOnlyTask(task);
  }

  /** Hours logged only on the main task's progress (not sub-tasks). */
  function taskEffortSpentOnMainOnly(task) {
    return (task.progress_updates || []).reduce(function (sum, p) {
      return sum + progressEffortHours(p);
    }, 0);
  }

  /** List ribbon: when parent is exempt, show sub-task spent only (exclude main-task progress rows). */
  function taskEffortSpentForRibbon(task) {
    if (!isTruthyFlag(task.no_effort_needed)) return taskEffortSpent(task);
    var total = taskEffortSpent(task);
    var mainOnly = taskEffortSpentOnMainOnly(task);
    return Math.max(0, total - mainOnly);
  }

  function taskEffortSpentMainAttributed(task) {
    var main = (task.progress_updates || []).reduce(function (sum, p) {
      return sum + progressEffortHours(p);
    }, 0);
    var sub = (task.subtasks || []).reduce(function (sum, s) {
      if (isTruthyFlag(s.exclude_from_summary)) return sum;
      if (subtaskHasDedicatedEffort(s)) return sum;
      return sum + (s.progress_updates || []).reduce(function (s2, p) {
        return s2 + progressEffortHours(p);
      }, 0);
    }, 0);
    return main + sub;
  }

  function taskEffortSpentSubOnlyTask(task) {
    return (task.subtasks || []).reduce(function (sum, s) {
      if (isTruthyFlag(s.exclude_from_summary)) return sum;
      if (!subtaskHasDedicatedEffort(s)) return sum;
      return sum + (s.progress_updates || []).reduce(function (s2, p) {
        return s2 + progressEffortHours(p);
      }, 0);
    }, 0);
  }

  function taskEffortInRangeMainAttributed(task, from, to) {
    var main = (task.progress_updates || []).reduce(function (sum, p) {
      if (!p.date_added || p.date_added < from || p.date_added > to) return sum;
      return sum + progressEffortHours(p);
    }, 0);
    var sub = (task.subtasks || []).reduce(function (sum, s) {
      if (isTruthyFlag(s.exclude_from_summary)) return sum;
      if (subtaskHasDedicatedEffort(s)) return sum;
      return sum + (s.progress_updates || []).reduce(function (s2, p) {
        if (!p.date_added || p.date_added < from || p.date_added > to) return s2;
        return s2 + progressEffortHours(p);
      }, 0);
    }, 0);
    return main + sub;
  }

  function taskEffortInRangeSubDedicated(task, from, to) {
    return (task.subtasks || []).reduce(function (sum, s) {
      if (isTruthyFlag(s.exclude_from_summary)) return sum;
      if (!subtaskHasDedicatedEffort(s)) return sum;
      return sum + (s.progress_updates || []).reduce(function (s2, p) {
        if (!p.date_added || p.date_added < from || p.date_added > to) return s2;
        return s2 + progressEffortHours(p);
      }, 0);
    }, 0);
  }

  /** Main + included subs: hours logged outside [from, to] (disjoint from in-range). */
  function taskEffortOutsideRangeMainAttributed(task, from, to) {
    var main = (task.progress_updates || []).reduce(function (sum, p) {
      if (!p.date_added || p.date_added < from || p.date_added > to) return sum + progressEffortHours(p);
      return sum;
    }, 0);
    var sub = (task.subtasks || []).reduce(function (sum, s) {
      if (isTruthyFlag(s.exclude_from_summary)) return sum;
      if (subtaskHasDedicatedEffort(s)) return sum;
      return sum + (s.progress_updates || []).reduce(function (s2, p) {
        if (!p.date_added || p.date_added < from || p.date_added > to) return s2 + progressEffortHours(p);
        return s2;
      }, 0);
    }, 0);
    return main + sub;
  }

  /** Dedicated sub: hours outside [from, to]. */
  function subtaskEffortOutsideRange(s, from, to) {
    return (s.progress_updates || []).reduce(function (sum, p) {
      if (!p.date_added || p.date_added < from || p.date_added > to) return sum + progressEffortHours(p);
      return sum;
    }, 0);
  }

  function isSubtaskDoneOrCompleted(s) {
    return s && (s.status === 'Done' || s.status === 'Completed');
  }

  /** YYYY-MM-DD when sub-task was finished: explicit done_date, else latest progress date_added. */
  function subtaskCompletionDateYMD(s) {
    if (!s) return '';
    var d = s.done_date;
    if (d != null && String(d).trim()) return String(d).trim().slice(0, 10);
    var updates = s.progress_updates || [];
    var maxD = '';
    for (var i = 0; i < updates.length; i++) {
      var x = updates[i].date_added || '';
      if (x > maxD) maxD = x;
    }
    return maxD || '';
  }

  /** List sub-task in summary/export tables (hide Done/Completed if finished before range start). */
  function includeSubtaskInSummaryByDate(s, rangeFrom) {
    if (!isSubtaskDoneOrCompleted(s)) return true;
    var comp = subtaskCompletionDateYMD(s);
    if (!comp) return true;
    return comp >= rangeFrom;
  }

  /** Sub-task appears in generated summary (on-screen) when parent is included. */
  function includeSubtaskInSummaryFull(s, rangeFrom) {
    if (isTruthyFlag(s.exclude_from_summary)) return false;
    return includeSubtaskInSummaryByDate(s, rangeFrom);
  }

  /** Current planned hours: last effort update's new value, else effort_required_hours (main task or sub-task). */
  function getLatestPlannedEffortHours(taskLike) {
    var updates = (taskLike.effort_updates || []).slice().sort(function (a, b) {
      return (a.date_recorded || '').localeCompare(b.date_recorded || '');
    });
    if (updates.length) {
      var lastU = updates[updates.length - 1];
      if (lastU.new_effort_hours != null && lastU.new_effort_hours !== '') {
        var ln = typeof lastU.new_effort_hours === 'number' ? lastU.new_effort_hours : parseFloat(lastU.new_effort_hours);
        if (!isNaN(ln)) return ln;
      }
    }
    var req = taskLike.effort_required_hours;
    if (req != null && req !== '') {
      var r = typeof req === 'number' ? req : parseFloat(req);
      if (!isNaN(r)) return r;
    }
    return 0;
  }

  var SIDEBAR_MODE_STORAGE_KEY = 'flowassist_sidebar_mode';

  var state = {
    data: { settings: DEFAULT_SETTINGS, tasks: [] },
    profilePath: null,
    view: 'list',
    sidebarMode: 'full',
    /** Docked width before hide; used when showing sidebar again from the top-bar toggle. */
    sidebarRestoreMode: 'full',
    calendarFilter: 'assigned',
    calendarView: 'month',
    calendarFocusDate: new Date().toISOString().slice(0, 10),
    calendarChartStyle: 'basic',
    /** Calendar day-off list: `all` | `month` | `year` — summary/export ignore this (range-only). */
    dayOffBrowseMode: 'all',
    dayOffBrowseYM: new Date().toISOString().slice(0, 7),
    dayOffBrowseYear: new Date().getFullYear(),
    expandedTasks: {},
    expandedSubtasks: {},
    mainTaskSort: { by: 'date_added', dir: 'asc' },
    subtaskSortByTaskId: {},
    /** `m:taskId` or `s:taskId:subId` → start index into oldest-first progress array for 5-item window */
    progressLogWindowStart: {},
    /** Same keys + `mh:…` for modal → 'asc' | 'desc' display order */
    progressLogSort: {},
    /** When open: { taskId, subtaskId } (subtaskId null for main task) */
    progressHistoryOpen: null,
    /** When non-null, expanded note/todo editor modal is showing this note id. */
    notesModalNoteId: null,
    /** Session-only filter for Notes board by created date (not persisted). */
    notesDateFilter: { mode: 'all' },
    summaryGenerated: false,
    lastSummaryMeta: null,
    listFilter: 'all',
    /** In-memory form drafts (not persisted until Save). Survives collapse / view switch. */
    editorDrafts: {
      tasks: {},
      subtasks: {},
      newSubtask: {}
    },
    /** Which detail/status/concern/new-sub panels were expanded (survives re-render + restart). */
    editorPanelState: {
      tasks: {},
      subtasks: {}
    }
  };

  var EDITOR_SESSION_STORAGE_VERSION = 1;
  var EDITOR_SESSION_STORAGE_PREFIX = 'flowassist_editor_session_v1';

  function editorSessionStorageKey() {
    var p = state.profilePath || '_noprofile';
    return EDITOR_SESSION_STORAGE_PREFIX + ':' + String(p);
  }

  function editorBlockOpen(el) {
    return !!(el && !el.classList.contains('task-block-collapsed'));
  }

  function captureEditorPanelStateFromDom() {
    var ep = state.editorPanelState;
    document.querySelectorAll('#task-list .task-card, #completed-task-list .task-card').forEach(function (card) {
      var taskId = card.dataset.id;
      if (!taskId) return;
      var body = card.querySelector(':scope > .task-body');
      if (!body) return;
      var ps = {};
      var el;
      el = card.querySelector(':scope > .task-body > .task-details-block');
      ps.details = editorBlockOpen(el);
      el = card.querySelector(':scope > .task-body > .task-update-eta-block');
      ps.eta = editorBlockOpen(el);
      el = card.querySelector(':scope > .task-body > .task-update-effort-block');
      ps.effort = editorBlockOpen(el);
      el = card.querySelector(':scope > .task-body > .task-update-status-changes-block');
      ps.statusChanges = editorBlockOpen(el);
      el = card.querySelector(':scope > .task-body > .task-concerns-block');
      ps.concerns = editorBlockOpen(el);
      el = card.querySelector(':scope > .task-body > .new-subtask-block');
      ps.newSubtask = editorBlockOpen(el);
      ep.tasks[taskId] = ps;

      card.querySelectorAll(':scope .subtask-card').forEach(function (subCard) {
        var sid = subCard.dataset.subtaskId;
        var tid = subCard.dataset.taskId;
        if (!sid || tid !== taskId) return;
        var subBody = subCard.querySelector('.subtask-body');
        if (!subBody) return;
        var sps = {};
        el = subCard.querySelector('.subtask-details-block');
        sps.details = editorBlockOpen(el);
        el = subCard.querySelector('.subtask-status-changes-block');
        sps.statusChanges = editorBlockOpen(el);
        el = subCard.querySelector(':scope > .subtask-body > .task-concerns-block');
        sps.concerns = editorBlockOpen(el);
        ep.subtasks[tid + ':' + sid] = sps;
      });
    });
  }

  function pruneEditorSessionForLoadedTasks() {
    var tasks = getTasks();
    var idSet = {};
    var subMap = {};
    tasks.forEach(function (t) {
      idSet[t.id] = true;
      subMap[t.id] = {};
      (t.subtasks || []).forEach(function (s) {
        subMap[t.id][s.id] = true;
      });
    });
    function pruneMap(map, fn) {
      Object.keys(map).forEach(function (k) {
        if (!fn(k)) delete map[k];
      });
    }
    pruneMap(state.editorDrafts.tasks, function (k) { return idSet[k]; });
    pruneMap(state.editorDrafts.newSubtask, function (k) { return idSet[k]; });
    pruneMap(state.editorDrafts.subtasks, function (k) {
      var ix = k.indexOf(':');
      if (ix < 0) return false;
      var tid = k.slice(0, ix);
      var sid = k.slice(ix + 1);
      return !!(idSet[tid] && subMap[tid] && subMap[tid][sid]);
    });
    pruneMap(state.editorPanelState.tasks, function (k) { return idSet[k]; });
    pruneMap(state.editorPanelState.subtasks, function (k) {
      var ix = k.indexOf(':');
      if (ix < 0) return false;
      var tid = k.slice(0, ix);
      var sid = k.slice(ix + 1);
      return !!(idSet[tid] && subMap[tid] && subMap[tid][sid]);
    });
  }

  function purgeEditorPanelStateForTask(taskId) {
    if (!taskId) return;
    delete state.editorPanelState.tasks[taskId];
    var pref = taskId + ':';
    Object.keys(state.editorPanelState.subtasks).forEach(function (k) {
      if (k.slice(0, pref.length) === pref) delete state.editorPanelState.subtasks[k];
    });
  }

  function purgeEditorPanelStateForSubtask(taskId, subtaskId) {
    if (!taskId || !subtaskId) return;
    delete state.editorPanelState.subtasks[taskId + ':' + subtaskId];
  }

  function persistEditorSessionToStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      var payload = {
        v: EDITOR_SESSION_STORAGE_VERSION,
        drafts: state.editorDrafts,
        panels: state.editorPanelState
      };
      localStorage.setItem(editorSessionStorageKey(), JSON.stringify(payload));
    } catch (err) {
      /* quota / private mode */
    }
  }

  function loadEditorSessionFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      var raw = localStorage.getItem(editorSessionStorageKey());
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== EDITOR_SESSION_STORAGE_VERSION) return;
      if (parsed.drafts && typeof parsed.drafts === 'object') {
        state.editorDrafts = {
          tasks: parsed.drafts.tasks || {},
          subtasks: parsed.drafts.subtasks || {},
          newSubtask: parsed.drafts.newSubtask || {}
        };
      }
      if (parsed.panels && typeof parsed.panels === 'object') {
        state.editorPanelState = {
          tasks: parsed.panels.tasks || {},
          subtasks: parsed.panels.subtasks || {}
        };
      }
      pruneEditorSessionForLoadedTasks();
    } catch (err) {
      /* ignore corrupt JSON */
    }
  }

  function refreshEditorSessionPanelsFromDom() {
    captureEditorPanelStateFromDom();
    persistEditorSessionToStorage();
  }

  var PROGRESS_LOG_PAGE = 5;
  /** Default number of sub-task cards visible per page (user can change per task). */
  var DEFAULT_SUBTASK_VIEWPORT_PAGE_SIZE = 5;

  function progressLogKeyMain(taskId) {
    return 'm:' + taskId;
  }

  function progressLogKeySub(taskId, subId) {
    return 's:' + taskId + ':' + subId;
  }

  function progressLogKeyModal(taskId, subId) {
    return subId ? ('mh:' + taskId + ':' + subId) : ('mh:' + taskId);
  }

  function getProgressLogSort(key) {
    return state.progressLogSort[key] === 'desc' ? 'desc' : 'asc';
  }

  function getProgressWindowStart(logKey, n) {
    var maxStart = Math.max(0, n - PROGRESS_LOG_PAGE);
    var s = state.progressLogWindowStart[logKey];
    if (s == null || typeof s !== 'number' || isNaN(s)) {
      state.progressLogWindowStart[logKey] = maxStart;
      return maxStart;
    }
    if (s > maxStart) {
      state.progressLogWindowStart[logKey] = maxStart;
      return maxStart;
    }
    return s;
  }

  /** One progress row (shared by card window, modal, and full history). */
  function renderProgressItemLi(p, isSubtask) {
    var d = p.date_added || '';
    var h = p.effort_consumed_hours != null ? p.effort_consumed_hours + ' hrs' : '';
    var effortVal = p.effort_consumed_hours != null ? p.effort_consumed_hours : '';
    var pCats = progressUpdateCategoriesArray(p);
    var catJoined = pCats.length ? pCats.join(', ') : '';
    var editClass = isSubtask ? 'btn-edit-cyan btn-edit-subtask-progress' : 'btn-edit-cyan btn-edit-progress';
    var saveClass = isSubtask ? 'btn-small progress-save-btn subtask-progress-save' : 'btn-small progress-save-btn';
    return '<li class="progress-item" data-update-id="' + escapeHtml(p.id) + '" data-date-added="' + escapeHtml(d) + '" data-effort="' + escapeHtml(String(effortVal)) + '" data-progress-categories="' + escapeAttr(JSON.stringify(pCats)) + '" data-progress-text="' + escapeAttr(p.text || '') + '">' +
      '<div class="progress-item-view">' +
        '<div class="progress-item-head">' +
          '<span class="progress-meta">' + escapeHtml(d) + (h ? ' · ' + h : '') + (catJoined ? ' · ' + escapeHtml(catJoined) : '') + '</span>' +
          '<button type="button" class="' + editClass + '" title="Edit"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L3.463 11.098a.25.25 0 00-.064.108l-.631 2.21 2.21-.632a.25.25 0 00.108-.063l8.61-8.61a.25.25 0 000-.354l-1.086-1.086z"/></svg></button>' +
        '</div>' +
        '<div class="progress-text">' + (formatRichDescription(p.text || '') || '') + '</div>' +
      '</div>' +
      '<div class="progress-item-edit hidden">' +
        '<div class="rich-textarea-wrap">' + renderRichFormatToolbarHtml() +
        '<textarea class="progress-edit-text auto-resize rich-text-target" rows="2" placeholder="Note"></textarea></div>' +
        '<input type="date" class="progress-edit-date">' +
        '<input type="number" class="progress-edit-effort" placeholder="Hrs" min="0" step="0.5">' +
        renderProgressCategoryRowHtml(pCats, 'progress-edit-cat-' + p.id) +
        '<div class="progress-edit-actions">' +
          '<button type="button" class="' + saveClass + '">Save</button>' +
          '<button type="button" class="btn-small progress-delete-btn">Delete</button>' +
        '</div>' +
      '</div>' +
    '</li>';
  }

  function renderProgressLogSection(updates, logKey, isSubtask, taskId, subtaskId) {
    var sortedBase = sortProgressUpdatesOldestFirst(updates || []);
    var n = sortedBase.length;
    var sortDir = getProgressLogSort(logKey);
    var winStart = getProgressWindowStart(logKey, n);
    var slice = sortedBase.slice(winStart, winStart + PROGRESS_LOG_PAGE);
    var displaySlice = sortDir === 'desc' ? slice.slice().reverse() : slice;
    var winEnd = Math.min(n, winStart + PROGRESS_LOG_PAGE);
    var rangeLabel = n === 0 ? 'No entries' : (winStart + 1) + '–' + winEnd + ' of ' + n;
    var canUp = n > PROGRESS_LOG_PAGE && winStart > 0;
    var canDown = n > PROGRESS_LOG_PAGE && winStart < n - PROGRESS_LOG_PAGE;
    var ulClass = isSubtask ? 'progress-list subtask-progress-list' : 'progress-list';
    var items = displaySlice.map(function (p) {
      return renderProgressItemLi(p, isSubtask);
    }).join('');
    var sortSel =
      '<label class="progress-log-sort-label muted">Order</label>' +
      '<select class="progress-log-sort-select" data-progress-log-key="' + escapeHtml(logKey) + '" title="Sort order">' +
      '<option value="asc"' + (sortDir === 'asc' ? ' selected' : '') + '>Oldest first</option>' +
      '<option value="desc"' + (sortDir === 'desc' ? ' selected' : '') + '>Newest first</option>' +
      '</select>';
    var openAttrs = 'data-task-id="' + escapeHtml(taskId) + '"' + (subtaskId ? ' data-subtask-id="' + escapeHtml(subtaskId) + '"' : '');
    var navSvgUp = '<svg class="progress-log-nav-icon" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.5 6L5 3.5L7.5 6" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var navSvgDown = '<svg class="progress-log-nav-icon" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<div class="progress-list-wrap" data-progress-log-key="' + escapeHtml(logKey) + '">' +
      '<div class="progress-log-controls">' +
        '<div class="progress-log-nav-group">' +
          '<button type="button" class="progress-log-nav-btn progress-log-nav-up" data-progress-log-key="' + escapeHtml(logKey) + '" title="Earlier entries" aria-label="Earlier entries"' + (canUp ? '' : ' disabled') + '>' + navSvgUp + '</button>' +
          '<button type="button" class="progress-log-nav-btn progress-log-nav-down" data-progress-log-key="' + escapeHtml(logKey) + '" title="Newer entries" aria-label="Newer entries"' + (canDown ? '' : ' disabled') + '>' + navSvgDown + '</button>' +
        '</div>' +
        '<span class="progress-log-range muted">' + escapeHtml(rangeLabel) + '</span>' +
        sortSel +
        '<button type="button" class="btn-small btn-progress-history-open" ' + openAttrs + '>All history</button>' +
      '</div>' +
      (n ? '<ul class="' + ulClass + '">' + items + '</ul>' : '') +
    '</div>';
  }

  function parseYMD(ymd) {
    if (!ymd || typeof ymd !== 'string') return null;
    var parts = ymd.split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    var date = new Date(y, m, d);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  /** Sunday = 0, Saturday = 6 */
  function isWeekendYMD(ymd) {
    var date = parseYMD(ymd);
    if (!date) return false;
    var d = date.getDay();
    return d === 0 || d === 6;
  }

  /** Day off + weekend column tints for Gantt (full day off = green, partial = orange, weekend = red). */
  function buildGanttDayColumnOverlay(dates, usePercentWidths, colWidthPx) {
    var settings = getSettings();
    var offMap = {};
    (settings.dayOffs || []).forEach(function (o) {
      if (o && o.date) offMap[o.date] = o;
    });
    var parts = [];
    for (var i = 0; i < dates.length; i++) {
      var start;
      var end;
      if (usePercentWidths) {
        var n = dates.length || 1;
        start = (i / n * 100) + '%';
        end = ((i + 1) / n * 100) + '%';
      } else {
        var w = colWidthPx || 121;
        start = (i * w) + 'px';
        end = ((i + 1) * w) + 'px';
      }
      var ymd = dates[i];
      var off = offMap[ymd];
      var color = 'transparent';
      if (off && (off.type === 'full' || off.type === 'Full')) {
        color = 'rgba(46, 160, 67, 0.22)';
      } else if (off && (off.type === 'partial' || off.type === 'Partial')) {
        color = 'rgba(210, 153, 34, 0.24)';
      } else if (isWeekendYMD(ymd)) {
        color = 'rgba(248, 81, 73, 0.16)';
      }
      parts.push(color + ' ' + start, color + ' ' + end);
    }
    if (!parts.length) return 'linear-gradient(to right, transparent 0, transparent 100%)';
    return 'linear-gradient(to right, ' + parts.join(', ') + ')';
  }

  function getDayOffForDate(ymd) {
    var list = getSettings().dayOffs || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].date === ymd) return list[i];
    }
    return null;
  }

  function sumProgressHoursInRangeForTasks(tasks, from, to) {
    var total = 0;
    function add(updates) {
      (updates || []).forEach(function (p) {
        var d = p.date_added;
        if (d && d >= from && d <= to) total += (p.effort_consumed_hours || 0);
      });
    }
    tasks.forEach(function (t) {
      add(t.progress_updates);
      (t.subtasks || []).forEach(function (s) { add(s.progress_updates); });
    });
    return total;
  }

  function sumProgressHoursInRangeForTasksWithSummaryFilter(tasks, from, to) {
    var total = 0;
    tasks.forEach(function (t) {
      if (isTruthyFlag(t.exclude_from_summary)) return;
      (t.progress_updates || []).forEach(function (p) {
        var d = p.date_added;
        if (d && d >= from && d <= to) total += (Number(p.effort_consumed_hours) || 0);
      });
      (t.subtasks || []).forEach(function (s) {
        if (isTruthyFlag(s.exclude_from_summary)) return;
        (s.progress_updates || []).forEach(function (p) {
          var d = p.date_added;
          if (d && d >= from && d <= to) total += (Number(p.effort_consumed_hours) || 0);
        });
      });
    });
    return total;
  }

  function computeBandwidthUtilized(from, to, settings) {
    var hrsPerDay = parseFloat(settings.workingHoursPerDay);
    if (isNaN(hrsPerDay) || hrsPerDay <= 0) hrsPerDay = 8;
    var byDate = {};
    (settings.dayOffs || []).forEach(function (o) {
      if (o && o.date && o.date >= from && o.date <= to) byDate[o.date] = o;
    });
    var cap = 0;
    var pto = [];
    var sick = [];
    var other = [];
    function noteReason(reason, text) {
      if (reason === 'PTO') pto.push(text);
      else if (reason === 'Sick') sick.push(text);
      else other.push(text);
    }
    var d0 = parseYMD(from);
    var d1 = parseYMD(to);
    if (!d0 || !d1) {
      return {
        spent: 0,
        capacity: 0,
        hrsPerDay: hrsPerDay,
        ptoStr: '—',
        sickStr: '—',
        otherStr: '—'
      };
    }
    var d = new Date(d0.getTime());
    var end = new Date(d1.getTime());
    while (d <= end) {
      var ymd = toYMD(d);
      var dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        var off = byDate[ymd];
        var dowShort = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (off && (off.type === 'full' || off.type === 'Full')) {
          noteReason(off.reason || 'Other', ymd + ' ' + dowShort + ' (full day)');
        } else if (off && (off.type === 'partial' || off.type === 'Partial')) {
          var hOff = parseFloat(off.hoursOff);
          if (isNaN(hOff)) hOff = 0;
          hOff = Math.min(Math.max(0, hOff), hrsPerDay);
          cap += Math.max(0, hrsPerDay - hOff);
          noteReason(off.reason || 'Other', ymd + ' ' + dowShort + ' (partial, ' + hOff + 'h off)');
        } else {
          cap += hrsPerDay;
        }
      }
      d.setDate(d.getDate() + 1);
    }
    var spent = sumProgressHoursInRangeForTasksWithSummaryFilter(getTasks().map(normalizeTask), from, to);
    function joinList(arr) {
      return arr.length ? arr.join(', ') : '—';
    }
    return {
      spent: spent,
      capacity: cap,
      hrsPerDay: hrsPerDay,
      ptoStr: joinList(pto),
      sickStr: joinList(sick),
      otherStr: joinList(other)
    };
  }

  function formatCalendarDate(ymd) {
    var date = parseYMD(ymd);
    if (!date) return { dayName: '', dateMonthYear: ymd };
    var dayName = date.toLocaleDateString('en', { weekday: 'long' });
    var dateMonthYear = date.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' });
    return { dayName: dayName, dateMonthYear: dateMonthYear };
  }

  function toYMD(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  /** Short weekday (e.g. Mon) for a calendar date string YYYY-MM-DD; empty if invalid. */
  function weekdayShortFromYMD(ymd) {
    var date = parseYMD(ymd);
    if (!date || isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  function getMonday(ymd) {
    var date = parseYMD(ymd);
    if (!date) return ymd;
    var day = date.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return toYMD(date);
  }

  function addDays(ymd, n) {
    var date = parseYMD(ymd);
    if (!date) return ymd;
    date.setDate(date.getDate() + n);
    return toYMD(date);
  }

  function getWeekDates(ymd) {
    var monday = getMonday(ymd);
    var out = [];
    for (var i = 0; i < 7; i++) out.push(addDays(monday, i));
    return out;
  }

  function getMonthDates(ymd) {
    var date = parseYMD(ymd);
    if (!date) return [];
    var y = date.getFullYear();
    var m = date.getMonth();
    var first = new Date(y, m, 1);
    var last = new Date(y, m + 1, 0);
    var out = [];
    for (var d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      out.push(toYMD(new Date(d)));
    }
    return out;
  }

  function getMonthLabel(ymd) {
    var date = parseYMD(ymd);
    if (!date) return ymd;
    return date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  }

  function getWeekLabel(ymd) {
    var dates = getWeekDates(ymd);
    if (dates.length < 2) return ymd;
    var a = formatCalendarDate(dates[0]);
    var b = formatCalendarDate(dates[6]);
    return a.dateMonthYear + ' – ' + b.dateMonthYear;
  }

  function compareDateStrOrEmpty(a, b) {
    var sa = a || '';
    var sb = b || '';
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    if (sa > sb) return 1;
    if (sa < sb) return -1;
    return 0;
  }

  function sortMainTasks(tasks) {
    var opt = state.mainTaskSort;
    var by = opt.by;
    var dir = opt.dir === 'desc' ? -1 : 1;
    return tasks.slice().sort(function (a, b) {
      var cmp = 0;
      if (by === 'date_added') {
        var da = (a.created_at && a.created_at.slice(0, 10)) || a.assigned_date || '';
        var db = (b.created_at && b.created_at.slice(0, 10)) || b.assigned_date || '';
        cmp = compareDateStrOrEmpty(da, db);
      } else if (by === 'priority') {
        var pa = a.priority != null ? a.priority : 0;
        var pb = b.priority != null ? b.priority : 0;
        cmp = pa - pb;
      } else if (by === 'eta') {
        cmp = compareDateStrOrEmpty(a.eta, b.eta);
      } else {
        return 0;
      }
      return cmp * dir;
    });
  }

  function sortSubtasksForTask(taskId, subtasks) {
    var opt = state.subtaskSortByTaskId[taskId] || { by: 'date_added', dir: 'asc' };
    var by = opt.by;
    var dir = opt.dir === 'desc' ? -1 : 1;
    return (subtasks || []).slice().sort(function (a, b) {
      var cmp = 0;
      if (by === 'date_added' || by === 'assigned_date') {
        cmp = compareDateStrOrEmpty(a.assigned_date, b.assigned_date);
      } else if (by === 'priority') {
        var pa = a.priority != null ? a.priority : 0;
        var pb = b.priority != null ? b.priority : 0;
        cmp = pa - pb;
      } else {
        return 0;
      }
      return cmp * dir;
    });
  }

  function getTasks() {
    var tasks = state.data.tasks || [];
    tasks.forEach(normalizeTask);
    return tasks;
  }

  function getSettings() {
    return state.data.settings || DEFAULT_SETTINGS;
  }

  function setData(data) {
    state.data = data || {};
    if (!state.data.tasks) state.data.tasks = [];
    var merged = Object.assign({}, DEFAULT_PRIORITY_COLORS, (state.data.settings && state.data.settings.priorityColors));
    if (!state.data.settings) state.data.settings = {};
    state.data.settings.priorityColors = merged;
    if (!Array.isArray(state.data.settings.categories) || state.data.settings.categories.length === 0) {
      state.data.settings.categories = DEFAULT_CATEGORIES.slice();
    }
    var wh = parseFloat(state.data.settings.workingHoursPerDay);
    if (isNaN(wh) || wh <= 0) state.data.settings.workingHoursPerDay = 8;
    if (!Array.isArray(state.data.settings.dayOffs)) state.data.settings.dayOffs = [];
    if (!Array.isArray(state.data.settings.projects)) state.data.settings.projects = [];
    else {
      state.data.settings.projects = state.data.settings.projects.map(function (p) {
        return String(p).trim();
      }).filter(Boolean);
    }
    if (!state.data.settings.theme) state.data.settings.theme = 'classic';
    if (!state.data.settings.subtaskVisibilityByTaskId || typeof state.data.settings.subtaskVisibilityByTaskId !== 'object') {
      state.data.settings.subtaskVisibilityByTaskId = {};
    }
    if (!state.data.settings.subtaskViewportByTaskId || typeof state.data.settings.subtaskViewportByTaskId !== 'object') {
      state.data.settings.subtaskViewportByTaskId = {};
    }
    var ngc = parseInt(state.data.settings.notesGridColumns, 10);
    if (isNaN(ngc) || ngc < 1 || ngc > 5) state.data.settings.notesGridColumns = 5;
    else state.data.settings.notesGridColumns = ngc;
    if (!state.data.notes || typeof state.data.notes !== 'object') state.data.notes = { items: [] };
    if (!Array.isArray(state.data.notes.items)) state.data.notes.items = [];
    state.data.notes.items = state.data.notes.items.map(normalizeNoteItem);
    mergeRelaxSettingsInto(state.data.settings);
  }

  function mergeRelaxSettingsInto(settingsObj) {
    if (!settingsObj) return;
    var d = DEFAULT_SETTINGS.relax;
    if (!settingsObj.relax || typeof settingsObj.relax !== 'object') {
      settingsObj.relax = { breakPresetMinutes: d.breakPresetMinutes, workPresetMinutes: d.workPresetMinutes, soundEnabled: d.soundEnabled, tipIndex: d.tipIndex };
      return;
    }
    var r = settingsObj.relax;
    var bp = parseInt(r.breakPresetMinutes, 10);
    var wp = parseInt(r.workPresetMinutes, 10);
    r.breakPresetMinutes = !isNaN(bp) && bp > 0 && bp <= 180 ? bp : d.breakPresetMinutes;
    r.workPresetMinutes = !isNaN(wp) && wp > 0 && wp <= 240 ? wp : d.workPresetMinutes;
    r.soundEnabled = !!r.soundEnabled;
    var ti = parseInt(r.tipIndex, 10);
    r.tipIndex = !isNaN(ti) && ti >= 0 ? ti : 0;
  }

  function getNotesGridColumns() {
    var n = parseInt(getSettings().notesGridColumns, 10);
    if (isNaN(n) || n < 1 || n > 5) return 5;
    return n;
  }

  function syncNotesGridColumnsUi() {
    var n = getNotesGridColumns();
    var panel = document.getElementById('view-notes');
    if (panel) panel.style.setProperty('--notes-cols', String(n));
    var sel = document.getElementById('notes-grid-columns-select');
    if (sel) sel.value = String(n);
  }

  function normalizeNoteItem(raw) {
    var id = raw && raw.id ? String(raw.id) : generateId();
    var kind = raw && raw.kind === 'todo' ? 'todo' : 'note';
    var title = raw && raw.title != null ? String(raw.title) : '';
    var body = raw && raw.body != null ? String(raw.body) : '';
    var color = raw && raw.color != null ? String(raw.color) : '';
    var checklist = [];
    if (kind === 'todo' && raw && Array.isArray(raw.checklist)) {
      raw.checklist.forEach(function (row) {
        checklist.push({
          id: row && row.id ? String(row.id) : generateId(),
          text: row && row.text != null ? String(row.text) : '',
          done: !!(row && row.done)
        });
      });
    }
    if (kind === 'todo' && checklist.length === 0) {
      checklist.push({ id: generateId(), text: '', done: false });
    }
    var nowIso = new Date().toISOString();
    var updatedAt = raw && raw.updatedAt ? String(raw.updatedAt) : nowIso;
    var createdAt;
    if (raw && raw.createdAt) {
      createdAt = String(raw.createdAt);
    } else if (raw && raw.updatedAt) {
      createdAt = String(raw.updatedAt);
    } else {
      createdAt = nowIso;
    }
    var reminders = normalizeRemindersArray(raw && raw.reminders);
    return {
      id: id,
      kind: kind,
      title: title,
      body: body,
      color: color,
      checklist: checklist,
      createdAt: createdAt,
      updatedAt: updatedAt,
      reminders: reminders
    };
  }

  function normalizeReminderEntry(raw) {
    raw = raw || {};
    var id = raw.id ? String(raw.id) : generateId();
    var fireAt = raw.fireAt != null ? String(raw.fireAt) : '';
    if (fireAt) {
      var fd = new Date(fireAt);
      if (isNaN(fd.getTime())) fireAt = '';
    }
    var mode = raw.mode === 'relative' ? 'relative' : 'absolute';
    var label = raw.label != null ? String(raw.label) : '';
    var dismissedAt = raw.dismissedAt ? String(raw.dismissedAt) : '';
    return {
      id: id,
      fireAt: fireAt,
      mode: mode,
      label: label,
      dismissedAt: dismissedAt
    };
  }

  function normalizeRemindersArray(arr) {
    if (!Array.isArray(arr)) return [];
    var out = [];
    arr.forEach(function (raw) {
      var r = normalizeReminderEntry(raw);
      if (r.fireAt) out.push(r);
    });
    return out;
  }

  function isNoteReminderScheduled(r) {
    if (!r || !r.fireAt || r.dismissedAt) return false;
    var t = new Date(r.fireAt).getTime();
    return !isNaN(t) && t > Date.now();
  }

  function getNextNoteReminder(item) {
    var list = item && Array.isArray(item.reminders) ? item.reminders : [];
    var best = null;
    var bestT = Infinity;
    list.forEach(function (r) {
      if (!isNoteReminderScheduled(r)) return;
      var t = new Date(r.fireAt).getTime();
      if (t < bestT) {
        bestT = t;
        best = r;
      }
    });
    return best;
  }

  function formatNoteReminderShort(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function collectNoteRemindersSchedulePayload() {
    var items = state.data.notes && state.data.notes.items ? state.data.notes.items : [];
    var list = [];
    items.forEach(function (item) {
      var reminders = Array.isArray(item.reminders) ? item.reminders : [];
      reminders.forEach(function (r) {
        if (!isNoteReminderScheduled(r)) return;
        list.push({
          noteId: item.id,
          reminderId: r.id,
          fireAt: r.fireAt,
          title: (item.title && String(item.title).trim()) ? String(item.title).trim() : 'Reminder'
        });
      });
    });
    list.sort(function (a, b) {
      return new Date(a.fireAt) - new Date(b.fireAt);
    });
    return list;
  }

  function syncNoteRemindersToMain() {
    if (!window.taskAPI || typeof window.taskAPI.syncNoteReminders !== 'function') return;
    var payload = collectNoteRemindersSchedulePayload();
    window.taskAPI.syncNoteReminders(payload).catch(function () { /* ignore */ });
  }

  function applyNoteReminderRemoteAction(payload) {
    if (!payload || typeof payload !== 'object') return;
    var action = payload.action;
    var noteId = payload.noteId != null ? String(payload.noteId) : '';
    var reminderId = payload.reminderId != null ? String(payload.reminderId) : '';
    if (!noteId || !reminderId) return;
    var item = findNoteItemById(noteId);
    if (!item || !Array.isArray(item.reminders)) return;
    var r = item.reminders.find(function (x) { return x.id === reminderId; });
    if (!r) return;
    if (action === 'dismiss') {
      r.dismissedAt = new Date().toISOString();
    } else if (action === 'snooze') {
      var mins = parseInt(payload.minutes, 10);
      if (isNaN(mins) || mins <= 0) mins = 15;
      r.dismissedAt = '';
      r.fireAt = new Date(Date.now() + mins * 60000).toISOString();
    } else if (action === 'open') {
      r.dismissedAt = new Date().toISOString();
    }
    item.updatedAt = new Date().toISOString();
    var doOpen = action === 'open';
    save().then(function () {
      render();
      syncNoteRemindersToMain();
      if (doOpen) {
        setView('notes');
        openNotesModal(noteId);
      }
    });
  }

  function getNoteCreatedDateKey(item) {
    var iso = item && item.createdAt ? String(item.createdAt) : (item && item.updatedAt ? String(item.updatedAt) : '');
    if (!iso) return '';
    var d = iso.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    try {
      var t = new Date(iso);
      if (!isNaN(t.getTime())) return t.toISOString().slice(0, 10);
    } catch (e) { /* ignore */ }
    return '';
  }

  function formatNoteCreatedPillLabel(item) {
    var key = getNoteCreatedDateKey(item);
    if (!key) return '';
    try {
      var d = new Date(key + 'T12:00:00');
      if (isNaN(d.getTime())) return key;
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return key;
    }
  }

  function noteMatchesDateFilter(item, f) {
    if (!f || f.mode === 'all') return true;
    var key = getNoteCreatedDateKey(item);
    if (!key) return false;
    if (f.mode === 'day') return f.date && key === f.date;
    if (f.mode === 'month') return f.month && key.slice(0, 7) === f.month;
    if (f.mode === 'range') {
      if (f.from && f.to) return key >= f.from && key <= f.to;
      if (f.from && !f.to) return key >= f.from;
      if (!f.from && f.to) return key <= f.to;
      return true;
    }
    return true;
  }

  function findNoteItemById(noteId) {
    var items = state.data.notes && state.data.notes.items ? state.data.notes.items : [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === noteId) return items[i];
    }
    return null;
  }

  function canonicalSubtaskStatusLabel(s) {
    var st = (s && s.status) || 'Open';
    if (st === 'Completed') return 'Done';
    if (st === 'Closed') return 'Dropped';
    if (st === 'Done' || st === 'Dropped' || st === 'Open' || st === 'Ongoing') return st;
    return 'Open';
  }

  /** Default all true; missing keys treated as true. */
  function getSubtaskVisibilityForTask(taskId) {
    var map = getSettings().subtaskVisibilityByTaskId || {};
    var v = map[taskId];
    var def = { Open: true, Ongoing: true, Done: true, Dropped: true };
    if (!v || typeof v !== 'object') return def;
    return {
      Open: v.Open !== false,
      Ongoing: v.Ongoing !== false,
      Done: v.Done !== false,
      Dropped: v.Dropped !== false
    };
  }

  function getSubtaskViewportForTask(taskId) {
    var m = getSettings().subtaskViewportByTaskId || {};
    var v = m[taskId];
    var pageSize = DEFAULT_SUBTASK_VIEWPORT_PAGE_SIZE;
    var startIndex = 0;
    if (v && typeof v === 'object') {
      if (v.pageSize != null) {
        var ps = parseInt(v.pageSize, 10);
        if (!isNaN(ps)) pageSize = Math.min(50, Math.max(1, ps));
      }
      if (v.startIndex != null) {
        var si = parseInt(v.startIndex, 10);
        if (!isNaN(si)) startIndex = Math.max(0, si);
      }
    }
    return { pageSize: pageSize, startIndex: startIndex };
  }

  function setSubtaskViewportForTask(taskId, patch) {
    if (!state.data.settings.subtaskViewportByTaskId) state.data.settings.subtaskViewportByTaskId = {};
    var cur = getSubtaskViewportForTask(taskId);
    state.data.settings.subtaskViewportByTaskId[taskId] = {
      pageSize: patch.pageSize != null ? patch.pageSize : cur.pageSize,
      startIndex: patch.startIndex != null ? patch.startIndex : cur.startIndex
    };
  }

  /** Sub-tasks after sort + View Type visibility filter (same order as the list). */
  function getFilteredSubtasksForTask(task) {
    if (!task || !task.subtasks || !task.subtasks.length) return [];
    var sorted = sortSubtasksForTask(task.id, task.subtasks);
    var vis = getSubtaskVisibilityForTask(task.id);
    return sorted.filter(function (s) {
      return vis[canonicalSubtaskStatusLabel(s)] === true;
    });
  }

  var notesSaveTimer = null;

  function scheduleNotesSave() {
    if (notesSaveTimer) clearTimeout(notesSaveTimer);
    notesSaveTimer = setTimeout(function () {
      notesSaveTimer = null;
      save();
    }, 450);
  }

  /** Persist notes-related edits. When force is false, only saves if a debounced save was pending (unsynced typing).
   *  Unconditional save here previously overwrote the profile on Reload / tab hide with stale in-memory notes
   *  after external JSON edits (e.g. repopulating notes while the app still held an older session). */
  function flushNotesSave(force) {
    var hadTimer = !!notesSaveTimer;
    if (notesSaveTimer) {
      clearTimeout(notesSaveTimer);
      notesSaveTimer = null;
    }
    if (hadTimer || force) save();
  }

  function focusLastTodoTextInCard(card) {
    if (!card) return;
    var rows = card.querySelectorAll('.notes-checklist-item');
    var last = rows[rows.length - 1];
    var inp = last && last.querySelector('.notes-todo-text');
    if (inp) inp.focus();
  }

  function notesModalUnlockLazyFields(card) {
    if (!card) return;
    card.querySelectorAll('.notes-card-title[readonly], textarea.notes-card-body[readonly], .notes-todo-text[readonly]').forEach(function (el) {
      el.removeAttribute('readonly');
    });
  }

  function renderNotesModal() {
    var id = state.notesModalNoteId;
    var body = document.getElementById('notes-modal-body');
    var item = findNoteItemById(id);
    if (!body) return;
    if (!item) {
      body.innerHTML = '';
      return;
    }
    body.innerHTML = renderNoteCardHtml(item, { compact: false, modal: true });
    body.querySelectorAll('textarea.notes-card-body.auto-resize').forEach(function (ta) {
      autoResizeTextarea(ta);
    });
    body.querySelectorAll('.notes-card-reminders').forEach(function (wrap) {
      var dt = wrap.querySelector('.notes-reminder-datetime');
      if (dt && !dt.value) {
        dt.value = localInputValueFromDate(new Date(Date.now() + 60 * 60000));
      }
    });
  }

  function openNotesModal(id, focusOpts) {
    flushNotesSave();
    var item = findNoteItemById(id);
    if (!item) return;
    state.notesModalNoteId = id;
    var m = document.getElementById('notes-modal');
    if (m) {
      m.classList.add('open');
      m.setAttribute('aria-hidden', 'false');
    }
    renderNotesModal();
    requestAnimationFrame(function () {
      var b = document.getElementById('notes-modal-body');
      var card = b && b.querySelector('.notes-card');
      if (!card) return;
      if (focusOpts && focusOpts.focusLastTodo) {
        notesModalUnlockLazyFields(card);
        focusLastTodoTextInCard(card);
        return;
      }
    });
  }

  function closeNotesModal(skipSync) {
    var body = document.getElementById('notes-modal-body');
    if (!skipSync && body) {
      var card = body.querySelector('.notes-card');
      if (card) syncNoteCardToModel(card);
    }
    flushNotesSave();
    state.notesModalNoteId = null;
    var m = document.getElementById('notes-modal');
    if (m) {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true');
    }
    if (body) body.innerHTML = '';
    renderNotes();
  }

  function notesAfterChecklistAdd(nid2) {
    var it = findNoteItemById(nid2);
    if (!it) return;
    flushNotesSave(true);
    renderNotes();
    var n = (it.checklist || []).length;
    var modalOpen = state.notesModalNoteId === nid2;
    if (n > 5 && !modalOpen) {
      openNotesModal(nid2, { focusLastTodo: true });
      return;
    }
    if (modalOpen) {
      renderNotesModal();
      requestAnimationFrame(function () {
        var card = document.querySelector('#notes-modal-body .notes-card');
        notesModalUnlockLazyFields(card);
        focusLastTodoTextInCard(card);
      });
      return;
    }
    var gridCard = document.querySelector('#notes-board .notes-card[data-note-id="' + nid2 + '"]');
    focusLastTodoTextInCard(gridCard);
  }

  function notesOnChecklistAddClick(addBtn) {
    var cardA = addBtn.closest('.notes-card');
    var nid2 = cardA && cardA.getAttribute('data-note-id');
    var it = findNoteItemById(nid2);
    if (!it || it.kind !== 'todo') return;
    syncNoteCardToModel(cardA);
    it.checklist.push({ id: generateId(), text: '', done: false });
    it.updatedAt = new Date().toISOString();
    notesAfterChecklistAdd(nid2);
  }

  function notesOnCardDelete(delBtn) {
    var card = delBtn.closest('.notes-card');
    var nid = card && card.getAttribute('data-note-id');
    if (!nid || !state.data.notes) return;
    var hideModal = state.notesModalNoteId === nid;
    state.data.notes.items = state.data.notes.items.filter(function (x) { return x.id !== nid; });
    flushNotesSave(true);
    if (hideModal) {
      state.notesModalNoteId = null;
      var modalEl = document.getElementById('notes-modal');
      if (modalEl) {
        modalEl.classList.remove('open');
        modalEl.setAttribute('aria-hidden', 'true');
      }
      var mb = document.getElementById('notes-modal-body');
      if (mb) mb.innerHTML = '';
    }
    renderNotes();
  }

  function syncNoteCardToModel(card) {
    if (!card || !state.data.notes || !state.data.notes.items) return;
    var noteId = card.getAttribute('data-note-id');
    var item = findNoteItemById(noteId);
    if (!item) return;
    var titleInput = card.querySelector('input.notes-card-title');
    if (titleInput) item.title = titleInput.value;
    item.updatedAt = new Date().toISOString();
    if (item.kind === 'note') {
      var bodyEl = card.querySelector('textarea.notes-card-body');
      if (bodyEl) item.body = bodyEl.value;
      return;
    }
    card.querySelectorAll('.notes-checklist-item').forEach(function (row) {
      var itemId = row.getAttribute('data-item-id');
      var chk = row.querySelector('.notes-todo-done');
      var txt = row.querySelector('.notes-todo-text');
      for (var i = 0; i < item.checklist.length; i++) {
        if (item.checklist[i].id === itemId) {
          if (chk) item.checklist[i].done = chk.checked;
          if (txt) item.checklist[i].text = txt.value;
          break;
        }
      }
    });
  }

  function renderNoteRemindersSection(item, opts) {
    opts = opts || {};
    var compact = opts.compact !== false;
    var isModal = opts.modal === true;
    var readonlyPreview = compact && !isModal;
    var nid = escapeHtml(item.id);
    var next = getNextNoteReminder(item);
    var nextTxt = next ? formatNoteReminderShort(next.fireAt) : '';
    if (readonlyPreview) {
      if (!next) {
        return '<div class="notes-card-reminders notes-card-reminders--compact" aria-hidden="true"></div>';
      }
      var line =
        '<div class="notes-reminder-pill" title="Reminder set — open note to edit">' +
        '<span class="notes-reminder-bell notes-reminder-bell--ring" aria-hidden="true">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>' +
        '<span class="notes-reminder-pill-text">' + escapeHtml(nextTxt) + '</span>' +
        '</div>';
      return '<div class="notes-card-reminders notes-card-reminders--compact">' + line + '</div>';
    }
    if (!isModal) return '';
    var scheduledRows = (item.reminders || []).filter(isNoteReminderScheduled);
    var activeRow = scheduledRows.length
      ? '<ul class="notes-reminder-list notes-reminder-list--single">' + scheduledRows.map(function (r) {
        var lbl = formatNoteReminderShort(r.fireAt) || r.fireAt.slice(0, 16);
        return '<li class="notes-reminder-item">' +
          '<span class="notes-reminder-when">' + escapeHtml(lbl) + '</span>' +
          '<button type="button" class="btn-small notes-reminder-remove" data-note-id="' + nid + '" data-reminder-id="' + escapeHtml(r.id) + '">Remove</button>' +
          '</li>';
      }).join('') + '</ul>'
      : '<p class="notes-reminder-hint muted">No reminder scheduled yet.</p>';
    return '<div class="notes-card-reminders notes-card-reminders--modal" data-note-id="' + nid + '">' +
      '<div class="notes-reminder-section-head">' +
      '<span class="notes-reminder-section-title">Reminder</span>' +
      '<span class="notes-reminder-section-sub muted">One schedule per note: choose a date and time, or a countdown.</span>' +
      '</div>' +
      activeRow +
      '<div class="notes-reminder-toolbar">' +
      '<button type="button" class="btn-secondary notes-reminder-dropdown-toggle" data-note-id="' + nid + '" aria-expanded="false" aria-haspopup="true">' +
      (scheduledRows.length ? 'Change reminder' : 'Add reminder') +
      '</button></div>' +
      '<div class="notes-reminder-dropdown" hidden>' +
      '<fieldset class="notes-reminder-fieldset">' +
      '<legend class="notes-reminder-legend">How should we remind you?</legend>' +
      '<div class="notes-reminder-mode-row">' +
      '<label class="notes-reminder-mode-label"><input type="radio" name="nr-mode-' + nid + '" class="notes-reminder-mode" value="absolute" checked> <span>At a specific date and time</span></label>' +
      '<label class="notes-reminder-mode-label"><input type="radio" name="nr-mode-' + nid + '" class="notes-reminder-mode" value="relative"> <span>After a countdown</span></label>' +
      '</div></fieldset>' +
      '<div class="notes-reminder-abs">' +
      '<label class="notes-reminder-field-label" for="nr-dt-' + nid + '">Date and time</label>' +
      '<input type="datetime-local" id="nr-dt-' + nid + '" class="notes-reminder-datetime add-task-input" aria-label="Reminder date and time">' +
      '</div>' +
      '<div class="notes-reminder-rel" hidden>' +
      '<label class="notes-reminder-field-label" for="nr-num-' + nid + '">Countdown length</label>' +
      '<div class="notes-reminder-rel-row">' +
      '<input type="number" id="nr-num-' + nid + '" class="notes-reminder-rel-num add-task-input" min="1" max="999" value="15" aria-label="Countdown amount">' +
      '<select class="notes-reminder-rel-unit add-task-input" aria-label="Countdown unit">' +
      '<option value="minutes" selected>Minutes</option><option value="hours">Hours</option></select></div>' +
      '<div class="notes-reminder-presets" role="group" aria-label="Quick countdown presets">' +
      '<span class="notes-reminder-presets-label muted">Quick picks</span>' +
      '<button type="button" class="btn-small notes-reminder-preset" data-min="1">1 min</button>' +
      '<button type="button" class="btn-small notes-reminder-preset" data-min="5">5 min</button>' +
      '<button type="button" class="btn-small notes-reminder-preset" data-min="15">15 min</button>' +
      '<button type="button" class="btn-small notes-reminder-preset" data-min="30">30 min</button>' +
      '<button type="button" class="btn-small notes-reminder-preset" data-min="60">1 hour</button>' +
      '</div></div>' +
      '<div class="notes-reminder-dropdown-actions">' +
      '<button type="button" class="btn-primary notes-reminder-save-btn" data-note-id="' + nid + '">Save reminder</button>' +
      '<button type="button" class="btn-secondary notes-reminder-cancel-dropdown">Cancel</button>' +
      '</div></div></div>';
  }

  function localInputValueFromDate(d) {
    if (!d || isNaN(d.getTime())) return '';
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function addNoteReminderForNoteId(noteId, options) {
    options = options || {};
    var item = findNoteItemById(noteId);
    if (!item) return;
    if (!Array.isArray(item.reminders)) item.reminders = [];
    var fireAtIso = options.fireAtIso;
    var mode = options.mode === 'relative' ? 'relative' : 'absolute';
    if (!fireAtIso) return;
    item.reminders = (item.reminders || []).filter(function (r) {
      return !isNoteReminderScheduled(r);
    });
    item.reminders.push({
      id: generateId(),
      fireAt: fireAtIso,
      mode: mode,
      label: '',
      dismissedAt: ''
    });
    item.updatedAt = new Date().toISOString();
    renderNotes();
    if (state.notesModalNoteId === noteId) renderNotesModal();
    flushNotesSave(true);
    syncNoteRemindersToMain();
  }

  function removeNoteReminder(noteId, reminderId) {
    var item = findNoteItemById(noteId);
    if (!item || !Array.isArray(item.reminders)) return;
    item.reminders = item.reminders.filter(function (r) { return r.id !== reminderId; });
    item.updatedAt = new Date().toISOString();
    renderNotes();
    if (state.notesModalNoteId === noteId) renderNotesModal();
    flushNotesSave(true);
    syncNoteRemindersToMain();
  }

  function wireNotesReminderModalEventsOnce() {
    var modal = document.getElementById('notes-modal');
    if (!modal || modal.dataset.boundReminders === '1') return;
    modal.dataset.boundReminders = '1';
    modal.addEventListener('change', function (e) {
      if (state.view !== 'notes') return;
      var modeEl = e.target.closest('.notes-reminder-mode');
      if (!modeEl || !modal.contains(modeEl)) return;
      var wrap = modeEl.closest('.notes-card-reminders');
      if (!wrap) return;
      var abs = wrap.querySelector('.notes-reminder-abs');
      var rel = wrap.querySelector('.notes-reminder-rel');
      var relMode = wrap.querySelector('.notes-reminder-mode[value="relative"]');
      if (relMode && relMode.checked) {
        if (abs) abs.hidden = true;
        if (rel) rel.hidden = false;
      } else {
        if (abs) abs.hidden = false;
        if (rel) rel.hidden = true;
      }
    });
    modal.addEventListener('click', function (e) {
      if (state.view !== 'notes') return;
      var body = document.getElementById('notes-modal-body');
      if (!body || !body.contains(e.target)) return;

      function closeReminderDropdowns(container) {
        if (!container) return;
        container.querySelectorAll('.notes-reminder-dropdown').forEach(function (dd) {
          dd.hidden = true;
        });
        container.querySelectorAll('.notes-reminder-dropdown-toggle').forEach(function (t) {
          t.setAttribute('aria-expanded', 'false');
        });
      }

      var toggle = e.target.closest('.notes-reminder-dropdown-toggle');
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        var wrapT = toggle.closest('.notes-card-reminders');
        if (!wrapT) return;
        var ddT = wrapT.querySelector('.notes-reminder-dropdown');
        var willOpen = ddT && ddT.hidden;
        closeReminderDropdowns(body);
        if (ddT && willOpen) {
          ddT.hidden = false;
          toggle.setAttribute('aria-expanded', 'true');
        }
        return;
      }
      var cancelDd = e.target.closest('.notes-reminder-cancel-dropdown');
      if (cancelDd) {
        e.preventDefault();
        closeReminderDropdowns(body);
        return;
      }

      var preset = e.target.closest('.notes-reminder-preset');
      if (preset) {
        e.preventDefault();
        var min = parseInt(preset.getAttribute('data-min'), 10);
        if (isNaN(min)) return;
        var wrap = preset.closest('.notes-card-reminders');
        if (!wrap) return;
        var num = wrap.querySelector('.notes-reminder-rel-num');
        if (num) num.value = String(min);
        var rRel = wrap.querySelector('.notes-reminder-mode[value="relative"]');
        if (rRel) {
          rRel.checked = true;
          rRel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      var saveBtn = e.target.closest('.notes-reminder-save-btn');
      if (saveBtn) {
        e.preventDefault();
        var nid = saveBtn.getAttribute('data-note-id');
        var wrap2 = saveBtn.closest('.notes-card-reminders');
        if (!nid || !wrap2) return;
        var useRel = wrap2.querySelector('.notes-reminder-mode[value="relative"]');
        var fireAtIso = '';
        var mode = 'absolute';
        if (useRel && useRel.checked) {
          mode = 'relative';
          var n = parseInt((wrap2.querySelector('.notes-reminder-rel-num') || {}).value, 10);
          var unit = (wrap2.querySelector('.notes-reminder-rel-unit') || {}).value || 'minutes';
          if (isNaN(n) || n <= 0) n = 15;
          var ms = unit === 'hours' ? n * 3600000 : n * 60000;
          fireAtIso = new Date(Date.now() + ms).toISOString();
        } else {
          var dt = (wrap2.querySelector('.notes-reminder-datetime') || {}).value;
          if (!dt) return;
          var d = new Date(dt);
          if (isNaN(d.getTime())) return;
          fireAtIso = d.toISOString();
        }
        addNoteReminderForNoteId(nid, { fireAtIso: fireAtIso, mode: mode });
        closeReminderDropdowns(body);
        return;
      }
      var remBtn = e.target.closest('.notes-reminder-remove');
      if (remBtn) {
        e.preventDefault();
        var rnid = remBtn.getAttribute('data-note-id');
        var rid = remBtn.getAttribute('data-reminder-id');
        if (rnid && rid) removeNoteReminder(rnid, rid);
        closeReminderDropdowns(body);
        return;
      }
      if (!e.target.closest('.notes-reminder-dropdown') && !e.target.closest('.notes-reminder-dropdown-toggle')) {
        closeReminderDropdowns(body);
      }
    });
  }

  function renderNoteCardHtml(item, opts) {
    opts = opts || {};
    var compact = opts.compact !== false;
    var isModal = opts.modal === true;
    var readonlyPreview = compact && !isModal;
    var accent = String(Math.abs(hashStringSimple(item.id)) % 4);
    var cardMods = '';
    if (isModal) cardMods += ' notes-card--modal';
    if (readonlyPreview) cardMods += ' notes-card--readonly';
    var delBtn = isModal
      ? '<button type="button" class="notes-card-delete notes-card-delete--modal" title="Delete" aria-label="Delete">' +
        '<svg class="notes-delete-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
        '<span class="notes-delete-label">Delete</span></button>'
      : '<button type="button" class="notes-card-delete" title="Delete" aria-label="Delete note">' +
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg></button>';
    var rawTitle = item.title != null ? String(item.title) : '';
    var titleVal = escapeHtml(rawTitle);
    var titleIsEmpty = !rawTitle.trim();
    var titleBlock = readonlyPreview
      ? (titleIsEmpty
        ? '<div class="notes-card-title-display notes-card-title-display--empty">No title</div>'
        : '<div class="notes-card-title-display">' + titleVal + '</div>')
      : '<input type="text" class="notes-card-title"' + (isModal ? ' readonly' : '') + ' placeholder="Title" value="' + titleVal + '" autocomplete="off">';
    var pillLabel = formatNoteCreatedPillLabel(item);
    var datePillHtml = pillLabel
      ? '<span class="notes-card-date-pill" title="Created">' + escapeHtml(pillLabel) + '</span>'
      : '';
    var headInner = '<div class="notes-card-head-inner">' + titleBlock + datePillHtml + '</div>';
    var remindersHtml = renderNoteRemindersSection(item, { compact: compact, modal: isModal });
    if (item.kind === 'todo') {
      var fullList = item.checklist || [];
      var rowSource = compact ? fullList.slice(0, 5) : fullList;
      var moreCount = compact && fullList.length > 5 ? fullList.length - 5 : 0;
      var rows = rowSource.map(function (row) {
        var done = row.done ? ' checked' : '';
        var t = escapeHtml(row.text || '');
        var liClass = 'notes-checklist-item' + (row.done ? ' notes-checklist-item--done' : '');
        if (readonlyPreview) {
          return '<li class="' + liClass + '" data-item-id="' + escapeHtml(row.id) + '">' +
            '<div class="notes-checklist-row notes-checklist-row--readonly">' +
            '<input type="checkbox" class="notes-todo-done"' + done + ' title="Done">' +
            '<span class="notes-todo-text-display">' + t + '</span>' +
            '</div></li>';
        }
        return '<li class="' + liClass + '" data-item-id="' + escapeHtml(row.id) + '">' +
          '<label class="notes-checklist-row">' +
          '<input type="checkbox" class="notes-todo-done"' + done + '>' +
          '<input type="text" class="notes-todo-text"' + (isModal ? ' readonly' : '') + ' value="' + t + '" placeholder="Item…" autocomplete="off">' +
          '</label></li>';
      }).join('');
      var truncatedHint = moreCount > 0
        ? '<p class="notes-checklist-truncated muted">+' + moreCount + ' more — open to view</p>'
        : '';
      var addBtnHtml = readonlyPreview ? '' : '<button type="button" class="btn-small notes-checklist-add">Add item</button>';
      return '<article class="notes-card notes-card--todo notes-card--accent-' + accent + cardMods + '" data-note-id="' + escapeHtml(item.id) + '">' +
        '<div class="notes-card-top">' + delBtn + headInner + '</div>' +
        remindersHtml +
        '<ul class="notes-checklist">' + rows + '</ul>' +
        truncatedHint +
        addBtnHtml +
        '</article>';
    }
    var rawBody = item.body != null ? String(item.body) : '';
    var bodyEsc = escapeHtml(rawBody);
    var bodyIsEmpty = !rawBody.trim();
    if (readonlyPreview) {
      var bodyInner = bodyIsEmpty ? 'No content' : bodyEsc;
      var bodyClass = 'notes-card-body-display' + (bodyIsEmpty ? ' notes-card-body-display--empty' : '');
      return '<article class="notes-card notes-card--note notes-card--accent-' + accent + cardMods + '" data-note-id="' + escapeHtml(item.id) + '">' +
        '<div class="notes-card-top">' + delBtn + headInner + '</div>' +
        remindersHtml +
        '<div class="' + bodyClass + '">' + bodyInner + '</div>' +
        '</article>';
    }
    return '<article class="notes-card notes-card--note notes-card--accent-' + accent + cardMods + '" data-note-id="' + escapeHtml(item.id) + '">' +
      '<div class="notes-card-top">' + delBtn + headInner + '</div>' +
      remindersHtml +
      '<textarea class="notes-card-body auto-resize" rows="4" placeholder="Take a note…"' + (isModal ? ' readonly' : '') + '>' + bodyEsc + '</textarea>' +
      '</article>';
  }

  function hashStringSimple(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return h;
  }

  function renderNotes() {
    var board = document.getElementById('notes-board');
    if (!board || !state.data.notes) return;
    var allItems = state.data.notes.items || [];
    var f = state.notesDateFilter || { mode: 'all' };
    var items = allItems.filter(function (it) {
      return noteMatchesDateFilter(it, f);
    });
    board.innerHTML = items.map(function (it) {
      return renderNoteCardHtml(it, { compact: true });
    }).join('');
  }

  function bindNotesEventsOnce() {
    var board = document.getElementById('notes-board');
    if (!board || board.dataset.boundNotes === '1') return;
    board.dataset.boundNotes = '1';
    board.addEventListener('input', function (e) {
      if (state.view !== 'notes') return;
      var card = e.target.closest('.notes-card');
      if (!card || !board.contains(card)) return;
      syncNoteCardToModel(card);
      scheduleNotesSave();
    });
    board.addEventListener('change', function (e) {
      if (state.view !== 'notes') return;
      var card = e.target.closest('.notes-card');
      if (!card || !board.contains(card)) return;
      syncNoteCardToModel(card);
      scheduleNotesSave();
    });
    board.addEventListener('click', function (e) {
      if (state.view !== 'notes') return;
      var del = e.target.closest('.notes-card-delete');
      if (del) {
        e.preventDefault();
        notesOnCardDelete(del);
        return;
      }
      var addBtn = e.target.closest('.notes-checklist-add');
      if (addBtn) {
        e.preventDefault();
        notesOnChecklistAddClick(addBtn);
        return;
      }
      var cardHit = e.target.closest('.notes-card');
      if (cardHit && board.contains(cardHit)) {
        if (e.target.closest('input.notes-todo-done')) return;
        if (e.target.closest('button')) return;
        var nidOpen = cardHit.getAttribute('data-note-id');
        if (nidOpen) openNotesModal(nidOpen);
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && state.view === 'notes') flushNotesSave();
    });
  }

  function bindNotesModalEventsOnce() {
    var modal = document.getElementById('notes-modal');
    if (!modal || modal.dataset.boundNotesModal === '1') return;
    modal.dataset.boundNotesModal = '1';
    var backdrop = modal.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', function () { closeNotesModal(false); });
    modal.addEventListener('input', function (e) {
      if (state.view !== 'notes') return;
      var body = document.getElementById('notes-modal-body');
      var card = e.target.closest('.notes-card');
      if (!body || !card || !body.contains(card)) return;
      syncNoteCardToModel(card);
      scheduleNotesSave();
    });
    modal.addEventListener('change', function (e) {
      if (state.view !== 'notes') return;
      var body = document.getElementById('notes-modal-body');
      var card = e.target.closest('.notes-card');
      if (!body || !card || !body.contains(card)) return;
      syncNoteCardToModel(card);
      scheduleNotesSave();
    });
    modal.addEventListener('focusin', function (e) {
      if (state.view !== 'notes') return;
      var body = document.getElementById('notes-modal-body');
      var card = e.target.closest('.notes-card');
      if (!body || !card || !body.contains(card)) return;
      var t = e.target;
      if (t.matches('.notes-card-title[readonly], textarea.notes-card-body[readonly], .notes-todo-text[readonly]')) {
        t.removeAttribute('readonly');
      }
    });
    modal.addEventListener('click', function (e) {
      if (state.view !== 'notes') return;
      var body = document.getElementById('notes-modal-body');
      if (!body) return;
      var del = e.target.closest('.notes-card-delete');
      if (del && body.contains(del)) {
        e.preventDefault();
        notesOnCardDelete(del);
        return;
      }
      var addBtn = e.target.closest('.notes-checklist-add');
      if (addBtn && body.contains(addBtn)) {
        e.preventDefault();
        notesOnChecklistAddClick(addBtn);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var m = document.getElementById('notes-modal');
      if (!m || !m.classList.contains('open')) return;
      closeNotesModal(false);
    });
  }

  function syncNotesFilterInputsVisibility() {
    var modeEl = document.getElementById('notes-filter-mode');
    if (!modeEl) return;
    var m = modeEl.value || 'all';
    var day = document.getElementById('notes-filter-day');
    var month = document.getElementById('notes-filter-month');
    var rangeWrap = document.getElementById('notes-filter-range-wrap');
    if (day) day.hidden = m !== 'day';
    if (month) month.hidden = m !== 'month';
    if (rangeWrap) rangeWrap.hidden = m !== 'range';
  }

  function syncNotesFilterPanelFromState() {
    var f = state.notesDateFilter || { mode: 'all' };
    var mode = document.getElementById('notes-filter-mode');
    var day = document.getElementById('notes-filter-day');
    var month = document.getElementById('notes-filter-month');
    var from = document.getElementById('notes-filter-from');
    var to = document.getElementById('notes-filter-to');
    if (mode) mode.value = f.mode || 'all';
    if (day) day.value = f.date || '';
    if (month) month.value = f.month || '';
    if (from) from.value = f.from || '';
    if (to) to.value = f.to || '';
    syncNotesFilterInputsVisibility();
  }

  function applyNotesDateFilterFromForm() {
    var modeEl = document.getElementById('notes-filter-mode');
    if (!modeEl) return;
    var m = modeEl.value || 'all';
    if (m === 'all') {
      state.notesDateFilter = { mode: 'all' };
    } else if (m === 'day') {
      var d = document.getElementById('notes-filter-day');
      state.notesDateFilter = { mode: 'day', date: d && d.value ? d.value : '' };
    } else if (m === 'month') {
      var mo = document.getElementById('notes-filter-month');
      state.notesDateFilter = { mode: 'month', month: mo && mo.value ? mo.value : '' };
    } else if (m === 'range') {
      var fr = document.getElementById('notes-filter-from');
      var t = document.getElementById('notes-filter-to');
      state.notesDateFilter = {
        mode: 'range',
        from: fr && fr.value ? fr.value : '',
        to: t && t.value ? t.value : ''
      };
    }
    renderNotes();
  }

  function wireNotesFilterControls() {
    var wrap = document.getElementById('notes-toolbar-filter');
    if (!wrap || wrap.dataset.wiredFilter === '1') return;
    wrap.dataset.wiredFilter = '1';
    var mode = document.getElementById('notes-filter-mode');
    var applyBtn = document.getElementById('notes-filter-apply');
    var clearBtn = document.getElementById('notes-filter-clear');
    if (mode) {
      mode.addEventListener('change', function () {
        syncNotesFilterInputsVisibility();
      });
    }
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        applyNotesDateFilterFromForm();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        state.notesDateFilter = { mode: 'all' };
        syncNotesFilterPanelFromState();
        renderNotes();
      });
    }
    syncNotesFilterPanelFromState();
  }

  function wireNotesToolbar() {
    var addNote = document.getElementById('notes-add-note-btn');
    var addTodo = document.getElementById('notes-add-todo-btn');
    if (addNote && !addNote.dataset.wired) {
      addNote.dataset.wired = '1';
      addNote.addEventListener('click', function () {
        if (!state.data.notes) state.data.notes = { items: [] };
        state.data.notes.items.unshift(normalizeNoteItem({ kind: 'note', id: generateId(), title: '', body: '' }));
        flushNotesSave(true);
        renderNotes();
      });
    }
    if (addTodo && !addTodo.dataset.wired) {
      addTodo.dataset.wired = '1';
      addTodo.addEventListener('click', function () {
        if (!state.data.notes) state.data.notes = { items: [] };
        state.data.notes.items.unshift(normalizeNoteItem({ kind: 'todo', id: generateId(), title: '', checklist: [{ id: generateId(), text: '', done: false }] }));
        flushNotesSave(true);
        renderNotes();
      });
    }
    var colSel = document.getElementById('notes-grid-columns-select');
    if (colSel && !colSel.dataset.wired) {
      colSel.dataset.wired = '1';
      colSel.addEventListener('change', function () {
        var v = parseInt(colSel.value, 10);
        if (isNaN(v) || v < 1 || v > 5) v = 5;
        state.data.settings.notesGridColumns = v;
        syncNotesGridColumnsUi();
        save();
      });
    }
    syncNotesGridColumnsUi();
    wireNotesFilterControls();
    bindNotesEventsOnce();
    bindNotesModalEventsOnce();
    wireNotesReminderModalEventsOnce();
  }

  function updateDocumentTitleFromPath(fullPath) {
    state.profilePath = fullPath || null;
    var debugSuffix = window.__FLOWASSIST_DEBUG__ ? ' (DEBUG)' : '';
    if (!fullPath) {
      document.title = 'FlowAssist' + debugSuffix;
      return;
    }
    var base = String(fullPath).replace(/^.*[/\\]/, '');
    document.title = 'FlowAssist — ' + base + debugSuffix;
  }

  function showProfileError(title, message, detail) {
    if (window.taskAPI.showErrorDialog) {
      return window.taskAPI.showErrorDialog({
        title: title || 'FlowAssist',
        message: message || 'An error occurred.',
        detail: detail || ''
      });
    }
    window.alert(message + (detail ? '\n\n' + detail : ''));
    return Promise.resolve();
  }

  function save() {
    return window.taskAPI.saveTasks(state.data).then(function (result) {
      if (result && !result.success) console.error('Save failed:', result.error);
      else syncNoteRemindersToMain();
      return result;
    });
  }

  function load() {
    return window.taskAPI.loadTasks().then(function (res) {
      if (res && res.success === false) {
        var msg = res.message || 'Could not load the profile.';
        var detail = res.path ? String(res.path) : '';
        var title = res.code === 'FILE_NOT_FOUND' ? 'Profile file missing' : 'Could not read profile';
        return showProfileError(title, msg, detail).then(function () {
          setData({ tasks: [], settings: {} });
          updateDocumentTitleFromPath(null);
          render();
        });
      }
      setData(res.data);
      updateDocumentTitleFromPath(res.path);
      loadEditorSessionFromStorage();
      render();
      syncNoteRemindersToMain();
      return res.data;
    });
  }

  function addTask(task) {
    var t = createTask(task);
    state.data.tasks.push(t);
    return save().then(function () { render(); return t; });
  }

  function updateTask(id, updates) {
    var task = state.data.tasks.find(function (t) { return t.id === id; });
    if (!task) return Promise.resolve();
    migrateTaskStatusChangesIfNeeded(task);
    if (updates.status !== undefined) {
      var prevNorm = normalizeStatusForHistory(task.status);
      var nextNorm = normalizeStatusForHistory(updates.status);
      if (nextNorm !== prevNorm) {
        var today = new Date().toISOString().slice(0, 10);
        task.status_changes.push({ id: generateId(), status: nextNorm, date: today });
        enforceStatusChangeDateOrder(task.status_changes);
        syncTaskFromStatusChanges(task);
      } else {
        task.status = nextNorm === 'Done' ? 'Done' : (nextNorm === 'Dropped' ? 'Dropped' : nextNorm);
      }
      if (nextNorm !== 'Done' && nextNorm !== 'Dropped') task.archived = false;
    }
    Object.keys(updates).forEach(function (k) {
      if (k === 'status') return;
      if (k === 'categories') task.categories = Array.isArray(updates.categories) ? updates.categories.slice() : [];
      else if (k === 'difficulty') task.difficulty = normalizeTaskDifficulty(updates.difficulty);
      else task[k] = updates[k];
    });
    return save().then(function () { render(); });
  }

  function recordEtaUpdate(taskId, newEta) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    var oldEta = task.eta || '';
    if (!task.eta_updates) task.eta_updates = [];
    task.eta_updates.push({
      id: generateId(),
      date_recorded: new Date().toISOString().slice(0, 10),
      old_eta: oldEta,
      new_eta: newEta
    });
    task.eta = newEta;
    return save().then(function () { render(); });
  }

  function recordEffortUpdate(taskId, newEffortHours) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    var oldH = task.effort_required_hours ?? 0;
    var newH = parseFloat(newEffortHours);
    if (isNaN(newH)) newH = 0;
    if (!task.effort_updates) task.effort_updates = [];
    task.effort_updates.push({
      id: generateId(),
      date_recorded: new Date().toISOString().slice(0, 10),
      old_effort_hours: oldH,
      new_effort_hours: newH
    });
    task.effort_required_hours = newH;
    return save().then(function () { render(); });
  }

  function updateTaskStatusChangeDate(taskId, changeId, newDate) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !Array.isArray(task.status_changes)) return Promise.resolve();
    var c = task.status_changes.find(function (x) { return x.id === changeId; });
    if (!c) return Promise.resolve();
    c.date = (newDate != null && String(newDate).trim()) || new Date().toISOString().slice(0, 10);
    enforceStatusChangeDateOrder(task.status_changes);
    syncTaskFromStatusChanges(task);
    return save().then(function () { render(); });
  }

  function deleteTaskStatusChange(taskId, changeId) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !Array.isArray(task.status_changes)) return Promise.resolve();
    task.status_changes = task.status_changes.filter(function (x) { return x.id !== changeId; });
    syncTaskFromStatusChanges(task);
    return save().then(function () { render(); });
  }

  function updateSubtaskStatusChangeDate(taskId, subtaskId, changeId, newDate) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s || !Array.isArray(s.status_changes)) return Promise.resolve();
    var c = s.status_changes.find(function (x) { return x.id === changeId; });
    if (!c) return Promise.resolve();
    c.date = (newDate != null && String(newDate).trim()) || new Date().toISOString().slice(0, 10);
    enforceStatusChangeDateOrder(s.status_changes);
    syncSubtaskFromStatusChanges(s);
    return save().then(function () { render(); });
  }

  function deleteSubtaskStatusChange(taskId, subtaskId, changeId) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s || !Array.isArray(s.status_changes)) return Promise.resolve();
    s.status_changes = s.status_changes.filter(function (x) { return x.id !== changeId; });
    syncSubtaskFromStatusChanges(s);
    return save().then(function () { render(); });
  }

  function addProgressUpdate(taskId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    if (!task.progress_updates) task.progress_updates = [];
    task.progress_updates.push({
      id: generateId(),
      text: payload.text || '',
      date_added: payload.date_added || new Date().toISOString().slice(0, 10),
      effort_consumed_hours: payload.effort_consumed_hours ?? 0,
      categories: Array.isArray(payload.categories) ? payload.categories.slice() : []
    });
    task.progress_updates = sortProgressUpdatesOldestFirst(task.progress_updates);
    delete state.progressLogWindowStart[progressLogKeyMain(taskId)];
    return save().then(function () { render(); });
  }

  function updateProgressUpdate(taskId, updateId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.progress_updates) return Promise.resolve();
    var u = task.progress_updates.find(function (p) { return p.id === updateId; });
    if (!u) return Promise.resolve();
    if (payload.text !== undefined) u.text = payload.text;
    if (payload.date_added !== undefined) u.date_added = payload.date_added;
    if (payload.effort_consumed_hours !== undefined) u.effort_consumed_hours = payload.effort_consumed_hours;
    if (payload.categories !== undefined) {
      u.categories = Array.isArray(payload.categories) ? payload.categories.slice() : [];
    }
    task.progress_updates = sortProgressUpdatesOldestFirst(task.progress_updates);
    return save().then(function () { render(); });
  }

  function deleteProgressUpdate(taskId, updateId) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.progress_updates) return Promise.resolve();
    task.progress_updates = task.progress_updates.filter(function (p) { return p.id !== updateId; });
    return save().then(function () { render(); });
  }

  function addSubtask(taskId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    if (!task.subtasks) task.subtasks = [];
    var today = new Date().toISOString().slice(0, 10);
    var subAssigned = payload.assigned_date != null ? payload.assigned_date : today;
    var subStatus = payload.status || 'Open';
    var sc = [{ id: generateId(), status: 'Open', date: subAssigned }];
    var sn = normalizeStatusForHistory(subStatus);
    if (sn === 'Ongoing') {
      sc.push({ id: generateId(), status: 'Ongoing', date: subAssigned });
    } else if (sn === 'Done') {
      sc.push({ id: generateId(), status: 'Ongoing', date: subAssigned });
      sc.push({ id: generateId(), status: 'Done', date: subAssigned });
    } else if (sn === 'Dropped') {
      sc.push({ id: generateId(), status: 'Dropped', date: subAssigned });
    }
    task.subtasks.push({
      id: generateId(),
      title: payload.title || 'Untitled',
      description: payload.description || '',
      priority: Math.min(10, Math.max(1, (payload.priority != null ? payload.priority : 1))),
      assigned_date: subAssigned,
      effort_required_hours: payload.effort_required_hours != null ? payload.effort_required_hours : 0,
      status: sn === 'Done' ? 'Done' : (sn === 'Dropped' ? 'Dropped' : sn),
      done_date: sn === 'Done' ? subAssigned : '',
      status_changes: sc,
      difficulty: normalizeTaskDifficulty(payload.difficulty),
      progress_updates: payload.progress_updates || [],
      categories: Array.isArray(payload.categories) ? payload.categories.slice() : [],
      project: (payload.project != null && String(payload.project).trim()) ? String(payload.project).trim() : '',
      exclude_from_summary: !!payload.exclude_from_summary,
      exclude_from_export: !!payload.exclude_from_export,
      no_effort_needed: !!payload.no_effort_needed,
      eta: (payload.eta != null && String(payload.eta).trim()) ? String(payload.eta).trim().slice(0, 10) : ''
    });
    return save().then(function () { render(); });
  }

  function updateSubtask(taskId, subtaskId, updates) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s) return Promise.resolve();
    if (updates.title !== undefined) s.title = updates.title;
    if (updates.status !== undefined) {
      migrateSubtaskStatusChangesIfNeeded(s);
      var prevNorm = normalizeStatusForHistory(s.status);
      var nextNorm = normalizeStatusForHistory(updates.status);
      if (nextNorm !== prevNorm) {
        var todayS = new Date().toISOString().slice(0, 10);
        s.status_changes.push({ id: generateId(), status: nextNorm, date: todayS });
        enforceStatusChangeDateOrder(s.status_changes);
        syncSubtaskFromStatusChanges(s);
      } else {
        s.status = nextNorm === 'Done' ? 'Done' : (nextNorm === 'Dropped' ? 'Dropped' : nextNorm);
      }
    }
    if (updates.description !== undefined) s.description = updates.description;
    if (updates.priority !== undefined) s.priority = Math.min(10, Math.max(1, updates.priority));
    if (updates.assigned_date !== undefined) s.assigned_date = updates.assigned_date;
    if (updates.eta !== undefined) {
      s.eta = (updates.eta != null && String(updates.eta).trim()) ? String(updates.eta).trim().slice(0, 10) : '';
    }
    if (updates.effort_required_hours !== undefined) s.effort_required_hours = updates.effort_required_hours;
    if (updates.categories !== undefined) s.categories = Array.isArray(updates.categories) ? updates.categories.slice() : [];
    if (updates.project !== undefined) s.project = (updates.project != null && String(updates.project).trim()) ? String(updates.project).trim() : '';
    if (updates.difficulty !== undefined) s.difficulty = normalizeTaskDifficulty(updates.difficulty);
    if (updates.exclude_from_summary !== undefined) s.exclude_from_summary = !!updates.exclude_from_summary;
    if (updates.exclude_from_export !== undefined) s.exclude_from_export = !!updates.exclude_from_export;
    if (updates.no_effort_needed !== undefined) s.no_effort_needed = !!updates.no_effort_needed;
    return save().then(function () { render(); });
  }

  function addSubtaskProgressUpdate(taskId, subtaskId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s) return Promise.resolve();
    if (!s.progress_updates) s.progress_updates = [];
    s.progress_updates.push({
      id: generateId(),
      text: payload.text || '',
      date_added: payload.date_added || new Date().toISOString().slice(0, 10),
      effort_consumed_hours: payload.effort_consumed_hours ?? 0,
      categories: Array.isArray(payload.categories) ? payload.categories.slice() : []
    });
    s.progress_updates = sortProgressUpdatesOldestFirst(s.progress_updates);
    delete state.progressLogWindowStart[progressLogKeySub(taskId, subtaskId)];
    return save().then(function () { render(); });
  }

  function updateSubtaskProgressUpdate(taskId, subtaskId, updateId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s || !s.progress_updates) return Promise.resolve();
    var u = s.progress_updates.find(function (p) { return p.id === updateId; });
    if (!u) return Promise.resolve();
    if (payload.text !== undefined) u.text = payload.text;
    if (payload.date_added !== undefined) u.date_added = payload.date_added;
    if (payload.effort_consumed_hours !== undefined) u.effort_consumed_hours = payload.effort_consumed_hours;
    if (payload.categories !== undefined) {
      u.categories = Array.isArray(payload.categories) ? payload.categories.slice() : [];
    }
    s.progress_updates = sortProgressUpdatesOldestFirst(s.progress_updates);
    return save().then(function () { render(); });
  }

  function deleteSubtaskProgressUpdate(taskId, subtaskId, updateId) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s || !s.progress_updates) return Promise.resolve();
    s.progress_updates = s.progress_updates.filter(function (p) { return p.id !== updateId; });
    return save().then(function () { render(); });
  }

  function deleteSubtask(taskId, subtaskId) {
    purgeEditorDraftForSubtask(taskId, subtaskId);
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    task.subtasks = task.subtasks.filter(function (s) { return s.id !== subtaskId; });
    return save().then(function () { render(); });
  }

  function addConcern(taskId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    if (!Array.isArray(task.concerns)) task.concerns = [];
    task.concerns.push({
      id: generateId(),
      description: payload.description || '',
      logged_date: payload.logged_date || new Date().toISOString().slice(0, 10),
      status: 'Open',
      addressed_date: '',
      addressed_comment: ''
    });
    return save().then(function () { render(); });
  }

  function addressConcern(taskId, concernId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !Array.isArray(task.concerns)) return Promise.resolve();
    var c = task.concerns.find(function (x) { return x.id === concernId; });
    if (!c) return Promise.resolve();
    c.addressed_date = payload.addressed_date || new Date().toISOString().slice(0, 10);
    c.addressed_comment = payload.addressed_comment || '';
    c.status = 'Addressed';
    return save().then(function () { render(); });
  }

  function addSubtaskConcern(taskId, subtaskId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s) return Promise.resolve();
    if (!Array.isArray(s.concerns)) s.concerns = [];
    s.concerns.push({
      id: generateId(),
      description: payload.description || '',
      logged_date: payload.logged_date || new Date().toISOString().slice(0, 10),
      status: 'Open',
      addressed_date: '',
      addressed_comment: ''
    });
    return save().then(function () { render(); });
  }

  function addressSubtaskConcern(taskId, subtaskId, concernId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s || !Array.isArray(s.concerns)) return Promise.resolve();
    var c = s.concerns.find(function (x) { return x.id === concernId; });
    if (!c) return Promise.resolve();
    c.addressed_date = payload.addressed_date || new Date().toISOString().slice(0, 10);
    c.addressed_comment = payload.addressed_comment || '';
    c.status = 'Addressed';
    return save().then(function () { render(); });
  }

  function deleteConcern(taskId, concernId) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !Array.isArray(task.concerns)) return Promise.resolve();
    task.concerns = task.concerns.filter(function (x) { return x.id !== concernId; });
    return save().then(function () { render(); });
  }

  function deleteSubtaskConcern(taskId, subtaskId, concernId) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s || !Array.isArray(s.concerns)) return Promise.resolve();
    s.concerns = s.concerns.filter(function (x) { return x.id !== concernId; });
    return save().then(function () { render(); });
  }

  function updateConcernLoggedDate(taskId, concernId, loggedDate) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !Array.isArray(task.concerns)) return Promise.resolve();
    var c = task.concerns.find(function (x) { return x.id === concernId; });
    if (!c) return Promise.resolve();
    var d = loggedDate != null ? String(loggedDate).trim() : '';
    c.logged_date = d || new Date().toISOString().slice(0, 10);
    return save().then(function () { render(); });
  }

  function updateSubtaskConcernLoggedDate(taskId, subtaskId, concernId, loggedDate) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s || !Array.isArray(s.concerns)) return Promise.resolve();
    var c = s.concerns.find(function (x) { return x.id === concernId; });
    if (!c) return Promise.resolve();
    var d = loggedDate != null ? String(loggedDate).trim() : '';
    c.logged_date = d || new Date().toISOString().slice(0, 10);
    return save().then(function () { render(); });
  }

  function deleteTask(id) {
    purgeEditorDraftsForTask(id);
    state.data.tasks = state.data.tasks.filter(function (t) { return t.id !== id; });
    return save().then(function () { render(); });
  }

  function applyTheme(themeName) {
    var t = themeName || 'classic';
    document.body.classList.remove('theme-classic', 'theme-refined');
    document.body.classList.add('theme-' + t);
    try { localStorage.setItem('flowassist_theme', t); } catch (e) {}
  }

  function saveSettings(newSettings) {
    state.data.settings = newSettings || getSettings();
    return save().then(function () { render(); });
  }

  var $ = function (id) { return document.getElementById(id); };
  var taskTitle = $('task-title');
  var taskDescription = $('task-description');
  var taskPriority = $('task-priority');
  var taskTags = $('task-tags');
  var taskAssigned = $('task-assigned');
  var taskEta = $('task-eta');
  var taskEffort = $('task-effort');
  var taskDifficulty = $('task-difficulty');
  var taskBug = $('task-bug');
  var addTaskBtn = $('add-task-btn');
  var taskListEl = $('task-list');
  var completedTaskListEl = $('completed-task-list');
  var calendarFilter = $('calendar-filter');
  var calendarContainer = $('calendar-container');
  var summaryFrom = $('summary-from');
  var summaryTo = $('summary-to');
  var generateSummaryBtn = $('generate-summary-btn');
  var summaryExportFormat = $('summary-export-format');
  var exportSummaryBtn = $('export-summary-btn');
  var summaryOutput = $('summary-output');

  var EXPORT_OPTIONS_STORAGE_KEY = 'flowAssist.exportOptions';
  function getExportOptions() {
    try {
      var raw = localStorage.getItem(EXPORT_OPTIONS_STORAGE_KEY);
      var o = raw ? JSON.parse(raw) : {};
      return {
        showProgressEntryHours: o.showProgressEntryHours === true
      };
    } catch (err) {
      return { showProgressEntryHours: false };
    }
  }
  function setExportOptions(partial) {
    var cur = getExportOptions();
    if (partial && partial.showProgressEntryHours != null) {
      cur.showProgressEntryHours = !!partial.showProgressEntryHours;
    }
    try {
      localStorage.setItem(EXPORT_OPTIONS_STORAGE_KEY, JSON.stringify(cur));
    } catch (e) {}
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderDifficultySelectHtml(selectedValue, extraClass) {
    var sel = normalizeTaskDifficulty(selectedValue);
    var cls = extraClass ? (' ' + extraClass) : '';
    var parts = ['<select class="task-difficulty-select' + cls + '" aria-label="Difficulty">'];
    TASK_DIFFICULTY_LEVELS.forEach(function (level) {
      parts.push('<option value="' + escapeHtml(level) + '"' + (level === sel ? ' selected' : '') + '>' + escapeHtml(level) + '</option>');
    });
    parts.push('</select>');
    return parts.join('');
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '&#10;')
      .replace(/\r/g, '&#13;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  var URL_IN_TEXT_RE = /\b(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

  function splitUrlTrailingPunct(raw) {
    var u = raw;
    var tail = '';
    while (u.length > 0) {
      var c = u.charAt(u.length - 1);
      if ('.,;:!?)]}'.indexOf(c) >= 0) {
        tail = c + tail;
        u = u.slice(0, -1);
      } else {
        break;
      }
    }
    return { core: u, tail: tail };
  }

  /** Escape plain text and wrap http(s):// and www. URLs in safe external links. */
  function linkifyPlainText(plain) {
    if (plain == null || plain === '') return '';
    var s = String(plain);
    var parts = [];
    var last = 0;
    var m;
    URL_IN_TEXT_RE.lastIndex = 0;
    while ((m = URL_IN_TEXT_RE.exec(s)) !== null) {
      parts.push(escapeHtml(s.slice(last, m.index)));
      var raw = m[0];
      var sp = splitUrlTrailingPunct(raw);
      var core = sp.core;
      var tail = sp.tail;
      if (!core) {
        parts.push(escapeHtml(raw));
        last = m.index + raw.length;
        continue;
      }
      var href = /^https?:\/\//i.test(core) ? core : 'https://' + core;
      parts.push('<a href="' + escapeAttr(href) + '" target="_blank" rel="noopener noreferrer" class="auto-link">' + escapeHtml(core) + '</a>');
      parts.push(escapeHtml(tail));
      last = m.index + raw.length;
    }
    parts.push(escapeHtml(s.slice(last)));
    return parts.join('');
  }

  function formatMultilineWithLinks(plain) {
    return linkifyPlainText(plain || '').replace(/\r\n|\n|\r/g, '<br>');
  }

  /** Toolbar above rich text areas; inserts markdown-like markers at the cursor. */
  function renderRichFormatToolbarHtml() {
    return '<div class="rich-format-toolbar" role="toolbar" aria-label="Text formatting">' +
      '<button type="button" class="rich-fmt-btn" data-rich-cmd="bold" title="Bold (**text**)"><strong>B</strong></button>' +
      '<button type="button" class="rich-fmt-btn" data-rich-cmd="italic" title="Italic (*text*)"><em>I</em></button>' +
      '<button type="button" class="rich-fmt-btn" data-rich-cmd="underline" title="Underline (++text++)"><span class="rich-fmt-u">U</span></button>' +
      '<button type="button" class="rich-fmt-btn" data-rich-cmd="bullet" title="Bullet (line starts with &quot;- &quot;)">•</button>' +
      '<button type="button" class="rich-fmt-btn" data-rich-cmd="numlist" title="Numbered list (line starts with &quot;1. &quot;)">1.</button>' +
      '<button type="button" class="rich-fmt-btn" data-rich-cmd="code" title="Inline code (`code`)">&lt;/&gt;</button>' +
      '<button type="button" class="rich-fmt-btn" data-rich-cmd="codeblock" title="Fenced code (```)">{ }</button>' +
      '</div>';
  }

  function applyRichToolbarCommand(textarea, cmd) {
    if (!textarea || !cmd) return;
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var val = textarea.value;
    var sel = val.slice(start, end);
    function wrap(before, after, emptyMid) {
      var mid = sel || emptyMid || 'text';
      var ins = before + mid + after;
      textarea.value = val.slice(0, start) + ins + val.slice(end);
      var ns = start + before.length;
      var ne = ns + mid.length;
      textarea.focus();
      textarea.setSelectionRange(ns, ne);
      autoResizeTextarea(textarea);
    }
    if (cmd === 'bold') return wrap('**', '**', 'bold');
    if (cmd === 'italic') return wrap('*', '*', 'italic');
    if (cmd === 'underline') return wrap('++', '++', 'text');
    if (cmd === 'code') return wrap('`', '`', 'code');
    if (cmd === 'codeblock') {
      var body = sel || 'code';
      var block = '```\n' + body + '\n```';
      textarea.value = val.slice(0, start) + block + val.slice(end);
      textarea.focus();
      var n0 = start + 4;
      var n1 = n0 + body.length;
      textarea.setSelectionRange(n0, n1);
      autoResizeTextarea(textarea);
      return;
    }
    if (cmd === 'bullet') {
      var lineStart = val.lastIndexOf('\n', start - 1) + 1;
      var beforeCursor = val.slice(lineStart, start);
      if (/^\s*$/.test(beforeCursor)) {
        textarea.value = val.slice(0, lineStart) + '- ' + val.slice(lineStart);
        textarea.setSelectionRange(start + 2, end + 2);
      } else {
        textarea.value = val.slice(0, start) + '\n- ' + val.slice(end);
        textarea.setSelectionRange(start + 3, start + 3);
      }
      textarea.focus();
      autoResizeTextarea(textarea);
      return;
    }
    if (cmd === 'numlist') {
      var numPrefix = '1. ';
      var ls = val.lastIndexOf('\n', start - 1) + 1;
      var beforeC = val.slice(ls, start);
      var delta = numPrefix.length;
      if (/^\s*$/.test(beforeC)) {
        textarea.value = val.slice(0, ls) + numPrefix + val.slice(ls);
        textarea.setSelectionRange(start + delta, end + delta);
      } else {
        textarea.value = val.slice(0, start) + '\n' + numPrefix + val.slice(end);
        textarea.setSelectionRange(start + 1 + delta, start + 1 + delta);
      }
      textarea.focus();
      autoResizeTextarea(textarea);
    }
  }

  function bindRichFormatToolbars(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.rich-format-toolbar').forEach(function (toolbar) {
      if (toolbar.getAttribute('data-rich-bound') === '1') return;
      toolbar.setAttribute('data-rich-bound', '1');
      var wrap = toolbar.closest('.rich-textarea-wrap');
      var ta = wrap && wrap.querySelector('textarea');
      if (!ta) return;
      toolbar.querySelectorAll('[data-rich-cmd]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          applyRichToolbarCommand(ta, btn.getAttribute('data-rich-cmd'));
        });
      });
    });
  }

  function linkifyTextNodesInHtml(html) {
    if (html == null || html === '') return '';
    try {
      var tpl = document.createElement('template');
      tpl.innerHTML = html;
      var walk = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [];
      while (walk.nextNode()) nodes.push(walk.currentNode);
      nodes.forEach(function (tn) {
        var el = tn.parentElement;
        var skip = false;
        while (el) {
          var name = el.nodeName;
          if (name === 'A' || name === 'CODE' || name === 'PRE') {
            skip = true;
            break;
          }
          el = el.parentElement;
        }
        if (skip) return;
        var t = tn.textContent;
        if (!t) return;
        URL_IN_TEXT_RE.lastIndex = 0;
        if (!URL_IN_TEXT_RE.test(t)) return;
        URL_IN_TEXT_RE.lastIndex = 0;
        var frag = document.createRange().createContextualFragment(linkifyPlainText(t));
        tn.parentNode.replaceChild(frag, tn);
      });
      return tpl.innerHTML;
    } catch (err) {
      return html;
    }
  }

  function applyRichInlineFormats(escapedLine) {
    var x = escapedLine;
    x = x.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    x = x.replace(/\+\+([^+]+)\+\+/g, '<u>$1</u>');
    x = x.replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, function (_, a, b, c) {
      return a + '<em>' + b + '</em>' + c;
    });
    return x;
  }

  function formatRichPlainBlock(text) {
    if (text == null || text === '') return '';
    var lines = String(text).split(/\r\n|\n|\r/);
    var chunks = [];
    var buf = [];
    function flushBuf() {
      if (!buf.length) return;
      var joined = buf.map(function (ln) {
        var e = escapeHtml(ln);
        e = applyRichInlineFormats(e);
        return linkifyTextNodesInHtml(e);
      }).join('<br>');
      chunks.push(joined);
      buf = [];
    }
    var i = 0;
    while (i < lines.length) {
      if (/^\s*[-*]\s+/.test(lines[i])) {
        flushBuf();
        var itemsU = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          var itemTextU = lines[i].replace(/^\s*[-*]\s+/, '');
          var eU = escapeHtml(itemTextU);
          eU = applyRichInlineFormats(eU);
          eU = linkifyTextNodesInHtml(eU);
          itemsU.push('<li class="rich-li">' + eU + '</li>');
          i++;
        }
        chunks.push('<ul class="rich-ul">' + itemsU.join('') + '</ul>');
      } else if (/^\s*\d+[.)]\s+/.test(lines[i])) {
        flushBuf();
        var itemsO = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          var itemTextO = lines[i].replace(/^\s*\d+[.)]\s+/, '');
          var eO = escapeHtml(itemTextO);
          eO = applyRichInlineFormats(eO);
          eO = linkifyTextNodesInHtml(eO);
          itemsO.push('<li class="rich-li">' + eO + '</li>');
          i++;
        }
        chunks.push('<ol class="rich-ol">' + itemsO.join('') + '</ol>');
      } else {
        buf.push(lines[i]);
        i++;
      }
    }
    flushBuf();
    return chunks.join('');
  }

  function segmentRichFencedBlocks(s) {
    var out = [];
    var re = /```([a-zA-Z0-9]*)\r?\n([\s\S]*?)```/g;
    var last = 0;
    var m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
      out.push({ t: 'fence', v: m[2] });
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
    if (!out.length) out.push({ t: 'text', v: s });
    return out;
  }

  function splitTextInlineCode(text) {
    var parts = [];
    var re = /`([^`\n]+)`/g;
    var last = 0;
    var m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push({ t: 'text', v: text.slice(last, m.index) });
      parts.push({ t: 'inline', v: m[1] });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ t: 'text', v: text.slice(last) });
    if (!parts.length) parts.push({ t: 'text', v: text });
    return parts;
  }

  /** Rich text for descriptions & notes: **bold** *italic* ++underline++ `code` ``` fences ``` bullets (- or *), numbered lines (1. item or 1) item). URLs auto-link outside code. */
  function formatRichDescription(plain) {
    if (plain == null || plain === '') return '';
    var segs = segmentRichFencedBlocks(String(plain));
    return segs.map(function (seg) {
      if (seg.t === 'fence') {
        return '<pre class="rich-code-block"><code>' + escapeHtml(seg.v) + '</code></pre>';
      }
      return splitTextInlineCode(seg.v).map(function (p) {
        if (p.t === 'inline') return '<code class="rich-code">' + escapeHtml(p.v) + '</code>';
        return formatRichPlainBlock(p.v);
      }).join('');
    }).join('');
  }

  function decodeAttr(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/&#10;/g, '\n')
      .replace(/&#13;/g, '\r')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  function autoResizeTextarea(ta) {
    if (!ta || ta.tagName !== 'TEXTAREA') return;
  }

  function renderConcernCountPill(concerns) {
    var n = (concerns || []).length;
    if (!n) return '';
    return '<span class="bar-concerns-pill" role="text" aria-label="' + n + ' concern(s)">' + n + '</span>';
  }

  function renderStatusChangeRows(changes) {
    var sorted = sortedStatusChanges(changes || []);
    return sorted.map(function (ch) {
      var lab = normalizeStatusForHistory(ch.status);
      var d = ch.date || '';
      var pillClass = 'status-change-pill status-change-pill-' + lab.toLowerCase();
      return '<li class="status-change-item" data-status-change-id="' + escapeHtml(ch.id) + '">' +
        '<span class="' + pillClass + '">' + escapeHtml(lab) + '</span>' +
        '<input type="date" class="status-change-date-in" value="' + escapeHtml(d) + '">' +
        '<button type="button" class="btn-small status-change-save-date-btn">Save</button>' +
        '<button type="button" class="btn-icon status-change-delete-btn" title="Delete this status change"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg></button>' +
      '</li>';
    }).join('');
  }

  function renderTaskStatusChangesSection(task, isOpen) {
    var statusDisp = normalizeStatusForHistory(task.status);
    var rows = renderStatusChangeRows(task.status_changes);
    var collMain = isOpen === true ? '' : ' task-block-collapsed';
    return '<div class="task-update-status-changes-block task-toggleable-block' + collMain + '">' +
      '<h4 class="task-update-title">Update Status Changes</h4>' +
      '<p class="task-status-changes-desc muted">When the task entered each status (chronological). New transitions come from the status buttons. Edit dates so <strong>Generate Summary</strong> uses the correct completion day. Delete mistaken rows.</p>' +
      '<p class="task-update-current">Current status: <strong>' + escapeHtml(statusDisp) + '</strong>. Completion date (summary): <strong' + (!task.done_date ? ' class="default-value"' : '') + '>' + escapeHtml(task.done_date || '—') + '</strong></p>' +
      '<ul class="status-change-list">' + (rows || '') + '</ul>' +
    '</div>';
  }

  function renderSubtaskStatusChangesSection(s, isOpen) {
    var statusDisp = normalizeStatusForHistory(s.status);
    var rows = renderStatusChangeRows(s.status_changes);
    var collSub = isOpen === true ? '' : ' task-block-collapsed';
    return '<div class="task-update-status-changes-block subtask-status-changes-block task-toggleable-block' + collSub + '">' +
      '<h4 class="task-update-title">Update Status Changes</h4>' +
      '<p class="task-status-changes-desc muted">Sub-task status history; same rules as the main task.</p>' +
      '<p class="task-update-current">Current status: <strong>' + escapeHtml(statusDisp) + '</strong>. Completion date (summary): <strong' + (!s.done_date ? ' class="default-value"' : '') + '>' + escapeHtml(s.done_date || '—') + '</strong></p>' +
      '<ul class="status-change-list">' + (rows || '') + '</ul>' +
    '</div>';
  }

  function renderConcernsBlock(concerns, isOpen) {
    var today = new Date().toISOString().slice(0, 10);
    var openCount = concerns ? concerns.filter(function (c) { return c.status !== 'Addressed'; }).length : 0;
    var list = (concerns && concerns.length) ? concerns.map(function (c) {
      var isAddressed = c.status === 'Addressed';
      var statusBadge = '<span class="concern-status-badge ' + (isAddressed ? 'concern-addressed' : 'concern-open') + '">' + (isAddressed ? 'Addressed' : 'Open') + '</span>';
      var loggedYmd = c.logged_date || '';
      var addressedInfo = isAddressed
        ? '<div class="concern-addressed-info">' +
            '<span class="concern-addressed-label">Addressed on ' + escapeHtml(c.addressed_date || '') + '</span>' +
            (c.addressed_comment ? '<div class="concern-addressed-comment">' + formatRichDescription(c.addressed_comment) + '</div>' : '') +
          '</div>'
        : '';
      var markAddressedBtn = !isAddressed
        ? '<button type="button" class="concern-action-btn concern-action-resolve btn-concern-update-toggle" title="Mark as addressed">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5 8.5 6.5 11.5 12.5 4.5"/></svg>' +
            '<span>Resolve</span></button>'
        : '';
      return '<li class="concern-item' + (isAddressed ? ' concern-item-addressed' : '') + '" data-concern-id="' + escapeHtml(c.id) + '" data-logged-date="' + escapeAttr(loggedYmd) + '">' +
        '<div class="concern-item-view">' +
          '<div class="concern-item-topbar">' +
            '<div class="concern-item-topbar-left">' +
              statusBadge +
              '<span class="concern-logged-label">Logged <span class="concern-logged-date">' + escapeHtml(loggedYmd) + '</span></span>' +
            '</div>' +
            '<div class="concern-item-topbar-right">' +
              '<button type="button" class="concern-action-btn concern-action-date concern-change-logged-date-btn" title="Change logged date">' +
                '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="11" rx="2"/><line x1="2" y1="7" x2="14" y2="7"/><line x1="5" y1="1" x2="5" y2="4"/><line x1="11" y1="1" x2="11" y2="4"/></svg>' +
                '<span>Date</span></button>' +
              markAddressedBtn +
              '<button type="button" class="concern-action-btn concern-action-delete concern-delete-btn" title="Delete concern">' +
                '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 5 4 14 12 14 13 5"/><line x1="1.5" y1="5" x2="14.5" y2="5"/><path d="M6 5V3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5V5"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="concern-logged-date-edit hidden">' +
            '<span class="concern-logged-date-edit-label">Logged date</span>' +
            '<input type="date" class="concern-logged-date-field" value="' + escapeHtml(loggedYmd) + '">' +
            '<button type="button" class="btn-small concern-save-logged-date-btn">Save</button>' +
            '<button type="button" class="btn-link concern-cancel-logged-date-btn">Cancel</button>' +
          '</div>' +
          '<div class="concern-description">' + formatRichDescription(c.description || '') + '</div>' +
          addressedInfo +
        '</div>' +
        (!isAddressed
          ? '<div class="concern-update-form hidden">' +
              '<div class="rich-textarea-wrap">' + renderRichFormatToolbarHtml() +
              '<textarea class="concern-update-comment auto-resize rich-text-target" rows="2" placeholder="Comment on how the concern was addressed…"></textarea></div>' +
              '<input type="date" class="concern-addressed-date-in" value="' + today + '">' +
              '<button type="button" class="btn-small concern-submit-update-btn">Mark as Addressed</button>' +
            '</div>'
          : '') +
      '</li>';
    }).join('') : '';

    var countLabel = concerns && concerns.length
      ? ' <span class="concerns-count">(' + concerns.length + (openCount ? ', ' + openCount + ' open' : '') + ')</span>'
      : '';

    var collConc = isOpen === true ? '' : ' task-block-collapsed';
    return '<div class="task-concerns-block task-toggleable-block' + collConc + '">' +
      '<h4 class="task-update-title">Concerns' + countLabel + '</h4>' +
      (list ? '<ul class="concern-list">' + list + '</ul>' : '') +
      '<div class="concern-add-form">' +
        '<div class="rich-textarea-wrap">' + renderRichFormatToolbarHtml() +
        '<textarea class="concern-desc-in auto-resize rich-text-target" rows="2" placeholder="Describe the concern…"></textarea></div>' +
        '<input type="date" class="concern-date-in" value="' + today + '">' +
        '<button type="button" class="btn-small log-concern-btn">Log Concern</button>' +
      '</div>' +
    '</div>';
  }

  function renderSubtaskViewportPageSizeOptions(pageSize) {
    var sizes = [3, 5, 8, 10, 15];
    var list = sizes.indexOf(pageSize) >= 0 ? sizes.slice() : [pageSize].concat(sizes);
    list.sort(function (a, b) { return a - b; });
    var seen = {};
    list = list.filter(function (n) {
      if (seen[n]) return false;
      seen[n] = true;
      return true;
    });
    return list.map(function (n) {
      return '<option value="' + n + '"' + (n === pageSize ? ' selected' : '') + '>' + n + '</option>';
    }).join('');
  }

  function renderSubtaskViewportToolbarHtml(taskId, startIdx, pageSize, totalFiltered) {
    if (totalFiltered <= 0) return '';
    var maxStart = Math.max(0, totalFiltered - pageSize);
    var canPrev = startIdx > 0;
    var canNext = startIdx < maxStart;
    var from = startIdx + 1;
    var to = Math.min(startIdx + pageSize, totalFiltered);
    var opts = renderSubtaskViewportPageSizeOptions(pageSize);
    var svgL = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M10.78 4.22a.75.75 0 010 1.06L8.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/></svg>';
    var svgR = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z"/></svg>';
    return '<div class="subtask-viewport-toolbar">' +
      '<label class="subtask-viewport-size-label muted">' +
      '<span>Show</span> ' +
      '<select class="subtask-viewport-page-size" data-task-id="' + escapeHtml(taskId) + '" title="Number of sub-tasks visible">' + opts + '</select>' +
      '<span> at a time</span>' +
      '</label>' +
      '<div class="subtask-viewport-nav-group">' +
      '<button type="button" class="subtask-viewport-nav-btn subtask-viewport-prev" data-task-id="' + escapeHtml(taskId) + '" title="Previous page of sub-tasks" aria-label="Previous sub-tasks"' + (canPrev ? '' : ' disabled') + '>' + svgL + '</button>' +
      '<span class="subtask-viewport-range muted">' + from + '–' + to + ' of ' + totalFiltered + '</span>' +
      '<button type="button" class="subtask-viewport-nav-btn subtask-viewport-next" data-task-id="' + escapeHtml(taskId) + '" title="Next page of sub-tasks" aria-label="Next sub-tasks"' + (canNext ? '' : ' disabled') + '>' + svgR + '</button>' +
      '</div>' +
      '</div>';
  }

  function renderSubtaskCard(taskId, s, settings) {
    var today = new Date().toISOString().slice(0, 10);
    var subKey = taskId + '_' + s.id;
    var isSubExpanded = state.expandedSubtasks[subKey];
    var baseColor = getPriorityColor(s.priority, settings);
    var subPriorityColor = darkenColor(baseColor, 0.72);
    var subAssignedStr = s.assigned_date || null;
    var subEtaStr = s.eta || null;
    var subEffortReq = isTruthyFlag(s.no_effort_needed) ? '—' :
      (s.effort_required_hours != null && s.effort_required_hours !== '' ? (s.effort_required_hours + ' hrs') : '0 hrs');
    var subSpentHrs = subtaskEffortSpent(s);
    var subSpentStr = subSpentHrs ? (subSpentHrs + ' hrs') : '0 hrs';
    var subCats = (s.categories || []).length ? (s.categories || []).map(function (c) {
      return '<span class="meta-chip meta-chip-category">' + escapeHtml(c) + '</span>';
    }).join('') : '';
    var subMetaChips = [
      '<span class="meta-chip"><span class="meta-label">Priority</span><span class="meta-value">' + (s.priority != null ? 'P' + s.priority : 'P1') + '</span></span>',
      '<span class="meta-chip"><span class="meta-label">Difficulty</span><span class="meta-value">' + escapeHtml(normalizeTaskDifficulty(s.difficulty)) + '</span></span>',
      (subCats ? '<span class="meta-chip meta-chip-categories"><span class="meta-label">Category</span>' + subCats + '</span>' : '<span class="meta-chip"><span class="meta-label">Category</span><span class="meta-value default-value">—</span></span>'),
      '<span class="meta-chip"><span class="meta-label">Assigned</span><span class="meta-value' + (!subAssignedStr ? ' default-value' : '') + '">' + escapeHtml(subAssignedStr || '—') + '</span></span>',
      '<span class="meta-chip meta-chip-eta"><span class="meta-label">ETA</span><span class="meta-value' + (!subEtaStr ? ' default-value' : '') + '">' + escapeHtml(subEtaStr || '—') + '</span></span>',
      '<span class="meta-chip meta-chip-effort"><span class="meta-label">Effort</span><span class="meta-value">' + escapeHtml(subEffortReq) + '</span></span>',
      '<span class="meta-chip meta-chip-spent"><span class="meta-label">Effort spent</span><span class="meta-value' + (!subSpentHrs ? ' default-value' : '') + '">' + escapeHtml(subSpentStr) + '</span></span>'
    ].join('');

    var noEffortSub = isTruthyFlag(s.no_effort_needed);
    var subStatusStr = (s.status === 'Closed' ? 'Dropped' : (s.status === 'Completed' ? 'Done' : s.status)) || 'Open';
    var subDeadlineDays = daysUntilDeadline(s.eta);
    var subDeadlineLabel = formatDeadlineLabel(subDeadlineDays);
    var subDeadlineCls = subDeadlineDays !== null ? (subDeadlineDays < 0 ? ' hl-overdue' : (subDeadlineDays <= 3 ? ' hl-urgent' : '')) : '';
    var subPlannedHrs = getLatestPlannedEffortHours(s);
    var subRemHrs = subPlannedHrs - subSpentHrs;
    var subEffortRemStr = noEffortSub ? '—' : (subRemHrs.toFixed(1).replace(/\.0$/, '') + ' / ' + subPlannedHrs.toFixed(1).replace(/\.0$/, '') + ' hrs');
    var subEffortRemCls = (!noEffortSub && subRemHrs < 0) ? ' hl-overdue' : '';

    var subHighlightsRow = '<div class="task-bar-highlights">';
    if (subStatusStr !== 'Done' && subStatusStr !== 'Dropped') {
      subHighlightsRow +=
        '<span class="bar-highlight' + subDeadlineCls + '">' + (subDeadlineLabel != null ? escapeHtml(subDeadlineLabel) : '<span class="hl-dim">No ETA</span>') + '</span>' +
        '<span class="bar-highlight-sep">·</span>' +
        '<span class="bar-highlight' + subEffortRemCls + '">Remaining: ' + escapeHtml(subEffortRemStr) + '</span>';
    } else {
      subHighlightsRow += '<span class="bar-highlight hl-done">' + escapeHtml(subStatusStr) + '</span>';
    }
    subHighlightsRow += '</div>';

    var subBar = '<div class="subtask-bar" style="background-color:' + escapeHtml(subPriorityColor) + ';color:#fff" data-task-id="' + escapeHtml(taskId) + '" data-subtask-id="' + escapeHtml(s.id) + '">' +
      '<div class="subtask-bar-left">' +
        '<div class="subtask-bar-title-row">' +
          renderProjectBarChip(s.project) +
          '<span class="subtask-bar-title">' + escapeHtml(s.title || '') + '</span>' +
          renderConcernCountPill(s.concerns) +
        '</div>' +
        '<div class="subtask-bar-meta">' + subMetaChips + '</div>' +
        subHighlightsRow +
      '</div>' +
      '<div class="subtask-bar-right">' +
        '<div class="status-buttons status-buttons-sub" data-status-target="subtask">' +
          '<button type="button" class="status-btn' + (s.status === 'Open' ? ' active' : '') + '" data-status="Open">Open</button>' +
          '<button type="button" class="status-btn' + (s.status === 'Ongoing' ? ' active' : '') + '" data-status="Ongoing">Ongoing</button>' +
          '<button type="button" class="status-btn' + ((s.status === 'Done' || s.status === 'Completed') ? ' active' : '') + '" data-status="Done">Done</button>' +
          '<button type="button" class="status-btn' + ((s.status === 'Dropped' || s.status === 'Closed') ? ' active' : '') + '" data-status="Dropped">Dropped</button>' +
        '</div>' +
        '<button type="button" class="btn-icon subtask-delete" title="Delete"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg></button>' +
      '</div>' +
      '</div>';

    var subBody = '';
    if (isSubExpanded) {
      var sdk = taskId + ':' + s.id;
      var sd = state.editorDrafts.subtasks[sdk];
      function spick(field, fallback) {
        if (sd && Object.prototype.hasOwnProperty.call(sd, field)) return sd[field];
        return fallback;
      }
      function spickBool(field, fallbackBool) {
        if (sd && Object.prototype.hasOwnProperty.call(sd, field)) return !!sd[field];
        return fallbackBool;
      }
      var subDescRaw = spick('description', s.description || '');
      var subDesc = formatRichDescription(subDescRaw || '');
      var subDescEditing = sd && sd.subDescEditing === true;
      var subDescViewCls = subDescEditing ? 'task-description-view hidden' : 'task-description-view';
      var subDescEditCls = subDescEditing ? 'task-description-edit subtask-desc-edit auto-resize rich-text-target' : 'task-description-edit hidden subtask-desc-edit auto-resize rich-text-target';
      var subToggleSvg = subDescEditing ? SVG_ICON_CHECK : SVG_ICON_EDIT;
      var stTitle = spick('title', s.title || '');
      var stPri = spick('priority', s.priority != null ? String(s.priority) : '1');
      var stDiff = spick('difficulty', normalizeTaskDifficulty(s.difficulty));
      var stAsg = spick('assigned_date', s.assigned_date || '');
      var stEta = spick('eta', s.eta || '');
      var stEff = spick('effort', s.effort_required_hours != null && s.effort_required_hours !== '' ? String(s.effort_required_hours) : '0');
      var stCats = spick('categories', s.categories || []);
      if (!Array.isArray(stCats)) stCats = [];
      var stProj = spick('project', s.project || '');
      var sExSum = spickBool('exclude_from_summary', isTruthyFlag(s.exclude_from_summary));
      var sExExp = spickBool('exclude_from_export', isTruthyFlag(s.exclude_from_export));
      var sNoEff = spickBool('no_effort_needed', isTruthyFlag(s.no_effort_needed));
      var sProgT = spick('progressText', '');
      var sProgD = spick('progressDate', today);
      var sProgE = spick('progressEffort', '');
      var sProgC = spick('progressCategories', []);
      if (!Array.isArray(sProgC)) sProgC = [];

      var sps = state.editorPanelState.subtasks[sdk] || {};
      function spc(key) {
        return (sps[key] === true) ? '' : ' task-block-collapsed';
      }

      subBody = '<div class="subtask-body">' +
        '<div class="subtask-summary-export-flags">' +
          '<label class="flag-check"><input type="checkbox" class="subtask-exclude-summary"' + (sExSum ? ' checked' : '') + '> Exclude from summary</label>' +
          '<label class="flag-check"><input type="checkbox" class="subtask-exclude-export"' + (sExExp ? ' checked' : '') + '> Exclude from export</label>' +
          '<label class="flag-check"><input type="checkbox" class="subtask-no-effort-needed"' + (sNoEff ? ' checked' : '') + '> No Effort Needed</label>' +
        '</div>' +
        '<div class="subtask-update-toggles">' +
          '<button type="button" class="btn-update-toggle btn-subtask-update-details' + (sps.details === true ? ' active' : '') + '">Update Details</button>' +
          '<button type="button" class="btn-update-toggle btn-update-subtask-status-changes' + (sps.statusChanges === true ? ' active' : '') + '">Update Status Changes</button>' +
          '<button type="button" class="btn-update-toggle btn-update-toggle-concern btn-add-concern-toggle' + (sps.concerns === true ? ' active' : '') + '">Concerns</button>' +
        '</div>' +
        renderSubtaskStatusChangesSection(s, sps.statusChanges === true) +
        renderConcernsBlock(s.concerns || [], sps.concerns === true) +
        '<div class="subtask-details-block task-toggleable-block' + spc('details') + '">' +
          '<h4 class="task-details-title">Sub-task details</h4>' +
          '<div class="task-details-grid">' +
            '<label class="task-detail-title-field">Title <input type="text" class="subtask-detail-title" value="' + escapeHtml(stTitle) + '" placeholder="Sub-task title" autocomplete="off"></label>' +
            '<label>Priority <input type="number" class="subtask-detail-priority" min="1" max="10" value="' + escapeHtml(stPri) + '" placeholder="1–10"></label>' +
            '<label>Difficulty ' + renderDifficultySelectHtml(stDiff, 'subtask-detail-difficulty') + '</label>' +
            '<label>Assigned <input type="date" class="subtask-detail-assigned" value="' + escapeHtml(stAsg) + '" placeholder="YYYY-MM-DD"></label>' +
            '<label>ETA <input type="date" class="subtask-detail-eta" value="' + escapeHtml(stEta) + '" placeholder="YYYY-MM-DD"></label>' +
            '<label>Effort (hrs) <input type="number" class="subtask-detail-effort" min="0" step="0.5" value="' + escapeHtml(stEff) + '" placeholder="hrs"></label>' +
          '</div>' +
          '<div class="task-detail-category-wrap">' +
            '<span class="task-detail-label">Category</span>' +
            renderCategoryDropdownHtml(stCats, 'subtask-detail-category-' + taskId + '-' + s.id) +
          '</div>' +
          '<div class="task-detail-project-wrap">' +
            '<span class="task-detail-label">Project</span>' +
            renderProjectSelectHtml(stProj, 'subtask-detail-project-' + taskId + '-' + s.id) +
          '</div>' +
          '<button type="button" class="btn-small save-subtask-details-btn">Save details</button>' +
        '</div>' +
          '<div class="subtask-description-block">' +
          '<span class="block-subtitle">Description</span>' +
          '<div class="task-description-wrap">' +
            '<div class="' + subDescViewCls + '">' + (subDesc || '<em class="no-desc">No description</em>') + '</div>' +
            '<div class="rich-textarea-wrap">' + renderRichFormatToolbarHtml() +
            '<textarea class="' + subDescEditCls + '" rows="2" placeholder="Description…">' + escapeHtml(subDescRaw || '') + '</textarea></div>' +
            '<button type="button" class="btn-edit-cyan toggle-subtask-desc-edit" title="Edit description">' + subToggleSvg + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="task-progress-block">' +
          renderProgressLogSection(s.progress_updates, progressLogKeySub(taskId, s.id), true, taskId, s.id) +
          '<div class="progress-add">' +
            '<div class="rich-textarea-wrap">' + renderRichFormatToolbarHtml() +
            '<textarea class="progress-text-in subtask-progress-text auto-resize rich-text-target" rows="2" placeholder="Progress note…">' + escapeHtml(sProgT) + '</textarea></div>' +
            '<input type="date" class="progress-date-in subtask-progress-date" value="' + escapeHtml(sProgD) + '">' +
            '<input type="number" class="progress-effort-in subtask-progress-effort" placeholder="Hrs" min="0" step="0.5" value="' + escapeHtml(sProgE) + '">' +
            renderProgressCategoryRowHtml(sProgC, 'subtask-progress-add-cat-' + taskId + '-' + s.id) +
            '<button type="button" class="btn-small add-subtask-progress-btn">Add progress</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    return '<li class="subtask-card' + (isSubExpanded ? ' expanded' : '') + '" data-task-id="' + escapeHtml(taskId) + '" data-subtask-id="' + escapeHtml(s.id) + '">' + subBar + subBody + '</li>';
  }

  function renderSubtaskViewTypeDropdown(taskId) {
    var vis = getSubtaskVisibilityForTask(taskId);
    function chk(on) { return on ? ' checked' : ''; }
    return '<div class="filter-dropdown-wrap subtask-viewtype-wrap" data-task-id="' + escapeHtml(taskId) + '">' +
      '<button type="button" class="filter-dropdown-btn" title="Filter sub-tasks by status">' + SVG_ICON_CHEVRON_DOWN + ' View Type</button>' +
      '<div class="filter-dropdown-menu filter-dropdown-menu-checks">' +
      '<label class="subtask-vis-label"><input type="checkbox" class="subtask-vis-cb" data-vis-key="Open"' + chk(vis.Open) + '> Open</label>' +
      '<label class="subtask-vis-label"><input type="checkbox" class="subtask-vis-cb" data-vis-key="Ongoing"' + chk(vis.Ongoing) + '> Ongoing</label>' +
      '<label class="subtask-vis-label"><input type="checkbox" class="subtask-vis-cb" data-vis-key="Done"' + chk(vis.Done) + '> Done</label>' +
      '<label class="subtask-vis-label"><input type="checkbox" class="subtask-vis-cb" data-vis-key="Dropped"' + chk(vis.Dropped) + '> Dropped</label>' +
      '</div>' +
    '</div>';
  }

  function renderTaskCard(task) {
    var today = new Date().toISOString().slice(0, 10);
    var settings = getSettings();
    var priorityColor = getPriorityColor(task.priority, settings);
    var isExpanded = state.expandedTasks[task.id];
    var effortDays = hoursToDays(task.effort_required_hours);
    var effortStr = null;
    if (!isTruthyFlag(task.no_effort_needed)) {
      effortStr = task.effort_required_hours != null && task.effort_required_hours !== ''
        ? (task.effort_required_hours + ' hrs' + (effortDays ? ' (' + effortDays + ' d)' : ''))
        : null;
    }
    var effortRibbonVal = isTruthyFlag(task.no_effort_needed)
      ? mainTaskEffortChipValueWhenExempt(task)
      : (effortStr != null ? effortStr : '—');
    var effortRibbonCls = (!isTruthyFlag(task.no_effort_needed) && effortStr == null) ? ' default-value' : '';
    var tagsStr = (task.tags && task.tags.length) ? task.tags.join(' ') : null;
    var bugNums = task.bug_numbers || (task.bug_number != null && task.bug_number !== 0 && task.bug_number !== '' ? [].concat(task.bug_number) : []);
    var bugStr = bugNums.length ? bugNums.join(', ') : null;
    var etaStr = task.eta || null;
    var counts = subtaskCounts(task.subtasks);

    var effortSpentHrs = taskEffortSpentForRibbon(task);
    var effortSpentStr = effortSpentHrs ? (effortSpentHrs + ' hrs') : '0 hrs';
    var statusStr = (task.status === 'Closed' ? 'Dropped' : (task.status === 'Completed' ? 'Done' : task.status)) || 'Open';
    var statusClass = 'meta-status-' + (statusStr || 'open').toLowerCase().replace(/\s/g, '-');

    var taskCats = (task.categories || []).length ? (task.categories || []).map(function (c) {
      return '<span class="meta-chip meta-chip-category">' + escapeHtml(c) + '</span>';
    }).join('') : '';
    var metaChipParts = [
      '<span class="meta-chip meta-chip-status ' + statusClass + '"><span class="meta-label">Status</span><span class="meta-value">' + escapeHtml(statusStr) + '</span></span>',
      '<span class="meta-chip"><span class="meta-label">Priority</span><span class="meta-value' + (task.priority == null ? ' default-value' : '') + '">' + (task.priority != null ? 'P' + task.priority : '—') + '</span></span>',
      '<span class="meta-chip"><span class="meta-label">Difficulty</span><span class="meta-value">' + escapeHtml(normalizeTaskDifficulty(task.difficulty)) + '</span></span>',
      (taskCats ? '<span class="meta-chip meta-chip-categories"><span class="meta-label">Category</span>' + taskCats + '</span>' : '<span class="meta-chip"><span class="meta-label">Category</span><span class="meta-value default-value">—</span></span>'),
      '<span class="meta-chip"><span class="meta-label">Tags</span><span class="meta-value' + (!tagsStr ? ' default-value' : '') + '">' + escapeHtml(tagsStr || '—') + '</span></span>',
      '<span class="meta-chip"><span class="meta-label">Assigned</span><span class="meta-value' + (!task.assigned_date ? ' default-value' : '') + '">' + escapeHtml(task.assigned_date || '—') + '</span></span>',
      '<span class="meta-chip meta-chip-eta"><span class="meta-label">ETA</span><span class="meta-value' + (!etaStr ? ' default-value' : '') + '">' + escapeHtml(etaStr || '—') + '</span></span>',
      '<span class="meta-chip meta-chip-effort"><span class="meta-label">Effort</span><span class="meta-value' + effortRibbonCls + '">' + escapeHtml(effortRibbonVal) + '</span></span>'
    ];
    metaChipParts.push(
      '<span class="meta-chip meta-chip-spent"><span class="meta-label">Effort spent</span><span class="meta-value' + (!effortSpentHrs ? ' default-value' : '') + '">' + effortSpentStr + '</span></span>',
      '<span class="meta-chip"><span class="meta-label">Bugs</span><span class="meta-value' + (!bugStr ? ' default-value' : '') + '">' + escapeHtml(bugStr || '—') + '</span></span>'
    );
    var metaChips = metaChipParts.join('');

    var noEffortTask = isTruthyFlag(task.no_effort_needed);
    var deadlineDays = daysUntilDeadline(task.eta);
    var deadlineLabel = formatDeadlineLabel(deadlineDays);
    var deadlineCls = deadlineDays !== null ? (deadlineDays < 0 ? ' hl-overdue' : (deadlineDays <= 3 ? ' hl-urgent' : '')) : '';
    var plannedHrs = getLatestPlannedEffortHours(task);
    var spentTotal = taskEffortSpent(task);
    var remHrs = plannedHrs - spentTotal;
    var effortRemStr = noEffortTask ? '—' : (remHrs.toFixed(1).replace(/\.0$/, '') + ' / ' + plannedHrs.toFixed(1).replace(/\.0$/, '') + ' hrs');
    var effortRemCls = (!noEffortTask && remHrs < 0) ? ' hl-overdue' : '';

    var highlightsRow = '<div class="task-bar-highlights">';
    if (statusStr !== 'Done' && statusStr !== 'Dropped') {
      highlightsRow +=
        '<span class="bar-highlight' + deadlineCls + '">' + (deadlineLabel != null ? escapeHtml(deadlineLabel) : '<span class="hl-dim">No ETA</span>') + '</span>' +
        '<span class="bar-highlight-sep">·</span>' +
        '<span class="bar-highlight' + effortRemCls + '">Remaining: ' + escapeHtml(effortRemStr) + '</span>';
    } else {
      highlightsRow += '<span class="bar-highlight hl-done">' + escapeHtml(statusStr) + '</span>';
    }
    highlightsRow += '</div>';

    var subtaskBlock = '';
    if (counts.total > 0) {
      subtaskBlock = '<div class="task-bar-subtasks">' +
        '<span class="subtask-count-wrap"><span class="subtask-count-label">Subtasks : </span><span class="subtask-count-value">' + counts.total + '</span></span>' +
        '<span class="subtask-pipe">|</span>' +
        '<span class="subtask-summary">' +
          '<span class="badge badge-open">' + counts.open + ' Open</span>' +
          '<span class="badge badge-ongoing">' + counts.ongoing + ' Ongoing</span>' +
          '<span class="badge badge-done">' + counts.done + ' Done</span>' +
          '<span class="badge badge-dropped">' + counts.dropped + ' Dropped</span>' +
        '</span></div>';
    }

    var barContent = '<div class="task-bar" style="background-color:' + escapeHtml(priorityColor) + ';color:#fff" data-task-id="' + escapeHtml(task.id) + '">' +
      '<div class="task-bar-left">' +
        '<div class="task-bar-title-row">' +
          renderProjectBarChip(task.project) +
          '<span class="task-bar-title">' + escapeHtml(task.title || '') + '</span>' +
          renderConcernCountPill(task.concerns) +
        '</div>' +
        '<div class="task-bar-meta">' + metaChips + '</div>' +
        highlightsRow +
        subtaskBlock +
      '</div>' +
      '</div>';

    var bodyHtml = '';
    if (isExpanded) {
      var td = state.editorDrafts.tasks[task.id];
      function pick(field, fallback) {
        if (td && Object.prototype.hasOwnProperty.call(td, field)) return td[field];
        return fallback;
      }
      function pickBool(field, fallbackBool) {
        if (td && Object.prototype.hasOwnProperty.call(td, field)) return !!td[field];
        return fallbackBool;
      }
      var tagsJoined = (task.tags || []).map(function (t) { return (t || '').replace(/^#/, ''); }).join(', ');
      var detailTitle = pick('title', task.title || '');
      var detailPriorityVal = pick('priority', task.priority != null ? String(task.priority) : '');
      var detailTagsVal = pick('tags', tagsJoined);
      var detailAssignedVal = pick('assigned_date', task.assigned_date || '');
      var detailEtaVal = pick('eta', task.eta || '');
      var effortDraftStr = pick('effort', task.effort_required_hours != null && task.effort_required_hours !== '' ? String(task.effort_required_hours) : '');
      var detailBugsVal = pick('bugs', (task.bug_numbers || []).join(', '));
      var detailDifficultyVal = pick('difficulty', normalizeTaskDifficulty(task.difficulty));
      var detailProjectVal = pick('project', task.project || '');
      var detailCats = pick('categories', task.categories || []);
      if (!Array.isArray(detailCats)) detailCats = [];
      var descRaw = pick('description', task.description || '');
      var desc = formatRichDescription(descRaw || '');
      var descEditing = td && td.descEditing === true;
      var descViewCls = descEditing ? 'task-description-view hidden' : 'task-description-view';
      var descEditCls = descEditing ? 'task-description-edit auto-resize rich-text-target' : 'task-description-edit hidden auto-resize rich-text-target';
      var toggleDescSvg = descEditing ? SVG_ICON_CHECK : SVG_ICON_EDIT;
      var exSumChk = pickBool('exclude_from_summary', isTruthyFlag(task.exclude_from_summary));
      var exExpChk = pickBool('exclude_from_export', isTruthyFlag(task.exclude_from_export));
      var noEffChk = pickBool('no_effort_needed', isTruthyFlag(task.no_effort_needed));
      var archChk = pickBool('archived', !!task.archived);
      var etaUpVal = pick('etaUpdateInput', today);
      var effortUpVal = pick('effortUpdateInput', '');
      var progTextVal = pick('progressText', '');
      var progDateVal = pick('progressDate', today);
      var progEffVal = pick('progressEffort', '');
      var progCats = pick('progressCategories', []);
      if (!Array.isArray(progCats)) progCats = [];
      var ps = state.editorPanelState.tasks[task.id] || {};
      function pc(key) {
        return (ps[key] === true) ? '' : ' task-block-collapsed';
      }
      var nd = state.editorDrafts.newSubtask[task.id];
      function np(field, fallback) {
        if (nd && Object.prototype.hasOwnProperty.call(nd, field)) return nd[field];
        return fallback;
      }
      var ntTitle = np('title', '');
      var ntDesc = np('description', '');
      var ntPri = np('priority', '1');
      var ntAsg = np('assigned', today);
      var ntEff = np('effort', '0');
      var ntDiff = np('difficulty', DEFAULT_TASK_DIFFICULTY);
      var ntProj = np('project', '');
      var ntCats = np('categories', []);
      if (!Array.isArray(ntCats)) ntCats = [];

      bodyHtml = '<div class="task-body">' +
        '<div class="task-body-actions">' +
          '<div class="status-buttons" data-status-target="task">' +
            '<button type="button" class="status-btn' + (task.status === 'Open' ? ' active' : '') + '" data-status="Open">Open</button>' +
            '<button type="button" class="status-btn' + (task.status === 'Ongoing' ? ' active' : '') + '" data-status="Ongoing">Ongoing</button>' +
            '<button type="button" class="status-btn' + ((task.status === 'Done' || task.status === 'Completed') ? ' active' : '') + '" data-status="Done">Done</button>' +
            '<button type="button" class="status-btn' + ((task.status === 'Dropped' || task.status === 'Closed') ? ' active' : '') + '" data-status="Dropped">Dropped</button>' +
          '</div>' +
          '<button type="button" class="btn-icon task-delete" title="Delete task"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg></button>' +
        '</div>' +
        '<div class="task-summary-export-flags">' +
          '<label class="flag-check"><input type="checkbox" class="task-exclude-summary"' + (exSumChk ? ' checked' : '') + '> Exclude from summary</label>' +
          '<label class="flag-check"><input type="checkbox" class="task-exclude-export"' + (exExpChk ? ' checked' : '') + '> Exclude from export</label>' +
          '<label class="flag-check"><input type="checkbox" class="task-no-effort-needed"' + (noEffChk ? ' checked' : '') + '> No Effort Needed</label>' +
          (isTaskCompleted(task) ? '<label class="flag-check flag-check-archive"><input type="checkbox" class="task-archive-check"' + (archChk ? ' checked' : '') + '> Archive</label>' : '') +
        '</div>' +
        '<div class="task-update-toggles">' +
          '<button type="button" class="btn-update-toggle btn-update-details' + (ps.details === true ? ' active' : '') + '">Update Task Details</button>' +
          '<button type="button" class="btn-update-toggle btn-update-eta' + (ps.eta === true ? ' active' : '') + '">Update ETA</button>' +
          '<button type="button" class="btn-update-toggle btn-update-effort' + (ps.effort === true ? ' active' : '') + '">Update Effort</button>' +
          '<button type="button" class="btn-update-toggle btn-update-status-changes' + (ps.statusChanges === true ? ' active' : '') + '">Update Status Changes</button>' +
          '<button type="button" class="btn-update-toggle btn-update-toggle-concern btn-add-concern-toggle' + (ps.concerns === true ? ' active' : '') + '">Concerns</button>' +
        '</div>' +
        '<div class="task-details-block task-toggleable-block' + pc('details') + '">' +
          '<h4 class="task-details-title">Task details</h4>' +
          '<div class="task-details-grid">' +
            '<label class="task-detail-title-field">Title <input type="text" class="task-detail-title" value="' + escapeHtml(detailTitle) + '" placeholder="Task title" autocomplete="off"></label>' +
            '<label>Priority <input type="number" class="task-detail-priority" min="1" max="10" value="' + escapeHtml(detailPriorityVal) + '" placeholder="1–10"></label>' +
            '<label>Difficulty ' + renderDifficultySelectHtml(detailDifficultyVal, 'task-detail-difficulty') + '</label>' +
            '<label>Tags <input type="text" class="task-detail-tags" value="' + escapeHtml(detailTagsVal) + '" placeholder="e.g. tag1, tag2"></label>' +
            '<label>Assigned <input type="date" class="task-detail-assigned" value="' + escapeHtml(detailAssignedVal) + '" placeholder="YYYY-MM-DD"></label>' +
            '<label>ETA <input type="date" class="task-detail-eta" value="' + escapeHtml(detailEtaVal) + '" placeholder="YYYY-MM-DD"></label>' +
            '<label>Effort (hrs) <input type="number" class="task-detail-effort" min="0" step="0.5" value="' + escapeHtml(effortDraftStr) + '" placeholder="hrs"></label>' +
            '<label>Bugs <input type="text" class="task-detail-bugs" value="' + escapeHtml(detailBugsVal) + '" placeholder="—"></label>' +
          '</div>' +
          '<div class="task-detail-category-wrap">' +
            '<span class="task-detail-label">Category</span>' +
            renderCategoryDropdownHtml(detailCats, 'task-detail-category-' + task.id) +
          '</div>' +
          '<div class="task-detail-project-wrap">' +
            '<span class="task-detail-label">Project</span>' +
            renderProjectSelectHtml(detailProjectVal, 'task-detail-project-' + task.id) +
          '</div>' +
          '<button type="button" class="btn-small save-task-details-btn">Save details</button>' +
        '</div>' +
        '<div class="task-update-eta-block task-toggleable-block' + pc('eta') + '">' +
          '<h4 class="task-update-title">Update ETA</h4>' +
          '<p class="task-update-current">Current ETA: <strong' + (!task.eta ? ' class="default-value"' : '') + '>' + escapeHtml(task.eta || '—') + '</strong></p>' +
          '<div class="task-update-row">' +
            '<input type="date" class="task-update-eta-in" value="' + escapeHtml(etaUpVal) + '">' +
            '<button type="button" class="btn-small update-eta-btn">Update ETA</button>' +
          '</div>' +
          (task.eta_updates && task.eta_updates.length ? (function () {
            var updates = task.eta_updates;
            var prev = updates[0].old_eta || '—';
            var parts = [escapeHtml(prev)];
            for (var i = 0; i < updates.length; i++) {
              var newE = updates[i].new_eta || '—';
              var cmp = compareDateStr(i === 0 ? updates[0].old_eta : updates[i - 1].new_eta, updates[i].new_eta);
              var slipClass = cmp < 0 ? ' eta-slip' : (cmp > 0 ? ' eta-pullin' : '');
              parts.push(' → <span class="eta-change-new' + slipClass + '">' + escapeHtml(newE) + '</span>');
            }
            var dates = updates.map(function (u) { return u.date_recorded || ''; }).filter(Boolean).join(', ');
            return '<p class="task-update-count">ETA changed ' + updates.length + ' time(s)</p><p class="task-update-chain task-update-history-eta">' + parts.join('') + (dates ? ' <span class="task-update-date">(' + escapeHtml(dates) + ')</span>' : '') + '</p>';
          })() : '') +
        '</div>' +
        '<div class="task-update-effort-block task-toggleable-block' + pc('effort') + '">' +
          '<h4 class="task-update-title">Update Effort</h4>' +
          '<p class="task-update-current">Current effort: <strong' + (task.effort_required_hours == null || task.effort_required_hours === '' ? ' class="default-value"' : '') + '>' + (task.effort_required_hours != null && task.effort_required_hours !== '' ? task.effort_required_hours + ' hrs' : '—') + '</strong></p>' +
          '<div class="task-update-row">' +
            '<input type="number" class="task-update-effort-in" min="0" step="0.5" placeholder="New effort (hrs)" value="' + escapeHtml(effortUpVal) + '">' +
            '<button type="button" class="btn-small update-effort-btn">Update Effort</button>' +
          '</div>' +
          (task.effort_updates && task.effort_updates.length ? (function () {
            var updates = task.effort_updates;
            var prevNum = updates[0].old_effort_hours != null ? updates[0].old_effort_hours : '—';
            var prevVal = prevNum === '—' ? '—' : prevNum + ' hrs';
            var parts = [escapeHtml(String(prevVal))];
            for (var i = 0; i < updates.length; i++) {
              var n = updates[i].new_effort_hours != null ? updates[i].new_effort_hours : '—';
              var prevForCmp = i === 0 ? (typeof updates[0].old_effort_hours === 'number' ? updates[0].old_effort_hours : parseFloat(updates[0].old_effort_hours)) : (typeof updates[i - 1].new_effort_hours === 'number' ? updates[i - 1].new_effort_hours : parseFloat(updates[i - 1].new_effort_hours));
              var nNum = typeof n === 'number' ? n : parseFloat(n);
              var cmp = (!isNaN(prevForCmp) && !isNaN(nNum)) ? (nNum > prevForCmp ? 1 : (nNum < prevForCmp ? -1 : 0)) : 0;
              var slipClass = cmp > 0 ? ' effort-increase' : (cmp < 0 ? ' effort-decrease' : '');
              var newVal = n === '—' ? '— hrs' : n + ' hrs';
              parts.push(' → <span class="effort-change-new' + slipClass + '">' + escapeHtml(String(newVal)) + '</span>');
            }
            var dates = updates.map(function (u) { return u.date_recorded || ''; }).filter(Boolean).join(', ');
            return '<p class="task-update-count">Effort changed ' + updates.length + ' time(s)</p><p class="task-update-chain task-update-history-effort">' + parts.join('') + (dates ? ' <span class="task-update-date">(' + escapeHtml(dates) + ')</span>' : '') + '</p>';
          })() : '') +
        '</div>' +
        renderTaskStatusChangesSection(task, ps.statusChanges === true) +
        renderConcernsBlock(task.concerns || [], ps.concerns === true) +
        '<div class="task-description-block">' +
          '<span class="block-subtitle">Description</span>' +
          '<div class="task-description-wrap">' +
            '<div class="' + descViewCls + '">' + (desc || '<em class="no-desc">No description</em>') + '</div>' +
            '<div class="rich-textarea-wrap">' + renderRichFormatToolbarHtml() +
            '<textarea class="' + descEditCls + '" rows="3" placeholder="Description…">' + escapeHtml(descRaw || '') + '</textarea></div>' +
            '<button type="button" class="btn-edit-cyan toggle-desc-edit" title="Edit description">' + toggleDescSvg + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="task-progress-block">' +
          renderProgressLogSection(task.progress_updates, progressLogKeyMain(task.id), false, task.id, null) +
          '<div class="progress-add">' +
            '<div class="rich-textarea-wrap">' + renderRichFormatToolbarHtml() +
            '<textarea class="progress-text-in auto-resize rich-text-target" rows="2" placeholder="Progress note…">' + escapeHtml(progTextVal) + '</textarea></div>' +
            '<input type="date" class="progress-date-in" value="' + escapeHtml(progDateVal) + '">' +
            '<input type="number" class="progress-effort-in" placeholder="Hrs" min="0" step="0.5" value="' + escapeHtml(progEffVal) + '">' +
            renderProgressCategoryRowHtml(progCats, 'progress-add-cat-' + task.id) +
            '<button type="button" class="btn-small add-progress-btn">Add progress</button>' +
          '</div>' +
        '</div>' +
        '<div class="task-subtasks-block">' +
          '<div class="subtasks-heading-row">' +
            '<h4 class="subtasks-title">Sub-tasks</h4>' +
            '<div class="filter-dropdown-wrap subtask-filter-wrap" data-task-id="' + escapeHtml(task.id) + '">' +
              '<button type="button" class="filter-dropdown-btn" title="Sort sub-tasks">' + SVG_ICON_CHEVRON_DOWN + ' Sort</button>' +
              '<div class="filter-dropdown-menu">' +
                '<button type="button" class="filter-option" data-sort-by="date_added" data-sort-dir="asc">Date added (oldest first)</button>' +
                '<button type="button" class="filter-option" data-sort-by="date_added" data-sort-dir="desc">Date added (newest first)</button>' +
                '<button type="button" class="filter-option" data-sort-by="priority" data-sort-dir="asc">Priority (low to high)</button>' +
                '<button type="button" class="filter-option" data-sort-by="priority" data-sort-dir="desc">Priority (high to low)</button>' +
                '<button type="button" class="filter-option" data-sort-by="assigned_date" data-sort-dir="asc">Assigned date (oldest first)</button>' +
                '<button type="button" class="filter-option" data-sort-by="assigned_date" data-sort-dir="desc">Assigned date (newest first)</button>' +
              '</div>' +
            '</div>' +
            renderSubtaskViewTypeDropdown(task.id) +
          '</div>' +
          (task.subtasks && task.subtasks.length ? (function () {
            var filtered = getFilteredSubtasksForTask(task);
            if (!filtered.length) {
              return '<p class="subtask-view-empty muted">No sub-tasks match View Type.</p>';
            }
            var vp = getSubtaskViewportForTask(task.id);
            var pageSize = vp.pageSize;
            var maxStart = Math.max(0, filtered.length - pageSize);
            var startIdx = Math.min(vp.startIndex, maxStart);
            if (startIdx !== vp.startIndex) {
              setSubtaskViewportForTask(task.id, { pageSize: pageSize, startIndex: startIdx });
            }
            var slice = filtered.slice(startIdx, startIdx + pageSize);
            var toolbar = renderSubtaskViewportToolbarHtml(task.id, startIdx, pageSize, filtered.length);
            return toolbar + '<ul class="subtask-list">' + slice.map(function (s) {
              return renderSubtaskCard(task.id, s, settings);
            }).join('') + '</ul>';
          })() : '') +
          '<div class="new-subtask-toggles">' +
            '<button type="button" class="btn-update-toggle btn-new-subtask' + (ps.newSubtask === true ? ' active' : '') + '">New Sub-Task</button>' +
          '</div>' +
          '<div class="new-subtask-block task-toggleable-block' + pc('newSubtask') + '">' +
            '<h4 class="task-details-title">New sub-task</h4>' +
            '<div class="new-subtask-form">' +
              '<label>Title <input type="text" class="new-subtask-title-in" placeholder="Sub-task title" value="' + escapeHtml(ntTitle) + '"></label>' +
              '<label class="new-subtask-desc-label">Description</label>' +
              '<div class="rich-textarea-wrap new-subtask-desc-wrap">' + renderRichFormatToolbarHtml() +
              '<textarea class="new-subtask-desc-in auto-resize rich-text-target" rows="3" placeholder="Description…">' + escapeHtml(ntDesc) + '</textarea></div>' +
              '<div class="task-details-grid">' +
                '<label>Priority <input type="number" class="new-subtask-priority-in" min="1" max="10" value="' + escapeHtml(ntPri) + '" placeholder="1–10"></label>' +
                '<label>Difficulty ' + renderDifficultySelectHtml(ntDiff, 'new-subtask-difficulty') + '</label>' +
                '<label>Assigned <input type="date" class="new-subtask-assigned-in" value="' + escapeHtml(ntAsg) + '"></label>' +
                '<label>Effort (hrs) <input type="number" class="new-subtask-effort-in" min="0" step="0.5" value="' + escapeHtml(ntEff) + '" placeholder="hrs"></label>' +
              '</div>' +
              '<div class="task-detail-category-wrap">' +
                '<span class="task-detail-label">Category</span>' +
                renderCategoryDropdownHtml(ntCats, 'new-subtask-category-' + task.id) +
              '</div>' +
              '<div class="task-detail-project-wrap">' +
                '<span class="task-detail-label">Project</span>' +
                renderProjectSelectHtml(ntProj, 'new-subtask-project-' + task.id) +
              '</div>' +
              '<button type="button" class="btn-cyan add-subtask-submit-btn">Add Sub-Task</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    return '<div class="task-card' + (isExpanded ? ' expanded' : '') + '" data-id="' + escapeHtml(task.id) + '">' + barContent + bodyHtml + '</div>';
  }

  function getProgressCountForLogKey(key) {
    if (!key) return 0;
    if (key.indexOf('m:') === 0) {
      var tid = key.slice(2);
      var t = state.data.tasks.find(function (x) { return x.id === tid; });
      return t ? (t.progress_updates || []).length : 0;
    }
    if (key.indexOf('s:') === 0) {
      var rest = key.slice(2);
      var ix = rest.indexOf(':');
      if (ix < 0) return 0;
      var tid2 = rest.slice(0, ix);
      var sid = rest.slice(ix + 1);
      var t2 = state.data.tasks.find(function (x) { return x.id === tid2; });
      if (!t2 || !t2.subtasks) return 0;
      var s = t2.subtasks.find(function (x) { return x.id === sid; });
      return s ? (s.progress_updates || []).length : 0;
    }
    return 0;
  }

  function progressLogNavApply(key, delta) {
    var n = getProgressCountForLogKey(key);
    var maxStart = Math.max(0, n - PROGRESS_LOG_PAGE);
    var cur = state.progressLogWindowStart[key];
    if (cur == null || typeof cur !== 'number' || isNaN(cur)) cur = maxStart;
    var next = Math.max(0, Math.min(maxStart, cur + delta));
    state.progressLogWindowStart[key] = next;
    renderList();
  }

  function closeProgressHistoryModal() {
    var modal = $('progress-history-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
    state.progressHistoryOpen = null;
  }

  function refreshProgressHistoryModal() {
    var ctx = state.progressHistoryOpen;
    if (!ctx) return;
    var task = state.data.tasks.find(function (x) { return x.id === ctx.taskId; });
    if (!task) {
      closeProgressHistoryModal();
      return;
    }
    var updates;
    var isSub;
    var titleText;
    if (ctx.subtaskId) {
      var sub = (task.subtasks || []).find(function (x) { return x.id === ctx.subtaskId; });
      if (!sub) {
        closeProgressHistoryModal();
        return;
      }
      updates = sub.progress_updates;
      isSub = true;
      titleText = (task.title || 'Task') + ' — ' + (sub.title || 'Sub-task');
    } else {
      updates = task.progress_updates;
      isSub = false;
      titleText = task.title || 'Task';
    }
    var mhKey = progressLogKeyModal(ctx.taskId, ctx.subtaskId);
    var sortDir = getProgressLogSort(mhKey);
    var sortEl = $('progress-history-sort');
    if (sortEl) sortEl.value = sortDir;
    var titleEl = $('progress-history-title');
    if (titleEl) titleEl.textContent = 'Progress history — ' + titleText;
    var scroll = $('progress-history-modal-scroll');
    if (!scroll) return;
    var sortedBase = sortProgressUpdatesOldestFirst(updates || []);
    var displayList = sortDir === 'desc' ? sortedBase.slice().reverse() : sortedBase;
    var ulClass = isSub ? 'progress-list subtask-progress-list progress-list-modal-full' : 'progress-list progress-list-modal-full';
    scroll.innerHTML = displayList.length
      ? '<ul class="' + ulClass + '">' + displayList.map(function (p) { return renderProgressItemLi(p, isSub); }).join('') + '</ul>'
      : '<p class="muted">No progress entries yet.</p>';
    bindRichFormatToolbars(scroll);
    scroll.querySelectorAll('.category-dropdown-wrap').forEach(function (w) {
      bindCategoryDropdownInWrap(w);
    });
    wireProgressHistoryModalBody(scroll, ctx.taskId, ctx.subtaskId);
  }

  function openProgressHistoryModal(taskId, subtaskId) {
    state.progressHistoryOpen = { taskId: taskId, subtaskId: subtaskId || null };
    var mhKey = progressLogKeyModal(taskId, subtaskId || null);
    if (state.progressLogSort[mhKey] == null) state.progressLogSort[mhKey] = 'asc';
    refreshProgressHistoryModal();
    var modal = $('progress-history-modal');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function wireProgressHistoryModalBody(root, taskId, subtaskId) {
    var isSub = !!subtaskId;
    var editSel = isSub ? '.btn-edit-subtask-progress' : '.btn-edit-progress';
    root.querySelectorAll(editSel).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.progress-item');
        var view = li.querySelector('.progress-item-view');
        var edit = li.querySelector('.progress-item-edit');
        if (!edit.classList.contains('hidden')) return;
        var textEl = li.querySelector('.progress-text');
        var editText = li.querySelector('.progress-edit-text');
        var rawText = li.getAttribute('data-progress-text');
        editText.value = rawText !== null ? decodeAttr(rawText) : (textEl ? textEl.textContent : '');
        li.querySelector('.progress-edit-date').value = li.dataset.dateAdded || '';
        li.querySelector('.progress-edit-effort').value = li.dataset.effort || '';
        var catWrapEdit = li.querySelector('.progress-item-edit .category-dropdown-wrap');
        if (catWrapEdit) {
          var rawCats = li.getAttribute('data-progress-categories');
          var arrCats = [];
          try {
            arrCats = rawCats ? JSON.parse(rawCats) : [];
            if (!Array.isArray(arrCats)) arrCats = [];
          } catch (err) { arrCats = []; }
          setCategoryDropdownSelection(catWrapEdit, arrCats);
        }
        view.classList.add('hidden');
        edit.classList.remove('hidden');
        autoResizeTextarea(editText);
      });
    });
    root.querySelectorAll('.progress-save-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.progress-item');
        var edit = li.querySelector('.progress-item-edit');
        var view = li.querySelector('.progress-item-view');
        var updateId = li.dataset.updateId;
        var catWrapSave = li.querySelector('.progress-item-edit .category-dropdown-wrap');
        if (isSub) {
          updateSubtaskProgressUpdate(taskId, subtaskId, updateId, {
            text: li.querySelector('.progress-edit-text').value,
            date_added: li.querySelector('.progress-edit-date').value || new Date().toISOString().slice(0, 10),
            effort_consumed_hours: parseFloat(li.querySelector('.progress-edit-effort').value) || 0,
            categories: getSelectedCategoriesFromWrap(catWrapSave)
          });
        } else {
          updateProgressUpdate(taskId, updateId, {
            text: li.querySelector('.progress-edit-text').value,
            date_added: li.querySelector('.progress-edit-date').value || new Date().toISOString().slice(0, 10),
            effort_consumed_hours: parseFloat(li.querySelector('.progress-edit-effort').value) || 0,
            categories: getSelectedCategoriesFromWrap(catWrapSave)
          });
        }
        edit.classList.add('hidden');
        view.classList.remove('hidden');
      });
    });
    root.querySelectorAll('.progress-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm('Delete this progress entry?')) return;
        var li = btn.closest('.progress-item');
        var updateId = li && li.dataset.updateId;
        if (!updateId) return;
        if (isSub) deleteSubtaskProgressUpdate(taskId, subtaskId, updateId);
        else deleteProgressUpdate(taskId, updateId);
      });
    });
  }

  function bindTaskCardEvents(card) {
    var taskId = card.dataset.id;

    card.addEventListener('click', function (e) {
      var navUp = e.target.closest('.progress-log-nav-up');
      if (navUp && card.contains(navUp) && !navUp.disabled) {
        e.stopPropagation();
        progressLogNavApply(navUp.getAttribute('data-progress-log-key'), -PROGRESS_LOG_PAGE);
        return;
      }
      var navDown = e.target.closest('.progress-log-nav-down');
      if (navDown && card.contains(navDown) && !navDown.disabled) {
        e.stopPropagation();
        progressLogNavApply(navDown.getAttribute('data-progress-log-key'), PROGRESS_LOG_PAGE);
        return;
      }
      var openHist = e.target.closest('.btn-progress-history-open');
      if (openHist && card.contains(openHist)) {
        e.stopPropagation();
        var tid = openHist.getAttribute('data-task-id');
        var sid = openHist.getAttribute('data-subtask-id');
        if (tid) openProgressHistoryModal(tid, sid || null);
      }
    });

    card.addEventListener('change', function (e) {
      var sel = e.target.closest('.progress-log-sort-select');
      if (!sel || !card.contains(sel) || sel.id === 'progress-history-sort') return;
      e.stopPropagation();
      var k = sel.getAttribute('data-progress-log-key');
      if (k) {
        state.progressLogSort[k] = sel.value === 'desc' ? 'desc' : 'asc';
        renderList();
      }
    });

    var taskBar = card.querySelector('.task-bar');
    if (taskBar) {
      taskBar.addEventListener('click', function (e) {
        if (e.target.closest('.task-body')) return;
        state.expandedTasks[taskId] = !state.expandedTasks[taskId];
        renderList();
      });
    }

    card.querySelectorAll('.task-body-actions .status-buttons[data-status-target="task"] .status-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        updateTask(taskId, { status: btn.dataset.status });
      });
    });

    card.querySelectorAll('.task-exclude-summary').forEach(function (inp) {
      inp.addEventListener('click', function (e) { e.stopPropagation(); });
      inp.addEventListener('change', function (e) {
        e.stopPropagation();
        updateTask(taskId, { exclude_from_summary: inp.checked });
      });
    });
    card.querySelectorAll('.task-exclude-export').forEach(function (inp) {
      inp.addEventListener('click', function (e) { e.stopPropagation(); });
      inp.addEventListener('change', function (e) {
        e.stopPropagation();
        updateTask(taskId, { exclude_from_export: inp.checked });
      });
    });
    card.querySelectorAll('.task-no-effort-needed').forEach(function (inp) {
      inp.addEventListener('click', function (e) { e.stopPropagation(); });
      inp.addEventListener('change', function (e) {
        e.stopPropagation();
        updateTask(taskId, { no_effort_needed: inp.checked });
      });
    });
    card.querySelectorAll('.task-archive-check').forEach(function (inp) {
      inp.addEventListener('click', function (e) { e.stopPropagation(); });
      inp.addEventListener('change', function (e) {
        e.stopPropagation();
        updateTask(taskId, { archived: inp.checked });
      });
    });

    card.querySelectorAll('.task-delete').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (confirm('Delete this task?')) deleteTask(taskId);
      });
    });

    function closeOtherTaskUpdateBlocks(exceptBlock) {
      var detailsBlock = card.querySelector('.task-details-block');
      var etaBlock = card.querySelector('.task-update-eta-block');
      var effortBlock = card.querySelector('.task-update-effort-block');
      var statusChangesBlock = card.querySelector(':scope > .task-body > .task-update-status-changes-block');
      var concernsBlock = card.querySelector(':scope > .task-body > .task-concerns-block');
      [detailsBlock, etaBlock, effortBlock, statusChangesBlock, concernsBlock].forEach(function (b) {
        if (b && b !== exceptBlock) {
          b.classList.add('task-block-collapsed');
          if (b === detailsBlock) { var btn = card.querySelector('.btn-update-details'); if (btn) btn.classList.remove('active'); }
          if (b === etaBlock) { var btn = card.querySelector('.btn-update-eta'); if (btn) btn.classList.remove('active'); }
          if (b === effortBlock) { var btn = card.querySelector('.btn-update-effort'); if (btn) btn.classList.remove('active'); }
          if (b === statusChangesBlock) { var btn = card.querySelector('.btn-update-status-changes'); if (btn) btn.classList.remove('active'); }
          if (b === concernsBlock) { var btn = card.querySelector('.btn-add-concern-toggle'); if (btn) btn.classList.remove('active'); }
        }
      });
    }
    card.querySelectorAll('.btn-update-details').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector('.task-details-block');
        if (block) {
          var opening = block.classList.contains('task-block-collapsed');
          if (opening) closeOtherTaskUpdateBlocks(block);
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
        }
        refreshEditorSessionPanelsFromDom();
      });
    });
    card.querySelectorAll('.btn-update-eta').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector('.task-update-eta-block');
        if (block) {
          var opening = block.classList.contains('task-block-collapsed');
          if (opening) closeOtherTaskUpdateBlocks(block);
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
        }
        refreshEditorSessionPanelsFromDom();
      });
    });
    card.querySelectorAll('.btn-update-effort').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector('.task-update-effort-block');
        if (block) {
          var opening = block.classList.contains('task-block-collapsed');
          if (opening) closeOtherTaskUpdateBlocks(block);
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
        }
        refreshEditorSessionPanelsFromDom();
      });
    });
    card.querySelectorAll('.btn-update-status-changes').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector(':scope > .task-body > .task-update-status-changes-block');
        if (block) {
          var opening = block.classList.contains('task-block-collapsed');
          if (opening) closeOtherTaskUpdateBlocks(block);
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
        }
        refreshEditorSessionPanelsFromDom();
      });
    });

    card.querySelectorAll(':scope > .task-body .task-update-toggles .btn-add-concern-toggle').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector(':scope > .task-body > .task-concerns-block');
        if (block) {
          var opening = block.classList.contains('task-block-collapsed');
          if (opening) closeOtherTaskUpdateBlocks(block);
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
        }
        refreshEditorSessionPanelsFromDom();
      });
    });

    var descView = card.querySelector(':scope > .task-body > .task-description-block .task-description-view');
    var descEdit = card.querySelector(':scope > .task-body > .task-description-block .task-description-edit:not(.subtask-desc-edit)');
    var toggleDesc = card.querySelector(':scope > .task-body > .task-description-block .toggle-desc-edit');
    if (toggleDesc && descView && descEdit) {
      toggleDesc.addEventListener('click', function (e) {
        e.stopPropagation();
        if (descEdit.classList.contains('hidden')) {
          descEdit.classList.remove('hidden');
          descView.classList.add('hidden');
          toggleDesc.innerHTML = SVG_ICON_CHECK;
          autoResizeTextarea(descEdit);
        } else {
          updateTask(taskId, { description: descEdit.value });
          var tdraft = state.editorDrafts.tasks[taskId];
          if (tdraft) {
            delete tdraft.description;
            delete tdraft.descEditing;
          }
          descEdit.classList.add('hidden');
          descView.classList.remove('hidden');
          descView.innerHTML = descEdit.value ? formatRichDescription(descEdit.value) : '<em class="no-desc">No description</em>';
          toggleDesc.innerHTML = SVG_ICON_EDIT;
        }
      });
    }

    card.querySelectorAll('.save-task-details-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var titleEl = card.querySelector('.task-detail-title');
        var newTitle = titleEl ? titleEl.value.trim() : '';
        if (!newTitle) {
          alert('Title cannot be empty.');
          return;
        }
        var priorityEl = card.querySelector('.task-detail-priority');
        var tagsEl = card.querySelector('.task-detail-tags');
        var assignedEl = card.querySelector('.task-detail-assigned');
        var etaEl = card.querySelector('.task-detail-eta');
        var effortEl = card.querySelector('.task-detail-effort');
        var bugsEl = card.querySelector('.task-detail-bugs');
        var catWrap = card.querySelector('.task-details-block .category-dropdown-wrap');
        var priority = priorityEl ? Math.min(10, Math.max(1, parseInt(priorityEl.value, 10) || 1)) : undefined;
        var tags = tagsEl ? parseTags(tagsEl.value) : undefined;
        var assigned_date = assignedEl ? (assignedEl.value || undefined) : undefined;
        var eta = etaEl ? (etaEl.value || '') : undefined;
        var effort_required_hours = effortEl ? (parseFloat(effortEl.value) || 0) : undefined;
        var bug_numbers = bugsEl ? parseBugNumbers(bugsEl.value) : undefined;
        var categories = catWrap ? getSelectedCategoriesFromWrap(catWrap) : undefined;
        var projEl = card.querySelector('.task-details-block .task-project-select');
        var project = projEl ? projEl.value.trim() : '';
        var diffEl = card.querySelector('.task-details-block .task-difficulty-select');
        var updates = { title: newTitle };
        if (priority != null) updates.priority = priority;
        if (diffEl) updates.difficulty = diffEl.value;
        if (tags != null) updates.tags = tags;
        if (assigned_date != null) updates.assigned_date = assigned_date;
        if (eta !== undefined) updates.eta = eta;
        if (effort_required_hours != null) updates.effort_required_hours = effort_required_hours;
        if (bug_numbers != null) updates.bug_numbers = bug_numbers;
        if (categories != null) updates.categories = categories;
        updates.project = project;
        updateTask(taskId, updates);
        var tdPost = state.editorDrafts.tasks[taskId];
        if (tdPost) {
          ['title', 'priority', 'tags', 'assigned_date', 'eta', 'effort', 'bugs', 'difficulty', 'project', 'categories'].forEach(function (k) {
            delete tdPost[k];
          });
        }
      });
    });

    card.querySelectorAll('.update-eta-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var inEl = card.querySelector('.task-update-eta-in');
        var newEta = inEl ? inEl.value : '';
        recordEtaUpdate(taskId, newEta);
        if (inEl) inEl.value = '';
      });
    });

    card.querySelectorAll(':scope > .task-body > .task-update-status-changes-block .status-change-save-date-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.status-change-item');
        var changeId = li && li.dataset.statusChangeId;
        if (!changeId) return;
        var dateIn = li.querySelector('.status-change-date-in');
        updateTaskStatusChangeDate(taskId, changeId, dateIn ? dateIn.value : '');
      });
    });
    card.querySelectorAll(':scope > .task-body > .task-update-status-changes-block .status-change-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm('Delete this status change? Current status and completion date will be recalculated from the remaining history.')) return;
        var li = btn.closest('.status-change-item');
        var changeId = li && li.dataset.statusChangeId;
        if (!changeId) return;
        deleteTaskStatusChange(taskId, changeId);
      });
    });

    card.querySelectorAll('.update-effort-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var inEl = card.querySelector('.task-update-effort-in');
        var val = inEl ? inEl.value : '';
        if (val === '' || isNaN(parseFloat(val))) return;
        recordEffortUpdate(taskId, val);
        if (inEl) inEl.value = '';
      });
    });

    card.querySelectorAll('.add-progress-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var textIn = card.querySelector(':scope > .task-body > .task-progress-block .progress-text-in');
        var dateIn = card.querySelector(':scope > .task-body > .task-progress-block .progress-date-in');
        var effortIn = card.querySelector(':scope > .task-body > .task-progress-block .progress-effort-in');
        var progCatWrap = card.querySelector(':scope > .task-body > .task-progress-block .progress-add .category-dropdown-wrap');
        addProgressUpdate(taskId, {
          text: textIn && textIn.value,
          date_added: dateIn && dateIn.value || new Date().toISOString().slice(0, 10),
          effort_consumed_hours: effortIn ? parseFloat(effortIn.value) || 0 : 0,
          categories: getSelectedCategoriesFromWrap(progCatWrap)
        });
        pruneTaskDraftProgressFields(taskId);
        if (textIn) textIn.value = '';
        if (dateIn) dateIn.value = '';
        if (effortIn) effortIn.value = '';
        resetCategoryDropdownWrap(progCatWrap);
      });
    });

    card.querySelectorAll('.btn-edit-progress').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.progress-item');
        var view = li.querySelector('.progress-item-view');
        var edit = li.querySelector('.progress-item-edit');
        if (edit.classList.contains('hidden')) {
          var textEl = li.querySelector('.progress-text');
          var editText = li.querySelector('.progress-edit-text');
            var rawText = li.getAttribute('data-progress-text');
            editText.value = rawText !== null ? decodeAttr(rawText) : (textEl ? textEl.textContent : '');
            li.querySelector('.progress-edit-date').value = li.dataset.dateAdded || '';
            li.querySelector('.progress-edit-effort').value = li.dataset.effort || '';
            var catWrapEdit = li.querySelector('.progress-item-edit .category-dropdown-wrap');
            if (catWrapEdit) {
              var rawCats = li.getAttribute('data-progress-categories');
              var arrCats = [];
              try {
                arrCats = rawCats ? JSON.parse(rawCats) : [];
                if (!Array.isArray(arrCats)) arrCats = [];
              } catch (err) { arrCats = []; }
              setCategoryDropdownSelection(catWrapEdit, arrCats);
            }
            view.classList.add('hidden');
            edit.classList.remove('hidden');
            autoResizeTextarea(editText);
        }
      });
    });

    card.querySelectorAll('ul.progress-list:not(.subtask-progress-list) .progress-save-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.progress-item');
        var edit = li.querySelector('.progress-item-edit');
        var view = li.querySelector('.progress-item-view');
        var updateId = li.dataset.updateId;
        var catWrapSave = li.querySelector('.progress-item-edit .category-dropdown-wrap');
        updateProgressUpdate(taskId, updateId, {
          text: li.querySelector('.progress-edit-text').value,
          date_added: li.querySelector('.progress-edit-date').value || new Date().toISOString().slice(0, 10),
          effort_consumed_hours: parseFloat(li.querySelector('.progress-edit-effort').value) || 0,
          categories: getSelectedCategoriesFromWrap(catWrapSave)
        });
        edit.classList.add('hidden');
        view.classList.remove('hidden');
      });
    });

    card.querySelectorAll('ul.progress-list:not(.subtask-progress-list) .progress-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm('Delete this progress entry?')) return;
        var li = btn.closest('.progress-item');
        var updateId = li && li.dataset.updateId;
        if (updateId) deleteProgressUpdate(taskId, updateId);
      });
    });

    card.querySelectorAll('.subtask-card').forEach(function (subCard) {
      var subTaskId = subCard.dataset.taskId;
      var subId = subCard.dataset.subtaskId;
      var subKey = subTaskId + '_' + subId;

      var subBar = subCard.querySelector('.subtask-bar');
      if (subBar) {
        subBar.addEventListener('click', function (e) {
          if (e.target.closest('.status-buttons-sub') || e.target.closest('.subtask-delete')) return;
          state.expandedSubtasks[subKey] = !state.expandedSubtasks[subKey];
          renderList();
        });
      }

      subCard.querySelectorAll('.status-buttons-sub .status-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          updateSubtask(subTaskId, subId, { status: btn.dataset.status });
        });
      });

      subCard.querySelectorAll('.subtask-exclude-summary').forEach(function (inp) {
        inp.addEventListener('click', function (e) { e.stopPropagation(); });
        inp.addEventListener('change', function (e) {
          e.stopPropagation();
          updateSubtask(subTaskId, subId, { exclude_from_summary: inp.checked });
        });
      });
      subCard.querySelectorAll('.subtask-exclude-export').forEach(function (inp) {
        inp.addEventListener('click', function (e) { e.stopPropagation(); });
        inp.addEventListener('change', function (e) {
          e.stopPropagation();
          updateSubtask(subTaskId, subId, { exclude_from_export: inp.checked });
        });
      });
      subCard.querySelectorAll('.subtask-no-effort-needed').forEach(function (inp) {
        inp.addEventListener('click', function (e) { e.stopPropagation(); });
        inp.addEventListener('change', function (e) {
          e.stopPropagation();
          updateSubtask(subTaskId, subId, { no_effort_needed: inp.checked });
        });
      });

      subCard.querySelectorAll('.subtask-delete').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (confirm('Delete this sub-task?')) deleteSubtask(subTaskId, subId);
        });
      });

      var toggleSubDesc = subCard.querySelector('.toggle-subtask-desc-edit');
      var subDescView = subCard.querySelector('.subtask-description-block .task-description-view');
      var subDescEdit = subCard.querySelector('.subtask-desc-edit');
      if (toggleSubDesc && subDescView && subDescEdit) {
        toggleSubDesc.addEventListener('click', function (e) {
          e.stopPropagation();
        if (subDescEdit.classList.contains('hidden')) {
          subDescEdit.classList.remove('hidden');
          subDescView.classList.add('hidden');
          toggleSubDesc.innerHTML = SVG_ICON_CHECK;
          autoResizeTextarea(subDescEdit);
        } else {
            updateSubtask(subTaskId, subId, { description: subDescEdit.value });
            var subDraft = state.editorDrafts.subtasks[subTaskId + ':' + subId];
            if (subDraft) {
              delete subDraft.description;
              delete subDraft.subDescEditing;
            }
            subDescEdit.classList.add('hidden');
            subDescView.classList.remove('hidden');
            subDescView.innerHTML = subDescEdit.value ? formatRichDescription(subDescEdit.value) : '<em class="no-desc">No description</em>';
            toggleSubDesc.innerHTML = SVG_ICON_EDIT;
          }
        });
      }

      subCard.querySelectorAll('.btn-subtask-update-details').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var block = subCard.querySelector('.subtask-details-block');
          if (block) {
            block.classList.toggle('task-block-collapsed');
            btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
          }
          refreshEditorSessionPanelsFromDom();
        });
      });
      subCard.querySelectorAll('.btn-update-subtask-status-changes').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var block = subCard.querySelector('.subtask-status-changes-block');
          if (block) {
            block.classList.toggle('task-block-collapsed');
            btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
          }
          refreshEditorSessionPanelsFromDom();
        });
      });
      subCard.querySelectorAll('.subtask-status-changes-block .status-change-save-date-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.status-change-item');
          var changeId = li && li.dataset.statusChangeId;
          if (!changeId) return;
          var dateIn = li.querySelector('.status-change-date-in');
          updateSubtaskStatusChangeDate(subTaskId, subId, changeId, dateIn ? dateIn.value : '');
        });
      });
      subCard.querySelectorAll('.subtask-status-changes-block .status-change-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!confirm('Delete this status change? Current status and completion date will be recalculated from the remaining history.')) return;
          var li = btn.closest('.status-change-item');
          var changeId = li && li.dataset.statusChangeId;
          if (!changeId) return;
          deleteSubtaskStatusChange(subTaskId, subId, changeId);
        });
      });
      subCard.querySelectorAll('.save-subtask-details-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var subTitleEl = subCard.querySelector('.subtask-detail-title');
          var newSubTitle = subTitleEl ? subTitleEl.value.trim() : '';
          if (!newSubTitle) {
            alert('Title cannot be empty.');
            return;
          }
          var priorityEl = subCard.querySelector('.subtask-detail-priority');
          var assignedEl = subCard.querySelector('.subtask-detail-assigned');
          var etaEl = subCard.querySelector('.subtask-detail-eta');
          var effortEl = subCard.querySelector('.subtask-detail-effort');
          var catWrap = subCard.querySelector('.subtask-details-block .category-dropdown-wrap');
          var priority = priorityEl ? Math.min(10, Math.max(1, parseInt(priorityEl.value, 10) || 1)) : undefined;
          var assigned_date = assignedEl ? (assignedEl.value || undefined) : undefined;
          var eta = etaEl ? (etaEl.value || '') : undefined;
          var effort_required_hours = effortEl != null ? (parseFloat(effortEl.value) || 0) : undefined;
          var categories = catWrap ? getSelectedCategoriesFromWrap(catWrap) : undefined;
          var projEl = subCard.querySelector('.subtask-details-block .task-project-select');
          var project = projEl ? projEl.value.trim() : '';
          var diffEl = subCard.querySelector('.subtask-details-block .task-difficulty-select');
          var updates = { title: newSubTitle };
          if (priority != null) updates.priority = priority;
          if (diffEl) updates.difficulty = diffEl.value;
          if (assigned_date != null) updates.assigned_date = assigned_date;
          if (eta !== undefined) updates.eta = eta;
          if (effort_required_hours != null) updates.effort_required_hours = effort_required_hours;
          if (categories != null) updates.categories = categories;
          updates.project = project;
          updateSubtask(subTaskId, subId, updates);
          var sdkKey = subTaskId + ':' + subId;
          var sdPost = state.editorDrafts.subtasks[sdkKey];
          if (sdPost) {
            ['title', 'priority', 'assigned_date', 'eta', 'effort', 'difficulty', 'project', 'categories'].forEach(function (k) {
              delete sdPost[k];
            });
          }
        });
      });

      subCard.querySelectorAll('.add-subtask-progress-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var textIn = subCard.querySelector('.subtask-progress-text');
          var dateIn = subCard.querySelector('.subtask-progress-date');
          var effortIn = subCard.querySelector('.subtask-progress-effort');
          var subProgCatWrap = subCard.querySelector('.progress-add .category-dropdown-wrap');
          addSubtaskProgressUpdate(subTaskId, subId, {
            text: textIn && textIn.value,
            date_added: dateIn && dateIn.value || new Date().toISOString().slice(0, 10),
            effort_consumed_hours: effortIn ? parseFloat(effortIn.value) || 0 : 0,
            categories: getSelectedCategoriesFromWrap(subProgCatWrap)
          });
          pruneSubtaskDraftProgressFields(subTaskId, subId);
          if (textIn) textIn.value = '';
          if (dateIn) dateIn.value = '';
          if (effortIn) effortIn.value = '';
          resetCategoryDropdownWrap(subProgCatWrap);
        });
      });

      subCard.querySelectorAll('.btn-edit-subtask-progress').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.progress-item');
          var view = li.querySelector('.progress-item-view');
          var edit = li.querySelector('.progress-item-edit');
          if (edit.classList.contains('hidden')) {
            var textEl = li.querySelector('.progress-text');
            var editTextEl = li.querySelector('.progress-edit-text');
            var rawText = li.getAttribute('data-progress-text');
            editTextEl.value = rawText !== null ? decodeAttr(rawText) : (textEl ? textEl.textContent : '');
            li.querySelector('.progress-edit-date').value = li.dataset.dateAdded || '';
            li.querySelector('.progress-edit-effort').value = li.dataset.effort || '';
            var subCatWrapEdit = li.querySelector('.progress-item-edit .category-dropdown-wrap');
            if (subCatWrapEdit) {
              var rawSub = li.getAttribute('data-progress-categories');
              var arrSub = [];
              try {
                arrSub = rawSub ? JSON.parse(rawSub) : [];
                if (!Array.isArray(arrSub)) arrSub = [];
              } catch (err2) { arrSub = []; }
              setCategoryDropdownSelection(subCatWrapEdit, arrSub);
            }
            view.classList.add('hidden');
            edit.classList.remove('hidden');
            autoResizeTextarea(editTextEl);
          }
        });
      });

      subCard.querySelectorAll('.subtask-progress-save').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.progress-item');
          var edit = li.querySelector('.progress-item-edit');
          var view = li.querySelector('.progress-item-view');
          var updateId = li.dataset.updateId;
          var subCatWrapSave = li.querySelector('.progress-item-edit .category-dropdown-wrap');
          updateSubtaskProgressUpdate(subTaskId, subId, updateId, {
            text: li.querySelector('.progress-edit-text').value,
            date_added: li.querySelector('.progress-edit-date').value || new Date().toISOString().slice(0, 10),
            effort_consumed_hours: parseFloat(li.querySelector('.progress-edit-effort').value) || 0,
            categories: getSelectedCategoriesFromWrap(subCatWrapSave)
          });
          edit.classList.add('hidden');
          view.classList.remove('hidden');
        });
      });

      subCard.querySelectorAll('.subtask-progress-list .progress-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!confirm('Delete this progress entry?')) return;
          var li = btn.closest('.progress-item');
          var updateId = li && li.dataset.updateId;
          if (updateId) deleteSubtaskProgressUpdate(subTaskId, subId, updateId);
        });
      });

      subCard.querySelectorAll('.subtask-update-toggles .btn-add-concern-toggle').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var block = subCard.querySelector('.task-concerns-block');
          if (block) {
            block.classList.toggle('task-block-collapsed');
            btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
          }
          refreshEditorSessionPanelsFromDom();
        });
      });

      subCard.querySelectorAll('.task-concerns-block .log-concern-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var block = btn.closest('.task-concerns-block');
          var descIn = block && block.querySelector('.concern-desc-in');
          var dateIn = block && block.querySelector('.concern-date-in');
          var desc = descIn ? descIn.value.trim() : '';
          if (!desc) return;
          addSubtaskConcern(subTaskId, subId, {
            description: desc,
            logged_date: dateIn ? (dateIn.value || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10)
          });
        });
      });

      subCard.querySelectorAll('.task-concerns-block .btn-concern-update-toggle').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.concern-item');
          var form = li && li.querySelector('.concern-update-form');
          if (form) {
            form.classList.toggle('hidden');
            btn.classList.toggle('active', !form.classList.contains('hidden'));
          }
        });
      });

      subCard.querySelectorAll('.task-concerns-block .concern-submit-update-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.concern-item');
          var concernId = li && li.dataset.concernId;
          if (!concernId) return;
          var dateIn = li.querySelector('.concern-addressed-date-in');
          var commentIn = li.querySelector('.concern-update-comment');
          var comment = commentIn ? commentIn.value.trim() : '';
          if (!comment) return;
          addressSubtaskConcern(subTaskId, subId, concernId, {
            addressed_date: dateIn ? (dateIn.value || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
            addressed_comment: comment
          });
        });
      });

      subCard.querySelectorAll('.task-concerns-block .concern-change-logged-date-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.concern-item');
          if (!li) return;
          var v = li.querySelector('.concern-logged-date-view');
          var ed = li.querySelector('.concern-logged-date-edit');
          if (v) v.classList.add('hidden');
          if (ed) ed.classList.remove('hidden');
          var field = li.querySelector('.concern-logged-date-field');
          if (field) field.focus();
        });
      });
      subCard.querySelectorAll('.task-concerns-block .concern-cancel-logged-date-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.concern-item');
          if (!li) return;
          var orig = li.getAttribute('data-logged-date') || '';
          var field = li.querySelector('.concern-logged-date-field');
          if (field) field.value = orig;
          var v = li.querySelector('.concern-logged-date-view');
          var ed = li.querySelector('.concern-logged-date-edit');
          if (v) v.classList.remove('hidden');
          if (ed) ed.classList.add('hidden');
        });
      });
      subCard.querySelectorAll('.task-concerns-block .concern-save-logged-date-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.concern-item');
          var concernId = li && li.dataset.concernId;
          if (!concernId) return;
          var field = li.querySelector('.concern-logged-date-field');
          var val = field ? field.value : '';
          updateSubtaskConcernLoggedDate(subTaskId, subId, concernId, val);
        });
      });
      subCard.querySelectorAll('.task-concerns-block .concern-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!confirm('Delete this concern?')) return;
          var li = btn.closest('.concern-item');
          var concernId = li && li.dataset.concernId;
          if (!concernId) return;
          deleteSubtaskConcern(subTaskId, subId, concernId);
        });
      });
    });

    card.querySelectorAll(':scope > .task-body > .task-concerns-block .log-concern-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = btn.closest('.task-concerns-block');
        var descIn = block && block.querySelector('.concern-desc-in');
        var dateIn = block && block.querySelector('.concern-date-in');
        var desc = descIn ? descIn.value.trim() : '';
        if (!desc) return;
        addConcern(taskId, {
          description: desc,
          logged_date: dateIn ? (dateIn.value || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10)
        });
      });
    });

    card.querySelectorAll(':scope > .task-body > .task-concerns-block .btn-concern-update-toggle').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.concern-item');
        var form = li && li.querySelector('.concern-update-form');
        if (form) {
          form.classList.toggle('hidden');
          btn.classList.toggle('active', !form.classList.contains('hidden'));
        }
      });
    });

    card.querySelectorAll(':scope > .task-body > .task-concerns-block .concern-submit-update-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.concern-item');
        var concernId = li && li.dataset.concernId;
        if (!concernId) return;
        var dateIn = li.querySelector('.concern-addressed-date-in');
        var commentIn = li.querySelector('.concern-update-comment');
        var comment = commentIn ? commentIn.value.trim() : '';
        if (!comment) return;
        addressConcern(taskId, concernId, {
          addressed_date: dateIn ? (dateIn.value || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
          addressed_comment: comment
        });
      });
    });

    card.querySelectorAll(':scope > .task-body > .task-concerns-block .concern-change-logged-date-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.concern-item');
        if (!li) return;
        var v = li.querySelector('.concern-logged-date-view');
        var ed = li.querySelector('.concern-logged-date-edit');
        if (v) v.classList.add('hidden');
        if (ed) ed.classList.remove('hidden');
        var field = li.querySelector('.concern-logged-date-field');
        if (field) field.focus();
      });
    });
    card.querySelectorAll(':scope > .task-body > .task-concerns-block .concern-cancel-logged-date-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.concern-item');
        if (!li) return;
        var orig = li.getAttribute('data-logged-date') || '';
        var field = li.querySelector('.concern-logged-date-field');
        if (field) field.value = orig;
        var v = li.querySelector('.concern-logged-date-view');
        var ed = li.querySelector('.concern-logged-date-edit');
        if (v) v.classList.remove('hidden');
        if (ed) ed.classList.add('hidden');
      });
    });
    card.querySelectorAll(':scope > .task-body > .task-concerns-block .concern-save-logged-date-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.concern-item');
        var concernId = li && li.dataset.concernId;
        if (!concernId) return;
        var field = li.querySelector('.concern-logged-date-field');
        var val = field ? field.value : '';
        updateConcernLoggedDate(taskId, concernId, val);
      });
    });
    card.querySelectorAll(':scope > .task-body > .task-concerns-block .concern-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm('Delete this concern?')) return;
        var li = btn.closest('.concern-item');
        var concernId = li && li.dataset.concernId;
        if (!concernId) return;
        deleteConcern(taskId, concernId);
      });
    });

    card.querySelectorAll('.btn-new-subtask').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector('.new-subtask-block');
        if (block) {
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
          if (!block.classList.contains('task-block-collapsed')) {
            var assignedIn = card.querySelector('.new-subtask-assigned-in');
            if (assignedIn && !assignedIn.value) assignedIn.value = new Date().toISOString().slice(0, 10);
          }
        }
        refreshEditorSessionPanelsFromDom();
      });
    });
    card.querySelectorAll('.add-subtask-submit-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cardEl = btn.closest('.task-card');
        var taskIdEl = cardEl && cardEl.dataset.id;
        var titleIn = cardEl && cardEl.querySelector('.new-subtask-title-in');
        var descIn = cardEl && cardEl.querySelector('.new-subtask-desc-in');
        var priorityIn = cardEl && cardEl.querySelector('.new-subtask-priority-in');
        var assignedIn = cardEl && cardEl.querySelector('.new-subtask-assigned-in');
        var effortIn = cardEl && cardEl.querySelector('.new-subtask-effort-in');
        var title = (titleIn && titleIn.value || '').trim();
        if (!title) return;
        var today = new Date().toISOString().slice(0, 10);
        var priority = priorityIn ? (Math.min(10, Math.max(1, parseInt(priorityIn.value, 10) || 1))) : 1;
        var assigned_date = (assignedIn && assignedIn.value) ? assignedIn.value : today;
        var effort_required_hours = effortIn != null ? (parseFloat(effortIn.value) || 0) : 0;
        var subCatWrap = cardEl.querySelector('.new-subtask-block .category-dropdown-wrap');
        var subCategories = subCatWrap ? getSelectedCategoriesFromWrap(subCatWrap) : [];
        var subProjEl = cardEl.querySelector('.new-subtask-block .task-project-select');
        var subProject = subProjEl && subProjEl.value ? subProjEl.value.trim() : '';
        var subDiffEl = cardEl.querySelector('.new-subtask-block .task-difficulty-select');
        addSubtask(taskIdEl, {
          title: title,
          description: (descIn && descIn.value) ? descIn.value : '',
          priority: priority,
          difficulty: subDiffEl ? subDiffEl.value : DEFAULT_TASK_DIFFICULTY,
          assigned_date: assigned_date,
          effort_required_hours: effort_required_hours,
          categories: subCategories,
          project: subProject
        });
        delete state.editorDrafts.newSubtask[taskIdEl];
        persistEditorSessionToStorage();
        if (titleIn) titleIn.value = '';
        if (descIn) descIn.value = '';
        if (priorityIn) priorityIn.value = '1';
        if (assignedIn) assignedIn.value = today;
        if (effortIn) effortIn.value = '0';
        if (subDiffEl) subDiffEl.value = DEFAULT_TASK_DIFFICULTY;
      });
    });

    card.querySelectorAll('.subtask-filter-wrap').forEach(function (wrap) {
      var taskId = wrap.dataset.taskId;
      var btn = wrap.querySelector('.filter-dropdown-btn');
      var opts = wrap.querySelectorAll('.filter-option');
      if (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          wrap.classList.toggle('open');
        });
      }
      opts.forEach(function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          state.subtaskSortByTaskId[taskId] = { by: opt.dataset.sortBy, dir: opt.dataset.sortDir };
          renderList();
          wrap.classList.remove('open');
        });
      });
    });

    card.querySelectorAll('.subtask-viewtype-wrap').forEach(function (wrap) {
      var taskIdVis = wrap.dataset.taskId;
      var btnV = wrap.querySelector('.filter-dropdown-btn');
      var menu = wrap.querySelector('.filter-dropdown-menu');
      if (btnV) {
        btnV.addEventListener('click', function (e) {
          e.stopPropagation();
          wrap.classList.toggle('open');
        });
      }
      if (menu) {
        menu.addEventListener('click', function (e) { e.stopPropagation(); });
      }
      wrap.querySelectorAll('.subtask-vis-cb').forEach(function (cb) {
        cb.addEventListener('change', function (e) {
          e.stopPropagation();
          if (!state.data.settings.subtaskVisibilityByTaskId) state.data.settings.subtaskVisibilityByTaskId = {};
          var keys = ['Open', 'Ongoing', 'Done', 'Dropped'];
          var next = {};
          keys.forEach(function (k) {
            var box = wrap.querySelector('.subtask-vis-cb[data-vis-key="' + k + '"]');
            next[k] = box ? !!box.checked : true;
          });
          state.data.settings.subtaskVisibilityByTaskId[taskIdVis] = next;
          save().then(function () { renderList(); });
          wrap.classList.remove('open');
        });
      });
    });

    card.querySelectorAll('.subtask-viewport-prev').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var tid = btn.getAttribute('data-task-id');
        var task = state.data.tasks.find(function (t) { return t.id === tid; });
        if (!task) return;
        var vp = getSubtaskViewportForTask(tid);
        var nextStart = Math.max(0, vp.startIndex - vp.pageSize);
        setSubtaskViewportForTask(tid, { startIndex: nextStart });
        save().then(function () { renderList(); });
      });
    });
    card.querySelectorAll('.subtask-viewport-next').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var tid = btn.getAttribute('data-task-id');
        var task = state.data.tasks.find(function (t) { return t.id === tid; });
        if (!task) return;
        var filtered = getFilteredSubtasksForTask(task);
        var vp = getSubtaskViewportForTask(tid);
        var maxStart = Math.max(0, filtered.length - vp.pageSize);
        var nextStart = Math.min(maxStart, vp.startIndex + vp.pageSize);
        setSubtaskViewportForTask(tid, { startIndex: nextStart });
        save().then(function () { renderList(); });
      });
    });
    card.querySelectorAll('.subtask-viewport-page-size').forEach(function (sel) {
      sel.addEventListener('click', function (e) { e.stopPropagation(); });
      sel.addEventListener('change', function (e) {
        e.stopPropagation();
        var tid = sel.getAttribute('data-task-id');
        var ps = parseInt(sel.value, 10);
        if (isNaN(ps) || ps < 1) return;
        ps = Math.min(50, Math.max(1, ps));
        setSubtaskViewportForTask(tid, { pageSize: ps, startIndex: 0 });
        save().then(function () { renderList(); });
      });
    });

    card.querySelectorAll('.category-dropdown-wrap').forEach(function (w) {
      bindCategoryDropdownInWrap(w);
    });

    bindRichFormatToolbars(card);
  }

  function isTaskCompleted(task) {
    var s = task.status || 'Open';
    return s === 'Done' || s === 'Completed' || s === 'Dropped' || s === 'Closed';
  }

  function taskHasProgressOnDate(task, dateStr) {
    var found = (task.progress_updates || []).some(function (p) { return p.date_added === dateStr; });
    if (found) return true;
    return (task.subtasks || []).some(function (s) {
      return (s.progress_updates || []).some(function (p) { return p.date_added === dateStr; });
    });
  }

  function getYesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function purgeEditorDraftsForTask(taskId) {
    if (!taskId) return;
    delete state.editorDrafts.tasks[taskId];
    delete state.editorDrafts.newSubtask[taskId];
    var pref = taskId + ':';
    Object.keys(state.editorDrafts.subtasks).forEach(function (k) {
      if (k.slice(0, pref.length) === pref) delete state.editorDrafts.subtasks[k];
    });
    purgeEditorPanelStateForTask(taskId);
    persistEditorSessionToStorage();
  }

  function purgeEditorDraftForSubtask(taskId, subtaskId) {
    if (!taskId || !subtaskId) return;
    delete state.editorDrafts.subtasks[taskId + ':' + subtaskId];
    purgeEditorPanelStateForSubtask(taskId, subtaskId);
    persistEditorSessionToStorage();
  }

  function pruneTaskDraftProgressFields(taskId) {
    var t = state.editorDrafts.tasks[taskId];
    if (!t) return;
    delete t.progressText;
    delete t.progressDate;
    delete t.progressEffort;
    delete t.progressCategories;
  }

  function pruneSubtaskDraftProgressFields(taskId, subId) {
    var t = state.editorDrafts.subtasks[taskId + ':' + subId];
    if (!t) return;
    delete t.progressText;
    delete t.progressDate;
    delete t.progressEffort;
    delete t.progressCategories;
  }

  function captureTaskListEditorDrafts() {
    var drafts = state.editorDrafts;
    document.querySelectorAll('#task-list .task-card, #completed-task-list .task-card').forEach(function (card) {
      var taskId = card.dataset.id;
      if (!taskId) return;
      var body = card.querySelector(':scope > .task-body');
      if (!body) return;

      var d = {};
      var titleEl = card.querySelector('.task-detail-title');
      var priorityEl = card.querySelector('.task-detail-priority');
      var tagsEl = card.querySelector('.task-detail-tags');
      var assignedEl = card.querySelector('.task-detail-assigned');
      var etaEl = card.querySelector('.task-detail-eta');
      var effortEl = card.querySelector('.task-detail-effort');
      var bugsEl = card.querySelector('.task-detail-bugs');
      var catWrap = card.querySelector('.task-details-block .category-dropdown-wrap');
      var projEl = card.querySelector('.task-details-block .task-project-select');
      var diffEl = card.querySelector('.task-details-block .task-difficulty-select');
      if (titleEl) d.title = titleEl.value;
      if (priorityEl) d.priority = priorityEl.value;
      if (tagsEl) d.tags = tagsEl.value;
      if (assignedEl) d.assigned_date = assignedEl.value;
      if (etaEl) d.eta = etaEl.value;
      if (effortEl) d.effort = effortEl.value;
      if (bugsEl) d.bugs = bugsEl.value;
      if (diffEl) d.difficulty = diffEl.value;
      if (projEl) d.project = projEl.value;
      if (catWrap) d.categories = getSelectedCategoriesFromWrap(catWrap);

      var descEdit = card.querySelector(':scope > .task-body .task-description-edit:not(.subtask-desc-edit)');
      if (descEdit) {
        d.description = descEdit.value;
        d.descEditing = !descEdit.classList.contains('hidden');
      }

      function readCheckbox(sel, key) {
        var inp = card.querySelector(sel);
        if (inp) d[key] = !!inp.checked;
      }
      readCheckbox('.task-exclude-summary', 'exclude_from_summary');
      readCheckbox('.task-exclude-export', 'exclude_from_export');
      readCheckbox('.task-no-effort-needed', 'no_effort_needed');
      readCheckbox('.task-archive-check', 'archived');

      var etaUpIn = card.querySelector('.task-update-eta-in');
      var effortUpIn = card.querySelector('.task-update-effort-in');
      if (etaUpIn) d.etaUpdateInput = etaUpIn.value;
      if (effortUpIn) d.effortUpdateInput = effortUpIn.value;

      var pt = card.querySelector(':scope > .task-body .progress-add .progress-text-in');
      var pd = card.querySelector(':scope > .task-body .progress-add .progress-date-in');
      var pe = card.querySelector(':scope > .task-body .progress-add .progress-effort-in');
      var pc = card.querySelector(':scope > .task-body .progress-add .category-dropdown-wrap');
      if (pt && pt.value) d.progressText = pt.value;
      if (pd && pd.value) d.progressDate = pd.value;
      if (pe && pe.value) d.progressEffort = pe.value;
      if (pc) d.progressCategories = getSelectedCategoriesFromWrap(pc);

      drafts.tasks[taskId] = d;

      card.querySelectorAll(':scope .subtask-card').forEach(function (subCard) {
        var sid = subCard.dataset.subtaskId;
        var tid = subCard.dataset.taskId;
        if (!sid || tid !== taskId) return;
        var subBody = subCard.querySelector('.subtask-body');
        if (!subBody) return;
        var sd = {};
        var st = subCard.querySelector('.subtask-detail-title');
        var sp = subCard.querySelector('.subtask-detail-priority');
        var sa = subCard.querySelector('.subtask-detail-assigned');
        var se = subCard.querySelector('.subtask-detail-eta');
        var sf = subCard.querySelector('.subtask-detail-effort');
        var scw = subCard.querySelector('.subtask-details-block .category-dropdown-wrap');
        var spe = subCard.querySelector('.subtask-details-block .task-project-select');
        var sdiff = subCard.querySelector('.subtask-details-block .task-difficulty-select');
        if (st) sd.title = st.value;
        if (sp) sd.priority = sp.value;
        if (sa) sd.assigned_date = sa.value;
        if (se) sd.eta = se.value;
        if (sf) sd.effort = sf.value;
        if (sdiff) sd.difficulty = sdiff.value;
        if (spe) sd.project = spe.value;
        if (scw) sd.categories = getSelectedCategoriesFromWrap(scw);
        var sdesc = subCard.querySelector('.subtask-desc-edit');
        if (sdesc) {
          sd.description = sdesc.value;
          sd.subDescEditing = !sdesc.classList.contains('hidden');
        }
        var sex = subCard.querySelector('.subtask-exclude-summary');
        var see = subCard.querySelector('.subtask-exclude-export');
        var sne = subCard.querySelector('.subtask-no-effort-needed');
        if (sex) sd.exclude_from_summary = !!sex.checked;
        if (see) sd.exclude_from_export = !!see.checked;
        if (sne) sd.no_effort_needed = !!sne.checked;
        var spt = subCard.querySelector('.subtask-progress-text');
        var spd = subCard.querySelector('.subtask-progress-date');
        var spef = subCard.querySelector('.subtask-progress-effort');
        var spc = subCard.querySelector('.progress-add .category-dropdown-wrap');
        if (spt && spt.value) sd.progressText = spt.value;
        if (spd && spd.value) sd.progressDate = spd.value;
        if (spef && spef.value) sd.progressEffort = spef.value;
        if (spc) sd.progressCategories = getSelectedCategoriesFromWrap(spc);
        drafts.subtasks[tid + ':' + sid] = sd;
      });

      var nt = {};
      var nTitle = card.querySelector('.new-subtask-title-in');
      var nDesc = card.querySelector('.new-subtask-desc-in');
      var nPri = card.querySelector('.new-subtask-priority-in');
      var nAsg = card.querySelector('.new-subtask-assigned-in');
      var nEff = card.querySelector('.new-subtask-effort-in');
      var nDiff = card.querySelector('.new-subtask-block .task-difficulty-select');
      var nCat = card.querySelector('.new-subtask-block .category-dropdown-wrap');
      var nProj = card.querySelector('.new-subtask-block .task-project-select');
      if (nTitle) nt.title = nTitle.value;
      if (nDesc) nt.description = nDesc.value;
      if (nPri) nt.priority = nPri.value;
      if (nAsg) nt.assigned = nAsg.value;
      if (nEff) nt.effort = nEff.value;
      if (nDiff) nt.difficulty = nDiff.value;
      if (nProj) nt.project = nProj.value;
      if (nCat) nt.categories = getSelectedCategoriesFromWrap(nCat);
      var ntHas = nt.title || nt.description || (nt.priority && nt.priority !== '1') || nt.assigned || nt.effort ||
        nt.difficulty || (nt.project && String(nt.project).trim()) || (nt.categories && nt.categories.length);
      if (ntHas) drafts.newSubtask[taskId] = nt;
      else delete drafts.newSubtask[taskId];
    });
    captureEditorPanelStateFromDom();
    persistEditorSessionToStorage();
  }

  function renderList() {
    captureTaskListEditorDrafts();
    var tasks = getTasks();
    var filter = state.listFilter || 'all';
    var addSection = document.querySelector('.add-new-task-section');
    var completedSection = document.querySelector('.completed-tasks-section');
    var separators = document.querySelectorAll('#view-list > .add-task-separator');
    var headingRow = document.querySelector('.main-tasks-heading-row');
    var headingEl = document.querySelector('.main-tasks-heading');

    document.querySelectorAll('.list-view-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-list-filter') === filter);
    });

    if (filter === 'today' || filter === 'yesterday') {
      var targetDate = filter === 'today' ? new Date().toISOString().slice(0, 10) : getYesterdayStr();
      var label = filter === 'today' ? 'Today' : 'Yesterday';
      var matched = sortMainTasks(tasks.filter(function (t) { return taskHasProgressOnDate(t, targetDate); }));
      if (headingEl) headingEl.textContent = label + '\'s Progress (' + matched.length + ')';
      taskListEl.innerHTML = matched.length
        ? matched.map(renderTaskCard).join('')
        : '<p class="empty-state">No progress entries for ' + label.toLowerCase() + '.</p>';
      taskListEl.querySelectorAll('.task-card').forEach(bindTaskCardEvents);
      if (addSection) addSection.style.display = 'none';
      if (completedSection) completedSection.style.display = 'none';
      separators.forEach(function (s) { s.style.display = 'none'; });
      if (headingRow) headingRow.style.display = '';
    } else if (filter === 'archive') {
      var archived = sortMainTasks(tasks.filter(function (t) { return !!t.archived; }));
      if (headingEl) headingEl.textContent = 'Archived Tasks (' + archived.length + ')';
      taskListEl.innerHTML = archived.length
        ? archived.map(renderTaskCard).join('')
        : '<p class="empty-state">No archived tasks.</p>';
      taskListEl.querySelectorAll('.task-card').forEach(bindTaskCardEvents);
      if (addSection) addSection.style.display = 'none';
      if (completedSection) completedSection.style.display = 'none';
      separators.forEach(function (s) { s.style.display = 'none'; });
      if (headingRow) headingRow.style.display = '';
    } else {
      var active = tasks.filter(function (t) { return !isTaskCompleted(t) && !t.archived; });
      var completed = tasks.filter(function (t) { return isTaskCompleted(t) && !t.archived; });
      var sortedActive = sortMainTasks(active);
      var sortedCompleted = sortMainTasks(completed);
      if (headingEl) headingEl.textContent = 'Main Tasks List';
      taskListEl.innerHTML = sortedActive.length
        ? sortedActive.map(renderTaskCard).join('')
        : '<p class="empty-state">No tasks yet. Add one above.</p>';
      taskListEl.querySelectorAll('.task-card').forEach(bindTaskCardEvents);
      if (completedTaskListEl) {
        completedTaskListEl.innerHTML = sortedCompleted.length
          ? sortedCompleted.map(renderTaskCard).join('')
          : '<p class="empty-state">No done tasks.</p>';
        completedTaskListEl.querySelectorAll('.task-card').forEach(bindTaskCardEvents);
      }
      if (addSection) addSection.style.display = '';
      if (completedSection) completedSection.style.display = '';
      separators.forEach(function (s) { s.style.display = ''; });
      if (headingRow) headingRow.style.display = '';
    }
  }

  function syncDayOffBrowseUi() {
    var modeSel = $('calendar-dayoff-view-mode');
    var nav = $('calendar-dayoff-nav');
    var labelEl = $('calendar-dayoff-period-label');
    var mode = state.dayOffBrowseMode || 'all';
    if (modeSel) modeSel.value = mode;
    if (nav) {
      if (mode === 'month' || mode === 'year') {
        nav.hidden = false;
      } else {
        nav.hidden = true;
      }
    }
    if (labelEl) {
      if (mode === 'month') {
        var ym = state.dayOffBrowseYM || state.calendarFocusDate.slice(0, 7);
        var parts = ym.split('-');
        if (parts.length >= 2) {
          var md = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
          labelEl.textContent = md.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else labelEl.textContent = '';
      } else if (mode === 'year') {
        labelEl.textContent = String(state.dayOffBrowseYear != null ? state.dayOffBrowseYear : new Date().getFullYear());
      } else {
        labelEl.textContent = '';
      }
    }
  }

  function shiftDayOffBrowseMonth(delta) {
    var ym = state.dayOffBrowseYM || state.calendarFocusDate.slice(0, 7);
    var p = ym.split('-');
    var y = parseInt(p[0], 10);
    var m = parseInt(p[1], 10) - 1;
    if (isNaN(y) || isNaN(m)) {
      var now = new Date();
      y = now.getFullYear();
      m = now.getMonth();
    }
    var d = new Date(y, m + delta, 1);
    state.dayOffBrowseYM = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function shiftDayOffBrowseYear(delta) {
    var y = state.dayOffBrowseYear;
    if (y == null || isNaN(y)) {
      y = parseInt(state.calendarFocusDate.slice(0, 4), 10);
      if (isNaN(y)) y = new Date().getFullYear();
    }
    state.dayOffBrowseYear = y + delta;
  }

  function refreshCalendarDayOffList() {
    var ul = $('calendar-dayoff-list');
    if (!ul) return;
    syncDayOffBrowseUi();
    var raw = getSettings().dayOffs || [];
    if (!raw.length) {
      ul.innerHTML = '<li class="muted">No day offs logged.</li>';
      return;
    }
    var mode = state.dayOffBrowseMode || 'all';
    var filtered = raw.slice();
    if (mode === 'month') {
      var ym = state.dayOffBrowseYM || state.calendarFocusDate.slice(0, 7);
      filtered = filtered.filter(function (o) { return o && o.date && o.date.slice(0, 7) === ym; });
    } else if (mode === 'year') {
      var yy = String(state.dayOffBrowseYear != null ? state.dayOffBrowseYear : parseInt(state.calendarFocusDate.slice(0, 4), 10));
      filtered = filtered.filter(function (o) { return o && o.date && o.date.slice(0, 4) === yy; });
    }
    filtered.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    if (!filtered.length) {
      ul.innerHTML = '<li class="muted">No day offs in this period.</li>';
      return;
    }
    ul.innerHTML = filtered.map(function (o) {
      var typ = (o.type === 'full' || o.type === 'Full') ? 'Full day' : ('Partial · ' + (o.hoursOff != null ? o.hoursOff + 'h off' : ''));
      var wd = weekdayShortFromYMD(o.date);
      var dateBit = escapeHtml(o.date);
      if (wd) dateBit = escapeHtml(wd) + ' · ' + dateBit;
      return '<li class="calendar-dayoff-item"><span class="calendar-dayoff-item-text">' +
        dateBit + ' · ' + escapeHtml(o.reason || 'Other') + ' · ' + escapeHtml(typ) +
        '</span> <button type="button" class="btn-small calendar-dayoff-remove" data-dayoff-id="' + escapeHtml(o.id) + '">Remove</button></li>';
    }).join('');
  }

  function renderCalendar() {
    refreshCalendarDayOffList();
    var view = state.calendarView || 'month';
    var chartStyle = state.calendarChartStyle || 'basic';
    document.querySelectorAll('.calendar-view-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.calendarView === view);
    });
    document.querySelectorAll('.calendar-chart-style-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.chartStyle === chartStyle);
    });
    var filterRow = document.getElementById('calendar-filter-row');
    if (filterRow) filterRow.style.display = chartStyle === 'gantt' ? 'none' : '';

    var viewCalPanel = document.getElementById('view-calendar');
    if (viewCalPanel) viewCalPanel.classList.toggle('calendar-basic-fill', chartStyle === 'basic');

    var tasks = getTasks();
    var focus = state.calendarFocusDate || new Date().toISOString().slice(0, 10);
    var periodLabelEl = document.getElementById('calendar-period-label');
    var gotoInput = document.getElementById('calendar-goto-date');
    if (gotoInput) gotoInput.value = focus;

    if (chartStyle === 'gantt' && (view === 'week' || view === 'month')) {
      var dates = view === 'week' ? getWeekDates(focus) : getMonthDates(focus);
      var firstDate = dates[0];
      var lastDate = dates[dates.length - 1];
      var tasksWithRange = tasks.filter(function (t) {
        var start = t.assigned_date || (t.created_at && t.created_at.slice(0, 10));
        if (!start) return false;
        var end = t.eta || start;
        if (end < start) end = start;
        return end >= firstDate && start <= lastDate;
      });
      var title = view === 'week' ? getWeekLabel(focus) : getMonthLabel(focus);
      if (periodLabelEl) periodLabelEl.textContent = title;
      var todayYMD = new Date().toISOString().slice(0, 10);
      var headerHtml = dates.map(function (ymd, i) {
        var fmt = formatCalendarDate(ymd);
        var todayClass = ymd === todayYMD ? ' gantt-date-cell-today' : '';
        var weekendClass = isWeekendYMD(ymd) ? ' gantt-date-cell-weekend' : '';
        var off = getDayOffForDate(ymd);
        var offClass = '';
        if (off && (off.type === 'full' || off.type === 'Full')) offClass = ' gantt-date-cell-off-full';
        else if (off && (off.type === 'partial' || off.type === 'Partial')) offClass = ' gantt-date-cell-off-partial';
        var offLine = off
          ? '<span class="gantt-date-off">' + escapeHtml(off.reason || 'Off') + ' · ' + ((off.type === 'full' || off.type === 'Full') ? 'Full' : 'Partial') + '</span>'
          : '';
        return '<div class="gantt-date-cell' + todayClass + weekendClass + offClass + '" style="grid-column: ' + (i + 1) + '; grid-row: 1;" data-date="' + escapeHtml(ymd) + '">' +
          '<span class="gantt-date-name">' + escapeHtml(fmt.dayName) + '</span>' +
          '<span class="gantt-date-full">' + escapeHtml(fmt.dateMonthYear) + '</span>' + offLine + '</div>';
      }).join('');
      var rowHtml = '';
      tasksWithRange.forEach(function (t, idx) {
        var startYMD = t.assigned_date || (t.created_at && t.created_at.slice(0, 10)) || firstDate;
        var endYMD = t.eta || startYMD;
        if (endYMD < startYMD) endYMD = startYMD;
        var startIdx = dates.indexOf(startYMD);
        var endIdx = dates.indexOf(endYMD);
        if (startIdx === -1 && startYMD < firstDate) startIdx = 0;
        if (startIdx === -1) startIdx = 0;
        if (endIdx === -1 && endYMD > lastDate) endIdx = dates.length - 1;
        if (endIdx === -1) endIdx = dates.length - 1;
        if (startIdx > dates.length - 1) startIdx = dates.length - 1;
        if (endIdx < 0) endIdx = 0;
        if (startIdx > endIdx) { var tmp = startIdx; startIdx = endIdx; endIdx = tmp; }
        var colStart = startIdx + 1;
        var colEnd = endIdx + 2;
        var statusClass = (t.status || '').toLowerCase().replace(/\s/g, '-');
        var barRow = idx * 2 + 2;
        var dropRow = idx * 2 + 3;
        var effortReq = t.effort_required_hours != null && t.effort_required_hours !== '' ? t.effort_required_hours : 0;
        var effortSpent = taskEffortSpent(t);
        var subtasks = t.subtasks || [];
        var subtaskListHtml = subtasks.length
          ? '<ul class="gantt-dropdown-subtask-list">' + subtasks.map(function (s) {
              var sStatus = (s.status || 'Open').toLowerCase().replace(/\s/g, '-');
              return '<li class="gantt-dropdown-subtask-item"><span class="task-status-pill ' + sStatus + '">' + escapeHtml(s.status || 'Open') + '</span> ' + escapeHtml(s.title || '') + '</li>';
            }).join('') + '</ul>'
          : '<p class="gantt-dropdown-no-subtasks">No subtasks</p>';
        var dropContent = '<div class="gantt-task-dropdown-inner">' +
          '<div class="gantt-dropdown-summary">' +
          '<span class="gantt-dropdown-label">Status</span><span class="task-status-pill ' + statusClass + '">' + escapeHtml((t.status === 'Completed' ? 'Done' : t.status) || 'Open') + '</span>' +
          '<span class="gantt-dropdown-label">Difficulty</span><span class="gantt-dropdown-value">' + escapeHtml(normalizeTaskDifficulty(t.difficulty)) + '</span>' +
          '<span class="gantt-dropdown-label">Effort</span><span class="gantt-dropdown-value">' + effortReq + ' hrs</span>' +
          '<span class="gantt-dropdown-label">Spent</span><span class="gantt-dropdown-value">' + effortSpent + ' hrs</span>' +
          '</div>' +
          '<div class="gantt-dropdown-subtasks"><span class="gantt-dropdown-subtitle">Subtasks</span>' + subtaskListHtml + '</div>' +
          '</div>';
        rowHtml += '<div class="gantt-task-bar ' + statusClass + ' gantt-task-bar-toggle" style="grid-column: ' + colStart + ' / ' + colEnd + '; grid-row: ' + barRow + ';" title="' + escapeAttr(t.title || '') + '" data-task-id="' + escapeAttr(t.id) + '">' +
          '<span class="gantt-task-bar-chevron" aria-hidden="true"></span><span class="gantt-task-bar-title">' + escapeHtml(t.title || '') + '</span></div>';
        rowHtml += '<div class="gantt-task-dropdown" style="grid-column: 1 / -1; grid-row: ' + dropRow + ';" data-task-id="' + escapeAttr(t.id) + '">' + dropContent + '</div>';
      });
      var n = dates.length;
      var taskRowCount = tasksWithRange.length;
      var isWeekGantt = view === 'week';
      // Use auto-sized rows so the Gantt grid height grows with content
      // and lets the calendar container provide vertical scrolling.
      var rowDef = taskRowCount > 0
        ? 'auto repeat(' + taskRowCount + ', 2.5em minmax(0, auto)) auto'
        : 'auto auto';
      var colWidthPx = 121;
      var weekendOverlay = buildGanttDayColumnOverlay(dates, isWeekGantt, colWidthPx);
      var stripeGrad = 'repeating-linear-gradient(to right, transparent 0, transparent calc(var(--gantt-col-width) - 2px), rgba(255, 255, 255, 0.06) calc(var(--gantt-col-width) - 1px), transparent var(--gantt-col-width))';
      var gridStyle = isWeekGantt
        ? 'grid-template-columns: repeat(' + n + ', 1fr); grid-template-rows: ' + rowDef + '; --gantt-col-width: calc(100% / ' + n + '); background-image: ' + weekendOverlay + ', ' + stripeGrad + ';'
        : 'grid-template-columns: repeat(' + n + ', ' + colWidthPx + 'px); grid-template-rows: ' + rowDef + '; --gantt-col-width: ' + colWidthPx + 'px; min-width: ' + (n * colWidthPx) + 'px; background-image: ' + weekendOverlay + ', ' + stripeGrad + ';';
      var ganttGridClass = isWeekGantt ? 'gantt-grid gantt-grid-week' : 'gantt-grid gantt-grid-month';
      var fillerRow = taskRowCount * 2 + 2;
      var fillerHtml = '<div class="gantt-grid-filler" style="grid-column: 1 / -1; grid-row: ' + fillerRow + ';"></div>';
      var html = '<h3 class="calendar-title">' + escapeHtml(title) + '</h3>' +
        '<div class="' + ganttGridClass + '" style="' + gridStyle + '">' +
        headerHtml +
        rowHtml +
        fillerHtml +
        '</div>';
      if (tasksWithRange.length === 0) {
        html += '<p class="empty-state">No tasks in this period.</p>';
      }
      calendarContainer.innerHTML = html;
      return;
    }

    var key = state.calendarFilter === 'eta' ? 'eta' : 'assigned_date';
    var byDate = {};
    tasks.forEach(function (t) {
      var d = key === 'eta' ? (t.eta || t.assigned_date) : t.assigned_date;
      if (!d) return;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(t);
    });

    var todayYMD = new Date().toISOString().slice(0, 10);
    function renderDayCard(ymd) {
      var fmt = formatCalendarDate(ymd);
      var tasksOnDay = byDate[ymd] || [];
      var listHtml = tasksOnDay.length
        ? '<ul class="calendar-day-tasks">' + tasksOnDay.map(function (t) {
          return '<li><span class="task-status-pill ' + (t.status || '').toLowerCase() + '">' + escapeHtml(t.status) + '</span> ' + escapeHtml(t.title || '') + '</li>';
        }).join('') + '</ul>'
        : '<p class="calendar-day-empty">No tasks</p>';
      var todayClass = ymd === todayYMD ? ' calendar-day-today' : '';
      var weekendClass = isWeekendYMD(ymd) ? ' calendar-day-weekend' : '';
      var off = getDayOffForDate(ymd);
      var offClass = '';
      var offBadge = '';
      if (off) {
        if (off.type === 'full' || off.type === 'Full') offClass = ' calendar-day-off-full';
        else offClass = ' calendar-day-off-partial';
        offBadge = '<div class="calendar-day-off-badge">' + escapeHtml(off.reason || 'Off') + ' · ' +
          ((off.type === 'full' || off.type === 'Full') ? 'Full day' : ('Partial' + (off.hoursOff != null ? ' (' + off.hoursOff + 'h off)' : ''))) +
          '</div>';
      }
      return '<div class="calendar-day' + todayClass + weekendClass + offClass + '" data-date="' + escapeHtml(ymd) + '">' +
        '<div class="calendar-day-name">' + escapeHtml(fmt.dayName) + '</div>' +
        '<div class="calendar-day-date">' + escapeHtml(fmt.dateMonthYear) + '</div>' +
        offBadge +
        listHtml +
        '</div>';
    }

    var html = '';
    if (view === 'day') {
      if (periodLabelEl) periodLabelEl.textContent = formatCalendarDate(focus).dateMonthYear + ' (' + formatCalendarDate(focus).dayName + ')';
      html = '<div class="calendar-days calendar-view-day">' + renderDayCard(focus) + '</div>';
    } else if (view === 'week') {
      var weekDates = getWeekDates(focus);
      if (periodLabelEl) periodLabelEl.textContent = getWeekLabel(focus);
      html = '<h3 class="calendar-title">' + escapeHtml(getWeekLabel(focus)) + '</h3>' +
        '<div class="calendar-days calendar-view-week">';
      weekDates.forEach(function (ymd) {
        html += renderDayCard(ymd);
      });
      html += '</div>';
    } else {
      var monthDates = getMonthDates(focus);
      var firstDay = parseYMD(monthDates[0]);
      var startPad = firstDay ? (firstDay.getDay() + 6) % 7 : 0;
      if (periodLabelEl) periodLabelEl.textContent = getMonthLabel(focus);
      html = '<h3 class="calendar-title">' + escapeHtml(getMonthLabel(focus)) + '</h3>' +
        '<div class="calendar-days calendar-view-month">';
      for (var p = 0; p < startPad; p++) {
        html += '<div class="calendar-day calendar-day-empty-slot"></div>';
      }
      monthDates.forEach(function (ymd) {
        html += renderDayCard(ymd);
      });
      html += '</div>';
    }
    calendarContainer.innerHTML = html;
  }

  function renderSummary() {
    summaryOutput.innerHTML = '<p class="muted">Pick a date range and click "Generate Summary".</p>';
    if (exportSummaryBtn) exportSummaryBtn.disabled = !state.summaryGenerated;
  }

  /** Tasks / sub-tasks omitted from summary export (HTML file); excludes export flags and summary-only exclusions. */
  function tasksForExportWorkTable(taskList, from, to) {
    return (taskList || []).map(function (t) {
      if (isTruthyFlag(t.exclude_from_export)) return null;
      var subs = (t.subtasks || []).filter(function (s) {
        if (isTruthyFlag(s.exclude_from_summary) || isTruthyFlag(s.exclude_from_export)) return false;
        if (!wasOpenedByEndOfRange(s, to || from)) return false;
        if (wasCompletedOrDroppedBefore(s, from)) return false;
        return true;
      });
      return Object.assign({}, t, { subtasks: subs });
    }).filter(Boolean);
  }

  function buildSummaryExportHtmlParts(meta, opts) {
    opts = opts || {};
    var brief = !!opts.brief;
    var showProgressEntryHours = !!opts.showProgressEntryHours;
    var from = meta.from;
    var to = meta.to;
    var activeTasks = meta.activeTasks || [];
    var idleTasks = meta.idleTasks || [];
    var exportActiveTasks = tasksForExportWorkTable(activeTasks, from, to);
    var exportIdleTasks = tasksForExportWorkTable(idleTasks, from, to);
    var exportSettings = getSettings();
    var exportHpd = parseFloat(exportSettings.workingHoursPerDay);
    if (isNaN(exportHpd) || exportHpd <= 0) exportHpd = 8;

    function inRange(dateStr) {
      return dateStr && dateStr >= from && dateStr <= to;
    }
    function statusClass(s) {
      var v = (s || 'Open').toLowerCase();
      if (v === 'done' || v === 'completed') return 'done';
      if (v === 'ongoing') return 'ongoing';
      if (v === 'open') return 'open';
      if (v === 'dropped') return 'dropped';
      return 'other';
    }
    function statusBadge(s) {
      var label = s || 'Open';
      return '<span class="status-btn ' + statusClass(label) + '">' + escapeHtml(label) + '</span>';
    }
    function formatDateDMY(ymd) {
      if (!ymd || typeof ymd !== 'string') return '—';
      var m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return escapeHtml(ymd);
      return escapeHtml(m[3] + '-' + m[2] + '-' + m[1]);
    }
    function buildEtaCurrentHtml(taskLike) {
      var segs = [];
      function pushY(y) {
        if (!y || typeof y !== 'string') return;
        if (segs.indexOf(y) === -1) segs.push(y);
      }
      var planned = (taskLike.eta_updates && taskLike.eta_updates.length && taskLike.eta_updates[0].old_eta) || taskLike.assigned_date || taskLike.eta || '';
      if (planned) pushY(planned);
      (taskLike.eta_updates || []).slice().sort(function (a, b) {
        return (a.date_recorded || '').localeCompare(b.date_recorded || '');
      }).forEach(function (u) {
        if (u.old_eta) pushY(u.old_eta);
        if (u.new_eta) pushY(u.new_eta);
      });
      if (taskLike.eta) pushY(taskLike.eta);
      if (!segs.length) return '—';
      var out = '<span class="export-eta-stack-line">' + formatDateDMY(segs[0]) + '</span>';
      for (var ei = 1; ei < segs.length; ei++) {
        var cmp = compareDateStr(segs[ei - 1], segs[ei]);
        var ecls = cmp < 0 ? 'export-eta-slip' : (cmp > 0 ? 'export-eta-pullin' : 'export-eta-neutral');
        out += '<br><span class="export-eta-stack-line ' + ecls + '">-&gt; ' + formatDateDMY(segs[ei]) + '</span>';
      }
      return '<span class="export-eta-stack">' + out + '</span>';
    }
    function formatEffortExportNum(n) {
      var x = Number(n);
      if (isNaN(x)) return '0';
      if (Math.abs(x - Math.round(x)) < 0.001) return String(Math.round(x));
      var t = Math.round(x * 10) / 10;
      return String(t).replace(/\.0$/, '');
    }
    function buildPlannedEffortHtml(taskLike) {
      var updates = (taskLike.effort_updates || []).slice().sort(function (a, b) {
        return (a.date_recorded || '').localeCompare(b.date_recorded || '');
      });
      var segs = [];
      function pushN(n) {
        if (n == null || n === '') return;
        var num = typeof n === 'number' ? n : parseFloat(n);
        if (isNaN(num)) return;
        if (segs.length && Math.abs(segs[segs.length - 1] - num) < 0.0001) return;
        segs.push(num);
      }
      if (updates.length) {
        pushN(updates[0].old_effort_hours);
        updates.forEach(function (u) {
          pushN(u.new_effort_hours);
        });
      } else {
        var req = taskLike.effort_required_hours;
        if (req != null && req !== '') pushN(req);
      }
      if (!segs.length) return '—';
      var html = '<span class="export-effort-stack-line">' + escapeHtml(formatEffortExportNum(segs[0])) + '</span>';
      for (var hi = 1; hi < segs.length; hi++) {
        var prevH = segs[hi - 1];
        var curH = segs[hi];
        var hcmp = curH > prevH ? 1 : (curH < prevH ? -1 : 0);
        var hcls = hcmp > 0 ? 'export-effort-increase' : (hcmp < 0 ? 'export-effort-decrease' : 'export-effort-same');
        html += '<br><span class="export-effort-stack-line ' + hcls + '">-&gt; ' + escapeHtml(formatEffortExportNum(segs[hi])) + '</span>';
      }
      return '<span class="export-effort-stack">' + html + '</span>';
    }
    function progressSummaryHtml(updates) {
      if (!updates || !updates.length) return '<span class="muted">No progress made.</span>';
      var ordered = sortProgressUpdatesOldestFirst(updates);
      var blocks = ordered.map(function (p, i) {
        var numCell = '<span class="export-progress-num-cell">' + escapeHtml(String(i + 1) + '.') + '</span>';
        var catsArr = progressUpdateCategoriesArray(p);
        var hasCats = catsArr.some(function (c) { return String(c || '').trim(); });
        var pills = summaryProgressCategoryPillsHtml(catsArr, 'export-progress-category-pill');
        var body = formatProgressSummaryTextHtml((p.text || '').trim(), 5000);
        var effort = showProgressEntryHours ? summaryProgressEffortHtml(p, 'export-progress-effort') : '';
        var headParts = [];
        if (hasCats && pills) headParts.push(pills);
        if (effort) headParts.push(effort);
        var headHtml = headParts.length
          ? '<div class="export-progress-head">' + headParts.join('') + '</div>'
          : '';
        var textHtml = body
          ? '<div class="export-progress-text">' + body + '</div>'
          : '<div class="export-progress-text"><span class="muted">No note</span></div>';
        return '<div class="export-progress-item">' + numCell +
          '<div class="export-progress-content">' + headHtml + textHtml + '</div></div>';
      });
      return blocks.join('');
    }
    function taskDetailsHtml(desc) {
      if (!desc || !String(desc).trim()) return '—';
      return formatRichDescription(String(desc).trim());
    }
    function exportProgressConcernsHtml(concerns) {
      var filtered = filterConcernsForRange(concerns, from, to);
      var out = [];
      filtered.forEach(function (c) {
        var addressedInRange = isConcernAddressedInRange(c, from, to);
        var cls = addressedInRange ? 'concern-addressed' : 'concern-open';
        out.push('<div class="' + cls + '">' + formatRichDescription(c.description || '') + (addressedInRange && c.addressed_comment ? ' (' + formatRichDescription(c.addressed_comment) + ')' : '') + '</div>');
      });
      return out.length ? out.join('') : '<span class="muted">None</span>';
    }
    /** `isIdleNoProgressTable`: Tasks with No Progress export — no Progress block; concerns-only with "Concerns: None" when empty. */
    function progressCellHtml(updates, concerns, isIdleNoProgressTable) {
      concerns = concerns || [];
      if (isIdleNoProgressTable) {
        if (concerns.length) {
          return '<div class="export-progress-wrap">' +
            '<div class="export-p-label">Concerns:</div><div class="export-c-body">' + exportProgressConcernsHtml(concerns) + '</div></div>';
        }
        return '<div class="export-progress-wrap"><div class="export-c-body"><span class="muted"><strong>Concerns</strong>: None</span></div></div>';
      }
      return '<div class="export-progress-wrap">' +
        '<div class="export-p-label">Progress:</div><div class="export-p-body">' + progressSummaryHtml(updates) + '</div>' +
        '<div class="export-p-label export-p-label-gap">Concerns:</div><div class="export-c-body">' + exportProgressConcernsHtml(concerns) + '</div></div>';
    }
    function formatExportDays(d) {
      if (d == null || isNaN(d) || d < 0.001) return '0';
      var rounded = Math.round(d);
      if (Math.abs(d - rounded) < 0.08) {
        return rounded === 1 ? '1 Days' : (rounded + ' Days');
      }
      return '~' + d.toFixed(1).replace(/\.0$/, '') + ' Days';
    }
    var projectHours = {};
    function addProjHours(proj, hrs) {
      var h = Number(hrs) || 0;
      if (h < 0.001) return;
      var k = (proj != null && String(proj).trim()) ? String(proj).trim() : 'Miscellaneous';
      projectHours[k] = (projectHours[k] || 0) + h;
    }
    exportActiveTasks.forEach(function (t) {
      addProjHours(t.project, taskEffortInRangeMainAttributed(t, from, to));
      (t.subtasks || []).forEach(function (s) {
        if (!subtaskHasDedicatedEffort(s)) return;
        var su = (s.progress_updates || []).filter(function (p) { return inRange(p.date_added); });
        var sh = su.reduce(function (sum, p) { return sum + (Number(p.effort_consumed_hours) || 0); }, 0);
        addProjHours(s.project, sh);
      });
    });

    function oooEntryDayEquivalent(off) {
      if (!off) return 0;
      var typ = (off.type || '').toLowerCase();
      if (typ === 'full') return 1;
      var hOff = parseFloat(off.hoursOff);
      if (isNaN(hOff)) hOff = 0;
      hOff = Math.min(Math.max(0, hOff), exportHpd);
      return hOff / exportHpd;
    }

    var ptoAgg = 0;
    var sickAgg = 0;
    var otherAgg = 0;
    var oooEntriesInRange = [];
    (exportSettings.dayOffs || []).forEach(function (off) {
      if (!off || !off.date || off.date < from || off.date > to) return;
      var eq = oooEntryDayEquivalent(off);
      var reason = off.reason || 'Other';
      if (reason === 'PTO') ptoAgg += eq;
      else if (reason === 'Sick') sickAgg += eq;
      else otherAgg += eq;
      oooEntriesInRange.push({
        date: off.date,
        reason: reason,
        type: off.type,
        hoursOff: off.hoursOff
      });
    });
    oooEntriesInRange.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    var oooDaysTotal = ptoAgg + sickAgg + otherAgg;

    var miscHours = projectHours.Miscellaneous || 0;
    var projKeys = Object.keys(projectHours).filter(function (k) { return k !== 'Miscellaneous'; }).sort(function (a, b) { return a.localeCompare(b); });
    var bwRowsHtml = projKeys.map(function (k) {
      var d = projectHours[k] / exportHpd;
      return '<tr><td>' + escapeHtml(k) + '</td><td class="export-td-num">' + formatExportDays(d) + '</td></tr>';
    }).join('');
    bwRowsHtml += '<tr><td>Miscellaneous</td><td class="export-td-num">' + formatExportDays(miscHours / exportHpd) + '</td></tr>';
    bwRowsHtml += '<tr><td>OOO</td><td class="export-td-num">' + formatExportDays(oooDaysTotal) + '</td></tr>';

    function formatOooExportDetailLine(entry) {
      var wd = weekdayShortFromYMD(entry.date);
      var wdHtml = wd ? escapeHtml(wd) + ' · ' : '';
      var datePart = formatDateDMY(entry.date);
      var reasonPart = escapeHtml(entry.reason || 'Other');
      var typ = (entry.type || '').toLowerCase();
      if (typ === 'full') {
        return wdHtml + datePart + ' — <span class="export-bw-ooo-reason">' + reasonPart + '</span> <span class="export-bw-ooo-meta">(full day)</span>';
      }
      var h = parseFloat(entry.hoursOff);
      if (isNaN(h)) h = 0;
      var hStr = String(h).replace(/\.0$/, '');
      return wdHtml + datePart + ' — <span class="export-bw-ooo-reason">' + reasonPart + '</span> <span class="export-bw-ooo-meta">(' + escapeHtml(hStr) + ' h off)</span>';
    }
    var oooBreakdownHtml = '';
    if (oooEntriesInRange.length) {
      oooBreakdownHtml =
        '<div class="export-bw-ooo-breakdown">' +
        '<p class="export-bw-ooo-detail-label">OOO details</p>' +
        '<ul class="export-bw-ooo-list">' +
        oooEntriesInRange.map(function (e) {
          return '<li>' + formatOooExportDetailLine(e) + '</li>';
        }).join('') +
        '</ul></div>';
    }

    var bandwidthBlock =
      '<div class="export-section export-section-bandwidth">' +
      '<table class="export-bw-table">' +
      '<thead><tr><th colspan="2" class="export-bw-head">Bandwidth</th></tr></thead><tbody>' +
      bwRowsHtml +
      '</tbody></table>' +
      oooBreakdownHtml +
      '</div>';

    function subNewEffortInRange(s) {
      return (s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }).reduce(function (sum, p) {
        return sum + progressEffortHours(p);
      }, 0);
    }

    function exportRangeStatusBadge(taskLike, isSub) {
      var res = isSub ? resolveSubtaskStatusInRange(taskLike, from, to) : resolveStatusInRange(taskLike, from, to);
      return rangeStatusBadgeHtml(res, statusBadge);
    }

    function exportFilteredSubtasks(subsAll) {
      return subsAll.filter(function (s) {
        if (isTruthyFlag(s.exclude_from_summary) || isTruthyFlag(s.exclude_from_export)) return false;
        if (!wasOpenedByEndOfRange(s, to)) return false;
        if (wasCompletedOrDroppedBefore(s, from)) return false;
        return true;
      });
    }

    function appendWorkSummaryExportRows(rows, tasks, omitNewEffort) {
      tasks.forEach(function (t) {
        var subsAll = t.subtasks || [];
        var subs = exportFilteredSubtasks(subsAll);
        var includedSubs = subs.filter(function (s) { return !subtaskHasDedicatedEffort(s); });
        var dedicatedSubs = subs.filter(function (s) { return subtaskHasDedicatedEffort(s); });

        var noEffortMain = isTruthyFlag(t.no_effort_needed);
        var mainProgress = sortProgressUpdatesOldestFirst((t.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
        var mainRangeEffort = taskEffortInRangeMainAttributed(t, from, to);
        var cumulativeOutsideRange = taskEffortOutsideRangeMainAttributed(t, from, to);
        var spentMainAttrTotal = taskEffortSpentMainAttributed(t);
        var latestPlannedMain = getLatestPlannedEffortHours(t);
        var remainingMainOnly = latestPlannedMain - spentMainAttrTotal;
        var plannedEtaRaw = (t.eta_updates && t.eta_updates.length && t.eta_updates[0].old_eta) || t.assigned_date || t.eta || '';
        var plannedEtaCell = plannedEtaRaw ? formatDateDMY(plannedEtaRaw) : '—';

        var anySubNew = subsAll.some(function (s) { return subNewEffortInRange(s) > 0.001; });
        var highlightMain = !omitNewEffort && (mainRangeEffort > 0.001 || anySubNew);
        var mainRowClass = 'export-row-main' + (highlightMain ? ' export-row-highlight' : '');
        var numRows = subs.length ? subs.length + 1 : 1;
        var projectLabel = escapeHtml(t.project || 'Miscellaneous');

        var mergeBlockRows = includedSubs.length > 0 ? 1 + includedSubs.length : 1;
        var mergeAttr = mergeBlockRows > 1 ? ' rowspan="' + mergeBlockRows + '"' : '';
        var mergeNum = includedSubs.length > 0 ? 'export-td-num export-td-merge' : 'export-td-num';

        var plannedTd =
          '<td' +
          mergeAttr +
          ' class="' +
          mergeNum +
          ' export-td-eff-planned">' +
          (noEffortMain ? escapeHtml(mainTaskEffortChipValueWhenExempt(t)) : buildPlannedEffortHtml(t)) +
          '</td>';
        var cumTd = '<td' + mergeAttr + ' class="' + mergeNum + ' export-td-eff-cumulative">' + cumulativeOutsideRange + '</td>';
        var newMainTd = '<td class="export-td-num export-td-eff-new">' + mainRangeEffort + '</td>';
        var remTd = '<td' + mergeAttr + ' class="' + mergeNum + ' export-td-eff-remaining' + (remainingMainOnly < 0 ? ' negative' : '') + '">' + (noEffortMain ? '—' : remainingMainOnly) + '</td>';
        var mainEffortCells = plannedTd + cumTd + (omitNewEffort ? '' : newMainTd) + (brief ? '' : remTd);

        rows.push(
          '<tr class="' + mainRowClass + '">' +
            '<td rowspan="' + numRows + '" class="export-td-project">' + projectLabel + '</td>' +
            '<td class="export-td-task"><div class="export-task-main">' + escapeHtml(t.title || '(no title)') + '</div></td>' +
            mainEffortCells +
            '<td class="export-td-eta export-td-eta-planned">' + plannedEtaCell + '</td>' +
            '<td class="export-td-eta export-td-eta-current">' + buildEtaCurrentHtml(t) + '</td>' +
            '<td class="export-td-status">' + exportRangeStatusBadge(t, false) + '</td>' +
            '<td class="export-td-progress">' + progressCellHtml(mainProgress, t.concerns || [], omitNewEffort) + '</td>' +
            (brief ? '' : ('<td class="export-td-details">' + taskDetailsHtml(t.description) + '</td>')) +
          '</tr>'
        );

        includedSubs.forEach(function (s) {
          var subUpdates = sortProgressUpdatesOldestFirst((s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
          var subEffort = subUpdates.reduce(function (sum, p) { return sum + progressEffortHours(p); }, 0);
          var plannedRawS = s.assigned_date || s.eta || '';
          var plannedCellS = plannedRawS ? formatDateDMY(plannedRawS) : '—';
          var highlightSub = !omitNewEffort && subEffort > 0.001;
          var subRowClass = 'export-row-sub export-row-included' + (highlightSub ? ' export-row-highlight' : '');
          var newSubTd = omitNewEffort ? '' : ('<td class="export-td-num export-td-eff-new">' + subEffort + '</td>');
          rows.push(
            '<tr class="' + subRowClass + '">' +
              '<td class="export-td-task"><div class="export-sub-task-row">' +
              escapeHtml(s.title || '(no title)') +
              summaryIncludedPillHtml('export-included-pill') +
              '</div></td>' +
              newSubTd +
              '<td class="export-td-eta export-td-eta-planned">' + plannedCellS + '</td>' +
              '<td class="export-td-eta export-td-eta-current">' + buildEtaCurrentHtml(s) + '</td>' +
              '<td class="export-td-status">' + exportRangeStatusBadge(s, true) + '</td>' +
              '<td class="export-td-progress">' + progressCellHtml(subUpdates, s.concerns || [], omitNewEffort) + '</td>' +
              (brief ? '' : ('<td class="export-td-details">' + taskDetailsHtml(s.description) + '</td>')) +
            '</tr>'
          );
        });

        dedicatedSubs.forEach(function (s) {
          var noEffortSub = isTruthyFlag(s.no_effort_needed);
          var subUpdates = sortProgressUpdatesOldestFirst((s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
          var subEffort = subUpdates.reduce(function (sum, p) { return sum + progressEffortHours(p); }, 0);
          var reqS = getLatestPlannedEffortHours(s);
          var spentS = subtaskEffortSpent(s);
          var cumulativeOutsideSub = subtaskEffortOutsideRange(s, from, to);
          var remS = reqS - spentS;
          var plannedRawS = s.assigned_date || s.eta || '';
          var plannedCellS = plannedRawS ? formatDateDMY(plannedRawS) : '—';
          var highlightSub = !omitNewEffort && subEffort > 0.001;
          var subRowClass = 'export-row-sub' + (highlightSub ? ' export-row-highlight' : '');
          var dedicatedNewTd = omitNewEffort ? '' : ('<td class="export-td-num export-td-eff-new">' + subEffort + '</td>');
          var remDedicatedTd = brief ? '' : ('<td class="export-td-num export-td-eff-remaining' + (remS < 0 ? ' negative' : '') + '">' + (noEffortSub ? '—' : remS) + '</td>');
          rows.push(
            '<tr class="' + subRowClass + '">' +
              '<td class="export-td-task"><div class="export-sub-task-row">' +
              escapeHtml(s.title || '(no title)') +
              '</div></td>' +
              '<td class="export-td-num export-td-eff-planned">' + (noEffortSub ? '—' : buildPlannedEffortHtml(s)) + '</td>' +
              '<td class="export-td-num export-td-eff-cumulative">' + cumulativeOutsideSub + '</td>' +
              dedicatedNewTd +
              remDedicatedTd +
              '<td class="export-td-eta export-td-eta-planned">' + plannedCellS + '</td>' +
              '<td class="export-td-eta export-td-eta-current">' + buildEtaCurrentHtml(s) + '</td>' +
              '<td class="export-td-status">' + exportRangeStatusBadge(s, true) + '</td>' +
              '<td class="export-td-progress">' + progressCellHtml(subUpdates, s.concerns || [], omitNewEffort) + '</td>' +
              (brief ? '' : ('<td class="export-td-details">' + taskDetailsHtml(s.description) + '</td>')) +
            '</tr>'
          );
        });
      });
    }

    /** Extra px beyond measured content/header so cells are not flush. */
    var EXPORT_COL_SLACK_PX = 6;
    /** Pixel estimate for table cell text (12px table font); +pad for padding/borders. */
    function exportCellNeedPx(charCount, tightNumeric) {
      var c = Math.max(0, charCount | 0);
      var per = tightNumeric ? 7.2 : 6.4;
      return Math.round(c * per + (tightNumeric ? 32 : 48));
    }
    /** thead label min width: matches export-th-effort (10px) or default th (11px). */
    function exportThLabelNeedPx(text, fontPx) {
      var per = fontPx * 0.55;
      return Math.ceil(String(text).length * per + 22);
    }
    /** ETA body cells use 11px (.export-td-eta-*); content width before slack. */
    function exportEtaBodyColNeedPx(maxLineChars) {
      var c = Math.max(0, maxLineChars | 0);
      var per = 6.05;
      return Math.round(c * per + 38);
    }
    function exportColWidth(needPxVal, floorPx, nominalPx) {
      var need = Math.ceil(needPxVal);
      if (need <= nominalPx) return Math.max(floorPx, nominalPx);
      return Math.max(floorPx, need);
    }
    function exportColWidthCapped(needPxVal, floorPx, nominalPx, capPx) {
      var need = Math.ceil(needPxVal);
      var base = Math.max(floorPx, nominalPx);
      if (need <= nominalPx) return base;
      return Math.min(capPx, Math.max(floorPx, need));
    }
    /** Widest single line in stacked planned-effort cell (matches &lt;br&gt; layout). */
    function plainEffortStackMaxLineCharLen(taskLike) {
      var updates = (taskLike.effort_updates || []).slice().sort(function (a, b) {
        return (a.date_recorded || '').localeCompare(b.date_recorded || '');
      });
      var segs = [];
      function pushN(n) {
        if (n == null || n === '') return;
        var num = typeof n === 'number' ? n : parseFloat(n);
        if (isNaN(num)) return;
        if (segs.length && Math.abs(segs[segs.length - 1] - num) < 0.0001) return;
        segs.push(num);
      }
      if (updates.length) {
        pushN(updates[0].old_effort_hours);
        updates.forEach(function (u) {
          pushN(u.new_effort_hours);
        });
      } else {
        var req = taskLike.effort_required_hours;
        if (req != null && req !== '') pushN(req);
      }
      if (!segs.length) return 3;
      var maxL = String(formatEffortExportNum(segs[0])).length;
      for (var hi = 1; hi < segs.length; hi++) {
        var line = '-> ' + formatEffortExportNum(segs[hi]);
        if (line.length > maxL) maxL = line.length;
      }
      return maxL;
    }
    /** Widest single line in stacked current-ETA cell (one date per line; arrow lines use "-&gt; "). */
    function plainEtaStackMaxLineCharLen(taskLike) {
      var segs = [];
      function pushY(y) {
        if (!y || typeof y !== 'string') return;
        if (segs.indexOf(y) === -1) segs.push(y);
      }
      var planned = (taskLike.eta_updates && taskLike.eta_updates.length && taskLike.eta_updates[0].old_eta) || taskLike.assigned_date || taskLike.eta || '';
      if (planned) pushY(planned);
      (taskLike.eta_updates || []).slice().sort(function (a, b) {
        return (a.date_recorded || '').localeCompare(b.date_recorded || '');
      }).forEach(function (u) {
        if (u.old_eta) pushY(u.old_eta);
        if (u.new_eta) pushY(u.new_eta);
      });
      if (taskLike.eta) pushY(taskLike.eta);
      if (!segs.length) return 3;
      function ymdLen(ymd) {
        if (!ymd || typeof ymd !== 'string') return 4;
        var m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? 10 : String(ymd).length;
      }
      var maxL = ymdLen(segs[0]);
      for (var ei = 1; ei < segs.length; ei++) {
        var lineLen = 4 + ymdLen(segs[ei]);
        if (lineLen > maxL) maxL = lineLen;
      }
      return maxL;
    }
    function collectExportColumnMetrics(taskList, omitNewEffort, acc) {
      taskList.forEach(function (t) {
        var subs = (t.subtasks || []).filter(function (s) {
          if (isTruthyFlag(s.exclude_from_summary) || isTruthyFlag(s.exclude_from_export)) return false;
          return includeSubtaskInSummaryByDate(s, from);
        });
        var includedSubs = subs.filter(function (s) { return !subtaskHasDedicatedEffort(s); });
        var dedicatedSubs = subs.filter(function (s) { return subtaskHasDedicatedEffort(s); });

        var projMain = (t.project != null && String(t.project).trim()) ? String(t.project).trim() : 'Miscellaneous';
        acc.projectChars = Math.max(acc.projectChars, projMain.length);
        acc.taskChars = Math.max(acc.taskChars, String(t.title || '(no title)').length + 2);

        acc.statusChars = Math.max(acc.statusChars, String(t.status || 'Open').length);

        var mainPlannedCharLen = isTruthyFlag(t.no_effort_needed)
          ? mainTaskEffortChipValueWhenExempt(t).length
          : plainEffortStackMaxLineCharLen(t);
        acc.effPlannedChars = Math.max(acc.effPlannedChars, mainPlannedCharLen);
        acc.effCumChars = Math.max(acc.effCumChars, String(taskEffortOutsideRangeMainAttributed(t, from, to)).length);
        if (!omitNewEffort) {
          acc.effNewChars = Math.max(acc.effNewChars, String(taskEffortInRangeMainAttributed(t, from, to)).length);
        }
        if (!brief) {
          var latestPlannedMain = getLatestPlannedEffortHours(t);
          var spentMainAttrTotal = taskEffortSpentMainAttributed(t);
          var remainingMainOnly = latestPlannedMain - spentMainAttrTotal;
          acc.effRemChars = Math.max(acc.effRemChars, String(remainingMainOnly).length + (remainingMainOnly < 0 ? 14 : 0));
        }

        var plannedEtaRaw = (t.eta_updates && t.eta_updates.length && t.eta_updates[0].old_eta) || t.assigned_date || t.eta || '';
        acc.etaPlannedChars = Math.max(acc.etaPlannedChars, plannedEtaRaw ? 10 : 2);
        acc.etaCurrentChars = Math.max(acc.etaCurrentChars, plainEtaStackMaxLineCharLen(t));

        includedSubs.forEach(function (s) {
          acc.projectChars = Math.max(acc.projectChars, String(s.project || '').trim().length);
          acc.taskChars = Math.max(acc.taskChars, String(s.title || '(no title)').length + 12);
          acc.statusChars = Math.max(acc.statusChars, String(s.status || 'Open').length);
          var plannedRawS = s.assigned_date || s.eta || '';
          acc.etaPlannedChars = Math.max(acc.etaPlannedChars, plannedRawS ? 10 : 2);
          acc.etaCurrentChars = Math.max(acc.etaCurrentChars, plainEtaStackMaxLineCharLen(s));
        });

        dedicatedSubs.forEach(function (s) {
          acc.projectChars = Math.max(acc.projectChars, String(s.project || '').trim().length);
          acc.taskChars = Math.max(acc.taskChars, String(s.title || '(no title)').length + 2);
          var subUpdates = sortProgressUpdatesOldestFirst((s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
          acc.statusChars = Math.max(acc.statusChars, String(s.status || 'Open').length);
          acc.effPlannedChars = Math.max(acc.effPlannedChars, plainEffortStackMaxLineCharLen(s));
          acc.effCumChars = Math.max(acc.effCumChars, String(subtaskEffortOutsideRange(s, from, to)).length);
          if (!omitNewEffort) {
            var subEffort = subUpdates.reduce(function (sum, p) { return sum + progressEffortHours(p); }, 0);
            acc.effNewChars = Math.max(acc.effNewChars, String(subEffort).length);
          }
          var reqS = getLatestPlannedEffortHours(s);
          var spentS = subtaskEffortSpent(s);
          var remS = reqS - spentS;
          if (!brief) {
            acc.effRemChars = Math.max(acc.effRemChars, String(remS).length + (remS < 0 ? 14 : 0));
          }
          var plannedRawS = s.assigned_date || s.eta || '';
          acc.etaPlannedChars = Math.max(acc.etaPlannedChars, plannedRawS ? 10 : 2);
          acc.etaCurrentChars = Math.max(acc.etaCurrentChars, plainEtaStackMaxLineCharLen(s));
        });
      });
    }
    function buildExportColgroupAttrs(plan) {
      function colW(w) {
        var x = Math.max(1, Math.round(w));
        return ' style="width:' + x + 'px;min-width:' + x + 'px"';
      }
      var mainEffCols = brief
        ? '<col' + colW(plan.activeEff.p) + '><col' + colW(plan.activeEff.c) + '><col' + colW(plan.activeEff.n) + '>'
        : '<col' + colW(plan.activeEff.p) + '><col' + colW(plan.activeEff.c) + '><col' + colW(plan.activeEff.n) + '><col' + colW(plan.activeEff.r) + '>';
      var tailCols = brief
        ? '<col' + colW(plan.wEtaPlanned) + '><col' + colW(plan.wEtaCurrent) + '><col' + colW(plan.wStatus) + '><col' + colW(plan.wProgress) + '>'
        : '<col' + colW(plan.wEtaPlanned) + '><col' + colW(plan.wEtaCurrent) + '><col' + colW(plan.wStatus) + '><col' + colW(plan.wProgress) + '><col' + colW(plan.wDetails) + '>';
      var idleEffCols = brief
        ? '<col' + colW(plan.idleEff.p) + '><col' + colW(plan.idleEff.c) + '>'
        : '<col' + colW(plan.idleEff.p) + '><col' + colW(plan.idleEff.c) + '><col' + colW(plan.idleEff.r) + '>';
      return {
        main: '<colgroup>' +
          '<col' + colW(plan.wProject) + '>' +
          '<col' + colW(plan.wTask) + '>' +
          mainEffCols +
          tailCols +
          '</colgroup>',
        idle: '<colgroup>' +
          '<col' + colW(plan.wProject) + '>' +
          '<col' + colW(plan.wTask) + '>' +
          idleEffCols +
          tailCols +
          '</colgroup>'
      };
    }

    var gridRows = [];
    appendWorkSummaryExportRows(gridRows, exportActiveTasks, false);
    var idleGridRows = [];
    appendWorkSummaryExportRows(idleGridRows, exportIdleTasks, true);

    var EXP_FS = 12;
    var TASK_MIN_PX = Math.ceil(16 * EXP_FS);
    var TASK_NOM_PX = Math.ceil(26 * EXP_FS);
    /** Fixed widths (pre–dynamic-column behavior): same on both work tables; text wraps inside. */
    var PROG_COL_PX = 580;
    var DET_COL_PX = 520;
    var PROJ_MIN_PX = 88;
    var PROJ_NOM_PX = 128;
    var PROJ_CAP_PX = 320;

    var colAcc = {
      projectChars: 0,
      taskChars: 0,
      statusChars: 0,
      effPlannedChars: 0,
      effCumChars: 0,
      effNewChars: 1,
      effRemChars: 0,
      etaPlannedChars: 0,
      etaCurrentChars: 0
    };
    collectExportColumnMetrics(exportActiveTasks, false, colAcc);
    collectExportColumnMetrics(exportIdleTasks, true, colAcc);

    var wProject = exportColWidthCapped(exportCellNeedPx(colAcc.projectChars, true), PROJ_MIN_PX, PROJ_NOM_PX, PROJ_CAP_PX);
    var wTask = exportColWidth(exportCellNeedPx(colAcc.taskChars, false), TASK_MIN_PX, TASK_NOM_PX);
    var wStatus = exportColWidth(exportCellNeedPx(colAcc.statusChars, true), 76, 92);
    var wProgress = PROG_COL_PX;
    var wDetails = brief ? 0 : DET_COL_PX;

    var EFF_HDR_PLANNED = exportThLabelNeedPx('Planned', 10);
    var EFF_HDR_CUM = exportThLabelNeedPx('Cumulative Effort', 10);
    var EFF_HDR_NEW = exportThLabelNeedPx('New Effort', 10);
    var EFF_HDR_REM = exportThLabelNeedPx('Remaining Effort', 10);
    var ETA_HDR_PLANNED = exportThLabelNeedPx('Planned', 11);
    var ETA_HDR_CURRENT = exportThLabelNeedPx('Current', 11);

    var wEP0 = Math.max(EFF_HDR_PLANNED, exportCellNeedPx(colAcc.effPlannedChars, true)) + EXPORT_COL_SLACK_PX;
    var wEC0 = Math.max(EFF_HDR_CUM, exportCellNeedPx(colAcc.effCumChars, true)) + EXPORT_COL_SLACK_PX;
    var wEN0 = Math.max(EFF_HDR_NEW, exportCellNeedPx(colAcc.effNewChars, true)) + EXPORT_COL_SLACK_PX;
    var wER0 = brief ? 0 : Math.max(EFF_HDR_REM, exportCellNeedPx(colAcc.effRemChars, true)) + EXPORT_COL_SLACK_PX;

    var plannedEtaLineChars = Math.max(2, colAcc.etaPlannedChars | 0);
    var wEtaPlanned = Math.max(ETA_HDR_PLANNED, exportEtaBodyColNeedPx(plannedEtaLineChars)) + EXPORT_COL_SLACK_PX;
    var wEtaCurrent = Math.max(ETA_HDR_CURRENT, exportEtaBodyColNeedPx(colAcc.etaCurrentChars)) + EXPORT_COL_SLACK_PX;

    var activeEff = brief
      ? { p: wEP0, c: wEC0, n: wEN0, r: 0 }
      : { p: wEP0, c: wEC0, n: wEN0, r: wER0 };
    /** Split total px across columns by weight; sums exactly to totalInt (largest remainder). */
    function exportLargestRemainderPx(weights, totalInt) {
      var n = weights.length;
      if (n === 0) return [];
      var sumW = weights.reduce(function (a, x) { return a + x; }, 0);
      if (sumW <= 0) {
        var base = Math.floor(totalInt / n);
        var outEq = [];
        var remEq = totalInt;
        for (var e = 0; e < n; e++) {
          var v = e === n - 1 ? remEq : base;
          outEq.push(v);
          remEq -= v;
        }
        return outEq;
      }
      var exact = weights.map(function (w) { return (w / sumW) * totalInt; });
      var floorPx = exact.map(function (x) { return Math.floor(x); });
      var assigned = floorPx.reduce(function (a, x) { return a + x; }, 0);
      var leftover = totalInt - assigned;
      var order = exact.map(function (x, i) { return { i: i, r: x - floorPx[i] }; })
        .sort(function (a, b) { return b.r - a.r; });
      var out = floorPx.slice();
      for (var k = 0; k < leftover; k++) {
        out[order[k % n].i]++;
      }
      return out;
    }
    var effortTotalActive = activeEff.p + activeEff.c + activeEff.n + activeEff.r;
    var idleAlloc = brief
      ? exportLargestRemainderPx([wEP0, wEC0], effortTotalActive)
      : exportLargestRemainderPx([wEP0, wEC0, wER0], effortTotalActive);
    var idleEff = brief
      ? { p: idleAlloc[0], c: idleAlloc[1], r: 0 }
      : { p: idleAlloc[0], c: idleAlloc[1], r: idleAlloc[2] };

    var twMain = wProject + wTask + activeEff.p + activeEff.c + activeEff.n + activeEff.r + wEtaPlanned + wEtaCurrent + wStatus + wProgress + wDetails + 32;
    var twIdle = wProject + wTask + idleEff.p + idleEff.c + idleEff.r + wEtaPlanned + wEtaCurrent + wStatus + wProgress + wDetails + 32;

    var exportColPlan = {
      wProject: wProject,
      wTask: wTask,
      wEtaPlanned: wEtaPlanned,
      wEtaCurrent: wEtaCurrent,
      wStatus: wStatus,
      wProgress: wProgress,
      wDetails: wDetails,
      activeEff: activeEff,
      idleEff: idleEff
    };
    var exportColgroups = buildExportColgroupAttrs(exportColPlan);

    var exportCss =
      'body{box-sizing:border-box;margin:0;padding:24px 20px 32px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Calibri,Arial,sans-serif;font-size:13px;line-height:1.55;color:#1e293b;background:linear-gradient(165deg,#eef2f6 0%,#e2e8f0 45%,#f1f5f9 100%);-webkit-font-smoothing:antialiased;overflow-x:auto}' +
      '*,*:before,*:after{box-sizing:inherit}' +
      '.export-root{width:max-content;max-width:none;min-width:100%;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(15,23,42,.07),0 12px 28px -6px rgba(15,23,42,.12);padding:32px 36px 40px;border:1px solid rgba(148,163,184,.4);box-sizing:border-box}' +
      '.export-header{margin:0 0 8px;padding-bottom:22px;border-bottom:1px solid #e2e8f0}' +
      '.export-ws-title{font-size:1.6rem;font-weight:800;margin:0;letter-spacing:-.03em;color:#0f172a;line-height:1.2}' +
      '.export-ws-dot{color:#cbd5e1;font-weight:500;margin:0 2px}' +
      '.export-ws-range{font-weight:600;color:#64748b;font-size:1.35rem}' +
      '.export-section{margin-bottom:30px}' +
      '.export-section:last-child{margin-bottom:0}' +
      '.export-ws-subheading{font-size:1.15rem;font-weight:700;margin:0;color:#0f172a;letter-spacing:-.02em;line-height:1.35}' +
      '.export-ws-subtitle{font-size:1.08rem;font-weight:700;margin:0 0 14px;color:#0f172a;letter-spacing:-.02em}' +
      '.export-section-idle{padding-top:0;margin-top:0;border-top:0}' +
      'hr.export-delimiter{border:0;border-top:1px solid #cbd5e1;margin:22px 0;height:0;background:transparent}' +
      'hr.export-delimiter-subtable{margin:14px 0 20px}' +
      '.export-bw-table{width:100%;max-width:440px;border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.08);border:1px solid #cbd5e1;font-size:13px}' +
      '.export-bw-table th.export-bw-head,.export-bw-table td{border-bottom:1px solid #e2e8f0;padding:12px 18px;text-align:left;vertical-align:middle}' +
      '.export-bw-table tr:last-child td{border-bottom:0}' +
      '.export-bw-table th.export-bw-head{background:#334155;color:#f8fafc;font-weight:700;text-align:center;font-size:11px;letter-spacing:.08em;text-transform:uppercase;border-bottom:0;padding:14px 18px}' +
      '.export-bw-table tbody tr:nth-child(odd){background:#f8fafc}' +
      '.export-bw-table tbody tr:nth-child(even){background:#fff}' +
      '.export-bw-table tbody td:first-child{font-weight:600;color:#334155}' +
      '.export-bw-table .export-td-num{text-align:right;font-variant-numeric:tabular-nums;color:#0f172a;font-weight:600}' +
      '.export-bw-ooo-breakdown{margin-top:16px;padding:14px 18px;border-radius:10px;border:1px solid #e2e8f0;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);max-width:440px;box-shadow:0 1px 2px rgba(15,23,42,.04)}' +
      '.export-bw-ooo-detail-label{margin:0 0 10px;font-size:11px;font-weight:700;color:#475569;letter-spacing:.06em;text-transform:uppercase}' +
      '.export-bw-ooo-list{margin:0;padding-left:20px;color:#334155;font-size:12.5px;line-height:1.55}' +
      '.export-bw-ooo-list li{margin:7px 0}' +
      '.export-bw-ooo-reason{font-weight:600;color:#0f172a}' +
      '.export-bw-ooo-meta{color:#64748b;font-weight:500;font-size:12px}' +
      '.export-work-table{table-layout:fixed;border-collapse:collapse;margin:0;font-size:12px;box-shadow:0 2px 10px rgba(15,23,42,.06);border:1px solid #cbd5e1;border-radius:10px;overflow:hidden}' +
      '.export-work-table thead th{background:#334155;color:#f1f5f9;border:1px solid #475569;padding:11px 8px;font-weight:600;text-align:center;vertical-align:middle;font-size:11px;letter-spacing:.02em}' +
      '.export-work-table thead th.export-th-shrink{white-space:nowrap}' +
      '.export-work-table thead th.export-th-effort{white-space:normal;text-align:center;line-height:1.3;font-size:10px;vertical-align:middle;word-wrap:break-word;overflow-wrap:break-word;text-transform:none;letter-spacing:0}' +
      '.export-work-table thead th.export-th-eta-planned,.export-work-table thead th.export-th-eta-current{white-space:normal;line-height:1.35}' +
      '.export-work-table tbody td{border:1px solid #e2e8f0;padding:11px 9px;vertical-align:top;background-clip:padding-box}' +
      '.export-td-project{font-weight:600;text-align:center;vertical-align:middle;background:linear-gradient(180deg,#f1f5f9 0%,#e8eef4 100%);white-space:nowrap;color:#334155;border-color:#cbd5e1}' +
      '.export-td-task{text-align:left;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;color:#1e293b}' +
      '.export-td-num{text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums}' +
      '.export-work-table td.export-td-eff-planned,.export-work-table td.export-td-eff-cumulative,.export-work-table td.export-td-eff-new,.export-work-table td.export-td-eff-remaining{overflow-wrap:break-word;word-wrap:break-word}' +
      '.export-work-table td.export-td-eff-planned{white-space:normal;vertical-align:top}' +
      '.export-work-table tbody td.export-td-merge{vertical-align:middle;text-align:center}' +
      '.export-work-table td.export-td-merge.export-td-eff-planned{vertical-align:top}' +
      'tr.export-row-main > td.export-td-eff-cumulative:not(.export-td-merge){vertical-align:top;text-align:center}' +
      '.export-td-status{text-align:center;white-space:nowrap}' +
      '.export-td-eta-planned{text-align:center;font-size:11px;white-space:normal;vertical-align:top;line-height:1.5;color:#334155}' +
      '.export-td-eta-current{text-align:center;font-size:11px;white-space:normal;vertical-align:top;line-height:1.5;color:#334155}' +
      '.export-eta-stack{display:block;text-align:center}' +
      '.export-eta-stack-line{display:block;line-height:1.5}' +
      '.export-effort-stack{display:block;text-align:center}' +
      '.export-effort-stack-line{display:block;line-height:1.5}' +
      '.export-td-details,.export-td-progress{font-size:11.5px;line-height:1.55;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;white-space:normal;color:#334155}' +
      '.export-work-table thead th.export-th-progress{text-align:left;padding-left:12px}' +
      '.export-td-progress{text-align:left;min-width:0}' +
      '.export-td-progress .export-progress-wrap,.export-td-progress .export-p-label,.export-td-progress .export-p-body,.export-td-progress .export-c-body{text-align:left}' +
      '.export-td-progress .concern-open,.export-td-progress .concern-addressed{text-align:left}' +
      '.export-work-table.export-work-table-idle .export-td-progress{min-width:0}' +
      '.export-td-details{min-width:0}' +
      '.export-task-main{font-weight:700;color:#0f172a;font-size:12.5px}' +
      '.export-sub-task-row{display:block;font-weight:600;color:#475569;padding:4px 0 4px 14px;margin-left:8px;border-left:3px solid #94a3b8;border-radius:0 6px 6px 0}' +
      'tr.export-row-sub .export-td-task{padding-left:16px}' +
      'tr.export-row-sub .export-td-details{padding-left:16px}' +
      '.export-p-label{font-weight:700;margin-top:2px;color:#0f172a;font-size:11px}' +
      '.export-p-label-gap{margin-top:12px}' +
      '.export-p-body,.export-c-body{margin:6px 0 0}' +
      '.export-progress-item{display:grid;grid-template-columns:max-content minmax(0,1fr);column-gap:8px;align-items:start;margin:0 0 14px}' +
      '.export-progress-item:last-child{margin-bottom:0}' +
      '.export-progress-num-cell{grid-column:1;grid-row:1;font-weight:700;color:#64748b;text-align:left;line-height:1.55;white-space:nowrap}' +
      '.export-progress-content{grid-column:2;grid-row:1;min-width:0;display:flex;flex-direction:column;gap:5px}' +
      '.export-progress-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;line-height:1.55}' +
      '.export-progress-text{font-size:11.5px;line-height:1.55;color:#334155;word-wrap:break-word;overflow-wrap:break-word}' +
      '.export-progress-effort{font-size:11px;font-weight:600;color:#64748b;flex-shrink:0}' +
      '.export-progress-category-pill{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:9px;font-weight:700;border:1px solid #a5b4fc;background:linear-gradient(180deg,#eef2ff 0%,#e0e7ff 100%);color:#4338ca;vertical-align:middle}' +
      'tr.export-row-highlight td{background-color:#ecfdf5!important}' +
      'tr.export-row-highlight.export-row-main td,tr.export-row-highlight.export-row-sub td{background-color:#ecfdf5!important}' +
      'tr.export-row-main td{background:#fafbfc}' +
      'tr.export-row-sub td{background:#fff}' +
      'tr.export-row-main.export-row-highlight td,tr.export-row-sub.export-row-highlight td{background-color:#ecfdf5!important}' +
      '.export-empty-row td.export-empty-msg{text-align:center;padding:36px 24px!important;font-style:italic;color:#64748b;font-size:13px;background:#f8fafc!important}' +
      '.export-project-pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:10px;border:1px solid #93c5fd;background:#eff6ff;color:#1d4ed8;margin-left:6px;vertical-align:middle}' +
      '.export-included-pill{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:9px;font-weight:700;border:1px solid #f9a8d4;background:linear-gradient(180deg,#fdf2f8 0%,#fce7f3 100%);color:#9d174d;margin-left:8px;vertical-align:middle}' +
      '.status-btn{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid;box-shadow:0 1px 2px rgba(15,23,42,.06)}' +
      '.status-btn.done{background:linear-gradient(180deg,#ecfdf5 0%,#d1fae5 100%);border-color:#6ee7b7;color:#065f46}' +
      '.status-btn.ongoing{background:linear-gradient(180deg,#fffbeb 0%,#fef3c7 100%);border-color:#fcd34d;color:#92400e}' +
      '.status-btn.open{background:linear-gradient(180deg,#eff6ff 0%,#dbeafe 100%);border-color:#93c5fd;color:#1e40af}' +
      '.status-btn.dropped{background:linear-gradient(180deg,#f8f8f8 0%,#e5e7eb 100%);border-color:#9ca3af;color:#4b5563}' +
      '.status-btn.other{background:#f1f5f9;border-color:#cbd5e1;color:#475569}' +
      '.export-status-transition{display:inline-flex;align-items:center;gap:2px;flex-wrap:wrap}' +
      '.export-status-arrow{font-weight:700;color:#888}' +
      '.negative{color:#b91c1c;font-weight:700}.muted{color:#64748b}' +
      '.concern-open{background:linear-gradient(90deg,#fff1f2 0%,#fff 100%);border-left:4px solid #f87171;border-radius:0 8px 8px 0;padding:8px 10px;margin:6px 0;box-shadow:0 1px 2px rgba(15,23,42,.04)}' +
      '.concern-addressed{background:linear-gradient(90deg,#ecfdf5 0%,#fff 100%);border-left:4px solid #34d399;border-radius:0 8px 8px 0;padding:8px 10px;margin:6px 0;box-shadow:0 1px 2px rgba(15,23,42,.04)}' +
      'a.auto-link{color:#2563eb;text-decoration:underline;text-underline-offset:2px;word-break:break-all}' +
      'a.auto-link:hover{color:#1d4ed8}' +
      '.rich-ul{margin:.35em 0 .5em 1.25em;padding:0;list-style:disc}' +
      '.rich-ol{margin:.35em 0 .5em 1.25em;padding:0;list-style:decimal}' +
      '.rich-li{margin:.15em 0}' +
      '.rich-code{font-family:ui-monospace,Consolas,monospace;font-size:.92em;background:#f1f5f9;padding:.1em .35em;border-radius:4px}' +
      '.rich-code-block{display:block;margin:.5em 0;padding:10px 12px;background:#0f172a;color:#e2e8f0;border-radius:8px;font-family:ui-monospace,Consolas,monospace;font-size:11px;line-height:1.45;white-space:pre-wrap;word-break:break-word;overflow-x:auto}' +
      '.export-eta-slip{color:#b91c1c;font-weight:700}' +
      '.export-eta-pullin{color:#047857;font-weight:700}' +
      '.export-eta-neutral{color:#64748b}' +
      '.export-effort-increase{color:#b91c1c;font-weight:700}' +
      '.export-effort-decrease{color:#047857;font-weight:700}' +
      '.export-effort-same{color:#64748b}';

    var titleRange = formatDateDMY(from) + ' to ' + formatDateDMY(to);

    var cumEffortTitle = 'Effort spent so far excluding new effort: hours logged outside the selected From–To range (before From or after To).';
    var mainEffortColspan = brief ? 3 : 4;
    var mainEffortSubHeadRow = brief
      ? '<th class="export-th-effort">Planned</th><th class="export-th-effort" title="' + cumEffortTitle + '">Cumulative Effort</th><th class="export-th-effort" title="Effort logged on dates from From through To (inclusive)">New Effort</th>'
      : '<th class="export-th-effort">Planned</th><th class="export-th-effort" title="' + cumEffortTitle + '">Cumulative Effort</th><th class="export-th-effort" title="Effort logged on dates from From through To (inclusive)">New Effort</th><th class="export-th-effort">Remaining Effort</th>';
    var idleEffortColspan = brief ? 2 : 3;
    var idleEffortSubHeadRow = brief
      ? '<th class="export-th-effort">Planned</th><th class="export-th-effort" title="' + cumEffortTitle + '">Cumulative Effort</th>'
      : '<th class="export-th-effort">Planned</th><th class="export-th-effort" title="' + cumEffortTitle + '">Cumulative Effort</th><th class="export-th-effort">Remaining Effort</th>';
    var exportThStatusProgress = '<th rowspan="2" class="export-th-shrink">Status</th>' +
      '<th rowspan="2" class="export-th-progress">Progress</th>' +
      (brief ? '' : '<th rowspan="2">Task Details</th>');
    var emptyColspanMain = brief ? 9 : 11;

    var idleTableBlock = '';
    if (exportIdleTasks.length) {
      idleTableBlock =
        '<div class="export-section export-section-idle">' +
        '<h2 class="export-ws-subheading">Tasks with No Progress</h2>' +
        '<hr class="export-delimiter export-delimiter-subtable">' +
        '<table class="export-work-table export-work-table-idle" style="table-layout:fixed;min-width:' + twIdle + 'px;width:' + twIdle + 'px">' +
        exportColgroups.idle +
        '<thead>' +
        '<tr>' +
        '<th rowspan="2" class="export-th-shrink">Project</th>' +
        '<th rowspan="2">Task</th>' +
        '<th colspan="' + idleEffortColspan + '">Effort</th>' +
        '<th colspan="2">ETA</th>' +
        exportThStatusProgress +
        '</tr>' +
        '<tr>' +
        idleEffortSubHeadRow +
        '<th class="export-th-eta-planned">Planned</th>' +
        '<th class="export-th-eta-current">Current</th>' +
        '</tr>' +
        '</thead><tbody>' +
        idleGridRows.join('') +
        '</tbody></table></div>';
    }

    var bodyInner =
      '<div class="export-root">' +
      '<header class="export-header"><h1 class="export-ws-title">Work Summary <span class="export-ws-dot">·</span> <span class="export-ws-range">' + titleRange + '</span></h1></header>' +
      bandwidthBlock +
      '<hr class="export-delimiter">' +
      '<div class="export-section export-section-tasks">' +
      '<h2 class="export-ws-subheading">Task Updates</h2>' +
      '<hr class="export-delimiter export-delimiter-subtable">' +
      '<table class="export-work-table" style="table-layout:fixed;min-width:' + twMain + 'px;width:' + twMain + 'px">' +
      exportColgroups.main +
      '<thead>' +
      '<tr>' +
        '<th rowspan="2" class="export-th-shrink">Project</th>' +
        '<th rowspan="2">Task</th>' +
        '<th colspan="' + mainEffortColspan + '">Effort</th>' +
        '<th colspan="2">ETA</th>' +
        exportThStatusProgress +
      '</tr>' +
      '<tr>' +
        mainEffortSubHeadRow +
        '<th class="export-th-eta-planned">Planned</th><th class="export-th-eta-current">Current</th>' +
      '</tr>' +
      '</thead><tbody>' +
      (gridRows.length ? gridRows.join('') : '<tr class="export-empty-row"><td colspan="' + emptyColspanMain + '" class="export-empty-msg">No tasks with progress in this range.</td></tr>') +
      '</tbody></table></div>' +
      (exportIdleTasks.length ? '<hr class="export-delimiter">' : '') +
      idleTableBlock +
      '</div>';

    var htmlDocument =
      '<!doctype html><html><head><meta charset="UTF-8"><title>Work Summary Export</title><style>' +
      exportCss +
      '</style></head><body>' +
      bodyInner +
      '</body></html>';

    return {
      document: htmlDocument,
      htmlOnly: bodyInner,
      cssOnly: exportCss
    };
  }

  function buildSummaryExportHtml(meta) {
    return buildSummaryExportHtmlParts(meta, getExportOptions()).document;
  }

  /**
   * Confluence Cloud markdown export: same data as HTML export, vertical layout.
   * Bold for emphasis where needed; Atlassian markdown has no text color.
   */
  function buildSummaryExportConfluenceMarkdown(meta, opts) {
    opts = opts || {};
    var showProgressEntryHours = !!opts.showProgressEntryHours;
    var from = meta.from;
    var to = meta.to;
    var activeTasks = meta.activeTasks || [];
    var idleTasks = meta.idleTasks || [];
    var exportActiveTasks = tasksForExportWorkTable(activeTasks, from, to);
    var exportIdleTasks = tasksForExportWorkTable(idleTasks, from, to);
    var exportSettings = getSettings();
    var exportHpd = parseFloat(exportSettings.workingHoursPerDay);
    if (isNaN(exportHpd) || exportHpd <= 0) exportHpd = 8;

    function inRange(dateStr) {
      return dateStr && dateStr >= from && dateStr <= to;
    }
    function formatDateDMYPlain(ymd) {
      if (!ymd || typeof ymd !== 'string') return '—';
      var m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return String(ymd);
      return m[3] + '-' + m[2] + '-' + m[1];
    }
    function cfPlainForTable(s) {
      return String(s)
        .replace(/\r\n|\r|\n/g, ' ')
        .replace(/\|/g, '\\|');
    }
    /** Markdown bold; strip inner `*` so we do not break `**` pairs. */
    function mdBoldInner(text) {
      return '**' + String(text).replace(/\*/g, '') + '**';
    }
    function linkifyConfluenceCell(plain) {
      if (plain == null || plain === '') return '';
      var s = String(plain);
      var parts = [];
      var last = 0;
      URL_IN_TEXT_RE.lastIndex = 0;
      var m;
      while ((m = URL_IN_TEXT_RE.exec(s)) !== null) {
        parts.push(cfPlainForTable(s.slice(last, m.index)));
        var raw = m[0];
        var sp = splitUrlTrailingPunct(raw);
        var core = sp.core;
        var tail = sp.tail;
        if (!core) {
          parts.push(cfPlainForTable(raw));
          last = m.index + raw.length;
          continue;
        }
        var href = /^https?:\/\//i.test(core) ? core : 'https://' + core;
        var display = cfPlainForTable(core);
        parts.push('[' + display + '](' + href + ')');
        parts.push(cfPlainForTable(tail));
        last = m.index + raw.length;
      }
      parts.push(cfPlainForTable(s.slice(last)));
      return parts.join('');
    }
    /** Heading line: `[ Project ] Title` when project is set; otherwise title only (matches summary pills). */
    function confluenceTitleWithProject(projectRaw, titleRaw) {
      var p = projectRaw != null ? String(projectRaw).trim() : '';
      var titlePart = linkifyConfluenceCell(titleRaw || '(no title)');
      if (!p) return titlePart;
      return '[ ' + linkifyConfluenceCell(p) + ' ] ' + titlePart;
    }
    /** Table cell: escape `|`. May contain markdown bold. */
    function mdTableCell(s) {
      if (s == null || s === '') return '—';
      return String(s).replace(/\|/g, '\\|');
    }
    function statusBadgeConfluence(raw) {
      var label = (raw == null || raw === '' ? 'Open' : String(raw)).trim();
      return mdBoldInner(label);
    }
    function cfRangeStatusLabel(taskLike, isSub) {
      var res = isSub ? resolveSubtaskStatusInRange(taskLike, from, to) : resolveStatusInRange(taskLike, from, to);
      if (!res.transitions.length) return statusBadgeConfluence(res.statusAtEnd);
      var parts = [statusBadgeConfluence(res.statusAtStart)];
      res.transitions.forEach(function (tr) {
        parts.push(' → ');
        parts.push(statusBadgeConfluence(tr.to));
      });
      return parts.join('');
    }
    function formatEffortExportNum(n) {
      var x = Number(n);
      if (isNaN(x)) return '0';
      if (Math.abs(x - Math.round(x)) < 0.001) return String(Math.round(x));
      var t = Math.round(x * 10) / 10;
      return String(t).replace(/\.0$/, '');
    }
    /** ETA trail: bold → step when date slipped or pulled in; plain → when unchanged. */
    function buildEtaCurrentMd(taskLike) {
      var segs = [];
      function pushY(y) {
        if (!y || typeof y !== 'string') return;
        if (segs.indexOf(y) === -1) segs.push(y);
      }
      var planned = (taskLike.eta_updates && taskLike.eta_updates.length && taskLike.eta_updates[0].old_eta) || taskLike.assigned_date || taskLike.eta || '';
      if (planned) pushY(planned);
      (taskLike.eta_updates || []).slice().sort(function (a, b) {
        return (a.date_recorded || '').localeCompare(b.date_recorded || '');
      }).forEach(function (u) {
        if (u.old_eta) pushY(u.old_eta);
        if (u.new_eta) pushY(u.new_eta);
      });
      if (taskLike.eta) pushY(taskLike.eta);
      if (!segs.length) return '—';
      var parts = [formatDateDMYPlain(segs[0])];
      for (var ei = 1; ei < segs.length; ei++) {
        var cmp = compareDateStr(segs[ei - 1], segs[ei]);
        var d = formatDateDMYPlain(segs[ei]);
        if (cmp < 0) parts.push(mdBoldInner('→ ' + d));
        else if (cmp > 0) parts.push(mdBoldInner('→ ' + d));
        else parts.push('→ ' + d);
      }
      return parts.join(' · ');
    }
    /** Effort history: bold → step when hours changed; plain → when unchanged. */
    function buildPlannedEffortMd(taskLike) {
      var updates = (taskLike.effort_updates || []).slice().sort(function (a, b) {
        return (a.date_recorded || '').localeCompare(b.date_recorded || '');
      });
      var segs = [];
      function pushN(n) {
        if (n == null || n === '') return;
        var num = typeof n === 'number' ? n : parseFloat(n);
        if (isNaN(num)) return;
        if (segs.length && Math.abs(segs[segs.length - 1] - num) < 0.0001) return;
        segs.push(num);
      }
      if (updates.length) {
        pushN(updates[0].old_effort_hours);
        updates.forEach(function (u) {
          pushN(u.new_effort_hours);
        });
      } else {
        var req = taskLike.effort_required_hours;
        if (req != null && req !== '') pushN(req);
      }
      if (!segs.length) return '—';
      var parts = [formatEffortExportNum(segs[0])];
      for (var hi = 1; hi < segs.length; hi++) {
        var prevH = segs[hi - 1];
        var curH = segs[hi];
        var hcmp = curH > prevH ? 1 : (curH < prevH ? -1 : 0);
        var n = formatEffortExportNum(segs[hi]);
        if (hcmp > 0) parts.push(mdBoldInner('→ ' + n));
        else if (hcmp < 0) parts.push(mdBoldInner('→ ' + n));
        else parts.push('→ ' + n);
      }
      return parts.join(' · ');
    }
    /** When `omitProgress` (idle / no progress in range section), skip the whole Progress block. */
    function pushProgressConcernsVertical(lines, updates, concerns, omitProgress) {
      if (!omitProgress) {
        lines.push('**Progress**');
        if (!updates || !updates.length) {
          lines.push('- *No progress made.*');
        } else {
          var ordered = sortProgressUpdatesOldestFirst(updates);
          ordered.forEach(function (p, i) {
            var textRaw = (p.text || '').trim();
            var cats = progressUpdateCategoriesArray(p);
            var pillMd = cats.map(function (c) {
              var t = String(c).trim();
              if (!t) return '';
              return mdBoldInner(cfPlainForTable(t));
            }).filter(Boolean).join(' ');
            var eff = (p.effort_consumed_hours != null && p.effort_consumed_hours !== '') ? (String(p.effort_consumed_hours) + ' hrs') : '';
            if (showProgressEntryHours) {
              var headBits = [String(i + 1) + '.'];
              if (pillMd) headBits.push(pillMd);
              if (eff) headBits.push(eff);
              lines.push('- ' + headBits.join(' '));
              var paras = textRaw ? textRaw.split(/\r\n|\n|\r/) : [];
              while (paras.length && !paras[0].trim()) paras.shift();
              var wroteDesc = false;
              paras.forEach(function (para) {
                var lineText = para.trim();
                if (!lineText) return;
                lines.push('  ' + linkifyConfluenceCell(lineText));
                wroteDesc = true;
              });
              if (!wroteDesc) {
                lines.push('  *No note*');
              }
            } else {
              var bits = [String(i + 1) + '.'];
              if (pillMd) bits.push(pillMd);
              if (textRaw) bits.push(linkifyConfluenceCell(cfPlainForTable(textRaw)));
              else bits.push('*No note*');
              lines.push('- ' + bits.join(' '));
            }
          });
        }
        lines.push('');
      }
      lines.push('**Concerns**');
      var filteredConcerns = filterConcernsForRange(concerns, from, to);
      if (!filteredConcerns.length) {
        lines.push('- *None*');
      } else {
        filteredConcerns.forEach(function (c) {
          var addressedInRange = isConcernAddressedInRange(c, from, to);
          var prefix = addressedInRange ? '*(Addressed)* ' : '*(Open)* ';
          var line = prefix + linkifyConfluenceCell(c.description || '');
          if (addressedInRange && c.addressed_comment) line += ' — ' + linkifyConfluenceCell(c.addressed_comment);
          lines.push('- ' + line);
        });
      }
      lines.push('');
    }
    function formatExportDays(d) {
      if (d == null || isNaN(d) || d < 0.001) return '0';
      var rounded = Math.round(d);
      if (Math.abs(d - rounded) < 0.08) {
        return rounded === 1 ? '1 Days' : (rounded + ' Days');
      }
      return '~' + d.toFixed(1).replace(/\.0$/, '') + ' Days';
    }
    function pushTaskDetailsVertical(lines, desc) {
      lines.push('**Task details**');
      if (!desc || !String(desc).trim()) {
        lines.push('- —');
        lines.push('');
        return;
      }
      String(desc).trim().split(/\r\n|\n|\r/).forEach(function (para) {
        var t = para.trim();
        if (!t) return;
        lines.push('- ' + linkifyConfluenceCell(t));
      });
      lines.push('');
    }

    var projectHours = {};
    function addProjHours(proj, hrs) {
      var h = Number(hrs) || 0;
      if (h < 0.001) return;
      var k = (proj != null && String(proj).trim()) ? String(proj).trim() : 'Miscellaneous';
      projectHours[k] = (projectHours[k] || 0) + h;
    }
    exportActiveTasks.forEach(function (t) {
      addProjHours(t.project, taskEffortInRangeMainAttributed(t, from, to));
      (t.subtasks || []).forEach(function (s) {
        if (!subtaskHasDedicatedEffort(s)) return;
        var su = (s.progress_updates || []).filter(function (p) { return inRange(p.date_added); });
        var sh = su.reduce(function (sum, p) { return sum + (Number(p.effort_consumed_hours) || 0); }, 0);
        addProjHours(s.project, sh);
      });
    });

    function oooEntryDayEquivalent(off) {
      if (!off) return 0;
      var typ = (off.type || '').toLowerCase();
      if (typ === 'full') return 1;
      var hOff = parseFloat(off.hoursOff);
      if (isNaN(hOff)) hOff = 0;
      hOff = Math.min(Math.max(0, hOff), exportHpd);
      return hOff / exportHpd;
    }
    var ptoAgg = 0;
    var sickAgg = 0;
    var otherAgg = 0;
    var oooEntriesMd = [];
    (exportSettings.dayOffs || []).forEach(function (off) {
      if (!off || !off.date || off.date < from || off.date > to) return;
      var eq = oooEntryDayEquivalent(off);
      var reason = off.reason || 'Other';
      if (reason === 'PTO') ptoAgg += eq;
      else if (reason === 'Sick') sickAgg += eq;
      else otherAgg += eq;
      oooEntriesMd.push({
        date: off.date,
        reason: reason,
        type: off.type,
        hoursOff: off.hoursOff
      });
    });
    oooEntriesMd.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    var oooDaysTotal = ptoAgg + sickAgg + otherAgg;
    var miscHours = projectHours.Miscellaneous || 0;
    var projKeys = Object.keys(projectHours).filter(function (k) { return k !== 'Miscellaneous'; }).sort(function (a, b) { return a.localeCompare(b); });

    /** Single **Effort/ETA** heading; effort table immediately followed by ETA table (no subheading between). */
    function pushEffortEtaSection(lines, plannedMd, cumMd, newStr, remCell, omitNewEffort, plannedEtaCell, etaCurrentMd) {
      lines.push('**Effort/ETA**');
      lines.push('');
      if (omitNewEffort) {
        lines.push('| Planned (h) | Cumulative (outside range) | Remaining |');
        lines.push('| --- | --- | --- |');
        lines.push('| ' + mdTableCell(plannedMd) + ' | ' + mdTableCell(cumMd) + ' | ' + mdTableCell(remCell) + ' |');
      } else {
        lines.push('| Planned (h) | Cumulative (outside range) | New (in range) | Remaining |');
        lines.push('| --- | --- | --- | --- |');
        lines.push('| ' + mdTableCell(plannedMd) + ' | ' + mdTableCell(cumMd) + ' | ' + mdTableCell(newStr) + ' | ' + mdTableCell(remCell) + ' |');
      }
      lines.push('');
      lines.push('| Planned (anchor) | Current (trail) |');
      lines.push('| --- | --- |');
      lines.push('| ' + mdTableCell(plannedEtaCell) + ' | ' + mdTableCell(etaCurrentMd || '—') + ' |');
      lines.push('');
    }

    /** Included sub: effort row mostly dashes + optional new hours; then ETA row. Under one **Effort/ETA** heading. */
    function pushEffortEtaIncludedSubSection(lines, omitNewEffort, subNewHours, plannedCellS, etaCurrentMd) {
      lines.push('**Effort/ETA**');
      lines.push('');
      var dash = '—';
      if (omitNewEffort) {
        lines.push('| Planned (h) | Cumulative (outside range) | Remaining |');
        lines.push('| --- | --- | --- |');
        lines.push('| ' + mdTableCell(dash) + ' | ' + mdTableCell(dash) + ' | ' + mdTableCell(dash) + ' |');
      } else {
        lines.push('| Planned (h) | Cumulative (outside range) | New (in range) | Remaining |');
        lines.push('| --- | --- | --- | --- |');
        lines.push('| ' + mdTableCell(dash) + ' | ' + mdTableCell(dash) + ' | ' + mdTableCell(String(subNewHours)) + ' | ' + mdTableCell(dash) + ' |');
      }
      lines.push('');
      lines.push('| Planned (anchor) | Current (trail) |');
      lines.push('| --- | --- |');
      lines.push('| ' + mdTableCell(plannedCellS) + ' | ' + mdTableCell(etaCurrentMd || '—') + ' |');
      lines.push('');
    }

    function appendWorkSummaryVerticalMd(out, tasks, omitNewEffort) {
      var mainNum = 0;
      tasks.forEach(function (t) {
        mainNum += 1;
        var subNum = 0;
        function nextSubLabel() {
          subNum += 1;
          return String(mainNum) + '.' + String(subNum);
        }

        var noEffortMain = isTruthyFlag(t.no_effort_needed);
        var subsAll = t.subtasks || [];
        var subs = subsAll;
        var includedSubs = subs.filter(function (s) { return !subtaskHasDedicatedEffort(s); });
        var dedicatedSubs = subs.filter(function (s) { return subtaskHasDedicatedEffort(s); });

        var mainProgress = sortProgressUpdatesOldestFirst((t.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
        var mainRangeEffort = taskEffortInRangeMainAttributed(t, from, to);
        var cumulativeOutsideRange = taskEffortOutsideRangeMainAttributed(t, from, to);
        var spentMainAttrTotal = taskEffortSpentMainAttributed(t);
        var latestPlannedMain = getLatestPlannedEffortHours(t);
        var remainingMainOnly = latestPlannedMain - spentMainAttrTotal;
        var plannedEtaRaw = (t.eta_updates && t.eta_updates.length && t.eta_updates[0].old_eta) || t.assigned_date || t.eta || '';
        var plannedEtaCell = plannedEtaRaw ? formatDateDMYPlain(plannedEtaRaw) : '—';

        var projectLabel = linkifyConfluenceCell(t.project || 'Miscellaneous');
        var taskTitle = confluenceTitleWithProject(t.project, t.title || '(no title)');
        var plannedMd = noEffortMain ? mainTaskEffortChipValueWhenExempt(t) : buildPlannedEffortMd(t);
        var cumMd = String(cumulativeOutsideRange);
        var newMainStr = String(mainRangeEffort);
        var remMd = String(remainingMainOnly);
        var remCellMain = noEffortMain ? '—' :
          (remainingMainOnly < 0
            ? mdBoldInner(remMd + ' (over plan)')
            : mdTableCell(remMd));

        out.push('### ' + mainNum + '. ' + taskTitle);
        out.push('');
        out.push('*Project:* ' + projectLabel + ' · *Status:* ' + cfRangeStatusLabel(t, false));
        out.push('');

        pushEffortEtaSection(out, plannedMd, cumMd, newMainStr, remCellMain, omitNewEffort, plannedEtaCell, buildEtaCurrentMd(t));
        pushProgressConcernsVertical(out, mainProgress, t.concerns || [], omitNewEffort);
        pushTaskDetailsVertical(out, t.description);

        includedSubs.forEach(function (s) {
          var subUpdates = sortProgressUpdatesOldestFirst((s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
          var subEffort = subUpdates.reduce(function (sum, p) { return sum + progressEffortHours(p); }, 0);
          var plannedRawS = s.assigned_date || s.eta || '';
          var plannedCellS = plannedRawS ? formatDateDMYPlain(plannedRawS) : '—';
          out.push('#### ' + nextSubLabel() + ' Sub-task (included): ' + confluenceTitleWithProject(s.project, s.title || '(no title)'));
          out.push('');
          out.push('*Status:* ' + cfRangeStatusLabel(s, true));
          out.push('');
          pushEffortEtaIncludedSubSection(out, omitNewEffort, subEffort, plannedCellS, buildEtaCurrentMd(s));
          pushProgressConcernsVertical(out, subUpdates, s.concerns || [], omitNewEffort);
          pushTaskDetailsVertical(out, s.description);
        });

        dedicatedSubs.forEach(function (s) {
          var noEffortSub = isTruthyFlag(s.no_effort_needed);
          var subUpdates = sortProgressUpdatesOldestFirst((s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
          var subEffort = subUpdates.reduce(function (sum, p) { return sum + progressEffortHours(p); }, 0);
          var reqS = getLatestPlannedEffortHours(s);
          var spentS = subtaskEffortSpent(s);
          var cumulativeOutsideSub = subtaskEffortOutsideRange(s, from, to);
          var remS = reqS - spentS;
          var plannedRawS = s.assigned_date || s.eta || '';
          var plannedCellS = plannedRawS ? formatDateDMYPlain(plannedRawS) : '—';
          var remCellSub = noEffortSub ? '—' :
            (remS < 0 ? mdBoldInner(String(remS) + ' (over plan)') : mdTableCell(String(remS)));

          out.push('#### ' + nextSubLabel() + ' Sub-task: ' + confluenceTitleWithProject(s.project, s.title || '(no title)'));
          out.push('');
          out.push('*Status:* ' + cfRangeStatusLabel(s, true));
          out.push('');
          pushEffortEtaSection(out, noEffortSub ? '—' : buildPlannedEffortMd(s), String(cumulativeOutsideSub), String(subEffort), remCellSub, omitNewEffort, plannedCellS, buildEtaCurrentMd(s));
          pushProgressConcernsVertical(out, subUpdates, s.concerns || [], omitNewEffort);
          pushTaskDetailsVertical(out, s.description);
        });

        out.push('---');
        out.push('');
      });
    }

    var titleRange = formatDateDMYPlain(from) + ' to ' + formatDateDMYPlain(to);
    var lines = [];
    lines.push('# Work Summary: ' + titleRange);
    lines.push('');
    lines.push('Exported from **FlowAssist** for **Confluence Cloud** (markdown shortcuts). [Atlassian’s markdown reference](https://support.atlassian.com/confluence-cloud/docs/available-markdown-commands/) does **not** include text color — use the editor **Text color** control after paste if you want color. **Bold** in an ETA or effort chain marks a changed step; **bold** remaining means over plan. Same data and filters as the HTML/CSS export.');
    lines.push('');
    lines.push('## Bandwidth');
    lines.push('');
    lines.push('*Days equivalent at ' + String(exportHpd) + ' h/day.*');
    lines.push('');
    projKeys.forEach(function (k) {
      var d = projectHours[k] / exportHpd;
      lines.push('- **' + cfPlainForTable(k) + ':** ' + formatExportDays(d));
    });
    lines.push('- **Miscellaneous:** ' + formatExportDays(miscHours / exportHpd));
    lines.push('- **OOO:** ' + formatExportDays(oooDaysTotal));
    if (oooEntriesMd.length) {
      lines.push('');
      lines.push('*OOO entries (same export date range):*');
      oooEntriesMd.forEach(function (e) {
        var wd = weekdayShortFromYMD(e.date);
        var ds = formatDateDMYPlain(e.date);
        var typ = (e.type || '').toLowerCase();
        var detail;
        if (typ === 'full') detail = 'full day';
        else {
          var ph = parseFloat(e.hoursOff);
          if (isNaN(ph)) ph = 0;
          detail = String(ph).replace(/\.0$/, '') + ' h off';
        }
        lines.push('- ' + wd + ' · ' + ds + ' · **' + cfPlainForTable(e.reason || 'Other') + '** · ' + detail);
      });
    }
    lines.push('');

    lines.push('## Tasks with progress in range');
    lines.push('');
    if (exportActiveTasks.length) {
      appendWorkSummaryVerticalMd(lines, exportActiveTasks, false);
    } else {
      lines.push('*No tasks with progress in this range (after export filters).*');
      lines.push('');
    }

    if (exportIdleTasks.length) {
      lines.push('## Tasks with no progress');
      lines.push('');
      lines.push('*Same scope as the on-screen idle section: no “new effort” line; planned / cumulative / remaining only.*');
      lines.push('');
      appendWorkSummaryVerticalMd(lines, exportIdleTasks, true);
    }

    lines.push('---');
    lines.push('');
    lines.push('*End of export*');
    return lines.join('\n');
  }

  /** Plain one-line text for daily export (no rich / markdown emphasis). */
  function dailyExportPlainLine(raw) {
    return String(raw || '')
      .replace(/\r\n|\n|\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function dailyExportEscapeMdInline(s) {
    return String(s || '').replace(/\*/g, '\\*');
  }

  function concernTouchesDay(c, day) {
    if (!c || !day) return false;
    if (c.logged_date === day) return true;
    if (c.addressed_date && c.addressed_date === day) return true;
    return false;
  }

  /** True if the concern is still open at end of `day` (logged on or before, not addressed until after `day`). */
  function concernIsOpenAsOfDay(c, day) {
    if (!c || !day) return false;
    var logged = c.logged_date || '';
    if (!logged || logged > day) return false;
    if (c.status === 'Addressed') {
      var ad = c.addressed_date || '';
      if (!ad) return false;
      return ad > day;
    }
    return true;
  }

  function mergeConcernsDeduped(primary, secondary) {
    var seen = {};
    var out = [];
    function keyOf(c) {
      return c && c.id ? String(c.id) : ((c.logged_date || '') + '\0' + (c.description || ''));
    }
    function pushList(arr) {
      (arr || []).forEach(function (c) {
        var k = keyOf(c);
        if (seen[k]) return;
        seen[k] = true;
        out.push(c);
      });
    }
    pushList(primary);
    pushList(secondary);
    return out;
  }

  /** Suffix for daily export: addressed today, or ongoing (open before, still affecting progress). */
  function dailyConcernSuffix(c, dayStr) {
    if (c.status === 'Addressed' && c.addressed_date === dayStr) return ' *(addressed)*';
    if (c.logged_date === dayStr) return '';
    if (concernIsOpenAsOfDay(c, dayStr)) return ' *(ongoing)*';
    return '';
  }

  function formatDailyExportDateHeading(ymd) {
    var d = parseYMD(ymd);
    if (!d) return ymd;
    return d.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  /**
   * Per calendar day in range: Progress (tasks with progress that day only) and Concerns (logged or addressed that day,
   * plus any still-open concerns logged on or before that day — marked *(ongoing)*).
   * No effort, ETA, or bandwidth. Returns markdown source and parallel HTML for the Formatted tab.
   */
  function buildDailyVersionDocuments(meta) {
    var from = meta.from;
    var to = meta.to;
    function statusRankDaily(s) {
      if (s === 'Done' || s === 'Completed') return 0;
      if (s === 'Ongoing') return 1;
      if (s === 'Open') return 2;
      return 3;
    }
    var tasks = (meta.activeTasks || []).concat(meta.idleTasks || []).slice().sort(function (a, b) {
      var ra = statusRankDaily(a.status);
      var rb = statusRankDaily(b.status);
      if (ra !== rb) return ra - rb;
      return (a.title || '').localeCompare(b.title || '');
    });

    var mdParts = [];
    var htmlParts = [];
    var noteMd =
      '*Note: One section per calendar day in your From–To range. Progress lists only tasks with entries on that day. Concerns include entries logged or addressed that day, and any still-open (un-addressed) concerns logged on or before that day — those are marked *(ongoing)* because they still affect progress. No effort, ETA, or time spent.*';
    var noteHtml =
      '<p class="daily-formatted-note"><em>Note:</em> One section per calendar day in your From–To range. Progress lists only tasks with entries on that day. Concerns include entries logged or addressed that day, and any still-open concerns logged on or before that day (marked <em>(ongoing)</em> — still affecting progress). No effort, ETA, or time spent.</p>';

    mdParts.push(noteMd);
    mdParts.push('');
    htmlParts.push(noteHtml);

    function collectDay(day) {
      var progItems = [];
      tasks.forEach(function (t) {
        var mainP = sortProgressUpdatesOldestFirst((t.progress_updates || []).filter(function (p) {
          return p.date_added === day;
        }));
        var subs = [];
        (t.subtasks || []).forEach(function (s) {
          if (isTruthyFlag(s.exclude_from_summary)) return;
          var sp = sortProgressUpdatesOldestFirst((s.progress_updates || []).filter(function (p) {
            return p.date_added === day;
          }));
          if (sp.length) {
            subs.push({
              title: s.title || '(sub-task)',
              lines: sp.map(function (p) {
                return dailyExportPlainLine(p.text);
              })
            });
          }
        });
        if (!mainP.length && !subs.length) return;
        progItems.push({
          title: t.title || '(no title)',
          mainLines: mainP.map(function (p) {
            return dailyExportPlainLine(p.text);
          }),
          subs: subs
        });
      });

      var concernItems = [];
      tasks.forEach(function (t) {
        var mainTouched = (t.concerns || []).filter(function (c) {
          return concernTouchesDay(c, day);
        });
        var mainOngoing = (t.concerns || []).filter(function (c) {
          return concernIsOpenAsOfDay(c, day);
        });
        var mainC = mergeConcernsDeduped(mainTouched, mainOngoing);
        var subCs = [];
        (t.subtasks || []).forEach(function (s) {
          if (isTruthyFlag(s.exclude_from_summary)) return;
          var subTouched = (s.concerns || []).filter(function (c) {
            return concernTouchesDay(c, day);
          });
          var subOngoing = (s.concerns || []).filter(function (c) {
            return concernIsOpenAsOfDay(c, day);
          });
          var cs = mergeConcernsDeduped(subTouched, subOngoing);
          if (cs.length) subCs.push({ title: s.title || '(sub-task)', concerns: cs });
        });
        if (!mainC.length && !subCs.length) return;
        concernItems.push({
          title: t.title || '(no title)',
          mainConcerns: mainC,
          subConcerns: subCs
        });
      });

      return { progItems: progItems, concernItems: concernItems };
    }

    function renderProgressMd(items) {
      var lines = [];
      var tn = 0;
      items.forEach(function (item) {
        tn++;
        lines.push(tn + '. **' + dailyExportEscapeMdInline(item.title) + '**');
        var sn = 0;
        item.mainLines.forEach(function (line) {
          sn++;
          lines.push('   ' + sn + '. ' + dailyExportEscapeMdInline(line || '—'));
        });
        item.subs.forEach(function (sub) {
          sn++;
          lines.push('   ' + sn + '. **' + dailyExportEscapeMdInline(sub.title) + '**');
          sub.lines.forEach(function (line, i) {
            lines.push('      ' + String.fromCharCode(97 + i) + '. ' + dailyExportEscapeMdInline(line || '—'));
          });
        });
      });
      return lines;
    }

    function renderProgressHtml(items) {
      if (!items.length) {
        return '<p class="daily-formatted-muted">No progress logged this day.</p>';
      }
      var h = '<ol class="daily-formatted-ol daily-formatted-ol-root">';
      items.forEach(function (item) {
        h += '<li><strong>' + escapeHtml(item.title) + '</strong>';
        h += '<ol class="daily-formatted-ol daily-formatted-ol-nested">';
        item.mainLines.forEach(function (line) {
          h += '<li>' + escapeHtml(line || '—') + '</li>';
        });
        item.subs.forEach(function (sub) {
          h += '<li><strong>' + escapeHtml(sub.title) + '</strong>';
          h += '<ol class="daily-formatted-ol daily-formatted-ol-alpha" type="a">';
          sub.lines.forEach(function (line) {
            h += '<li>' + escapeHtml(line || '—') + '</li>';
          });
          h += '</ol></li>';
        });
        h += '</ol></li>';
      });
      h += '</ol>';
      return h;
    }

    function renderConcernsMd(items, dayStr) {
      var lines = [];
      var cn = 0;
      items.forEach(function (item) {
        cn++;
        lines.push(cn + '. **' + dailyExportEscapeMdInline(item.title) + '**');
        var n = 0;
        item.mainConcerns.forEach(function (c) {
          n++;
          lines.push('   ' + n + '. ' + dailyExportEscapeMdInline(dailyExportPlainLine(c.description)) + dailyConcernSuffix(c, dayStr));
        });
        item.subConcerns.forEach(function (sc) {
          n++;
          lines.push('   ' + n + '. **' + dailyExportEscapeMdInline(sc.title) + '**');
          sc.concerns.forEach(function (c, i) {
            lines.push('      ' + (i + 1) + '. ' + dailyExportEscapeMdInline(dailyExportPlainLine(c.description)) + dailyConcernSuffix(c, dayStr));
          });
        });
      });
      return lines;
    }

    function renderConcernsHtml(items, dayStr) {
      if (!items.length) {
        return '<p class="daily-formatted-muted">None for this day.</p>';
      }
      var h = '<ol class="daily-formatted-ol daily-formatted-ol-root">';
      items.forEach(function (item) {
        h += '<li><strong>' + escapeHtml(item.title) + '</strong>';
        h += '<ol class="daily-formatted-ol daily-formatted-ol-nested">';
        item.mainConcerns.forEach(function (c) {
          var suf = '';
          if (c.status === 'Addressed' && c.addressed_date === dayStr) suf = ' <em>(addressed)</em>';
          else if (c.logged_date !== dayStr && concernIsOpenAsOfDay(c, dayStr)) suf = ' <em>(ongoing)</em>';
          h += '<li>' + escapeHtml(dailyExportPlainLine(c.description)) + suf + '</li>';
        });
        item.subConcerns.forEach(function (sc) {
          h += '<li><strong>' + escapeHtml(sc.title) + '</strong>';
          h += '<ol class="daily-formatted-ol daily-formatted-ol-nested">';
          sc.concerns.forEach(function (c) {
            var suf = '';
            if (c.status === 'Addressed' && c.addressed_date === dayStr) suf = ' <em>(addressed)</em>';
            else if (c.logged_date !== dayStr && concernIsOpenAsOfDay(c, dayStr)) suf = ' <em>(ongoing)</em>';
            h += '<li>' + escapeHtml(dailyExportPlainLine(c.description)) + suf + '</li>';
          });
          h += '</ol></li>';
        });
        h += '</ol></li>';
      });
      h += '</ol>';
      return h;
    }

    var day = from;
    var anyDay = false;
    while (true) {
      var data = collectDay(day);
      var hasProg = data.progItems.length > 0;
      var hasConc = data.concernItems.length > 0;
      if (hasProg || hasConc) {
        anyDay = true;
        var head = formatDailyExportDateHeading(day);
        mdParts.push('## ' + head);
        mdParts.push('');
        mdParts.push('**Progress**');
        mdParts.push('');
        if (hasProg) {
          mdParts.push.apply(mdParts, renderProgressMd(data.progItems));
        } else {
          mdParts.push('*No progress logged this day.*');
        }
        mdParts.push('');
        mdParts.push('**Concerns**');
        mdParts.push('');
        if (hasConc) {
          mdParts.push.apply(mdParts, renderConcernsMd(data.concernItems, day));
        } else {
          mdParts.push('*None for this day.*');
        }
        mdParts.push('');
        mdParts.push('---');
        mdParts.push('');

        htmlParts.push('<article class="daily-formatted-day">');
        htmlParts.push('<h2 class="daily-formatted-h2">' + escapeHtml(head) + '</h2>');
        htmlParts.push('<h3 class="daily-formatted-h3">Progress</h3>');
        htmlParts.push(hasProg ? renderProgressHtml(data.progItems) : '<p class="daily-formatted-muted">No progress logged this day.</p>');
        htmlParts.push('<h3 class="daily-formatted-h3">Concerns</h3>');
        htmlParts.push(hasConc ? renderConcernsHtml(data.concernItems, day) : '<p class="daily-formatted-muted">None for this day.</p>');
        htmlParts.push('</article>');
      }
      if (day === to) break;
      day = addDays(day, 1);
    }

    if (!anyDay) {
      return {
        markdown: noteMd + '\n\n*No progress or concerns to show in this range (no per-day progress and no open or day-relevant concerns for included tasks).*',
        html: '<div class="daily-formatted-root">' + noteHtml + '<p class="daily-formatted-muted">No progress or concerns to show in this range.</p></div>'
      };
    }

    return {
      markdown: mdParts.join('\n'),
      html: '<div class="daily-formatted-root">' + htmlParts.join('') + '</div>'
    };
  }

  function renderSummaryExportHtmlCssFields(parts) {
    return (
      '<div class="summary-export-open-browser-row">' +
      '<button type="button" class="btn-secondary summary-open-in-browser-btn">Open In Browser</button>' +
      '</div>' +
      '<div class="summary-export-field-header">' +
        '<label class="summary-export-field-label">Full HTML document (inline styles)</label>' +
        '<button type="button" class="btn-copy-code" data-copy-target="combined" title="Copy to clipboard">⧉ Copy</button>' +
      '</div>' +
      '<textarea class="summary-export-text summary-export-text-combined" spellcheck="false">' + escapeHtml(parts.document) + '</textarea>' +
      '<h4 class="summary-export-separated-heading">HTML–CSS separated</h4>' +
      '<p class="summary-export-separated-note muted">For Confluence Mosaic and similar renderers: paste HTML into the HTML macro and styles into a separate stylesheet.</p>' +
      '<div class="summary-export-field-header">' +
        '<label class="summary-export-field-label">HTML only (body content)</label>' +
        '<button type="button" class="btn-copy-code" data-copy-target="html" title="Copy to clipboard">⧉ Copy</button>' +
      '</div>' +
      '<textarea class="summary-export-text summary-export-text-split" data-copy-id="html" spellcheck="false">' + escapeHtml(parts.htmlOnly) + '</textarea>' +
      '<div class="summary-export-field-header">' +
        '<label class="summary-export-field-label">CSS only</label>' +
        '<button type="button" class="btn-copy-code" data-copy-target="css" title="Copy to clipboard">⧉ Copy</button>' +
      '</div>' +
      '<textarea class="summary-export-text summary-export-text-split" data-copy-id="css" spellcheck="false">' + escapeHtml(parts.cssOnly) + '</textarea>'
    );
  }

  function wireSummaryExportHtmlTabs(container) {
    if (!container) return;
    var tabBar = container.querySelector('.summary-export-tab-bar');
    if (!tabBar) return;
    tabBar.addEventListener('click', function (ev) {
      var tab = ev.target.closest('.summary-export-tab');
      if (!tab || !tabBar.contains(tab)) return;
      var id = tab.getAttribute('data-summary-tab');
      if (!id) return;
      container.querySelectorAll('.summary-export-tab').forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      container.querySelectorAll('.summary-export-tab-panel').forEach(function (p) {
        var show = p.getAttribute('data-summary-panel') === id;
        p.classList.toggle('is-active', show);
      });
    });
  }

  function wireSummaryOpenInBrowser(wrap, docFull, docBrief) {
    if (!wrap) return;
    var fullBtn = wrap.querySelector('[data-summary-panel="full"] .summary-open-in-browser-btn');
    var briefBtn = wrap.querySelector('[data-summary-panel="brief"] .summary-open-in-browser-btn');
    function openDoc(html) {
      if (!window.taskAPI || typeof window.taskAPI.openHtmlInBrowser !== 'function') {
        showProfileError(
          'Open in browser',
          'This action is only available in the FlowAssist desktop app.',
          ''
        );
        return;
      }
      window.taskAPI.openHtmlInBrowser(html).then(function (res) {
        if (res && res.success) return;
        showProfileError(
          'Could not open in browser',
          (res && res.message) ? String(res.message) : 'Unknown error.',
          ''
        );
      });
    }
    if (fullBtn) fullBtn.addEventListener('click', function () { openDoc(docFull); });
    if (briefBtn) briefBtn.addEventListener('click', function () { openDoc(docBrief); });
  }

  function wireCopyCodeButtons(container) {
    if (!container) return;
    container.querySelectorAll('.btn-copy-code').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-copy-target');
        var panel = btn.closest('.summary-export-tab-panel');
        if (!panel) return;
        var textarea;
        if (target === 'combined') {
          textarea = panel.querySelector('.summary-export-text-combined');
        } else {
          textarea = panel.querySelector('[data-copy-id="' + target + '"]');
        }
        if (!textarea) return;
        navigator.clipboard.writeText(textarea.value).then(function () {
          var orig = btn.innerHTML;
          btn.innerHTML = SVG_ICON_CHECK + ' Copied';
          btn.classList.add('btn-copy-success');
          setTimeout(function () {
            btn.innerHTML = orig;
            btn.classList.remove('btn-copy-success');
          }, 1500);
        });
      });
    });
  }

  function exportSummary() {
    if (!state.summaryGenerated || !state.lastSummaryMeta) return;
    var exOpt = getExportOptions();
    var exportProgressOpts = { showProgressEntryHours: exOpt.showProgressEntryHours };
    var format = summaryExportFormat ? summaryExportFormat.value : 'htmlcss';
    if (format === 'daily-version-markdown') {
      var dailyDoc = buildDailyVersionDocuments(state.lastSummaryMeta);
      var dailyWrap = document.createElement('div');
      dailyWrap.className = 'summary-export-daily-tabbed';
      dailyWrap.innerHTML =
        '<div class="summary-export-tab-bar" role="tablist" aria-label="Daily export format">' +
        '<button type="button" class="summary-export-tab is-active" role="tab" aria-selected="true" data-summary-tab="daily-md">Markdown</button>' +
        '<button type="button" class="summary-export-tab" role="tab" aria-selected="false" data-summary-tab="daily-fmt">Formatted</button>' +
        '</div>' +
        '<div class="summary-export-tab-panel is-active" role="tabpanel" data-summary-panel="daily-md">' +
        '<textarea class="summary-export-text" spellcheck="false">' + escapeHtml(dailyDoc.markdown) + '</textarea></div>' +
        '<div class="summary-export-tab-panel" role="tabpanel" data-summary-panel="daily-fmt">' +
        '<p class="daily-formatted-copy-hint muted">Select the content below (or use Ctrl+A while focused) and copy to paste rich text into email, Word, or similar apps.</p>' +
        '<div class="summary-daily-formatted-body" contenteditable="false" tabindex="0">' + dailyDoc.html + '</div></div>';
      summaryOutput.innerHTML = '';
      summaryOutput.appendChild(dailyWrap);
      wireSummaryExportHtmlTabs(dailyWrap);
      return;
    }
    if (format === 'confluence-markdown' || format === 'markdown') {
      var mdDoc = buildSummaryExportConfluenceMarkdown(state.lastSummaryMeta, exportProgressOpts);
      summaryOutput.innerHTML = '<textarea class="summary-export-text" spellcheck="false">' + escapeHtml(mdDoc) + '</textarea>';
      return;
    }
    var partsFull = buildSummaryExportHtmlParts(state.lastSummaryMeta, exportProgressOpts);
    var partsBrief = buildSummaryExportHtmlParts(state.lastSummaryMeta, Object.assign({ brief: true }, exportProgressOpts));
    var wrap = document.createElement('div');
    wrap.className = 'summary-export-htmlcss summary-export-htmlcss-tabbed';
    wrap.innerHTML =
      '<div class="summary-export-tab-bar" role="tablist" aria-label="Summary export format">' +
      '<button type="button" class="summary-export-tab is-active" role="tab" aria-selected="true" data-summary-tab="full">Full Summary</button>' +
      '<button type="button" class="summary-export-tab" role="tab" aria-selected="false" data-summary-tab="brief">Brief Summary</button>' +
      '</div>' +
      '<div class="summary-export-tab-panel is-active" role="tabpanel" data-summary-panel="full">' + renderSummaryExportHtmlCssFields(partsFull) + '</div>' +
      '<div class="summary-export-tab-panel" role="tabpanel" data-summary-panel="brief">' + renderSummaryExportHtmlCssFields(partsBrief) + '</div>';
    summaryOutput.innerHTML = '';
    summaryOutput.appendChild(wrap);
    wireSummaryExportHtmlTabs(wrap);
    wireSummaryOpenInBrowser(wrap, partsFull.document, partsBrief.document);
    wireCopyCodeButtons(wrap);
  }

  function generateSummary() {
    var from = summaryFrom.value;
    var to = summaryTo.value;
    if (!from || !to) {
      summaryOutput.innerHTML = '<p class="muted">Please set both From and To dates.</p>';
      return;
    }
    var tasks = getTasks().map(normalizeTask).filter(function (t) { return !isTruthyFlag(t.exclude_from_summary); });

    function inRange(dateStr) {
      return dateStr && dateStr >= from && dateStr <= to;
    }
    function statusRank(s) {
      if (s === 'Done' || s === 'Completed') return 0;
      if (s === 'Ongoing') return 1;
      if (s === 'Open') return 2;
      return 3;
    }
    function statusClass(s) {
      return (s || 'open').toLowerCase().replace(/\s/g, '-');
    }
    var hpdSetting = parseFloat(getSettings().workingHoursPerDay);
    if (isNaN(hpdSetting) || hpdSetting <= 0) hpdSetting = 8;
    function formatHoursAndDays(hours) {
      var h = hours || 0;
      var days = h / hpdSetting;
      return h.toFixed(1).replace(/\.0$/, '') + ' hrs (~' + days.toFixed(1).replace(/\.0$/, '') + ' days)';
    }

    function hasProgressInRange(t) {
      if ((t.progress_updates || []).some(function (p) { return inRange(p.date_added); })) return true;
      var subs = t.subtasks || [];
      for (var i = 0; i < subs.length; i++) {
        if (isTruthyFlag(subs[i].exclude_from_summary)) continue;
        if ((subs[i].progress_updates || []).some(function (p) { return inRange(p.date_added); })) return true;
      }
      return false;
    }

    function taskOpenedByRangeEnd(t) { return wasOpenedByEndOfRange(t, to); }
    function taskDoneOrDroppedBeforeRange(t) { return wasCompletedOrDroppedBefore(t, from); }

    var eligibleTasks = tasks.filter(function (t) {
      if (!taskOpenedByRangeEnd(t)) return false;
      if (taskDoneOrDroppedBeforeRange(t)) return false;
      return true;
    });

    var sortedTasks = eligibleTasks.slice().sort(function (a, b) {
      var ra = statusRank(a.status);
      var rb = statusRank(b.status);
      if (ra !== rb) return ra - rb;
      return (a.title || '').localeCompare(b.title || '');
    });

    var activeTasks = sortedTasks.filter(hasProgressInRange);
    var idleTasks = sortedTasks.filter(function (t) {
      if (hasProgressInRange(t)) return false;
      var res = resolveStatusInRange(t, from, to);
      if (res.statusAtEnd === 'Done' || res.statusAtEnd === 'Dropped') return false;
      return true;
    });

    var openOngoingMain = activeTasks.filter(function (t) {
      var res = resolveStatusInRange(t, from, to);
      return res.statusAtEnd === 'Open' || res.statusAtEnd === 'Ongoing';
    });
    var completedInRange = activeTasks.filter(function (t) {
      var res = resolveStatusInRange(t, from, to);
      return res.statusAtEnd === 'Done' || res.statusAtEnd === 'Dropped';
    });

    var rangeLabel = escapeHtml(from) + ' to ' + escapeHtml(to);

    var bw = computeBandwidthUtilized(from, to, getSettings());
    var utilPct = bw.capacity > 0 ? ((bw.spent / bw.capacity) * 100).toFixed(1) : '—';
    var bandwidthHtml =
      '<section class="summary-section summary-bandwidth">' +
        '<h4 class="summary-section-title">Bandwidth Utilized</h4>' +
        '<p class="summary-range">' + rangeLabel + '</p>' +
        '<div class="summary-table-wrap">' +
          '<table class="summary-table summary-bandwidth-table">' +
            '<tbody>' +
              '<tr><th>Total hours spent (in range)</th><td><strong>' + bw.spent.toFixed(1) + ' hrs</strong></td></tr>' +
              '<tr><th>Total working hours available (in range)</th><td><strong>' + bw.capacity.toFixed(1) + ' hrs</strong></td></tr>' +
              '<tr><th>Utilization</th><td>' + utilPct + (utilPct === '—' ? '' : '%') + '</td></tr>' +
              '<tr><th>Ideal hours / working day</th><td>' + bw.hrsPerDay + ' hrs</td></tr>' +
              '<tr><th>PTO (dates)</th><td>' + escapeHtml(bw.ptoStr) + '</td></tr>' +
              '<tr><th>Sick (dates)</th><td>' + escapeHtml(bw.sickStr) + '</td></tr>' +
              '<tr><th>Other time off (dates)</th><td>' + escapeHtml(bw.otherStr) + '</td></tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</section>';

    function summaryRangeStatusHtml(resolved) {
      if (!resolved.transitions.length) {
        var label = resolved.statusAtEnd;
        return '<span class="task-status-pill ' + statusClass(label) + '">' + escapeHtml(label) + '</span>';
      }
      var parts = ['<span class="task-status-pill ' + statusClass(resolved.statusAtStart) + '">' + escapeHtml(resolved.statusAtStart) + '</span>'];
      resolved.transitions.forEach(function (tr) {
        parts.push(' <span class="summary-status-arrow">→</span> ');
        parts.push('<span class="task-status-pill ' + statusClass(tr.to) + '">' + escapeHtml(tr.to) + '</span>');
      });
      return parts.join('');
    }

    function rangeFilteredSubtasks(subs) {
      return subs.filter(function (s) {
        if (isTruthyFlag(s.exclude_from_summary)) return false;
        if (!wasOpenedByEndOfRange(s, to)) return false;
        if (wasCompletedOrDroppedBefore(s, from)) return false;
        return true;
      });
    }

    // ---- Cumulative Summary (styled, only tasks with progress in range)
    var cumulativeTableRows = activeTasks.map(function (t) {
      var subs = rangeFilteredSubtasks(t.subtasks || []);
      var subDone = subs.filter(function (s) { var r = resolveSubtaskStatusInRange(s, from, to); return r.statusAtEnd === 'Done'; }).length;
      var subOngoing = subs.filter(function (s) { var r = resolveSubtaskStatusInRange(s, from, to); return r.statusAtEnd === 'Ongoing'; }).length;
      var subOpen = subs.filter(function (s) { var r = resolveSubtaskStatusInRange(s, from, to); return r.statusAtEnd === 'Open'; }).length;
      var mainSpent = taskEffortSpentMainAttributed(t);
      var subSpent = taskEffortSpentSubOnlyTask(t);
      var effortCell =
        '<div class="summary-effort-split"><span class="summary-effort-split-label">Main</span> ' + escapeHtml(formatHoursAndDays(mainSpent)) + '</div>' +
        '<div class="summary-effort-split"><span class="summary-effort-split-label">Sub</span> ' + escapeHtml(formatHoursAndDays(subSpent)) + '</div>';
      var resolved = resolveStatusInRange(t, from, to);
      var newEffortInRange = taskEffortInRangeMainAttributed(t, from, to) + taskEffortInRangeSubDedicated(t, from, to);
      var rowClass = newEffortInRange > 0 ? ' class="summary-has-new-effort"' : '';
      return '<tr' + rowClass + '><td>' + summaryRangeStatusHtml(resolved) + '</td>' +
        '<td class="summary-cumulative-task-cell"><div class="summary-cell-flex">' + summaryProjectPillHtml(t.project) + escapeHtml(t.title || '(no title)') + '</div></td>' +
        '<td>' + subDone + ' / ' + subOngoing + ' / ' + subOpen + '</td>' +
        '<td>' + effortCell + '</td></tr>';
    }).join('');

    var cumulativeHtml =
      '<section class="summary-section summary-cumulative">' +
        '<h4 class="summary-section-title">Cumulative Summary</h4>' +
        '<p class="summary-range">' + rangeLabel + '</p>' +
        '<div class="summary-stats">' +
          '<span class="summary-stat"><strong>' + openOngoingMain.length + '</strong> main tasks Open/Ongoing</span>' +
          '<span class="summary-stat"><strong>' + completedInRange.length + '</strong> main tasks completed</span>' +
        '</div>' +
        '<div class="summary-table-wrap">' +
          '<table class="summary-table">' +
            '<thead><tr><th>Status</th><th>Main Task</th><th>Subtasks (Done / Ongoing / Open)</th><th>Effort spent (main / sub-tasks)</th></tr></thead>' +
            '<tbody>' + cumulativeTableRows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</section>';

    // ---- Detailed Summary (cards only for tasks with progress in range)
    var detailedCards = [];
    activeTasks.forEach(function (t, idx) {
      var subs = rangeFilteredSubtasks(t.subtasks || []);
      var mainProgressInRange = sortProgressUpdatesOldestFirst((t.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
      var subProgressBySub = subs.map(function (s) {
        var updates = sortProgressUpdatesOldestFirst((s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
        return { subtask: s, updates: updates };
      });
      var hasSubProgress = subProgressBySub.some(function (x) { return x.updates.length; });
      var etaUpdatesInRange = (t.eta_updates || []).filter(function (u) { return inRange(u.date_recorded); });
      var effortUpdatesInRange = (t.effort_updates || []).filter(function (u) { return inRange(u.date_recorded); });

      var rangeConcernsMain = filterConcernsForRange(t.concerns, from, to);
      var activeConcernsMain = rangeConcernsMain.filter(function (c) { return !isConcernAddressedInRange(c, from, to); });
      var addressedConcernsMainInRange = rangeConcernsMain.filter(function (c) { return isConcernAddressedInRange(c, from, to); });
      var activeConcernsSubs = [];
      var addressedConcernsSubsInRange = [];
      subs.forEach(function (s) {
        var rc = filterConcernsForRange(s.concerns, from, to);
        rc.forEach(function (c) {
          if (isConcernAddressedInRange(c, from, to)) {
            addressedConcernsSubsInRange.push({ subtask: s, concern: c });
          } else {
            activeConcernsSubs.push({ subtask: s, concern: c });
          }
        });
      });

      var etaLabel = t.eta || '—';
      var noEffortMain = isTruthyFlag(t.no_effort_needed);
      var latestPlannedMain = getLatestPlannedEffortHours(t);
      var effortReq = latestPlannedMain;
      var mainAttrInRange = taskEffortInRangeMainAttributed(t, from, to);
      var subOnlyInRange = taskEffortInRangeSubDedicated(t, from, to);
      var cumulativeOutsideMain = taskEffortOutsideRangeMainAttributed(t, from, to);
      var spentMainAttrTotal = taskEffortSpentMainAttributed(t);
      var remainingMainOnly = latestPlannedMain - spentMainAttrTotal;
      var remainingMainClass = remainingMainOnly < 0 ? 'summary-remaining-negative' : '';
      var subsNoProgress = subs.filter(function (s, i) { return !subProgressBySub[i].updates.length; });

      var resolved = resolveStatusInRange(t, from, to);
      var cardHighlightClass = mainAttrInRange > 0 ? ' summary-has-new-effort' : '';
      var card = '<div class="summary-task-card' + cardHighlightClass + '">' +
        '<h5 class="summary-task-title">' + summaryProjectPillHtml(t.project) + '<span class="summary-task-title-main">' + escapeHtml(t.title || '(no title)') + '</span> ' + summaryRangeStatusHtml(resolved) + '</h5>' +
        '<div class="summary-meta-grid">' +
          '<span class="summary-meta"><span class="summary-meta-label">Project</span><span class="summary-meta-value">' +
          ((t.project != null && String(t.project).trim()) ? escapeHtml(String(t.project).trim()) : '—') +
          '</span></span>' +
          '<span class="summary-meta"><span class="summary-meta-label">ETA</span><span class="summary-meta-value">' + escapeHtml(etaLabel) + '</span></span>' +
          '<span class="summary-meta"><span class="summary-meta-label">Total Planned Effort</span><span class="summary-meta-value">' +
          (noEffortMain ? escapeHtml(mainTaskEffortChipValueWhenExempt(t)) : effortReq + ' hrs') +
          '</span></span>' +
          '<span class="summary-meta"><span class="summary-meta-label">Cumulative Effort</span><span class="summary-meta-value">' + cumulativeOutsideMain + ' hrs</span></span>' +
          '<span class="summary-meta"><span class="summary-meta-label">New Effort Spent</span><span class="summary-meta-value">' + mainAttrInRange + ' hrs</span></span>' +
          '<span class="summary-meta"><span class="summary-meta-label">Total Remaining Effort</span><span class="summary-meta-value ' + remainingMainClass + '">' + (noEffortMain ? '—' : remainingMainOnly + ' hrs') + '</span></span>' +
        '</div>';

      var mainProgressNewEffortHrs = mainProgressInRange.reduce(function (sum, p) {
        return sum + (Number(p.effort_consumed_hours) || 0);
      }, 0);
      var mainProgBlockClass = 'summary-main-progress-block' + (mainProgressNewEffortHrs > 0 ? ' summary-has-new-effort' : '');

      card += '<div class="summary-block-head">Progress on main task</div>';
      card += '<div class="' + mainProgBlockClass + '">';
      if (mainProgressInRange.length) {
        card += '<ol class="summary-list summary-progress-list">';
        mainProgressInRange.forEach(function (p, i) {
          card += renderSummaryProgressLiHtml(p, i, 3000);
        });
        card += '</ol>';
      } else {
        card += '<p class="summary-no-progress">No progress made.</p>';
      }
      card += '</div>';
      card += '<p class="summary-total-effort">Total main task effort (in range): <strong>' + mainAttrInRange + ' hrs</strong></p>';

      if (hasSubProgress) {
        card += '<div class="summary-block-head">Sub-task progress</div>';
        subProgressBySub.forEach(function (entry) {
          if (!entry.updates.length) return;
          var s = entry.subtask;
          var subNewEffortHrs = entry.updates.reduce(function (sum, p) {
            return sum + (Number(p.effort_consumed_hours) || 0);
          }, 0);
          var subBlockClass = 'summary-subtask-progress-block' + (subNewEffortHrs > 0 ? ' summary-has-new-effort' : '');
          card += '<div class="' + subBlockClass + '"><div class="summary-subtask-name">' + summaryProjectPillHtml(s.project) + '<span>' + escapeHtml(s.title || '(no title)') + '</span>' + (!subtaskHasDedicatedEffort(s) ? summaryIncludedPillHtml() : '') + '</div><ol class="summary-list summary-sublist">';
          entry.updates.forEach(function (p, i) {
            card += renderSummaryProgressLiHtml(p, i, 3000);
          });
          card += '</ol></div>';
        });
        card += '<p class="summary-total-effort">Total sub-task effort (in range): <strong>' + subOnlyInRange + ' hrs</strong></p>';
      }

      if (subsNoProgress.length) {
        card += '<div class="summary-block-head">Sub-tasks with no progress</div><ul class="summary-list summary-plain-list">';
        subsNoProgress.forEach(function (s) {
          card += '<li class="summary-list-task-line">' + summaryProjectPillHtml(s.project) + escapeHtml(s.title || '(no title)') + (!subtaskHasDedicatedEffort(s) ? summaryIncludedPillHtml() : '') + '</li>';
        });
        card += '</ul>';
      }

      if (subs.length) {
        card += '<div class="summary-block-head">Sub-task ETA / Effort</div><div class="summary-table-wrap summary-subtable-effort-wrap"><table class="summary-table summary-subtable summary-subtable-effort"><thead><tr>' +
          '<th>Sub-task</th><th>Status</th><th>ETA</th>' +
          '<th>Total Planned Effort</th><th>Cumulative Effort</th><th>New Effort Spent</th><th>Total Remaining Effort</th>' +
          '</tr></thead><tbody>';
        subs.forEach(function (s) {
          var etaS = s.eta || '—';
          var noEffortSub = isTruthyFlag(s.no_effort_needed);
          var reqS = getLatestPlannedEffortHours(s);
          var spentS = subtaskEffortSpent(s);
          var subUpdatesInRange = (s.progress_updates || []).filter(function (p) { return inRange(p.date_added); });
          var newSubInRange = subUpdatesInRange.reduce(function (sum, p) {
            return sum + progressEffortHours(p);
          }, 0);
          var cumulativeOutsideSub = subtaskEffortOutsideRange(s, from, to);
          var remS = reqS - spentS;
          var remSClass = remS < 0 ? 'summary-remaining-negative' : '';
          var subResolved = resolveSubtaskStatusInRange(s, from, to);
          var subRowTint = subUpdatesInRange.length > 0 && newSubInRange > 0;
          var subRowClass = subRowTint ? ' class="summary-has-new-effort"' : '';
          card += '<tr' + subRowClass + '><td class="summary-cumulative-task-cell"><div class="summary-cell-flex">' + summaryProjectPillHtml(s.project) + '<span>' + escapeHtml(s.title || '(no title)') + '</span>' + (!subtaskHasDedicatedEffort(s) ? summaryIncludedPillHtml() : '') + '</div></td><td>' + summaryRangeStatusHtml(subResolved) + '</td><td>' + escapeHtml(etaS) + '</td>' +
            '<td>' + (noEffortSub ? '—' : reqS + ' hrs') + '</td><td>' + cumulativeOutsideSub + ' hrs</td><td>' + newSubInRange + ' hrs</td><td><span class="' + remSClass + '">' + (noEffortSub ? '—' : remS + ' hrs') + '</span></td></tr>';
        });
        card += '</tbody></table></div>';
      }

      if (activeConcernsMain.length || activeConcernsSubs.length || addressedConcernsMainInRange.length || addressedConcernsSubsInRange.length) {
        card += '<div class="summary-block-head">Concerns</div><div class="summary-concerns">';
        if (activeConcernsMain.length) {
          card += '<div class="summary-concern-group"><span class="summary-concern-group-label">Active (main task)</span><ul class="summary-list">';
          activeConcernsMain.forEach(function (c) {
            card += '<li class="summary-concern-open">' + escapeHtml(c.logged_date || '') + ' — ' + formatRichDescription(c.description || '') + '</li>';
          });
          card += '</ul></div>';
        }
        if (activeConcernsSubs.length) {
          card += '<div class="summary-concern-group"><span class="summary-concern-group-label">Active (sub-tasks)</span><ul class="summary-list">';
          activeConcernsSubs.forEach(function (e) {
            card += '<li class="summary-concern-open summary-list-task-line">' + summaryProjectPillHtml(e.subtask.project) + escapeHtml(e.subtask.title || '') + (!subtaskHasDedicatedEffort(e.subtask) ? summaryIncludedPillHtml() : '') + ' — ' + escapeHtml(e.concern.logged_date || '') + ': ' + formatRichDescription(e.concern.description || '') + '</li>';
          });
          card += '</ul></div>';
        }
        if (addressedConcernsMainInRange.length) {
          card += '<div class="summary-concern-group"><span class="summary-concern-addressed-label">Addressed (main; not a blocker)</span><ul class="summary-list">';
          addressedConcernsMainInRange.forEach(function (c) {
            card += '<li class="summary-concern-addressed">' + escapeHtml(c.addressed_date || '') + ' — ' + formatRichDescription(c.description || '') + (c.addressed_comment ? ' <em>' + formatRichDescription(c.addressed_comment) + '</em>' : '') + '</li>';
          });
          card += '</ul></div>';
        }
        if (addressedConcernsSubsInRange.length) {
          card += '<div class="summary-concern-group"><span class="summary-concern-addressed-label">Addressed (sub-tasks; not blockers)</span><ul class="summary-list">';
          addressedConcernsSubsInRange.forEach(function (e) {
            card += '<li class="summary-concern-addressed summary-list-task-line">' + summaryProjectPillHtml(e.subtask.project) + escapeHtml(e.subtask.title || '') + (!subtaskHasDedicatedEffort(e.subtask) ? summaryIncludedPillHtml() : '') + ' — ' + escapeHtml(e.concern.addressed_date || '') + ': ' + formatRichDescription(e.concern.description || '') + (e.concern.addressed_comment ? ' <em>' + formatRichDescription(e.concern.addressed_comment) + '</em>' : '') + '</li>';
          });
          card += '</ul></div>';
        }
        card += '</div>';
      }

      if (etaUpdatesInRange.length || effortUpdatesInRange.length) {
        card += '<div class="summary-block-head">ETA / Effort slips</div><ul class="summary-list summary-slips">';
        etaUpdatesInRange.forEach(function (u) {
          card += '<li class="summary-slip summary-slip-eta">ETA: ' + escapeHtml(u.date_recorded || '') + ' — ' + escapeHtml(u.old_eta || '—') + ' → ' + escapeHtml(u.new_eta || '—') + '</li>';
        });
        effortUpdatesInRange.forEach(function (u) {
          var oldH = u.old_effort_hours != null ? u.old_effort_hours + ' hrs' : '—';
          var newH = u.new_effort_hours != null ? u.new_effort_hours + ' hrs' : '—';
          card += '<li class="summary-slip summary-slip-effort">Effort: ' + escapeHtml(u.date_recorded || '') + ' — ' + escapeHtml(oldH) + ' → ' + escapeHtml(newH) + '</li>';
        });
        card += '</ul>';
      }

      card += '</div>';
      detailedCards.push(card);
    });

    var detailedHtml =
      '<section class="summary-section summary-detailed">' +
        '<h4 class="summary-section-title">Detailed Summary</h4>' +
        '<p class="summary-range">' + rangeLabel + '</p>' +
        '<div class="summary-cards">' + detailedCards.join('') + '</div>' +
      '</section>';

    // ---- Tasks with No Progress (only tasks opened during/before range, not done/dropped before)
    var idleHtml = '';
    if (idleTasks.length) {
      var idleRows = idleTasks.map(function (t) {
        var subs = rangeFilteredSubtasks(t.subtasks || []);
        var idleResolved = resolveStatusInRange(t, from, to);
        return '<tr><td>' + summaryRangeStatusHtml(idleResolved) + '</td>' +
          '<td class="summary-cumulative-task-cell"><div class="summary-cell-flex">' + summaryProjectPillHtml(t.project) + escapeHtml(t.title || '(no title)') + '</div></td>' +
          '<td>' + subs.length + '</td></tr>';
      }).join('');
      idleHtml =
        '<section class="summary-section summary-idle">' +
          '<h4 class="summary-section-title">Tasks with No Progress</h4>' +
          '<p class="summary-range">' + rangeLabel + '</p>' +
          '<div class="summary-table-wrap">' +
            '<table class="summary-table">' +
              '<thead><tr><th>Status</th><th>Main Task</th><th>Sub-task count</th></tr></thead>' +
              '<tbody>' + idleRows + '</tbody>' +
            '</table>' +
          '</div>' +
        '</section>';
    }

    var html = '<div class="summary-report">' +
      '<h3 class="summary-report-title">Summary</h3>' +
      '<p class="summary-report-range">' + rangeLabel + '</p>' +
      bandwidthHtml +
      cumulativeHtml +
      detailedHtml +
      idleHtml +
      '</div>';
    summaryOutput.innerHTML = html;
    state.summaryGenerated = true;
    state.lastSummaryMeta = {
      from: from,
      to: to,
      activeTasks: activeTasks,
      idleTasks: idleTasks
    };
    if (exportSummaryBtn) exportSummaryBtn.disabled = false;
  }

  function workingDaysUntil(etaStr, settings) {
    if (!etaStr) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var parts = etaStr.split('-');
    if (parts.length !== 3) return null;
    var eta = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(eta.getTime())) return null;
    var offSet = {};
    ((settings && settings.dayOffs) || []).forEach(function (o) {
      if (o && o.date && (o.type === 'full' || o.type === 'Full')) offSet[o.date] = true;
    });
    var sign = eta >= today ? 1 : -1;
    var start = sign === 1 ? today : eta;
    var end = sign === 1 ? eta : today;
    var count = 0;
    var d = new Date(start);
    while (d < end) {
      d.setDate(d.getDate() + 1);
      var dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      var ymd = d.toISOString().slice(0, 10);
      if (offSet[ymd]) continue;
      count++;
    }
    return sign * count;
  }

  function buildNotifications() {
    var settings = getSettings();
    var tasks = getTasks().map(normalizeTask);
    var items = [];
    tasks.forEach(function (t) {
      var statusMain = (t.status === 'Closed' ? 'Dropped' : (t.status === 'Completed' ? 'Done' : t.status)) || 'Open';
      if (statusMain === 'Done' || statusMain === 'Dropped') return;
      var wd = workingDaysUntil(t.eta, settings);
      if (wd !== null && wd <= 3) {
        items.push({ type: 'deadline', title: t.title, eta: t.eta, workingDays: wd, isSubtask: false, parentTitle: null, taskId: t.id, subtaskId: null });
      }
      (t.subtasks || []).forEach(function (s) {
        var statusSub = (s.status === 'Closed' ? 'Dropped' : (s.status === 'Completed' ? 'Done' : s.status)) || 'Open';
        if (statusSub === 'Done' || statusSub === 'Dropped') return;
        var wdS = workingDaysUntil(s.eta, settings);
        if (wdS !== null && wdS <= 3) {
          items.push({ type: 'deadline', title: s.title, eta: s.eta, workingDays: wdS, isSubtask: true, parentTitle: t.title, taskId: t.id, subtaskId: s.id });
        }
      });
    });
    items.sort(function (a, b) { return a.workingDays - b.workingDays; });
    return items;
  }

  function navigateToTask(taskId, subtaskId) {
    state.expandedTasks[taskId] = true;
    if (subtaskId) {
      state.expandedSubtasks[taskId + ':' + subtaskId] = true;
    }
    state.listFilter = 'all';
    setView('list');
    requestAnimationFrame(function () {
      var el;
      if (subtaskId) {
        el = document.querySelector('.subtask-card[data-task-id="' + taskId + '"][data-subtask-id="' + subtaskId + '"]');
      }
      if (!el) {
        el = document.querySelector('.task-card[data-id="' + taskId + '"]');
      }
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function refreshNotifications() {
    var badge = document.getElementById('notif-badge');
    var list = document.getElementById('notif-list');
    var empty = document.getElementById('notif-empty');
    if (!badge || !list || !empty) return;
    var items = buildNotifications();
    badge.textContent = String(items.length);
    badge.hidden = items.length === 0;
    if (!items.length) {
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.innerHTML = items.map(function (it) {
      var urgencyCls = it.workingDays < 0 ? 'notif-overdue' : (it.workingDays === 0 ? 'notif-today' : 'notif-soon');
      var daysLabel;
      if (it.workingDays < 0) daysLabel = Math.abs(it.workingDays) + ' working day' + (Math.abs(it.workingDays) !== 1 ? 's' : '') + ' overdue';
      else if (it.workingDays === 0) daysLabel = 'Due today';
      else daysLabel = it.workingDays + ' working day' + (it.workingDays !== 1 ? 's' : '') + ' left';
      var typePill = it.isSubtask
        ? '<span class="notif-type-pill notif-type-sub">Sub-Task</span>'
        : '<span class="notif-type-pill notif-type-main">Main Task</span>';
      var titleHtml = escapeHtml(it.title || '(no title)');
      if (it.isSubtask) titleHtml = '<span class="notif-parent">' + escapeHtml(it.parentTitle || '') + '</span> → ' + titleHtml;
      var dataAttrs = 'data-notif-task-id="' + escapeHtml(it.taskId) + '"' +
        (it.subtaskId ? ' data-notif-subtask-id="' + escapeHtml(it.subtaskId) + '"' : '');
      return '<li class="notif-item ' + urgencyCls + '" ' + dataAttrs + ' style="cursor:pointer">' +
        '<div class="notif-item-title">' + typePill + titleHtml + '</div>' +
        '<div class="notif-item-detail">' + escapeHtml(daysLabel) + ' · ETA ' + escapeHtml(it.eta || '—') + '</div>' +
        '</li>';
    }).join('');
    list.querySelectorAll('.notif-item[data-notif-task-id]').forEach(function (li) {
      li.addEventListener('click', function () {
        var tId = li.getAttribute('data-notif-task-id');
        var sId = li.getAttribute('data-notif-subtask-id') || null;
        var dropdown = document.getElementById('notif-dropdown');
        var bellBtn = document.getElementById('notif-bell-btn');
        if (dropdown) dropdown.hidden = true;
        if (bellBtn) bellBtn.setAttribute('aria-expanded', 'false');
        navigateToTask(tId, sId);
      });
    });
  }

  var relaxSession = { breakEndMs: 0, workEndMs: 0, tickId: null };

  var RELAX_TIPS = [
    { title: 'Hydrate', body: 'Drink a glass of water — even a few sips helps focus and energy.' },
    { title: 'Move', body: 'Stand up, roll your shoulders, and take a short walk if you can.' },
    { title: 'Eyes', body: 'Follow the 20-20-20 rule: every 20 minutes, look ~20 feet away for 20 seconds.' },
    { title: 'Breath', body: 'Take four slow breaths in through the nose and out through the mouth.' },
    { title: 'Posture', body: 'Drop your shoulders, unclench your jaw, and lengthen your spine.' },
    { title: 'Micro-reset', body: 'Name three things you can see and two you can hear — ground in the present.' }
  ];

  function stopRelaxTick() {
    if (relaxSession.tickId) {
      clearInterval(relaxSession.tickId);
      relaxSession.tickId = null;
    }
  }

  function formatRelaxCountdown(endMs) {
    if (!endMs || endMs <= Date.now()) return '0:00';
    var sec = Math.ceil((endMs - Date.now()) / 1000);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function relaxPlayChime() {
    var s = getSettings();
    if (!s.relax || !s.relax.soundEnabled) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      o.type = 'sine';
      g.gain.value = 0.08;
      o.start();
      setTimeout(function () {
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        o.stop(ctx.currentTime + 0.45);
        ctx.close();
      }, 350);
    } catch (e) { /* ignore */ }
  }

  function updateRelaxTimerDisplays() {
    var now = Date.now();
    if (relaxSession.breakEndMs > 0 && relaxSession.breakEndMs <= now) {
      relaxSession.breakEndMs = 0;
      relaxPlayChime();
    }
    if (relaxSession.workEndMs > 0 && relaxSession.workEndMs <= now) {
      relaxSession.workEndMs = 0;
      relaxPlayChime();
    }
    var bd = document.getElementById('relax-break-display');
    var wd = document.getElementById('relax-work-display');
    if (bd) {
      if (relaxSession.breakEndMs > now) bd.textContent = formatRelaxCountdown(relaxSession.breakEndMs);
      else bd.textContent = '—';
    }
    if (wd) {
      if (relaxSession.workEndMs > now) wd.textContent = formatRelaxCountdown(relaxSession.workEndMs);
      else wd.textContent = '—';
    }
  }

  function startRelaxTickIfNeeded() {
    stopRelaxTick();
    relaxSession.tickId = setInterval(function () {
      var now = Date.now();
      var b = relaxSession.breakEndMs > now;
      var w = relaxSession.workEndMs > now;
      updateRelaxTimerDisplays();
      if (!b && !w) stopRelaxTick();
    }, 500);
  }

  function showRelaxTip(index) {
    var elTitle = document.getElementById('relax-tip-title');
    var elBody = document.getElementById('relax-tip-body');
    var card = document.getElementById('relax-tip-card');
    if (!elTitle || !elBody) return;
    var tips = RELAX_TIPS;
    var i = ((index % tips.length) + tips.length) % tips.length;
    var tip = tips[i];
    elTitle.textContent = tip.title;
    elBody.textContent = tip.body;
    if (card) {
      card.classList.remove('relax-tip-card--enter');
      void card.offsetWidth;
      card.classList.add('relax-tip-card--enter');
    }
    if (!state.data.settings.relax) state.data.settings.relax = {};
    state.data.settings.relax.tipIndex = i;
  }

  function wireRelaxTabOnce() {
    var root = document.getElementById('view-relax');
    if (!root || root.dataset.relaxWired === '1') return;
    root.dataset.relaxWired = '1';
    var soundCb = document.getElementById('relax-sound-enabled');
    if (soundCb) {
      soundCb.checked = !!(getSettings().relax && getSettings().relax.soundEnabled);
      soundCb.addEventListener('change', function () {
        if (!state.data.settings.relax) state.data.settings.relax = {};
        state.data.settings.relax.soundEnabled = !!soundCb.checked;
        save().catch(function () {});
      });
    }
    root.addEventListener('click', function (e) {
      var pr = e.target.closest('.relax-preset-btn');
      if (pr) {
        var min = parseInt(pr.getAttribute('data-relax-break-min'), 10);
        var inp = document.getElementById('relax-break-custom');
        if (inp && !isNaN(min)) inp.value = String(min);
        return;
      }
      var pw = e.target.closest('.relax-work-preset-btn');
      if (pw) {
        var wm = parseInt(pw.getAttribute('data-relax-work-min'), 10);
        var winp = document.getElementById('relax-work-custom');
        if (winp && !isNaN(wm)) winp.value = String(wm);
      }
    });
    var breakStart = document.getElementById('relax-break-start');
    if (breakStart) {
      breakStart.addEventListener('click', function () {
        var inp = document.getElementById('relax-break-custom');
        var min = inp ? parseInt(inp.value, 10) : 10;
        if (isNaN(min) || min < 1) min = 10;
        relaxSession.breakEndMs = Date.now() + min * 60000;
        startRelaxTickIfNeeded();
        updateRelaxTimerDisplays();
      });
    }
    var breakReset = document.getElementById('relax-break-reset');
    if (breakReset) {
      breakReset.addEventListener('click', function () {
        relaxSession.breakEndMs = 0;
        updateRelaxTimerDisplays();
      });
    }
    var workStart = document.getElementById('relax-work-start');
    if (workStart) {
      workStart.addEventListener('click', function () {
        var inp = document.getElementById('relax-work-custom');
        var min = inp ? parseInt(inp.value, 10) : 25;
        if (isNaN(min) || min < 1) min = 25;
        relaxSession.workEndMs = Date.now() + min * 60000;
        startRelaxTickIfNeeded();
        updateRelaxTimerDisplays();
      });
    }
    var workReset = document.getElementById('relax-work-reset');
    if (workReset) {
      workReset.addEventListener('click', function () {
        relaxSession.workEndMs = 0;
        updateRelaxTimerDisplays();
      });
    }
    var nextTip = document.getElementById('relax-tip-next');
    if (nextTip) {
      nextTip.addEventListener('click', function () {
        var cur = (getSettings().relax && getSettings().relax.tipIndex) || 0;
        showRelaxTip(cur + 1);
        save().catch(function () {});
      });
    }
  }

  function renderRelax() {
    wireRelaxTabOnce();
    var tipIx = (getSettings().relax && getSettings().relax.tipIndex) || 0;
    showRelaxTip(tipIx);
    var bci = document.getElementById('relax-break-custom');
    var wci = document.getElementById('relax-work-custom');
    var rs = getSettings().relax || {};
    if (bci && rs.breakPresetMinutes) bci.value = String(rs.breakPresetMinutes);
    if (wci && rs.workPresetMinutes) wci.value = String(rs.workPresetMinutes);
    updateRelaxTimerDisplays();
    if (relaxSession.breakEndMs > Date.now() || relaxSession.workEndMs > Date.now()) startRelaxTickIfNeeded();
  }

  function render() {
    if (state.view === 'list') renderList();
    else if (state.view === 'calendar') renderCalendar();
    else if (state.view === 'summary') renderSummary();
    else if (state.view === 'relax') renderRelax();
    wireNotesToolbar();
    renderNotes();
    if (state.progressHistoryOpen) refreshProgressHistoryModal();
    refreshNotifications();
  }

  function loadSidebarModeFromStorage() {
    try {
      var raw = localStorage.getItem(SIDEBAR_MODE_STORAGE_KEY);
      if (raw === 'collapsed' || raw === 'hidden' || raw === 'full') state.sidebarMode = raw;
    } catch (e) { /* ignore */ }
  }

  function persistSidebarMode() {
    try {
      localStorage.setItem(SIDEBAR_MODE_STORAGE_KEY, state.sidebarMode);
    } catch (e) { /* ignore */ }
  }

  function applySidebarLayout() {
    var modes = ['full', 'collapsed', 'hidden'];
    modes.forEach(function (m) {
      document.body.classList.remove('sidebar-mode-' + m);
    });
    document.body.classList.add('sidebar-mode-' + state.sidebarMode);
    var aside = document.querySelector('.sidebar');
    if (aside) {
      aside.setAttribute('aria-hidden', state.sidebarMode === 'hidden' ? 'true' : 'false');
    }
    var railTgl = document.getElementById('sidebar-rail-toggle');
    if (railTgl) {
      var collapsedDock = state.sidebarMode === 'collapsed';
      railTgl.classList.toggle('sidebar-rail-toggle--expand', collapsedDock);
      railTgl.setAttribute('title', collapsedDock ? 'Expand sidebar' : 'Minimize to icons');
      railTgl.setAttribute('aria-label', collapsedDock ? 'Expand sidebar to full width' : 'Minimize sidebar to icons only');
    }
    var sbToggle = document.getElementById('top-bar-sidebar-toggle');
    if (sbToggle) {
      var hidden = state.sidebarMode === 'hidden';
      sbToggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
      sbToggle.setAttribute('aria-label', hidden ? 'Show sidebar' : 'Hide sidebar');
      sbToggle.setAttribute('title', hidden ? 'Show sidebar' : 'Hide sidebar');
    }
    syncTopBarViewMenu();
  }

  function setSidebarMode(mode) {
    if (mode !== 'full' && mode !== 'collapsed' && mode !== 'hidden') return;
    if (mode === 'hidden') {
      if (state.sidebarMode !== 'hidden') {
        state.sidebarRestoreMode = state.sidebarMode === 'collapsed' ? 'collapsed' : 'full';
      }
    } else {
      state.sidebarRestoreMode = mode;
    }
    state.sidebarMode = mode;
    persistSidebarMode();
    applySidebarLayout();
  }

  function toggleSidebarHiddenFromTopBar() {
    if (state.sidebarMode === 'hidden') {
      setSidebarMode(state.sidebarRestoreMode === 'collapsed' ? 'collapsed' : 'full');
    } else {
      setSidebarMode('hidden');
    }
  }

  function updateTopBarViewButtonLabel() {
    var btn = document.getElementById('top-bar-view-btn');
    if (!btn) return;
    var labels = { list: 'List', calendar: 'Calendar', summary: 'Summary', notes: 'Notes', relax: 'Relax' };
    var v = labels[state.view] || state.view || 'List';
    btn.innerHTML = 'View &middot; ' + v + ' ' + SVG_ICON_CHEVRON_DOWN;
  }

  function syncTopBarViewMenu() {
    document.querySelectorAll('.top-bar-view-screen').forEach(function (el) {
      el.classList.toggle('top-bar-option-active', el.dataset.view === state.view);
    });
    document.querySelectorAll('.top-bar-sidebar-opt').forEach(function (el) {
      var m = el.dataset.sidebarMode;
      var active = state.sidebarMode === 'hidden'
        ? m === state.sidebarRestoreMode
        : m === state.sidebarMode;
      el.classList.toggle('top-bar-option-active', active);
    });
    updateTopBarViewButtonLabel();
  }

  function setView(view) {
    if (state.view === 'relax' && view !== 'relax') stopRelaxTick();
    if (state.view === 'notes' && view !== 'notes') closeNotesModal(false);
    state.view = view;
    document.querySelectorAll('.view-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'view-' + view);
    });
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === view);
    });
    syncTopBarViewMenu();
    render();
  }

  function setFormDefaults() {
    var today = new Date().toISOString().slice(0, 10);
    taskAssigned.value = today;
    taskEta.value = today;
    taskEffort.value = '1';
    taskPriority.value = '1';
    if (taskDifficulty) taskDifficulty.value = DEFAULT_TASK_DIFFICULTY;
    taskTags.value = 'default';
    if (taskBug) taskBug.value = '';
    var taskProjEl = $('task-project');
    if (taskProjEl) taskProjEl.innerHTML = renderProjectSelectInnerHtml('');
  }

  var DEBUG_SUMMARY_FROM_KEY = 'fa_debug_summary_from';
  var DEBUG_SUMMARY_TO_KEY = 'fa_debug_summary_to';

  function prefillDebugForm() {
    taskTitle.value = 'Debug: Sample task';
    taskDescription.value = 'Edit or add and click Add Task.';
    setFormDefaults();
  }

  function openSettingsModal() {
    var s = getSettings().priorityColors || DEFAULT_PRIORITY_COLORS;
    for (var i = 1; i <= 10; i++) {
      var el = $('setting-priority-' + i);
      if (el) el.value = s[String(i)] || getDefaultPriorityColor(i);
    }
    var categoriesEl = $('setting-categories');
    if (categoriesEl) categoriesEl.value = getCategoryList().join(', ');
    var projectsEl = $('setting-projects');
    if (projectsEl) projectsEl.value = getProjectList().join(', ');
    var whEl = $('setting-working-hours');
    if (whEl) {
      var w = parseFloat(getSettings().workingHoursPerDay);
      whEl.value = !isNaN(w) && w > 0 ? String(w) : '8';
    }
    var themeSelect = document.getElementById('setting-theme');
    if (themeSelect) themeSelect.value = getSettings().theme || 'classic';
    var modal = $('settings-modal');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeSettingsModal() {
    var modal = $('settings-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function syncExportOptionsFormFromStorage() {
    var cb = $('export-opt-show-progress-hrs');
    if (cb) cb.checked = getExportOptions().showProgressEntryHours;
  }

  function openExportOptionsModal() {
    var modal = $('export-options-modal');
    if (!modal) return;
    syncExportOptionsFormFromStorage();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    var cb = $('export-opt-show-progress-hrs');
    if (cb) cb.focus();
  }

  function closeExportOptionsModal() {
    var modal = $('export-options-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function setSummaryDefaultDates() {
    if (!summaryFrom || !summaryTo) return;
    var today = new Date().toISOString().slice(0, 10);
    var thisWeekMonday = getMonday(today);
    var prevWeekMonday = addDays(thisWeekMonday, -7);
    var prevWeekSunday = addDays(prevWeekMonday, 6);
    summaryFrom.value = prevWeekMonday;
    summaryTo.value = prevWeekSunday;
    if (window.__FLOWASSIST_DEBUG__) {
      var savedFrom = localStorage.getItem(DEBUG_SUMMARY_FROM_KEY);
      var savedTo = localStorage.getItem(DEBUG_SUMMARY_TO_KEY);
      console.log('[DBG] setSummaryDefaultDates: localStorage from="' + savedFrom + '" to="' + savedTo + '"');
      if (savedFrom) summaryFrom.value = savedFrom;
      if (savedTo) summaryTo.value = savedTo;
      console.log('[DBG] setSummaryDefaultDates: final input from="' + summaryFrom.value + '" to="' + summaryTo.value + '"');
    }
  }

  function init() {
    loadSidebarModeFromStorage();
    applySidebarLayout();

    setFormDefaults();
    setSummaryDefaultDates();

    var appVersionLine = $('app-version-line');
    if (appVersionLine && window.taskAPI && typeof window.taskAPI.getAppMetadata === 'function') {
      window.taskAPI.getAppMetadata().then(function (meta) {
        if (!meta || !appVersionLine.parentNode) return;
        var v = meta.version != null ? String(meta.version).trim() : '';
        var a = meta.author != null ? String(meta.author).trim() : '';
        if (v && a) appVersionLine.textContent = 'v' + v + ' · ' + a;
        else appVersionLine.textContent = v ? 'v' + v : a;
      }).catch(function () {});
    }

    var addNewTaskBtn = $('add-new-task-btn');
    var addNewTaskBlock = $('add-new-task-block');
    if (addNewTaskBtn && addNewTaskBlock) {
      addNewTaskBtn.addEventListener('click', function () {
        addNewTaskBlock.classList.toggle('task-block-collapsed');
        addNewTaskBtn.classList.toggle('active', !addNewTaskBlock.classList.contains('task-block-collapsed'));
      });
    }
    var addTaskCatContainer = $('add-task-category-dropdown');
    if (addTaskCatContainer) {
      addTaskCatContainer.innerHTML = renderCategoryDropdownHtml([], 'add-task-category');
      bindCategoryDropdownInWrap(addTaskCatContainer);
    }
    syncAddTaskProjectSelect();
    bindRichFormatToolbars(document.getElementById('add-new-task-block'));

    var mainFilterWrap = document.querySelector('.main-task-filter-wrap');
    var listViewTabBar = $('list-view-tab-bar');
    if (listViewTabBar) {
      listViewTabBar.querySelectorAll('.list-view-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          state.listFilter = tab.getAttribute('data-list-filter') || 'all';
          renderList();
        });
      });
    }

    var mainFilterBtn = $('main-task-filter-btn');
    var mainFilterMenu = $('main-task-filter-menu');
    if (mainFilterBtn && mainFilterWrap && mainFilterMenu) {
      mainFilterBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        mainFilterWrap.classList.toggle('open');
      });
      mainFilterMenu.querySelectorAll('.filter-option').forEach(function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          state.mainTaskSort = { by: opt.dataset.sortBy, dir: opt.dataset.sortDir };
          renderList();
          mainFilterWrap.classList.remove('open');
        });
      });
    }
    document.addEventListener('click', function () {
      document.querySelectorAll('.filter-dropdown-wrap.open').forEach(function (w) {
        w.classList.remove('open');
      });
      var topBarBtn = document.getElementById('top-bar-view-btn');
      if (topBarBtn) topBarBtn.setAttribute('aria-expanded', 'false');
      document.querySelectorAll('.category-dropdown-wrap.open').forEach(function (w) {
        w.classList.remove('open');
      });
    });

    addTaskBtn.addEventListener('click', function () {
      var title = (taskTitle.value || '').trim();
      if (!title) return;
      var today = new Date().toISOString().slice(0, 10);
      var tags = parseTags(taskTags.value);
      var bugNums = taskBug ? parseBugNumbers(taskBug.value) : [];
      var addTaskCatWrap = $('add-task-category-dropdown') && $('add-task-category-dropdown').querySelector('.category-dropdown-wrap');
      var taskCategories = addTaskCatWrap ? getSelectedCategoriesFromWrap(addTaskCatWrap) : [];
      var taskProjEl = $('task-project');
      var taskProject = taskProjEl && taskProjEl.value ? taskProjEl.value.trim() : '';
      addTask({
        title: title,
        description: (taskDescription.value || '').trim(),
        priority: parseInt(taskPriority.value, 10) || 1,
        difficulty: taskDifficulty && taskDifficulty.value ? taskDifficulty.value : DEFAULT_TASK_DIFFICULTY,
        tags: tags,
        assigned_date: taskAssigned.value || today,
        eta: taskEta.value || today,
        effort_required_hours: parseFloat(taskEffort.value) || 1,
        bug_numbers: bugNums,
        status: 'Open',
        categories: taskCategories,
        project: taskProject
      }).then(function () {
        taskTitle.value = '';
        taskDescription.value = '';
        var addCatWrap = $('add-task-category-dropdown') && $('add-task-category-dropdown').querySelector('.category-dropdown-wrap');
        if (addCatWrap) {
          addCatWrap.querySelectorAll('.category-checkbox').forEach(function (cb) { cb.checked = false; });
          var btn = addCatWrap.querySelector('.category-dropdown-btn');
          if (btn) btn.textContent = 'Category: —';
        }
        if (window.__FLOWASSIST_DEBUG__) prefillDebugForm();
        else setFormDefaults();
      });
    });

    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setView(btn.dataset.view); });
    });

    var topBarViewWrap = document.getElementById('top-bar-view-wrap');
    var topBarViewBtn = document.getElementById('top-bar-view-btn');
    if (topBarViewBtn && topBarViewWrap) {
      topBarViewBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = topBarViewWrap.classList.toggle('open');
        topBarViewBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      topBarViewWrap.querySelectorAll('.top-bar-view-screen').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          var v = el.dataset.view;
          if (v) setView(v);
          topBarViewWrap.classList.remove('open');
          topBarViewBtn.setAttribute('aria-expanded', 'false');
        });
      });
      topBarViewWrap.querySelectorAll('.top-bar-sidebar-opt').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          var m = el.dataset.sidebarMode;
          if (m) setSidebarMode(m);
          topBarViewWrap.classList.remove('open');
          topBarViewBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    var sidebarRailToggle = document.getElementById('sidebar-rail-toggle');
    if (sidebarRailToggle) {
      sidebarRailToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        if (state.sidebarMode === 'full') setSidebarMode('collapsed');
        else if (state.sidebarMode === 'collapsed') setSidebarMode('full');
      });
    }
    var topBarSidebarToggle = document.getElementById('top-bar-sidebar-toggle');
    if (topBarSidebarToggle) {
      topBarSidebarToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSidebarHiddenFromTopBar();
      });
    }

    var notifBellBtn = document.getElementById('notif-bell-btn');
    var notifDropdown = document.getElementById('notif-dropdown');
    var notifWrap = document.getElementById('notif-wrap');
    if (notifBellBtn && notifDropdown && notifWrap) {
      notifBellBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !notifDropdown.hidden;
        notifDropdown.hidden = open;
        notifBellBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (!open) refreshNotifications();
      });
      document.addEventListener('click', function (e) {
        if (!notifWrap.contains(e.target)) {
          notifDropdown.hidden = true;
          notifBellBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }
    if (calendarFilter) {
      calendarFilter.addEventListener('change', function () {
        state.calendarFilter = calendarFilter.value;
        renderCalendar();
      });
    }
    var calendarViewBtns = document.querySelectorAll('.calendar-view-btn');
    calendarViewBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.dataset.calendarView;
        if (!v) return;
        state.calendarView = v;
        calendarViewBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.calendarView === v); });
        renderCalendar();
      });
    });
    var chartStyleBtns = document.querySelectorAll('.calendar-chart-style-btn');
    chartStyleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var s = btn.dataset.chartStyle;
        if (!s) return;
        state.calendarChartStyle = s;
        chartStyleBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.chartStyle === s); });
        renderCalendar();
      });
    });
    var calendarPrevBtn = document.getElementById('calendar-prev-btn');
    var calendarNextBtn = document.getElementById('calendar-next-btn');
    if (calendarPrevBtn) {
      calendarPrevBtn.addEventListener('click', function () {
        var focus = state.calendarFocusDate || new Date().toISOString().slice(0, 10);
        if (state.calendarView === 'day') state.calendarFocusDate = addDays(focus, -1);
        else if (state.calendarView === 'week') state.calendarFocusDate = addDays(focus, -7);
        else if (state.calendarView === 'month') {
          var d = parseYMD(focus);
          if (d) { d.setMonth(d.getMonth() - 1); state.calendarFocusDate = toYMD(d); }
        }
        renderCalendar();
      });
    }
    if (calendarNextBtn) {
      calendarNextBtn.addEventListener('click', function () {
        var focus = state.calendarFocusDate || new Date().toISOString().slice(0, 10);
        if (state.calendarView === 'day') state.calendarFocusDate = addDays(focus, 1);
        else if (state.calendarView === 'week') state.calendarFocusDate = addDays(focus, 7);
        else if (state.calendarView === 'month') {
          var d = parseYMD(focus);
          if (d) { d.setMonth(d.getMonth() + 1); state.calendarFocusDate = toYMD(d); }
        }
        renderCalendar();
      });
    }
    var calendarGoto = document.getElementById('calendar-goto-date');
    if (calendarGoto) {
      calendarGoto.addEventListener('change', function () {
        if (calendarGoto.value) {
          state.calendarFocusDate = calendarGoto.value;
          renderCalendar();
        }
      });
    }
    var calendarContainerEl = document.getElementById('calendar-container');
    if (calendarContainerEl) {
      calendarContainerEl.addEventListener('click', function (e) {
        var bar = e.target && e.target.closest && e.target.closest('.gantt-task-bar-toggle');
        if (!bar) return;
        e.preventDefault();
        var drop = bar.nextElementSibling;
        if (drop && drop.classList && drop.classList.contains('gantt-task-dropdown')) {
          drop.classList.toggle('gantt-task-dropdown-open');
          bar.classList.toggle('gantt-task-bar-expanded');
        }
      });
    }
    var dayoffToggle = $('calendar-dayoff-toggle');
    var dayoffPanel = $('calendar-dayoff-panel');
    if (dayoffToggle && dayoffPanel) {
      dayoffToggle.addEventListener('click', function () {
        dayoffPanel.classList.toggle('task-block-collapsed');
        dayoffToggle.classList.toggle('active', !dayoffPanel.classList.contains('task-block-collapsed'));
      });
    }
    var dayoffViewMode = $('calendar-dayoff-view-mode');
    var dayoffPrev = $('calendar-dayoff-prev');
    var dayoffNext = $('calendar-dayoff-next');
    if (dayoffViewMode) {
      dayoffViewMode.addEventListener('change', function () {
        state.dayOffBrowseMode = dayoffViewMode.value || 'all';
        if (state.dayOffBrowseMode === 'month') {
          state.dayOffBrowseYM = state.calendarFocusDate.slice(0, 7);
        } else if (state.dayOffBrowseMode === 'year') {
          var y = parseInt(state.calendarFocusDate.slice(0, 4), 10);
          state.dayOffBrowseYear = isNaN(y) ? new Date().getFullYear() : y;
        }
        refreshCalendarDayOffList();
      });
    }
    if (dayoffPrev) {
      dayoffPrev.addEventListener('click', function () {
        if (state.dayOffBrowseMode === 'month') shiftDayOffBrowseMonth(-1);
        else if (state.dayOffBrowseMode === 'year') shiftDayOffBrowseYear(-1);
        refreshCalendarDayOffList();
      });
    }
    if (dayoffNext) {
      dayoffNext.addEventListener('click', function () {
        if (state.dayOffBrowseMode === 'month') shiftDayOffBrowseMonth(1);
        else if (state.dayOffBrowseMode === 'year') shiftDayOffBrowseYear(1);
        refreshCalendarDayOffList();
      });
    }
    var dayoffType = $('dayoff-type');
    var dayoffHoursRow = $('dayoff-hours-row');
    function syncDayoffHoursRow() {
      if (!dayoffHoursRow || !dayoffType) return;
      dayoffHoursRow.style.display = dayoffType.value === 'partial' ? '' : 'none';
    }
    if (dayoffType) dayoffType.addEventListener('change', syncDayoffHoursRow);
    syncDayoffHoursRow();

    var addDayoffBtn = $('calendar-dayoff-add-btn');
    if (addDayoffBtn) {
      addDayoffBtn.addEventListener('click', function () {
        var dateEl = $('dayoff-date');
        var date = dateEl && dateEl.value;
        if (!date) return;
        var type = dayoffType && dayoffType.value === 'partial' ? 'partial' : 'full';
        var reasonEl = $('dayoff-reason');
        var reason = reasonEl && reasonEl.value ? reasonEl.value : 'Other';
        var hoursOff = 0;
        if (type === 'partial') {
          var hEl = $('dayoff-hours');
          hoursOff = hEl ? parseFloat(hEl.value) : NaN;
          if (isNaN(hoursOff) || hoursOff <= 0) return;
          var maxH = parseFloat(getSettings().workingHoursPerDay) || 8;
          if (hoursOff > maxH) hoursOff = maxH;
        }
        var base = getSettings();
        var list = (base.dayOffs || []).filter(function (o) { return o.date !== date; });
        list.push({ id: generateId(), date: date, type: type, reason: reason, hoursOff: hoursOff });
        saveSettings(Object.assign({}, base, { dayOffs: list }));
      });
    }
    var viewCal = document.getElementById('view-calendar');
    if (viewCal) {
      viewCal.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest && e.target.closest('.calendar-dayoff-remove');
        if (!btn) return;
        var id = btn.getAttribute('data-dayoff-id');
        if (!id) return;
        var base = getSettings();
        var list = (base.dayOffs || []).filter(function (o) { return o.id !== id; });
        saveSettings(Object.assign({}, base, { dayOffs: list }));
      });
    }

    if (summaryFrom) {
      summaryFrom.addEventListener('change', function () {
        if (window.__FLOWASSIST_DEBUG__) {
          localStorage.setItem(DEBUG_SUMMARY_FROM_KEY, summaryFrom.value);
          console.log('[DBG] summaryFrom changed → saved to localStorage: "' + summaryFrom.value + '"');
        }
      });
    }
    if (summaryTo) {
      summaryTo.addEventListener('change', function () {
        if (window.__FLOWASSIST_DEBUG__) {
          localStorage.setItem(DEBUG_SUMMARY_TO_KEY, summaryTo.value);
          console.log('[DBG] summaryTo changed → saved to localStorage: "' + summaryTo.value + '"');
        }
      });
    }

    if (generateSummaryBtn) generateSummaryBtn.addEventListener('click', generateSummary);
    if (exportSummaryBtn) {
      exportSummaryBtn.disabled = !state.summaryGenerated;
      exportSummaryBtn.addEventListener('click', exportSummary);
    }

    var exportOptionsBtn = $('export-options-btn');
    var exportOptionsModal = $('export-options-modal');
    if (exportOptionsBtn) exportOptionsBtn.addEventListener('click', openExportOptionsModal);
    if (exportOptionsModal) {
      var exBackdrop = exportOptionsModal.querySelector('.modal-backdrop');
      if (exBackdrop) exBackdrop.addEventListener('click', closeExportOptionsModal);
      var exDone = $('export-options-done-btn');
      if (exDone) exDone.addEventListener('click', closeExportOptionsModal);
      var exCb = $('export-opt-show-progress-hrs');
      if (exCb) {
        exCb.addEventListener('change', function () {
          setExportOptions({ showProgressEntryHours: exCb.checked });
        });
      }
    }

    var progressHistoryModal = $('progress-history-modal');
    if (progressHistoryModal) {
      var phBackdrop = progressHistoryModal.querySelector('.modal-backdrop');
      if (phBackdrop) phBackdrop.addEventListener('click', closeProgressHistoryModal);
      var phClose = $('progress-history-close-btn');
      if (phClose) phClose.addEventListener('click', closeProgressHistoryModal);
    }
    var progressHistorySort = $('progress-history-sort');
    if (progressHistorySort) {
      progressHistorySort.addEventListener('change', function () {
        var ctx = state.progressHistoryOpen;
        if (!ctx) return;
        var mhKey = progressLogKeyModal(ctx.taskId, ctx.subtaskId);
        state.progressLogSort[mhKey] = progressHistorySort.value === 'desc' ? 'desc' : 'asc';
        refreshProgressHistoryModal();
      });
    }

    var settingsBtn = $('settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
    var settingsSave = $('settings-save-btn');
    if (settingsSave) {
      settingsSave.addEventListener('click', function () {
        var colors = {};
        for (var i = 1; i <= 10; i++) {
          var el = $('setting-priority-' + i);
          if (el) colors[String(i)] = el.value;
        }
        var categoriesInput = $('setting-categories');
        var categoriesStr = categoriesInput ? categoriesInput.value.trim() : '';
        var categories = categoriesStr ? categoriesStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : getCategoryList();
        var projectsInput = $('setting-projects');
        var projectsStr = projectsInput ? projectsInput.value.trim() : '';
        var projects = projectsStr ? projectsStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
        var whIn = $('setting-working-hours');
        var wh = whIn ? parseFloat(whIn.value) : 8;
        if (isNaN(wh) || wh <= 0) wh = 8;
        var themeIn = document.getElementById('setting-theme');
        var theme = themeIn ? themeIn.value : 'classic';
        var base = getSettings();
        saveSettings(Object.assign({}, base, {
          priorityColors: colors,
          categories: categories.length ? categories : getCategoryList(),
          projects: projects,
          workingHoursPerDay: wh,
          dayOffs: Array.isArray(base.dayOffs) ? base.dayOffs : [],
          theme: theme
        }));
        closeSettingsModal();
        applyTheme(theme);
        var addCatWrap = $('add-task-category-dropdown');
        if (addCatWrap && addCatWrap.parentNode) {
          addCatWrap.innerHTML = renderCategoryDropdownHtml([], 'add-task-category');
          bindCategoryDropdownInWrap(addCatWrap);
        }
        syncAddTaskProjectSelect();
      });
    }
    var settingsCancel = $('settings-cancel-btn');
    if (settingsCancel) settingsCancel.addEventListener('click', closeSettingsModal);
    var modal = $('settings-modal');
    if (modal) {
      modal.querySelector('.modal-backdrop').addEventListener('click', closeSettingsModal);
    }

    document.body.addEventListener('input', function (e) {
      if (e.target.tagName === 'TEXTAREA' && e.target.classList.contains('auto-resize')) {
        autoResizeTextarea(e.target);
      }
    });

    if (window.taskAPI.onFileMenu) {
      window.taskAPI.onFileMenu(function (action) {
        if (action === 'load-profile') {
          window.taskAPI.dialogOpenProfile().then(function (r) {
            if (!r || r.canceled || !r.filePath) return;
            window.taskAPI.profileActivateFromPath(r.filePath).then(function (act) {
              if (!act.success) {
                showProfileError('Load profile', act.message || 'Could not open this file.', act.path ? String(act.path) : '');
                return;
              }
              setData(act.data);
              updateDocumentTitleFromPath(act.path);
              render();
              syncAddTaskProjectSelect();
            });
          });
        } else if (action === 'new-profile') {
          window.taskAPI.dialogNewProfile().then(function (r) {
            if (!r || r.canceled || !r.filePath) return;
            window.taskAPI.profileCreateNew(r.filePath).then(function (cr) {
              if (!cr.success) {
                showProfileError('New profile', cr.message || 'Could not create the profile file.', '');
                return;
              }
              setData(cr.data);
              updateDocumentTitleFromPath(cr.path);
              render();
              syncAddTaskProjectSelect();
            });
          });
        } else if (action === 'save-as') {
          window.taskAPI.profileSaveAs(state.data).then(function (r) {
            if (!r || r.canceled) return;
            if (!r.success) {
              showProfileError('Save As', r.message || 'Could not save the profile.', '');
              return;
            }
            updateDocumentTitleFromPath(r.path);
          });
        }
      });
    }

    wireNotesToolbar();

    if (window.taskAPI && typeof window.taskAPI.onNoteReminderAction === 'function') {
      window.taskAPI.onNoteReminderAction(function (payload) {
        applyNoteReminderRemoteAction(payload);
      });
    }

    load().then(function () {
      applyTheme(getSettings().theme);
      syncAddTaskProjectSelect();
      if (window.__FLOWASSIST_DEBUG__) {
        prefillDebugForm();
        updateDocumentTitleFromPath(state.profilePath);
        var topBarStart = document.querySelector('.top-bar-start');
        if (topBarStart && !topBarStart.querySelector('.debug-mode-badge')) {
          var badge = document.createElement('span');
          badge.className = 'debug-mode-badge';
          badge.textContent = 'DEBUG';
          topBarStart.appendChild(badge);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
