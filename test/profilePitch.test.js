const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../public/app.js'), 'utf8');
const context = vm.createContext({});
const start = source.indexOf('function renderProfilePitch(');
const end = source.indexOf('\nconst nationalityInput', start);
vm.runInContext(source.slice(start, end), context);

test('profile pitch marks all known positions alike without inventing ratings', () => {
  const html = context.renderProfilePitch('ST, AML', ['ST']);
  assert.match(html, /data-position="ST" data-level="available"/);
  assert.match(html, /data-position="AML" data-level="available"/);
  assert.match(html, /data-position="GK" data-level="none"/);
  assert.doesNotMatch(html, /<button|data-pos=/);
});

test('profile pitch handles natural-only, goalkeeper and missing position data', () => {
  assert.match(context.renderProfilePitch('', ['GK']), /data-position="GK" data-level="available"/);
  assert.match(context.renderProfilePitch('GK', []), /data-position="GK" data-level="available"/);
  const empty = context.renderProfilePitch(null, []);
  assert.match(empty, /ไม่มีข้อมูลตำแหน่ง/);
  assert.doesNotMatch(empty, /data-level="natural"|data-level="available"/);
});
