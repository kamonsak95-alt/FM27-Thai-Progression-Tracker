// FM27 Thai Progression Tracker & Scout - Client Logic

let state = {
  q: '',
  minAge: 15,
  maxAge: 45,
  minCA: 1,
  maxCA: 200,
  minPA: 1,
  maxPA: 200,
  pos: 'ALL',
  preset: 'all',
  baseline: '',
  sort: 'growthPercent',
  order: 'desc',
  page: 1,
  limit: 50,
  totalPages: 1,
  total: 0,
  myClub: '',
  gameDate: ''
};

let debounceTimer = null;

// Attribute Groups mapping for FM
const ATTR_GROUPS = {
  Technical: [
    'Corners', 'Crossing', 'Dribbling', 'Finishing', 'FirstTouch',
    'FreeKicks', 'Heading', 'LongShots', 'LongThrows', 'Marking',
    'Passing', 'PenaltyTaking', 'Tackling', 'Technique'
  ],
  Mental: [
    'Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration',
    'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall',
    'Positioning', 'Teamwork', 'Vision', 'WorkRate'
  ],
  Physical: [
    'Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness',
    'Pace', 'Stamina', 'Strength'
  ],
  Goalkeeping: [
    'AerialReach', 'CommandOfArea', 'Communication', 'Eccentricity',
    'Handling', 'Kicking', 'OneOnOnes', 'Punching', 'Reflexes',
    'RushingOut', 'Throwing'
  ]
};

// Personality labels (Thai label with English term)
const PERSONALITY_MAP = {
  ambition: 'ความทะเยอทะยาน (Ambition)',
  loyalty: 'ความจงรักภักดี (Loyalty)',
  professionalism: 'ความเป็นมืออาชีพ (Professionalism)',
  pressure: 'การรับแรงกดดัน (Pressure)',
  sportsmanship: 'น้ำใจนักกีฬา (Sportsmanship)',
  temperament: 'อารมณ์ / ความนิ่ง (Temperament)',
  adaptability: 'การปรับตัว (Adaptability)',
  controversy: 'การสร้างความขัดแย้ง (Controversy)'
};

// Elements
const el = {
  infoClub: document.getElementById('info-club'),
  infoDate: document.getElementById('info-date'),
  btnScan: document.getElementById('btn-scan'),
  btnScanText: document.getElementById('btn-scan-text'),
  selectBaseline: document.getElementById('select-baseline'),
  comparisonSummary: document.getElementById('comparison-summary'),
  filterSearch: document.getElementById('filter-search'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  posGroup: document.getElementById('pos-group'),
  minAge: document.getElementById('min-age'),
  maxAge: document.getElementById('max-age'),
  valAge: document.getElementById('val-age'),
  minCA: document.getElementById('min-ca'),
  maxCA: document.getElementById('max-ca'),
  valCA: document.getElementById('val-ca'),
  minPA: document.getElementById('min-pa'),
  maxPA: document.getElementById('max-pa'),
  valPA: document.getElementById('val-pa'),
  totalCount: document.getElementById('total-count'),
  currentPage: document.getElementById('current-page'),
  totalPages: document.getElementById('total-pages'),
  selectLimit: document.getElementById('select-limit'),
  tableBody: document.getElementById('table-body'),
  btnPrevPage: document.getElementById('btn-prev-page'),
  btnNextPage: document.getElementById('btn-next-page'),
  paginationText: document.getElementById('pagination-text'),
  modal: document.getElementById('player-modal'),
  modalClose: document.getElementById('modal-close-btn'),
  toast: document.getElementById('toast')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadStatus();
  loadPlayers();
});

