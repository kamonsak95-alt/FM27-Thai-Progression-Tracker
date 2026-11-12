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

test('calculateFirstSeenDeltas tracks original players from Day 1 and newgens from their intake date', () => {
  const { calculateFirstSeenDeltas } = require('../server/historyEngine');

  const snapshots = [
    {
      gameDate: '2026-07-01',
      players: {
        '10': { ca: 140, pa: 170 } // Original player
      }
    },
    {
      gameDate: '2027-03-15',
      players: {
        '10': { ca: 145, pa: 170 },
        '99': { ca: 80, pa: 165 } // Newgen born in March 2027!
      }
    }
  ];

  // In 2028-06-01:
  const currentPlayers = [
    { id: 10, name: 'Original Player', ca: 155, pa: 170 },
    { id: 99, name: 'Somchai Wonderkid', ca: 110, pa: 165 },
    { id: 200, name: 'Brand New Intake', ca: 75, pa: 150 }
  ];

  const result = calculateFirstSeenDeltas(currentPlayers, snapshots, '2028-06-01');

  // Original Player: compared against 2026-07-01 (140 -> 155 = +15 CA)
  assert.strictEqual(result[0].deltaCA, 15);
  assert.strictEqual(result[0].firstSeenDate, '2026-07-01');
  assert.strictEqual(result[0].isNew, false);

  // Somchai Newgen: compared against his birth snapshot in 2027-03-15 (80 -> 110 = +30 CA)
  assert.strictEqual(result[1].deltaCA, 30);
  assert.strictEqual(result[1].firstSeenDate, '2027-03-15');
  assert.strictEqual(result[1].isNew, false);

  // Brand New Intake: born in 2028-06-01, first time seen!
  assert.strictEqual(result[2].deltaCA, 0);
  assert.strictEqual(result[2].isNew, true);
});

test('multi-save career isolation: different saves do not overwrite or contaminate each other', () => {
  const { saveSnapshot, listSnapshots, calculateFirstSeenDeltas } = require('../server/historyEngine');

  const tempFile = path.join(os.tmpdir(), `fm27_test_multisave_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    // Save 1: Manchester United (Manager: "MY Mind")
    saveSnapshot('2026-11-07', [{ id: 10, name: 'Mainoo', ca: 150, pa: 175 }], 'MY Mind', 'Manchester United');
    saveSnapshot('2026-11-28', [{ id: 10, name: 'Mainoo', ca: 154, pa: 175 }], 'MY Mind', 'Manchester United');

    // Save 2: Arsenal (Manager: "Mikel", started fresh on 2026-07-01, and reached 2026-11-07 too!)
    saveSnapshot('2026-07-01', [{ id: 20, name: 'Saka', ca: 165, pa: 180 }], 'Mikel', 'Arsenal');
    saveSnapshot('2026-11-07', [{ id: 20, name: 'Saka', ca: 167, pa: 180 }], 'Mikel', 'Arsenal');

    // Check listSnapshots per save
    const manUtdSnaps = listSnapshots('MY Mind', 'Manchester United');
    assert.strictEqual(manUtdSnaps.length, 2, 'Man Utd should only see its own 2 snapshots');
    assert.strictEqual(manUtdSnaps[0].gameDate, '2026-11-07');
    assert.strictEqual(manUtdSnaps[1].gameDate, '2026-11-28');

    const arsenalSnaps = listSnapshots('Mikel', 'Arsenal');
    assert.strictEqual(arsenalSnaps.length, 2, 'Arsenal should only see its own 2 snapshots');
    assert.strictEqual(arsenalSnaps[0].gameDate, '2026-07-01');

    // Check calculation: when in Save 1 (Man Utd) at 2026-11-28
    // Should NOT use Arsenal's 2026-07-01 as baseline!
    const { loadHistoryStore } = require('../server/historyEngine');
    const store = loadHistoryStore();
    const manUtdDeltas = calculateFirstSeenDeltas(
      [{ id: 10, name: 'Mainoo', ca: 154, pa: 175 }],
      store.snapshots,
      '2026-11-28',
      'MY Mind',
      'Manchester United'
    );

    assert.strictEqual(manUtdDeltas[0].firstSeenDate, '2026-11-07', 'Man Utd baseline remains 2026-11-07 (not contaminated by Arsenal)');
    assert.strictEqual(manUtdDeltas[0].deltaCA, 4); // 150 -> 154

    // Check calculation: when in Save 2 (Arsenal) at 2026-11-07
    const arsenalDeltas = calculateFirstSeenDeltas(
      [{ id: 20, name: 'Saka', ca: 167, pa: 180 }],
      store.snapshots,
      '2026-11-07',
      'Mikel',
      'Arsenal'
    );
    assert.strictEqual(arsenalDeltas[0].firstSeenDate, '2026-07-01');
    assert.strictEqual(arsenalDeltas[0].deltaCA, 2); // 165 -> 167
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('computeSaveRefCode produces unique human-readable RefCodes from club and manager ID', () => {
  const { computeSaveRefCode } = require('../server/historyEngine');

  const meta1 = { myClub: 'Manchester United', manager: 'MY Mind' };
  const staff1 = [{ name: 'MY Mind', job: 'Manager', id: 2002084900 }];
  const refCode1 = computeSaveRefCode(meta1, staff1);

  assert.strictEqual(refCode1, '#MU-55649B');

  // Save 2: same manager name and same club, but different manager ID from fresh save
  const meta2 = { myClub: 'Manchester United', manager: 'MY Mind' };
  const staff2 = [{ name: 'MY Mind', job: 'Manager', id: 2002099999 }];
  const refCode2 = computeSaveRefCode(meta2, staff2);

  assert.strictEqual(refCode2, '#MU-559F96');
  assert.notStrictEqual(refCode1, refCode2, 'Different manager IDs must generate distinct RefCodes even for the same club and name');
});
