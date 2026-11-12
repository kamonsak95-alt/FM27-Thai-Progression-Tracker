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
  selectedPitchPositions: new Set(),
  natOnly: false,
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
  gameDate: '',
  loadedCommit: ''
};

let stateStaff = {
  q: '',
  category: 'all',
  role: 'all',
  status: 'any',
  rep: 'any',
  minAge: 15,
  maxAge: 80,
  minCA: 1,
  maxCA: 200,
  minPA: 1,
  maxPA: 200,
  preset: 'all',
  sort: 'ca',
  order: 'desc',
  page: 1,
  limit: 50,
  totalPages: 1,
  total: 0
};

let debounceTimer = null;
let debounceStaffTimer = null;

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
  infoManager: document.getElementById('info-manager'),
  infoClub: document.getElementById('info-club'),
  infoSave: document.getElementById('info-save'),
  infoDate: document.getElementById('info-date'),
  infoBaseline: document.getElementById('info-baseline'),
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
  updateBannerBadge: document.getElementById('update-banner-badge'),
  updateDesc: document.getElementById('update-banner-desc'),
  btnApplyUpdate: document.getElementById('btn-apply-update'),
  btnBannerReload: document.getElementById('btn-banner-reload'),
  btnDismissUpdate: document.getElementById('btn-dismiss-update'),
  btnCheckUpdate: document.getElementById('btn-check-update'),
  btnViewChangelog: document.getElementById('btn-view-changelog'),
  changelogModal: document.getElementById('changelog-modal'),
  changelogClose: document.getElementById('changelog-modal-close'),
  btnChangelogClose: document.getElementById('btn-changelog-close'),
  btnChangelogApply: document.getElementById('btn-changelog-apply'),
  btnChangelogReload: document.getElementById('btn-changelog-reload'),
  btnReloadUI: document.getElementById('btn-reload-ui'),
  changelogMeta: document.getElementById('changelog-meta'),
  changelogList: document.getElementById('changelog-list'),
  changelogStaleAlert: document.getElementById('changelog-stale-alert'),
  alertLoadedCommit: document.getElementById('alert-loaded-commit'),
  alertLatestCommit: document.getElementById('alert-latest-commit'),
  tacticalPitchSection: document.getElementById('tactical-pitch-section'),
  btnTogglePitch: document.getElementById('btn-toggle-pitch'),
  btnClosePitchPopover: document.getElementById('btn-close-pitch-popover'),
  btnToggleCompactPos: document.getElementById('btn-toggle-compact-pos'),
  compactPosStrip: document.getElementById('compact-pos-strip'),
  btnCompactClear: document.getElementById('btn-compact-clear'),
  pitchToggleIcon: document.getElementById('pitch-toggle-icon'),
  pitchFilterSummary: document.getElementById('pitch-filter-summary'),
  pitchFilterCount: document.getElementById('pitch-filter-count'),
  checkNatOnly: document.getElementById('check-nat-only'),
  btnClearPitch: document.getElementById('btn-clear-pitch'),

  // Navigation Tabs
  tabBtnPlayers: document.getElementById('tab-btn-players'),
  tabBtnStaff: document.getElementById('tab-btn-staff'),
  sectionPlayers: document.getElementById('section-players'),
  sectionStaff: document.getElementById('section-staff'),

  // Staff Filters
  filterStaffSearch: document.getElementById('filter-staff-search'),
  btnClearStaffSearch: document.getElementById('btn-clear-staff-search'),
  filterStaffRole: document.getElementById('filter-staff-role'),
  filterStaffStatus: document.getElementById('filter-staff-status'),
  filterStaffRep: document.getElementById('filter-staff-rep'),
  minStaffAge: document.getElementById('min-staff-age'),
  maxStaffAge: document.getElementById('max-staff-age'),
  valStaffAge: document.getElementById('val-staff-age'),
  minStaffCA: document.getElementById('min-staff-ca'),
  maxStaffCA: document.getElementById('max-staff-ca'),
  valStaffCA: document.getElementById('val-staff-ca'),
  minStaffPA: document.getElementById('min-staff-pa'),
  maxStaffPA: document.getElementById('max-staff-pa'),
  valStaffPA: document.getElementById('val-staff-pa'),

  // Staff Table
  staffTotalCount: document.getElementById('staff-total-count'),
  staffCurrentPage: document.getElementById('staff-current-page'),
  staffTotalPages: document.getElementById('staff-total-pages'),
  selectStaffLimit: document.getElementById('select-staff-limit'),
  staffTableBody: document.getElementById('staff-table-body'),
  btnStaffPrevPage: document.getElementById('btn-staff-prev-page'),
  btnStaffNextPage: document.getElementById('btn-staff-next-page'),
  staffPaginationText: document.getElementById('staff-pagination-text'),

  // Staff Detail Modal
  staffModal: document.getElementById('staff-modal'),
  staffModalClose: document.getElementById('staff-modal-close-btn'),
  staffModalAvatar: document.getElementById('staff-modal-avatar'),
  staffModalName: document.getElementById('staff-modal-name'),
  staffModalRole: document.getElementById('staff-modal-role'),
  staffModalClub: document.getElementById('staff-modal-club'),
  staffModalNat: document.getElementById('staff-modal-nat'),
  staffModalAge: document.getElementById('staff-modal-age'),
  staffModalHeaderStats: document.getElementById('staff-modal-header-stats'),
  staffModalStarsBlock: document.getElementById('staff-modal-stars-block'),
  staffModalStars: document.getElementById('staff-modal-stars'),
  staffModalCA: document.getElementById('staff-modal-ca'),
  staffModalPA: document.getElementById('staff-modal-pa'),
  staffModalAttrsContainer: document.getElementById('staff-modal-attrs-container'),
  staffModalPersonalityGrid: document.getElementById('staff-modal-personality-grid'),

  // Copy Buttons
  btnCopyPlayerName: document.getElementById('btn-copy-player-name'),
  btnCopyStaffName: document.getElementById('btn-copy-staff-name')
};

let latestUpdateData = null;
let currentPlayerName = '';
let currentStaffName = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadStatus();
  loadPlayers();
  checkForUpdates(true); // check quietly in background
  setInterval(() => checkForUpdates(true), 60000); // periodically check every 60s
});

