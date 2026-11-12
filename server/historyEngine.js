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

/**
 * Saves a new snapshot by gameDate.
 * Only keeps minimal mapping (id -> { ca, pa, age, club, pos }) to keep file size efficient.
 */
function saveSnapshot(gameDate, players, manager = '', club = '') {
  const store = loadHistoryStore();
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

  // Check if snapshot for this gameDate already exists
  const existingIdx = store.snapshots.findIndex(s => s.gameDate === gameDate);
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

function listSnapshots() {
  const store = loadHistoryStore();
  return store.snapshots.map(s => ({
    id: s.id,
    gameDate: s.gameDate,
    timestamp: s.timestamp,
    manager: s.manager,
    club: s.club,
    totalPlayers: s.totalPlayers
  }));
}

function getSnapshot(gameDate) {
  const store = loadHistoryStore();
  return store.snapshots.find(s => s.gameDate === gameDate) || null;
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
 */
function buildFirstSeenMap(snapshots = [], currentGameDate = '') {
  const priorSnapshots = (snapshots || [])
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
 * - Original players compare against Day 1 (save start).
 * - Youth intake / newgens compare against the exact round they were first born/scanned.
 */
function calculateFirstSeenDeltas(currentPlayers, snapshots = [], currentGameDate = '') {
  const priorSnapshots = (snapshots || [])
    .filter(s => !currentGameDate || s.gameDate < currentGameDate)
    .sort((a, b) => a.gameDate.localeCompare(b.gameDate));

  const hasPriorHistory = priorSnapshots.length > 0;
  const firstSeenMap = buildFirstSeenMap(snapshots, currentGameDate);

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
  saveSnapshot,
  listSnapshots,
  getSnapshot,
  calculateDeltas,
  buildFirstSeenMap,
  calculateFirstSeenDeltas,
  getHistoryFilePath,
  get HISTORY_FILE() { return getHistoryFilePath(); }
};
