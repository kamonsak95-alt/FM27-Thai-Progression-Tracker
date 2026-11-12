const assert = require('node:assert');
const test = require('node:test');
const http = require('node:http');
const server = require('../server/index');

test('Server correctly serves frontend static files (index.html, style.css, app.js)', async () => {
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  const get = (path) => new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });

  // Test root /
  const htmlRes = await get('/');
  assert.strictEqual(htmlRes.status, 200);
  assert.ok(htmlRes.headers['content-type'].includes('text/html'));
  assert.ok(htmlRes.body.includes('FM27 Thai Progression Tracker'));
  assert.ok(htmlRes.body.includes('tab-btn-staff'));
  assert.ok(htmlRes.body.includes('section-staff'));
  assert.ok(htmlRes.body.includes('filter-staff-role'));
  assert.ok(htmlRes.body.includes('staff-modal'));

  // Test style.css
  const cssRes = await get('/style.css');
  assert.strictEqual(cssRes.status, 200);
  assert.ok(cssRes.headers['content-type'].includes('text/css'));
  assert.ok(cssRes.body.includes('header-nav-tabs'));
  assert.ok(cssRes.body.includes('badge-role-coaching'));

  // Test app.js
  const jsRes = await get('/app.js');
  assert.strictEqual(jsRes.status, 200);
  assert.ok(jsRes.headers['content-type'].includes('application/javascript') || jsRes.headers['content-type'].includes('text/javascript'));
  assert.ok(jsRes.body.includes('loadStaff'));
  assert.ok(jsRes.body.includes('openStaffModal'));

  await new Promise(resolve => server.close(resolve));
});
