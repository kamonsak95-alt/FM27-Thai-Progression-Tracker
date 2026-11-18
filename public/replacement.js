const replacementDialog = document.getElementById('player-replacement');
const replacementForm = document.getElementById('replacement-form');
const replacementResults = document.getElementById('replacement-results');
const replacementStatus = document.getElementById('replacement-status');
let replacementSource;
let replacementRequest;

document.getElementById('replacement-close').onclick = () => replacementDialog.close();
replacementDialog.addEventListener('close', () => replacementRequest?.abort());

function setReplacementModeDefaults() {
  const future = document.getElementById('replacement-mode').value === 'future';
  const ca = replacementSource.player.ca;
  const minCA = future ? 1 : Math.max(1, ca - 20);
  const minPA = future ? Math.max(1, ca - 10) : 1;
  document.getElementById('replacement-ca').value = minCA === 1 ? '' : minCA;
  document.getElementById('replacement-pa').value = minPA === 1 ? '' : minPA;
}

document.getElementById('replacement-mode').onchange = () => {
  setReplacementModeDefaults();
  if (replacementForm.reportValidity()) searchPlayerReplacements();
};

function openPlayerReplacement(player, refCode, scanId) {
  if (el.btnScan.disabled || state.refCode !== refCode || (state.scanId && state.scanId !== scanId)) {
    showToast('กรุณาเปิดโปรไฟล์อีกครั้งหลังโหลดข้อมูล', true);
    return;
  }
  replacementSource = { player, refCode, scanId };
  replacementForm.reset();
  document.getElementById('replacement-signature').textContent = '';
  setReplacementModeDefaults();
  const positions = [...new Set([...(player.pos || '').split(',').map(code => code.trim()).filter(Boolean), ...(player.posNat || [])])];
  const select = document.getElementById('replacement-position');
  select.replaceChildren(...positions.map(code => new Option(code, code)));
  document.getElementById('replacement-source').textContent = `ต้นแบบ: ${player.name} · CA ${player.ca} / PA ${player.pa ?? '–'} · อายุ ${player.age} ปี`;
  replacementDialog.showModal();
  searchPlayerReplacements();
}

replacementForm.onsubmit = event => {
  event.preventDefault();
  searchPlayerReplacements();
};

