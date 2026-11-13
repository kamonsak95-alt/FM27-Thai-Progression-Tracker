const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Windows entry points launch the bundled runtime without PATH', () => {
  const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
  assert.match(read('installer/Launcher.cs'), /FileName = runtime/);
  for (const name of ['Start-FM27-Tracker.bat', 'Start-FM27-Tracker-Window.vbs']) {
    assert.match(read(name), /bin\\FM27-Tracker\.exe/i);
    assert.doesNotMatch(read(name), /(?:Run "node|^node |start .* node )/mi);
  }
});

test('compiled Launcher and ZIP update work with Node.js absent from PATH', {
  skip: process.platform !== 'win32' || !process.env.FM27_TEST_RELEASE_ZIP,
  timeout: 90000
}, async t => {
  const { execFile, spawn } = require('node:child_process');
  const { promisify } = require('node:util');
  const { once } = require('node:events');
  const { createHash } = require('node:crypto');
  const os = require('node:os');
  const run = promisify(execFile);
  const system = path.join(process.env.SystemRoot, 'System32');
  const env = { ...process.env, PATH: system };
  const zip = path.resolve(process.env.FM27_TEST_RELEASE_ZIP);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fm27-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }));
  await assert.rejects(run(path.join(system, 'where.exe'), ['node'], { env, cwd: temp }), { code: 1 });
  await run(path.join(system, 'tar.exe'), ['-xf', zip, '-C', temp], { env });
  const root = path.join(temp, 'ทดสอบ FM27 Tracker');
  fs.renameSync(path.join(temp, 'FM27-Tracker'), root);
  const launcher = path.join(root, 'bin', 'FM27-Tracker.exe');
  const runtime = path.join(root, 'bin', 'node-runtime', 'node.exe');
  await run(launcher, ['--check-runtime'], { env, cwd: temp });
  fs.renameSync(runtime, runtime + '.bak');
  await assert.rejects(run(launcher, ['--check-runtime'], { env, cwd: temp }), { code: 1 });
  fs.writeFileSync(runtime, 'invalid Windows executable');
  await assert.rejects(run(launcher, ['--check-runtime'], { env, cwd: temp }), { code: 1 });
  fs.unlinkSync(runtime);
  fs.renameSync(runtime + '.bak', runtime);

  const zipData = fs.readFileSync(zip);
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  require('../installer/verify-notices').verifyNotices(root, true);
  const updater = require(path.join(root, 'server', 'zipInstaller.js'));
  t.mock.method(global, 'fetch', async () => new Response(zipData));
  const staging = await updater.stageUpdate(root, {
    downloadUrl: 'https://example.invalid/test.zip', latestVersion: version,
    assetSize: zipData.length, assetDigest: 'sha256:' + createHash('sha256').update(zipData).digest('hex')
  });
  const fixture = path.join(root, 'data');
  fs.mkdirSync(fixture);
  const history = path.join(fixture, 'history.json');
  fs.writeFileSync(history, 'simulated career history');
  const evidence = path.join(temp, 'evidence.json');
  // The replacement process records which executable started it, then exits.
  fs.writeFileSync(path.join(staging, 'FM27-Tracker', 'server', 'index.js'), `
    require('node:fs').writeFileSync(process.env.FM27_TEST_EVIDENCE, JSON.stringify({
      executable: process.execPath, cwd: process.cwd(), port: process.env.PORT
    }));
    process.send('fm27-ready', () => process.disconnect());
  `);
  const driver = path.join(temp, 'driver.js');
  fs.writeFileSync(driver, `
    const { startUpdateWorker } = require(process.argv[2]);
    const worker = startUpdateWorker(process.argv[3], process.argv[4], 'runtime-test');
    worker.once('spawn', () => { worker.disconnect(); worker.unref(); });
    worker.once('error', error => { console.error(error); process.exitCode = 1; });
  `);
  const child = spawn(runtime, [driver, path.join(root, 'server', 'zipInstaller.js'), root, staging], {
    env: { ...env, PORT: '39728', FM27_TEST_EVIDENCE: evidence }, cwd: temp, stdio: 'inherit'
  });
  const [exit] = await once(child, 'exit');
  assert.equal(exit, 0);
  for (let attempt = 0; attempt < 80 && fs.existsSync(staging); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (fs.existsSync(staging)) {
    const log = path.join(staging, 'error.log');
    assert.fail(fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : 'ZIP update did not complete');
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(evidence, 'utf8')), { executable: runtime, cwd: root, port: '39728' });
  assert.equal(fs.readFileSync(history, 'utf8'), 'simulated career history');
  require('../installer/verify-notices').verifyNotices(root, true);
});

test('desktop launcher can reuse a reserved fallback port when 3000 is unavailable', () => {
  const source = fs.readFileSync(path.join(__dirname, '../installer/Launcher.cs'), 'utf8');
  assert.match(source, /EnvironmentVariables\["PORT"\]/);
  assert.match(source, /TrackerReady\(port, installId\)/);
  assert.match(source, /server\.ExitCode == 73/);
});

test('desktop server reports port conflicts and starts on a fallback port', { timeout: 15000 }, async t => {
  const net = require('node:net');
  const { spawn } = require('node:child_process');
  const { once } = require('node:events');
  const occupied = net.createServer();
  occupied.listen(0, '127.0.0.1');
  await once(occupied, 'listening');
  t.after(() => occupied.close());
  const start = port => spawn(process.execPath, [path.resolve(__dirname, '../server/index.js')], {
    env: { ...process.env, PORT: String(port), FM27_DESKTOP_INSTALL: 'test-install' },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc']
  });
  const [code] = await once(start(occupied.address().port), 'exit');
  assert.equal(code, 73);
  const child = start(0);
  t.after(() => child.kill());
  const [message] = await once(child, 'message');
  assert.equal(message, 'fm27-ready');
});
