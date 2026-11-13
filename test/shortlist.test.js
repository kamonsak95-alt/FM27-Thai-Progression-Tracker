const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('shortlists persist by career and cannot be saved without a career', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const source = fs.readFileSync(require.resolve('../public/shortlist.js'), 'utf8');
  const open = () => vm.runInNewContext(source + '\ncreateShortlist(storage)', { storage });
  const list = open();
  assert.equal(list.toggle('#FM-A', 42), true);
  assert.equal(list.toggle('#FM-B', 55), true);
  assert.equal(open().read('#FM-A').join(), '42');
  assert.equal(open().read('#FM-B').join(), '55');
  assert.equal(open().toggle('#FM-A', 42), false);
  assert.equal(list.read('#FM-A').length, 0);
  assert.throws(() => list.toggle('UNIDENTIFIED', 42));
});

test('server shortlist persists separately by career and never reseeds removed players', t => {
  const path = require('node:path');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-shortlist-'));
  const previous = process.env.FM27_HISTORY_FILE;
  process.env.FM27_HISTORY_FILE = path.join(dir, 'history.json');
  t.after(() => {
    if (previous === undefined) delete process.env.FM27_HISTORY_FILE;
    else process.env.FM27_HISTORY_FILE = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  });
  fs.writeFileSync(process.env.FM27_HISTORY_FILE, 'original history');
  const { shortlist } = require('../server/shortlistStore');
  assert.deepEqual(shortlist('#FM-A', { action: 'seed', ids: [42, 42] }).ids, [42]);
  shortlist('#FM-B', { action: 'seed', ids: [55] });
  shortlist('#FM-A', { action: 'toggle', id: 42 });
  assert.deepEqual(shortlist('#FM-A', { action: 'seed', ids: [42] }).ids, []);
  assert.deepEqual(shortlist('#FM-B').ids, [55]);
  assert.equal(fs.readFileSync(process.env.FM27_HISTORY_FILE, 'utf8'), 'original history');
});
