const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

function resolveScannerPath() {
  if (process.env.FMSS_SCANNER && fs.existsSync(process.env.FMSS_SCANNER)) {
    return process.env.FMSS_SCANNER;
  }
  const bundledPath = path.join(__dirname, '..', 'bin', 'FMSuperScout.Scanner.exe');
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }
  const defaultInstallPath = 'C:\\Program Files\\FMSuperScout\\FMSuperScout.Scanner.exe';
  if (fs.existsSync(defaultInstallPath)) {
    return defaultInstallPath;
  }
  return bundledPath;
}

const SCANNER_EXE = resolveScannerPath();
const DUMP_DIR = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'FMSuperScout');
const DUMP_FILE = path.join(DUMP_DIR, 'dump.json');

/**
 * Checks scanner availability and executable status
 */
function getScannerStatus() {
  const exists = fs.existsSync(SCANNER_EXE);
  const dumpExists = fs.existsSync(DUMP_FILE);
  let lastDumpTime = null;
  if (dumpExists) {
    try {
      lastDumpTime = fs.statSync(DUMP_FILE).mtime;
    } catch {
      // ignore
    }
  }
  return {
    scannerAvailable: exists,
    scannerPath: SCANNER_EXE,
    dumpAvailable: dumpExists,
    dumpPath: DUMP_FILE,
    lastDumpTime
  };
}

/**
 * Reads the latest dump.json from local AppData
 */
function getLatestDump() {
  if (!fs.existsSync(DUMP_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(DUMP_FILE, 'utf8');
    const data = JSON.parse(raw);

    // Filter out FM memory stubs / placeholder entities without valid names (name: '?')
    if (Array.isArray(data.players)) {
      data.players = data.players.filter(p => p && p.name && p.name.trim() && p.name.trim() !== '?');
    }
    if (Array.isArray(data.staff)) {
      data.staff = data.staff.filter(s => s && s.name && s.name.trim() && s.name.trim() !== '?');
    }

    return data;
  } catch (err) {
    console.error('Error reading dump.json:', err.message);
    throw err;
  }
}

/**
 * Executes a scan using the external C# scanner
 */
function runScan() {
  return new Promise((resolve) => {
    if (!fs.existsSync(SCANNER_EXE)) {
      return resolve({
        ok: false,
        error: `ไม่พบตัวสแกนที่: ${SCANNER_EXE}`
      });
    }

    const start = Date.now();
    let stdout = '';
    let stderr = '';

    const child = spawn(SCANNER_EXE, ['scan'], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      resolve({
        ok: false,
        error: `เกิดข้อผิดพลาดในการเรียกตัวสแกน: ${err.message}`
      });
    });

    child.on('close', (code) => {
      const elapsed = Date.now() - start;
      if (code !== 0) {
        return resolve({
          ok: false,
          code,
          error: stderr || stdout || 'การสแกนล้มเหลว (ตรวจสอบว่าเปิดเกม FM27 อยู่หรือไม่)',
          elapsed
        });
      }

      // Check if dump was updated
      try {
        const dump = getLatestDump();
        resolve({
          ok: true,
          elapsed,
          meta: dump?.meta || null,
          playersCount: dump?.players?.length || 0,
          staffCount: dump?.staff?.length || 0,
          output: stdout
        });
      } catch (err) {
        resolve({
          ok: false,
          error: `สแกนสำเร็จแต่อ่านไฟล์ข้อมูลล้มเหลว: ${err.message}`,
          elapsed
        });
      }
    });
  });
}

module.exports = {
  getScannerStatus,
  getLatestDump,
  runScan,
  SCANNER_EXE,
  DUMP_FILE
};