function initEventListeners() {
  // Search
  el.filterSearch.addEventListener('input', (e) => {
    state.q = e.target.value;
    el.btnClearSearch.style.display = state.q ? 'block' : 'none';
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.page = 1;
      loadPlayers();
    }, 250);
  });

  el.btnClearSearch.addEventListener('click', () => {
    el.filterSearch.value = '';
    state.q = '';
    el.btnClearSearch.style.display = 'none';
    state.page = 1;
    loadPlayers();
  });

  // Presets
  document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.dataset.preset;
      state.preset = preset;
      applyPreset(preset);
      state.page = 1;
      loadPlayers();
    });
  });

  // Position Buttons
  el.posGroup.addEventListener('click', (e) => {
    if (!e.target.classList.contains('pos-btn')) return;
    document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    state.pos = e.target.dataset.pos;
    state.page = 1;
    loadPlayers();
  });

  // Inputs
  const bindRange = (minInput, maxInput, stateMinKey, stateMaxKey, valEl) => {
    const update = () => {
      let min = parseInt(minInput.value, 10);
      let max = parseInt(maxInput.value, 10);
      if (min > max) [min, max] = [max, min];
      state[stateMinKey] = min;
      state[stateMaxKey] = max;
      valEl.textContent = `${min} - ${max}`;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.page = 1;
        loadPlayers();
      }, 300);
    };
    minInput.addEventListener('change', update);
    maxInput.addEventListener('change', update);
  };

  bindRange(el.minAge, el.maxAge, 'minAge', 'maxAge', el.valAge);
  bindRange(el.minCA, el.maxCA, 'minCA', 'maxCA', el.valCA);
  bindRange(el.minPA, el.maxPA, 'minPA', 'maxPA', el.valPA);

  // Baseline Snapshot Selector
  el.selectBaseline.addEventListener('change', (e) => {
    state.baseline = e.target.value;
    updateComparisonSummary();
    state.page = 1;
    loadPlayers();
  });

  // Limit
  el.selectLimit.addEventListener('change', (e) => {
    state.limit = parseInt(e.target.value, 10);
    state.page = 1;
    loadPlayers();
  });

  // Pagination
  el.btnPrevPage.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      loadPlayers();
    }
  });

  el.btnNextPage.addEventListener('click', () => {
    if (state.page < state.totalPages) {
      state.page++;
      loadPlayers();
    }
  });

  // Table Column Sort
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sortKey = th.dataset.sort;
      if (state.sort === sortKey) {
        state.order = state.order === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort = sortKey;
        state.order = (sortKey === 'name' || sortKey === 'club') ? 'asc' : 'desc';
      }

      document.querySelectorAll('th.sortable').forEach(t => {
        t.classList.remove('active-sort', 'asc', 'desc');
      });
      th.classList.add('active-sort', state.order);

      state.page = 1;
      loadPlayers();
    });
  });

  // Scan Button
  el.btnScan.addEventListener('click', triggerScan);

  // Edit Date Badge
  const dateBadge = document.getElementById('date-badge');
  if (dateBadge) {
    dateBadge.addEventListener('click', async () => {
      const current = state.gameDate || '2026-11-08';
      const input = prompt('แก้ไขวันที่ในเกมให้ตรงกับหน้าจอของคุณ (รูปแบบ YYYY-MM-DD):', current);
      if (input && input.trim() && input.trim() !== state.gameDate) {
        const newDate = input.trim();
        try {
          const res = await fetch('/api/set-date', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameDate: newDate })
          });
          const data = await res.json();
          if (data.ok) {
            state.gameDate = newDate;
            el.infoDate.textContent = newDate;
            showToast(`✅ แก้ไขวันที่ในเกมเป็น ${newDate} เรียบร้อยแล้ว`);
            await loadStatus();
            await loadPlayers();
          }
        } catch (err) {
          showToast(`❌ เกิดข้อผิดพลาด: ${err.message}`, true);
        }
      }
    });
  }

  // Modal Close
  el.modalClose.addEventListener('click', () => {
    el.modal.style.display = 'none';
  });

  el.modal.addEventListener('click', (e) => {
    if (e.target === el.modal) {
      el.modal.style.display = 'none';
    }
  });
}

function applyPreset(preset) {
  if (preset === 'all') {
    el.minAge.value = 15; el.maxAge.value = 45;
    el.minCA.value = 1; el.maxCA.value = 200;
    el.minPA.value = 1; el.maxPA.value = 200;
    state.minAge = 15; state.maxAge = 45;
    state.minCA = 1; state.maxCA = 200;
    state.minPA = 1; state.maxPA = 200;
  } else if (preset === 'wonderkids') {
    el.minAge.value = 15; el.maxAge.value = 21;
    el.minPA.value = 150; el.maxPA.value = 200;
    state.minAge = 15; state.maxAge = 21;
    state.minPA = 150; state.maxPA = 200;
  } else if (preset === 'growth') {
    state.sort = 'growthPercent';
    state.order = 'desc';
  }
  el.valAge.textContent = `${state.minAge} - ${state.maxAge}`;
  el.valCA.textContent = `${state.minCA} - ${state.maxCA}`;
  el.valPA.textContent = `${state.minPA} - ${state.maxPA}`;
}

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.meta) {
      state.myClub = data.meta.myClub || 'ไม่ระบุ';
      state.gameDate = data.meta.gameDate || '';
      el.infoClub.textContent = state.myClub;
      el.infoDate.textContent = state.gameDate || '-';
    }

    // Populate snapshots dropdown
    if (data.snapshots && data.snapshots.length > 0) {
      el.selectBaseline.innerHTML = '';
      data.snapshots.forEach((snap, idx) => {
        const opt = document.createElement('option');
        opt.value = snap.gameDate;
        const isCurrent = snap.gameDate === state.gameDate;
        opt.textContent = `${snap.gameDate} (${snap.totalPlayers.toLocaleString()} คน)${isCurrent ? ' [รอบปัจจุบัน]' : ''}`;
        
        // Default to the previous snapshot if exists, else current
        if (data.snapshots.length > 1 && idx === 0) {
          opt.selected = true;
          state.baseline = snap.gameDate;
        } else if (data.snapshots.length === 1) {
          opt.selected = true;
          state.baseline = snap.gameDate;
        }
        el.selectBaseline.appendChild(opt);
      });
      updateComparisonSummary();
    } else {
      el.selectBaseline.innerHTML = '<option value="">(ยังไม่มีประวัติรอบก่อนหน้า)</option>';
      el.comparisonSummary.textContent = 'ยังไม่มีประวัติรอบก่อนหน้า (รอบแรกจะถูกบันทึกอัตโนมัติ)';
    }
  } catch (err) {
    console.error('Failed to load status:', err);
  }
}

