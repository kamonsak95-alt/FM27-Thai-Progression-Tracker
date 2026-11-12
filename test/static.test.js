const assert = require('node:assert');
const test = require('node:test');
const http = require('node:http');
const server = require('../server/index');

test('Server correctly serves frontend static files (index.html, style.css, app.js)', async () => {
  await new Promise(resolve => server.listen(3998, resolve));

  const get = (path) => new Promise((resolve, reject) => {
    http.get(`http://localhost:3998${path}`, res => {
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

  // Test style.css
  const cssRes = await get('/style.css');
  assert.strictEqual(cssRes.status, 200);
  assert.ok(cssRes.headers['content-type'].includes('text/css'));

  // Test app.js
  const jsRes = await get('/app.js');
  assert.strictEqual(jsRes.status, 200);
  assert.ok(jsRes.headers['content-type'].includes('application/javascript') || jsRes.headers['content-type'].includes('text/javascript'));

  await new Promise(resolve => server.close(resolve));
});
