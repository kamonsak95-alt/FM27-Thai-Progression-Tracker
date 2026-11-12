const { exec } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PROJECT_ROOT = path.join(__dirname, '..');
const PKG_FILE = path.join(PROJECT_ROOT, 'package.json');
const REPO = 'kamonsak95-alt/FM27-Thai-Progression-Tracker';
const RELEASES_URL = `https://github.com/${REPO}/releases`;
const STABLE_VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/;

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

async function checkReleaseUpdate(currentVersion, request = fetch) {
  const base = { hasUpdate: false, isGit: false, currentVersion, changes: [] };

  try {
    const response = await request(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'FM27-Thai-Tracker' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);

    const release = await response.json();
    const latest = STABLE_VERSION.exec(release.tag_name);
    const installed = STABLE_VERSION.exec(currentVersion);
    if (!latest || !installed) throw new Error('รูปแบบเวอร์ชันไม่ถูกต้อง');

    const latestVersion = latest.slice(1).join('.');
    const difference = latest.slice(1).map((part, index) => Number(part) - Number(installed[index + 1])).find(Boolean);
    const hasUpdate = difference > 0;
    const assetUrl = `${RELEASES_URL}/download/${release.tag_name}/FM27-Tracker-Windows-v${latestVersion}.zip`;
    const asset = release.assets?.find(asset => asset.browser_download_url === assetUrl);
    const downloadUrl = asset
      ? assetUrl
      : `${RELEASES_URL}/tag/${release.tag_name}`;

    return {
      ...base,
      hasUpdate,
      latestVersion,
      downloadUrl,
      canInstall: hasUpdate && process.platform === 'win32' && Boolean(
        /^sha256:[a-f0-9]{64}$/.test(asset?.digest) &&
        Number.isSafeInteger(asset?.size) && asset.size > 0
      ),
      assetDigest: asset?.digest,
      assetSize: asset?.size,
      changes: release.name ? [release.name] : [],
      message: hasUpdate ? `FM27 Tracker v${latestVersion} พร้อมดาวน์โหลด` : 'โปรแกรมเป็นเวอร์ชันล่าสุดแล้ว'
    };
  } catch (err) {
    return { ...base, error: `ตรวจสอบ GitHub Releases ไม่สำเร็จ (${err.message})` };
  }
}

/**
 * Checks for updates against the remote repository and returns changelog/commit details
 */
async function checkForUpdates() {
  const currentVersion = getLocalVersion();
  const isGitRepo = fs.existsSync(path.join(PROJECT_ROOT, '.git'));

  if (!isGitRepo) {
    return checkReleaseUpdate(currentVersion);
  }

  const currentCommit = await getLocalCommit();
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
  checkReleaseUpdate,
  applyUpdate,
  getLocalVersion,
  getLocalCommit,
  formatCommitMessage
};
