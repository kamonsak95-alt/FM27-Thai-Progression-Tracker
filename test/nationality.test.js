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
    meta: { game: 'FM27', manager: 'Test Manager', myClub: 'Test Club', gameDate: '2027-08-31' },
    players: [
      { id: 1, name: 'Dual', nat: ['Portugal', 'Brazil'], age: 18, ca: 80, pa: 160, pos: 'MC', foot: 'Links', attrs: { Pace: 15, Passing: 17 }, club: 'Test Club', expires: '2028-02-29', listed: true, loanListed: true, value: 1000000, wage: 5000 },
      { id: 2, name: 'Veteran', nat: ' Brazil ', age: 30, ca: 90, pa: 155, pos: 'MC', foot: 'Rechts', attrs: { Pace: 20, Passing: 12 } },
      { id: 3, name: 'Other', nat: ['France'], age: 18, ca: 80, pa: 160, pos: 'MC', foot: 'Right', expires: '2028-08-31' },
      { id: 4, name: 'Forward', nat: 'Brazil', age: 18, ca: 80, pa: 160, pos: 'ST', foot: 'Beide', attrs: { Pace: 18, Passing: 16 } },
      { id: 5, name: 'Unknown', nat: null, age: 18, ca: 80, pa: 160, pos: 'MC', attrs: { Pace: 18 }, club: null, expires: '2027-08-30' }
    ]
  }));
  process.env.LOCALAPPDATA = dir;
  process.env.FM27_HISTORY_FILE = path.join(dir, 'history.json');
  fs.writeFileSync(process.env.FM27_HISTORY_FILE, '{"careers":[],"snapshots":[]}');
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

  await t.test('Attributes require every minimum and combine with other filters before pagination', async () => {
    const both = '&attribute=Pace:15&attribute=Passing:16';
    assert.equal((await get('?limit=1' + both)).total, 2);
    const players = await get('?nationality=brazil&wonderkids=1&pos=MID&limit=1&page=2' + both);
    assert.deepEqual(players.players.map(player => player.id), [1]);
    assert.equal(players.page, 1);
    for (const invalid of ['constructor:1', 'Pace:21', 'Pace:0', 'Passing:12.5']) {
      assert.equal((await fetch(url + '?attribute=' + invalid)).status, 400);
    }
  });

  const readFile = fs.readFileSync;
  await t.test('transfer filters use the scan date and allow concurrent statuses', async () => {
    const ids = async query => (await get(query)).players.map(player => player.id).sort();
    assert.deepEqual(await ids('?contractMonths=6'), [1]);
    assert.deepEqual(await ids('?contractMonths=12'), [1, 3]);
    assert.deepEqual(await ids('?transferStatus=free'), [5]);
    assert.deepEqual(await ids('?transferStatus=listed&maxValue=1000000&maxWage=5000&contractMonths=6'), [1]);
    assert.deepEqual(await ids('?transferStatus=loan&maxWage=4999'), []);
    const detail = await (await fetch(url.replace('/players', '/player/1'))).json();
    assert.equal(detail.contractEnd, '2028-02-29');
    assert.deepEqual(detail.transferStatuses, ['listed', 'loan']);
  });
  await t.test('preferred foot matches scanner values and combines with attributes', async () => {
    for (const [foot, ids] of [['left', [1]], ['right', [2, 3]], ['both', [4]]]) {
      const result = await get('?foot=' + foot + '&sort=name&order=desc');
      assert.deepEqual(result.players.map(player => player.id), ids);
    }
    const query = '?foot=left&nationality=brazil&attribute=Pace:15&pos=MID';
    assert.deepEqual((await get(query)).players.map(player => player.id), [1]);
    const profileUrl = url.replace('/players', '/player/');
    const getFoot = async id => (await (await fetch(profileUrl + id)).json()).preferredFoot;
    assert.equal(await getFoot(1), 'left');
    assert.equal(await getFoot(4), 'both');
    assert.equal(await getFoot(5), null);
  });
  const reads = t.mock.method(fs, 'readFileSync', (file, ...args) => readFile(file, ...args));
  const sorted = await get('?sort=pa');
  const detail = await (await fetch(url.replace('/players', '/player/1'))).json();
  assert.equal(detail.refCode, sorted.refCode);
  assert.equal(reads.mock.calls.filter(call => call.arguments[0] === process.env.FM27_HISTORY_FILE).length, 0);
});
