const assert = require('node:assert');
const test = require('node:test');

test('scanner messages explain in Thai when FM27 is closed', () => {
  const { formatScanError } = require('../server/scannerBridge');
  const warning = '2026-11-13 00:30:06 [32640] WARN fm.exe draait niet - niets te scannen.';
  const expected = 'ยังไม่ได้เปิด FM27 กรุณาเปิดเกมและโหลดเซฟ แล้วกดโหลดข้อมูลเกมอีกครั้ง';
  assert.strictEqual(formatScanError(warning, ''), expected);
  assert.strictEqual(formatScanError(warning, 'Scanner exited with an error'), expected);
  assert.strictEqual(formatScanError('', warning), expected);
  assert.strictEqual(formatScanError('', 'Other scanner error'), 'Other scanner error');
});

// Test that scannerBridge exports required functions and reads dump
test('scannerBridge exports and functions exist', () => {
  const { getLatestDump, runScan, getScannerStatus } = require('../server/scannerBridge');
  assert.strictEqual(typeof getLatestDump, 'function', 'getLatestDump should be a function');
  assert.strictEqual(typeof runScan, 'function', 'runScan should be a function');
  assert.strictEqual(typeof getScannerStatus, 'function', 'getScannerStatus should be a function');
});

test('getLatestDump should read dump.json and return meta and players', () => {
  const { getLatestDump } = require('../server/scannerBridge');
  const dump = getLatestDump();
  assert.ok(dump, 'Dump should not be null');
  assert.ok(dump.meta, 'Dump must contain meta');
  assert.strictEqual(typeof dump.meta.gameDate, 'string');
  assert.ok(Array.isArray(dump.players), 'Players must be an array');
  assert.ok(dump.players.length > 0, 'Players array should not be empty');
});
