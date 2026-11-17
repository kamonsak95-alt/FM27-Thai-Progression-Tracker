function validateFeedback(input) {
  if (!input || !['bug', 'suggestion'].includes(input.type)) throw new TypeError('เลือกประเภทข้อความ');
  const output = { type: input.type };
  for (const [key, limit, required] of [['title', 100, true], ['details', 2000, true], ['contact', 200, false]]) {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) {
      throw new TypeError('กรอกหัวข้อและรายละเอียดให้ครบ และไม่เกินจำนวนตัวอักษรที่กำหนด');
    }
    output[key] = value.trim();
  }
  return output;
}

async function sendFeedback(input, build, fetcher = fetch) {
  let response;
  try {
    response = await fetcher('https://fm27-scout-tracker.pages.dev/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FM27-Feedback': '1' },
      body: JSON.stringify({ ...input, build }), signal: AbortSignal.timeout(15000), redirect: 'error'
    });
  } catch { throw new Error('ยังยืนยันการส่งไม่ได้ กรุณาตรวจสอบ Discord ก่อนส่งซ้ำ'); }
  if (response.status === 429) throw new Error('กรุณารออย่างน้อย 30 วินาทีก่อนส่งข้อความถัดไป');
  if (!response.ok) throw new Error('ส่งข้อความไม่สำเร็จ กรุณาลองใหม่ภายหลัง');
  const receipt = await response.json().catch(() => null);
  if (receipt?.ok !== true) throw new Error('ยังยืนยันการรับข้อความไม่ได้ กรุณาตรวจสอบก่อนส่งซ้ำ');
  return { ok: true };
}

module.exports = { validateFeedback, sendFeedback };
