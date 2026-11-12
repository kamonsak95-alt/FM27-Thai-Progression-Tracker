const assert = require('node:assert');
const test = require('node:test');

test('updaterEngine exports checkForUpdates and applyUpdate functions', () => {
  const { checkForUpdates, applyUpdate } = require('../server/updaterEngine');
  assert.strictEqual(typeof checkForUpdates, 'function');
  assert.strictEqual(typeof applyUpdate, 'function');
});

test('checkForUpdates returns a valid status object with changes array', async () => {
  const { checkForUpdates } = require('../server/updaterEngine');
  const res = await checkForUpdates();
  assert.ok(res);
  assert.strictEqual(typeof res.hasUpdate, 'boolean');
  assert.ok(res.currentCommit, 'currentCommit should be string');
  assert.ok(Array.isArray(res.changes), 'changes should be an array');
});
