const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const JUST_UPDATED_FILE = path.join(DATA_DIR, '.just_updated.json');

/**
 * Pre-launch update checker and silent puller.
 * Runs before server startup to ensure all server and client files are on the latest commit.
 */
function run() {
  try {
    const gitDir = path.join(PROJECT_ROOT, '.git');
    if (!fs.existsSync(gitDir)) return;

    // Get current HEAD commit before pull
    const prevCommit = execSync('git rev-parse HEAD', { cwd: PROJECT_ROOT, timeout: 3000, encoding: 'utf8' }).trim();

    // Pull from origin main with 5s timeout
    execSync('git pull origin main --quiet', { cwd: PROJECT_ROOT, timeout: 5000, stdio: 'ignore' });

    // Get current HEAD commit after pull
    const newCommit = execSync('git rev-parse HEAD', { cwd: PROJECT_ROOT, timeout: 3000, encoding: 'utf8' }).trim();

    if (prevCommit && newCommit && prevCommit !== newCommit) {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(JUST_UPDATED_FILE, JSON.stringify({
        prevCommit: prevCommit.slice(0, 7),
        newCommit: newCommit.slice(0, 7),
        timestamp: Date.now()
      }, null, 2), 'utf8');
      console.log(`[Prelaunch] Successfully auto-updated from ${prevCommit.slice(0, 7)} to ${newCommit.slice(0, 7)}`);
    } else {
      console.log('[Prelaunch] Already up-to-date.');
    }
  } catch (err) {
    // Fail silently so offline / network errors never block launching
    console.log('[Prelaunch] Auto-update check skipped/offline:', err.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
