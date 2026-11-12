const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

test('calculateDeltas calculates correct delta CA and % growth', () => {
  const { calculateDeltas } = require('../server/historyEngine');
  const current = [
    { id: 1, name: 'Kobbie Mainoo', ca: 160, pa: 175 },
    { id: 2, name: 'Rasmus Højlund', ca: 155, pa: 170 },
    { id: 3, name: 'New Wonderkid', ca: 120, pa: 180 }
  ];
  const baselineMap = {
    '1': { ca: 150 },
    '2': { ca: 158 } // declined by 3
  };

  const result = calculateDeltas(current, baselineMap);
  
  // Kobbie: +10 CA, growth = (10 / 150) * 100 = 6.67%
  assert.strictEqual(result[0].deltaCA, 10);
  assert.strictEqual(result[0].growthPercent, 6.67);
  assert.strictEqual(result[0].prevCA, 150);
  assert.strictEqual(result[0].isNew, false);

  // Rasmus: -3 CA, growth = (-3 / 158) * 100 = -1.9%
  assert.strictEqual(result[1].deltaCA, -3);
  assert.strictEqual(result[1].growthPercent, -1.9);
  assert.strictEqual(result[1].prevCA, 158);

  // New Wonderkid: no baseline
  assert.strictEqual(result[2].deltaCA, 0);
  assert.strictEqual(result[2].growthPercent, 0);
  assert.strictEqual(result[2].isNew, true);
});

test('saveSnapshot and listSnapshots use isolated temp file and do not overwrite real history.json', () => {
  const realHistoryPath = path.join(__dirname, '..', 'data', 'history.json');
  const realHistoryBefore = fs.existsSync(realHistoryPath) ? fs.readFileSync(realHistoryPath, 'utf8') : null;

  const tempFile = path.join(os.tmpdir(), `fm27_test_history_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const { saveSnapshot, listSnapshots, getSnapshot } = require('../server/historyEngine');
    const players = [
      { id: 101, name: 'Player A', ca: 140, pa: 160 },
      { id: 102, name: 'Player B', ca: 130, pa: 150 }
    ];

    const snap = saveSnapshot('2026-11-07', players, 'Test Manager', 'Test Club');
    assert.ok(snap.id, 'Snapshot must have id');
    assert.strictEqual(snap.gameDate, '2026-11-07');

    const list = listSnapshots();
    assert.ok(Array.isArray(list));
    assert.ok(list.some(s => s.gameDate === '2026-11-07'));

    const loaded = getSnapshot('2026-11-07');
    assert.ok(loaded);
    assert.strictEqual(loaded.players['101'].ca, 140);

    // Verify temp file exists and was used
    assert.ok(fs.existsSync(tempFile), 'Temp history file must exist');

    // Crucial: Verify real data/history.json was untouched
    if (realHistoryBefore != null) {
      const realHistoryAfter = fs.readFileSync(realHistoryPath, 'utf8');
      assert.strictEqual(realHistoryAfter, realHistoryBefore, 'Real data/history.json must not be modified by tests');
    }
  } finally {
    delete process.env.FM27_HISTORY_FILE;
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
  }
});
