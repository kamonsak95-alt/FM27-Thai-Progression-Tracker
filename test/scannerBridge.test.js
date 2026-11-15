const assert = require('node:assert');
const test = require('node:test');

test('scanner messages explain access denied while FM27 is running', () => {
  const { formatScanError } = require('../server/scannerBridge');
  const warning = '2026-11-15 23:23:02 [5656] WARN fm.exe draait, maar is niet te openen (toegang geweigerd: FM draait waarschijnlijk als administrator).';
  const expected = 'ตรวจพบ FM27 แต่ Windows ปฏิเสธการเข้าถึง กรุณาปิดเกมแล้วเปิดใหม่แบบปกติ (ไม่ใช้ Run as administrator) จากนั้นโหลดเซฟและลองสแกนอีกครั้ง';
  assert.strictEqual(formatScanError(warning, ''), expected);
  assert.strictEqual(formatScanError('', warning), expected);
});

test('scanner messages explain in Thai when FM27 is closed', () => {
  const { formatScanError } = require('../server/scannerBridge');
  const warning = '2026-11-13 00:30:06 [32640] WARN fm.exe draait niet - niets te scannen.';
  const expected = 'ยังไม่ได้เปิด FM27 กรุณาเปิดเกมและโหลดเซฟ แล้วกดโหลดข้อมูลเกมอีกครั้ง';
  assert.strictEqual(formatScanError(warning, ''), expected);
  assert.strictEqual(formatScanError(warning, 'Scanner exited with an error'), expected);
  assert.strictEqual(formatScanError('', warning), expected);
});

test('unknown scanner messages fall back to Thai', () => {
  const { formatScanError } = require('../server/scannerBridge');
  const expected = 'สแกนข้อมูลเกมไม่สำเร็จ กรุณาตรวจว่าเปิด FM27 และโหลดเซฟแล้ว จากนั้นลองโหลดข้อมูลเกมอีกครั้ง';
  assert.strictEqual(formatScanError('', 'Onbekende fout'), expected);
  assert.strictEqual(formatScanError('', ''), expected);
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