function initEventListeners() {
  // Copy Name Buttons
  if (el.btnCopyPlayerName) {
    el.btnCopyPlayerName.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = currentPlayerName || (document.getElementById('modal-name')?.textContent || '');
      copyToClipboard(name, el.btnCopyPlayerName);
    });
  }

  if (el.btnCopyStaffName) {
    el.btnCopyStaffName.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = currentStaffName || (el.staffModalName?.textContent || '');
      copyToClipboard(name, el.btnCopyStaffName);
    });
  }

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

  // Generic Position Pills (ALL, GK, DEF, MID, ATT)
  if (el.posGroup) {
    el.posGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.pos-btn');
      if (!btn) return;
      const targetPos = btn.dataset.pos;
      if (targetPos === 'ALL') {
        state.selectedPitchPositions.clear();
        state.pos = 'ALL';
      } else if (targetPos === 'GK') {
        state.selectedPitchPositions = new Set(['GK']);
        state.pos = 'GK';
      } else if (targetPos === 'DEF') {
        state.selectedPitchPositions = new Set(['DL', 'DC', 'DR', 'WBL', 'WBR']);
        state.pos = 'DL,DC,DR,WBL,WBR';
      } else if (targetPos === 'MID') {
        state.selectedPitchPositions = new Set(['ML', 'MC', 'MR', 'DM', 'AML', 'AMC', 'AMR']);
        state.pos = 'ML,MC,MR,DM,AML,AMC,AMR';
      } else if (targetPos === 'ATT') {
        state.selectedPitchPositions = new Set(['ST']);
        state.pos = 'ST';
      }
      updatePitchUI();
      state.page = 1;
      loadPlayers();
    });
  }

  // Interactive Tactical Pitch Position Buttons
  document.querySelectorAll('.pitch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pos = btn.dataset.pos;
      if (state.selectedPitchPositions.has(pos)) {
        state.selectedPitchPositions.delete(pos);
      } else {
        state.selectedPitchPositions.add(pos);
      }

      if (state.selectedPitchPositions.size === 0) {
        state.pos = 'ALL';
      } else {
        state.pos = Array.from(state.selectedPitchPositions).join(',');
      }

      updatePitchUI();
      state.page = 1;
      loadPlayers();
    });
  });

  // Pitch Presets (ALL, ATT, AM, MID, WB, DEF, GK)
  document.querySelectorAll('.pitch-preset-btn').forEach(btn => {
    if (btn.id === 'btn-clear-pitch') return;
    btn.addEventListener('click', () => {
      const preset = btn.dataset.presetPos;
      if (preset === 'ALL') {
        state.selectedPitchPositions.clear();
        state.pos = 'ALL';
      } else if (preset === 'ATT') {
        state.selectedPitchPositions = new Set(['ST']);
        state.pos = 'ST';
      } else if (preset === 'AM') {
        state.selectedPitchPositions = new Set(['AML', 'AMC', 'AMR']);
        state.pos = 'AML,AMC,AMR';
      } else if (preset === 'MID') {
        state.selectedPitchPositions = new Set(['ML', 'MC', 'MR', 'DM']);
        state.pos = 'ML,MC,MR,DM';
      } else if (preset === 'WB') {
        state.selectedPitchPositions = new Set(['WBL', 'WBR']);
        state.pos = 'WBL,WBR';
      } else if (preset === 'DEF') {
        state.selectedPitchPositions = new Set(['DL', 'DC', 'DR']);
        state.pos = 'DL,DC,DR';
      } else if (preset === 'GK') {
        state.selectedPitchPositions = new Set(['GK']);
        state.pos = 'GK';
      }
      updatePitchUI();
      state.page = 1;
      loadPlayers();
    });
  });

  // Clear Pitch Filter Button
  if (el.btnClearPitch) {
    el.btnClearPitch.addEventListener('click', () => {
      state.selectedPitchPositions.clear();
      state.pos = 'ALL';
      updatePitchUI();
      state.page = 1;
      loadPlayers();
    });
  }

  // Toggle Collapse/Expand Pitch Section (Popover)
  if (el.btnTogglePitch && el.tacticalPitchSection) {
    el.btnTogglePitch.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsed = el.tacticalPitchSection.classList.toggle('collapsed');
      if (el.pitchToggleIcon) {
        el.pitchToggleIcon.textContent = isCollapsed ? '▼' : '▲';
      }
      if (el.btnTogglePitch) {
        el.btnTogglePitch.classList.toggle('active', !isCollapsed);
      }
    });
  }

  // Close Pitch Popover Button
  if (el.btnClosePitchPopover && el.tacticalPitchSection) {
    el.btnClosePitchPopover.addEventListener('click', () => {
      el.tacticalPitchSection.classList.add('collapsed');
      if (el.pitchToggleIcon) el.pitchToggleIcon.textContent = '▼';
      if (el.btnTogglePitch) el.btnTogglePitch.classList.remove('active');
    });
  }

  // Toggle Compact Position Strip
  if (el.btnToggleCompactPos && el.compactPosStrip) {
    el.btnToggleCompactPos.addEventListener('click', () => {
      const isHidden = el.compactPosStrip.style.display === 'none';
      el.compactPosStrip.style.display = isHidden ? 'flex' : 'none';
      el.btnToggleCompactPos.classList.toggle('active', isHidden);
    });
  }

  // Compact Position Strip Button Clicks
  document.querySelectorAll('.compact-pos-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const pos = btn.dataset.pos;
      if (state.selectedPitchPositions.has(pos)) {
        state.selectedPitchPositions.delete(pos);
      } else {
        state.selectedPitchPositions.add(pos);
      }
      if (state.selectedPitchPositions.size === 0) {
        state.pos = 'ALL';
      } else {
        state.pos = Array.from(state.selectedPitchPositions).join(',');
      }
      updatePitchUI();
      state.page = 1;
      loadPlayers();
    });
  });

  // Clear Compact Position Filter
  if (el.btnCompactClear) {
    el.btnCompactClear.addEventListener('click', () => {
      state.selectedPitchPositions.clear();
      state.pos = 'ALL';
      updatePitchUI();
      state.page = 1;
      loadPlayers();
    });
  }

  // Natural Positions Only Checkbox Toggle
  if (el.checkNatOnly) {
    el.checkNatOnly.addEventListener('change', (e) => {
      state.natOnly = e.target.checked;
      state.page = 1;
      loadPlayers();
    });
  }

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

  // Baseline Snapshot Selector (if present)
  if (el.selectBaseline) {
    el.selectBaseline.addEventListener('change', (e) => {
      state.baseline = e.target.value;
      updateComparisonSummary();
      state.page = 1;
      loadPlayers();
    });
  }

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
  if (el.btnBannerReload) {
    el.btnBannerReload.addEventListener('click', () => {
      window.location.reload();
    });
  }
  if (el.btnReloadUI) {
    el.btnReloadUI.addEventListener('click', () => {
      window.location.reload();
    });
  }
  if (el.btnChangelogReload) {
    el.btnChangelogReload.addEventListener('click', () => {
      window.location.reload();
    });
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

  // Close pitch popover when clicking outside
  document.addEventListener('click', (e) => {
    if (el.tacticalPitchSection && !el.tacticalPitchSection.classList.contains('collapsed')) {
      if (!el.tacticalPitchSection.contains(e.target) && (!el.btnTogglePitch || !el.btnTogglePitch.contains(e.target))) {
        el.tacticalPitchSection.classList.add('collapsed');
        if (el.pitchToggleIcon) el.pitchToggleIcon.textContent = '▼';
        if (el.btnTogglePitch) el.btnTogglePitch.classList.remove('active');
      }
    }
  });

  // Global Escape key to close modals and popovers
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (el.tacticalPitchSection && !el.tacticalPitchSection.classList.contains('collapsed')) {
        el.tacticalPitchSection.classList.add('collapsed');
        if (el.pitchToggleIcon) el.pitchToggleIcon.textContent = '▼';
        if (el.btnTogglePitch) el.btnTogglePitch.classList.remove('active');
      }
      if (el.staffModal && el.staffModal.style.display !== 'none') {
        el.staffModal.style.display = 'none';
      }
      if (el.modal && el.modal.style.display !== 'none') {
        el.modal.style.display = 'none';
      }
      if (el.changelogModal && el.changelogModal.style.display !== 'none') {
        el.changelogModal.style.display = 'none';
      }
    }
  });

  // ==========================================================================
  // Staff Scouting Event Listeners
  // ==========================================================================

  // Tab Switcher
  if (el.tabBtnPlayers && el.tabBtnStaff) {
    el.tabBtnPlayers.addEventListener('click', () => switchTab('players'));
    el.tabBtnStaff.addEventListener('click', () => switchTab('staff'));
  }

  // Staff Search
  if (el.filterStaffSearch) {
    el.filterStaffSearch.addEventListener('input', (e) => {
      stateStaff.q = e.target.value;
      if (el.btnClearStaffSearch) {
        el.btnClearStaffSearch.style.display = stateStaff.q ? 'block' : 'none';
      }
      clearTimeout(debounceStaffTimer);
      debounceStaffTimer = setTimeout(() => {
        stateStaff.page = 1;
        loadStaff();
      }, 250);
    });
  }

  if (el.btnClearStaffSearch) {
    el.btnClearStaffSearch.addEventListener('click', () => {
      el.filterStaffSearch.value = '';
      stateStaff.q = '';
      el.btnClearStaffSearch.style.display = 'none';
      stateStaff.page = 1;
      loadStaff();
    });
  }

  // Staff Presets
  document.querySelectorAll('.staff-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.staff-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.dataset.staffPreset;
      applyStaffPreset(preset);
      stateStaff.page = 1;
      loadStaff();
    });
  });

  // Staff Dropdowns (Role, Status, Reputation)
  if (el.filterStaffRole) {
    el.filterStaffRole.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val.startsWith('cat:')) {
        stateStaff.category = val.replace('cat:', '');
        stateStaff.role = 'all';
      } else if (val === 'all') {
        stateStaff.category = 'all';
        stateStaff.role = 'all';
      } else {
        stateStaff.category = 'all';
        stateStaff.role = val;
      }
      stateStaff.page = 1;
      loadStaff();
    });
  }

  if (el.filterStaffStatus) {
    el.filterStaffStatus.addEventListener('change', (e) => {
      stateStaff.status = e.target.value;
      stateStaff.page = 1;
      loadStaff();
    });
  }

  if (el.filterStaffRep) {
    el.filterStaffRep.addEventListener('change', (e) => {
      stateStaff.rep = e.target.value;
      stateStaff.page = 1;
      loadStaff();
    });
  }

  // Staff Range Sliders
  function bindStaffRangeInput(minInput, maxInput, displayEl, stateMinKey, stateMaxKey) {
    if (!minInput || !maxInput) return;
    const update = () => {
      let min = parseInt(minInput.value, 10);
      let max = parseInt(maxInput.value, 10);
      if (min > max) { [min, max] = [max, min]; minInput.value = min; maxInput.value = max; }
      stateStaff[stateMinKey] = min;
      stateStaff[stateMaxKey] = max;
      if (displayEl) displayEl.textContent = `${min} - ${max}`;
      stateStaff.page = 1;
      loadStaff();
    };
    minInput.addEventListener('change', update);
    maxInput.addEventListener('change', update);
  }

  bindStaffRangeInput(el.minStaffAge, el.maxStaffAge, el.valStaffAge, 'minAge', 'maxAge');
  bindStaffRangeInput(el.minStaffCA, el.maxStaffCA, el.valStaffCA, 'minCA', 'maxCA');
  bindStaffRangeInput(el.minStaffPA, el.maxStaffPA, el.valStaffPA, 'minPA', 'maxPA');

  // Staff Table Page Limit
  if (el.selectStaffLimit) {
    el.selectStaffLimit.addEventListener('change', (e) => {
      stateStaff.limit = parseInt(e.target.value, 10);
      stateStaff.page = 1;
      loadStaff();
    });
  }

  // Staff Table Pagination
  if (el.btnStaffPrevPage) {
    el.btnStaffPrevPage.addEventListener('click', () => {
      if (stateStaff.page > 1) {
        stateStaff.page--;
        loadStaff();
      }
    });
  }

  if (el.btnStaffNextPage) {
    el.btnStaffNextPage.addEventListener('click', () => {
      if (stateStaff.page < stateStaff.totalPages) {
        stateStaff.page++;
        loadStaff();
      }
    });
  }

  // Staff Table Column Sorting
  document.querySelectorAll('th[data-staff-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const sortKey = th.dataset.staffSort;
      if (stateStaff.sort === sortKey) {
        stateStaff.order = stateStaff.order === 'asc' ? 'desc' : 'asc';
      } else {
        stateStaff.sort = sortKey;
        stateStaff.order = (sortKey === 'name' || sortKey === 'club' || sortKey === 'role') ? 'asc' : 'desc';
      }

      document.querySelectorAll('th[data-staff-sort]').forEach(t => {
        t.classList.remove('active-sort', 'asc', 'desc');
      });
      th.classList.add('active-sort', stateStaff.order);

      stateStaff.page = 1;
      loadStaff();
    });
  });

  // Staff Detail Modal Close
  if (el.staffModalClose) {
    el.staffModalClose.addEventListener('click', () => {
      el.staffModal.style.display = 'none';
    });
  }

  if (el.staffModal) {
    el.staffModal.addEventListener('click', (e) => {
      if (e.target === el.staffModal) {
        el.staffModal.style.display = 'none';
      }
    });
  }
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

