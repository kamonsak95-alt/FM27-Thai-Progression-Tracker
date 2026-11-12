const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { getLatestDump, runScan, getScannerStatus } = require('./scannerBridge');
const { saveSnapshot, listSnapshots, getSnapshot, calculateDeltas } = require('./historyEngine');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// In-memory cache of current parsed dump
let cachedDump = null;
let cachedPlayersWithDeltas = null;
let currentBaselineDate = null;

function getOrLoadDump() {
  if (!cachedDump) {
    cachedDump = getLatestDump();
    if (cachedDump?.meta?.gameDate && cachedDump?.players) {
      // Auto-save initial snapshot
      saveSnapshot(
        cachedDump.meta.gameDate,
        cachedDump.players,
        cachedDump.meta.manager,
        cachedDump.meta.myClub
      );
    }
  }
  return cachedDump;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security check: must stay within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API Endpoints
  if (pathname === '/api/status') {
    const status = getScannerStatus();
    const dump = getOrLoadDump();
    return sendJson(res, 200, {
      ...status,
      meta: dump?.meta || null,
      totalPlayers: dump?.players?.length || 0,
      snapshots: listSnapshots()
    });
  }

  if (pathname === '/api/scan' && req.method === 'POST') {
    runScan().then(result => {
      if (result.ok) {
        cachedDump = getLatestDump();
        cachedPlayersWithDeltas = null;
        if (cachedDump?.meta?.gameDate && cachedDump?.players) {
          saveSnapshot(
            cachedDump.meta.gameDate,
            cachedDump.players,
            cachedDump.meta.manager,
            cachedDump.meta.myClub
          );
        }
      }
      sendJson(res, result.ok ? 200 : 500, result);
    }).catch(err => {
      sendJson(res, 500, { ok: false, error: err.message });
    });
    return;
  }

  if (pathname === '/api/snapshots') {
    return sendJson(res, 200, { snapshots: listSnapshots() });
  }

  if (pathname === '/api/players') {
    const dump = getOrLoadDump();
    if (!dump || !dump.players) {
      return sendJson(res, 200, {
        meta: null,
        total: 0,
        players: []
      });
    }

    const baselineDate = parsedUrl.query.baseline || '';
    if (baselineDate !== currentBaselineDate || !cachedPlayersWithDeltas) {
      currentBaselineDate = baselineDate;
      const snap = baselineDate ? getSnapshot(baselineDate) : null;
      cachedPlayersWithDeltas = calculateDeltas(dump.players, snap ? snap.players : {});
    }

    let result = cachedPlayersWithDeltas;

    // Filter by name
    const q = (parsedUrl.query.q || '').trim().toLowerCase();
    if (q) {
      result = result.filter(p => p.name && p.name.toLowerCase().includes(q));
    }

    // Filter by Age
    const minAge = parseInt(parsedUrl.query.minAge, 10);
    const maxAge = parseInt(parsedUrl.query.maxAge, 10);
    if (!isNaN(minAge)) result = result.filter(p => p.age >= minAge);
    if (!isNaN(maxAge)) result = result.filter(p => p.age <= maxAge);

    // Filter by CA
    const minCA = parseInt(parsedUrl.query.minCA, 10);
    const maxCA = parseInt(parsedUrl.query.maxCA, 10);
    if (!isNaN(minCA)) result = result.filter(p => p.ca >= minCA);
    if (!isNaN(maxCA)) result = result.filter(p => p.ca <= maxCA);

    // Filter by PA
    const minPA = parseInt(parsedUrl.query.minPA, 10);
    const maxPA = parseInt(parsedUrl.query.maxPA, 10);
    if (!isNaN(minPA)) result = result.filter(p => p.pa >= minPA);
    if (!isNaN(maxPA)) result = result.filter(p => p.pa <= maxPA);

    // Filter by Position category (GK, DEF, MID, ATT)
    const pos = (parsedUrl.query.pos || '').trim().toUpperCase();
    if (pos && pos !== 'ALL') {
      if (pos === 'GK') {
        result = result.filter(p => (p.pos || '').includes('GK'));
      } else if (pos === 'DEF') {
        result = result.filter(p => /D [RLC]|DC|DR|DL|WBL|WBR|SW/i.test(p.pos || ''));
      } else if (pos === 'MID') {
        result = result.filter(p => /M [RLC]|MC|MR|ML|DM|AMC|AML|AMR/i.test(p.pos || ''));
      } else if (pos === 'ATT') {
        result = result.filter(p => /ST|FC|S [RLC]/i.test(p.pos || ''));
      } else {
        result = result.filter(p => (p.pos || '').includes(pos));
      }
    }

    // Wonderkids shortcut: age <= 21 and pa >= 150
    if (parsedUrl.query.wonderkids === '1') {
      result = result.filter(p => p.age <= 21 && p.pa >= 150);
    }

    // My Club only
    if (parsedUrl.query.myClub === '1' && dump.meta?.myClub) {
      result = result.filter(p => p.club === dump.meta.myClub);
    }

    // Sorting
    const sortBy = parsedUrl.query.sort || 'growthPercent';
    const order = parsedUrl.query.order === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      let va = a[sortBy];
      let vb = b[sortBy];
      if (va == null) va = -9999;
      if (vb == null) vb = -9999;
      if (typeof va === 'string') return order * va.localeCompare(vb);
      return order * (va - vb);
    });

    const totalCount = result.length;
    const page = Math.max(1, parseInt(parsedUrl.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(10, parseInt(parsedUrl.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const paginated = result.slice(offset, offset + limit).map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      club: p.club,
      div: p.div,
      nat: p.nat,
      pos: p.pos,
      ca: p.ca,
      pa: p.pa,
      prevCA: p.prevCA,
      deltaCA: p.deltaCA,
      growthPercent: p.growthPercent,
      isNew: p.isNew,
      value: p.value,
      wage: p.wage
    }));

    return sendJson(res, 200, {
      meta: dump.meta,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      baselineDate: currentBaselineDate,
      players: paginated
    });
  }

  // Player Detail Endpoint
  if (pathname.startsWith('/api/player/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    const dump = getOrLoadDump();
    const player = dump?.players?.find(p => p.id === id);
    if (!player) {
      return sendJson(res, 404, { error: 'ไม่พบข้อมูลนักเตะ' });
    }

    // Gather history points across snapshots
    const store = require('./historyEngine');
    const allSnaps = store.listSnapshots();
    const historyPoints = [];
    for (const snapInfo of allSnaps) {
      const snapData = store.getSnapshot(snapInfo.gameDate);
      if (snapData && snapData.players[String(id)]) {
        historyPoints.push({
          gameDate: snapInfo.gameDate,
          ca: snapData.players[String(id)].ca,
          pa: snapData.players[String(id)].pa,
          club: snapData.players[String(id)].club
        });
      }
    }

    return sendJson(res, 200, {
      player,
      historyPoints
    });
  }

  // Fallback to static files
  serveStatic(req, res, pathname);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`⚽ FM27 Thai Progression Tracker & Scout Tool`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = server;
