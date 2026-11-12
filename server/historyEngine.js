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

function loadHistoryStore() {
  ensureDataDir();
  const filePath = getHistoryFilePath();
  if (!fs.existsSync(filePath)) {
    return { snapshots: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { snapshots: [] };
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

function computeSaveRefCode(meta = {}, staff = []) {
  if (!meta || !meta.myClub) return 'DEFAULT';

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

function isSnapshotMatchingSave(snapshot, targetKey) {
  if (!targetKey || targetKey === 'default' || targetKey === 'DEFAULT') return true;
  if (snapshot.saveKey && snapshot.saveKey === targetKey) return true;
  const legacyKey = getSaveKey(snapshot.manager, snapshot.club);
  if (legacyKey === targetKey) return true;
  return false;
}

/**
 * Saves a new snapshot by gameDate and save/career.
 * Only keeps minimal mapping (id -> { ca, pa, age, club, pos }) to keep file size efficient.
 */
function saveSnapshot(gameDate, players, manager = '', club = '', refCode = '') {
  const store = loadHistoryStore();
  const saveKey = getSaveKey(manager, club, refCode);

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

  // Check if snapshot for this gameDate and saveKey already exists
  const existingIdx = store.snapshots.findIndex(s => {
    return s.gameDate === gameDate && isSnapshotMatchingSave(s, saveKey);
  });

  if (existingIdx >= 0) {
    const existing = store.snapshots[existingIdx];
    if (existing.club === club && existing.manager === manager && existing.totalPlayers === players.length) {
      const existingKeys = Object.keys(existing.players || {});
      const newKeys = Object.keys(playerMap);
      if (existingKeys.length === newKeys.length) {
        return existing; // Already identical, no write needed
      }
    }
  }
  const snapObj = {
    id: `snap_${gameDate.replace(/[^0-9]/g, '')}_${Date.now()}`,
    gameDate,
    timestamp: new Date().toISOString(),
    manager,
    club,
    saveKey,
    totalPlayers: players.length,
    players: playerMap
  };

  if (existingIdx >= 0) {
    store.snapshots[existingIdx] = snapObj;
  } else {
    store.snapshots.push(snapObj);
  }

  // Sort by gameDate ascending
  store.snapshots.sort((a, b) => a.gameDate.localeCompare(b.gameDate));
  saveHistoryStore(store);

  return snapObj;
}

function listSnapshots(manager = '', club = '', refCode = '') {
  const store = loadHistoryStore();
  const targetKey = getSaveKey(manager, club, refCode);
  const filtered = (targetKey === 'default')
    ? store.snapshots
    : store.snapshots.filter(s => isSnapshotMatchingSave(s, targetKey));

  return filtered.map(s => ({
    id: s.id,
    gameDate: s.gameDate,
    timestamp: s.timestamp,
    manager: s.manager,
    club: s.club,
    saveKey: s.saveKey || getSaveKey(s.manager, s.club),
    totalPlayers: s.totalPlayers
  }));
}

function getSnapshot(gameDate, manager = '', club = '', refCode = '') {
  const store = loadHistoryStore();
  const targetKey = getSaveKey(manager, club, refCode);
  return store.snapshots.find(s => {
    if (s.gameDate !== gameDate) return false;
    return isSnapshotMatchingSave(s, targetKey);
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
  const targetKey = getSaveKey(manager, club, refCode);
  const careerSnapshots = (targetKey === 'default')
    ? (snapshots || [])
    : (snapshots || []).filter(s => isSnapshotMatchingSave(s, targetKey));

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
  const targetKey = getSaveKey(manager, club, refCode);
  const careerSnapshots = (targetKey === 'default')
    ? (snapshots || [])
    : (snapshots || []).filter(s => isSnapshotMatchingSave(s, targetKey));

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
  computeSaveRefCode,
  getSaveKey,
  isSnapshotMatchingSave,
  saveSnapshot,
  listSnapshots,
  getSnapshot,
  calculateDeltas,
  buildFirstSeenMap,
  calculateFirstSeenDeltas,
  getHistoryFilePath,
  get HISTORY_FILE() { return getHistoryFilePath(); }
};
