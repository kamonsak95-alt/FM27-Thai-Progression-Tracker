const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function getHistoryFilePath() {
  if (process.env.FM27_HISTORY_FILE) return process.env.FM27_HISTORY_FILE;
  if (process.env.NODE_ENV === 'test') {
    return path.join(require('node:os').tmpdir(), 'fm27_test_history.json');
  }
  return path.join(DATA_DIR, 'history.json');
}

function ensureDataDir() {
  const filePath = getHistoryFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function migrateStore(store) {
  if (!store.careers) {
    store.careers = [];
  }
  if (!Array.isArray(store.snapshots)) {
    store.snapshots = [];
    return store;
  }

  // Pre-populate known test/real saves if present
  const hasMU55649B = store.snapshots.some(s => s.saveKey === '#MU-55649B');
  if (hasMU55649B && !store.careers.some(c => c.refCode === '#MU-55649B')) {
    store.careers.push({
      id: 'career_55649b',
      refCode: '#MU-55649B',
      initialClub: 'Manchester United',
      currentClub: 'Manchester United',
      managerName: 'MY Mind',
      managerId: 2002084900,
      createdAt: '2026-11-07T00:00:00.000Z',
      updatedAt: '2026-12-01T00:00:00.000Z'
    });
  }

  const hasMU556432 = store.snapshots.some(s => s.saveKey === '#MU-556432');
  if (hasMU556432 && !store.careers.some(c => c.refCode === '#MU-556432')) {
    store.careers.push({
      id: 'career_556432',
      refCode: '#MU-556432',
      initialClub: 'Manchester United',
      currentClub: 'Manchester United',
      managerName: 'MY Mind',
      managerId: 2002084795,
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
      confirmedGameDate: '2026-07-13'
    });
  }

  const career556432 = store.careers.find(c => c.refCode === '#MU-556432' || c.id === 'career_556432');
  if (career556432 && !career556432.confirmedGameDate) {
    career556432.confirmedGameDate = '2026-07-13';
  }

  for (const s of store.snapshots) {
    if (s.saveKey === '#MU-55649B' && !s.careerId) {
      s.careerId = 'career_55649b';
    } else if (s.saveKey === '#MU-556432' && !s.careerId) {
      s.careerId = 'career_556432';
    } else if (!s.careerId) {
      if (s.saveKey) {
        const matchingCareer = store.careers.find(c => c.refCode === s.saveKey || c.id === s.saveKey);
        if (matchingCareer) s.careerId = matchingCareer.id;
      } else {
        const candidates = store.careers.filter(c =>
          (c.managerName || '').trim().toLowerCase() === (s.manager || '').trim().toLowerCase() &&
          ((c.currentClub || '').trim().toLowerCase() === (s.club || '').trim().toLowerCase() ||
           (c.initialClub || '').trim().toLowerCase() === (s.club || '').trim().toLowerCase())
        );
        // Only assign if completely unambiguous (exactly 1 candidate). If multiple exist, pause assignment!
        if (candidates.length === 1) {
          s.careerId = candidates[0].id;
          s.saveKey = candidates[0].refCode;
        }
      }
    }
  }

  return store;
}

function loadHistoryStore() {
  ensureDataDir();
  const filePath = getHistoryFilePath();
  if (!fs.existsSync(filePath)) {
    return { careers: [], snapshots: [] };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return migrateStore(raw);
  } catch {
    return { careers: [], snapshots: [] };
  }
}

function saveHistoryStore(store) {
  ensureDataDir();
  const filePath = getHistoryFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Warning: could not write history store:', err.message);
  }
}