function updateComparisonSummary() {
  if (!state.baseline) {
    el.comparisonSummary.textContent = 'แสดงข้อมูลรอบปัจจุบัน (ยังไม่ได้เทียบรอบก่อน)';
    return;
  }
  if (state.baseline === state.gameDate) {
    el.comparisonSummary.innerHTML = `กำลังเปรียบเทียบกับรอบปัจจุบัน (<span class="text-accent font-semibold">${state.baseline}</span>)`;
  } else {
    el.comparisonSummary.innerHTML = `กำลังเปรียบเทียบพัฒนาการ: <span class="text-accent font-semibold">${state.baseline}</span> ➔ <span class="text-green font-semibold">${state.gameDate}</span>`;
  }
}

async function loadPlayers() {
  el.tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-muted">กำลังดึงข้อมูลนักเตะ...</td></tr>`;

  const params = new URLSearchParams({
    page: state.page,
    limit: state.limit,
    sort: state.sort,
    order: state.order,
    minAge: state.minAge,
    maxAge: state.maxAge,
    minCA: state.minCA,
    maxCA: state.maxCA,
    minPA: state.minPA,
    maxPA: state.maxPA,
    pos: state.pos,
    baseline: state.baseline
  });

  if (state.q) params.set('q', state.q);
  if (state.preset === 'wonderkids') params.set('wonderkids', '1');
  if (state.preset === 'myclub') params.set('myClub', '1');

  try {
    const res = await fetch(`/api/players?${params.toString()}`);
    const data = await res.json();

    state.total = data.total || 0;
    state.totalPages = data.totalPages || 1;
    state.page = data.page || 1;

    el.totalCount.textContent = state.total.toLocaleString();
    el.currentPage.textContent = state.page;
    el.totalPages.textContent = state.totalPages;
    el.paginationText.textContent = `หน้า ${state.page} / ${state.totalPages}`;

    el.btnPrevPage.disabled = state.page <= 1;
    el.btnNextPage.disabled = state.page >= state.totalPages;

    renderTable(data.players || []);
  } catch (err) {
    console.error('Failed to load players:', err);
    el.tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-red">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
  }
}

function renderTable(players) {
  if (players.length === 0) {
    el.tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-muted">ไม่พบข้อมูลนักเตะที่ตรงกับเงื่อนไข</td></tr>`;
    return;
  }

  const rows = players.map(p => {
    let growthBadge = '';
    if (p.isNew) {
      growthBadge = `<span class="badge badge-growth-new">มาใหม่</span>`;
    } else if (p.deltaCA > 0) {
      growthBadge = `<span class="badge badge-growth-up">+${p.growthPercent}% (+${p.deltaCA} CA)</span>`;
    } else if (p.deltaCA < 0) {
      growthBadge = `<span class="badge badge-growth-down">${p.growthPercent}% (${p.deltaCA} CA)</span>`;
    } else {
      growthBadge = `<span class="badge badge-growth-neutral">คงที่ (0)</span>`;
    }

    const valueStr = formatCurrency(p.value);
    const wageStr = formatCurrency(p.wage);
    const natStr = Array.isArray(p.nat) ? p.nat.join(', ') : (p.nat || '-');

    return `
      <tr onclick="openPlayerModal(${p.id})">
        <td class="player-name-cell">
          <div class="font-bold text-white">${escapeHtml(p.name)}</div>
          <div class="text-sm text-muted">${escapeHtml(natStr)}</div>
        </td>
        <td>${p.age}</td>
        <td><span class="badge badge-pos">${escapeHtml(p.pos || '-')}</span></td>
        <td>${escapeHtml(p.club || '-')}</td>
        <td class="text-center font-bold text-accent">${p.ca}</td>
        <td class="text-center font-bold text-green">${p.pa}</td>
        <td class="text-center">${growthBadge}</td>
        <td class="text-right text-muted">${valueStr}</td>
        <td class="text-right text-muted">${wageStr}</td>
      </tr>
    `;
  });

  el.tableBody.innerHTML = rows.join('');
}

