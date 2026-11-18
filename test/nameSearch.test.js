const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { foldSearchText } = require('../server/searchText');

test('Latin name search ignores accents, case and composed Unicode forms', () => {
  for (const [name, query] of [['Šeško', 'sesko'], ['Kylian Mbappé', 'kylian mbappe'], ['Luka Modrić', 'luka modric'], ['René Meulensteen', 'rene meulensteen'], ['Łukasz', 'lukasz'], ['Ødegaard', 'odegaard'], ['João', 'joao']]) {
    assert.equal(foldSearchText(name), query);
    assert.equal(foldSearchText(name.normalize('NFD').toUpperCase()), query);
  }
  assert.equal(foldSearchText('  ŠEŠKO  '), 'sesko');
  assert.equal(foldSearchText(null), '');
});

test('name search preserves Thai vowels and tone marks', () => {
  assert.equal(foldSearchText('ศุภณัฏฐ์ เหมือนตา'), 'ศุภณัฏฐ์ เหมือนตา');
  assert.notEqual(foldSearchText('ป่า'), foldSearchText('ปา'));
  assert.notEqual(foldSearchText('กิน'), foldSearchText('กน'));
});

test('player and staff APIs search plain names before pagination and keep original display names', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-name-search-'));
  fs.mkdirSync(path.join(dir, 'FMSuperScout'));
  fs.writeFileSync(path.join(dir, 'FMSuperScout/dump.json'), JSON.stringify({
    meta: { game: 'FM27', manager: 'Search Test', myClub: 'Test Club', gameDate: '2027-08-31' },
    players: [{ id: 1, name: 'Benjamin Šeško', pos: 'ST', ca: 150, pa: 170, age: 23 }, { id: 2, name: 'Šeško Youth', pos: 'ST', ca: 50, pa: 100, age: 18 }, { id: 3, name: 'Other', pos: 'MC', ca: 160, pa: 170, age: 25 }],
    staff: [{ id: 10, name: 'René Meulensteen', job: 'Trainer', age: 60, ca: 150, pa: 160 }, { id: 11, name: 'Other Coach', job: 'Trainer', age: 40, ca: 160, pa: 170 }]
  }));
  process.env.LOCALAPPDATA = dir;
  process.env.FM27_HISTORY_FILE = path.join(dir, 'history.json');
  const server = require('../server/index');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async route => (await fetch(base + route)).json();
  const plain = await get('/api/players?q=sesko&minCA=100&limit=10');
  assert.equal(plain.total, 1);
  assert.equal(plain.players[0].name, 'Benjamin Šeško');
  assert.deepEqual((await get('/api/players?q=' + encodeURIComponent('ŠEŠKO') + '&minCA=100')).players.map(p => p.id), [1]);
  const staff = await get('/api/staff?q=RENE&limit=10');
  assert.equal(staff.total, 1);
  assert.equal(staff.staff[0].name, 'René Meulensteen');
});
