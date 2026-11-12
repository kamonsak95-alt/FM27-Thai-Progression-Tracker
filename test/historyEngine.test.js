const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

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
  const tempFile = path.join(os.tmpdir(), `fm27_test_refcode_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
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
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P1 Regression: rescan on same date updates snapshot if CA changed or player ID changed', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_rescan_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const { saveSnapshot, getSnapshot } = require('../server/historyEngine');

    // 1. Initial scan on 2026-11-20: Player 1 has CA 105
    saveSnapshot('2026-11-20', [{ id: 1, name: 'Player 1', ca: 105, pa: 150 }], 'Test Manager', 'Test Club', '#TC-111111');
    const first = getSnapshot('2026-11-20', 'Test Manager', 'Test Club', '#TC-111111');
    assert.strictEqual(first.players['1'].ca, 105);

    // 2. Rescan on same date: same player count (1), but CA updated to 109!
    saveSnapshot('2026-11-20', [{ id: 1, name: 'Player 1', ca: 109, pa: 150 }], 'Test Manager', 'Test Club', '#TC-111111');
    const updated = getSnapshot('2026-11-20', 'Test Manager', 'Test Club', '#TC-111111');
    assert.strictEqual(updated.players['1'].ca, 109, 'Rescan with changed CA must update snapshot');

    // 3. Rescan on same date: same player count (1), but player ID replaced (1 -> 2)
    saveSnapshot('2026-11-20', [{ id: 2, name: 'Player 2', ca: 112, pa: 160 }], 'Test Manager', 'Test Club', '#TC-111111');
    const replaced = getSnapshot('2026-11-20', 'Test Manager', 'Test Club', '#TC-111111');
    assert.strictEqual(replaced.players['1'], undefined, 'Old player ID must no longer exist');
    assert.strictEqual(replaced.players['2'].ca, 112, 'New player ID must be saved');
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P1 Regression: career history continues when manager moves clubs', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_club_move_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const { saveSnapshot, listSnapshots, calculateFirstSeenDeltas } = require('../server/historyEngine');

    const staff = [{ name: 'MY Mind', job: 'Manager', id: 2002084900 }];

    // Snapshot 1: At Manchester United
    saveSnapshot('2026-11-01', [{ id: 10, name: 'Mainoo', ca: 150, pa: 175 }], 'MY Mind', 'Manchester United', '', staff);

    // Manager moves to Real Madrid!
    saveSnapshot('2026-12-01', [{ id: 10, name: 'Mainoo', ca: 155, pa: 175 }], 'MY Mind', 'Real Madrid', '', staff);

    // List snapshots for active career at Real Madrid
    const careerSnaps = listSnapshots('MY Mind', 'Real Madrid');
    assert.strictEqual(careerSnaps.length, 2, 'Should keep both snapshots across club move');
    assert.strictEqual(careerSnaps[0].gameDate, '2026-11-01');
    assert.strictEqual(careerSnaps[1].gameDate, '2026-12-01');

    // First seen deltas should track continuous development across clubs
    const { loadHistoryStore } = require('../server/historyEngine');
    const store = loadHistoryStore();
    const deltas = calculateFirstSeenDeltas(
      [{ id: 10, name: 'Mainoo', ca: 155, pa: 175 }],
      store.snapshots,
      '2026-12-01',
      'MY Mind',
      'Real Madrid'
    );
    assert.strictEqual(deltas[0].firstSeenDate, '2026-11-01');
    assert.strictEqual(deltas[0].deltaCA, 5); // 150 -> 155
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P2 Regression: first scan returns isFirstScan=true, new player distinguishes youth vs confirmed newgen', () => {
  const { calculateFirstSeenDeltas } = require('../server/historyEngine');

  // Case 1: First career scan (no prior snapshots)
  const round1 = calculateFirstSeenDeltas(
    [{ id: 1, name: 'Senior Player', ca: 140, age: 30 }],
    [],
    '2026-07-13'
  );
  assert.strictEqual(round1[0].isFirstScan, true, 'Round 1 must mark isFirstScan: true');
  assert.strictEqual(round1[0].isNew, false);
  assert.strictEqual(round1[0].deltaCA, 0);

  // Case 2: Subsequent scan with newly loaded players (unconfirmed youth vs confirmed newgen)
  const snapshots = [
    {
      gameDate: '2026-07-13',
      players: { '1': { ca: 140, age: 30 } }
    }
  ];
  const round2 = calculateFirstSeenDeltas(
    [
      { id: 1, name: 'Senior Player', ca: 140, age: 30 },
      { id: 2, name: 'Existing Youth Unseen', ca: 70, age: 16 }, // real youth player, unconfirmed newgen
      { id: 3, name: 'Confirmed Newgen', ca: 75, age: 16, isNewgen: true },
      { id: 4, name: 'New Senior Signing', ca: 135, age: 29 }
    ],
    snapshots,
    '2026-11-01'
  );

  assert.strictEqual(round2[0].isFirstScan, false);
  assert.strictEqual(round2[0].isNew, false);

  // Existing youth unseen: isNew is true, but isNewgen is false (shows 🆕 พบครั้งแรก)
  assert.strictEqual(round2[1].isNew, true);
  assert.strictEqual(round2[1].isNewgen, false);

  // Confirmed newgen: isNew is true and isNewgen is true (shows 👶 เกิดใหม่)
  assert.strictEqual(round2[2].isNew, true);
  assert.strictEqual(round2[2].isNewgen, true);

  // Older player: isNew is true (shows 🆕 พบครั้งแรก)
  assert.strictEqual(round2[3].isNew, true);
});

test('P2 Regression: renameSnapshotDate merges into existing date and eliminates duplicate snapshots', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_rename_date_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const { saveSnapshot, getSnapshot, listSnapshots, renameSnapshotDate } = require('../server/historyEngine');

    // Scenario: Career #MU-556432 ALREADY has a snapshot on 2026-07-13
    saveSnapshot('2026-07-13', [{ id: 1, name: 'Omari Zion', ca: 55, pa: 160 }], 'MY Mind', 'Manchester United', '#MU-556432');

    // A bad snapshot was also saved on 2027-01-29 with updated CA 57
    const store = require('../server/historyEngine').loadHistoryStore();
    store.snapshots.push({
      id: 'snap_20270129_test',
      gameDate: '2027-01-29',
      timestamp: new Date().toISOString(),
      manager: 'MY Mind',
      club: 'Manchester United',
      saveKey: '#MU-556432',
      careerId: 'career_556432',
      totalPlayers: 1,
      players: { '1': { ca: 57, pa: 160, age: 16, club: 'Manchester United', pos: 'ST' } }
    });
    require('../server/historyEngine').saveHistoryStore(store);

    // User renames 2027-01-29 to 2026-07-13
    const merged = renameSnapshotDate('2027-01-29', '2026-07-13', 'MY Mind', 'Manchester United', '#MU-556432');
    assert.ok(merged);
    assert.strictEqual(merged.gameDate, '2026-07-13');
    assert.strictEqual(merged.players['1'].ca, 57, 'Merged snapshot must have updated data');

    // CRUCIAL: Must have exactly ONE snapshot for this career, not two!
    const snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(snaps.length, 1, 'Must eliminate duplicate snapshot on same date');
    assert.strictEqual(snaps[0].gameDate, '2026-07-13');
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P1 Regression: ambiguous careers without Manager ID are paused and never falsely merged', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_ambiguous_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const { saveSnapshot, resolveCareer, listSnapshots, loadHistoryStore } = require('../server/historyEngine');

    // Register Career 1: MY Mind at Man Utd (Manager ID: 2002084900)
    const staff1 = [{ name: 'MY Mind', job: 'Manager', id: 2002084900 }];
    saveSnapshot('2026-11-01', [{ id: 10, name: 'Mainoo', ca: 150 }], 'MY Mind', 'Manchester United', '', staff1);

    // Register Career 2: MY Mind at Man Utd (Manager ID: 2002084795)
    const staff2 = [{ name: 'MY Mind', job: 'Manager', id: 2002084795 }];
    saveSnapshot('2026-07-13', [{ id: 10, name: 'Mainoo', ca: 145 }], 'MY Mind', 'Manchester United', '', staff2);

    const store = loadHistoryStore();
    assert.strictEqual(store.careers.length, 2, 'Must have 2 distinct careers');

    // Now test ambiguous query without Manager ID and without RefCode
    const resolvedWithoutId = resolveCareer(store, { manager: 'MY Mind', myClub: 'Manchester United' }, []);
    assert.strictEqual(resolvedWithoutId, null, 'Must NOT pick career 1 when multiple identical manager+club exist without ID');

    // Career 1 and Career 2 must remain completely isolated
    const career1Snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-55649B');
    const career2Snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(career1Snaps.length, 1);
    assert.strictEqual(career1Snaps[0].gameDate, '2026-11-01');
    assert.strictEqual(career2Snaps.length, 1);
    assert.strictEqual(career2Snaps[0].gameDate, '2026-07-13');
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P1 Regression Case 1: rescan on same day + user confirms 2026-07-13 leaves exactly 1 snapshot', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_case1_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const {
      loadHistoryStore,
      resolveCareer,
      resolveEffectiveGameDate,
      confirmScanRoundDate,
      listSnapshots,
      calculateFirstSeenDeltas
    } = require('../server/historyEngine');

    const store = loadHistoryStore();
    const staff = [{ name: 'MY Mind', job: 'Manager', id: 2002084795 }];
    const career = resolveCareer(store, { manager: 'MY Mind', myClub: 'Manchester United' }, staff, '#MU-556432');
    const players = [
      { id: 2000508789, name: 'Omari Zion', ca: 55, pa: 160 },
      { id: 92091170, name: 'Matthias Köbbing', ca: 85, pa: 100 }
    ];

    // Scan Round 1: Day 1 (13 July 2026) - scanner returns 2027-01-29 with gameYear: 2027
    const scan1Meta = {
      gameDate: '2027-01-29',
      gameYear: 2027,
      gameDateSource: 'memory',
      manager: 'MY Mind',
      myClub: 'Manchester United'
    };
    resolveEffectiveGameDate(scan1Meta, career, store);
    assert.strictEqual(scan1Meta.requiresDateConfirmation, true, 'Round 1 must require date confirmation');
    assert.strictEqual(scan1Meta.suggestedGameDate, '2026-07-13');

    // User confirms 13 July 2026
    confirmScanRoundDate(store, scan1Meta, '2026-07-13', players, staff, '#MU-556432');
    let snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(snaps.length, 1);
    assert.strictEqual(snaps[0].gameDate, '2026-07-13');

    // Scan Round 2: Rescan on same day without advancing, scanner emits same payload
    const scan2Meta = {
      gameDate: '2027-01-29',
      gameYear: 2027,
      gameDateSource: 'memory',
      manager: 'MY Mind',
      myClub: 'Manchester United'
    };
    resolveEffectiveGameDate(scan2Meta, career, store);
    assert.strictEqual(scan2Meta.requiresDateConfirmation, true, 'Rescan must require confirmation again for the new scan round');
    assert.strictEqual(scan2Meta.suggestedGameDate, '2026-07-13');

    // User confirms 13 July 2026 again
    confirmScanRoundDate(store, scan2Meta, '2026-07-13', players, staff, '#MU-556432');
    snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(snaps.length, 1, 'Must still have exactly 1 snapshot at 2026-07-13 after rescan');
    assert.strictEqual(snaps[0].gameDate, '2026-07-13');

    // Deltas: isFirstScan must remain true
    const deltas = calculateFirstSeenDeltas(players, snaps, '2026-07-13', 'MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(deltas[0].isFirstScan, true, 'Must display "รอบแรก"');
    assert.strictEqual(deltas[0].deltaCA, 0);
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P1 Regression Case 2: game advances to 14 July 2026: before confirm history unchanged, after confirm adds 14 July and preserves 13 July', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_case2_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const {
      loadHistoryStore,
      resolveCareer,
      resolveEffectiveGameDate,
      confirmScanRoundDate,
      listSnapshots,
      calculateFirstSeenDeltas
    } = require('../server/historyEngine');

    const store = loadHistoryStore();
    const staff = [{ name: 'MY Mind', job: 'Manager', id: 2002084795 }];
    const career = resolveCareer(store, { manager: 'MY Mind', myClub: 'Manchester United' }, staff, '#MU-556432');
    const playersDay1 = [
      { id: 2000508789, name: 'Omari Zion', ca: 55, pa: 160 }
    ];

    // Day 1 (13 July 2026) is confirmed and recorded
    const scan1 = { gameDate: '2027-01-29', gameYear: 2027, manager: 'MY Mind', myClub: 'Manchester United' };
    resolveEffectiveGameDate(scan1, career, store);
    confirmScanRoundDate(store, scan1, '2026-07-13', playersDay1, staff, '#MU-556432');

    let snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(snaps.length, 1);
    assert.strictEqual(snaps[0].gameDate, '2026-07-13');

    // Day 2 (Game in FM27 advances to 14 July 2026): scanner still outputs 2027-01-29
    const playersDay2 = [
      { id: 2000508789, name: 'Omari Zion', ca: 56, pa: 160 } // CA improved by 1!
    ];
    const scan2 = { gameDate: '2027-01-29', gameYear: 2027, manager: 'MY Mind', myClub: 'Manchester United' };
    resolveEffectiveGameDate(scan2, career, store);

    // 1. Before Confirmation:
    assert.strictEqual(scan2.requiresDateConfirmation, true, 'New scan round must require confirmation');
    assert.strictEqual(scan2.suggestedGameDate, '2026-07-13', 'Should suggest previous confirmed date');
    // Crucial: Snapshot writing is paused before confirmation!
    snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(snaps.length, 1, 'Before confirmation: history file must NOT change');
    assert.strictEqual(snaps[0].gameDate, '2026-07-13');

    // 2. After User Confirms 14 July 2026:
    confirmScanRoundDate(store, scan2, '2026-07-14', playersDay2, staff, '#MU-556432');
    assert.strictEqual(scan2.gameDate, '2026-07-14');
    assert.strictEqual(scan2.gameDateConfirmed, true);
    assert.strictEqual(scan2.requiresDateConfirmation, false);

    snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(snaps.length, 2, 'After confirmation: must have 2 snapshots');
    assert.strictEqual(snaps[0].gameDate, '2026-07-13', '13 July snapshot must be preserved');
    assert.strictEqual(snaps[1].gameDate, '2026-07-14', '14 July snapshot must be added');

    // First Seen and progression: Omari Zion compared to 13 July baseline (+1 CA)
    const fullStore = loadHistoryStore();
    const deltas = calculateFirstSeenDeltas(playersDay2, fullStore.snapshots, '2026-07-14', 'MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(deltas[0].isFirstScan, false);
    assert.strictEqual(deltas[0].deltaCA, 1, 'Must show +1 CA growth compared to 13 July baseline');
    assert.strictEqual(deltas[0].firstSeenDate, '2026-07-13');
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P1 Regression Case 3: same career genuinely reaches 29 Jan 2027: user confirms 29 Jan 2027 and saves snapshot', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_case3_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const {
      loadHistoryStore,
      resolveCareer,
      resolveEffectiveGameDate,
      confirmScanRoundDate,
      listSnapshots
    } = require('../server/historyEngine');

    const store = loadHistoryStore();
    const staff = [{ name: 'MY Mind', job: 'Manager', id: 2002084795 }];
    const career = resolveCareer(store, { manager: 'MY Mind', myClub: 'Manchester United' }, staff, '#MU-556432');

    // Initial snapshot at 13 July 2026
    const scan1 = { gameDate: '2027-01-29', gameYear: 2027, manager: 'MY Mind', myClub: 'Manchester United' };
    resolveEffectiveGameDate(scan1, career, store);
    confirmScanRoundDate(store, scan1, '2026-07-13', [{ id: 1, name: 'Player A', ca: 100 }], staff, '#MU-556432');

    // Months later, save genuinely reaches 2027-01-29
    const scanJan2027 = {
      gameDate: '2027-01-29',
      gameYear: 2027,
      gameDateSource: 'memory',
      manager: 'MY Mind',
      myClub: 'Manchester United'
    };
    resolveEffectiveGameDate(scanJan2027, career, store);
    assert.strictEqual(scanJan2027.requiresDateConfirmation, true);

    // User confirms 2027-01-29
    confirmScanRoundDate(store, scanJan2027, '2027-01-29', [{ id: 1, name: 'Player A', ca: 110 }], staff, '#MU-556432');
    assert.strictEqual(scanJan2027.gameDate, '2027-01-29');

    const snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(snaps.length, 2);
    assert.strictEqual(snaps[0].gameDate, '2026-07-13');
    assert.strictEqual(snaps[1].gameDate, '2027-01-29', 'Snapshot for 2027-01-29 must be recorded');
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P1 Regression Case 4: rescan or save switch before confirmation rejects old confirmation', async () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_case4_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  const server = require('../server/index');
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  const post = (urlPath, body) => new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`http://localhost:${port}${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let resBody = '';
      res.on('data', d => resBody += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(resBody) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  const get = (urlPath) => new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${urlPath}`, res => {
      let resBody = '';
      res.on('data', d => resBody += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(resBody) }));
    }).on('error', reject);
  });

  try {
    // 1. Get current active scan status
    const statusRes = await get('/api/status');
    const currentScanId = statusRes.body.meta?.scanId;
    const currentRefCode = statusRes.body.refCode;
    assert.ok(currentScanId, 'Must have a scanId');
    assert.ok(currentRefCode, 'Must have a RefCode');

    const historyBefore = fs.existsSync(tempFile) ? fs.readFileSync(tempFile, 'utf8') : null;
    for (const endpoint of ['/api/confirm-date', '/api/set-date']) {
      for (const binding of [{}, { scanId: currentScanId }, { refCode: currentRefCode }]) {
        const response = await post(endpoint, { gameDate: '2026-07-14', ...binding });
        assert.strictEqual(response.status, 400, `${endpoint} must require both identifiers`);
        assert.strictEqual(response.body.error, 'MISSING_SCAN_CONTEXT');
      }

      for (const gameDate of ['2026-02-30', '2026-02-29', '2026-13-01', '2026-07-00']) {
        const response = await post(endpoint, { gameDate, scanId: currentScanId, refCode: currentRefCode });
        assert.strictEqual(response.status, 400, `${endpoint} must reject ${gameDate}`);
        assert.strictEqual(response.body.error, 'INVALID_DATE');
      }
    }
    assert.strictEqual(fs.existsSync(tempFile) ? fs.readFileSync(tempFile, 'utf8') : null, historyBefore);
    assert.strictEqual((await get('/api/status')).body.meta.gameDate, statusRes.body.meta.gameDate);

    // 2. Attempt confirming with a STALE scanId
    const staleConfirm = await post('/api/confirm-date', {
      gameDate: '2026-07-14',
      scanId: 'stale_scan_old_123',
      refCode: currentRefCode
    });
    assert.strictEqual(staleConfirm.status, 409, 'Must return 409 Conflict on stale scanId');
    assert.strictEqual(staleConfirm.body.error, 'STALE_SCAN_ROUND');

    // 3. Attempt confirming with a DIFFERENT save RefCode (save switch simulation)
    const wrongSaveConfirm = await post('/api/confirm-date', {
      gameDate: '2026-07-14',
      scanId: currentScanId,
      refCode: '#DIFFERENT-999999'
    });
    assert.strictEqual(wrongSaveConfirm.status, 409, 'Must return 409 Conflict on career mismatch');
    assert.strictEqual(wrongSaveConfirm.body.error, 'CAREER_MISMATCH');

    // 4. Valid confirmation with matching scanId and refCode succeeds
    const validConfirm = await post('/api/confirm-date', {
      gameDate: '2026-07-13',
      scanId: currentScanId,
      refCode: currentRefCode
    });
    assert.strictEqual(validConfirm.status, 200);
    assert.strictEqual(validConfirm.body.ok, true);
    assert.strictEqual(validConfirm.body.gameDate, '2026-07-13');
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P1 Regression Control Case 1: legitimate 2027-01-29 with gameYear: 2027 is confirmed and preserved', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_control_2027_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const {
      saveSnapshot,
      loadHistoryStore,
      resolveCareer,
      resolveEffectiveGameDate,
      confirmScanRoundDate,
      listSnapshots
    } = require('../server/historyEngine');

    const store = loadHistoryStore();
    const staff = [{ name: 'Alex Ferguson', job: 'Manager', id: 10001 }];
    const career = resolveCareer(store, { manager: 'Alex Ferguson', myClub: 'Aberdeen' }, staff, '#AB-010001');

    // Simulate career that progressed to 2026-11-15 earlier
    saveSnapshot('2026-11-15', [{ id: 1, name: 'Player 1', ca: 100 }], 'Alex Ferguson', 'Aberdeen', '#AB-010001', staff);

    // Now game genuinely advances to 2027-01-29
    const payload = {
      gameDate: '2027-01-29',
      gameYear: 2027,
      gameDateSource: 'memory',
      manager: 'Alex Ferguson',
      myClub: 'Aberdeen'
    };

    resolveEffectiveGameDate(payload, career, store);
    assert.strictEqual(payload.requiresDateConfirmation, true);

    confirmScanRoundDate(store, payload, '2027-01-29', [{ id: 1, name: 'Player 1', ca: 105 }], staff, '#AB-010001');
    assert.strictEqual(payload.gameDate, '2027-01-29', 'Legitimate 2027-01-29 must NOT be pulled back to 2026');

    const snaps = listSnapshots('Alex Ferguson', 'Aberdeen', '#AB-010001');
    assert.strictEqual(snaps.length, 2);
    assert.strictEqual(snaps[0].gameDate, '2026-11-15');
    assert.strictEqual(snaps[1].gameDate, '2027-01-29');
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P1 Regression Control Case 2: legitimate 2027-01-29 without gameYear is confirmed and preserved', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_control_noyear_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const {
      saveSnapshot,
      loadHistoryStore,
      resolveCareer,
      resolveEffectiveGameDate,
      confirmScanRoundDate,
      listSnapshots
    } = require('../server/historyEngine');

    const store = loadHistoryStore();
    const staff = [{ name: 'Pep Guardiola', job: 'Manager', id: 20002 }];
    const career = resolveCareer(store, { manager: 'Pep Guardiola', myClub: 'Manchester City' }, staff, '#MC-020002');

    // Simulate career with previous history in 2026
    saveSnapshot('2026-10-01', [{ id: 2, name: 'Rodri', ca: 180 }], 'Pep Guardiola', 'Manchester City', '#MC-020002', staff);

    // Legitimate 2027-01-29 without gameYear property
    const payload = {
      gameDate: '2027-01-29',
      gameDateSource: 'memory',
      manager: 'Pep Guardiola',
      myClub: 'Manchester City'
    };

    resolveEffectiveGameDate(payload, career, store);
    assert.strictEqual(payload.requiresDateConfirmation, true);

    confirmScanRoundDate(store, payload, '2027-01-29', [{ id: 2, name: 'Rodri', ca: 182 }], staff, '#MC-020002');
    assert.strictEqual(payload.gameDate, '2027-01-29', 'Legitimate 2027-01-29 without gameYear must NOT be pulled back to 2026');

    const snaps = listSnapshots('Pep Guardiola', 'Manchester City', '#MC-020002');
    assert.strictEqual(snaps.length, 2);
    assert.strictEqual(snaps[0].gameDate, '2026-10-01');
    assert.strictEqual(snaps[1].gameDate, '2027-01-29');
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    delete process.env.FM27_HISTORY_FILE;
  }
});

test('P1 Regression: Save 1 #MU-55649B preserves all 6 snapshots intact and strictly isolated from #MU-556432', () => {
  const { loadHistoryStore, listSnapshots } = require('../server/historyEngine');

  // Verify real store integrity
  const store = loadHistoryStore();
  assert.ok(Array.isArray(store.careers), 'Store must have careers array');
  assert.ok(Array.isArray(store.snapshots), 'Store must have snapshots array');

  // Check Save 1 #MU-55649B snapshots
  const snaps1 = listSnapshots('MY Mind', 'Manchester United', '#MU-55649B');
  assert.strictEqual(snaps1.length, 6, 'Save 1 #MU-55649B must keep exactly 6 snapshots intact');
  const expectedDates1 = [
    '2026-11-07',
    '2026-11-21',
    '2026-11-25',
    '2026-11-28',
    '2026-11-29',
    '2026-12-01'
  ];
  assert.deepStrictEqual(snaps1.map(s => s.gameDate), expectedDates1, 'Dates must match exactly');

  // Check Save 2 #MU-556432 snapshots
  const snaps2 = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
  assert.strictEqual(snaps2.length, 1, 'Save 2 #MU-556432 must keep exactly 1 snapshot at 2026-07-13');
  assert.strictEqual(snaps2[0].gameDate, '2026-07-13');

  // Verify no snapshot bleeding between careers
  const snap1Ids = new Set(snaps1.map(s => s.id));
  const snap2Ids = new Set(snaps2.map(s => s.id));
  for (const id of snap1Ids) {
    assert.strictEqual(snap2Ids.has(id), false, 'Snapshots must not bleed between Save 1 and Save 2');
  }
});
