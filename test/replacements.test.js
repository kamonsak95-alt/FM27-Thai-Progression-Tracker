const test = require('node:test');
const assert = require('node:assert/strict');
const { findReplacements, POSITION_ATTRIBUTES } = require('../server/replacementEngine');
const attrs = Object.fromEntries(POSITION_ATTRIBUTES.MC.map((key, i) => [key, 10 + i % 6]));
const source = { id: 1, pos: 'MC, DM', age: 35, ca: 160, attrs };
const player = (id, overrides = {}) => ({ ...source, id, age: 21, ca: 140, pa: 160, value: 1000000, ...overrides });

test('matches attribute shape separately from current ability and excludes source/wrong positions', () => {
  const lower = player(2, { attrs: Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, v - 3])) });
  const different = player(3, { ca: 160, attrs: Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, 25 - v])) });
  const result = findReplacements([source, lower, different, player(4, { pos: 'ST' })], source, { position: 'MC' });
  assert.equal(result.candidates[0].id, 2);
  assert.equal(result.candidates[0].score, 100);
  assert.equal(result.candidates[0].attributeGap, -3);
  assert.equal(result.candidates[0].caGap, -20);
  assert.equal(result.total, 2);
  assert.ok(result.candidates[0].weaker.length);
});

test('ready uses source CA minus 20; future uses PA at least source CA minus 10 with no CA floor or upper cap', () => {
  const pool = [player(2), player(3, { ca: 139, pa: 180 }), player(4, { ca: 120, pa: 160 }), player(5, { ca: 119, pa: 200 }), player(6, { ca: 130, pa: 150 }), player(7, { ca: 105, pa: 120 }), player(8, { ca: 190, pa: 200 }), player(9, { ca: 10, pa: 149 }), player(10, { ca: 10, pa: 150 })];
  const ready = findReplacements(pool, source, { position: 'MC' });
  assert.deepEqual(new Set(ready.candidates.map(p => p.id)), new Set([2, 8]));
  assert.deepEqual(ready.criteria, { mode: 'ready', minCA: 140, minPA: 1 });
  const future = findReplacements(pool, source, { position: 'MC', mode: 'future' });
  assert.deepEqual(new Set(future.candidates.map(p => p.id)), new Set([2, 3, 4, 5, 6, 8, 10]));
  assert.deepEqual(future.criteria, { mode: 'future', minCA: 1, minPA: 150 });
});

test('custom CA/PA limits override mode defaults before ranking and invalid modes are rejected', () => {
  const pool = [player(2, { ca: 125, pa: 175 }), player(3, { ca: 125, pa: 159 }), player(4, { ca: 125, pa: null })];
  assert.deepEqual(findReplacements(pool, source, { position: 'MC', minCA: 125, minPA: 170 }).candidates.map(p => p.id), [2]);
  assert.throws(() => findReplacements(pool, source, { position: 'MC', mode: 'unknown' }));
});

test('filters before ranking, excludes missing data and never uses PA to improve similarity', () => {
  const pool = [player(2), player(3, { age: 30 }), player(4, { ca: 50 }), player(5, { value: null }), player(6, { attrs: {} }), player(7, { pa: 200 })];
  const result = findReplacements(pool, source, { position: 'MC', maxAge: 23, minCA: 100, maxValue: 2000000 });
  assert.deepEqual(result.candidates.map(p => p.id), [2, 7]);
  assert.equal(result.candidates[0].score, result.candidates[1].score);
  assert.throws(() => findReplacements(pool, source, { position: 'GK' }));
  assert.throws(() => findReplacements(pool, { ...source, attrs: {} }, { position: 'MC' }));
});
