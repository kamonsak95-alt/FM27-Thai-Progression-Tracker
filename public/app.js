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
  sort: 'ca',
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

const PLAYER_ATTRIBUTE_THAI = {
  Corners: 'การเปิดลูกเตะมุม', Crossing: 'การเปิดบอลจากริมเส้น', Dribbling: 'การเลี้ยงบอล',
  Finishing: 'การจบสกอร์', FirstTouch: 'การจับบอลจังหวะแรก', FreeKicks: 'การยิงฟรีคิก',
  Heading: 'การโหม่ง', LongShots: 'การยิงไกล', LongThrows: 'การทุ่มไกล',
  Marking: 'การประกบตัว', Passing: 'การจ่ายบอล', PenaltyTaking: 'การยิงจุดโทษ',
  Tackling: 'การเข้าปะทะแย่งบอล', Technique: 'เทคนิคการเล่นบอล',
  Aggression: 'ความดุดัน', Anticipation: 'การอ่านจังหวะล่วงหน้า', Bravery: 'ความกล้าเข้าบอล',
  Composure: 'ความนิ่งในจังหวะกดดัน', Concentration: 'สมาธิในเกม', Decisions: 'การตัดสินใจ',
  Determination: 'ความมุ่งมั่น', Flair: 'ความคิดสร้างสรรค์ในการเล่น', Leadership: 'ภาวะผู้นำ',
  OffTheBall: 'การเคลื่อนที่ตอนไม่มีบอล', Positioning: 'การยืนตำแหน่งเกมรับ',
  Teamwork: 'การเล่นเป็นทีม', Vision: 'วิสัยทัศน์ในการจ่ายบอล', WorkRate: 'ความขยันในสนาม',
  Acceleration: 'อัตราเร่ง', Agility: 'ความคล่องตัว', Balance: 'การทรงตัว',
  JumpingReach: 'ระยะเอื้อมเมื่อกระโดด', NaturalFitness: 'ความฟิตตามธรรมชาติ',
  Pace: 'ความเร็วในการวิ่ง', Stamina: 'ความอึด', Strength: 'ความแข็งแกร่ง',
  AerialReach: 'ระยะเอื้อมรับบอลกลางอากาศ', CommandOfArea: 'การคุมเขตโทษ',
  Communication: 'การสื่อสารกับแนวรับ', Eccentricity: 'ความชอบเล่นนอกแบบของผู้รักษาประตู',
  Handling: 'การรับบอลให้อยู่มือ', Kicking: 'การเตะเปิดบอล', OneOnOnes: 'การเซฟจังหวะตัวต่อตัว',
  Punching: 'ความถี่ในการชกบอล', Reflexes: 'ปฏิกิริยาการเซฟ',
  RushingOut: 'ความถี่ในการออกมาตัดบอล', Throwing: 'การขว้างบอลเปิดเกม'
};

const SET_PIECE_ATTRIBUTES = ['Corners', 'FreeKicks', 'LongThrows', 'PenaltyTaking'];
const PROFILE_ATTRIBUTE_LABELS = {
  FreeKicks: 'Free Kick Taking', OffTheBall: 'Off The Ball',
  FirstTouch: 'First Touch', LongShots: 'Long Shots', LongThrows: 'Long Throws',
  PenaltyTaking: 'Penalty Taking', WorkRate: 'Work Rate',
  AerialReach: 'Aerial Reach', CommandOfArea: 'Command Of Area', OneOnOnes: 'One On Ones',
  Punching: 'Punching (Tendency)', RushingOut: 'Rushing Out (Tendency)',
  JumpingReach: 'Jumping Reach', NaturalFitness: 'Natural Fitness'
};

function getProfileAttributeColumns(isGoalkeeper) {
  const { Technical, Mental, Physical, Goalkeeping } = ATTR_GROUPS;
  if (isGoalkeeper) {
    return [
      [['การรักษาประตู', [
        ...Goalkeeping.slice(0, 4), 'FirstTouch', ...Goalkeeping.slice(4, 7),
        'Passing', ...Goalkeeping.slice(7)
      ]]],
      [['จิตใจ', Mental]],
      [['ความฟิต', Physical], ['เทคนิค', ['FreeKicks', 'PenaltyTaking', 'Technique']]]
    ];
  }
  return [
    [['เทคนิค', Technical.filter(key => !SET_PIECE_ATTRIBUTES.includes(key))],
      ['ลูกตั้งเตะ', SET_PIECE_ATTRIBUTES]],
    [['จิตใจ', Mental]],
    [['ความฟิต', Physical], ['การรักษาประตู', Goalkeeping, true]]
  ];
}

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

const PLAYER_HIDDEN_ATTRIBUTES = {
  Consistency: 'ความสม่ำเสมอ (Consistency)',
  ImportantMatches: 'การเล่นในเกมสำคัญ (Important Matches)',
  InjuryProneness: 'ความเสี่ยงบาดเจ็บ (Injury Proneness)',
  Versatility: 'การปรับเล่นหลายตำแหน่ง (Versatility)',
  Dirtiness: 'การเล่นตุกติก (Dirtiness)'
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
  btnDownloadUpdate: document.getElementById('btn-download-update'),
  btnBannerReload: document.getElementById('btn-banner-reload'),
  btnDismissUpdate: document.getElementById('btn-dismiss-update'),
  btnCheckUpdate: document.getElementById('btn-check-update'),
  btnViewChangelog: document.getElementById('btn-view-changelog'),
  changelogModal: document.getElementById('changelog-modal'),
  changelogClose: document.getElementById('changelog-modal-close'),
  btnChangelogClose: document.getElementById('btn-changelog-close'),
  btnChangelogApply: document.getElementById('btn-changelog-apply'),
  btnChangelogDownload: document.getElementById('btn-changelog-download'),
  btnChangelogReload: document.getElementById('btn-changelog-reload'),
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
const shortlist = createShortlist({
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value)
});
const serverShortlists = new Map();
const pendingShortlistChanges = new Set();

async function requestShortlist(ref, change, signal) {
  const response = await fetch('/api/shortlist?ref=' + encodeURIComponent(ref), {
    signal,
    ...(change && {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FM27-Shortlist': '1' },
      body: JSON.stringify(change)
    })
  });
  if (!response.ok) throw new Error('Shortlist HTTP ' + response.status);
  return response.json();
}

function readShortlist(ref) {
  try {
    return serverShortlists.get(ref) ?? shortlist.read(ref);
  } catch {
    return [];
  }
}

function setShortlistStar(button, saved) {
  const label = saved ? 'นำออกจาก Shortlist' : 'เพิ่มใน Shortlist';
  button.textContent = saved ? '★' : '☆';
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', label);
  button.title = label;
}

async function toggleShortlistStar(event, button) {
  event.stopPropagation();
  const { ref, playerId } = button.dataset;
  if (!ref || ref !== state.refCode || el.btnScan.disabled) {
    showToast('รอให้ Tracker โหลดข้อมูลเซฟปัจจุบันก่อน', true);
    return;
  }
  const key = ref;
  if (pendingShortlistChanges.has(key)) return;
  pendingShortlistChanges.add(key);
  try {
    const legacy = shortlist.read(ref);
    if (!serverShortlists.has(ref) && legacy.length) {
      await requestShortlist(ref, { action: 'seed', ids: legacy });
    }
    const result = await requestShortlist(ref, { action: 'toggle', id: Number(playerId) });
    serverShortlists.set(ref, result.ids);
    const saved = result.ids.includes(Number(playerId));
    document.querySelectorAll('.shortlist-star[data-player-id]').forEach(star => {
      if (star.dataset.ref === ref && star.dataset.playerId === playerId) setShortlistStar(star, saved);
    });
    if (state.preset === 'shortlist') loadPlayers();
  } catch {
    showToast('บันทึก Shortlist ไม่สำเร็จ', true);
  } finally {
    pendingShortlistChanges.delete(key);
  }
}
let playerListRequest;
let staffListRequest;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pos-btn, .compact-pos-pill, .pitch-btn, .pitch-preset-btn').forEach(button => {
    const group = getPositionGroup(button.dataset.pos || button.dataset.presetPos);
    if (group) button.dataset.positionGroup = group;
  });
  initEventListeners();
  loadStatus().then(loadPlayers);
  checkForUpdates(true); // check quietly in background
  setInterval(() => {
    if (latestUpdateData?.isGit === true) checkForUpdates(true);
  }, 60000);
  setInterval(() => {
    if (latestUpdateData?.isGit !== true) checkForUpdates(true);
  }, 10 * 60 * 1000);
});

function getPositionGroup(position = '') {
  const code = position.trim().toUpperCase();
  if (code === 'GK') return 'gk';
  if (['DEF', 'DC', 'DL', 'DR', 'WB', 'WBL', 'WBR', 'SW'].includes(code)) return 'def';
  if (['MID', 'DM', 'MC', 'ML', 'MR', 'AM', 'AMC', 'AML', 'AMR'].includes(code)) return 'mid';
  if (['ATT', 'ST', 'FC'].includes(code)) return 'att';
  return '';
}

function renderPositionBadges(positions, naturalPositions = []) {
  return (positions || '').split(',').map(position => position.trim()).filter(Boolean)
    .map(position => {
      const natural = naturalPositions.includes(position);
      const marker = natural ? ' <span role="img" aria-label="ตำแหน่งถนัดโดยธรรมชาติ">◆</span>' : '';
      return `<span class="badge badge-pos" data-position-group="${getPositionGroup(position)}"${natural ? ' data-natural-position title="ตำแหน่งถนัดโดยธรรมชาติ"' : ''}>${escapeHtml(position)}${marker}</span>`;
    })
    .join('') || '–';
}

function renderProfilePitch(positions, naturalPositions = []) {
  const available = new Set([...(positions || '').split(',').map(code => code.trim()).filter(Boolean), ...naturalPositions]);
  const rows = [
    [['ST', 'กองหน้า']],
    [['AML', 'ตัวรุกฝั่งซ้าย'], ['AMC', 'กองกลางตัวรุก'], ['AMR', 'ตัวรุกฝั่งขวา']],
    [['ML', 'กองกลางฝั่งซ้าย'], ['MC', 'กองกลางตัวกลาง'], ['MR', 'กองกลางฝั่งขวา']],
    [['WBL', 'วิงแบ็กซ้าย'], ['DM', 'กองกลางตัวรับ'], ['WBR', 'วิงแบ็กขวา']],
    [['DL', 'แบ็กซ้าย'], ['DC', 'เซ็นเตอร์แบ็ก'], ['DR', 'แบ็กขวา']],
    [['GK', 'ผู้รักษาประตู']]
  ];
  const dots = rows.map((row, index) => row.map(([code, label], column) => {
    const level = available.has(code) ? 'available' : 'none';
    const status = level === 'available' ? 'ตำแหน่งที่เล่นได้' : 'ไม่พบข้อมูลตำแหน่งนี้';
    return `<span class="profile-position" data-position="${code}" data-level="${level}" style="left:${row.length === 1 ? 50 : 18 + column * 32}%;top:${12 + index * 15}%" title="${label} · ${status}"><i aria-hidden="true"></i>${code}</span>`;
  }).join('')).join('');
  const description = rows.flat().filter(([code]) => available.has(code))
    .map(([, label]) => label).join(' · ') || 'ไม่มีข้อมูลตำแหน่ง';
  return `<div class="profile-position-pitch" role="img" aria-label="${description}">
    <svg viewBox="0 0 160 210" aria-hidden="true"><rect x="7" y="7" width="146" height="196" rx="2"/><path d="M7 105h146M45 7v31h70V7M45 203v-31h70v31M64 7v13h32V7M64 203v-13h32v13"/><circle cx="80" cy="105" r="22"/></svg>
    ${dots}</div>`;
}

