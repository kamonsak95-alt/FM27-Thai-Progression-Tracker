const assert = require('node:assert');
const test = require('node:test');
const http = require('node:http');
const server = require('../server/index');

test('Server responds to /api/status and /api/players', async () => {
  await new Promise(resolve => server.listen(3999, resolve));

  const get = (path) => new Promise((resolve, reject) => {
    http.get(`http://localhost:3999${path}`, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    }).on('error', reject);
  });

  // Test status
  const statusRes = await get('/api/status');
  assert.strictEqual(statusRes.status, 200);
  assert.ok(statusRes.body.meta);
  assert.strictEqual(statusRes.body.meta.game, 'FM27');

  // Test players list
  const playersRes = await get('/api/players?limit=10');
  assert.strictEqual(playersRes.status, 200);
  assert.ok(Array.isArray(playersRes.body.players));
  assert.strictEqual(playersRes.body.players.length, 10);
  assert.ok(playersRes.body.total > 0);

  // Close server
  await new Promise(resolve => server.close(resolve));
});
