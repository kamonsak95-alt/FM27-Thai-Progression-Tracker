const assert = require('node:assert');
const test = require('node:test');

test('predictDevelopmentTrend classifies player trends accurately', () => {
  const { predictDevelopmentTrend } = require('../server/trendEngine');

  // Young wonderkid with high PA room and high professionalism
  const wonderkid = {
    age: 18,
    ca: 130,
    pa: 175,
    professionalism: 17,
    ambition: 16
  };
  const trend1 = predictDevelopmentTrend(wonderkid, 5);
  assert.strictEqual(trend1.code, 'explosive');
  assert.strictEqual(trend1.label, 'ก้าวกระโดด');
  assert.strictEqual(trend1.icon, '🚀');

  // Prime player at peak
  const prime = {
    age: 27,
    ca: 170,
    pa: 175,
    professionalism: 15,
    ambition: 14
  };
  const trend2 = predictDevelopmentTrend(prime, 0);
  assert.strictEqual(trend2.code, 'peak');
  assert.strictEqual(trend2.label, 'ช่วงพีค');
  assert.strictEqual(trend2.icon, '⭐');

  // Veteran declining player
  const veteran = {
    age: 34,
    ca: 140,
    pa: 165,
    professionalism: 15,
    ambition: 12
  };
  const trend3 = predictDevelopmentTrend(veteran, -4);
  assert.strictEqual(trend3.code, 'declining');
  assert.strictEqual(trend3.label, 'เริ่มถดถอย');
  assert.strictEqual(trend3.icon, '📉');
});
