(() => {
  const dialog = document.getElementById('feedback-dialog');
  const form = document.getElementById('feedback-form');
  const status = document.getElementById('feedback-status');
  const submit = document.getElementById('feedback-submit');
  let busy = false;
  document.getElementById('btn-feedback').addEventListener('click', async () => {
    dialog.showModal();
    if (busy) return;
    status.textContent = 'กำลังตรวจสอบระบบรับข้อความ…';
    submit.disabled = true;
    try {
      const response = await fetch('/api/feedback', { signal: AbortSignal.timeout(20000) });
      const info = await response.json();
      if (!response.ok) throw new Error(info.error || 'ตรวจสอบระบบรับข้อความไม่สำเร็จ');
      document.getElementById('feedback-version').textContent = `เวอร์ชัน v${info.version}${info.commit ? ' · ' + info.commit : ''}`;
      submit.disabled = !info.available;
      status.textContent = info.available ? '' : 'ยังไม่ได้ตั้งค่าระบบรับข้อความบนเครื่องทดสอบนี้';
    } catch (error) { status.textContent = error.name === 'TimeoutError' ? 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่' : error.message; }
  });
  document.getElementById('feedback-close').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || submit.disabled || !form.reportValidity()) return;
    const input = Object.fromEntries(new FormData(form));
    if (!input.title.trim() || !input.details.trim()) {
      status.textContent = 'กรอกหัวข้อและรายละเอียดให้ครบ';
      return;
    }
    busy = true;
    submit.disabled = true;
    submit.textContent = 'กำลังส่ง…';
    status.textContent = '';
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FM27-Feedback': '1' },
        body: JSON.stringify(input), signal: AbortSignal.timeout(18000)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'ส่งข้อความไม่สำเร็จ');
      form.reset();
      status.textContent = 'ส่งข้อความถึงผู้พัฒนาแล้ว ขอบคุณครับ';
    } catch (error) {
      status.textContent = ['TimeoutError', 'AbortError'].includes(error.name)
        ? 'ยังยืนยันการส่งไม่ได้ กรุณาตรวจสอบ Discord ก่อนส่งซ้ำ' : error.message;
    } finally {
      busy = false;
      submit.disabled = false;
      submit.textContent = 'ส่งข้อความ';
    }
  });
})();
