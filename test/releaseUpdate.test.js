const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkReleaseUpdate } = require('../server/updaterEngine');

const root = 'https://github.com/kamonsak95-alt/FM27-Thai-Progression-Tracker';
const asset = version => `${root}/releases/download/v${version}/FM27-Tracker-Windows-v${version}.zip`;

function release(version, downloadUrl = asset(version)) {
  return async url => {
    assert.match(url, /api\.github\.com\/.+\/releases\/latest$/);
    return new Response(JSON.stringify({
      tag_name: `v${version}`,
      assets: [{ browser_download_url: downloadUrl }]
    }));
  };
}

test('ZIP update check compares release versions numerically and returns the Windows download', async () => {
  const result = await checkReleaseUpdate('1.0.9', release('1.0.10'));
  assert.equal(result.hasUpdate, true);
  assert.equal(result.latestVersion, '1.0.10');
  assert.equal(result.downloadUrl, asset('1.0.10'));
  assert.equal(result.isGit, false);
});

test('ZIP update check ignores releases at or below the installed version', async () => {
  for (const version of ['1.0.10', '1.0.9']) {
    assert.equal((await checkReleaseUpdate('1.0.10', release(version))).hasUpdate, false);
  }
});

test('ZIP update check reports GitHub failures and falls back to the release page for a missing asset', async () => {
  const failed = await checkReleaseUpdate('1.0.0', async () => new Response(null, { status: 403 }));
  assert.equal(failed.hasUpdate, false);
  assert.ok(failed.error);
  const result = await checkReleaseUpdate('1.0.0', release('1.0.1', 'https://example.com/file.zip'));
  assert.equal(result.downloadUrl, `${root}/releases/tag/v1.0.1`);
});
