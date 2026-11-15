const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeSquad } = require('../server/squadAnalysis');

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
