const test = require('node:test');
const assert = require('node:assert/strict');
const { validateFeedback, sendFeedback } = require('../server/feedback');

test('feedback validates explicit fields and never copies save data', () => {
  const input = { type: 'bug', title: '  ปุ่มกดไม่ได้ ', details: 'รายละเอียดปัญหา', contact: '', players: ['private'] };
  assert.deepEqual(validateFeedback(input), { type: 'bug', title: 'ปุ่มกดไม่ได้', details: 'รายละเอียดปัญหา', contact: '' });
  for (const change of [{ type: 'other' }, { title: '' }, { details: ' ' }, { details: 'x'.repeat(2001) }, { contact: 123 }]) {
    assert.throws(() => validateFeedback({ ...input, ...change }), TypeError);
  }
});

test('relay sends explicit fields to the fixed HTTPS endpoint and hides upstream errors', async () => {
  const input = validateFeedback({ type: 'suggestion', title: '@everyone', details: 'เพิ่มฟีเจอร์', contact: 'QA' });
  await sendFeedback(input, { version: '1.0.33', commit: 'abc1234' }, async (url, options) => {
    assert.equal(url, 'https://fm27-scout-tracker.pages.dev/api/feedback');
    const body = JSON.parse(options.body);
    assert.equal(body.build.version, '1.0.33');
    assert.match(body.details, /เพิ่มฟีเจอร์/);
    assert.equal(options.headers['X-FM27-Feedback'], '1');
    return Response.json({ ok: true });
  });
  await assert.rejects(sendFeedback(input, {}, async () => new Response('secret-error', { status: 500 })), /ส่งข้อความไม่สำเร็จ/);
  await assert.rejects(sendFeedback(input, {}, async () => Response.json({})), /ยืนยัน/);
  await assert.rejects(sendFeedback(input, {}, async () => new Response('{}', { status: 429 })), /30/);
});

test('local endpoint rejects foreign origins, oversized bodies and rapid duplicate submissions', async () => {
  const feedback = require('../server/feedback');
  const original = feedback.sendFeedback;
  let calls = 0;
  feedback.sendFeedback = async input => { calls++; assert.equal(input.title, 'ทดสอบ'); return { ok: true }; };
  const server = require('../server/index');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'Content-Type': 'application/json', 'X-FM27-Feedback': '1' };
  const body = JSON.stringify({ type: 'bug', title: 'ทดสอบ', details: 'รายละเอียด' });
  try {
    assert.equal((await fetch(base + '/api/feedback', { method: 'POST', headers: { ...headers, Origin: 'https://example.com' }, body })).status, 403);
    assert.equal((await fetch(base + '/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })).status, 403);
    assert.equal((await fetch(base + '/api/feedback', { method: 'POST', headers, body: 'x'.repeat(17000) })).status, 413);
    assert.equal((await fetch(base + '/api/feedback', { method: 'POST', headers, body: '{}' })).status, 400);
    assert.equal(calls, 0);
    assert.deepEqual(await (await fetch(base + '/api/feedback', { method: 'POST', headers, body })).json(), { ok: true });
    assert.equal((await fetch(base + '/api/feedback', { method: 'POST', headers, body })).status, 429);
    assert.equal(calls, 1);
    const info = await (await fetch(base + '/api/feedback')).json();
    assert.equal(info.available, true);
    assert.ok(!JSON.stringify(info).includes('local-test'));
  } finally {
    await new Promise(resolve => server.close(resolve));
    feedback.sendFeedback = original;
  }
});
