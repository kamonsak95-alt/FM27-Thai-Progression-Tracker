const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeStaff, filterStaff, getStaffDetail } = require('../server/staffEngine');
const strong = { Fysiotherapie: 20, Sportwetenschap: 20, Standaardsituaties: 20, Aanvallen: 20, Tactisch: 20, Technisch: 20, Vastberadenheid: 20, Motiveren: 20 };

test('club administrators are never inferred as coaches or medical staff from attributes or preferences', () => {
  for (const job of ['Algemeen directeur', 'Directeur', 'Voorzitter', 'Eigenaar', 'President', 'Algemeen manager']) {
    const person = { id: 83262130, name: 'Francisco Salgado Zenha', job, club: 'Sporting CP', ca: 175, staffAttrs: strong };
    const normalized = normalizeStaff(person);
    assert.equal(normalized.roleCategory, 'administration');
    assert.equal(normalized.coachStars, null);
    assert.deepEqual(getStaffDetail([person], person.id).trainingStars, {});
    assert.equal(normalizeStaff({ ...person, club: null, prefJob: [2] }).roleCategory, 'administration');
  }
});

test('unknown roles stay unknown and are excluded with administration before pagination', () => {
  const unknown = { id: 1, name: 'Unknown', job: 'Staflid', club: 'Test Club', ca: 200 };
  const board = { id: 2, name: 'Board', job: 'Algemeen directeur', club: 'Test Club', ca: 195, staffAttrs: strong };
  const coach = { id: 3, name: 'Coach', job: 'Trainer', club: 'Test Club', ca: 150, staffAttrs: strong };
  const freeCoach = { id: 4, name: 'Free Coach', prefJob: [2], ca: 140, staffAttrs: strong };
  const scout = { id: 5, name: 'Scout', job: 'Scout', ca: 160, staffAttrs: strong };
  assert.equal(normalizeStaff(unknown).roleCategory, 'unknown');
  assert.equal(normalizeStaff(unknown).coachStars, null);
  const pool = [unknown, board, coach, freeCoach, scout];
  assert.equal(filterStaff(pool, {}).total, 3);
  assert.deepEqual(new Set(filterStaff(pool, { role: 'coach' }).staff.map(p => p.id)), new Set([3, 4]));
  assert.equal(filterStaff(pool, { q: 'Board' }).total, 0);
  assert.deepEqual(new Set(filterStaff(pool, { preset: 'five_star' }).staff.map(p => p.id)), new Set([3, 4]));
  assert.deepEqual(new Set(filterStaff(pool, { minTrainingStars: '4.5' }).staff.map(p => p.id)), new Set([3, 4]));
});
