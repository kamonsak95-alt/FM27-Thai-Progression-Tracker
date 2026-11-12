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
  trend: '',
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
  toast: document.getElementById('toast'),
  updateBanner: document.getElementById('update-banner'),
  updateDesc: document.getElementById('update-banner-desc'),
  btnApplyUpdate: document.getElementById('btn-apply-update'),
  btnDismissUpdate: document.getElementById('btn-dismiss-update'),
  btnCheckUpdate: document.getElementById('btn-check-update'),
  btnViewChangelog: document.getElementById('btn-view-changelog'),
  changelogModal: document.getElementById('changelog-modal'),
  changelogClose: document.getElementById('changelog-modal-close'),
  btnChangelogClose: document.getElementById('btn-changelog-close'),
  btnChangelogApply: document.getElementById('btn-changelog-apply'),
  changelogMeta: document.getElementById('changelog-meta'),
  changelogList: document.getElementById('changelog-list')
};

let latestUpdateData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadStatus();
  loadPlayers();
  checkForUpdates(true); // check quietly in background
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

  // Update System Listeners
  if (el.btnCheckUpdate) {
    el.btnCheckUpdate.addEventListener('click', () => checkForUpdates(false));
  }
  if (el.btnDismissUpdate) {
    el.btnDismissUpdate.addEventListener('click', () => {
      el.updateBanner.style.display = 'none';
    });
  }
  if (el.btnApplyUpdate) {
    el.btnApplyUpdate.addEventListener('click', applyUpdate);
  }
  if (el.btnViewChangelog) {
    el.btnViewChangelog.addEventListener('click', () => {
      openChangelogModal(latestUpdateData);
    });
  }
  if (el.changelogClose) {
    el.changelogClose.addEventListener('click', () => {
      el.changelogModal.style.display = 'none';
    });
  }
  if (el.btnChangelogClose) {
    el.btnChangelogClose.addEventListener('click', () => {
      el.changelogModal.style.display = 'none';
    });
  }
  if (el.btnChangelogApply) {
    el.btnChangelogApply.addEventListener('click', () => {
      el.changelogModal.style.display = 'none';
      applyUpdate();
    });
  }
  if (el.changelogModal) {
    el.changelogModal.addEventListener('click', (e) => {
      if (e.target === el.changelogModal) {
        el.changelogModal.style.display = 'none';
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
  state.trend = '';
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
  } else if (preset === 'explosive') {
    state.trend = 'explosive';
  } else if (preset === 'declining') {
    state.trend = 'declining';
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
  if (state.trend) params.set('trend', state.trend);
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
    el.tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-muted">ไม่พบข้อมูลนักเตะที่ตรงกับเงื่อนไข</td></tr>`;
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

    const trend = p.trend || { label: 'คงที่', icon: '➖', badgeClass: 'badge-trend-neutral' };
    const trendBadge = `<span class="badge ${trend.badgeClass}">${trend.icon} ${trend.label}</span>`;

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
        <td class="text-center">${trendBadge}</td>
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
    const { player, trend, historyPoints } = await res.json();

    document.getElementById('modal-name').textContent = player.name;
    document.getElementById('modal-pos').textContent = player.pos || '-';
    document.getElementById('modal-club').textContent = player.club || '-';
    document.getElementById('modal-nat').textContent = Array.isArray(player.nat) ? player.nat.join(', ') : (player.nat || '-');
    document.getElementById('modal-age').textContent = `${player.age} ปี (เกิด ${player.birthYear || '-'})`;
    document.getElementById('modal-ca').textContent = player.ca;
    document.getElementById('modal-pa').textContent = player.pa;

    // Render Development Forecast Box
    const forecastBox = document.getElementById('modal-forecast-box');
    if (forecastBox) {
      const tr = trend || { label: 'คงที่', icon: '➖', reason: 'รักษามาตรฐานค่าพลัง', badgeClass: 'badge-trend-neutral' };
      forecastBox.innerHTML = `
        <div class="forecast-icon">${tr.icon}</div>
        <div class="forecast-content">
          <div class="forecast-title">
            <span>แนวโน้ม: <strong class="text-accent">${tr.label}</strong></span>
            <span class="badge ${tr.badgeClass}">${tr.icon} ${tr.label}</span>
          </div>
          <div class="forecast-desc">${escapeHtml(tr.reason)}</div>
        </div>
      `;
    }

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

async function checkForUpdates(silent = false) {
  if (!silent && el.btnCheckUpdate) {
    el.btnCheckUpdate.disabled = true;
    el.btnCheckUpdate.innerHTML = '<span>⏳</span><span>กำลังเช็ก...</span>';
  }

  try {
    const res = await fetch('/api/check-update');
    if (!res.ok) {
      throw new Error('เซิร์ฟเวอร์ในเครื่องยังเป็นเวอร์ชันเดิม กรุณาปิดแล้วเปิดโปรแกรมใหม่');
    }
    const data = await res.json();
    latestUpdateData = data;

    if (data.hasUpdate) {
      const summaryText = data.latestMessage ? `: <strong class="text-white">${escapeHtml(data.latestMessage)}</strong>` : '';
      el.updateDesc.innerHTML = `ตรวจพบการอัปเดตใหม่บน GitHub${summaryText}`;
      el.updateBanner.style.display = 'block';
      if (!silent) {
        showToast(`🚀 พบการอัปเดตใหม่!`);
        openChangelogModal(data);
      }
    } else {
      el.updateBanner.style.display = 'none';
      if (!silent) {
        showToast(data.message || '✅ โปรแกรมของคุณเป็นเวอร์ชันล่าสุดแล้ว');
        openChangelogModal(data);
      }
    }
  } catch (err) {
    if (!silent) showToast(`❌ ตรวจสอบอัปเดตไม่สำเร็จ: ${err.message}`, true);
  } finally {
    if (!silent && el.btnCheckUpdate) {
      el.btnCheckUpdate.disabled = false;
      el.btnCheckUpdate.innerHTML = '<span>🔄</span><span>เช็กอัปเดต</span>';
    }
  }
}

function openChangelogModal(data) {
  if (!el.changelogModal || !data) return;

  const isNew = data.hasUpdate;
  const targetCommit = data.latestCommit || data.currentCommit || '-';
  el.changelogMeta.innerHTML = isNew 
    ? `มีเวอร์ชันใหม่รอให้อัปเดต &bull; Commit เป้าหมาย: <strong class="text-accent">${targetCommit}</strong>`
    : `เวอร์ชันปัจจุบัน: v${data.currentVersion || '1.0.0'} &bull; Commit ล่าสุด: <strong class="text-green">${targetCommit}</strong>`;

  if (data.changes && data.changes.length > 0) {
    el.changelogList.innerHTML = data.changes.map(c => `
      <li class="changelog-item">
        <span>${escapeHtml(c)}</span>
      </li>
    `).join('');
  } else {
    el.changelogList.innerHTML = `<li class="changelog-item text-muted">ไม่มีประวัติการเปลี่ยนแปลงระบุไว้</li>`;
  }

  if (el.btnChangelogApply) {
    el.btnChangelogApply.style.display = isNew ? 'inline-flex' : 'none';
  }

  el.changelogModal.style.display = 'flex';
}

async function applyUpdate() {
  if (!confirm('ต้องการเริ่มการอัปเดตโปรแกรมเป็นเวอร์ชันล่าสุดทันทีใช่หรือไม่?')) return;

  el.btnApplyUpdate.disabled = true;
  el.btnApplyUpdate.textContent = 'กำลังดาวน์โหลดและอัปเดตไฟล์...';
  showToast('⏳ กำลังดึงไฟล์อัปเดตจาก GitHub กรุณารอสักครู่...');

  try {
    const res = await fetch('/api/apply-update', { method: 'POST' });
    if (!res.ok) {
      throw new Error('เซิร์ฟเวอร์ในเครื่องยังเป็นเวอร์ชันเดิม กรุณาปิดแล้วเปิดโปรแกรมใหม่');
    }
    const data = await res.json();

    if (data.ok) {
      showToast('✅ อัปเดตไฟล์สำเร็จเรียบร้อยแล้ว! กำลังรีโหลดหน้าต่างโปรแกรมใน 2 วินาที...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      showToast(`❌ การอัปเดตล้มเหลว: ${data.error}`, true);
      el.btnApplyUpdate.disabled = false;
      el.btnApplyUpdate.textContent = 'ลองใหม่อีกครั้ง';
    }
  } catch (err) {
    showToast(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`, true);
    el.btnApplyUpdate.disabled = false;
    el.btnApplyUpdate.textContent = 'ลองใหม่อีกครั้ง';
  }
}