function switchTab(tab) {
  if (tab === 'players') {
    if (el.tabBtnPlayers) el.tabBtnPlayers.classList.add('active');
    if (el.tabBtnStaff) el.tabBtnStaff.classList.remove('active');
    if (el.sectionPlayers) el.sectionPlayers.style.display = 'block';
    if (el.sectionStaff) el.sectionStaff.style.display = 'none';
  } else if (tab === 'staff') {
    if (el.tabBtnPlayers) el.tabBtnPlayers.classList.remove('active');
    if (el.tabBtnStaff) el.tabBtnStaff.classList.add('active');
    if (el.sectionPlayers) el.sectionPlayers.style.display = 'none';
    if (el.sectionStaff) el.sectionStaff.style.display = 'block';

    // Lazy load staff when switched to staff tab for first time
    if (stateStaff.total === 0) {
      loadStaff();
    }
  }
}

function applyStaffPreset(preset) {
  stateStaff.preset = preset;
  stateStaff.category = 'all';
  stateStaff.role = 'all';
  stateStaff.status = 'any';
  stateStaff.rep = 'any';
  stateStaff.minAge = 15; stateStaff.maxAge = 80;
  stateStaff.minCA = 1; stateStaff.maxCA = 200;
  stateStaff.minPA = 1; stateStaff.maxPA = 200;
  stateStaff.sort = 'ca';
  stateStaff.order = 'desc';

  if (preset === 'five_star') {
    stateStaff.category = 'coaching';
    stateStaff.sort = 'coachStars';
    stateStaff.order = 'desc';
    if (el.filterStaffRole) el.filterStaffRole.value = 'cat:coaching';
    if (el.filterStaffStatus) el.filterStaffStatus.value = 'any';
  } else if (preset === 'hoyd') {
    stateStaff.role = 'hoyd';
    stateStaff.sort = 'ca';
    if (el.filterStaffRole) el.filterStaffRole.value = 'hoyd';
    if (el.filterStaffStatus) el.filterStaffStatus.value = 'any';
  } else if (preset === 'diamond_scout') {
    stateStaff.role = 'scout';
    stateStaff.sort = 'ca';
    if (el.filterStaffRole) el.filterStaffRole.value = 'scout';
    if (el.filterStaffStatus) el.filterStaffStatus.value = 'any';
  } else if (preset === 'god_physio') {
    stateStaff.role = 'physio';
    stateStaff.sort = 'ca';
    if (el.filterStaffRole) el.filterStaffRole.value = 'physio';
    if (el.filterStaffStatus) el.filterStaffStatus.value = 'any';
  } else if (preset === 'free_agents') {
    stateStaff.status = 'unemployed';
    if (el.filterStaffRole) el.filterStaffRole.value = 'all';
    if (el.filterStaffStatus) el.filterStaffStatus.value = 'unemployed';
  } else {
    // all
    if (el.filterStaffRole) el.filterStaffRole.value = 'all';
    if (el.filterStaffStatus) el.filterStaffStatus.value = 'any';
  }

  if (el.filterStaffRep) el.filterStaffRep.value = 'any';

  // Update input displays
  if (el.minStaffAge) el.minStaffAge.value = stateStaff.minAge;
  if (el.maxStaffAge) el.maxStaffAge.value = stateStaff.maxAge;
  if (el.valStaffAge) el.valStaffAge.textContent = `${stateStaff.minAge} - ${stateStaff.maxAge}`;
  if (el.minStaffCA) el.minStaffCA.value = stateStaff.minCA;
  if (el.maxStaffCA) el.maxStaffCA.value = stateStaff.maxCA;
  if (el.valStaffCA) el.valStaffCA.textContent = `${stateStaff.minCA} - ${stateStaff.maxCA}`;
  if (el.minStaffPA) el.minStaffPA.value = stateStaff.minPA;
  if (el.maxStaffPA) el.maxStaffPA.value = stateStaff.maxPA;
  if (el.valStaffPA) el.valStaffPA.textContent = `${stateStaff.minPA} - ${stateStaff.maxPA}`;
}

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (!state.loadedCommit && data.currentCommit) {
      state.loadedCommit = data.currentCommit;
    }
    if (data.justUpdated) {
      showToast(`🎉 อัปเดตเป็นเวอร์ชันล่าสุดให้เรียบร้อยแล้ว! (${data.justUpdated.newCommit})`);
      setTimeout(() => {
        checkForUpdates(false, true);
      }, 700);
    }
    if (data.meta) {
      state.myClub = data.meta.myClub || 'ไม่ระบุ';
      state.gameDate = data.meta.gameDate || '';
      state.scanId = data.meta.scanId || '';
      state.refCode = data.refCode || '';
      el.infoClub.textContent = state.myClub;
      if (data.meta.requiresDateConfirmation) {
        el.infoDate.textContent = `${state.gameDate || data.meta.suggestedGameDate || '-'} (⚠️ รอยืนยัน)`;
      } else {
        el.infoDate.textContent = state.gameDate || '-';
      }
      if (el.infoManager) {
        el.infoManager.textContent = data.meta.manager || 'ไม่ระบุ';
      }

      const dateBadgeEl = document.getElementById('date-badge');
      if (dateBadgeEl) {
        if (data.meta.requiresDateConfirmation) {
          dateBadgeEl.title = `⚠️ วันที่จาก scanner (${data.meta.rawGameDate || state.gameDate}) รอยืนยันสำหรับรอบสแกนนี้ - คลิกแล้วกรอกวันที่จากหน้าจอ FM27`;
          dateBadgeEl.style.outline = '2px dashed #f59e0b';
        } else if (data.meta.gameDateCorrected) {
          dateBadgeEl.title = `วันที่ในเกมที่ยืนยันแล้ว: ${state.gameDate} (scanner อ่านได้ ${data.meta.rawGameDate}) - คลิกเพื่อแก้ไข`;
          dateBadgeEl.style.outline = 'none';
        } else {
          dateBadgeEl.title = `วันที่ในเกม: ${state.gameDate} - คลิกเพื่อแก้ไข`;
          dateBadgeEl.style.outline = 'none';
        }

        if (!dateBadgeEl._boundClick) {
          dateBadgeEl._boundClick = true;
          dateBadgeEl.style.cursor = 'pointer';
          dateBadgeEl.addEventListener('click', async () => {
            const defaultPrompt = state.gameDate;
            const input = prompt('ยืนยันหรือระบุวันที่ในเกม FM27 สำหรับรอบนี้ (รูปแบบ YYYY-MM-DD):', defaultPrompt);
            if (!input) return;
            const trimmed = input.trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
              alert('กรุณาระบุวันที่ในรูปแบบ YYYY-MM-DD (เช่น 2026-07-13)');
              return;
            }
            try {
              const res = await fetch('/api/confirm-date', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  gameDate: trimmed,
                  scanId: state.scanId,
                  refCode: state.refCode
                })
              });
              const result = await res.json();
              if (res.ok && result.ok) {
                showToast(`✅ ยืนยันวันที่ในเกมเป็น ${trimmed} และบันทึกประวัติเรียบร้อยแล้ว`);
                await loadStatus();
                await loadPlayers();
              } else {
                showToast(`❌ ${result.message || result.error || 'ไม่สามารถยืนยันวันที่ได้'}`, true);
              }
            } catch (err) {
              showToast(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`, true);
            }
          });
        }
      }
    }

    if (el.infoSave) {
      el.infoSave.textContent = data.refCode || '-';
    }

    // Update baseline info badge in header
    if (el.infoBaseline) {
      if (data.snapshots && data.snapshots.length > 1) {
        const earliest = data.snapshots[0].gameDate;
        el.infoBaseline.textContent = `${earliest} (วันเริ่มบันทึกข้อมูล)`;
      } else if (data.snapshots && data.snapshots.length === 1) {
        el.infoBaseline.textContent = `รอบแรก (${data.snapshots[0].gameDate})`;
      } else {
        el.infoBaseline.textContent = 'จุดเริ่มอาชีพ';
      }
    }

    // Populate snapshots dropdown if present (backwards compatibility)
    if (el.selectBaseline) {
      if (data.snapshots && data.snapshots.length > 0) {
        el.selectBaseline.innerHTML = '';
        data.snapshots.forEach((snap, idx) => {
          const opt = document.createElement('option');
          opt.value = snap.gameDate;
          const isCurrent = snap.gameDate === state.gameDate;
          opt.textContent = `${snap.gameDate} (${snap.totalPlayers.toLocaleString()} คน)${isCurrent ? ' [รอบปัจจุบัน]' : ''}`;
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
        if (el.comparisonSummary) {
          el.comparisonSummary.textContent = 'ยังไม่มีประวัติรอบก่อนหน้า (รอบแรกจะถูกบันทึกอัตโนมัติ)';
        }
      }
    }
  } catch (err) {
    console.error('Failed to load status:', err);
  }
}

function updateComparisonSummary() {
  if (!el.comparisonSummary) return;
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

function updatePitchUI() {
  const pitchButtons = document.querySelectorAll('.pitch-btn');
  const count = state.selectedPitchPositions.size;

  if (count === 0) {
    pitchButtons.forEach(btn => {
      btn.classList.remove('active', 'dimmed');
    });
    if (el.pitchFilterSummary) {
      el.pitchFilterSummary.textContent = 'ทุกตำแหน่ง (ALL)';
    }
    document.querySelectorAll('.pitch-preset-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.presetPos === 'ALL');
    });
    document.querySelectorAll('.pos-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.pos === 'ALL');
    });
  } else {
    const labels = [];
    pitchButtons.forEach(btn => {
      const pos = btn.dataset.pos;
      if (state.selectedPitchPositions.has(pos)) {
        btn.classList.add('active');
        btn.classList.remove('dimmed');
        const labelSpan = btn.querySelector('.pitch-btn-label');
        labels.push(labelSpan ? labelSpan.textContent : pos);
      } else {
        btn.classList.remove('active');
        btn.classList.add('dimmed');
      }
    });

    if (el.pitchFilterSummary) {
      el.pitchFilterSummary.textContent = labels.join(', ');
    }

    // Check if matches preset
    const selectedArr = Array.from(state.selectedPitchPositions).sort();
    const isGK = selectedArr.length === 1 && selectedArr[0] === 'GK';
    const isST = selectedArr.length === 1 && selectedArr[0] === 'ST';
    const isAM = selectedArr.length === 3 && selectedArr.join(',') === 'AMC,AML,AMR';
    const isMID = selectedArr.length === 4 && selectedArr.join(',') === 'DM,MC,ML,MR';
    const isWB = selectedArr.length === 2 && selectedArr.join(',') === 'WBL,WBR';
    const isDEF = selectedArr.length === 3 && selectedArr.join(',') === 'DC,DL,DR';

    document.querySelectorAll('.pitch-preset-btn').forEach(b => {
      const p = b.dataset.presetPos;
      b.classList.toggle('active', 
        (p === 'GK' && isGK) ||
        (p === 'ATT' && isST) ||
        (p === 'AM' && isAM) ||
        (p === 'MID' && isMID) ||
        (p === 'WB' && isWB) ||
        (p === 'DEF' && isDEF)
      );
    });

    document.querySelectorAll('.pos-btn').forEach(b => {
      const p = b.dataset.pos;
      b.classList.toggle('active', 
        (p === 'GK' && isGK) ||
        (p === 'ATT' && isST)
      );
    });
  }

  // Update compact pos strip pills
  document.querySelectorAll('.compact-pos-pill').forEach(b => {
    b.classList.toggle('active', state.selectedPitchPositions.has(b.dataset.pos));
  });
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
    pos: state.pos
  });

  if (state.baseline) params.set('baseline', state.baseline);

  if (state.q) params.set('q', state.q);
  if (state.trend) params.set('trend', state.trend);
  if (state.natOnly) params.set('natOnly', '1');
  if (state.preset === 'wonderkids') params.set('wonderkids', '1');
  if (state.preset === 'myclub') params.set('myClub', '1');

  try {
    const res = await fetch(`/api/players?${params.toString()}`);
    const data = await res.json();

    state.total = data.total || 0;
    state.totalPages = data.totalPages || 1;
    state.page = data.page || 1;

    el.totalCount.textContent = state.total.toLocaleString();
    if (el.pitchFilterCount) {
      el.pitchFilterCount.textContent = `(พบ ${state.total.toLocaleString()} คน)`;
    }
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
    if (p.isFirstScan) {
      growthBadge = `<span class="badge badge-growth-neutral text-muted" title="สแกนครั้งแรก (ยังไม่มีประวัติรอบเปรียบเทียบ)">- (รอบแรก)</span>`;
    } else if (p.isNew) {
      if (p.isNewgen) {
        growthBadge = `<span class="badge badge-growth-new" title="เพิ่งพบครั้งแรกในรอบนี้ (เด็กเกิดใหม่ / Youth Intake)">👶 เกิดใหม่</span>`;
      } else {
        growthBadge = `<span class="badge badge-growth-neutral" title="เพิ่งพบครั้งแรกในฐานข้อมูล (อายุ ${p.age || '-'} ปี)">🆕 พบครั้งแรก</span>`;
      }
    } else if (p.deltaCA > 0) {
      const originDate = p.firstSeenDate || 'เริ่มบันทึก';
      const tooltip = `เติบโต +${p.deltaCA} CA ตั้งแต่ ${originDate} (เดิม ${p.prevCA || '-'})`;
      growthBadge = `<span class="badge badge-growth-up" title="${tooltip}">+${p.deltaCA} CA (+${p.growthPercent}%)</span>`;
    } else if (p.deltaCA < 0) {
      const originDate = p.firstSeenDate || 'เริ่มบันทึก';
      const tooltip = `ลดลง ${p.deltaCA} CA ตั้งแต่ ${originDate} (เดิม ${p.prevCA || '-'})`;
      growthBadge = `<span class="badge badge-growth-down" title="${tooltip}">${p.deltaCA} CA (${p.growthPercent}%)</span>`;
    } else {
      const originDate = p.firstSeenDate || 'เริ่มบันทึก';
      growthBadge = `<span class="badge badge-growth-neutral" title="ค่าพลังคงที่ตั้งแต่ ${originDate}">คงที่ (0 CA)</span>`;
    }

    const trend = p.trend || { label: 'คงที่', icon: '➖', badgeClass: 'badge-trend-neutral' };
    const trendBadge = `<span class="badge ${trend.badgeClass}">${trend.icon} ${trend.label}</span>`;

    const valueStr = formatCurrency(p.value);
    const wageStr = formatCurrency(p.wage);
    const natStr = Array.isArray(p.nat) ? p.nat.join(', ') : (p.nat || '-');

    return `
      <tr onclick="openPlayerModal(${p.id})">
        <td class="col-name sticky-col">
          <div class="player-name-cell">
            <span class="player-name font-semibold text-white">${escapeHtml(p.name)}</span>
            <span class="nat-badge text-muted text-xs">${escapeHtml(natStr)}</span>
          </div>
        </td>
        <td class="text-center font-medium">${p.age}</td>
        <td class="text-center"><span class="badge badge-pos">${escapeHtml(p.pos || '-')}</span></td>
        <td><span class="text-club">${escapeHtml(p.club || '-')}</span></td>
        <td class="text-center font-bold text-accent">${p.ca}</td>
        <td class="text-center font-bold text-green">${p.pa}</td>
        <td class="text-center">${trendBadge}</td>
        <td class="text-center">${growthBadge}</td>
        <td class="text-right text-secondary font-mono">${valueStr}</td>
        <td class="text-right text-muted font-mono">${wageStr}</td>
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

    currentPlayerName = player.name;
    if (el.btnCopyPlayerName) {
      el.btnCopyPlayerName.classList.remove('copied');
      el.btnCopyPlayerName.innerHTML = `<span class="copy-icon">📋</span> <span class="copy-label">คัดลอกชื่อ</span>`;
    }

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

    // Render Timeline (Milestones only by default)
    const timelineEl = document.getElementById('modal-history-timeline');
    const btnToggle = document.getElementById('btn-toggle-timeline');
    let isShowingAllTimeline = false;
    const rawHistory = historyPoints || [];

    function renderTimeline() {
      if (!timelineEl) return;
      if (!rawHistory || rawHistory.length === 0) {
        timelineEl.innerHTML = `<span class="text-muted text-sm">ยังไม่มีประวัติรอบอื่นๆ</span>`;
        if (btnToggle) btnToggle.style.display = 'none';
        return;
      }

      // Compute milestones (only dates where CA changed + baseline)
      const milestones = [];
      const firstPt = rawHistory[0];
      milestones.push({
        ...firstPt,
        isBaseline: true,
        diffText: `<span class="badge badge-growth-neutral text-xs text-muted">(จุดเริ่มบันทึก)</span>`
      });

      let prevCA = firstPt.ca;
      for (let i = 1; i < rawHistory.length; i++) {
        const pt = rawHistory[i];
        if (pt.ca !== prevCA) {
          const diff = pt.ca - prevCA;
          const diffText = diff > 0
            ? `<span class="text-green font-bold">(+${diff} CA)</span>`
            : `<span class="text-red font-bold">(${diff} CA)</span>`;
          milestones.push({
            ...pt,
            diffText,
            isMilestone: true
          });
          prevCA = pt.ca;
        }
      }

      if (milestones.length === 1 && rawHistory.length > 1) {
        milestones[0].diffText = `<span class="badge badge-growth-neutral text-xs text-muted">(จุดเริ่มบันทึก - ค่าพลังคงที่ตลอด ${rawHistory.length} รอบ)</span>`;
      }

      const hasRedundant = rawHistory.length > milestones.length;
      if (btnToggle) {
        if (hasRedundant) {
          btnToggle.style.display = 'inline-block';
          btnToggle.textContent = isShowingAllTimeline
            ? `ย่อเหลือเฉพาะที่เปลี่ยน (${milestones.length} รอบ)`
            : `ดูทุกรอบ (${rawHistory.length} รอบ)`;
        } else {
          btnToggle.style.display = 'none';
        }
      }

      const pointsToDisplay = isShowingAllTimeline
        ? rawHistory.map((pt, idx) => {
            let diffText = '';
            if (idx === 0) {
              diffText = `<span class="badge badge-growth-neutral text-xs text-muted">(จุดเริ่มบันทึก)</span>`;
            } else {
              const prev = rawHistory[idx - 1];
              const diff = pt.ca - prev.ca;
              if (diff > 0) diffText = `<span class="text-green font-bold">(+${diff} CA)</span>`;
              else if (diff < 0) diffText = `<span class="text-red font-bold">(${diff} CA)</span>`;
              else diffText = `<span class="text-muted text-xs">(คงที่)</span>`;
            }
            return { ...pt, diffText };
          })
        : milestones;

      timelineEl.innerHTML = pointsToDisplay.map(pt => {
        const itemClass = pt.isMilestone ? 'timeline-milestone' : (pt.isBaseline ? 'timeline-baseline' : '');
        return `
          <div class="timeline-item ${itemClass}">
            <span class="timeline-date font-semibold">${pt.gameDate}:</span>
            <span>CA: <strong class="text-accent">${pt.ca}</strong></span>
            <span>PA: <strong class="text-green">${pt.pa}</strong></span>
            ${pt.diffText || ''}
          </div>
        `;
      }).join('');
    }

    if (btnToggle) {
      btnToggle.onclick = (e) => {
        e.stopPropagation();
        isShowingAllTimeline = !isShowingAllTimeline;
        renderTimeline();
      };
    }

    renderTimeline();

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
  el.btnScanText.textContent = 'กำลังตรวจจับเซฟและโหลดข้อมูลจาก FM27 (~9 วินาที)...';
  showToast('🚀 กำลังเชื่อมต่อ FM27 และตรวจจับเซฟเกม กรุณารอสักครู่...');

  try {
    const res = await fetch('/api/scan', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      const pCount = (data.playersCount || 0).toLocaleString();
      const sCount = (data.staffCount || 0).toLocaleString();
      const sec = (data.elapsed / 1000).toFixed(1);
      const staffMsg = data.staffCount ? ` และทีมงาน ${sCount} คน` : '';
      const refMsg = data.refCode ? ` [เซฟ: ${data.refCode}]` : '';
      if (data.meta?.requiresDateConfirmation) {
        showToast('⚠️ โหลดข้อมูลแล้ว คลิกป้ายวันที่เพื่อยืนยันวันที่ในเกมก่อนบันทึกประวัติ');
      } else {
        showToast(`✅ โหลดข้อมูลสำเร็จ! พบนักเตะ ${pCount} คน${staffMsg} (${sec} วิ)${refMsg}`);
      }
      await loadStatus();
      await loadPlayers();
      if (el.sectionStaff && el.sectionStaff.style.display !== 'none') {
        await loadStaff();
      }
    } else {
      showToast(`❌ ${data.error || 'การโหลดข้อมูลล้มเหลว'}`, true);
    }
  } catch (err) {
    showToast(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`, true);
  } finally {
    el.btnScan.disabled = false;
    el.btnScanText.textContent = 'โหลดข้อมูลเกม (FM27)';
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

function copyToClipboard(text, btnEl) {
  if (!text) return;
  const originalHtml = btnEl ? btnEl.innerHTML : '';

  const onSuccess = () => {
    if (btnEl) {
      btnEl.classList.add('copied');
      btnEl.innerHTML = `<span class="copy-icon">✓</span> <span class="copy-label">คัดลอกแล้ว!</span>`;
      setTimeout(() => {
        btnEl.classList.remove('copied');
        btnEl.innerHTML = originalHtml;
      }, 1600);
    }
    showToast(`📋 คัดลอก "${text}" ไปยังคลิปบอร์ดแล้ว (นำไปวางค้นหาใน FM27 ได้เลย)`);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy(text, onSuccess));
  } else {
    fallbackCopy(text, onSuccess);
  }
}

function fallbackCopy(text, callback) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (callback) callback();
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }
  document.body.removeChild(ta);
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

async function checkForUpdates(silent = false, isCelebration = false) {
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

    const currentCommit = data.currentCommit || '';
    const latestCommit = data.latestCommit || currentCommit;

    // Detect if window UI is older than what's on disk, or if remote GitHub has new commits
    const isDiskAheadOfUI = Boolean(state.loadedCommit && currentCommit && state.loadedCommit !== currentCommit);
    const isRemoteAheadOfDisk = Boolean(data.hasUpdate);
    const isUiStale = Boolean(state.loadedCommit && latestCommit && state.loadedCommit !== latestCommit);

    if (isCelebration) {
      openChangelogModal(data, true);
      return;
    }

    if (isRemoteAheadOfDisk) {
      // Case 1: Remote GitHub has an unpulled update
      const summaryText = data.latestMessage ? `: <strong class="text-white">${escapeHtml(data.latestMessage)}</strong>` : '';
      if (el.updateBannerBadge) {
        el.updateBannerBadge.textContent = '🚀 อัปเดตใหม่!';
        el.updateBannerBadge.className = 'update-badge';
      }
      el.updateDesc.innerHTML = `ตรวจพบเวอร์ชันใหม่บน GitHub (${latestCommit})${summaryText}`;
      if (el.btnApplyUpdate) el.btnApplyUpdate.style.display = 'inline-flex';
      if (el.btnBannerReload) el.btnBannerReload.style.display = 'none';
      el.updateBanner.style.display = 'block';

      if (!silent) {
        showToast(`🚀 ตรวจพบเวอร์ชันใหม่บน GitHub!`);
        openChangelogModal(data);
      }
    } else if (isDiskAheadOfUI) {
      // Case 2: Code on disk has been updated, but this browser window was loaded earlier
      if (el.updateBannerBadge) {
        el.updateBannerBadge.textContent = '⚡ ต้องรีโหลดหน้าจอ';
        el.updateBannerBadge.className = 'update-badge badge-warning';
      }
      el.updateDesc.innerHTML = `ตรวจพบเวอร์ชันใหม่พร้อมใช้งาน (หน้าต่างเปิดค้างไว้ที่ <code>${state.loadedCommit}</code> ➔ ล่าสุด <code>${currentCommit}</code>) กรุณากดปุ่มเพื่ออัปเดตการแสดงผล`;
      if (el.btnApplyUpdate) el.btnApplyUpdate.style.display = 'none';
      if (el.btnBannerReload) el.btnBannerReload.style.display = 'inline-flex';
      el.updateBanner.style.display = 'block';

      if (!silent) {
        showToast(`⚡ หน้าต่างนี้ยังเป็นเวอร์ชันเดิม กรุณากดปุ่ม 🔄 รีโหลดหน้าจอ เพื่อเริ่มใช้งาน`);
        openChangelogModal(data);
      }
    } else {
      // Case 3: Fully up to date
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

function openChangelogModal(data, isCelebration = false) {
  if (!el.changelogModal || !data) return;

  const currentCommit = data.currentCommit || '';
  const latestCommit = data.latestCommit || currentCommit;
  const isNew = data.hasUpdate;
  const isUiStale = !isCelebration && Boolean(state.loadedCommit && latestCommit && state.loadedCommit !== latestCommit);

  if (isCelebration) {
    el.changelogMeta.innerHTML = `🎉 ยินดีต้อนรับสู่เวอร์ชันใหม่ &bull; Commit ล่าสุด: <strong class="text-green">${latestCommit}</strong>`;
  } else {
    el.changelogMeta.innerHTML = isNew 
      ? `มีเวอร์ชันใหม่รอให้อัปเดต &bull; Commit เป้าหมาย: <strong class="text-accent">${latestCommit}</strong>`
      : `เวอร์ชันปัจจุบัน: v${data.currentVersion || '1.0.0'} &bull; Commit ล่าสุด: <strong class="text-green">${latestCommit}</strong>`;
  }

  // Display Celebration or Stale UI Alert Box
  if (el.changelogStaleAlert) {
    if (isCelebration) {
      el.changelogStaleAlert.className = 'changelog-alert-box success';
      el.changelogStaleAlert.innerHTML = `
        <span class="alert-icon">✨</span>
        <div class="alert-text">
          <strong>อัปเดตเวอร์ชันล่าสุดให้เรียบร้อยแล้ว:</strong> แอปได้ดึงฟีเจอร์และปรับปรุงล่าสุดจาก GitHub ให้คุณอัตโนมัติเรียบร้อยแล้ว สามารถดูรายการที่เพิ่มเข้ามาด้านล่างนี้ได้เลยครับ!
        </div>
      `;
      el.changelogStaleAlert.style.display = 'flex';
    } else if (isUiStale) {
      el.changelogStaleAlert.className = 'changelog-alert-box';
      el.changelogStaleAlert.innerHTML = `
        <span class="alert-icon">⚠️</span>
        <div class="alert-text">
          <strong>หน้าต่างนี้ยังเป็นเวอร์ชันก่อนหน้า:</strong> โหลดไว้ที่ <code>${state.loadedCommit}</code> แต่เวอร์ชันล่าสุดคือ <code>${latestCommit}</code><br>
          กรุณากดปุ่ม <strong>🔄 รีโหลดหน้าจอ (Reload UI)</strong> ด้านล่างเพื่ออัปเดตการแสดงผลทันที
        </div>
      `;
      el.changelogStaleAlert.style.display = 'flex';
    } else {
      el.changelogStaleAlert.style.display = 'none';
    }
  }

  if (data.changes && data.changes.length > 0) {
    el.changelogList.innerHTML = data.changes.map(c => `
      <li class="changelog-item">
        <span>${escapeHtml(c)}</span>
      </li>
    `).join('');
  } else {
    el.changelogList.innerHTML = `<li class="changelog-item text-muted">ไม่มีประวัติการเปลี่ยนแปลงระบุไว้</li>`;
  }

  if (el.btnChangelogClose) {
    el.btnChangelogClose.textContent = isCelebration ? '🚀 ยอดเยี่ยม / เข้าใช้งาน' : 'ปิด';
  }

  if (el.btnChangelogApply) {
    el.btnChangelogApply.style.display = isNew ? 'inline-flex' : 'none';
  }
  if (el.btnChangelogReload) {
    el.btnChangelogReload.style.display = (isUiStale || (!isNew && !isCelebration)) ? 'inline-flex' : 'none';
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

// ==========================================================================
// Staff Data Loading & Rendering
// ==========================================================================

async function loadStaff() {
  if (!el.staffTableBody) return;
  el.staffTableBody.innerHTML = `
    <tr>
      <td colspan="9" class="text-center py-8 text-muted">กำลังโหลดข้อมูลทีมงาน...</td>
    </tr>
  `;

  try {
    const params = new URLSearchParams({
      page: stateStaff.page,
      limit: stateStaff.limit,
      sort: stateStaff.sort,
      order: stateStaff.order,
      minAge: stateStaff.minAge,
      maxAge: stateStaff.maxAge,
      minCA: stateStaff.minCA,
      maxCA: stateStaff.maxCA,
      minPA: stateStaff.minPA,
      maxPA: stateStaff.maxPA
    });

    if (stateStaff.q) params.set('q', stateStaff.q);
    if (stateStaff.category && stateStaff.category !== 'all') params.set('category', stateStaff.category);
    if (stateStaff.role && stateStaff.role !== 'all') params.set('role', stateStaff.role);
    if (stateStaff.status && stateStaff.status !== 'any') params.set('status', stateStaff.status);
    if (stateStaff.rep && stateStaff.rep !== 'any') params.set('rep', stateStaff.rep);
    if (stateStaff.preset && stateStaff.preset !== 'all') params.set('preset', stateStaff.preset);

    const res = await fetch(`/api/staff?${params.toString()}`);
    const data = await res.json();

    stateStaff.total = data.total;
    stateStaff.totalPages = data.totalPages;

    if (el.staffTotalCount) el.staffTotalCount.textContent = data.total.toLocaleString();
    if (el.staffCurrentPage) el.staffCurrentPage.textContent = data.page;
    if (el.staffTotalPages) el.staffTotalPages.textContent = data.totalPages;
    if (el.staffPaginationText) el.staffPaginationText.textContent = `หน้า ${data.page} / ${data.totalPages}`;

    if (el.btnStaffPrevPage) el.btnStaffPrevPage.disabled = data.page <= 1;
    if (el.btnStaffNextPage) el.btnStaffNextPage.disabled = data.page >= data.totalPages;

    renderStaffTable(data.staff);
  } catch (err) {
    console.error('Failed to load staff:', err);
    el.staffTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-8 text-red">
          เกิดข้อผิดพลาดในการโหลดข้อมูลทีมงาน: ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
  }
}

function renderStaffTable(staffList) {
  if (!staffList || staffList.length === 0) {
    el.staffTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-8 text-muted">
          🔍 ไม่พบทีมงานที่ตรงกับเงื่อนไขการค้นหา
        </td>
      </tr>
    `;
    return;
  }

  el.staffTableBody.innerHTML = staffList.map(s => {
    // Role Badge & Category Class
    let catClass = 'badge-role-coaching';
    let catIcon = '👔';
    if (s.roleCategory === 'recruitment') {
      catClass = 'badge-role-recruitment';
      catIcon = '🔍';
    } else if (s.roleCategory === 'medical') {
      catClass = 'badge-role-medical';
      catIcon = '🩺';
    }

    // Club or Free Agent
    const clubHtml = s.isFreeAgent
      ? `<span class="badge-free">🆓 ว่างงาน</span>`
      : `<span class="text-club font-medium">${escapeHtml(s.club)}</span>`;

    // Skills & Stars column - tailored to role/category
    let skillHtml = '';
    const isScout = s.roleId === 'scout' || s.roleCategory === 'recruitment' || stateStaff.preset === 'diamond_scout' || stateStaff.role === 'scout';
    const isMedical = s.roleCategory === 'medical' || s.roleId === 'physio' || s.roleId === 'sports_scientist' || stateStaff.preset === 'god_physio' || stateStaff.role === 'physio';
    const isHoyd = s.roleId === 'hoyd' || stateStaff.preset === 'hoyd' || stateStaff.role === 'hoyd';

    if (isScout) {
      skillHtml = `
        <div class="staff-mini-skills">
          <span class="skill-pill highlight" title="Judging Player Ability (ประเมินความสามารถ)">JPA: <strong>${s.keySkills?.jpa || 0}</strong></span>
          <span class="skill-pill highlight" title="Judging Player Potential (ประเมินศักยภาพ)">JPP: <strong>${s.keySkills?.jpp || 0}</strong></span>
        </div>
      `;
    } else if (isMedical) {
      skillHtml = `
        <div class="staff-mini-skills">
          <span class="skill-pill highlight" title="Physiotherapy (กายภาพบำบัด)">กายภาพ: <strong>${s.keySkills?.physiotherapy || 0}</strong></span>
          <span class="skill-pill highlight" title="Sports Science (วิทยาศาสตร์การกีฬา)">วิทย์กีฬา: <strong>${s.keySkills?.sportsScience || 0}</strong></span>
        </div>
      `;
    } else if (isHoyd) {
      skillHtml = `
        <div class="staff-mini-skills">
          <span class="skill-pill highlight" title="Working with Youngsters (พัฒนาเยาวชน)">เยาวชน: <strong>${s.keySkills?.youngsters || 0}</strong></span>
          <span class="skill-pill" title="JPP (ประเมินศักยภาพ)">JPP: <strong>${s.keySkills?.jpp || 0}</strong></span>
        </div>
      `;
    } else if (s.roleCategory === 'coaching' || s.coachStars >= 2.5) {
      skillHtml = `
        <div class="staff-stars" title="คะแนนฝึกสอนคำนวณตามสูตร FM: ${s.coachStarsFormatted} ดาว">
          <span class="stars-gold">${'⭐'.repeat(Math.round(s.coachStars))}</span>
          <span class="stars-val">${s.coachStarsFormatted}</span>
        </div>
      `;
    } else {
      skillHtml = `
        <div class="staff-stars">
          <span class="stars-gold">⭐</span>
          <span class="stars-val">${s.coachStarsFormatted}</span>
        </div>
      `;
    }

    // Wage
    const wageStr = s.wage > 0 ? `£${s.wage.toLocaleString()}/w` : '-';

    return `
      <tr class="clickable-row staff-row" data-id="${s.id}">
        <td class="col-name sticky-col">
          <div class="player-name-cell">
            <span class="player-name font-semibold text-white">${escapeHtml(s.name)}</span>
            <span class="nat-badge text-muted text-xs">${(s.nat || []).join(', ')}</span>
          </div>
        </td>
        <td>
          <span class="badge-role ${catClass}" title="${escapeHtml(s.roleEn)}">
            <span>${catIcon}</span>
            <span>${escapeHtml(s.roleTh)}</span>
          </span>
        </td>
        <td>${clubHtml}</td>
        <td class="text-center font-medium">${s.age || '-'}</td>
        <td class="text-center font-bold ${s.ca >= 150 ? 'text-accent' : ''}">${s.ca || '-'}</td>
        <td class="text-center font-bold ${s.pa >= 160 ? 'text-green' : ''}">${s.pa || '-'}</td>
        <td class="text-center">${skillHtml}</td>
        <td class="text-right text-sm text-muted font-mono">${wageStr}</td>
        <td>
          <div class="rep-cell" title="ชื่อเสียง: ${escapeHtml(s.repLabel)}">
            <span class="stars-gold text-xs">${s.repStars}</span>
            <span class="text-xs text-muted" style="margin-left: 4px;">${escapeHtml((s.repLabel || '').split(' ')[0])}</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach row click listeners
  el.staffTableBody.querySelectorAll('.staff-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      if (id) openStaffModal(id);
    });
  });
}

async function openStaffModal(id) {
  if (!el.staffModal) return;

  el.staffModalName.textContent = 'กำลังโหลดข้อมูล...';
  el.staffModalAttrsContainer.innerHTML = '<div class="text-muted py-8 text-center" style="grid-column: 1/-1;">กำลังโหลดค่าพลังทีมงาน...</div>';
  el.staffModalPersonalityGrid.innerHTML = '';
  el.staffModal.style.display = 'flex';

  try {
    const res = await fetch(`/api/staff/${id}`);
    if (!res.ok) throw new Error('ไม่พบข้อมูลทีมงาน');
    const data = await res.json();
    const s = data.staff || data;

    el.staffModalName.textContent = s.name;
    currentStaffName = s.name;
    if (el.btnCopyStaffName) {
      el.btnCopyStaffName.classList.remove('copied');
      el.btnCopyStaffName.innerHTML = `<span class="copy-icon">📋</span> <span class="copy-label">คัดลอกชื่อ</span>`;
    }
    el.staffModalNat.textContent = (s.nat || []).join(', ') || '-';
    el.staffModalAge.textContent = s.age ? `${s.age} ปี` : '-';
    if (el.staffModalCA) el.staffModalCA.textContent = s.ca || '-';
    if (el.staffModalPA) el.staffModalPA.textContent = s.pa || '-';

    // Role badge
    let catClass = 'badge-role-coaching';
    let catIcon = '👔';
    if (s.roleCategory === 'recruitment') {
      catClass = 'badge-role-recruitment';
      catIcon = '🔍';
    } else if (s.roleCategory === 'medical') {
      catClass = 'badge-role-medical';
      catIcon = '🩺';
    }
    el.staffModalRole.className = `badge ${catClass}`;
    el.staffModalRole.textContent = `${catIcon} ${s.roleTh} (${s.roleEn})`;

    // Club or Free agent
    if (s.isFreeAgent) {
      el.staffModalClub.innerHTML = '<span class="badge-free">🆓 ว่างงาน (Free Agent)</span>';
    } else {
      el.staffModalClub.textContent = s.club || 'ไม่ระบุสโมสร';
    }

    // Dynamic Role-tailored Top Stats in Modal Header
    if (el.staffModalHeaderStats) {
      const isMed = s.roleCategory === 'medical' || s.roleId === 'physio' || s.roleId === 'sports_scientist';
      const isScout = s.roleCategory === 'recruitment' || s.roleId === 'scout';
      const isHoyd = s.roleId === 'hoyd';

      let statsHtml = '';
      if (isMed) {
        statsHtml = `
          <div class="ability-block" title="ทักษะกายภาพบำบัด">
            <div class="ability-label">กายภาพ (Physio)</div>
            <div class="ability-number text-green">${s.keySkills?.physiotherapy || 0}</div>
          </div>
          <div class="ability-block" title="ทักษะวิทยาศาสตร์การกีฬา">
            <div class="ability-label">วิทย์กีฬา (Sports Sci)</div>
            <div class="ability-number text-green">${s.keySkills?.sportsScience || 0}</div>
          </div>
          <div class="ability-block" title="Current Ability">
            <div class="ability-label">CA</div>
            <div class="ability-number text-accent">${s.ca || '-'}</div>
          </div>
          <div class="ability-block" title="Potential Ability">
            <div class="ability-label">PA</div>
            <div class="ability-number text-green">${s.pa || '-'}</div>
          </div>
        `;
      } else if (isScout) {
        statsHtml = `
          <div class="ability-block" title="Judging Player Ability (ประเมินความสามารถ)">
            <div class="ability-label">JPA (ประเมินพลัง)</div>
            <div class="ability-number text-green">${s.keySkills?.jpa || 0}</div>
          </div>
          <div class="ability-block" title="Judging Player Potential (ประเมินศักยภาพ)">
            <div class="ability-label">JPP (ประเมินศักยภาพ)</div>
            <div class="ability-number text-green">${s.keySkills?.jpp || 0}</div>
          </div>
          <div class="ability-block" title="Current Ability">
            <div class="ability-label">CA</div>
            <div class="ability-number text-accent">${s.ca || '-'}</div>
          </div>
          <div class="ability-block" title="Potential Ability">
            <div class="ability-label">PA</div>
            <div class="ability-number text-green">${s.pa || '-'}</div>
          </div>
        `;
      } else if (isHoyd) {
        statsHtml = `
          <div class="ability-block" title="Working with Youngsters (พัฒนาเยาวชน)">
            <div class="ability-label">ปั้นเยาวชน</div>
            <div class="ability-number text-green">${s.keySkills?.youngsters || 0}</div>
          </div>
          <div class="ability-block" title="Judging Player Potential (ประเมินศักยภาพ)">
            <div class="ability-label">JPP</div>
            <div class="ability-number text-green">${s.keySkills?.jpp || 0}</div>
          </div>
          <div class="ability-block" title="Current Ability">
            <div class="ability-label">CA</div>
            <div class="ability-number text-accent">${s.ca || '-'}</div>
          </div>
          <div class="ability-block" title="Potential Ability">
            <div class="ability-label">PA</div>
            <div class="ability-number text-green">${s.pa || '-'}</div>
          </div>
        `;
      } else {
        statsHtml = `
          <div class="ability-block" title="คะแนนฝึกสอนคำนวณตามสูตร FM">
            <div class="ability-label">ดาวโค้ช</div>
            <div class="ability-number text-orange">⭐ ${s.coachStarsFormatted}</div>
          </div>
          <div class="ability-block" title="Current Ability">
            <div class="ability-label">CA</div>
            <div class="ability-number text-accent">${s.ca || '-'}</div>
          </div>
          <div class="ability-block" title="Potential Ability">
            <div class="ability-label">PA</div>
            <div class="ability-number text-green">${s.pa || '-'}</div>
          </div>
        `;
      }
      el.staffModalHeaderStats.innerHTML = statsHtml;
    }

    // 4 Attribute Grids
    const ag = s.attrGroups || {};
    let attrsHtml = '';
    attrsHtml += renderAttrColumn('ทักษะการฝึกสอน (Coaching)', '⚽', ag.coaching);
    attrsHtml += renderAttrColumn('ทักษะจิตวิทยา & คุมทีม (Mental)', '🧠', ag.mental);
    attrsHtml += renderAttrColumn('ทักษะส่อง & วิเคราะห์ (Scouting)', '🔍', ag.scouting);
    attrsHtml += renderAttrColumn('ทักษะการแพทย์ & วิทย์กีฬา (Medical)', '🩺', ag.medical);
    el.staffModalAttrsContainer.innerHTML = attrsHtml;

    // Personality
    if (s.personality) {
      el.staffModalPersonalityGrid.innerHTML = renderPersonalityGrid(s.personality);
    } else {
      el.staffModalPersonalityGrid.innerHTML = '<span class="text-muted text-sm">ไม่มีข้อมูลลักษณะนิสัยแฝง</span>';
    }
  } catch (err) {
    console.error('Failed to load staff detail:', err);
    el.staffModalName.textContent = 'เกิดข้อผิดพลาด';
    el.staffModalAttrsContainer.innerHTML = `<div class="text-red py-8 text-center" style="grid-column: 1/-1;">${escapeHtml(err.message)}</div>`;
  }
}

function renderAttrColumn(title, icon, attrs) {
  if (!attrs || attrs.length === 0) return '';
  return `
    <div class="attr-column">
      <div class="attr-column-title">
        <span>${icon}</span>
        <span>${title}</span>
      </div>
      <div class="attr-list">
        ${attrs.map(a => {
          const val = a.val || 0;
          let valClass = 'attr-val-low';
          if (val >= 16) valClass = 'attr-val-top';
          else if (val >= 11) valClass = 'attr-val-good';
          else if (val >= 6) valClass = 'attr-val-avg';
          return `
            <div class="attr-row">
              <span class="attr-name">${escapeHtml(a.nameTh || a.name || '')}</span>
              <span class="attr-val ${valClass}">${val > 0 ? val : '-'}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderPersonalityGrid(pers) {
  if (!pers || typeof pers !== 'object') return '';
  const keys = Object.keys(pers);
  return keys.map(k => {
    const val = pers[k] || 0;
    const label = PERSONALITY_MAP[k] || k;
    let colorClass = 'text-muted';
    if (val >= 15) colorClass = 'text-green font-bold';
    else if (val >= 10) colorClass = 'text-accent font-semibold';
    return `
      <div class="personality-item">
        <span class="personality-name">${escapeHtml(label)}</span>
        <span class="personality-val ${colorClass}">${val > 0 ? val : '-'}</span>
      </div>
    `;
  }).join('');
}
