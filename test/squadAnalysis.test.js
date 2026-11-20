const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeSquad } = require('../server/squadAnalysis');

test('loan overview includes only players owned by the managed club and compares prior CA', () => {
  const players = [
    { id: 1, club: 'Our club', teamType: 0, ca: 120 },
    { id: 2, club: 'Our club', ownerClub: 'Other club', ca: 110 },
    { id: 3, club: 'Other club', ownerClub: 'Our club', ca: 115 },
    { id: 4, club: 'Other club', ca: 130 },
    { id: 5, club: 'Third club', ownerClub: 'Our club', ca: 100 }
  ].map(player => ({ pos: 'MC', ...player }));
  const result = analyzeSquad({ meta: { myClub: 'Our club' }, players },
    { gameDate: '2026-08-01', players: { 3: { ca: 111 } } });
  assert.deepEqual(result.loanedPlayers.map(({ id, caChange }) => [id, caChange]), [[3, 4], [5, null]]);
  assert.equal(result.loanedPlayers[0].depth.benchmark.id, 1);
  assert.equal(result.loanComparisonDate, '2026-08-01');
});

test('contract plans project confirmed depth and offer eligible youth in the same position', () => {
  const players = [
    { id: 1, teamType: 0, expires: '2027-02-28', wage: 5000 },
    { id: 2, teamType: 0, expires: '2027-07-01' },
    { id: 3, teamType: 0, expires: '2027-02-30' },
    { id: 4, teamType: 1, age: 19, expires: '2029-06-30' },
    { id: 5, teamType: 1, age: 20, expires: '2027-02-01' },
    { id: 6, teamType: 1, age: 18, expires: '2029-06-30', pos: 'GK' }
  ].map(player => ({ club: 'Our club', pos: 'MC', ...player }));
  const result = analyzeSquad({ meta: { myClub: 'Our club', gameDate: '2026-08-31' }, players });
  const [six, twelve] = result.contractPlans;
  assert.equal(six.cutoff, '2027-02-28');
  assert.equal(six.slots[0].remaining, 1);
  assert.equal(six.slots[0].unknown, 1);
  assert.deepEqual(six.slots[0].expiring.map(p => p.id), [1]);
  assert.equal(six.slots[0].expiring[0].wage, 5000);
  assert.deepEqual(six.slots[0].replacements.map(p => p.id), [4]);
  assert.equal(twelve.slots[0].remaining, 0);
  assert.deepEqual(twelve.slots[0].expiring.map(p => p.id), [1, 2]);
  assert.equal(result.slots.find(slot => slot.id === 'MC').count, 3);
});

test('club prospects use first-team CA benchmarks without changing squad depth', () => {
  const players = [
    { id: 1, age: 20, ca: 145, pa: 170, teamType: 0 },
    { id: 2, age: 30, ca: 130, pa: 140, teamType: 0 },
    { id: 3, age: 31, ca: 120, pa: 125, teamType: 0 },
    { id: 4, age: 21, ca: 120, pa: 145, teamType: 10 },
    { id: 5, age: 17, ca: 80, pa: 145, teamType: 12 },
    { id: 6, age: 22, ca: 135, pa: 170, teamType: 10 },
    { id: 7, age: null, ca: 135, pa: 170, teamType: 10 },
    { id: 8, age: 16, ca: 110, pa: 145, teamType: 12, club: 'Other club' }
  ].map(player => ({ pos: 'MC', club: 'Our club', ...player }));
  const meta = { myClub: 'Our club' };
  const result = analyzeSquad({ meta, players });
  assert.deepEqual(result.prospects.map(p => p.id), [4, 5]);
  assert.equal(result.prospects[0].starterCA, 145);
  assert.equal(result.prospects[0].reserveCA, 130);
  assert.equal(result.prospects[0].starterPotential, true);
  assert.equal(result.prospects[0].nearBackup, true);
  assert.equal(result.prospects[1].nearBackup, false);
  const slot = result.slots.find(slot => slot.id === 'MC');
  assert.equal(slot.status, 'strong');
  assert.equal(slot.count, 3);
  assert.deepEqual(analyzeSquad({ meta, players: players.map(p => ({ ...p, teamType: undefined })) }).prospects, []);
});