async function searchPlayerReplacements() {
  replacementRequest?.abort();
  const request = replacementRequest = new AbortController();
  replacementResults.replaceChildren();
  document.getElementById('replacement-signature').textContent = '';
  replacementStatus.textContent = 'กำลังค้นหารูปแบบค่าพลังที่ใกล้เคียง…';
  document.getElementById('replacement-mode-note').textContent = 'กำลังค้นหาตามเงื่อนไขที่เลือก…';
  const { player, refCode, scanId } = replacementSource;
  const params = new URLSearchParams({ id: player.id, refCode: refCode || '', scanId: scanId ?? '',
    position: document.getElementById('replacement-position').value,
    mode: document.getElementById('replacement-mode').value,
    maxAge: document.getElementById('replacement-age').value,
    minCA: document.getElementById('replacement-ca').value || '1',
    minPA: document.getElementById('replacement-pa').value || '1' });
  const budget = document.getElementById('replacement-value').value;
  if (budget !== '') params.set('maxValue', budget);
  let failureMessage = 'โหลดผลค้นหาไม่สำเร็จ กรุณาลองอีกครั้ง';
  try {
    const response = await fetch(`/api/replacements?${params}`, { signal: request.signal });
    const data = await response.json();
    if (request.signal.aborted || !replacementDialog.open) return;
    if (!response.ok) {
      const messages = {
        'เลือกตำแหน่งที่ต้นแบบเล่นได้': 'ยังไม่รองรับการหาตัวแทนในตำแหน่งนี้ ลองเลือกตำแหน่งอื่น',
        'ไม่มีข้อมูล CA ต้นแบบสำหรับตั้งเกณฑ์ตัวแทน': 'ยังไม่มีข้อมูล CA ของนักเตะต้นแบบ จึงค้นหาตัวแทนไม่ได้',
        'ข้อมูลค่าพลังต้นแบบไม่ครบสำหรับวิเคราะห์ตำแหน่งนี้': 'ค่าพลังของต้นแบบยังไม่ครบสำหรับตำแหน่งนี้ ลองเลือกตำแหน่งอื่นหรือโหลดข้อมูลเกมใหม่'
      };
      failureMessage = messages[data.error] || ({ 400: 'ค้นหาไม่ได้ กรุณาตรวจตำแหน่ง อายุ CA/PA และมูลค่าที่กรอก', 404: 'ไม่พบข้อมูลนักเตะต้นแบบ กรุณาโหลดข้อมูลเกมแล้วเปิดโปรไฟล์ใหม่', 409: 'ข้อมูลเกมเปลี่ยนแล้ว กรุณาเปิดโปรไฟล์ต้นแบบใหม่' }[response.status]) || failureMessage;
      throw new Error();
    }
    if (data.refCode !== refCode || data.scanId !== scanId || state.refCode !== refCode || el.btnScan.disabled) {
      failureMessage = 'ข้อมูลเกมเปลี่ยนแล้ว กรุณาเปิดโปรไฟล์ต้นแบบใหม่';
      throw new Error();
    }
    const names = data.signature.map(key => PROFILE_ATTRIBUTE_LABELS[key] || key).join(', ');
    document.getElementById('replacement-signature').textContent = `จุดเด่นที่เน้นในการเทียบ: ${names}`;
    document.getElementById('replacement-mode-note').textContent = `เงื่อนไขที่ใช้ค้นหา: ${params.get('position')} · อายุไม่เกิน ${params.get('maxAge')} ปี · ${data.criteria.minCA > 1 ? 'CA อย่างน้อย ' + data.criteria.minCA : 'ไม่จำกัด CA'} · ${data.criteria.minPA > 1 ? 'PA อย่างน้อย ' + data.criteria.minPA : 'ไม่จำกัด PA'} · ${budget !== '' ? 'มูลค่าไม่เกิน ' + formatCurrency(Number(budget)) : 'ไม่จำกัดมูลค่า'}`;
    replacementStatus.textContent = data.total
      ? `พบ ${data.total.toLocaleString()} คน · แสดง ${data.candidates.length} อันดับแรก เรียงตามสไตล์ที่ใกล้เคียง`
      : 'ไม่พบนักเตะที่ตรงเงื่อนไขและมีข้อมูลครบ ลองเพิ่มอายุหรืองบ หรือลด CA/PA ขั้นต่ำ';
    replacementResults.innerHTML = data.candidates.map(candidate => {
      const delta = value => `${value > 0 ? '+' : ''}${value}`;
      const attribute = item => `${PROFILE_ATTRIBUTE_LABELS[item.key] || item.key} ${item.candidate} → ต้นแบบ ${item.source}`;
      const abilitySummary = candidate.attributeGap === 0 ? 'ใกล้เคียงต้นแบบ' : `${candidate.attributeGap < 0 ? 'ต่ำกว่า' : 'สูงกว่า'}ต้นแบบประมาณ ${Math.abs(candidate.attributeGap)} แต้ม`;
      return `<article class="replacement-card" data-candidate="${candidate.id}">
        <div class="replacement-card-heading"><div><strong>${escapeHtml(candidate.name)}</strong><p class="text-muted text-sm">${escapeHtml(candidate.club || 'ไร้สังกัด')} · ${candidate.age} ปี · ${escapeHtml(candidate.pos || '')}</p></div><div class="replacement-score" title="คะแนนรูปแบบค่าพลัง ไม่ใช่คะแนนฝีเท้าหรือโอกาสพัฒนาสำเร็จ"><strong>${candidate.score}<small>/100</small></strong><span>สไตล์ใกล้เคียง</span></div></div>
        <p class="replacement-ability">CA ${candidate.ca} (${candidate.caGap == null ? 'ไม่มีข้อมูลเทียบ' : delta(candidate.caGap) + ' จากต้นแบบ'}) · PA ${candidate.pa ?? '–'} · มูลค่า ${escapeHtml(formatCurrency(candidate.value))}</p>
        <p class="text-sm">เทียบจุดเด่น: ${escapeHtml(candidate.similar.map(attribute).join(' · '))}</p>
        <p class="text-muted text-sm">${candidate.weaker.length ? 'จุดเด่นที่ยังเป็นรอง: ' + escapeHtml(candidate.weaker.map(attribute).join(' · ')) : 'จุดเด่นที่เทียบอยู่ในระดับเดียวกันหรือสูงกว่า'}</p>
        <details class="replacement-comparison-details text-muted text-sm"><summary>ดูรายละเอียดการเทียบ</summary><p title="สรุปเฉพาะค่าพลังที่ใช้เทียบ โดยเน้นจุดเด่นของต้นแบบ ไม่ใช่ส่วนต่าง CA">ค่าพลังที่ใช้เทียบโดยรวม: ${abilitySummary}</p></details>
        <div class="replacement-actions"><button type="button" class="btn btn-secondary" data-action="profile">ดูโปรไฟล์</button><button type="button" class="btn btn-secondary" data-action="compare">เปรียบเทียบต้นแบบ</button></div>
      </article>`;
    }).join('');
  } catch (error) {
    if (!request.signal.aborted) {
      replacementStatus.textContent = failureMessage;
      document.getElementById('replacement-mode-note').textContent = 'ยังไม่มีผลค้นหาสำหรับเงื่อนไขนี้';
    }
  }
}

