process.env.NODE_ENV = 'test';
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

    // 8. Test Age Filter (P1 fix: exact age range)
    const ageRes = await get('/api/staff?minAge=35&maxAge=35&limit=10');
    assert.strictEqual(ageRes.status, 200);
    assert.ok(ageRes.body.staff.length > 0);
    for (const s of ageRes.body.staff) {
      assert.strictEqual(s.age, 35);
    }

    // 9. Test Diamond Scout Preset (P1 fix: JPA >= 18 and JPP >= 18)
    const diamondRes = await get('/api/staff?preset=diamond_scout&limit=10');
    assert.strictEqual(diamondRes.status, 200);
    assert.ok(diamondRes.body.staff.length > 0);
    for (const s of diamondRes.body.staff) {
      assert.ok(s.keySkills.jpa >= 18, `JPA must be >= 18 but got ${s.keySkills.jpa}`);
      assert.ok(s.keySkills.jpp >= 18, `JPP must be >= 18 but got ${s.keySkills.jpp}`);
    }

    // 10. Test God Physio Preset (P1 fix: Physiotherapy >= 18)
    const godPhysioRes = await get('/api/staff?preset=god_physio&limit=10');
    assert.strictEqual(godPhysioRes.status, 200);
    assert.ok(godPhysioRes.body.staff.length > 0);
    for (const s of godPhysioRes.body.staff) {
      assert.ok(s.keySkills.physiotherapy >= 18, `Physiotherapy must be >= 18 but got ${s.keySkills.physiotherapy}`);
    }

    // 11. Test Sorting by Role and Rep (P2 fix)
    const roleAscRes = await get('/api/staff?sort=role&order=asc&limit=5');
    const roleDescRes = await get('/api/staff?sort=role&order=desc&limit=5');
    assert.strictEqual(roleAscRes.status, 200);
    assert.strictEqual(roleDescRes.status, 200);
    assert.notStrictEqual(roleAscRes.body.staff[0].roleTh, roleDescRes.body.staff[0].roleTh);

    const repDescRes = await get('/api/staff?sort=rep&order=desc&limit=5');
    assert.strictEqual(repDescRes.status, 200);
    const topRep = repDescRes.body.staff[0].worldRep || repDescRes.body.staff[0].curRep;
    const nextRep = repDescRes.body.staff[1].worldRep || repDescRes.body.staff[1].curRep;
    assert.ok(topRep >= nextRep);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
