function buildStaffComparisonRows(left, right) {
  const rows = [];
  const row = (label, a, b, highlight = false, extra = {}) => rows.push({ label, a, b, highlight, ...extra });
  const value = v => Number.isFinite(v) && v > 0 ? v : null;
  row('อายุ', value(left.age), value(right.age));
  row('ตำแหน่งงาน', left.roleTh, right.roleTh);
  row('สโมสร', left.club || 'ว่างงาน', right.club || 'ว่างงาน');
  row('CA', value(left.ca), value(right.ca), true);
  row('PA', value(left.pa), value(right.pa), true);
  row('ค่าเหนื่อยต่อสัปดาห์', value(left.wage), value(right.wage), false, { wage: true });
  if (left.roleCategory === 'coaching' && right.roleCategory === 'coaching') {
    rows.push({ group: 'ดาวฝึกซ้อม (คำนวณจากทักษะ)' });
    const keys = new Set([...Object.keys(left.trainingStars ?? {}), ...Object.keys(right.trainingStars ?? {})]);
    for (const key of keys) {
      if (['attacking', 'defending', 'possession', 'goalkeeping'].includes(key)) continue;
      row(left.trainingLabels?.[key] ?? right.trainingLabels?.[key] ?? key,
        value(left.trainingStars?.[key]), value(right.trainingStars?.[key]), true, { stars: true });
    }
  }
  const labels = { coaching: 'การฝึกสอน', mental: 'จิตใจและการบริหาร', scouting: 'การสรรหาและเยาวชน', medical: 'การแพทย์และข้อมูล' };
  const groups = [...new Set([...Object.keys(left.attrGroups ?? {}), ...Object.keys(right.attrGroups ?? {})])];
  const primary = { medical: 'medical', recruitment: 'scouting' }[left.roleCategory];
  groups.sort((a, b) => Number(b === primary) - Number(a === primary));
  for (const group of groups) {
    rows.push({ group: labels[group] ?? group });
    const a = new Map((left.attrGroups?.[group] ?? []).map(attr => [attr.nameTh, value(attr.val)]));
    const b = new Map((right.attrGroups?.[group] ?? []).map(attr => [attr.nameTh, value(attr.val)]));
    for (const name of new Set([...a.keys(), ...b.keys()])) row(name, a.get(name) ?? null, b.get(name) ?? null, true);
  }
  return rows;
}

if (typeof module !== 'undefined') module.exports = buildStaffComparisonRows;