async function openPlayerModal(id) {
  try {
    const res = await fetch(`/api/player/${id}`);
    if (!res.ok) throw new Error('Player not found');
    const { player, historyPoints } = await res.json();

    document.getElementById('modal-name').textContent = player.name;
    document.getElementById('modal-pos').textContent = player.pos || '-';
    document.getElementById('modal-club').textContent = player.club || '-';
    document.getElementById('modal-nat').textContent = Array.isArray(player.nat) ? player.nat.join(', ') : (player.nat || '-');
    document.getElementById('modal-age').textContent = `${player.age} ปี (เกิด ${player.birthYear || '-'})`;
    document.getElementById('modal-ca').textContent = player.ca;
    document.getElementById('modal-pa').textContent = player.pa;

    // Render Timeline
    const timelineEl = document.getElementById('modal-history-timeline');
    if (historyPoints && historyPoints.length > 0) {
      timelineEl.innerHTML = historyPoints.map((pt, idx) => {
        let diffText = '';
        if (idx > 0) {
          const prev = historyPoints[idx - 1];
          const diff = pt.ca - prev.ca;
          if (diff > 0) diffText = `<span class="text-green font-bold">(+${diff} CA)</span>`;
          else if (diff < 0) diffText = `<span class="text-red font-bold">(${diff} CA)</span>`;
        }
        return `
          <div class="timeline-item">
            <span class="timeline-date font-semibold">${pt.gameDate}:</span>
            <span>CA: <strong class="text-accent">${pt.ca}</strong></span>
            <span>PA: <strong class="text-green">${pt.pa}</strong></span>
            ${diffText}
          </div>
        `;
      }).join('');
    } else {
      timelineEl.innerHTML = `<span class="text-muted text-sm">ยังไม่มีประวัติรอบอื่นๆ</span>`;
    }

    // Render Attributes
    const attrs = player.attrs || {};
    const attrsGrid = document.getElementById('modal-attrs-grid');
    attrsGrid.innerHTML = Object.entries(ATTR_GROUPS).map(([catName, list]) => {
      const rows = list.map(attr => {
        const val = attrs[attr] != null ? attrs[attr] : '-';
        let colorClass = 'attr-val-low';
        if (typeof val === 'number') {
          if (val >= 16) colorClass = 'attr-val-top';
          else if (val >= 11) colorClass = 'attr-val-good';
          else if (val >= 6) colorClass = 'attr-val-avg';
        }
        return `
          <div class="attr-row">
            <span class="attr-name">${attr}</span>
            <span class="attr-val ${colorClass}">${val}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="attr-column">
          <div class="attr-column-title">${catName}</div>
          ${rows}
        </div>
      `;
    }).join('');

    // Personality Stats
    const pGrid = document.getElementById('modal-personality-grid');
    pGrid.innerHTML = Object.entries(PERSONALITY_MAP).map(([key, label]) => {
      const val = player[key] != null ? player[key] : '-';
      return `
        <div class="personality-item">
          <span class="text-muted">${label}</span>
          <span class="font-bold text-accent">${val}</span>
        </div>
      `;
    }).join('');

    el.modal.style.display = 'flex';
  } catch (err) {
    showToast(`เกิดข้อผิดพลาดในการเปิดข้อมูลนักเตะ: ${err.message}`, true);
  }
}

async function triggerScan() {
  el.btnScan.disabled = true;
  el.btnScanText.textContent = 'กำลังส่องอ่านข้อมูลจาก FM27 (~9 วินาที)...';
  showToast('🚀 กำลังเริ่มสแกน RAM ของ FM27 กรุณารอสักครู่...');

  try {
    const res = await fetch('/api/scan', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      showToast(`✅ ดูดข้อมูลสำเร็จ! สแกนพบ ${data.playersCount.toLocaleString()} คน (${(data.elapsed / 1000).toFixed(1)} วิ)`);
      await loadStatus();
      await loadPlayers();
    } else {
      showToast(`❌ ${data.error || 'การสแกนล้มเหลว'}`, true);
    }
  } catch (err) {
    showToast(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`, true);
  } finally {
    el.btnScan.disabled = false;
    el.btnScanText.textContent = 'ดึงข้อมูลสดจากเกม (FM27)';
  }
}

function showToast(msg, isError = false) {
  el.toast.textContent = msg;
  el.toast.style.borderColor = isError ? 'var(--stat-red)' : 'var(--accent-purple)';
  el.toast.style.display = 'flex';
  setTimeout(() => {
    el.toast.style.display = 'none';
  }, 4000);
}

function formatCurrency(val) {
  if (val == null || val === 0) return '-';
  if (val >= 1000000) return `£${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `£${(val / 1000).toFixed(0)}K`;
  return `£${val.toLocaleString()}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
