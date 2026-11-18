const { test } = require('node:test');
const assert = require('node:assert/strict');

test('staff comparison aligns skills by name and retains missing values', () => {
  const buildRows = require('../public/staff-comparison');
  const rows = buildRows(
    { club: 'United', attrGroups: { scouting: [{ nameTh: 'JPA', val: 18 }, { nameTh: 'JPP', val: 0 }] } },
    { club: null, attrGroups: { scouting: [{ nameTh: 'JPP', val: 19 }, { nameTh: 'JPA', val: 15 }] } }
  );
  assert.deepEqual(rows.find(row => row.label === 'JPA'), { label: 'JPA', a: 18, b: 15, highlight: true });
  assert.deepEqual(rows.find(row => row.label === 'JPP'), { label: 'JPP', a: null, b: 19, highlight: true });
  assert.equal(rows.find(row => row.label === 'สโมสร').b, 'ว่างงาน');
});

test('staff comparison includes discipline stars only for two coaches', () => {
  const buildRows = require('../public/staff-comparison');
  const coach = { roleCategory: 'coaching', trainingStars: { strength: 4.5, attacking: 5 }, trainingLabels: { strength: 'ความแข็งแรง' } };
  const rows = buildRows(coach, { ...coach, trainingStars: { strength: 3 } });
  assert.deepEqual(rows.find(row => row.label === 'ความแข็งแรง'), { label: 'ความแข็งแรง', a: 4.5, b: 3, highlight: true, stars: true });
  assert.equal(rows.some(row => row.label === 'attacking'), false);
  assert.equal(buildRows(coach, { roleCategory: 'medical' }).some(row => row.stars), false);
});

test('medical and recruitment comparisons put relevant skills first', () => {
 const buildRows = require('../public/staff-comparison');
 const staff = {attrGroups:{coaching:[],scouting:[],medical:[]}};
 assert.equal(buildRows({...staff,roleCategory:'medical'},staff).find(r=>r.group).group,'การแพทย์และข้อมูล');
 assert.equal(buildRows({...staff,roleCategory:'recruitment'},staff).find(r=>r.group).group,'การสรรหาและเยาวชน');
});
