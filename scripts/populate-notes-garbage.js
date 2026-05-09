'use strict';

/**
 * One-off: prepend test notes/todos into a profile .fa.json for QA.
 * Usage: node scripts/populate-notes-garbage.js [path-to.fa.json]
 */
const fs = require('fs');
const path = require('path');

const target =
  process.argv[2] ||
  path.join(
    'c:',
    'Users',
    'padma',
    'OneDrive',
    'Documents',
    'Projects-Darwin',
    'padmakarr-testing-2.fa.json'
  );

const data = JSON.parse(fs.readFileSync(target, 'utf8'));
if (!data.notes || typeof data.notes !== 'object') data.notes = { items: [] };
if (!Array.isArray(data.notes.items)) data.notes.items = [];

const tasks = data.tasks || [];
const tTitles = tasks.map(function (t) {
  return (t.title || 'Untitled').slice(0, 60);
});

function iso() {
  return new Date().toISOString();
}
function gid(suffix) {
  return 'ai-gbg-' + suffix + '-' + Math.random().toString(36).slice(2, 10);
}

function check(lines) {
  return lines.map(function (L, i) {
    return { id: gid('c' + i), text: L.text, done: !!L.done };
  });
}

var batch = [];
var n = 0;

batch.push({
  id: gid('n' + n++),
  kind: 'note',
  title: 'QA — Lorem buffer (long body)',
  body:
    'This is synthetic content for Notes view testing.\n\n' +
    'Line 2: wrap and scroll.\n' +
    'Line 3: mention profile has ' +
    tasks.length +
    ' tasks.\n\n' +
    tTitles
      .slice(0, 6)
      .map(function (x, i) {
        return '- ' + (i + 1) + ' ' + x;
      })
      .join('\n'),
  color: '',
  updatedAt: iso()
});

batch.push({
  id: gid('n' + n++),
  kind: 'note',
  title: 'Meeting notes (fake)',
  body:
    'Attendees: nobody.\nAction: verify readonly grid + modal.\n\nPlain text only.',
  color: '',
  updatedAt: iso()
});

batch.push({
  id: gid('n' + n++),
  kind: 'note',
  title: 'Empty-looking title',
  body: 'Body has the real copy. Title is short on purpose.',
  color: '',
  updatedAt: iso()
});

batch.push({
  id: gid('n' + n++),
  kind: 'todo',
  title: 'Sprint hygiene checklist',
  body: '',
  color: '',
  updatedAt: iso(),
  checklist: check([
    { text: 'Smoke: open note from grid', done: true },
    { text: 'Smoke: add item in modal', done: false },
    { text: 'Scroll long list in modal', done: false },
    { text: 'Toggle done on grid (checkbox only)', done: true },
    { text: 'Resize window + confirm layout', done: false }
  ])
});

batch.push({
  id: gid('n' + n++),
  kind: 'todo',
  title: 'Task cross-refs (from profile)',
  body: '',
  color: '',
  updatedAt: iso(),
  checklist: tTitles.slice(0, 8).map(function (title, i) {
    return { id: gid('t' + i), text: 'Review: ' + title, done: i % 3 === 0 };
  })
});

batch.push({
  id: gid('n' + n++),
  kind: 'todo',
  title: 'Many rows (grid truncates at 5 + hint)',
  body: '',
  color: '',
  updatedAt: iso(),
  checklist: (function () {
    var a = [];
    for (var i = 1; i <= 12; i++) {
      a.push({
        id: gid('m' + i),
        text: 'Item ' + i + ' — fill viewport paging',
        done: i % 5 === 0
      });
    }
    return a;
  })()
});

batch.push({
  id: gid('n' + n++),
  kind: 'todo',
  title: 'All done (visual strikethrough)',
  body: '',
  color: '',
  updatedAt: iso(),
  checklist: check([
    { text: 'One', done: true },
    { text: 'Two', done: true },
    { text: 'Three', done: true }
  ])
});

batch.push({
  id: gid('n' + n++),
  kind: 'note',
  title: 'Unicode / special: café, 日本語',
  body:
    'Test rendering. Quotes single and double "ok".\nBullet style: - dash line\n',
  color: '',
  updatedAt: iso()
});

batch.push({
  id: gid('n' + n++),
  kind: 'todo',
  title: 'Single open item',
  body: '',
  color: '',
  updatedAt: iso(),
  checklist: [{ id: gid('s0'), text: 'Only this line', done: false }]
});

for (var j = 0; j < 6; j++) {
  batch.push({
    id: gid('bulk' + j),
    kind: 'note',
    title: 'Bulk note ' + (j + 1) + ' / 6',
    body:
      'Synthetic paragraph ' +
      (j + 1) +
      '. Created for FlowAssist Notes tab load testing.',
    color: '',
    updatedAt: iso()
  });
}

batch.push({
  id: gid('n' + n++),
  kind: 'todo',
  title: 'Priority-style lines',
  body: '',
  color: '',
  updatedAt: iso(),
  checklist: check([
    { text: 'P0 — unblock build', done: false },
    { text: 'P1 — fix flaky test', done: true },
    { text: 'P2 — docs', done: false }
  ])
});

data.notes.items = batch.concat(data.notes.items);
fs.writeFileSync(target, JSON.stringify(data, null, 2));
console.log('Prepended', batch.length, 'items into', target);
console.log('Total notes.items:', data.notes.items.length);
