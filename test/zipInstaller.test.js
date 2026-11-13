const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateArchiveEntries, installFiles } = require('../server/zipInstaller');
const { runtimeDirectory, runtimeNotices } = require('../installer/verify-notices');

test('accepts only program files under the release ZIP root', () => {
  validateArchiveEntries('FM27-Tracker/\nFM27-Tracker/public/index.html\nFM27-Tracker/package.json\n');
  for (const name of ['data/history.json', 'public/../data/history.json', 'public\\index.html', 'public/CON.txt', 'public/INDEX.HTML\nFM27-Tracker/public/index.html']) {
    assert.throws(() => validateArchiveEntries('FM27-Tracker/' + name));
  }
});

test('swaps program files and rolls them back without moving save history', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-installer-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
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
  fs.mkdirSync(path.join(staged, runtimeDirectory), { recursive: true });
  for (const name of Object.keys(runtimeNotices)) {
    const relative = path.join(runtimeDirectory, name);
    validateArchiveEntries('FM27-Tracker/' + relative.split(path.sep).join('/'));
    fs.copyFileSync(path.join(__dirname, '..', relative), path.join(staged, relative));
  }
  const rollback = installFiles(root, staged, backup);
  assert.equal(fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8'), 'new');
  for (const name of Object.keys(runtimeNotices)) {
    const relative = path.join(runtimeDirectory, name);
    assert.deepEqual(fs.readFileSync(path.join(root, relative)), fs.readFileSync(path.join(__dirname, '..', relative)));
  }
  assert.equal(fs.readFileSync(path.join(root, 'data', 'history.json'), 'utf8'), 'save data');
  rollback();
  assert.equal(fs.existsSync(path.join(root, runtimeDirectory)), false);
  assert.equal(fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8'), 'old');
  assert.equal(fs.readFileSync(path.join(root, 'data', 'history.json'), 'utf8'), 'save data');
});
