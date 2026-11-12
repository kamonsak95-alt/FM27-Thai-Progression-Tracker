const assert = require('node:assert');
const test = require('node:test');
const http = require('node:http');
const server = require('../server/index');

test('Staff Engine and API endpoints', async () => {
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  const get = (path) => new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    }).on('error', reject);
  });

  try {
    // 1. Test staff list
    const staffRes = await get('/api/staff?limit=10');
    assert.strictEqual(staffRes.status, 200);
    assert.ok(staffRes.body.total > 20000);
    assert.strictEqual(staffRes.body.staff.length, 10);
    const firstStaff = staffRes.body.staff[0];
    assert.ok(firstStaff.name);
    assert.ok(firstStaff.roleTh);
    assert.ok(firstStaff.keySkills);

    // 2. Test coaching category filter
    const coachingRes = await get('/api/staff?category=coaching&limit=5');
    assert.strictEqual(coachingRes.status, 200);
    assert.ok(coachingRes.body.staff.length > 0);
    for (const s of coachingRes.body.staff) {
      assert.strictEqual(s.roleCategory, 'coaching');
    }

    // 3. Test HOYD role filter
    const hoydRes = await get('/api/staff?role=hoyd&limit=5');
    assert.strictEqual(hoydRes.status, 200);
    assert.ok(hoydRes.body.staff.length > 0);
    for (const s of hoydRes.body.staff) {
      assert.strictEqual(s.roleId, 'hoyd');
    }

    // 4. Test Scout role filter
    const scoutRes = await get('/api/staff?role=scout&limit=5');
    assert.strictEqual(scoutRes.status, 200);
    assert.ok(scoutRes.body.staff.length > 0);
    for (const s of scoutRes.body.staff) {
      assert.strictEqual(s.roleId, 'scout');
    }

    // 5. Test Physio role filter
    const physioRes = await get('/api/staff?role=physio&limit=5');
    assert.strictEqual(physioRes.status, 200);
    assert.ok(physioRes.body.staff.length > 0);
    for (const s of physioRes.body.staff) {
      assert.strictEqual(s.roleId, 'physio');
    }

    // 6. Test Unemployed status filter
    const freeRes = await get('/api/staff?status=unemployed&limit=5');
    assert.strictEqual(freeRes.status, 200);
    assert.ok(freeRes.body.staff.length > 0);
    for (const s of freeRes.body.staff) {
      assert.strictEqual(s.isFreeAgent, true);
      assert.strictEqual(s.club, null);
    }

    // 7. Test Staff Detail
    const targetId = firstStaff.id;
    const detailRes = await get(`/api/staff/${targetId}`);
    assert.strictEqual(detailRes.status, 200);
    assert.ok(detailRes.body.staff);
    assert.ok(detailRes.body.staff.attrGroups);
    assert.ok(detailRes.body.staff.personality);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
