const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeStaff, filterStaff, getStaffDetail } = require('../server/staffEngine');
const strong = { Fysiotherapie: 20, Sportwetenschap: 20, Standaardsituaties: 20, Aanvallen: 20, Tactisch: 20, Technisch: 20, Vastberadenheid: 20, Motiveren: 20 };

test('employed job 22 is a set-piece coach regardless of scanner title or preferred role', () => {
  // Both IDs and current club roles were checked in the game, including Neil's analyst preferences.
  const jover = { id: 48030808, name: 'Nicolas Jover', club: 'Arsenal', jobId: 22, job: 'Media-analist', prefJob: [7], staffAttrs: { Standaardsituaties: 20 } };
  const neil = { id: 29107294, name: 'Matt Neil', club: 'MK Dons', jobId: 22, job: 'Media-analist', prefJob: [4, 12], staffAttrs: { Standaardsituaties: 10 } };
  const analyst = { id: 3, name: 'Performance Analyst', club: 'Test Club', jobId: 60, job: 'Prestatie analist', prefJob: [7], staffAttrs: strong };
  const headAnalyst = { ...analyst, id: 4, job: 'Hoofd performance analyse' };
  const free = { id: 5, name: 'Free analyst', club: null, jobId: 22, job: 'Staflid', prefJob: [12] };
  const pool = [jover, neil, analyst, headAnalyst, free];
  for (const person of [jover, neil]) {
    assert.equal(normalizeStaff(person).roleId, 'set_piece_coach');
    assert.equal(getStaffDetail(pool, person.id).roleId, 'set_piece_coach');
  }
  assert.equal(normalizeStaff(analyst).roleId, 'perf_analyst');
  assert.equal(normalizeStaff(headAnalyst).roleId, 'head_perf_analyst');
  assert.equal(normalizeStaff(free).roleId, 'perf_analyst');
  assert.deepEqual(new Set(filterStaff(pool, { role: 'set_piece_coach', status: 'employed' }).staff.map(p => p.id)), new Set([jover.id, neil.id]));
  assert.equal(filterStaff(pool, { role: 'set_piece_coach', limit: '10' }).total, 2);
  assert.deepEqual(filterStaff(pool, { role: 'perf_analyst', status: 'employed' }).staff.map(p => p.id), [analyst.id]);
});

test('preferred roles extend a specific role filter without relabeling or including administrators', () => {
  const analyst = { id: 1, name: 'Analyst', club: 'Lens', job: 'Prestatie analist', prefJob: [12, 7] };
  const coach = { id: 2, name: 'Coach', club: 'Arsenal', jobId: 22 };
  const director = { id: 3, name: 'Director', club: 'Lens', job: 'Directeur', prefJob: [7] };
  const free = { id: 4, name: 'Free', prefJob: [1, 7] };
  const pool = [analyst, coach, director, free];
  const query = { role: 'set_piece_coach' };
  assert.deepEqual(filterStaff(pool, query).staff.map(s => s.id), [2]);
  const expanded = { ...query, includePreferredRole: '1' };
  assert.deepEqual(filterStaff(pool, expanded).staff.map(s => s.id).sort(), [1, 2, 4]);
  const employed = filterStaff(pool, { ...expanded, status: 'employed', q: 'analyst' });
  assert.equal(employed.total, 1);
  assert.equal(employed.staff[0].roleId, 'perf_analyst');
});

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

test('unemployed Jonny Evans is a set-piece coach and remains searchable alongside his namesake', () => {
  const jonny = { id: 5005078, name: 'Jonny Evans', job: 'Staflid', club: null, prefJob: [7], ca: 105, pa: 124,
    staffAttrs: { Standaardsituaties: 11, Fysiotherapie: 2, Sportwetenschap: 3 } };
  const namesake = { id: 89014094, name: 'Jonny Evans', job: 'Fysiotherapeut', club: 'Gloucester City AFC', ca: 67 };
  assert.equal(normalizeStaff(jonny).roleId, 'set_piece_coach');
  assert.equal(normalizeStaff(jonny).roleCategory, 'coaching');
  assert.deepEqual(new Set(filterStaff([jonny, namesake], { q: 'jonny evans' }).staff.map(p => p.id)), new Set([5005078, 89014094]));
  assert.deepEqual(filterStaff([jonny, namesake], { role: 'set_piece_coach', status: 'unemployed' }).staff.map(p => p.id), [5005078]);
});

test('free staff with unresolved preferences remain in search without fabricated coaching ratings', () => {
  const free = { id: 20, name: 'Free unknown', job: 'Staflid', club: null, prefJob: [99], ca: 100 };
  const employed = { ...free, id: 21, club: 'Test Club' };
  const administrator = { ...free, id: 22, job: 'Algemeen directeur' };
  const pool = [free, employed, administrator];
  assert.deepEqual(filterStaff(pool, { status: 'unemployed' }).staff.map(p => p.id), [20]);
  assert.deepEqual(filterStaff(pool, { q: 'free unknown' }).staff.map(p => p.id), [20]);
  assert.equal(normalizeStaff(free).roleCategory, 'unknown');
  assert.equal(normalizeStaff(free).coachStars, null);
  const physio = { ...free, id: 23, prefJob: [3] };
  assert.equal(normalizeStaff(physio).roleId, 'physio');
});
