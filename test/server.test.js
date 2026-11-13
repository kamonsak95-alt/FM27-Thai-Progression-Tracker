process.env.NODE_ENV = 'test';
const assert = require('node:assert');
const test = require('node:test');
const http = require('node:http');
const server = require('../server/index');

test('Server responds to /api/status and /api/players', async () => {
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
    // Verify firstSeenDate and isFirstScan fields are included
    assert.ok('isFirstScan' in playersRes.body.players[0], 'Must include isFirstScan field');
    assert.ok('firstSeenDate' in playersRes.body.players[0], 'Must include firstSeenDate field');

    const player = playersRes.body.players[0];
    if (statusRes.body.refCode?.startsWith('#')) {
      const shortlist = new URLSearchParams({
        shortlistRef: statusRes.body.refCode, shortlistIds: String(player.id), page: '2'
      });
      const saved = await get(`/api/players?${shortlist}`);
      assert.deepStrictEqual(saved.body.players.map(p => p.id), [player.id]);
      assert.strictEqual(saved.body.page, 1);
      shortlist.set('shortlistRef', '#OTHER-SAVE');
      const other = await get(`/api/players?${shortlist}`);
      assert.deepStrictEqual(other.body.players, []);
    }
    const detailRes = await get(`/api/player/${player.id}`);
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.body.player.id, player.id);
    assert.ok(detailRes.body.player.attrs);
    assert.ok(detailRes.body.trend.label);
    assert.ok(!Object.hasOwn(detailRes.body, 'historyPoints'), 'Player detail must not build a timeline');

    // Test granular position filtering (e.g. DC)
    const dcRes = await get('/api/players?pos=DC&limit=5');
    assert.strictEqual(dcRes.status, 200);
    assert.ok(dcRes.body.players.length > 0);
    for (const p of dcRes.body.players) {
      assert.ok(p.pos.includes('DC'), `Player ${p.name} should play DC`);
    }

    // Test multi-position filtering (e.g. AML,AMR)
    const wingerRes = await get('/api/players?pos=AML,AMR&limit=5');
    assert.strictEqual(wingerRes.status, 200);
    assert.ok(wingerRes.body.players.length > 0);
    for (const p of wingerRes.body.players) {
      const playsWinger = (p.posArr || []).some(x => x === 'AML' || x === 'AMR');
      assert.ok(playsWinger, `Player ${p.name} should play AML or AMR`);
    }

    // Test natural-only filtering (e.g. ST & natOnly=1)
    const stNatRes = await get('/api/players?pos=ST&natOnly=1&limit=5');
    assert.strictEqual(stNatRes.status, 200);
    assert.ok(stNatRes.body.players.length > 0);
    for (const p of stNatRes.body.players) {
      const isNatST = (p.posNat || []).includes('ST');
      assert.ok(isNatST, `Player ${p.name} should naturally play ST`);
    }

    // Test that nameless stubs (name: '?') are never returned
    const unnamedRes = await get('/api/players?limit=100');
    assert.strictEqual(unnamedRes.status, 200);
    for (const p of unnamedRes.body.players) {
      assert.ok(p.name && p.name !== '?' && p.name.trim() !== '', 'Player must have a valid name');
    }
  } catch (err) {
    console.error('TEST ERROR OCCURRED:', err);
    throw err;
  } finally {
    // Close server
    await new Promise(resolve => server.close(resolve));
  }
});
