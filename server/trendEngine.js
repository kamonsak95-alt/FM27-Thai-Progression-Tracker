/**
 * FM27 Development Trend Forecasting Engine
 * Analyzes career stage, remaining potential ceiling, professionalism, ambition,
 * and recent delta performance to project player development trajectory.
 */

function predictDevelopmentTrend(player, deltaCA = 0) {
  const age = player.age || 20;
  const ca = player.ca || 0;
  const pa = player.pa || 0;
  const room = Math.max(0, pa - ca);
  const prof = player.professionalism != null ? player.professionalism : 12;
  const amb = player.ambition != null ? player.ambition : 12;

  // 1. Veteran Declining Phase (Age 32+ or 30+ with negative delta)
  if (age >= 32 || (age >= 30 && deltaCA < 0)) {
    return {
      code: 'declining',
      score: 1,
      label: 'เริ่มถดถอย',
      icon: '📉',
      badgeClass: 'badge-trend-down',
      reason: `อายุ ${age} ปี อยู่ในวัยโรยรา และค่าพลังเริ่มลดลงตามสภาพร่างกาย`
    };
  }

  // 2. Explosive Wonderkid Growth (Age <= 22, huge PA ceiling, good work ethic or recent jump)
  if (age <= 22 && room >= 25 && (prof >= 13 || amb >= 13 || deltaCA > 0)) {
    return {
      code: 'explosive',
      score: 5,
      label: 'ก้าวกระโดด',
      icon: '🚀',
      badgeClass: 'badge-trend-explosive',
      reason: `อายุ ${age} ปี ยังพัฒนาได้อีกถึง ${room} แต้ม (PA ${pa}) พร้อมนิสัยเอื้อต่อการเติบโตสูงมาก`
    };
  }

  // 3. Steady Young Development (Age <= 24, room >= 15)
  if (age <= 24 && room >= 15) {
    return {
      code: 'developing',
      score: 4,
      label: 'กำลังเติบโต',
      icon: '📈',
      badgeClass: 'badge-trend-up',
      reason: `อายุ ${age} ปี อยู่ในเกณฑ์พัฒนาฝีเท้าต่อเนื่อง เหลือช่องว่างอีก ${room} แต้ม`
    };
  }

  // 4. Prime / At Peak (Age 24 - 29 with CA near PA)
  if (age >= 24 && age <= 29 && room < 15) {
    return {
      code: 'peak',
      score: 3,
      label: 'ช่วงพีค',
      icon: '⭐',
      badgeClass: 'badge-trend-peak',
      reason: `อายุ ${age} ปี อยู่ในช่วงอายุที่ดีที่สุดในการค้าแข้ง ค่าพลังใกล้เคียงขีดจำกัดสูงสุดแล้ว`
    };
  }

  // 5. Plateaued / Maxed Out (room <= 5)
  if (room <= 5) {
    return {
      code: 'plateau',
      score: 2,
      label: 'เต็มศักยภาพ',
      icon: '⏸️',
      badgeClass: 'badge-trend-plateau',
      reason: `ค่าพลังปัจจุบัน (${ca}) แทบจะชนเพดานศักยภาพ (${pa}) แล้ว การเติบโตจะเริ่มคงที่`
    };
  }

  // 6. Maturing Developer (Age 25-28 with room >= 10)
  if (age <= 28 && room >= 10) {
    return {
      code: 'developing',
      score: 4,
      label: 'กำลังเติบโต',
      icon: '📈',
      badgeClass: 'badge-trend-up',
      reason: `ยังมีโอกาสพัฒนาฝีเท้าเพิ่มเติมได้อีก ${room} แต้มก่อนถึงจุดพีค`
    };
  }

  // 7. Stable standard
  return {
    code: 'stable',
    score: 2,
    label: 'คงที่',
    icon: '➖',
    badgeClass: 'badge-trend-neutral',
    reason: `รักษามาตรฐานค่าพลังได้อย่างสม่ำเสมอ`
  };
}

module.exports = {
  predictDevelopmentTrend
};
