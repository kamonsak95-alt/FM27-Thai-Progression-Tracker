const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { decodeSnapshotAttributes } = require('../server/snapshotAttributes');

test('unemployed careers use scanner IDs, keep separate history, and retain their code after joining a club', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-unemployed-'));
  const file = path.join(dir, 'history.json');
  process.env.FM27_HISTORY_FILE = file;
  t.after(() => {
    delete process.env.FM27_HISTORY_FILE;
    fs.unlinkSync(file);
    fs.rmdirSync(dir);
  });
  const { computeSaveRefCode, saveSnapshot, listSnapshots, getSnapshot, loadHistoryStore } = require('../server/historyEngine');
  const meta = { manager: 'Same Manager', myClub: null };
  const first = [{ name: meta.manager, job: 'Staflid', club: null, id: 2002069493 }];
  const second = [{ ...first[0], id: 2002069494 }];
  fs.writeFileSync(file, JSON.stringify({ snapshots: [{ manager: meta.manager, club: null, saveKey: 'same manager', gameDate: '2024-11-13' }] }));
  const firstRef = computeSaveRefCode(meta, first);
  const secondRef = computeSaveRefCode(meta, second);
  assert.match(firstRef, /^#FM-[A-F0-9]+$/);
  assert.notEqual(firstRef, secondRef);
  const date = '2024-11-13';
  saveSnapshot(date, [{ id: 1, ca: 100 }], meta.manager, null, firstRef, first);
  saveSnapshot(date, [{ id: 1, ca: 120 }], meta.manager, null, secondRef, second);
  assert.equal(getSnapshot(date, meta.manager, null, firstRef).players[1].ca, 100);
  assert.equal(getSnapshot(date, meta.manager, null, secondRef).players[1].ca, 120);
  const unknown = computeSaveRefCode(meta, [...first, ...second]);
  assert.notEqual(unknown, 'DEFAULT');
  assert.equal(saveSnapshot(date, [], meta.manager, null, unknown), null);
  assert.deepEqual(listSnapshots(meta.manager, null, unknown), []);
  assert.equal(loadHistoryStore().snapshots.length, 3);
  assert.equal(computeSaveRefCode({ ...meta, myClub: 'United' }, [{ ...first[0], job: 'Manager' }]), firstRef);
});

