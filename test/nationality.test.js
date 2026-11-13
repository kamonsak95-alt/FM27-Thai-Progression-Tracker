const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('nationality options come from the save and match either nationality before pagination', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-nationality-'));
  const scanner = path.join(dir, 'FMSuperScout');
  fs.mkdirSync(scanner);
  fs.writeFileSync(path.join(scanner, 'dump.json'), JSON.stringify({
    meta: { game: 'FM27' },
    players: [
      { id: 1, name: 'Dual', nat: ['Portugal', 'Brazil'], age: 18, ca: 80, pa: 160, pos: 'MC' },
      { id: 2, name: 'Veteran', nat: ' Brazil ', age: 30, ca: 90, pa: 155, pos: 'MC' },
      { id: 3, name: 'Other', nat: ['France'], age: 18, ca: 80, pa: 160, pos: 'MC' },
      { id: 4, name: 'Forward', nat: 'Brazil', age: 18, ca: 80, pa: 160, pos: 'ST' },
      { id: 5, name: 'Unknown', nat: null, age: 18, ca: 80, pa: 160, pos: 'MC' }
    ]
  }));
  process.env.LOCALAPPDATA = dir;
  process.env.FM27_HISTORY_FILE = path.join(dir, 'history.json');
  const server = require('../server/index');
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/api/players';
  const get = async query => (await fetch(url + query)).json();
  const filtered = await get('?nationality=brazil&wonderkids=1&pos=MID&page=2');
  assert.deepEqual(filtered.players.map(player => player.id), [1]);
  assert.deepEqual(filtered.nationalities, ['Brazil', 'France', 'Portugal']);
  assert.equal(filtered.page, 1);
  assert.equal((await get('?nationality=BRA')).total, 0);
  assert.equal((await get('')).total, 5);
});
