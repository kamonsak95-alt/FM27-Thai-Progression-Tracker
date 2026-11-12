const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { getLatestDump, runScan, getScannerStatus } = require('./scannerBridge');
const { saveSnapshot, listSnapshots, getSnapshot, calculateDeltas, calculateFirstSeenDeltas, loadHistoryStore, saveHistoryStore, computeSaveRefCode, renameSnapshotDate, resolveCareer, resolveEffectiveGameDate, confirmScanRoundDate } = require('./historyEngine');
const { predictDevelopmentTrend } = require('./trendEngine');
const { checkForUpdates, applyUpdate, getLocalCommit } = require('./updaterEngine');
const { filterStaff, getStaffDetail } = require('./staffEngine');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// In-memory cache of current parsed dump
let cachedDump = null;
let cachedPlayersWithDeltas = null;
let currentBaselineDate = null;
let currentSaveKey = null;

function syncDumpWithCareer(dump) {
  if (!dump || !dump.meta) return;
  const store = loadHistoryStore();
  const career = resolveCareer(store, dump.meta, dump.staff);
  resolveEffectiveGameDate(dump.meta, career, store);
}

function getOrLoadDump() {
  if (!cachedDump) {
    cachedDump = getLatestDump();
    if (cachedDump) {
      if (!cachedDump.meta) cachedDump.meta = {};
      cachedDump.meta.scanId = cachedDump.meta.scanId || `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      syncDumpWithCareer(cachedDump);
    }
    // Auto-save snapshot whenever we have valid data (no manual confirmation needed)
    if (cachedDump?.meta?.gameDate && cachedDump?.players) {
      const refCode = computeSaveRefCode(cachedDump.meta, cachedDump.staff);
      saveSnapshot(
        cachedDump.meta.gameDate,
        cachedDump.players,
        cachedDump.meta.manager,
        cachedDump.meta.myClub,
        refCode,
        cachedDump.staff
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
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const parsedUrl = new URL(req.url, `http://${host}`);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  // API Endpoints
  if (pathname === '/api/status') {
    const status = getScannerStatus();
    const dump = getOrLoadDump();
    let currentCommit = 'local';
    try {
      const commitHash = await getLocalCommit();
      currentCommit = commitHash ? commitHash.slice(0, 7) : 'local';
    } catch {}

    // Check if there is a pending .just_updated.json marker from prelaunch
    let justUpdated = null;
    const justUpdatedPath = path.join(__dirname, '..', 'data', '.just_updated.json');
    if (fs.existsSync(justUpdatedPath)) {
      try {
        const juData = JSON.parse(fs.readFileSync(justUpdatedPath, 'utf8'));
        if (Date.now() - juData.timestamp < 10 * 60 * 1000) {
          justUpdated = juData;
        }
        fs.unlinkSync(justUpdatedPath);
      } catch {}
    }

    const refCode = dump?.meta ? computeSaveRefCode(dump.meta, dump.staff) : null;
    return sendJson(res, 200, {
      ...status,
      meta: dump?.meta || null,
      refCode,
      currentCommit,
      justUpdated,
      totalPlayers: dump?.players?.length || 0,
      snapshots: listSnapshots(dump?.meta?.manager, dump?.meta?.myClub, refCode)
    });
  }

  if (pathname === '/api/scan' && req.method === 'POST') {
    runScan().then(result => {
      let refCode = null;
      if (result.ok) {
        cachedDump = getLatestDump();
        cachedPlayersWithDeltas = null;
        if (cachedDump) {
          if (!cachedDump.meta) cachedDump.meta = {};
          cachedDump.meta.scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          cachedDump.meta.gameDateConfirmed = false;
          syncDumpWithCareer(cachedDump);
        }
        // Auto-save snapshot after every scan (no manual confirmation needed)
        if (cachedDump?.meta?.gameDate && cachedDump?.players) {
          refCode = computeSaveRefCode(cachedDump.meta, cachedDump.staff);
          saveSnapshot(
            cachedDump.meta.gameDate,
            cachedDump.players,
            cachedDump.meta.manager,
            cachedDump.meta.myClub,
            refCode,
            cachedDump.staff
          );
        } else if (cachedDump?.meta) {
          refCode = computeSaveRefCode(cachedDump.meta, cachedDump.staff);
        }
      }
      sendJson(res, result.ok ? 200 : 500, {
        ...result,
        refCode,
        meta: cachedDump?.meta || null
      });
    }).catch(err => {
      sendJson(res, 500, { ok: false, error: err.message });
    });
    return;
  }

  if (pathname === '/api/snapshots') {
    const dump = getOrLoadDump();
    const refCode = dump?.meta ? computeSaveRefCode(dump.meta, dump.staff) : null;
    return sendJson(res, 200, { snapshots: listSnapshots(dump?.meta?.manager, dump?.meta?.myClub, refCode) });
  }

  if ((pathname === '/api/confirm-date' || pathname === '/api/set-date') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { gameDate, scanId, refCode } = JSON.parse(body || '{}');
        const date = typeof gameDate === 'string' ? gameDate.trim() : '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toJSON()?.slice(0, 10) !== date) {
          return sendJson(res, 400, { ok: false, error: 'INVALID_DATE', message: 'กรุณาระบุวันที่ที่มีอยู่จริงในรูปแบบ YYYY-MM-DD' });
        }

        if (typeof scanId !== 'string' || !scanId.trim() || typeof refCode !== 'string' || !refCode.trim()) {
          return sendJson(res, 400, {
            ok: false,
            error: 'MISSING_SCAN_CONTEXT',
            message: 'ไม่พบรหัสรอบสแกนหรือรหัสเซฟ กรุณาโหลดข้อมูลเกมใหม่ก่อนยืนยันวันที่'
          });
        }

        const dump = getOrLoadDump();
        if (!dump || !dump.meta) {
          return sendJson(res, 404, { ok: false, error: 'NO_DUMP', message: 'ไม่พบข้อมูลการสแกนในระบบ' });
        }

        const activeRefCode = computeSaveRefCode(dump.meta, dump.staff);

        // Verification: ensure confirmation matches the active scan round and save
        if (scanId !== dump.meta.scanId) {
          return sendJson(res, 409, {
            ok: false,
            error: 'STALE_SCAN_ROUND',
            message: 'รอบการสแกนเปลี่ยนไปแล้ว คำยืนยันนี้ไม่ตรงกับรอบปัจจุบัน'
          });
        }

        if (refCode !== activeRefCode) {
          return sendJson(res, 409, {
            ok: false,
            error: 'CAREER_MISMATCH',
            message: 'เซฟเกมที่กำลังเปิดอยู่ไม่ตรงกับคำยืนยัน'
          });
        }

        const store = loadHistoryStore();
        const result = confirmScanRoundDate(
          store,
          dump.meta,
          date,
          dump.players || [],
          dump.staff || [],
          activeRefCode
        );

        cachedPlayersWithDeltas = null;

        sendJson(res, 200, {
          ok: true,
          gameDate: result.gameDate,
          scanId: dump.meta.scanId,
          refCode: activeRefCode,
          snapshot: result.snapshot
        });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: e.message });
      }
    });
    return;
  }

  if (pathname === '/api/check-update') {
    checkForUpdates().then(info => {
      sendJson(res, 200, info);
    }).catch(err => {
      sendJson(res, 500, { hasUpdate: false, error: err.message });
    });
    return;
  }

  if (pathname === '/api/apply-update' && req.method === 'POST') {
    applyUpdate().then(result => {
      sendJson(res, result.ok ? 200 : 500, result);
    }).catch(err => {
      sendJson(res, 500, { ok: false, error: err.message });
    });
    return;
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

    const baselineDate = query.baseline || '';
    const refCode = computeSaveRefCode(dump.meta, dump.staff);
    const activeSaveKey = refCode || `${dump.meta?.manager || ''}__${dump.meta?.myClub || ''}`;
    if (baselineDate !== currentBaselineDate || activeSaveKey !== currentSaveKey || !cachedPlayersWithDeltas) {
      currentBaselineDate = baselineDate;
      currentSaveKey = activeSaveKey;
      const validPlayers = dump.players.filter(p => p && p.name && p.name.trim() && p.name.trim() !== '?');
      let deltas;
      if (baselineDate && baselineDate !== dump.meta?.gameDate) {
        const snap = getSnapshot(baselineDate, dump.meta?.manager, dump.meta?.myClub, refCode);
        deltas = calculateDeltas(validPlayers, snap ? snap.players : {});
      } else {
        const store = loadHistoryStore();
        deltas = calculateFirstSeenDeltas(
          validPlayers,
          store.snapshots,
          dump.meta?.gameDate,
          dump.meta?.manager,
          dump.meta?.myClub,
          refCode
        );
      }
      cachedPlayersWithDeltas = deltas.map(p => {
        const trend = predictDevelopmentTrend(p, p.deltaCA);
        return {
          ...p,
          trend,
          trendScore: trend.score
        };
      });
    }

    let result = cachedPlayersWithDeltas;

    // Filter by name
    const q = (query.q || '').trim().toLowerCase();
    if (q) {
      result = result.filter(p => p.name && p.name.toLowerCase().includes(q));
    }

    // Filter by Age
    const minAge = parseInt(query.minAge, 10);
    const maxAge = parseInt(query.maxAge, 10);
    if (!isNaN(minAge)) result = result.filter(p => p.age >= minAge);
    if (!isNaN(maxAge)) result = result.filter(p => p.age <= maxAge);

    // Filter by CA
    const minCA = parseInt(query.minCA, 10);
    const maxCA = parseInt(query.maxCA, 10);
    if (!isNaN(minCA)) result = result.filter(p => p.ca >= minCA);
    if (!isNaN(maxCA)) result = result.filter(p => p.ca <= maxCA);

    // Filter by PA
    const minPA = parseInt(query.minPA, 10);
    const maxPA = parseInt(query.maxPA, 10);
    if (!isNaN(minPA)) result = result.filter(p => p.pa >= minPA);
    if (!isNaN(maxPA)) result = result.filter(p => p.pa <= maxPA);

    // Filter by Position (Categories or specific positions e.g. DC, AML, ST, MC)
    const posQuery = (query.pos || '').trim();
    const natOnly = query.natOnly === '1';
    if (posQuery && posQuery !== 'ALL') {
      const selectedPositions = posQuery.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (selectedPositions.length > 0) {
        result = result.filter(p => {
          const pArr = p.posArr || (p.pos ? p.pos.split(',').map(s => s.trim().toUpperCase()) : []);
          const pNat = (p.posNat && p.posNat.length > 0) ? p.posNat : (pArr.length > 0 ? [pArr[0]] : []);
          const targetArr = natOnly ? pNat : pArr;
          return selectedPositions.some(sp => {
            if (sp === 'GK') return targetArr.includes('GK');
            if (sp === 'DEF') return targetArr.some(x => ['DC', 'DR', 'DL', 'WBL', 'WBR', 'SW'].includes(x));
            if (sp === 'MID') return targetArr.some(x => ['MC', 'MR', 'ML', 'DM', 'AMC', 'AML', 'AMR'].includes(x));
            if (sp === 'ATT') return targetArr.some(x => ['ST', 'FC'].includes(x));
            return targetArr.includes(sp);
          });
        });
      }
    }

    // Filter by Trend
    const trendFilter = (query.trend || '').trim().toLowerCase();
    if (trendFilter) {
      result = result.filter(p => p.trend && p.trend.code === trendFilter);
    }

    // Wonderkids shortcut: age <= 21 and pa >= 150
    if (query.wonderkids === '1') {
      result = result.filter(p => p.age <= 21 && p.pa >= 150);
    }

    // My Club only
    if (query.myClub === '1' && dump.meta?.myClub) {
      result = result.filter(p => p.club === dump.meta.myClub);
    }

    // Sorting
    const sortBy = query.sort || 'growthPercent';
    const order = query.order === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      let va = a[sortBy];
      let vb = b[sortBy];
      if (va == null) va = -9999;
      if (vb == null) vb = -9999;
      if (typeof va === 'string') return order * va.localeCompare(vb);
      return order * (va - vb);
    });

    const totalCount = result.length;
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(200, Math.max(10, parseInt(query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const paginated = result.slice(offset, offset + limit).map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      club: p.club,
      div: p.div,
      nat: p.nat,
      pos: p.pos,
      posArr: p.posArr || (p.pos ? p.pos.split(',').map(s => s.trim().toUpperCase()) : []),
      posNat: (p.posNat && p.posNat.length > 0) ? p.posNat : ((p.posArr && p.posArr.length > 0) ? [p.posArr[0]] : []),
      ca: p.ca,
      pa: p.pa,
      prevCA: p.prevCA,
      deltaCA: p.deltaCA,
      growthPercent: p.growthPercent,
      isNew: !!p.isNew,
      isNewgen: !!p.isNewgen,
      isFirstScan: !!p.isFirstScan,
      firstSeenDate: p.firstSeenDate || null,
      trend: p.trend,
      trendScore: p.trendScore,
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

    // Gather history points across snapshots for the active save
    const store = require('./historyEngine');
    const refCode = dump?.meta ? store.computeSaveRefCode(dump.meta, dump.staff) : null;
    const allSnaps = store.listSnapshots(dump?.meta?.manager, dump?.meta?.myClub, refCode);
    const currentGameDate = dump?.meta?.gameDate || '9999-99-99';
    const historyPoints = [];
    for (const snapInfo of allSnaps) {
      if (snapInfo.gameDate > currentGameDate) continue;
      const snapData = store.getSnapshot(snapInfo.gameDate, dump?.meta?.manager, dump?.meta?.myClub, refCode);
      if (snapData && snapData.players[String(id)]) {
        historyPoints.push({
          gameDate: snapInfo.gameDate,
          ca: snapData.players[String(id)].ca,
          pa: snapData.players[String(id)].pa,
          club: snapData.players[String(id)].club
        });
      }
    }

    const trend = predictDevelopmentTrend(player, 0);

    return sendJson(res, 200, {
      player,
      trend,
      historyPoints
    });
  }

  // Staff List Endpoint
  if (pathname === '/api/staff') {
    const dump = getOrLoadDump();
    if (!dump || !dump.staff) {
      return sendJson(res, 200, {
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
        staff: []
      });
    }

    const query = Object.fromEntries(parsedUrl.searchParams.entries());
    const filterParams = {
      ...query,
      myClub: dump.meta?.myClub || ''
    };
    const result = filterStaff(dump.staff, filterParams);
    return sendJson(res, 200, {
      meta: dump.meta,
      ...result
    });
  }

  // Staff Detail Endpoint
  if (pathname.startsWith('/api/staff/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    const dump = getOrLoadDump();
    const detail = getStaffDetail(dump?.staff || [], id);
    if (!detail) {
      return sendJson(res, 404, { error: 'ไม่พบข้อมูลทีมงาน' });
    }
    return sendJson(res, 200, { staff: detail });
  }

  // Fallback to static files
  serveStatic(req, res, pathname);
});

if (require.main === module) {
  process.on('uncaughtException', (err) => {
    console.error('[SERVER ERROR] Uncaught exception:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[SERVER ERROR] Unhandled rejection:', reason);
  });
  server.on('error', (err) => {
    console.error('[SERVER ERROR] HTTP Server error:', err);
  });

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`⚽ FM27 Thai Progression Tracker & Scout Tool`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = server;
