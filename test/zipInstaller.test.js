const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateArchiveEntries, installFiles } = require('../server/zipInstaller');

test('accepts only program files under the release ZIP root', () => {
  validateArchiveEntries('FM27-Tracker/\nFM27-Tracker/public/index.html\nFM27-Tracker/package.json\n');
  for (const name of ['data/history.json', 'public/../data/history.json', 'public\\index.html', 'public/CON.txt', 'public/INDEX.HTML\nFM27-Tracker/public/index.html']) {
    assert.throws(() => validateArchiveEntries('FM27-Tracker/' + name));
  }
});

test('swaps program files and rolls them back without moving save history', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-installer-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const staged = path.join(root, 'stage');
  const backup = path.join(root, 'backup');
  for (const dir of ['public', 'server', 'bin', 'data', 'stage/public', 'stage/server', 'stage/bin']) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  for (const file of ['package.json', 'LICENSE', 'README.md', 'PRIVACY.md', 'Start-FM27-Tracker-Window.vbs', 'Start-FM27-Tracker.bat', 'public/index.html']) {
    fs.writeFileSync(path.join(root, file), 'old');
    fs.writeFileSync(path.join(staged, file), 'new');
  }
  fs.writeFileSync(path.join(root, 'data', 'history.json'), 'save data');
  const rollback = installFiles(root, staged, backup);
  assert.equal(fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8'), 'new');
  rollback();
  assert.equal(fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8'), 'old');
  assert.equal(fs.readFileSync(path.join(root, 'data', 'history.json'), 'utf8'), 'save data');
});
