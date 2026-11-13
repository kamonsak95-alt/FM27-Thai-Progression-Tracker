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
