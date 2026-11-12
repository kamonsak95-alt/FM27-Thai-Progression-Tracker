const { exec } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PROJECT_ROOT = path.join(__dirname, '..');
const PKG_FILE = path.join(PROJECT_ROOT, 'package.json');

function execPromise(cmd, cwd = PROJECT_ROOT) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || stdout || err.message));
      resolve(stdout.trim());
    });
  });
}

function getLocalVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(PKG_FILE, 'utf8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

async function getLocalCommit() {
  try {
    return await execPromise('git rev-parse HEAD');
  } catch {
    return 'local';
  }
}

function formatCommitMessage(msg) {
  if (!msg) return '';
  return msg
    .replace(/^feat(\(.*\))?:\s*/i, '✨ [ฟีเจอร์ใหม่] ')
    .replace(/^fix(\(.*\))?:\s*/i, '🐛 [แก้ไขข้อผิดพลาด] ')
    .replace(/^perf(\(.*\))?:\s*/i, '⚡ [เพิ่มประสิทธิภาพ] ')
    .replace(/^docs(\(.*\))?:\s*/i, '📝 [เอกสารและเครดิต] ')
    .replace(/^chore(\(.*\))?:\s*/i, '🔧 [ปรับปรุงระบบ] ')
    .replace(/^refactor(\(.*\))?:\s*/i, '♻️ [ปรับโครงสร้างโค้ด] ');
}

/**
 * Checks for updates against the remote repository and returns changelog/commit details
 */
async function checkForUpdates() {
  const currentVersion = getLocalVersion();
  const currentCommit = await getLocalCommit();
  const isGitRepo = fs.existsSync(path.join(PROJECT_ROOT, '.git'));

  if (!isGitRepo) {
    return {
      hasUpdate: false,
      isGit: false,
      currentVersion,
      currentCommit: currentCommit.slice(0, 7),
      changes: [],
      message: 'โปรแกรมรันในโหมดโฟลเดอร์แบบ Standalone (ไม่มี Git)'
    };
  }

  try {
    // Fetch remote branch info silently without altering worktree
    await execPromise('git fetch origin main --quiet');

    // Get remote HEAD
    const remoteOut = await execPromise('git rev-parse origin/main');
    const remoteCommit = (remoteOut || '').trim();

    if (!remoteCommit) {
      return {
        hasUpdate: false,
        isGit: true,
        currentVersion,
        currentCommit: currentCommit.slice(0, 7),
        changes: [],
        message: 'ไม่พบข้อมูล Branch main บน Remote'
      };
    }

    const hasUpdate = remoteCommit !== currentCommit;
    let changes = [];

    if (hasUpdate) {
      const logs = await execPromise('git log HEAD..origin/main --pretty=format:"%s"');
      changes = logs.split('\n').map(s => s.trim()).filter(Boolean).map(formatCommitMessage);
    } else {
      // Return 5 recent installed changes
      const logs = await execPromise('git log -n 5 --pretty=format:"%s"');
      changes = logs.split('\n').map(s => s.trim()).filter(Boolean).map(formatCommitMessage);
    }

    const latestMessage = changes.length > 0 ? changes[0] : 'การปรับปรุงทั่วไป';
    const updateMessage = hasUpdate 
      ? `ตรวจพบเวอร์ชันใหม่บน GitHub: ${latestMessage}`
      : 'โปรแกรมเป็นเวอร์ชันล่าสุดแล้ว';

    return {
      hasUpdate,
      isGit: true,
      currentVersion,
      currentCommit: currentCommit.slice(0, 7),
      latestCommit: remoteCommit.slice(0, 7),
      latestMessage,
      changes,
      message: updateMessage
    };
  } catch (err) {
    return {
      hasUpdate: false,
      isGit: true,
      currentVersion,
      currentCommit: currentCommit.slice(0, 7),
      changes: [],
      error: `ตรวจสอบอัปเดตไม่สำเร็จ: ${err.message}`
    };
  }
}

/**
 * Applies the update by pulling latest code from git
 */
async function applyUpdate() {
  const isGitRepo = fs.existsSync(path.join(PROJECT_ROOT, '.git'));
  if (!isGitRepo) {
    return {
      ok: false,
      error: 'ไม่สามารถอัปเดตอัตโนมัติได้เนื่องจากโฟลเดอร์ไม่ได้เชื่อมต่อกับ Git'
    };
  }

  try {
    const pullOut = await execPromise('git pull origin main');
    const newCommit = await getLocalCommit();
    return {
      ok: true,
      output: pullOut,
      newCommit: newCommit.slice(0, 7),
      message: 'อัปเดตไฟล์เรียบร้อยแล้ว'
    };
  } catch (err) {
    return {
      ok: false,
      error: `การอัปเดตล้มเหลว: ${err.message}`
    };
  }
}

module.exports = {
  checkForUpdates,
  applyUpdate,
  getLocalVersion,
  getLocalCommit,
  formatCommitMessage
};
