const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadHistoryStore() {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) {
    return { snapshots: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return { snapshots: [] };
  }
}

function saveHistoryStore(store) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(store, null, 2), 'utf8');
}

/**
 * Saves a new snapshot by gameDate.
 * Only keeps minimal mapping (id -> { ca, pa, age, club, pos }) to keep file size efficient.
 */
function saveSnapshot(gameDate, players, manager = '', club = '') {
  const store = loadHistoryStore();
  const playerMap = {};
  for (const p of players) {
    if (!p || !p.id) continue;
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

module.exports = {
  saveSnapshot,
  listSnapshots,
  getSnapshot,
  calculateDeltas,
  HISTORY_FILE
};