function resolveCareer(store, meta = {}, staff = [], explicitRefCode = '') {
  if (!store.careers) store.careers = [];

  const managerName = (meta.manager || '').trim().toLowerCase();
  const clubName = (meta.myClub || '').trim();

  // 1. Look for manager staff entity by job and name
  const managerStaff = Array.isArray(staff)
    ? staff.find(s => s && s.name && s.name.trim().toLowerCase() === managerName && s.job === 'Manager')
    : null;

  if (managerStaff && managerStaff.id) {
    const rawId = parseInt(managerStaff.id, 10);
    let career = store.careers.find(c => c.managerId === rawId);
    if (!career) {
      const hex = (rawId % 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
      const words = clubName.split(/\s+/).filter(Boolean);
      let clubPrefix = '';
      if (words.length > 1) {
        clubPrefix = words.map(w => w[0].toUpperCase()).slice(0, 3).join('');
      } else {
        clubPrefix = (clubName || 'FM').slice(0, 3).toUpperCase();
      }
      const refCode = explicitRefCode || `#${clubPrefix}-${hex}`;
      career = {
        id: `career_${hex.toLowerCase()}`,
        refCode,
        initialClub: clubName,
        currentClub: clubName,
        managerName: meta.manager || '',
        managerId: rawId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      store.careers.push(career);
      saveHistoryStore(store);
    } else {
      if (clubName && career.currentClub !== clubName) {
        career.currentClub = clubName;
        career.updatedAt = new Date().toISOString();
        saveHistoryStore(store);
      }
    }
    return career;
  }

  // 2. If explicitRefCode is provided, check existing careers
  if (explicitRefCode && explicitRefCode !== 'DEFAULT') {
    let career = store.careers.find(c => c.refCode === explicitRefCode || c.id === explicitRefCode);
    if (career) {
      if (clubName && career.currentClub !== clubName) {
        career.currentClub = clubName;
        career.updatedAt = new Date().toISOString();
        saveHistoryStore(store);
      }
      return career;
    }
  }

  // 3. Match by manager name and club
  if (managerName && clubName) {
    const matched = store.careers.filter(c => (c.managerName || '').trim().toLowerCase() === managerName);
    if (matched.length === 1) {
      const career = matched[0];
      if (career.currentClub !== clubName) {
        career.currentClub = clubName;
        career.updatedAt = new Date().toISOString();
        saveHistoryStore(store);
      }
      return career;
    } else if (matched.length > 1) {
      const exactClubMatches = matched.filter(c => c.currentClub === clubName || c.initialClub === clubName);
      if (exactClubMatches.length === 1) {
        return exactClubMatches[0];
      }
      // If multiple careers share the same manager and club, DO NOT blindly select career 1!
      // Return null so pairing is paused until confirmed with Manager ID or RefCode.
      return null;
    }
  }

  return null;
}

function computeSaveRefCode(meta = {}, staff = []) {
  if (!meta || !meta.myClub) return 'DEFAULT';

  const store = loadHistoryStore();
  const career = resolveCareer(store, meta, staff);
  if (career && career.refCode) {
    return career.refCode;
  }

  const words = (meta.myClub || '').trim().split(/\s+/).filter(Boolean);
  let clubPrefix = '';
  if (words.length > 1) {
    clubPrefix = words.map(w => w[0].toUpperCase()).slice(0, 3).join('');
  } else {
    clubPrefix = (meta.myClub || 'FM').slice(0, 3).toUpperCase();
  }

  const managerName = (meta.manager || '').trim().toLowerCase();
  const managerStaff = Array.isArray(staff)
    ? staff.find(s => s && s.name && s.name.trim().toLowerCase() === managerName && s.job === 'Manager')
    : null;

  if (managerStaff && managerStaff.id) {
    const rawId = parseInt(managerStaff.id, 10);
    const hex = (rawId % 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
    return `#${clubPrefix}-${hex}`;
  }

  const crypto = require('node:crypto');
  const hash = crypto.createHash('md5').update(`${meta.manager || ''}_${meta.myClub || ''}`).digest('hex').slice(0, 6).toUpperCase();
  return `#${clubPrefix}-${hash}`;
}

function getSaveKey(manager = '', club = '', refCode = '') {
  if (refCode && refCode !== 'DEFAULT') return refCode;
  const m = (manager || '').trim().toLowerCase();
  const c = (club || '').trim().toLowerCase();
  if (m && c) return `${m}__${c}`;
  if (m) return m;
  if (c) return c;
  return 'default';
}

function isSnapshotMatchingSave(snapshot, targetKey, store = null) {
  if (!targetKey || targetKey === 'default' || targetKey === 'DEFAULT') return true;
  if (!snapshot) return false;

  // Exact careerId or saveKey match
  if (snapshot.careerId && snapshot.careerId === targetKey) return true;
  if (snapshot.saveKey && snapshot.saveKey === targetKey) return true;

  // Cross check with careers table if available
  if (store && Array.isArray(store.careers)) {
    const exactCareer = store.careers.find(c => c.id === targetKey || c.refCode === targetKey);
    if (exactCareer) {
      if (snapshot.careerId && snapshot.careerId === exactCareer.id) return true;
      if (snapshot.saveKey && snapshot.saveKey === exactCareer.refCode) return true;
    } else {
      // If targetKey is a legacy manager__club string, only match if UNAMBIGUOUS (exactly 1 career)
      const matchingCareers = store.careers.filter(c =>
        (c.managerName && c.currentClub && getSaveKey(c.managerName, c.currentClub) === targetKey) ||
        (c.managerName && c.initialClub && getSaveKey(c.managerName, c.initialClub) === targetKey) ||
        (c.managerName && targetKey.startsWith((c.managerName || '').trim().toLowerCase() + '__'))
      );
      if (matchingCareers.length === 1) {
        const targetCareer = matchingCareers[0];
        if (snapshot.careerId && snapshot.careerId === targetCareer.id) return true;
        if (snapshot.saveKey && snapshot.saveKey === targetCareer.refCode) return true;
      }
    }
  }

  // Fallback to snapshot's legacyKey ONLY if snapshot itself has no careerId or saveKey
  if (!snapshot.careerId && !snapshot.saveKey) {
    const legacyKey = getSaveKey(snapshot.manager, snapshot.club);
    if (legacyKey === targetKey) return true;
  }
  return false;
}

/**
 * Resolves effective in-game date for a specific scan round as the Single Source of Truth.
 * Used identically across Header UI, API /api/players, snapshot saving,
 * First Seen baseline calculation, and player timeline.
 *
 * Uses the last confirmed date for the career whenever the scanner reports an unreliable date.
 * No manual confirmation required — displays with a disclaimer in the UI instead.
 *
 * gameDateEstimated = true  → scanner date was unreliable; using last confirmed date as best guess.
 * gameDateEstimated = false → scanner date is accepted as-is.
 */
function resolveEffectiveGameDate(meta, career = null, store = null) {
  if (!meta || !meta.gameDate) return meta ? meta.gameDate : null;

  // 1. Preserve original scanner date for auditability
  if (!meta.rawGameDate) meta.rawGameDate = meta.gameDate;
  if (meta.gameYear !== undefined && meta.rawGameYear === undefined) {
    meta.rawGameYear = meta.gameYear;
  }

  // 2. Assign unique scanId if not present
  if (!meta.scanId) {
    meta.scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  if (!store) store = loadHistoryStore();
  if (!career) career = resolveCareer(store, meta);

  const rawDate = meta.rawGameDate || meta.gameDate;

  // 3. Already resolved for this scan round — keep as-is
  if (meta.gameDateConfirmed === true) {
    meta.requiresDateConfirmation = false;
    meta.gameDateEstimated = meta.gameDateEstimated || false;
    meta.dateStatus = meta.dateStatus || 'confirmed';
    return meta.gameDate;
  }

  // 4. Known unreliable scanner date (2027-01-29 phantom during Pre-season):
  //    Fall back to last confirmed date, or raw date if no history yet.
  if (rawDate === '2027-01-29') {
    const fallback = career?.confirmedGameDate || null;
    meta.gameDate = fallback || rawDate;
    meta.gameDateEstimated = true;
    meta.gameDateCorrected = !!fallback;
    meta.gameDateConfirmed = true;
    meta.requiresDateConfirmation = false;
    meta.dateStatus = fallback ? 'estimated' : 'estimated_no_history';
    return meta.gameDate;
  }

  // 5. Normal reliable date — accept as confirmed and update career's last known date
  meta.gameDate = rawDate;
  meta.gameDateEstimated = false;
  meta.gameDateCorrected = false;
  meta.gameDateConfirmed = true;
  meta.requiresDateConfirmation = false;
  meta.dateStatus = 'confirmed';

  if (career) {
    career.confirmedGameDate = rawDate;
    career.updatedAt = new Date().toISOString();
    saveHistoryStore(store);
  }

  return meta.gameDate;
}

/**
 * Confirms the game date for a specific scan round.
 * Once confirmed, binds confirmedGameDate to the career, marks the round confirmed,
 * and saves the snapshot for that round without moving or overwriting prior snapshots.
 */
function confirmScanRoundDate(storeOrMeta, metaOrDate, confirmedDateOrPlayers, playersOrStaff, staffOrRef, explicitRefCode = '') {
  let meta, confirmedDate, players, staff, refCode;
  if (storeOrMeta && typeof storeOrMeta.gameDate !== 'undefined') {
    // Called as: confirmScanRoundDate(meta, confirmedDate, players, staff, explicitRefCode)
    meta = storeOrMeta;
    confirmedDate = metaOrDate;
    players = confirmedDateOrPlayers || [];
    staff = playersOrStaff || [];
    refCode = staffOrRef || '';
  } else {
    // Called as: confirmScanRoundDate(store, meta, confirmedDate, players, staff, explicitRefCode)
    meta = metaOrDate;
    confirmedDate = confirmedDateOrPlayers;
    players = playersOrStaff || [];
    staff = staffOrRef || [];
    refCode = explicitRefCode || '';
  }

  if (!meta || !confirmedDate) return null;

  // Always load latest store to prevent overwriting disk with a stale store reference
  const store = loadHistoryStore();
  const validDate = String(confirmedDate).trim();
  const career = resolveCareer(store, meta, staff, refCode);
  const saveKey = career ? career.refCode : (refCode || getSaveKey(meta.manager, meta.myClub));

  meta.gameDate = validDate;
  meta.gameDateConfirmed = true;
  meta.requiresDateConfirmation = false;
  meta.dateStatus = 'confirmed';
  meta.gameDateCorrected = (meta.rawGameDate && meta.rawGameDate !== validDate);

  if (career) {
    career.confirmedGameDate = validDate;
    career.updatedAt = new Date().toISOString();
    saveHistoryStore(store);
  }

  // Save the snapshot for this confirmed date
  const snapshot = saveSnapshot(validDate, players, meta.manager, meta.myClub, saveKey, staff);
  return { career, snapshot, gameDate: validDate };
}

/**
 * Saves a new snapshot by gameDate and save/career.
 * Updates snapshot if CA/PA or player details changed on same game date.
 */
function saveSnapshot(gameDate, players, manager = '', club = '', refCode = '', staff = []) {
  const store = loadHistoryStore();
  const career = resolveCareer(store, { manager, myClub: club }, staff, refCode);
  const saveKey = career ? career.refCode : getSaveKey(manager, club, refCode);
  const careerId = career ? career.id : null;

  const playerMap = {};
  for (const p of players) {
    if (!p || !p.id || (p.name && (p.name.trim() === '?' || p.name.trim() === ''))) continue;
    playerMap[String(p.id)] = {
      ca: p.ca || 0,
      pa: p.pa || 0,
      age: p.age || 0,
      club: p.club || '',
      pos: p.pos || ''
    };
  }

  // Check if snapshot for this gameDate and career already exists
  const existingIdx = store.snapshots.findIndex(s => {
    return s.gameDate === gameDate && isSnapshotMatchingSave(s, saveKey, store);
  });

  if (existingIdx >= 0) {
    const existing = store.snapshots[existingIdx];
    let isIdentical = (existing.totalPlayers === players.length) &&
      (existing.manager === manager) &&
      (existing.club === club);

    if (isIdentical) {
      const oldP = existing.players || {};
      const oldKeys = Object.keys(oldP);
      const newKeys = Object.keys(playerMap);
      if (oldKeys.length !== newKeys.length) {
        isIdentical = false;
      } else {
        for (const k of newKeys) {
          const np = playerMap[k];
          const op = oldP[k];
          if (!op || op.ca !== np.ca || op.pa !== np.pa || op.club !== np.club || op.pos !== np.pos || op.age !== np.age) {
            isIdentical = false;
            break;
          }
        }
      }
    }

    if (isIdentical) {
      return existing; // Truly identical, no disk write needed
    }
  }

  const snapObj = {
    id: `snap_${gameDate.replace(/[^0-9]/g, '')}_${Date.now()}`,
    gameDate,
    timestamp: new Date().toISOString(),
    manager,
    club,
    saveKey,
    careerId,
    totalPlayers: players.length,
    players: playerMap
  };

  if (existingIdx >= 0) {
    store.snapshots[existingIdx] = snapObj;
  } else {
    store.snapshots.push(snapObj);
  }

  store.snapshots.sort((a, b) => a.gameDate.localeCompare(b.gameDate));
  saveHistoryStore(store);

  return snapObj;
}

function renameSnapshotDate(oldGameDate, newGameDate, manager = '', club = '', refCode = '', players = null) {
  const store = loadHistoryStore();
  const career = resolveCareer(store, { manager, myClub: club }, null, refCode);
  const targetKey = career ? career.id : getSaveKey(manager, club, refCode);

  const oldSnapIdx = store.snapshots.findIndex(s => s.gameDate === oldGameDate && isSnapshotMatchingSave(s, targetKey, store));
  if (oldSnapIdx < 0) return null;

  let playerMap = null;
  if (players && Array.isArray(players) && players.length > 0) {
    playerMap = {};
    for (const p of players) {
      if (!p || !p.id || (p.name && (p.name.trim() === '?' || p.name.trim() === ''))) continue;
      playerMap[String(p.id)] = {
        ca: p.ca || 0,
        pa: p.pa || 0,
        age: p.age || 0,
        club: p.club || '',
        pos: p.pos || ''
      };
    }
  }

  // Check if a snapshot for newGameDate already exists for this save
  const existingTargetIdx = store.snapshots.findIndex(s => s.gameDate === newGameDate && isSnapshotMatchingSave(s, targetKey, store));

  if (existingTargetIdx >= 0 && existingTargetIdx !== oldSnapIdx) {
    // A snapshot for newGameDate already exists!
    // Merge: update target snapshot and eliminate the redundant old snapshot so no duplicates exist!
    const targetSnap = store.snapshots[existingTargetIdx];
    if (playerMap) {
      targetSnap.players = playerMap;
      targetSnap.totalPlayers = players.length;
    } else if (store.snapshots[oldSnapIdx].players) {
      targetSnap.players = store.snapshots[oldSnapIdx].players;
      targetSnap.totalPlayers = store.snapshots[oldSnapIdx].totalPlayers;
    }
    targetSnap.timestamp = new Date().toISOString();
    store.snapshots.splice(oldSnapIdx, 1);
    store.snapshots.sort((a, b) => a.gameDate.localeCompare(b.gameDate));
    saveHistoryStore(store);
    return targetSnap;
  }

  const snap = store.snapshots[oldSnapIdx];
  snap.gameDate = newGameDate;
  snap.id = `snap_${newGameDate.replace(/[^0-9]/g, '')}_${Date.now()}`;
  snap.timestamp = new Date().toISOString();
  if (playerMap) {
    snap.players = playerMap;
    snap.totalPlayers = players.length;
  }
  store.snapshots.sort((a, b) => a.gameDate.localeCompare(b.gameDate));
  saveHistoryStore(store);
  return snap;
}

function listSnapshots(manager = '', club = '', refCode = '') {
  const store = loadHistoryStore();
  const career = resolveCareer(store, { manager, myClub: club }, null, refCode);
  const targetKey = career ? career.id : getSaveKey(manager, club, refCode);
  const filtered = (targetKey === 'default')
    ? store.snapshots
    : store.snapshots.filter(s => isSnapshotMatchingSave(s, targetKey, store));

  return filtered.map(s => ({
    id: s.id,
    gameDate: s.gameDate,
    timestamp: s.timestamp,
    manager: s.manager,
    club: s.club,
    saveKey: s.saveKey || getSaveKey(s.manager, s.club),
    careerId: s.careerId,
    totalPlayers: s.totalPlayers
  }));
}

function getSnapshot(gameDate, manager = '', club = '', refCode = '') {
  const store = loadHistoryStore();
  const career = resolveCareer(store, { manager, myClub: club }, null, refCode);
  const targetKey = career ? career.id : getSaveKey(manager, club, refCode);
  return store.snapshots.find(s => {
    if (s.gameDate !== gameDate) return false;
    return isSnapshotMatchingSave(s, targetKey, store);
  }) || null;
}

/**
 * Calculates delta CA, % growth, and status for an array of current players
 * against a baseline map of { [id]: { ca, pa, ... } }.
 */
function calculateDeltas(currentPlayers, baselineMap = {}) {
  return currentPlayers.map(p => {
    const base = baselineMap[String(p.id)];
    if (!base || typeof base.ca !== 'number' || base.ca <= 0) {
      return {
        ...p,
        deltaCA: 0,
        growthPercent: 0,
        prevCA: null,
        isNew: !base
      };
    }

    const prevCA = base.ca;
    const currentCA = p.ca || 0;
    const deltaCA = currentCA - prevCA;
    const growthPercent = Number(((deltaCA / prevCA) * 100).toFixed(2));

    return {
      ...p,
      deltaCA,
      growthPercent,
      prevCA,
      isNew: false
    };
  });
}

/**
 * Builds a map of playerId -> { ca, pa, gameDate } representing the earliest known
 * appearance (First Seen / Intake Date) of each player before the current game date.
 * If manager/club/refCode provided, restricts search to snapshots of that save career.
 */
function buildFirstSeenMap(snapshots = [], currentGameDate = '', manager = '', club = '', refCode = '') {
  const store = loadHistoryStore();
  const career = resolveCareer(store, { manager, myClub: club }, null, refCode);
  const targetKey = career ? career.id : getSaveKey(manager, club, refCode);
  const careerSnapshots = (targetKey === 'default')
    ? (snapshots || [])
    : (snapshots || []).filter(s => isSnapshotMatchingSave(s, targetKey, store));

  const priorSnapshots = careerSnapshots
    .filter(s => !currentGameDate || s.gameDate < currentGameDate)
    .sort((a, b) => a.gameDate.localeCompare(b.gameDate));

  const firstSeenMap = {};
  for (const snap of priorSnapshots) {
    if (!snap.players) continue;
    for (const [id, p] of Object.entries(snap.players)) {
      if (!firstSeenMap[id] && p && typeof p.ca === 'number' && p.ca > 0) {
        firstSeenMap[id] = {
          ca: p.ca,
          pa: p.pa,
          age: p.age,
          club: p.club,
          pos: p.pos,
          gameDate: snap.gameDate
        };
      }
    }
  }
  return firstSeenMap;
}

/**
 * Automatically calculates career progression from each player's First Seen date.
 * - Original players compare against Day 1 of their career save.
 * - Youth intake / newgens compare against the exact round they were first born/scanned.
 * - Different career saves remain isolated and do not contaminate each other.
 */
function calculateFirstSeenDeltas(currentPlayers, snapshots = [], currentGameDate = '', manager = '', club = '', refCode = '') {
  const store = loadHistoryStore();
  const career = resolveCareer(store, { manager, myClub: club }, null, refCode);
  const targetKey = career ? career.id : getSaveKey(manager, club, refCode);
  const careerSnapshots = (targetKey === 'default')
    ? (snapshots || [])
    : (snapshots || []).filter(s => isSnapshotMatchingSave(s, targetKey, store));

  const priorSnapshots = careerSnapshots
    .filter(s => !currentGameDate || s.gameDate < currentGameDate)
    .sort((a, b) => a.gameDate.localeCompare(b.gameDate));

  const hasPriorHistory = priorSnapshots.length > 0;
  const firstSeenMap = buildFirstSeenMap(snapshots, currentGameDate, manager, club, refCode);

  return currentPlayers.map(p => {
    if (!hasPriorHistory) {
      return {
        ...p,
        deltaCA: 0,
        growthPercent: 0,
        prevCA: null,
        firstSeenDate: currentGameDate,
        isNew: false,
        isFirstScan: true
      };
    }

    const base = firstSeenMap[String(p.id)];
    if (!base || typeof base.ca !== 'number' || base.ca <= 0) {
      return {
        ...p,
        deltaCA: 0,
        growthPercent: 0,
        prevCA: null,
        firstSeenDate: currentGameDate,
        isNew: true,
        isNewgen: !!p.isNewgen,
        isFirstScan: false
      };
    }

    const baselineCA = base.ca;
    const currentCA = p.ca || 0;
    const deltaCA = currentCA - baselineCA;
    const growthPercent = Number(((deltaCA / baselineCA) * 100).toFixed(2));

    return {
      ...p,
      deltaCA,
      growthPercent,
      prevCA: baselineCA,
      firstSeenDate: base.gameDate,
      isNew: false,
      isFirstScan: false
    };
  });
}

module.exports = {
  loadHistoryStore,
  saveHistoryStore,
  computeSaveRefCode,
  getSaveKey,
  isSnapshotMatchingSave,
  saveSnapshot,
  listSnapshots,
  getSnapshot,
  calculateDeltas,
  buildFirstSeenMap,
  calculateFirstSeenDeltas,
  renameSnapshotDate,
  resolveCareer,
  resolveEffectiveGameDate,
  confirmScanRoundDate,
  getHistoryFilePath,
  get HISTORY_FILE() { return getHistoryFilePath(); }
};