const nationalityInput = document.getElementById('filter-nationality');
const nationalityOptions = document.getElementById('nationality-options');
const clearNationality = document.getElementById('clear-nationality');
const footFilter = document.getElementById('filter-foot');
const footLabels = new Map(Array.from(footFilter.options, option => [option.value, option.textContent]));
let selectedNationality = '';
let attributeFilters = new Map();
const transferFilters = new Map([
  ['maxValue', document.getElementById('filter-max-value')],
  ['maxWage', document.getElementById('filter-max-wage')],
  ['transferStatus', document.getElementById('filter-transfer-status')],
  ['contractMonths', document.getElementById('filter-contract-months')]
]);
const transferLabels = new Map(Array.from(transferFilters.get('transferStatus').options, option => [option.value, option.textContent]));

function getTransferFilterValue(field) {
  return field.validity.valid ? field.value : '';
}

function initSkillChecklist({ dialogId, prefix, groupsByName, getFilters, onApply }) {
  const dialog = document.getElementById(dialogId);
  const form = document.getElementById(prefix + "-form");
  const search = document.getElementById(prefix + "-search");
  const groups = document.getElementById(prefix + "-rows");
  const empty = document.getElementById(prefix + "-empty");
  const entries = [];

  for (const [group, keys] of Object.entries(groupsByName)) {
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = group;
    section.append(heading);
    const items = keys.map(([key, name]) => {
      const row = document.createElement('div');
      row.className = 'attribute-filter-row';
      const minimum = document.createElement('input');
      Object.assign(minimum, { type: 'number', className: 'form-input', min: '1', max: '20', step: '1', required: true });
      minimum.setAttribute('aria-label', `ค่าขั้นต่ำ ${name}`);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.addEventListener('change', () => { minimum.disabled = !checkbox.checked; });
      const label = document.createElement('label');
      label.append(checkbox, name);
      row.append(label, minimum);
      section.append(row);
      return { key, name: name.toLowerCase(), row, checkbox, minimum };
    });
    entries.push({ section, items });
    groups.append(section);
  }

  function filterList() {
    const query = search.value.trim().toLowerCase();
    for (const { section, items } of entries) {
      for (const { row, name } of items) row.hidden = !name.includes(query);
      section.hidden = items.every(({ row }) => row.hidden);
    }
    empty.hidden = entries.some(({ section }) => !section.hidden);
  }

  function restore(filters) {
    for (const { items } of entries) {
      for (const { key, checkbox, minimum } of items) {
        checkbox.checked = filters.has(key);
        minimum.disabled = !checkbox.checked;
        minimum.value = filters.get(key) ?? 15;
      }
    }
    search.value = '';
    filterList();
    groups.scrollTop = 0;
  }


  document.getElementById('cancel-' + dialogId).addEventListener('click', () => dialog.close());
  document.getElementById('clear-' + dialogId).addEventListener('click', () => {
    restore(new Map());
    search.focus();
  });
  search.addEventListener('input', filterList);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const selected = entries.flatMap(({ items }) => items.filter(({ checkbox }) => checkbox.checked));
    const invalid = selected.find(({ minimum }) => !minimum.validity.valid);
    if (invalid) {
      search.value = '';
      filterList();
      invalid.minimum.reportValidity();
      return;
    }
    dialog.close();
    onApply(new Map(selected.map(({ key, minimum }) => [key, minimum.valueAsNumber])));
  });
  return () => {
    restore(getFilters());
    dialog.showModal();
    search.focus();
  };
}

const staffWage = document.getElementById('staff-max-wage');
const staffTraining = document.getElementById('staff-training');
const staffTrainingStars = document.getElementById('staff-training-stars');
const staffGroupLabels = { coaching: 'การฝึกสอน (Coaching)', mental: 'จิตวิทยา (Mental)', scouting: 'การสรรหา (Scouting)', medical: 'การแพทย์และวิทยาศาสตร์กีฬา (Medical)' };
let staffSkills = new Map();
let staffOptions;
let showStaffSkills;

async function loadStaffOptions() {
  if (staffOptions) return;
  const response = await fetch('/api/staff/filter-options');
  if (!response.ok) throw new Error('โหลดรายการทักษะไม่สำเร็จ');
  const data = await response.json();
  if (staffOptions) return;
  staffOptions = data;
  for (const [key, label] of Object.entries(data.training)) staffTraining.add(new Option(label, key));
  showStaffSkills = initSkillChecklist({
    dialogId: 'staff-skills', prefix: 'staff-skill',
    groupsByName: Object.fromEntries(Object.entries(data.skills).map(([group, keys]) => [staffGroupLabels[group], keys])),
    getFilters: () => staffSkills,
    onApply: filters => { staffSkills = filters; refreshStaffFilters(); }
  });
}

function refreshStaffFilters() {
  stateStaff.page = 1;
  loadStaff();
}

function getStaffExtraFilters() {
  const params = new URLSearchParams();
  const labels = [];
  const wage = staffWage.valueAsNumber;
  if (staffWage.validity.valid && Number.isSafeInteger(wage)) {
    params.set('maxWage', wage);
    labels.push(`ค่าเหนื่อย ≤ £${wage.toLocaleString()}/สัปดาห์`);
  }
  if (staffTrainingStars.value) {
    params.set('training', staffTraining.value);
    params.set('minTrainingStars', staffTrainingStars.value);
    labels.push(`${staffTraining.selectedOptions[0].textContent} ≥ ${staffTrainingStars.value} ดาว`);
  }
  const skills = new Map(Object.values(staffOptions?.skills ?? {}).flat());
  for (const [key, minimum] of staffSkills) {
    params.append('skill', `${key}:${minimum}`);
    labels.push(`${skills.get(key)} ≥ ${minimum}`);
  }
  if (stateStaff.q.trim()) labels.unshift(`ค้นหา “${stateStaff.q.trim()}”`);
  if (stateStaff.preset !== 'all') {
    const preset = document.querySelector(`[data-staff-preset="${stateStaff.preset}"]`);
    if (preset) labels.push(preset.textContent.trim());
  }
  for (const id of ['filter-staff-role', 'filter-staff-status', 'filter-staff-rep']) {
    const select = document.getElementById(id);
    if (select.selectedIndex > 0) labels.push(select.selectedOptions[0].textContent.trim());
  }
  for (const [label, min, max, defaultMax] of [
    ['อายุ', stateStaff.minAge, stateStaff.maxAge, 80],
    ['CA', stateStaff.minCA, stateStaff.maxCA, 200],
    ['PA', stateStaff.minPA, stateStaff.maxPA, 200]
  ]) {
    if (min !== (label === 'อายุ' ? 15 : 1) || max !== defaultMax) labels.push(`${label} ${min}–${max}`);
  }
  const canReset = labels.length || stateStaff.sort !== 'ca' || stateStaff.order !== 'desc';
  document.getElementById('clear-staff-extras').disabled = !canReset;
  const summary = document.getElementById('staff-active-filters');
  document.getElementById('staff-filter-summary').hidden = !labels.length;
  summary.replaceChildren(...labels.map(label => {
    const chip = document.createElement('span');
    chip.textContent = label;
    return chip;
  }));
  return params;
}

