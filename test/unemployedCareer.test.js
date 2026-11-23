const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('a confirmed unemployed scan survives restart without identifying another scan', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-manager-restart-'));
  const history = path.join(root, 'history.json');
  const dumpDir = path.join(root, 'FMSuperScout');
  const dumpFile = path.join(dumpDir, 'dump.json');
  fs.mkdirSync(dumpDir);
  const dump = {
    meta: { manager: 'Incorrect Manager', gameDate: '2027-11-24', gameDateSource: 'derived', generated: '2026-11-24T00:00:00Z' },
    players: [{ id: 10, name: 'Test Player', ca: 75 }],
    staff: [
      { id: 2002081152, name: 'Incorrect Manager', job: 'Staflid', age: 0 },
      { id: 2002081153, name: 'Test Manager', job: 'Staflid', age: 27 }
    ]
  };
  fs.writeFileSync(dumpFile, JSON.stringify(dump));

  async function withServer(run) {
    const index = require.resolve('../server/index');
    const child = spawn(process.execPath, ['-e',
      `const server = require(${JSON.stringify(index)}); server.listen(0, '127.0.0.1', () => process.send(server.address().port));`
    ], {
      env: { ...process.env, NODE_ENV: 'test', LOCALAPPDATA: root, FM27_HISTORY_FILE: history, FM27_FRESH_SCAN_ONLY: '0' },
      stdio: ['ignore', 'ignore', 'inherit', 'ipc']
    });
    const exited = once(child, 'exit');
    try {
      const port = await Promise.race([
        once(child, 'message').then(([port]) => port),
        exited.then(() => { throw new Error('Tracker exited before listening'); })
      ]);
      await run('http://127.0.0.1:' + port);
    } finally {
      child.kill();
      await exited;
    }
  }

  try {
    let reference;
    await withServer(async base => {
      const initial = await (await fetch(base + '/api/status')).json();
      assert.equal(initial.refCode, 'UNIDENTIFIED');
      const response = await fetch(base + '/api/confirm-unemployed-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FM27-Confirm-Manager': '1' },
        body: JSON.stringify({ scanId: initial.meta.scanId, managerQuery: '2002081153', gameDate: '2026-10-24' })
      });
      assert.equal(response.status, 200, await response.text());
      reference = (await (await fetch(base + '/api/status')).json()).refCode;
      assert.match(reference, /^#FM-/);
    });
    await withServer(async base => {
      const restored = await (await fetch(base + '/api/status')).json();
      assert.equal(restored.refCode, reference);
      assert.equal(restored.meta.manager, 'Test Manager');
      assert.equal(restored.meta.gameDate, '2026-10-24');
      assert.equal(restored.snapshots.length, 1);
    });
    dump.meta.generated = '2026-11-24T01:00:00Z';
    fs.writeFileSync(dumpFile, JSON.stringify(dump));
    await withServer(async base => {
      const differentScan = await (await fetch(base + '/api/status')).json();
      assert.equal(differentScan.refCode, 'UNIDENTIFIED');
      assert.equal(differentScan.meta.managerPending, true);
      assert.equal(JSON.parse(fs.readFileSync(history, 'utf8')).snapshots.length, 1);
    });
    dump.meta = { ...dump.meta, manager: 'Test Manager', myClub: 'Test Club', gameDate: '2026-07-14', gameDateSource: 'memory' };
    Object.assign(dump.staff[1], { club: 'Test Club', job: 'Manager' });
    fs.writeFileSync(dumpFile, JSON.stringify(dump));
    await withServer(async base => {
      const status = await (await fetch(base + '/api/status')).json();
      assert.equal(status.refCode, reference);
      assert.deepEqual(status.snapshots.map(round => round.gameDate), ['2026-07-14']);
      const list = await (await fetch(base + '/api/snapshots')).json();
      assert.deepEqual(list.snapshots.map(round => round.gameDate), ['2026-07-14']);
      const players = await (await fetch(base + '/api/players?baseline=2026-10-24')).json();
      assert.equal(players.players[0].isFirstScan, true);
      assert.equal(JSON.parse(fs.readFileSync(history, 'utf8')).snapshots.length, 2);
    });
  } finally {
    fs.rmSync(dumpFile, { force: true });
    fs.rmSync(history, { force: true });
    fs.rmdirSync(dumpDir);
    fs.rmdirSync(root);
  }
});
