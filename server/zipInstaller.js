const { execFile, spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const run = promisify(execFile);
const directories = ['public', 'server', 'bin'];
const files = ['package.json', 'LICENSE', 'README.md', 'PRIVACY.md', 'Start-FM27-Tracker-Window.vbs', 'Start-FM27-Tracker.bat'];
const releaseRoot = 'FM27-Tracker';
const maxBytes = 100 * 1024 * 1024;
const bundledRuntime = root => path.join(root, 'bin', 'node-runtime', 'node.exe');

function startUpdateWorker(root, staging, updateId, version) {
  const args = [path.join(staging, 'installer.js'), root, staging, updateId, ...(version ? [version] : [])];
  const options = { cwd: os.tmpdir(), windowsHide: true, detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] };
  if (path.relative(root, process.execPath).toLowerCase() !== path.join('bin', 'node-runtime', 'node.exe'))
    return spawn(process.execPath, args, options);

  // Windows locks running executables, so run the worker outside the installation.
  const workerDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-update-runtime-'));
  const workerRuntime = path.join(workerDirectory, 'node.exe');
  try {
    fs.copyFileSync(process.execPath, workerRuntime);
    const worker = spawn(workerRuntime, args, options);
    const cleanup = () => fs.rmSync(workerDirectory, { recursive: true, force: true });
    worker.once('error', cleanup);
    worker.once('spawn', () => {
      const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32',
        'WindowsPowerShell', 'v1.0', 'powershell.exe');
      const cleaner = spawn(powershell, ['-NoProfile', '-NonInteractive', '-Command',
        'Wait-Process -Id $env:FM27_WORKER_PID -ErrorAction SilentlyContinue; ' +
        'Remove-Item -LiteralPath $env:FM27_WORKER_EXE -Force; ' +
        'Remove-Item -LiteralPath (Split-Path -Parent $env:FM27_WORKER_EXE) -Force'
      ], {
        cwd: os.tmpdir(), detached: true, windowsHide: true, stdio: 'ignore',
        env: { ...process.env, FM27_WORKER_PID: String(worker.pid), FM27_WORKER_EXE: workerRuntime }
      });
      cleaner.on('error', error => console.error('Update runtime cleanup could not start:', error.message));
      cleaner.unref();
    });
    return worker;
  } catch (error) {
    fs.rmSync(workerDirectory, { recursive: true, force: true });
    throw error;
  }
}

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

async function downloadAsset(update, destination) {
  const response = await fetch(update.downloadUrl, { signal: AbortSignal.timeout(120000) });
  if (!response.ok || !response.body) throw new Error(`ดาวน์โหลดไฟล์อัปเดตไม่สำเร็จ (HTTP ${response.status})`);
  const digest = createHash('sha256');
  let size = 0;
  const verify = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > maxBytes || size > update.assetSize) return callback(new Error('ขนาดไฟล์อัปเดตเกินที่ระบุ'));
      digest.update(chunk);
      callback(null, chunk);
    }
  });
  await pipeline(Readable.fromWeb(response.body), verify, fs.createWriteStream(destination, { flags: 'wx' }));
  if (size !== update.assetSize || `sha256:${digest.digest('hex')}` !== update.assetDigest) {
    throw new Error('ขนาดหรือ SHA-256 ของไฟล์ไม่ตรงกับ GitHub Release');
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
    await downloadAsset(update, archive);
    const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
    // Windows tar builds may decode command arguments using the system code page.
    const options = { cwd: staging, windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 };
    const { stdout: entries } = await run(tar, ['-tf', 'release.zip'], options);
    validateArchiveEntries(entries);
    const { stdout: details } = await run(tar, ['-tvf', 'release.zip'], options);
    if (details.trimEnd().split(/\r?\n/).some(line => !/^[-d]/.test(line))) {
      throw new Error('ไฟล์ ZIP มีรายการที่ไม่ใช่ไฟล์หรือโฟลเดอร์');
    }
    await run(tar, ['-xf', 'release.zip'], options);
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

async function stageSetup(update) {
  const root = os.tmpdir();
  const staging = fs.mkdtempSync(path.join(root, '.fm27-update-'));
  try {
    await downloadAsset(update, path.join(staging, 'setup.exe'));
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
    const runtime = bundledRuntime(root);
    const child = spawn(fs.existsSync(runtime) ? runtime : process.execPath, [path.join(root, 'server', 'index.js')], {
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

async function finishSetup(root, staging, updateId, version) {
  let failed = false;
  try {
    const powershell = path.join(process.env.SystemRoot || 'C:\\Windows',
      'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    await run(powershell, ['-NoProfile', '-NonInteractive', '-Command',
      '$ErrorActionPreference = "Stop"; ' +
      '$dir = \'/DIR="\' + $env:FM27_INSTALL_ROOT + \'"\'; ' +
      '$p = Start-Process -FilePath $env:FM27_SETUP_PATH -ArgumentList @($dir, "/SILENT", "/NORESTART", "/NOCLOSEAPPLICATIONS", "/NORESTARTAPPLICATIONS") -Verb RunAs -Wait -PassThru; ' +
      'exit $p.ExitCode'
    ], {
      windowsHide: true,
      env: { ...process.env, FM27_SETUP_PATH: path.join(staging, 'setup.exe'), FM27_INSTALL_ROOT: root }
    });
    const installed = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    failed = installed.version !== version;
  } catch (error) {
    failed = true;
    console.error('Setup update failed:', error.message);
  }
  await startTracker(root, updateId, failed);
  removeStage(os.tmpdir(), staging);
}

if (require.main === module) {
  process.once('disconnect', () => {
    const [root, staging, updateId, version] = process.argv.slice(2);
    const result = version ? finishSetup(root, staging, updateId, version) : finishUpdate(root, staging, updateId);
    result.catch(error => {
      fs.writeFileSync(path.join(__dirname, 'error.log'), String(error));
      process.exitCode = 1;
    });
  });
}

module.exports = { validateArchiveEntries, installFiles, stageUpdate, stageSetup, removeStage, startUpdateWorker };