test('Attribute baselines skip legacy snapshots and persist same-day attribute changes', () => {
  const tempFile = path.join(os.tmpdir(), `fm27-attrs-${process.pid}-${Date.now()}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;
  const { saveSnapshot, loadHistoryStore, calculateFirstSeenDeltas, calculateDeltas, getSnapshot } = require('../server/historyEngine');
  const player = { id: 1, name: 'Attribute Player', ca: 100 };
  try {
    saveSnapshot('2026-07-01', [player], 'QA', 'United');
    saveSnapshot('2026-07-02', [{ ...player, attrs: { Pace: 10, Tackling: 0 } }], 'QA', 'United');
    saveSnapshot('2026-07-02', [{ ...player, attrs: { Pace: 11, Tackling: 0 } }], 'QA', 'United');
    const current = [{ ...player, attrs: { Pace: 12, Tackling: 0, Finishing: 8 } }];
    const [firstSeen] = calculateFirstSeenDeltas(current, loadHistoryStore().snapshots, '2026-07-03', 'QA', 'United');
    assert.equal(firstSeen.firstSeenDate, '2026-07-01');
    assert.equal(firstSeen.attributeBaselineDate, '2026-07-02');
    assert.deepEqual(decodeSnapshotAttributes(firstSeen.previousAttributeValues), { Tackling: 0, Pace: 11 });
    const snapshot = getSnapshot('2026-07-02', 'QA', 'United');
    assert.equal(calculateDeltas(current, snapshot.players)[0].previousAttributeValues, firstSeen.previousAttributeValues);
    const [sameDay] = calculateFirstSeenDeltas(current, loadHistoryStore().snapshots, '2026-07-02', 'QA', 'United');
    assert.equal(sameDay.previousAttributeValues, undefined);
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    delete process.env.FM27_HISTORY_FILE;
  }
});
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

test('P1 Regression Case 1: rescan on same day — Tracker auto-uses last confirmed date, leaves exactly 1 snapshot', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_case1_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const {
      loadHistoryStore,
      resolveCareer,
      resolveEffectiveGameDate,
      confirmScanRoundDate,
      saveSnapshot,
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

    // Scan Round 1: Day 1 (13 July 2026) — scanner returns phantom 2027-01-29, no prior confirmed date
    const scan1Meta = {
      gameDate: '2027-01-29',
      gameYear: 2027,
      gameDateSource: 'memory',
      manager: 'MY Mind',
      myClub: 'Manchester United'
    };
    resolveEffectiveGameDate(scan1Meta, career, store);
    // New behavior: no manual confirmation required. Date is estimated (falls back to raw since no history yet).
    assert.strictEqual(scan1Meta.requiresDateConfirmation, false, 'No manual confirmation needed');
    assert.strictEqual(scan1Meta.gameDateEstimated, true, 'Must flag as estimated');
    assert.strictEqual(scan1Meta.gameDateConfirmed, true, 'Must be auto-confirmed');

    // User manually overrides to 13 July 2026 (optional click-to-edit)
    confirmScanRoundDate(store, scan1Meta, '2026-07-13', players, staff, '#MU-556432');
    let snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(snaps.length, 1);
    assert.strictEqual(snaps[0].gameDate, '2026-07-13');

    // Scan Round 2: Rescan same day — scanner still emits 2027-01-29, career now has confirmedGameDate=2026-07-13
    const scan2Meta = {
      gameDate: '2027-01-29',
      gameYear: 2027,
      gameDateSource: 'memory',
      manager: 'MY Mind',
      myClub: 'Manchester United'
    };
    const updatedStore = loadHistoryStore();
    const updatedCareer = updatedStore.careers.find(c => c.id === career.id);
    resolveEffectiveGameDate(scan2Meta, updatedCareer, updatedStore);
    // Now has confirmedGameDate, so falls back to 2026-07-13 automatically
    assert.strictEqual(scan2Meta.requiresDateConfirmation, false);
    assert.strictEqual(scan2Meta.gameDateEstimated, true);
    assert.strictEqual(scan2Meta.gameDate, '2026-07-13', 'Must auto-use last confirmed date');

    // Auto-save with the estimated date — same day same CA → no duplicate
    saveSnapshot('2026-07-13', players, 'MY Mind', 'Manchester United', '#MU-556432', staff);
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

test('P1 Regression Case 2: game advances to new day — Tracker auto-uses last confirmed date, then override saves correctly', () => {
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

    // Day 1 (13 July 2026): scanner returns phantom 2027-01-29, user manually overrides to 13 July
    const scan1 = { gameDate: '2027-01-29', gameYear: 2027, manager: 'MY Mind', myClub: 'Manchester United' };
    resolveEffectiveGameDate(scan1, career, store);
    confirmScanRoundDate(store, scan1, '2026-07-13', playersDay1, staff, '#MU-556432');

    let snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(snaps.length, 1);
    assert.strictEqual(snaps[0].gameDate, '2026-07-13');

    // Day 2: game is on 16 July. Scanner still reports phantom 2027-01-29.
    // career.confirmedGameDate is now 2026-07-13, so Tracker auto-falls back to it.
    const playersDay2 = [
      { id: 2000508789, name: 'Omari Zion', ca: 56, pa: 160 } // CA improved by 1!
    ];
    const scan2 = { gameDate: '2027-01-29', gameYear: 2027, gameDateSource: 'memory', manager: 'MY Mind', myClub: 'Manchester United' };
    const updatedStore = loadHistoryStore();
    const updatedCareer = updatedStore.careers.find(c => c.id === career.id);
    resolveEffectiveGameDate(scan2, updatedCareer, updatedStore);

    assert.strictEqual(scan2.requiresDateConfirmation, false, 'No manual confirmation in new flow');
    assert.strictEqual(scan2.gameDateEstimated, true, 'Must be flagged as estimated');
    assert.strictEqual(scan2.gameDate, '2026-07-13', 'Auto falls back to last confirmed date');

    // User notices and manually overrides to 16 July via click-to-edit
    confirmScanRoundDate(updatedStore, scan2, '2026-07-16', playersDay2, staff, '#MU-556432');
    assert.strictEqual(scan2.gameDate, '2026-07-16');
    assert.strictEqual(scan2.gameDateConfirmed, true);
    assert.strictEqual(scan2.requiresDateConfirmation, false);

    snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.strictEqual(snaps.length, 2, 'After override: must have 2 snapshots');
    assert.strictEqual(snaps[0].gameDate, '2026-07-13', '13 July snapshot must be preserved');
    assert.strictEqual(snaps[1].gameDate, '2026-07-16', '16 July snapshot must be added');

    // First Seen and progression: Omari Zion compared to 13 July baseline (+1 CA)
    const fullStore = loadHistoryStore();
    const deltas = calculateFirstSeenDeltas(playersDay2, fullStore.snapshots, '2026-07-16', 'MY Mind', 'Manchester United', '#MU-556432');
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

test('P1 Regression Case 3: same career genuinely reaches 29 Jan 2027 — auto-saves with estimated flag, manual override saves correctly', () => {
  const tempFile = path.join(os.tmpdir(), `fm27_test_case3_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  process.env.FM27_HISTORY_FILE = tempFile;

  try {
    const {
      loadHistoryStore,
      resolveCareer,
      resolveEffectiveGameDate,
      confirmScanRoundDate,
      saveSnapshot,
      listSnapshots
    } = require('../server/historyEngine');

    const store = loadHistoryStore();
    const staff = [{ name: 'MY Mind', job: 'Manager', id: 2002084795 }];
    const career = resolveCareer(store, { manager: 'MY Mind', myClub: 'Manchester United' }, staff, '#MU-556432');

    // Initial snapshot at 13 July 2026 (manual override after phantom date)
    const scan1 = { gameDate: '2027-01-29', gameYear: 2027, manager: 'MY Mind', myClub: 'Manchester United' };
    resolveEffectiveGameDate(scan1, career, store);
    confirmScanRoundDate(store, scan1, '2026-07-13', [{ id: 1, name: 'Player A', ca: 100 }], staff, '#MU-556432');

    // Months pass: career gets a regular scan at a known reliable date (2026-11-01)
    // This must go through resolveEffectiveGameDate to update confirmedGameDate
    const scanNov = { gameDate: '2026-11-01', gameDateSource: 'memory', manager: 'MY Mind', myClub: 'Manchester United' };
    const storeAfterJuly = loadHistoryStore();
    const careerAfterJuly = storeAfterJuly.careers.find(c => c.id === career.id);
    resolveEffectiveGameDate(scanNov, careerAfterJuly, storeAfterJuly);
    // scanNov.gameDate should be '2026-11-01' (reliable) and confirmedGameDate updated
    assert.strictEqual(scanNov.gameDate, '2026-11-01');
    assert.strictEqual(scanNov.gameDateEstimated, false);
    saveSnapshot('2026-11-01', [{ id: 1, name: 'Player A', ca: 105 }], 'MY Mind', 'Manchester United', '#MU-556432', staff);

    // Now game genuinely reaches 2027-01-29. Scanner still emits '2027-01-29'.
    // career.confirmedGameDate is '2026-11-01' (last good date). Tracker auto-falls back to it.
    const scanJan2027 = {
      gameDate: '2027-01-29',
      gameYear: 2027,
      gameDateSource: 'memory',
      manager: 'MY Mind',
      myClub: 'Manchester United'
    };
    const updatedStore = loadHistoryStore();
    const updatedCareer = updatedStore.careers.find(c => c.id === career.id);
    resolveEffectiveGameDate(scanJan2027, updatedCareer, updatedStore);

    assert.strictEqual(scanJan2027.requiresDateConfirmation, false, 'No manual confirmation needed in new flow');
    assert.strictEqual(scanJan2027.gameDateEstimated, true, 'Must be flagged as estimated');
    assert.strictEqual(scanJan2027.gameDate, '2026-11-01', 'Auto falls back to last confirmed date');

    // User notices it is now genuinely 2027-01-29, manually corrects via click-to-edit
    confirmScanRoundDate(updatedStore, scanJan2027, '2027-01-29', [{ id: 1, name: 'Player A', ca: 110 }], staff, '#MU-556432');
    assert.strictEqual(scanJan2027.gameDate, '2027-01-29');

    const snaps = listSnapshots('MY Mind', 'Manchester United', '#MU-556432');
    assert.ok(snaps.length >= 2, 'Must have at least 2 snapshots');
    assert.ok(snaps.some(s => s.gameDate === '2026-07-13'), 'Original 13 July snapshot must be preserved');
    assert.ok(snaps.some(s => s.gameDate === '2027-01-29'), 'Snapshot for 2027-01-29 must be recorded');
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

test('P1 Regression Control Case 1: career with prior history — scanner phantom date auto-uses last confirmed, manual override to 2027-01-29 preserved', () => {
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

    // Career has a prior scan at 2026-11-15 (reliable date) — goes through resolveEffectiveGameDate to update confirmedGameDate
    const scanNov15 = { gameDate: '2026-11-15', gameDateSource: 'memory', manager: 'Alex Ferguson', myClub: 'Aberdeen' };
    resolveEffectiveGameDate(scanNov15, career, store);
    saveSnapshot('2026-11-15', [{ id: 1, name: 'Player 1', ca: 100 }], 'Alex Ferguson', 'Aberdeen', '#AB-010001', staff);

    // Scanner emits 2027-01-29 — Tracker auto-falls back to last confirmed date (2026-11-15)
    const payload = {
      gameDate: '2027-01-29',
      gameYear: 2027,
      gameDateSource: 'memory',
      manager: 'Alex Ferguson',
      myClub: 'Aberdeen'
    };

    const updatedStore = loadHistoryStore();
    const updatedCareer = updatedStore.careers.find(c => c.id === career.id);
    resolveEffectiveGameDate(payload, updatedCareer, updatedStore);
    assert.strictEqual(payload.requiresDateConfirmation, false, 'No manual confirmation required');
    assert.strictEqual(payload.gameDateEstimated, true, 'Must be flagged estimated');
    assert.strictEqual(payload.gameDate, '2026-11-15', 'Auto falls back to last confirmed date');

    // User manually overrides to confirm it really is 2027-01-29
    confirmScanRoundDate(updatedStore, payload, '2027-01-29', [{ id: 1, name: 'Player 1', ca: 105 }], staff, '#AB-010001');
    assert.strictEqual(payload.gameDate, '2027-01-29', 'Manual override must set 2027-01-29');

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

test('P1 Regression Control Case 2: phantom date without prior history — auto-uses raw date and can be overridden', () => {
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

    // Career has prior scan at 2026-10-01 (reliable) — through resolveEffectiveGameDate to update confirmedGameDate
    const scanOct = { gameDate: '2026-10-01', gameDateSource: 'memory', manager: 'Pep Guardiola', myClub: 'Manchester City' };
    resolveEffectiveGameDate(scanOct, career, store);
    saveSnapshot('2026-10-01', [{ id: 2, name: 'Rodri', ca: 180 }], 'Pep Guardiola', 'Manchester City', '#MC-020002', staff);

    // Scanner emits 2027-01-29 without gameYear — Tracker auto-falls back to 2026-10-01
    const payload = {
      gameDate: '2027-01-29',
      gameDateSource: 'memory',
      manager: 'Pep Guardiola',
      myClub: 'Manchester City'
    };

    const updatedStore = loadHistoryStore();
    const updatedCareer = updatedStore.careers.find(c => c.id === career.id);
    resolveEffectiveGameDate(payload, updatedCareer, updatedStore);
    assert.strictEqual(payload.requiresDateConfirmation, false);
    assert.strictEqual(payload.gameDateEstimated, true);
    assert.strictEqual(payload.gameDate, '2026-10-01', 'Auto falls back to last confirmed date');

    // User manually overrides to confirm it really is 2027-01-29
    confirmScanRoundDate(updatedStore, payload, '2027-01-29', [{ id: 2, name: 'Rodri', ca: 182 }], staff, '#MC-020002');
    assert.strictEqual(payload.gameDate, '2027-01-29', 'Must accept manual override to 2027-01-29');

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

test('Career history stays isolated as new snapshots are added', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-career-history-'));
  process.env.FM27_HISTORY_FILE = path.join(dir, 'history.json');
  t.after(() => {
    delete process.env.FM27_HISTORY_FILE;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const { saveSnapshot, listSnapshots } = require('../server/historyEngine');
  const manager = 'Test Manager';
  const club = 'Test Club';
  const dates = ref => listSnapshots(manager, club, ref).map(s => s.gameDate);
  const save = (date, ref, id) => saveSnapshot(date, [{ id, ca: 55 }], manager, club, ref,
    [{ name: manager, job: 'Manager', id }]);

  save('2026-07-13', '#TC-000001', 1);
  save('2026-07-13', '#TC-000002', 2);
  save('2026-07-16', '#TC-000001', 1);
  assert.deepStrictEqual(dates('#TC-000001'), ['2026-07-13', '2026-07-16']);
  assert.deepStrictEqual(dates('#TC-000002'), ['2026-07-13']);
});