function initEventListeners() {
  const showPlayerSkills = initSkillChecklist({
    dialogId: 'attribute-filters', prefix: 'attribute-filter',
    groupsByName: Object.fromEntries(Object.entries(ATTR_GROUPS).map(([group, keys]) =>
      [group, keys.map(key => [key, `${PLAYER_ATTRIBUTE_THAI[key]} (${key})`])])),
    getFilters: () => attributeFilters,
    onApply: filters => { attributeFilters = filters; state.page = 1; loadPlayers(); }
  });
  document.getElementById('open-attribute-filters').addEventListener('click', showPlayerSkills);
  document.getElementById('open-staff-skills').addEventListener('click', async () => {
    try { await loadStaffOptions(); showStaffSkills(); }
    catch { showToast('โหลดรายการทักษะทีมงานไม่สำเร็จ', true); }
  });
  for (const field of [staffTraining, staffTrainingStars, staffWage]) {
    field.addEventListener('change', () => {
      if (!field.reportValidity()) return;
      refreshStaffFilters();
    });
  }
  document.getElementById('clear-staff-extras').addEventListener('click', () => {
    clearTimeout(debounceStaffTimer);
    stateStaff.q = '';
    el.filterStaffSearch.value = '';
    el.btnClearStaffSearch.style.display = 'none';
    staffWage.value = '';
    staffTraining.value = '';
    staffTrainingStars.value = '';
    staffSkills.clear();
    document.querySelectorAll('.staff-preset-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.staffPreset === 'all');
    });
    applyStaffPreset('all');
    el.filterStaffSearch.focus();
    refreshStaffFilters();
  });
  for (const field of transferFilters.values()) {
    field.addEventListener('change', () => {
      if (!field.reportValidity()) return;
      state.page = 1;
      loadPlayers();
    });
  }
  footFilter.addEventListener('change', () => {
    state.page = 1;
    loadPlayers();
  });
  document.getElementById('clear-player-filters').addEventListener('click', () => resetPlayerFilters());
  document.getElementById('tab-btn-squad').addEventListener('click', () => switchTab('squad'));
  squadBoard.addEventListener('click', event => {
    const profile = event.target.closest('[data-squad-player]');
    if (profile) {
      if (!el.btnScan.disabled) openPlayerModal(Number(profile.dataset.squadPlayer), undefined, squadBoard.dataset.scanId);
      return;
    }
    const button = event.target.closest('[data-squad-scout]');
    if (!button) return;
    switchTab('players');
    resetPlayerFilters(button.dataset.squadScout);
  });
  function resetPlayerFilters(scoutPositions = '') {
    clearTimeout(debounceTimer);
    Object.assign(state, { q: '', pos: 'ALL', natOnly: false, baseline: '', sort: 'ca', order: 'desc', page: 1 });
    state.excludeMyClub = Boolean(scoutPositions);
    state.pos = scoutPositions || 'ALL';
    state.selectedPitchPositions = new Set(scoutPositions ? scoutPositions.split(',') : []);
    attributeFilters.clear();
    footFilter.value = '';
    for (const field of transferFilters.values()) field.value = '';
    selectedNationality = '';
    nationalityInput.value = '';
    clearNationality.disabled = true;
    el.filterSearch.value = '';
    el.btnClearSearch.style.display = 'none';
    if (el.checkNatOnly) el.checkNatOnly.checked = false;
    if (el.selectBaseline) el.selectBaseline.value = '';
    updateComparisonSummary();
    document.querySelectorAll('[data-preset]').forEach(button => {
      button.classList.toggle('active', button.dataset.preset === 'all');
    });
    applyPreset('all');
    updatePitchUI();
    el.filterSearch.focus();
    loadPlayers();
  }
  const careerDetails = document.getElementById('btn-career-details');
  careerDetails.addEventListener('click', () => {
    const expanded = careerDetails.getAttribute('aria-expanded') === 'true';
    careerDetails.setAttribute('aria-expanded', String(!expanded));
  });
  nationalityInput.addEventListener('input', () => {
    const value = nationalityInput.value.trim().toLowerCase();
    const match = Array.from(nationalityOptions.options)
      .find(option => option.value.toLowerCase() === value);
    if (value && !match) return;
    const next = match?.value || '';
    if (next === selectedNationality) return;
    selectedNationality = next;
    clearNationality.disabled = !next;
    state.page = 1;
    loadPlayers();
  });
  nationalityInput.addEventListener('blur', () => {
    nationalityInput.value = selectedNationality;
  });
  clearNationality.addEventListener('click', () => {
    nationalityInput.value = '';
    nationalityInput.dispatchEvent(new Event('input'));
    nationalityInput.focus();
  });
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
  const playerPresetButtons = document.querySelectorAll('[data-preset]');
  playerPresetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      playerPresetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyPreset(btn.dataset.preset);
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
      state.page = 1;
      loadPlayers();
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
  document.querySelectorAll('#players-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const sortKey = th.dataset.sort;
      if (state.sort === sortKey) {
        state.order = state.order === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort = sortKey;
        state.order = (sortKey === 'name' || sortKey === 'club') ? 'asc' : 'desc';
      }

      updatePlayerSortHeaders();

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
  el.modalClose.addEventListener('click', closePlayerModal);

  el.modal.addEventListener('click', (e) => {
    if (e.target === el.modal) {
      closePlayerModal();
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
    if (document.querySelector('dialog[open]')) return;
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
        closePlayerModal();
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

      updateStaffSortHeaders();

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

function updatePlayerSortHeaders() {
  document.querySelectorAll('#players-table th[data-sort]').forEach(th => {
    const active = th.dataset.sort === state.sort;
    th.classList.remove('active-sort', 'asc', 'desc');
    if (active) {
      th.classList.add('active-sort', state.order);
      th.setAttribute('aria-sort', state.order === 'asc' ? 'ascending' : 'descending');
    } else {
      th.removeAttribute('aria-sort');
    }
  });
}

function updatePlayerFilterSummary() {
  const labels = [];
  if (state.q.trim()) labels.push(`ค้นหา “${state.q.trim()}”`);
  if (state.pos !== 'ALL') {
    const positions = state.pos.split(',').map(code =>
      document.querySelector(`.pitch-btn[data-pos="${code}"] .pitch-btn-label`)?.textContent.trim() || code);
    labels.push(`ตำแหน่ง ${positions.join(', ')}`);
    if (state.natOnly) labels.push('ตำแหน่งถนัดเท่านั้น');
  }
  if (footFilter.value) labels.push('เท้าถนัด '+footLabels.get(footFilter.value));
  for (const [key, minimum] of attributeFilters) labels.push(key+' ≥ '+minimum);
  for (const [key, field] of transferFilters) {
    const value = getTransferFilterValue(field);
    if (!value) continue;
    if (key === 'maxValue') labels.push(`มูลค่า ≤ £${Number(value).toLocaleString()}`);
    if (key === 'maxWage') labels.push(`ค่าเหนื่อย ≤ £${Number(value).toLocaleString()}/สัปดาห์`);
    if (key === 'transferStatus') labels.push(transferLabels.get(value));
    if (key === 'contractMonths') labels.push(`สัญญาหมดภายใน ${value} เดือน`);
  }
  if (state.excludeMyClub) labels.push('นักเตะนอกทีม');
  if (selectedNationality) labels.push(`สัญชาติ ${selectedNationality}`);
  if (state.preset !== 'all') {
    const preset = document.querySelector(`[data-preset="${state.preset}"]`);
    if (preset) labels.push(preset.textContent.trim());
  }
  if (state.minAge !== 15 || state.maxAge !== (state.preset === 'wonderkids' ? 21 : 45)) {
    labels.push(`อายุ ${state.minAge}–${state.maxAge} ปี`);
  }
  if (state.minCA !== 1 || state.maxCA !== 200) labels.push(`CA ${state.minCA}–${state.maxCA}`);
  if (state.minPA !== (state.preset === 'wonderkids' ? 150 : 1) || state.maxPA !== 200) {
    labels.push(`PA ${state.minPA}–${state.maxPA}`);
  }
  const canReset = labels.length || state.natOnly || state.baseline || state.sort !== 'ca' || state.order !== 'desc';
  const summary = document.getElementById('player-filter-summary');
  summary.hidden = !labels.length;
  document.getElementById('clear-player-filters').disabled = !canReset;
  document.getElementById('player-filter-values').replaceChildren(...labels.map(label => {
    const chip = document.createElement('span');
    chip.textContent = label;
    return chip;
  }));
}

function applyPreset(preset) {
  const leavingWonderkids = state.preset === 'wonderkids' && preset !== 'wonderkids';
  if (preset === 'myclub') state.excludeMyClub = false;
  state.preset = preset;
  state.trend = '';
  if (preset === 'all' || leavingWonderkids) {
    state.minAge = 15; state.maxAge = 45;
    state.minPA = 1; state.maxPA = 200;
  }
  if (preset === 'all') {
    state.minCA = 1; state.maxCA = 200;
  } else if (preset === 'wonderkids') {
    state.minAge = 15; state.maxAge = 21;
    state.minPA = 150; state.maxPA = 200;
    state.sort = 'pa';
    state.order = 'desc';
  } else if (preset === 'explosive') {
    state.trend = 'explosive';
  } else if (preset === 'declining') {
    state.trend = 'declining';
  } else if (preset === 'growth') {
    state.sort = 'growthPercent';
    state.order = 'desc';
  }
  updatePlayerSortHeaders();
  for (const field of ['minAge', 'maxAge', 'minCA', 'maxCA', 'minPA', 'maxPA']) {
    el[field].value = state[field];
  }
  el.valAge.textContent = `${state.minAge} - ${state.maxAge}`;
  el.valCA.textContent = `${state.minCA} - ${state.maxCA}`;
  el.valPA.textContent = `${state.minPA} - ${state.maxPA}`;
}

const squadSection = document.getElementById('section-squad');
const squadBoard = document.getElementById('squad-board');
const squadStatus = document.getElementById('squad-status');
let squadRequest;

function switchTab(tab) {
  for (const [key, button, section] of [
    ['players', el.tabBtnPlayers, el.sectionPlayers],
    ['staff', el.tabBtnStaff, el.sectionStaff],
    ['squad', document.getElementById('tab-btn-squad'), squadSection]
  ]) {
    button.classList.toggle('active', key === tab);
    section.style.display = key === 'squad' ? '' : key === tab ? 'block' : 'none';
  }
  squadSection.hidden = tab !== 'squad';
  if (tab === 'staff') {
    loadStaffOptions().catch(() => showToast('โหลดรายการตัวกรองทีมงานไม่สำเร็จ', true));
    if (stateStaff.total === 0) loadStaff();
  }
  if (tab === 'squad') loadSquadAnalysis();
}

async function loadSquadAnalysis() {
  squadRequest?.abort();
  const request = new AbortController();
  squadRequest = request;
  squadBoard.replaceChildren();
  squadStatus.textContent = 'กำลังวิเคราะห์ทีม…';
  try {
    const response = await fetch('/api/squad-analysis', { signal: request.signal });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (request.signal.aborted) return;
    if (data.status !== 'ok') {
      squadStatus.textContent = {
        'no-club': 'ยังระบุสโมสรที่คุณคุมไม่ได้',
        'no-scan': 'กดโหลดข้อมูลเกมเพื่อเริ่มวิเคราะห์ทีม',
        empty: 'ยังไม่พบนักเตะของสโมสรนี้ในผลสแกน'
      }[data.status];
      return;
    }
    squadBoard.dataset.scanId = data.scanId ?? '';
    squadStatus.textContent = `${data.club} · ${data.hasSquadTypes ? 'ชุดใหญ่' : 'นักเตะทั้งหมดที่สแกนได้'} ${data.squadSize} คน · นับตามตำแหน่งหลัก`;
    const statuses = { empty: 'ขาดผู้เล่น', reinforce: 'ควรเสริม', strong: 'ตัวเลือกเพียงพอ' };
    const priorities = data.slots.filter(slot => slot.status !== 'strong');
    const priority = priorities.find(slot => slot.status === 'empty') ??
      priorities.filter(slot => slot.status === 'reinforce').sort((a, b) => (b.target - b.count) - (a.target - a.count) || b.gap - a.gap)[0] ??
      priorities[0];
    squadBoard.innerHTML = `<div class="squad-priority"><strong>${priority ? 'เริ่มดูที่ ' + priority.label : 'มีตัวเลือกเพียงพอทุกตำแหน่ง'}</strong>
      <span>${priority ? statuses[priority.status] : ''}</span></div>
      <div class="squad-positions">${data.slots.map(slot => `
        <article class="squad-position" data-status="${slot.status}">
          <header><h3>${slot.label} <small>${slot.id}</small></h3><span>${statuses[slot.status]}</span></header>
          <p class="text-muted">${slot.count} คน · เป้าหมาย ${slot.target}${slot.gap !== null ? ' · ตัวหลักกับสำรองห่าง ' + slot.gap + ' CA' : ''}</p>
          <ol>${slot.players.map((player, index) => `<li><span>${index === 0 ? 'CA สูงสุด' : 'ตัวเลือก ' + (index + 1)}</span>${renderSquadPlayerName(player)}<b>${Number.isFinite(player.ca) ? player.ca : '–'}</b></li>`).join('') || '<li>ไม่พบผู้เล่นตำแหน่งหลักนี้</li>'}</ol>
          <button type="button" class="btn btn-secondary btn-sm" data-squad-scout="${slot.positions.join(',')}">ค้นหาผู้เล่นนอกทีม</button>
        </article>`).join('')}</div>
      <details class="squad-method"><summary>เกณฑ์การวิเคราะห์</summary><p>ขึ้น “ควรเสริม” เมื่อจำนวนผู้เล่นตามตำแหน่งหลักต่ำกว่าเป้า หรือ CA ของสองอันดับแรกห่างกันตั้งแต่ 20 แต้ม เป้าหมายจำนวนผู้เล่นใช้เกณฑ์ทั่วไป</p></details>
      ${renderSquadProspects(data.prospects ?? [], data.hasSquadTypes)}`;
  } catch (error) {
    if (!request.signal.aborted) squadStatus.textContent = 'โหลดผลวิเคราะห์ทีมไม่สำเร็จ';
  }
}

function renderSquadPlayerName(player) {
  const name = escapeHtml(player.name);
  return Number.isSafeInteger(player.id) && player.id > 0
    ? `<button type="button" class="player-name player-name-button" data-squad-player="${player.id}">${name}</button>`
    : `<strong>${name}</strong>`;
}

function renderSquadProspects(prospects, hasSquadTypes) {
  const content = prospects.length ? `
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr><th scope="col">นักเตะ</th><th scope="col">อายุ</th><th scope="col">ตำแหน่งหลัก</th><th scope="col">CA</th><th scope="col">PA</th><th scope="col">เทียบกับชุดใหญ่</th></tr></thead>
        <tbody>${prospects.map(prospect => {
          const notes = [];
          if (prospect.nearBackup) notes.push(`${prospect.ca >= prospect.reserveCA ? 'CA ถึงระดับ' : 'CA ใกล้ระดับ'} ${escapeHtml(prospect.reserveName)} (CA ${prospect.reserveCA})`);
          if (prospect.starterPotential) notes.push(`PA ถึง CA ของ ${escapeHtml(prospect.starterName)} (CA ${prospect.starterCA})`);
          return `<tr><td>${renderSquadPlayerName(prospect)}</td><td>${prospect.age}</td>
            <td>${prospect.label}</td><td>${Number(prospect.ca) || '–'}</td><td>${Number(prospect.pa) || '–'}</td>
            <td>${notes.join(' · ')}</td></tr>`;
        }).join('')}</tbody>
      </table>
    </div>` : `<p>${hasSquadTypes ? 'ยังไม่พบดาวรุ่งที่เข้าเกณฑ์เทียบกับชุดใหญ่' : 'ยังแยกผู้เล่นชุดใหญ่จากข้อมูลสแกนรอบนี้ไม่ได้'}</p>`;
  return `<section class="squad-prospects" aria-labelledby="squad-prospects-title">
    <h3 id="squad-prospects-title">ดาวรุ่งที่มีพรสวรรค์</h3>
    <p class="text-muted">เฉพาะผู้เล่นนอกชุดใหญ่อายุไม่เกิน 21 ปี เทียบกับ CA อันดับ 1 และ 2 ของชุดใหญ่ในกลุ่มตำแหน่งเดียวกัน</p>
    ${content}
  </section>`;
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
  updateStaffSortHeaders();
}

function updateStaffSortHeaders() {
  document.querySelectorAll('th[data-staff-sort]').forEach(th => {
    const active = th.dataset.staffSort === stateStaff.sort;
    th.classList.toggle('active-sort', active);
    th.classList.toggle('asc', active && stateStaff.order === 'asc');
    th.classList.toggle('desc', active && stateStaff.order === 'desc');
    if (active) th.setAttribute('aria-sort', stateStaff.order === 'asc' ? 'ascending' : 'descending');
    else th.removeAttribute('aria-sort');
  });
}

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const buildLabel = document.getElementById('header-build');
    if (buildLabel && data.build?.version) {
      const { version, commit } = data.build;
      buildLabel.textContent = commit ? `v${version} · ${commit}` : `v${version}`;
      buildLabel.hidden = false;
    }
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
      el.infoDate.textContent = formatGameDate(state.gameDate) || 'ไม่ทราบวันที่';
      if (el.infoManager) el.infoManager.textContent = data.meta.manager || 'ไม่ระบุ';

      const dateBadgeEl = document.getElementById('date-badge');
      const isEstimated = data.meta.gameDateEstimated === true || data.meta.gameDateSource === 'derived';
      dateBadgeEl.querySelector('.pill-label').textContent = isEstimated
        ? 'วันที่ในเกม (ประมาณ):' : 'วันที่ในเกม:';
      document.getElementById('date-disclaimer').style.display = isEstimated ? 'inline' : 'none';
    }

    if (el.infoSave) {
      el.infoSave.textContent = formatSaveRefCode(data.refCode);
    }

    // Update baseline info badge in header
    if (el.infoBaseline) {
      if (data.snapshots && data.snapshots.length > 1) {
        const earliest = data.snapshots[0].gameDate;
        el.infoBaseline.textContent = `${formatGameDate(earliest)} (วันเริ่มบันทึกข้อมูล)`;
      } else if (data.snapshots && data.snapshots.length === 1) {
        el.infoBaseline.textContent = `รอบแรก (${formatGameDate(data.snapshots[0].gameDate)})`;
      } else {
        el.infoBaseline.textContent = 'ยังไม่มีประวัติเปรียบเทียบ';
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
          opt.textContent = `${formatGameDate(snap.gameDate)} (${snap.totalPlayers.toLocaleString()} คน)${isCurrent ? ' [รอบปัจจุบัน]' : ''}`;
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

function formatGameDate(date) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '';
}

function updateComparisonSummary() {
  if (!el.comparisonSummary) return;
  if (!state.baseline) {
    el.comparisonSummary.textContent = 'แสดงข้อมูลรอบปัจจุบัน (ยังไม่ได้เทียบรอบก่อน)';
    return;
  }
  if (state.baseline === state.gameDate) {
    el.comparisonSummary.innerHTML = `กำลังเปรียบเทียบกับรอบปัจจุบัน (<span class="text-accent font-semibold">${formatGameDate(state.baseline)}</span>)`;
  } else {
    el.comparisonSummary.innerHTML = `กำลังเปรียบเทียบพัฒนาการ: <span class="text-accent font-semibold">${formatGameDate(state.baseline)}</span> ➔ <span class="text-green font-semibold">${formatGameDate(state.gameDate)}</span>`;
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
  playerListRequest?.abort();
  const request = new AbortController();
  playerListRequest = request;
  el.tableBody.setAttribute('aria-busy', 'true');

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
  if (footFilter.value) params.set('foot', footFilter.value);
  for (const [key, minimum] of attributeFilters) params.append('attribute', key+':'+minimum);
  for (const [key, field] of transferFilters) {
    const value = getTransferFilterValue(field);
    if (value) params.set(key, value);
  }
  if (state.excludeMyClub) params.set('excludeMyClub', '1');
  if (selectedNationality) params.set('nationality', selectedNationality);
  if (state.trend) params.set('trend', state.trend);
  if (state.natOnly) params.set('natOnly', '1');
  if (state.preset === 'wonderkids') params.set('wonderkids', '1');
  if (state.preset === 'myclub') params.set('myClub', '1');
  try {
    const ref = state.refCode;
    if (ref?.startsWith('#') && !serverShortlists.has(ref)) {
      try {
        let result = await requestShortlist(ref, null, request.signal);
        const legacy = shortlist.read(ref);
        if (!result.exists && legacy.length) {
          result = await requestShortlist(ref, { action: 'seed', ids: legacy }, request.signal);
        }
        if (!request.signal.aborted && !pendingShortlistChanges.has(ref)) serverShortlists.set(ref, result.ids);
      } catch (error) {
        if (request.signal.aborted) return;
        if (state.preset === 'shortlist') showToast('โหลด Shortlist ไม่สำเร็จ', true);
      }
    }
    if (state.preset === 'shortlist') {
      params.set('shortlistRef', ref || '');
      params.set('shortlistIds', readShortlist(ref).join(','));
    }
    const res = await fetch(`/api/players?${params.toString()}`, { signal: request.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (request.signal.aborted) return;

    const nationalities = data.nationalities || [];
    nationalityInput.disabled = !nationalities.length;
    if (nationalities.length !== nationalityOptions.options.length ||
        nationalities.some((name, index) => nationalityOptions.options[index].value !== name)) {
      nationalityOptions.replaceChildren(...nationalities.map(name => new Option(name)));
    }
    if (selectedNationality && !nationalities.includes(selectedNationality)) {
      selectedNationality = '';
      nationalityInput.value = '';
      clearNationality.disabled = true;
      state.page = 1;
      return loadPlayers();
    }

    state.total = data.total || 0;
    updatePlayerFilterSummary();
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

    const comparisonDate = data.baselineDate && data.baselineDate !== state.gameDate ? data.baselineDate : '';
    document.getElementById('player-ca-comparison-heading').textContent = comparisonDate ? 'CA เทียบรอบที่เลือก' : 'CA เทียบรอบแรก';
    document.getElementById('player-comparison-basis').textContent = comparisonDate
      ? `เทียบ CA กับรอบ ${formatGameDate(comparisonDate)}`
      : 'เทียบ CA กับรอบแรกที่พบนักเตะแต่ละคนในเซฟนี้';
    renderTable(data.players || [], comparisonDate, data.refCode);
  } catch (err) {
    if (request.signal.aborted) return;
    console.error('Failed to load players:', err);
    el.tableBody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-red">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
  } finally {
    if (playerListRequest === request) {
      playerListRequest = null;
      el.tableBody.removeAttribute('aria-busy');
    }
  }
}

const trendIndicators = {
  explosive: '↑↑',
  developing: '↑',
  peak: '↗',
  plateau: '↔',
  stable: '→',
  declining: '↓'
};

function renderPlayerTrend(trend) {
  const code = Object.hasOwn(trendIndicators, trend?.code) ? trend.code : 'stable';
  return `<span class="player-trend" data-trend="${code}"><span class="player-trend-arrow" aria-hidden="true">${trendIndicators[code]}</span>${escapeHtml(trend?.label || 'คงที่')}</span>`;
}

const transferInterestLabels = new Map([
  ['high', 'สูง'], ['medium', 'ปานกลาง'], ['low', 'ต่ำ']
]);

function renderTable(players, comparisonDate, refCode) {
  if (players.length === 0) {
    const message = state.preset === 'shortlist' && !readShortlist(refCode).length
      ? 'ยังไม่มีนักเตะใน Shortlist ของเซฟนี้ กดดาวข้างชื่อนักเตะเพื่อเพิ่ม'
      : 'ไม่พบข้อมูลนักเตะที่ตรงกับเงื่อนไข';
    el.tableBody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-muted">${message}</td></tr>`;
    return;
  }

  const canSave = refCode?.startsWith('#');
  const savedIds = new Set(readShortlist(refCode));
  const rows = players.map(p => {
    const originDate = comparisonDate || p.firstSeenDate || '';
    const originLabel = formatGameDate(originDate) || 'รอบแรกที่พบ';
    let growthBadge = '';
    if (p.isFirstScan) {
      growthBadge = `<span class="badge badge-growth-neutral text-muted" title="สแกนครั้งแรก (ยังไม่มีประวัติรอบเปรียบเทียบ)">- (รอบแรก)</span>`;
    } else if (p.isNew) {
      if (p.isNewgen) {
        growthBadge = `<span class="badge badge-growth-new" title="เพิ่งพบครั้งแรกในรอบนี้ (เด็กเกิดใหม่ / Youth Intake)">เกิดใหม่</span>`;
      } else {
        growthBadge = `<span class="badge badge-growth-neutral" title="เพิ่งพบครั้งแรกในฐานข้อมูล (อายุ ${p.age || '-'} ปี)">พบครั้งแรก</span>`;
      }
    } else if (p.deltaCA > 0) {
      const tooltip = `เติบโต +${p.deltaCA} CA เทียบกับ ${originLabel} (เดิม ${p.prevCA || '-'})`;
      growthBadge = `<span class="badge badge-growth-up" title="${tooltip}">+${p.deltaCA} CA (+${p.growthPercent}%)</span>`;
    } else if (p.deltaCA < 0) {
      const tooltip = `ลดลง ${p.deltaCA} CA เทียบกับ ${originLabel} (เดิม ${p.prevCA || '-'})`;
      growthBadge = `<span class="badge badge-growth-down" title="${tooltip}">${p.deltaCA} CA (${p.growthPercent}%)</span>`;
    } else {
      growthBadge = `<span class="badge badge-growth-neutral" title="ค่าพลังคงที่เมื่อเทียบกับ ${originLabel}">คงที่ (0 CA)</span>`;
    }

    const valueStr = formatCurrency(p.value);
    const wageStr = formatWeeklyWage(p.wage, '–', '/w');

    return `
      <tr data-ref="${escapeHtml(refCode || '')}" onclick="openPlayerModal(${p.id}, this.dataset.ref)">
        <td class="col-name sticky-col">
          <div class="shortlist-name">
            ${canSave ? `<button type="button" class="shortlist-star" data-player-id="${Number(p.id)}" data-ref="${escapeHtml(refCode)}" onclick="toggleShortlistStar(event, this)"></button>` : ''}
            <div class="player-name-cell">
              <button type="button" class="player-name player-name-button">${escapeHtml(p.name)}</button>
              <span class="nat-badge text-muted text-xs">${renderPrimaryNationality(p.nat)}</span>
            </div>
          </div>
        </td>
        <td class="text-center font-medium">${p.age}</td>
        <td class="text-center"><span class="player-positions">${renderPositionBadges(p.pos)}</span></td>
        <td class="player-table-secondary"><span class="text-club">${escapeHtml(p.club || '-')}</span></td>
        <td class="text-center font-semibold">${p.ca}</td>
        <td class="text-center text-secondary">${p.pa}</td>
        <td class="text-center player-table-secondary">${renderPlayerTrend(p.trend)}</td>
        <td class="text-right">${growthBadge}</td>
        <td class="text-center text-secondary player-table-secondary">${transferInterestLabels.get(p.transferInterest) ?? '–'}</td>
        <td class="text-right text-secondary font-mono player-table-secondary">${valueStr}</td>
        <td class="text-right text-muted font-mono player-table-secondary weekly-wage-cell">${wageStr}</td>
      </tr>
    `;
  });

  el.tableBody.innerHTML = rows.join('');
  el.tableBody.querySelectorAll('.shortlist-star').forEach(button => {
    setShortlistStar(button, savedIds.has(Number(button.dataset.playerId)));
  });
}

let playerProfileReturn = null;

function closePlayerModal() {
  const restore = playerProfileReturn;
  playerProfileReturn = null;
  el.modal.style.display = 'none';
  if (restore) void restore();
}

async function openPlayerModal(id, expectedRef, expectedScanId) {
  document.getElementById('modal-hidden-stats').open = false;
  try {
    const res = await fetch(`/api/player/${id}`);
    if (!res.ok) throw new Error('Player not found');
    const { player, preferredFoot, reputationLabel, contractEnd, transferStatuses = [], trend, refCode, scanId, profileComparisons } = await res.json();
    if (expectedRef && (refCode !== expectedRef || state.refCode !== expectedRef || el.btnScan.disabled)) return;
    if (expectedScanId && (scanId !== expectedScanId || el.btnScan.disabled)) return;
    document.getElementById('btn-compare-player').onclick = () => openPlayerComparison(player, refCode, scanId);
    document.getElementById('btn-player-replacement').onclick = () => openPlayerReplacement(player, refCode, scanId);
    const star = document.getElementById('modal-shortlist');
    star.hidden = !refCode?.startsWith('#');
    star.dataset.ref = refCode || '';
    star.dataset.playerId = player.id;
    star.onclick = event => toggleShortlistStar(event, star);
    setShortlistStar(star, readShortlist(refCode).includes(Number(player.id)));

    currentPlayerName = player.name;
    if (el.btnCopyPlayerName) {
      el.btnCopyPlayerName.classList.remove('copied');
      el.btnCopyPlayerName.innerHTML = `<span class="copy-icon">📋</span> <span class="copy-label">คัดลอกชื่อ</span>`;
    }

    document.getElementById('modal-name').textContent = player.name;
    const playerId = document.getElementById('modal-player-id');
    playerId.hidden = player.id == null;
    playerId.textContent = player.id == null ? '' : `ID ${player.id}`;
    const naturalPositions = Array.isArray(player.posNat) ? player.posNat : [];
    document.getElementById('modal-pos').innerHTML = renderPositionBadges(player.pos, naturalPositions);
    document.getElementById('modal-position-pitch').innerHTML = renderProfilePitch(player.pos, naturalPositions);
    document.getElementById('modal-positions').open = !window.matchMedia('(max-width: 600px)').matches;
    const club = player.club?.trim();
    document.getElementById('modal-club').textContent = club || 'ไร้สังกัด';
    const ownerClub = typeof player.ownerClub === 'string' ? player.ownerClub.trim() : '';
    const division = typeof player.div === 'string' ? player.div.trim() : '';
    const ownerClubLabel = document.getElementById('modal-owner-club');
    const divisionLabel = document.getElementById('modal-division');
    ownerClubLabel.hidden = !ownerClub || ownerClub === club;
    ownerClubLabel.textContent = ownerClubLabel.hidden ? '' : `ต้นสังกัด ${ownerClub}`;
    divisionLabel.hidden = !division;
    divisionLabel.textContent = division ? `ลีก ${division}` : '';
    document.getElementById('modal-club-details').hidden = ownerClubLabel.hidden && divisionLabel.hidden;
    document.getElementById('modal-nat').innerHTML = renderPrimaryNationality(player.nat);
    document.getElementById('modal-age').textContent = `${player.age} ปี (เกิด ${player.birthYear || '-'})`;
    const height = document.getElementById('modal-height');
    height.hidden = !Number.isInteger(player.height) || player.height <= 0;
    height.textContent = height.hidden ? '' : `${player.height} ซม.`;
    document.getElementById('modal-reputation').textContent = reputationLabel ?? 'ไม่ระบุ';
    document.getElementById('modal-value').textContent = formatCurrency(player.value);
    document.getElementById('modal-foot').textContent = footLabels.get(preferredFoot) ?? 'ไม่ระบุ';
    document.getElementById('modal-wage').textContent = formatWeeklyWage(player.wage, 'ไม่ระบุ');
    document.getElementById('modal-contract-end').textContent = formatGameDate(contractEnd) || 'ไม่ระบุ';
    document.getElementById('modal-transfer-status').textContent = transferStatuses.map(status => transferLabels.get(status)).filter(Boolean).join(' · ') || '–';
    document.getElementById('modal-ca').textContent = player.ca;
    document.getElementById('modal-pa').textContent = player.pa;

    const { previous, firstCA, firstAttributes } = profileComparisons ?? {};
    const progression = document.getElementById('modal-ca-progression');
    const formatDelta = round => {
      const delta = player.ca - round.ca;
      const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
      const percentage = (Math.abs(delta) / round.ca * 100).toFixed(2);
      return `${sign}${Math.abs(delta)} CA (${sign}${percentage}%)`;
    };
    const hasCA = round => Number.isFinite(round?.ca) && round.ca > 0 && Number.isFinite(player.ca);
    const recent = hasCA(previous);
    progression.hidden = false;
    progression.dataset.direction = recent && player.ca > previous.ca ? 'up' : recent && player.ca < previous.ca ? 'down' : 'steady';
    document.getElementById('modal-ca-range').textContent = recent ? `${previous.ca} → ${player.ca}` : '';
    document.getElementById('modal-ca-basis').textContent = recent
      ? `เทียบกับรอบก่อนหน้า · ${formatGameDate(previous.date)}`
      : 'ยังไม่มี CA จากรอบก่อนหน้า';
    document.getElementById('modal-ca-change').textContent = recent ? formatDelta(previous) : 'ไม่มีข้อมูลเทียบ';
    document.getElementById('modal-ca-first').textContent = hasCA(firstCA)
      ? `ตั้งแต่เริ่มบันทึก · ${formatGameDate(firstCA.date)} · ${formatDelta(firstCA)}`
      : 'ตั้งแต่เริ่มบันทึก · ไม่มีข้อมูลเทียบ';

    // Render Development Forecast Box
    const forecastBox = document.getElementById('modal-forecast-box');
    if (forecastBox) {
      const tr = trend || { label: 'คงที่', reason: 'รักษามาตรฐานค่าพลัง' };
      forecastBox.innerHTML = `
        <strong class="forecast-label">${escapeHtml(tr.label)}</strong>
        <p class="forecast-desc">${escapeHtml(tr.reason)}</p>
      `;
    }

    // Render Attributes
    const attrs = player.attrs || {};
    const attrsGrid = document.getElementById('modal-attrs-grid');
    const isGoalkeeper = (player.pos || '').split(',').some(position => position.trim() === 'GK');
    const mode = document.getElementById('modal-attribute-mode');
    const renderAttributes = () => {
      const round = mode.value === 'first' ? firstAttributes : previous;
      const previousAttributes = round?.attributes;
      const goalkeepingOpen = attrsGrid.querySelector('.player-goalkeeping')?.open;
      document.getElementById('modal-attribute-baseline').textContent = previousAttributes
        ? `เทียบกับรอบ ${formatGameDate(round.date)}`
        : `ไม่มีข้อมูลเทียบ${round ? ' · ' + formatGameDate(round.date) : ''}`;
      attrsGrid.innerHTML = getProfileAttributeColumns(isGoalkeeper).map(groups => {
        const cards = groups.map(([catName, list, collapsible]) => {
          const rows = list.map(attr => {
            const val = attrs[attr] != null ? attrs[attr] : '-';
            let colorClass = 'attr-val-low';
            if (typeof val === 'number') {
              if (val >= 16) colorClass = 'attr-val-top';
              else if (val >= 11) colorClass = 'attr-val-good';
              else if (val >= 6) colorClass = 'attr-val-avg';
            }
            const previous = previousAttributes?.[attr];
            let baseline = '';
            let change = '';
            if (Number.isFinite(previous) && Number.isFinite(val)) {
              baseline = `<span class="attribute-previous" title="ค่าจากรอบที่เลือก">${previous}</span><span class="text-muted" aria-hidden="true">→</span>`;
              const delta = val - previous;
              const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'steady';
              const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
              const description = delta === 0 ? `คงที่ที่ ${val}` : `${delta > 0 ? 'เพิ่ม' : 'ลด'}จาก ${previous} เป็น ${val}`;
              change = `<span class="attribute-change" data-direction="${direction}" role="img" aria-label="${description}" title="${description}">${arrow}</span>`;
            }
            return `
              <div class="attr-row" title="${PLAYER_ATTRIBUTE_THAI[attr]}">
                <span class="attr-name">${PROFILE_ATTRIBUTE_LABELS[attr] ?? attr}</span>
                <span class="attribute-result">${baseline}<span class="attr-val ${colorClass}">${val}</span>${change}</span>
              </div>
            `;
          }).join('');

          if (collapsible) {
            return `<details class="attr-column player-goalkeeping"><summary class="attr-column-title">${catName}</summary>${rows}</details>`;
          }
          return `
            <div class="attr-column">
              <div class="attr-column-title">${catName}</div>
              ${rows}
            </div>
          `;
        }).join('');
        return `<div class="profile-attribute-column">${cards}</div>`;
      }).join('');
      if (goalkeepingOpen) attrsGrid.querySelector('.player-goalkeeping').open = true;
    };
    attrsGrid.replaceChildren();
    mode.value = 'previous';
    mode.onchange = renderAttributes;
    renderAttributes();

    // Personality Stats
    const pGrid = document.getElementById('modal-personality-grid');
    const personalityStats = Object.fromEntries(Object.keys(PERSONALITY_MAP).map(key => [key, player[key]]));
    const hiddenStats = Object.fromEntries(Object.keys(PLAYER_HIDDEN_ATTRIBUTES)
      .filter(key => Number.isInteger(attrs[key]) && attrs[key] >= 1 && attrs[key] <= 20)
      .map(key => [key, attrs[key]]));
    pGrid.innerHTML = renderPersonalityGrid({ ...personalityStats, ...hiddenStats });

    el.modal.style.display = 'flex';
    el.modal.querySelector('.player-modal-details').scrollTop = 0;
    el.modal.querySelector('.player-modal-overview').scrollTop = 0;
    return true;
  } catch (err) {
    showToast(`เกิดข้อผิดพลาดในการเปิดข้อมูลนักเตะ: ${err.message}`, true);
  }
}

const compareDialog = document.getElementById('player-compare');
const compareSearch = document.getElementById('compare-search');
const compareOptions = document.getElementById('compare-options');
const compareStatus = document.getElementById('compare-status');
const comparePicker = document.getElementById('compare-picker');
const compareResults = document.getElementById('compare-results');
let comparisonSource;
let comparisonRequest;
let comparisonTimer;

function showComparisonPicker() {
  clearTimeout(comparisonTimer);
  comparisonRequest?.abort();
  compareResults.hidden = true;
  comparePicker.hidden = false;
  compareSearch.value = '';
  compareOptions.replaceChildren();
  compareStatus.textContent = '';
  document.getElementById('compare-my-club').checked = false;
  compareSearch.focus();
  if (comparisonSource.kind === 'staff') searchComparisonPlayers('');
}

function openPlayerComparison(player, refCode, scanId) {
  if (el.btnScan.disabled || (state.scanId && state.scanId !== scanId)) {
    showToast('กรุณาเปิดโปรไฟล์นักเตะอีกครั้งหลังโหลดข้อมูล', true);
    return;
  }
  comparisonSource = { player, refCode, scanId, kind: 'player' };
  document.getElementById('compare-title').textContent = 'เปรียบเทียบนักเตะ';
  compareSearch.placeholder = 'พิมพ์ชื่อนักเตะ';
  document.getElementById('compare-club-filter').hidden = true;
  document.getElementById('compare-legend').hidden = true;
  document.getElementById('compare-first').textContent = `เทียบกับ ${player.name}`;
  compareDialog.showModal();
  showComparisonPicker();
}

function openStaffComparison(staff, refCode, scanId) {
  if (el.btnScan.disabled || state.scanId !== scanId || state.refCode !== refCode) {
    showToast('กรุณาเปิดโปรไฟล์ทีมงานอีกครั้งหลังโหลดข้อมูล', true);
    return;
  }
  comparisonSource = { player: staff, refCode, scanId, kind: 'staff' };
  document.getElementById('compare-title').textContent = 'เปรียบเทียบทีมงาน';
  document.getElementById('compare-first').textContent = `เทียบกับ ${staff.name}`;
  document.getElementById('compare-club-filter').hidden = false;
  document.getElementById('compare-my-club').disabled = !state.myClub || state.myClub === 'ไม่ระบุ';
  document.getElementById('compare-legend').hidden = false;
  compareSearch.placeholder = 'พิมพ์ชื่อทีมงาน';
  compareDialog.showModal();
  showComparisonPicker();
}

document.getElementById('compare-my-club').onchange = () => compareSearch.dispatchEvent(new Event('input'));

document.getElementById('compare-close').onclick = () => compareDialog.close();
document.getElementById('compare-change').onclick = showComparisonPicker;
compareDialog.addEventListener('close', () => {
  clearTimeout(comparisonTimer);
  comparisonRequest?.abort();
});

compareSearch.addEventListener('input', () => {
  clearTimeout(comparisonTimer);
  comparisonRequest?.abort();
  compareOptions.replaceChildren();
  const q = compareSearch.value.trim();
  compareStatus.textContent = q ? 'กำลังค้นหา…' : '';
  if (q || comparisonSource.kind === 'staff') comparisonTimer = setTimeout(() => searchComparisonPlayers(q), 180);
});

async function searchComparisonPlayers(q) {
  const request = comparisonRequest = new AbortController();
  try {
    const params = new URLSearchParams({ q, sort: 'name', order: 'asc', limit: '10' });
    const isStaff = comparisonSource.kind === 'staff';
    if (isStaff && document.getElementById('compare-my-club').checked) params.set('preset', 'myclub');
    const response = await fetch(`/api/${isStaff ? 'staff' : 'players'}?${params}`, { signal: request.signal });
    if (!response.ok) throw new Error('ค้นหาคู่เทียบไม่สำเร็จ');
    const result = await response.json();
    if (request.signal.aborted || !compareDialog.open) return;
    if (result.refCode !== comparisonSource.refCode || result.meta?.scanId !== comparisonSource.scanId) {
      throw new Error('ข้อมูลเซฟเปลี่ยนแล้ว กรุณาเปิดโปรไฟล์ใหม่');
    }
    const matches = (result.staff ?? result.players).filter(player => player.id !== comparisonSource.player.id);
    compareStatus.textContent = matches.length ? '' : 'ไม่พบคู่เทียบ ลองระบุชื่อให้เจาะจงขึ้น';
    compareOptions.replaceChildren(...matches.map(player => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-secondary';
      button.textContent = [player.name, player.club, player.roleTh ?? player.pos].filter(Boolean).join(' · ');
      button.onclick = () => selectComparisonPlayer(player.id);
      item.append(button);
      return item;
    }));
  } catch (error) {
    if (!request.signal.aborted) compareStatus.textContent = error.message;
  }
}

async function selectComparisonPlayer(id) {
  comparisonRequest?.abort();
  const request = comparisonRequest = new AbortController();
  compareStatus.textContent = 'กำลังโหลดค่าพลัง…';
  try {
    const isStaff = comparisonSource.kind === 'staff';
    const response = await fetch(`/api/${isStaff ? 'staff' : 'player'}/${id}`, { signal: request.signal });
    if (!response.ok) throw new Error('โหลดข้อมูลคู่เทียบไม่สำเร็จ');
    const { player, staff, refCode, scanId } = await response.json();
    if (request.signal.aborted || !compareDialog.open) return;
    if (refCode !== comparisonSource.refCode || scanId !== comparisonSource.scanId) {
      throw new Error('ข้อมูลเซฟเปลี่ยนแล้ว กรุณาเปิดโปรไฟล์ใหม่');
    }
    if (isStaff) renderStaffComparison(comparisonSource.player, staff);
    else renderPlayerComparison(comparisonSource.player, player);
    comparePicker.hidden = true;
    compareResults.hidden = false;
    document.getElementById('compare-change').focus();
  } catch (error) {
    if (!request.signal.aborted) compareStatus.textContent = error.message;
  }
}

function renderPlayerComparison(left, right) {
  document.getElementById('compare-left').textContent = left.name;
  document.getElementById('compare-right').textContent = right.name;
  const row = (label, a, b, highlight = false, format = String) => {
    const comparable = highlight && Number.isFinite(a) && Number.isFinite(b);
    const cell = (value, wins) => `<td${wins ? ' class="compare-higher" aria-label="' + escapeHtml(format(value)) + ' สูงกว่า"' : ''}>${value == null || value === '' ? '—' : escapeHtml(format(value))}</td>`;
    const tooltip = PLAYER_ATTRIBUTE_THAI[label] ? ` title="${PLAYER_ATTRIBUTE_THAI[label]}"` : '';
    return `<tr${tooltip}>${cell(a, comparable && a > b)}<th scope="row">${escapeHtml(label)}</th>${cell(b, comparable && b > a)}</tr>`;
  };
  const group = title => `<tr class="compare-group"><th colspan="3">${title}</th></tr>`;
  document.getElementById('compare-rows').innerHTML = [
    row('อายุ', left.age, right.age),
    row('ตำแหน่ง', left.pos, right.pos),
    row('CA', left.ca, right.ca, true),
    row('PA', left.pa, right.pa, true),
    row('มูลค่า', left.value, right.value, false, formatCurrency),
    row('ค่าเหนื่อยต่อสัปดาห์', left.wage, right.wage, false, formatWeeklyWage),
    ...Object.entries(ATTR_GROUPS).flatMap(([title, attrs]) => [
      group(title),
      ...attrs.map(attr => row(attr, left.attrs?.[attr], right.attrs?.[attr], true))
    ])
  ].join('');
}

function renderStaffComparison(left, right) {
  document.getElementById('compare-left').textContent = left.name;
  document.getElementById('compare-right').textContent = right.name;
  document.getElementById('compare-rows').innerHTML = buildStaffComparisonRows(left, right).map(row => {
    if (row.group) return `<tr class="compare-group"><th colspan="3">${escapeHtml(row.group)}</th></tr>`;
    const comparable = row.highlight && Number.isFinite(row.a) && Number.isFinite(row.b);
    const difference = comparable ? Math.abs(row.a - row.b) : 0;
    const format = value => row.stars ? `★ ${value.toFixed(1)}` : row.wage ? formatWeeklyWage(value) : String(value);
    const cell = (value, other) => {
      const higher = comparable && value > other;
      const delta = higher ? `<small class="compare-difference">+${row.stars ? difference.toFixed(1) : difference}</small>` : '';
      return `<td${higher ? ' class="compare-higher"' : ''}>${value == null || value === '' ? '—' : escapeHtml(format(value))}${delta}</td>`;
    };
    return `<tr>${cell(row.a, row.b)}<th scope="row">${escapeHtml(row.label)}</th>${cell(row.b, row.a)}</tr>`;
  }).join('');
}

async function triggerScan() {
  if (compareDialog.open) compareDialog.close();
  el.btnScan.disabled = true;
  el.btnScanText.textContent = 'กำลังตรวจจับเซฟและโหลดข้อมูลจาก FM27 (เวลาโหลดขึ้นอยู่กับขนาดฐานข้อมูล)';
  showToast('🚀 กำลังเชื่อมต่อ FM27 และตรวจจับเซฟเกม กรุณารอสักครู่...');

  try {
    const res = await fetch('/api/scan', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      playerListRequest?.abort();
      serverShortlists.clear();
      const pCount = (data.playersCount || 0).toLocaleString();
      const sCount = (data.staffCount || 0).toLocaleString();
      const sec = (data.elapsed / 1000).toFixed(1);
      const staffMsg = data.staffCount ? ` และทีมงาน ${sCount} คน` : '';
      const refMsg = data.refCode ? ` [เซฟ: ${formatSaveRefCode(data.refCode)}]` : '';
      showToast(`✅ โหลดข้อมูลสำเร็จ! พบนักเตะ ${pCount} คน${staffMsg} (${sec} วิ)${refMsg}`);
      await loadStatus();
      await loadPlayers();
      if (!squadSection.hidden) await loadSquadAnalysis();
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

function formatSaveRefCode(refCode) {
  if (refCode === 'UNIDENTIFIED') return 'ยังระบุเซฟไม่ได้';
  return refCode?.replace(/^#[^-]+-([0-9a-f]{6})$/i, '#FM-$1') || '-';
}

function formatWeeklyWage(value, fallback = '–', suffix = '') {
  return Number.isFinite(value) && value > 0 ? `£${value.toLocaleString()}${suffix}` : fallback;
}

function formatCurrency(val) {
  if (val == null || val === 0) return '-';
  if (val >= 1000000) return `£${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `£${(val / 1000).toFixed(0)}K`;
  return `£${val.toLocaleString()}`;
}

function renderPrimaryNationality(value) {
  const primary = Array.isArray(value) ? value.find(name => typeof name === 'string' && name.trim()) : value;
  const name = typeof primary === 'string' ? primary.trim() : '';
  if (!name) return '–';
  const key = name.toLowerCase();
  const code = Object.hasOwn(nationalityFlagCodes, key) ? nationalityFlagCodes[key] : '';
  const flag = code ? `<img class="nationality-flag" src="/vendor/flag-icons/flags/4x3/${code}.svg"
    width="16" height="12" alt="" decoding="async" loading="lazy">` : '';
  return `<span class="nationality-item">${flag}${escapeHtml(name)}</span>`;
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

function showUpdateDownload(link, data) {
  const url = data.isGit === false && data.hasUpdate ? data.downloadUrl : '';
  link.style.display = url ? 'inline-flex' : 'none';
  if (url) link.href = url;
  else link.removeAttribute('href');
}

function showUpdateInstall(button, data) {
  const visible = data.hasUpdate && (data.isGit || data.canInstall);
  button.style.display = visible ? 'inline-flex' : 'none';
  button.textContent = data.canInstall ? 'อัปเดตและเปิดใหม่' : 'อัปเดตทันที';
}

async function checkForUpdates(silent = false, isCelebration = false) {
  if (!silent && el.btnCheckUpdate) {
    el.btnCheckUpdate.disabled = true;
    el.btnCheckUpdate.textContent = 'กำลังเช็กอัปเดต';
  }

  try {
    const res = await fetch('/api/check-update');
    if (!res.ok) {
      throw new Error('เซิร์ฟเวอร์ในเครื่องยังเป็นเวอร์ชันเดิม กรุณาปิดแล้วเปิดโปรแกรมใหม่');
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    latestUpdateData = data;
    showUpdateDownload(el.btnDownloadUpdate, data);

    const currentCommit = data.currentCommit || '';
    const latestCommit = data.latestCommit || currentCommit;

    // Detect if window UI is older than what's on disk, or if remote GitHub has new commits
    const isDiskAheadOfUI = Boolean(state.loadedCommit && currentCommit && state.loadedCommit !== currentCommit);
    const isRemoteAheadOfDisk = Boolean(data.hasUpdate);

    if (isCelebration) {
      openChangelogModal(data, true);
      return;
    }

    if (isRemoteAheadOfDisk) {
      // Case 1: Remote GitHub has an unpulled update
      const summaryText = data.latestMessage ? `: <strong class="text-white">${escapeHtml(data.latestMessage)}</strong>` : '';
      if (el.updateBannerBadge) {
        el.updateBannerBadge.textContent = 'อัปเดตใหม่';
        el.updateBannerBadge.className = 'update-badge';
      }
      if (data.isGit === false) el.updateDesc.textContent = data.message;
      else el.updateDesc.innerHTML = `ตรวจพบเวอร์ชันใหม่บน GitHub (${latestCommit})${summaryText}`;
      showUpdateInstall(el.btnApplyUpdate, data);
      if (el.btnBannerReload) el.btnBannerReload.style.display = 'none';
      el.updateBanner.style.display = 'block';

      if (!silent) {
        showToast(`🚀 ตรวจพบเวอร์ชันใหม่บน GitHub!`);
        openChangelogModal(data);
      }
    } else if (isDiskAheadOfUI) {
      // Case 2: Code on disk has been updated, but this browser window was loaded earlier
      if (el.updateBannerBadge) {
        el.updateBannerBadge.textContent = 'ต้องรีโหลดหน้าจอ';
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
      el.btnCheckUpdate.textContent = 'เช็กอัปเดต';
    }
  }
}

function openChangelogModal(data, isCelebration = false) {
  if (!el.changelogModal || !data) return;

  const currentCommit = data.currentCommit || '';
  const latestCommit = data.latestCommit || currentCommit;
  const isNew = data.hasUpdate;
  const isUiStale = !isCelebration && Boolean(state.loadedCommit && latestCommit && state.loadedCommit !== latestCommit);

  if (data.isGit === false) {
    const version = `เวอร์ชันปัจจุบัน v${data.currentVersion}`;
    el.changelogMeta.textContent = isNew ? `${version} · ${data.message}` : version;
  } else if (isCelebration) {
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
    el.btnChangelogClose.hidden = !isCelebration;
  }

  showUpdateInstall(el.btnChangelogApply, data);
  showUpdateDownload(el.btnChangelogDownload, data);
  if (el.btnChangelogReload) {
    el.btnChangelogReload.style.display = data.isGit !== false && isUiStale ? 'inline-flex' : 'none';
  }

  el.changelogModal.style.display = 'flex';
}

async function installReleaseUpdate() {
  const buttons = [el.btnApplyUpdate, el.btnChangelogApply];
  buttons.forEach(button => { button.disabled = true; });
  el.btnApplyUpdate.textContent = 'กำลังดาวน์โหลดและตรวจไฟล์';
  showToast('กำลังดาวน์โหลดและตรวจไฟล์อัปเดต');
  try {
    const response = await fetch('/api/install-release', {
      method: 'POST', headers: { 'X-FM27-Install': '1' }
    });
    const result = await response.json();
    if (!response.ok || !result.updateId) throw new Error(result.error || 'เริ่มติดตั้งไม่ได้');

    const isSetup = result.installMode === 'setup';
    el.btnApplyUpdate.textContent = isSetup ? 'รออนุมัติจาก Windows' : 'กำลังเปิด Tracker ใหม่';
    if (isSetup) showToast('อนุมัติหน้าต่าง Windows เพื่อเริ่มติดตั้ง');
    const deadline = Date.now() + (isSetup ? 300000 : 90000);
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const state = await fetch('/api/update-state', {
        cache: 'no-store', signal: AbortSignal.timeout(2000)
      }).then(res => res.json()).catch(() => null);
      if (state?.updateId !== result.updateId) continue;
      if (state.rolledBack) throw new Error(isSetup
        ? 'Setup ติดตั้งไม่สำเร็จหรือถูกยกเลิก กรุณาลองอีกครั้ง'
        : 'รุ่นใหม่เปิดไม่ได้ ระบบคืนไฟล์โปรแกรมเดิมแล้ว');
      window.location.reload();
      return;
    }
    throw new Error('ยังเชื่อมต่อ Tracker ไม่ได้ กรุณาลองเปิดโปรแกรมจากตัวเปิดเดิม');
  } catch (error) {
    showToast(`ติดตั้งอัปเดตไม่สำเร็จ (${error.message})`, true);
  } finally {
    buttons.forEach(button => { button.disabled = false; });
    el.btnApplyUpdate.textContent = 'อัปเดตและเปิดใหม่';
  }
}

async function applyUpdate() {
  if (!confirm('ต้องการเริ่มการอัปเดตโปรแกรมเป็นเวอร์ชันล่าสุดทันทีใช่หรือไม่?')) return;
  if (latestUpdateData?.canInstall) return installReleaseUpdate();

  el.btnApplyUpdate.disabled = true;
  el.btnApplyUpdate.textContent = 'กำลังดาวน์โหลดและอัปเดตไฟล์...';
  showToast('⏳ กำลังดึงไฟล์อัปเดตจาก GitHub กรุณารอสักครู่...');

  try {
    const res = await fetch('/api/apply-update', { method: 'POST' });
    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      showToast('✅ อัปเดตไฟล์สำเร็จเรียบร้อยแล้ว! กำลังรีโหลดหน้าต่างโปรแกรมใน 2 วินาที...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      showToast(data?.error || `❌ อัปเดตไม่สำเร็จ (HTTP ${res.status})`, true);
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
  staffListRequest?.abort();
  const request = new AbortController();
  staffListRequest = request;
  el.staffTableBody.setAttribute('aria-busy', 'true');

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

    for (const [key, value] of getStaffExtraFilters()) params.append(key, value);
    const res = await fetch(`/api/staff?${params.toString()}`, { signal: request.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (request.signal.aborted) return;

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
    if (request.signal.aborted) return;
    console.error('Failed to load staff:', err);
    el.staffTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-8 text-red">
          เกิดข้อผิดพลาดในการโหลดข้อมูลทีมงาน: ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
  } finally {
    if (staffListRequest === request) {
      staffListRequest = null;
      el.staffTableBody.removeAttribute('aria-busy');
    }
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
    if (s.roleCategory === 'recruitment') {
      catClass = 'badge-role-recruitment';
    } else if (s.roleCategory === 'medical') {
      catClass = 'badge-role-medical';
    }

    // Club or Free Agent
    const clubHtml = s.isFreeAgent
      ? `<span class="badge-free">ว่างงาน</span>`
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
          <span class="stars-gold" aria-hidden="true">★</span>
          <span class="stars-val">${s.coachStarsFormatted}</span>
        </div>
      `;
    } else {
      skillHtml = `
        <div class="staff-stars">
          <span class="stars-gold">★</span>
          <span class="stars-val">${s.coachStarsFormatted}</span>
        </div>
      `;
    }

    // Wage
    const wageStr = formatWeeklyWage(s.wage, '–', '/w');

    return `
      <tr class="clickable-row staff-row" data-id="${s.id}">
        <td class="col-name sticky-col">
          <div class="player-name-cell">
            <span class="player-name font-semibold text-white">${escapeHtml(s.name)}</span>
            <span class="nat-badge text-muted text-xs">${renderPrimaryNationality(s.nat)}</span>
          </div>
        </td>
        <td class="text-center font-medium">${s.age || '-'}</td>
        <td class="text-center">
          <span class="badge-role ${catClass}" title="${escapeHtml(s.roleEn)}">
            <span>${escapeHtml(s.roleTh)}</span>
          </span>
        </td>
        <td>${clubHtml}</td>
        <td class="text-center font-bold">${s.ca || '-'}</td>
        <td class="text-center text-secondary">${s.pa || '-'}</td>
        <td class="text-center">${skillHtml}</td>
        <td>
          <div class="rep-cell" title="ชื่อเสียง: ${escapeHtml(s.repLabel)}">
            <span class="text-xs text-muted">${escapeHtml((s.repLabel || '').split(' (')[0] || 'ไม่ระบุ')}</span>
          </div>
        </td>
        <td class="text-right text-sm text-muted font-mono weekly-wage-cell">${wageStr}</td>
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
  document.getElementById('staff-modal-hidden-stats').open = false;

  document.getElementById('btn-compare-staff').disabled = true;
  el.staffModalName.textContent = 'กำลังโหลดข้อมูล...';
  const staffId = document.getElementById('staff-modal-id');
  staffId.hidden = true;
  staffId.textContent = '';
  el.staffModalAttrsContainer.innerHTML = '<div class="text-muted py-8 text-center" style="grid-column: 1/-1;">กำลังโหลดค่าพลังทีมงาน...</div>';
  el.staffModalPersonalityGrid.innerHTML = '';
  document.getElementById('staff-contract-section').hidden = true;
  document.getElementById('staff-training-section').hidden = true;
  el.staffModal.style.display = 'flex';

  try {
    const res = await fetch(`/api/staff/${id}`);
    if (!res.ok) throw new Error('ไม่พบข้อมูลทีมงาน');
    const data = await res.json();
    const s = data.staff || data;
    const compareButton = document.getElementById('btn-compare-staff');
    compareButton.onclick = () => openStaffComparison(s, data.refCode, data.scanId);
    compareButton.disabled = false;

    el.staffModalName.textContent = s.name;
    staffId.hidden = s.id == null;
    staffId.textContent = staffId.hidden ? '' : `ID ${s.id}`;
    currentStaffName = s.name;
    if (el.btnCopyStaffName) {
      el.btnCopyStaffName.classList.remove('copied');
      el.btnCopyStaffName.innerHTML = `<span class="copy-icon">📋</span> <span class="copy-label">คัดลอกชื่อ</span>`;
    }
    el.staffModalNat.innerHTML = renderPrimaryNationality(s.nat);
    el.staffModalAge.textContent = [s.age ? `${s.age} ปี` : '', s.birthYear ? `(เกิด ${s.birthYear})` : ''].filter(Boolean).join(' ') || '–';
    if (el.staffModalCA) el.staffModalCA.textContent = s.ca || '-';
    if (el.staffModalPA) el.staffModalPA.textContent = s.pa || '-';

    // Role badge
    let catClass = 'badge-role-coaching';
    if (s.roleCategory === 'recruitment') {
      catClass = 'badge-role-recruitment';
    } else if (s.roleCategory === 'medical') {
      catClass = 'badge-role-medical';
    }
    el.staffModalRole.className = `badge ${catClass}`;
    el.staffModalRole.textContent = `${s.roleTh} (${s.roleEn})`;

    el.staffModalClub.hidden = !s.club;
    el.staffModalClub.textContent = s.club || '';

    const skills = s.keySkills ?? {};
    const specialties = {
      medical: [['กายภาพ', skills.physiotherapy], ['วิทย์กีฬา', skills.sportsScience]],
      recruitment: [['JPA', skills.jpa], ['JPP', skills.jpp]]
    };
    const leadStats = s.roleId === 'hoyd'
      ? [['ปั้นเยาวชน', skills.youngsters], ['JPP', skills.jpp]]
      : specialties[s.roleCategory] ?? [['ดาวโค้ช', `★ ${s.coachStarsFormatted}`]];
    const stats = [...leadStats, ['CA (ปัจจุบัน)', s.ca], ['PA (ศักยภาพ)', s.pa]];
    el.staffModalHeaderStats.innerHTML = stats.map(([label, value]) =>
      `<div class="ability-block"><div class="ability-label">${label}</div><div class="ability-number${label.startsWith('PA') ? ' text-secondary' : ''}">${escapeHtml(String(value || '–'))}</div></div>`).join('');

    const contract = [
      ['ค่าเหนื่อยต่อสัปดาห์', formatWeeklyWage(s.wage, 'ไม่ระบุ')],
      ['สถานะการจ้างงาน', s.isFreeAgent ? 'ว่างงาน' : 'มีสังกัด'],
      ['สัญญาหมด', formatGameDate(s.expires) || 'ไม่ระบุ'],
      ['ชื่อเสียง', s.worldRep > 0 || s.curRep > 0 ? s.repLabel.split(' (')[0] : 'ไม่ระบุ']
    ];
    document.getElementById('staff-contract-details').innerHTML = contract.map(([label, value]) =>
      `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
    const training = s.roleCategory === 'coaching'
      ? Object.entries(s.trainingStars ?? {}).filter(([key]) => !['attacking', 'defending', 'possession', 'goalkeeping'].includes(key))
      : [];
    const best = Math.max(...training.map(([, stars]) => stars));
    const trainingLabels = s.trainingLabels ?? staffOptions?.training ?? {};
    const bestNames = training.filter(([, stars]) => stars === best).map(([key]) => trainingLabels[key] ?? key);
    document.getElementById('staff-training-best').textContent =
      bestNames.length ? `เด่นสุด · ${bestNames.join(' / ')} (★ ${best.toFixed(1)})` : '';
    document.getElementById('staff-training-ratings').innerHTML = training.map(([key, stars]) =>
      `<div class="${stars === best ? 'staff-training-best' : ''}"><dt>${escapeHtml(trainingLabels[key] ?? key)}</dt><dd>★ ${stars.toFixed(1)}</dd></div>`).join('');
    document.getElementById('staff-contract-section').hidden = false;
    document.getElementById('staff-training-section').hidden = !training.length;
    const groups = ['coaching', 'mental', 'scouting', 'medical'];
    const lead = { recruitment: 'scouting', medical: 'medical' }[s.roleCategory] ?? 'coaching';
    el.staffModalAttrsContainer.innerHTML = [lead, ...groups.filter(group => group !== lead)]
      .map(group => renderAttrColumn(staffGroupLabels[group], s.attrGroups?.[group])).join('');

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

function renderAttrColumn(title, attrs) {
  if (!attrs || attrs.length === 0) return '';
  return `
    <div class="attr-column">
      <div class="attr-column-title">
        <span>${title}</span>
      </div>
      <div class="attr-list">
        ${attrs.map(a => {
          const val = a.val || 0;
          let valClass = 'attr-val-low';
          if (val >= 16) valClass = 'attr-val-top';
          else if (val >= 11) valClass = 'attr-val-good';
          else if (val >= 6) valClass = 'attr-val-avg';
          const name = a.nameTh || a.name || '';
          const match = /^(.*) \(([^()]*)\)$/.exec(name);
          return `
            <div class="attr-row">
              <span class="attr-name">${escapeHtml(match?.[1] ?? name)}${match ? `<span class="staff-attr-label-en">${escapeHtml(match[2])}</span>` : ''}</span>
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
  return Object.entries(pers).map(([key, value]) => {
    const label = PERSONALITY_MAP[key] || PLAYER_HIDDEN_ATTRIBUTES[key] || key;
    const valid = Number.isInteger(value) && value >= 1 && value <= 20;
    const lowerIsBetter = ['controversy', 'InjuryProneness', 'Dirtiness'].includes(key);
    const higherIsBetter = (key in PERSONALITY_MAP || key in PLAYER_HIDDEN_ATTRIBUTES) && key !== 'ambition' && !lowerIsBetter;
    let description = 'ไม่มีข้อมูล';
    let colorClass = 'text-muted';
    if (valid) {
      description = key === 'ambition'
        ? 'ความทะเยอทะยานสูงอาจช่วยผลักดันความก้าวหน้า แต่ก็อาจอยากย้ายไปสโมสรที่ใหญ่กว่า'
        : lowerIsBetter ? 'ค่าต่ำเป็นผลดี' : higherIsBetter ? 'ค่าสูงเป็นผลดี' : 'ไม่มีเกณฑ์ประเมินสี';
      if (higherIsBetter || lowerIsBetter) {
        const benefit = lowerIsBetter ? 21 - value : value;
        colorClass = benefit >= 15 ? 'text-green' : benefit <= 6 ? 'text-orange' : '';
        description += benefit >= 15 ? ' · เป็นผลดี' : benefit <= 6 ? ' · ควรระวัง' : ' · ค่ากลาง';
      }
    }
    return `
      <div class="personality-item" title="${escapeHtml(description)}">
        <span class="personality-name">${escapeHtml(label)}</span>
        <span class="personality-val font-bold ${colorClass}" aria-label="${escapeHtml(label)}: ${valid ? value : 'ไม่มีข้อมูล'} · ${escapeHtml(description)}">${valid ? value : '–'}</span>
      </div>
    `;
  }).join('');
}
