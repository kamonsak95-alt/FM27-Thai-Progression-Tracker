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

module.exports = {
  saveSnapshot,
  listSnapshots,
  getSnapshot,
  calculateDeltas,
  getHistoryFilePath,
  get HISTORY_FILE() { return getHistoryFilePath(); }
};
