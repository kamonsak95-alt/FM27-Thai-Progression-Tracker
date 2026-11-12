const { execFile, spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const run = promisify(execFile);
const directories = ['public', 'server', 'bin'];
const files = ['package.json', 'LICENSE', 'README.md', 'PRIVACY.md', 'Start-FM27-Tracker-Window.vbs', 'Start-FM27-Tracker.bat'];
const releaseRoot = 'FM27-Tracker';
const maxBytes = 100 * 1024 * 1024;

function validateArchiveEntries(list) {
  const seen = new Set();
  for (const entry of list.replace(/\r?\n$/, '').split(/\r?\n/)) {
    const parts = entry.replace(/\/$/, '').split('/');
    const [root, top] = parts;
    const key = parts.join('/').toLowerCase();
    if (root !== releaseRoot || seen.has(key) || parts.some(part =>
      !/^[\w.-]+$/.test(part) || part.endsWith('.') ||
      /^(?:con|prn|aux|nul|com\d|lpt\d)(?:\.|$)/i.test(part)
    ) || (top && !directories.includes(top) && !(parts.length === 2 && files.includes(top)))) {
      throw new Error('ไฟล์ ZIP มีเส้นทางที่ใช้ติดตั้งไม่ได้');
    }
    seen.add(key);
  }
}

async function downloadArchive(update, destination) {
  const response = await fetch(update.downloadUrl, { signal: AbortSignal.timeout(120000) });
  if (!response.ok || !response.body) throw new Error(`ดาวน์โหลด ZIP ไม่สำเร็จ (HTTP ${response.status})`);
  const digest = createHash('sha256');
  let size = 0;
  const verify = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > maxBytes || size > update.assetSize) return callback(new Error('ขนาด ZIP เกินที่ระบุ'));
      digest.update(chunk);
      callback(null, chunk);
    }
  });
  await pipeline(Readable.fromWeb(response.body), verify, fs.createWriteStream(destination, { flags: 'wx' }));
  if (size !== update.assetSize || `sha256:${digest.digest('hex')}` !== update.assetDigest) {
    throw new Error('ขนาดหรือ SHA-256 ของ ZIP ไม่ตรงกับ GitHub Release');
  }
}

function removeStage(root, staging) {
  if (path.dirname(path.resolve(staging)) !== path.resolve(root) ||
      !/^\.fm27-update-[\w-]+$/.test(path.basename(staging))) {
    throw new Error('ตำแหน่งโฟลเดอร์อัปเดตไม่ถูกต้อง');
  }
  fs.rmSync(staging, { recursive: true, force: true });
}

async function stageUpdate(root, update) {
  const staging = fs.mkdtempSync(path.join(root, '.fm27-update-'));
  try {
    const archive = path.join(staging, 'release.zip');
    await downloadArchive(update, archive);
    const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
    const options = { windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 };
    const { stdout: entries } = await run(tar, ['-tf', archive], options);
    validateArchiveEntries(entries);
    const { stdout: details } = await run(tar, ['-tvf', archive], options);
    if (details.trimEnd().split(/\r?\n/).some(line => !/^[-d]/.test(line))) {
      throw new Error('ไฟล์ ZIP มีรายการที่ไม่ใช่ไฟล์หรือโฟลเดอร์');
    }
    await run(tar, ['-xf', archive, '-C', staging], options);
    const extracted = path.join(staging, releaseRoot);
    if (JSON.parse(fs.readFileSync(path.join(extracted, 'package.json'), 'utf8')).version !== update.latestVersion ||
        !fs.statSync(path.join(extracted, 'server', 'index.js')).isFile() ||
        !fs.statSync(path.join(extracted, 'public', 'index.html')).isFile()) {
      throw new Error('ไฟล์โปรแกรมใน ZIP ไม่ตรงกับรุ่นที่เลือก');
    }
    fs.copyFileSync(__filename, path.join(staging, 'installer.js'));
    return staging;
  } catch (error) {
    removeStage(root, staging);
    throw error;
  }
}

function installFiles(root, extracted, backup) {
  const entries = [...directories, ...files];
  const moved = [];
  for (const entry of entries) {
    const stat = fs.lstatSync(path.join(extracted, entry));
    if (directories.includes(entry) ? !stat.isDirectory() : !stat.isFile()) {
      throw new Error(`ไฟล์โปรแกรมไม่ถูกต้อง (${entry})`);
    }
  }
  fs.mkdirSync(backup);

  function rollback() {
    for (const item of moved.slice().reverse()) {
      if (item.installed) fs.renameSync(item.target, item.source);
      if (item.saved) fs.renameSync(item.previous, item.target);
    }
  }

  try {
    for (const entry of entries) {
      const item = {
        target: path.join(root, entry),
        source: path.join(extracted, entry),
        previous: path.join(backup, entry)
      };
      moved.push(item);
      if (fs.lstatSync(item.target, { throwIfNoEntry: false })) {
        fs.renameSync(item.target, item.previous);
        item.saved = true;
      }
      fs.renameSync(item.source, item.target);
      item.installed = true;
    }
  } catch (error) {
    try {
      rollback();
    } catch (restoreError) {
      throw new AggregateError([error, restoreError], 'Could not restore program files');
    }
    throw error;
  }
  return rollback;
}

function startTracker(root, updateId, rolledBack = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'server', 'index.js')], {
      cwd: root, detached: true, windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      env: { ...process.env, FM27_UPDATE_ID: updateId, FM27_UPDATE_ROLLBACK: rolledBack ? '1' : '' }
    });
    const timer = setTimeout(() => child.kill(), 12000);
    child.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', () => {
      clearTimeout(timer);
      reject(new Error('Tracker เปิดหลังอัปเดตไม่สำเร็จ'));
    });
    child.on('message', message => {
      if (message !== 'fm27-ready') return;
      clearTimeout(timer);
      child.disconnect();
      child.unref();
      resolve();
    });
  });
}

async function finishUpdate(root, staging, updateId) {
  let rollback;
  try {
    rollback = installFiles(root, path.join(staging, releaseRoot), path.join(staging, 'backup'));
    await startTracker(root, updateId);
  } catch (error) {
    if (error instanceof AggregateError) throw error;
    rollback?.();
    await startTracker(root, updateId, true);
  }
  removeStage(root, staging);
}

if (require.main === module) {
  process.once('disconnect', () => {
    finishUpdate(...process.argv.slice(2)).catch(error => {
      fs.writeFileSync(path.join(__dirname, 'error.log'), String(error));
      process.exitCode = 1;
    });
  });
}

module.exports = { validateArchiveEntries, installFiles, stageUpdate, removeStage };
