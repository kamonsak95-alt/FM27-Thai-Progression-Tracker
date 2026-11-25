const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { listHistorySaves, deleteSaveHistory } = require('../server/historyEngine');

test('lists history by save and removes only the selected rounds', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-manage-history-'));
  const file = path.join(dir, 'history.json');
  process.env.FM27_HISTORY_FILE = file;
  const careers = [
    { id: 'one', refCode: '#FM-000001', managerName: 'Same Manager' },
    { id: 'two', refCode: '#FM-00000002', managerName: 'Same Manager' }
  ];
  const round = (gameDate, careerId, saveKey) => ({ gameDate, careerId, saveKey, players: { 42: { ca: 75 } } });
  const first = round('2026-08-01', 'one', '#FM-000001');
  const second = round('2026-09-01', 'one', '#FM-000001');
  const other = round('2026-09-01', 'two', '#FM-00000002');
  const unidentified = round('2026-09-01', null, 'default');
  fs.writeFileSync(file, JSON.stringify({ careers, snapshots: [first, second, other, unidentified] }));
  fs.writeFileSync(path.join(dir, 'shortlist.json'), '{}');
  try {
    const saves = listHistorySaves();
    const selected = saves.find(save => save.refCode === '#FM-000001');
    assert.equal(saves.length, 2);
    assert.equal(selected.rounds, 2);
    assert.equal(selected.lastDate, second.gameDate);
    assert.equal(selected.bytes, Buffer.byteLength(JSON.stringify(first)) + Buffer.byteLength(JSON.stringify(second)));
    assert.equal(deleteSaveHistory('default', 1), 'missing');
    assert.equal(deleteSaveHistory('#FM-000001', 1), 'changed');
    assert.equal(deleteSaveHistory('#FM-000001', 2), 'deleted');
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { careers, snapshots: [other, unidentified] });
    assert.equal(fs.readFileSync(path.join(dir, 'shortlist.json'), 'utf8'), '{}');
  } finally {
    delete process.env.FM27_HISTORY_FILE;
    fs.rmSync(file, { force: true });
    fs.rmSync(path.join(dir, 'shortlist.json'), { force: true });
    fs.rmdirSync(dir);
  }
});
