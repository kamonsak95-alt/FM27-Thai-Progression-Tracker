// Prototype: compare attribute patterns, not a prediction of match performance.
const POSITION_ATTRIBUTES = {
  GK: ['AerialReach', 'CommandOfArea', 'Communication', 'Handling', 'Kicking', 'OneOnOnes', 'Reflexes', 'Throwing', 'Anticipation', 'Decisions', 'Agility'],
  DC: ['Heading', 'Marking', 'Tackling', 'Positioning', 'Anticipation', 'Concentration', 'Decisions', 'Passing', 'Composure', 'JumpingReach', 'Strength', 'Pace'],
  DL: ['Crossing', 'Dribbling', 'Marking', 'Tackling', 'Passing', 'Positioning', 'OffTheBall', 'WorkRate', 'Acceleration', 'Pace', 'Stamina', 'Decisions'],
  DM: ['Passing', 'FirstTouch', 'Technique', 'Tackling', 'Marking', 'Positioning', 'Anticipation', 'Decisions', 'Composure', 'Teamwork', 'Vision', 'Stamina'],
  MC: ['Passing', 'FirstTouch', 'Technique', 'Dribbling', 'Tackling', 'Vision', 'Decisions', 'Composure', 'Teamwork', 'OffTheBall', 'WorkRate', 'Stamina'],
  AMC: ['Passing', 'FirstTouch', 'Technique', 'Dribbling', 'Finishing', 'LongShots', 'Vision', 'Decisions', 'Composure', 'Flair', 'OffTheBall', 'Agility'],
  AML: ['Crossing', 'Dribbling', 'Finishing', 'FirstTouch', 'Passing', 'Technique', 'Flair', 'OffTheBall', 'Decisions', 'Acceleration', 'Pace', 'Agility'],
  ST: ['Finishing', 'FirstTouch', 'Heading', 'Technique', 'Passing', 'Dribbling', 'Anticipation', 'Composure', 'OffTheBall', 'Acceleration', 'Pace', 'Strength', 'JumpingReach']
};
for (const [alias, position] of Object.entries({ DR: 'DL', WBL: 'DL', WBR: 'DL', ML: 'AML', MR: 'AML', AMR: 'AML' })) POSITION_ATTRIBUTES[alias] = POSITION_ATTRIBUTES[position];

function positionsOf(player) {
  return [...new Set([...(player.pos || '').split(',').map(code => code.trim()).filter(Boolean), ...(Array.isArray(player.posNat) ? player.posNat : [])])];
}

function findReplacements(players, source, { position, mode = 'ready', maxAge = 25, minCA, minPA, maxValue = null } = {}) {
  if (!['ready', 'future'].includes(mode)) throw new Error('เลือกโหมดพร้อมแทนตอนนี้หรือปั้นไว้แทน');
  if (!Number.isInteger(source.ca) || source.ca < 1 || source.ca > 200) throw new Error('ไม่มีข้อมูล CA ต้นแบบสำหรับตั้งเกณฑ์ตัวแทน');
  minCA ??= mode === 'future' ? 1 : Math.max(1, source.ca - 20);
  minPA ??= mode === 'future' ? Math.max(1, source.ca - 10) : 1;
  const keys = POSITION_ATTRIBUTES[position];
  if (!keys || !positionsOf(source).includes(position)) throw new Error('เลือกตำแหน่งที่ต้นแบบเล่นได้');
  const valid = value => Number.isInteger(value) && value >= 1 && value <= 20;
  if (!keys.every(key => valid(source.attrs?.[key]))) throw new Error('ข้อมูลค่าพลังต้นแบบไม่ครบสำหรับวิเคราะห์ตำแหน่งนี้');
  const signature = [...keys].sort((a, b) => source.attrs[b] - source.attrs[a]).slice(0, 5);
  const weight = key => signature.includes(key) ? 2 : 1;
  const totalWeight = keys.reduce((sum, key) => sum + weight(key), 0);
  const average = attrs => keys.reduce((sum, key) => sum + attrs[key] * weight(key), 0) / totalWeight;
  const sourceAverage = average(source.attrs);
  const candidates = [];
  for (const player of players) {
    if (player.id === source.id || !positionsOf(player).includes(position)) continue;
    if (!Number.isFinite(player.age) || player.age > maxAge || !Number.isFinite(player.ca) || player.ca < minCA) continue;
    if (!Number.isFinite(player.pa) || player.pa < minPA) continue;
    if (maxValue != null && (!Number.isFinite(player.value) || player.value <= 0 || player.value > maxValue)) continue;
    if (!keys.every(key => valid(player.attrs?.[key]))) continue;
    const candidateAverage = average(player.attrs);
    const distance = keys.reduce((sum, key) => sum + Math.abs((player.attrs[key] - candidateAverage) - (source.attrs[key] - sourceAverage)) * weight(key), 0) / totalWeight;
    const score = Math.max(0, Math.round(100 - distance * 10));
    const differences = signature.map(key => ({ key, source: source.attrs[key], candidate: player.attrs[key], delta: player.attrs[key] - source.attrs[key] }));
    candidates.push({ id: player.id, name: player.name, club: player.club, pos: player.pos, age: player.age, ca: player.ca, pa: player.pa, value: player.value, wage: player.wage, score,
      attributeGap: Math.round((candidateAverage - sourceAverage) * 10) / 10,
      caGap: Number.isFinite(source.ca) ? player.ca - source.ca : null,
      similar: [...differences].sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta)).slice(0, 3),
      weaker: differences.filter(item => item.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 2) });
  }
  candidates.sort((a, b) => b.score - a.score || Math.abs(a.attributeGap) - Math.abs(b.attributeGap) || b.ca - a.ca || a.id - b.id);
  return { total: candidates.length, candidates: candidates.slice(0, 20), signature, criteria: { mode, minCA, minPA } };
}

module.exports = { findReplacements, positionsOf, POSITION_ATTRIBUTES };
