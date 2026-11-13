const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verifyNotices, runtimeDirectory } = require('../installer/verify-notices');

test('release input retains the verified Scanner and runtime notices', () => {
  verifyNotices(path.resolve(__dirname, '..'));
});

test('release validation rejects missing and altered runtime notices', t => {
  const source = path.resolve(__dirname, '..');
  const payload = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-license-'));
  t.after(() => fs.rmSync(payload, { recursive: true, force: true }));
  fs.copyFileSync(path.join(source, 'LICENSE'), path.join(payload, 'LICENSE'));
  fs.cpSync(path.join(source, runtimeDirectory), path.join(payload, runtimeDirectory), { recursive: true });

  const notice = path.join(payload, runtimeDirectory, 'THIRD-PARTY-NOTICES.TXT');
  fs.unlinkSync(notice);
  assert.throws(() => verifyNotices(payload), { code: 'ENOENT' });
  fs.writeFileSync(notice, 'Truncated notice');
  assert.throws(() => verifyNotices(payload), /Unexpected SHA-256/);
});