replacementResults.onclick = async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = Number(button.closest('[data-candidate]').dataset.candidate);
  const { player, refCode, scanId } = replacementSource;
  if (el.btnScan.disabled || state.refCode !== refCode || (state.scanId && state.scanId !== scanId)) {
    replacementStatus.textContent = 'รอบสแกนเปลี่ยนแล้ว กรุณาเปิดโปรไฟล์ใหม่';
    return;
  }
  if (button.dataset.action === 'profile') {
    const previousReturn = playerProfileReturn;
    const context = { source: replacementSource, results: replacementResults.innerHTML, status: replacementStatus.textContent,
      values: Array.from(replacementForm.querySelectorAll('input, select'), input => [input.id, input.value]),
      scroll: document.getElementById('replacement-body').scrollTop, methodOpen: replacementDialog.querySelector('.replacement-method').open,
      modeNote: document.getElementById('replacement-mode-note').textContent,
      signature: document.getElementById('replacement-signature').textContent };
    button.disabled = true;
    const opened = await openPlayerModal(id, refCode, scanId);
    button.disabled = false;
    if (!opened || !replacementDialog.open) return;
    replacementDialog.close();
    playerProfileReturn = async () => {
      if (el.btnScan.disabled || state.refCode !== refCode || (state.scanId && state.scanId !== scanId)) {
        showToast('รอบสแกนเปลี่ยนแล้ว กรุณาเปิดโปรไฟล์ใหม่', true);
        return;
      }
      if (!await openPlayerModal(player.id, refCode, scanId)) return;
      playerProfileReturn = previousReturn;
      replacementSource = context.source;
      document.getElementById('replacement-source').textContent = `ต้นแบบ: ${player.name} · CA ${player.ca} / PA ${player.pa ?? '–'} · อายุ ${player.age} ปี`;
      const positions = [...new Set([...(player.pos || '').split(',').map(code => code.trim()).filter(Boolean), ...(player.posNat || [])])];
      document.getElementById('replacement-position').replaceChildren(...positions.map(code => new Option(code, code)));
      for (const [inputId, value] of context.values) document.getElementById(inputId).value = value;
      document.getElementById('replacement-mode-note').textContent = context.modeNote;
      document.getElementById('replacement-signature').textContent = context.signature;
      replacementResults.innerHTML = context.results;
      replacementStatus.textContent = context.status;
      replacementDialog.querySelector('.replacement-method').open = context.methodOpen;
      replacementDialog.showModal();
      replacementResults.querySelector(`[data-candidate="${id}"] [data-action="profile"]`)?.focus({ preventScroll: true });
      document.getElementById('replacement-body').scrollTop = context.scroll;
    };
  } else {
    openPlayerComparison(player, refCode, scanId);
    selectComparisonPlayer(id);
  }
};
