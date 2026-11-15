const STAFF_ATTR_MAP = {
  Aanvallen: { key: 'attacking', nameTh: 'การฝึกสอนเกมรุก', nameEn: 'Attacking' },
  Verdedigen: { key: 'defending', nameTh: 'การฝึกสอนเกมรับ', nameEn: 'Defending' },
  Fitheid: { key: 'fitness', nameTh: 'การฝึกสอนฟิตเนส', nameEn: 'Fitness' },
  Balbezit: { key: 'possession', nameTh: 'การฝึกสอนครองบอล', nameEn: 'Possession' },
  Technisch: { key: 'technical', nameTh: 'การฝึกสอนเทคนิค', nameEn: 'Technical' },
  Tactisch: { key: 'tactical', nameTh: 'การฝึกสอนแท็กติก', nameEn: 'Tactical' },
  Standaardsituaties: { key: 'setPieces', nameTh: 'การฝึกสอนลูกตั้งเตะ', nameEn: 'Set Pieces' },
  Vastberadenheid: { key: 'determination', nameTh: 'ความมุ่งมั่น', nameEn: 'Determination' },
  'Man-management': { key: 'manManagement', nameTh: 'การบริหารจัดการคน', nameEn: 'Man Management' },
  Motiveren: { key: 'motivating', nameTh: 'การจูงใจ / ปลุกใจ', nameEn: 'Motivating' },
  Oordeel_vermogen: { key: 'jpa', nameTh: 'การประเมินความสามารถ (JPA)', nameEn: 'Judging Player Ability' },
  Oordeel_potentie: { key: 'jpp', nameTh: 'การประเมินศักยภาพ (JPP)', nameEn: 'Judging Player Potential' },
  Oordeel_staf: { key: 'judgingStaff', nameTh: 'การประเมินทีมงาน', nameEn: 'Judging Staff' },
  Onderhandelen: { key: 'negotiating', nameTh: 'การเจรจาต่อรอง', nameEn: 'Negotiating' },
  Tactische_kennis: { key: 'tacticalKnowledge', nameTh: 'ความรู้ด้านแท็กติก', nameEn: 'Tactical Knowledge' },
  Fysiotherapie: { key: 'physiotherapy', nameTh: 'กายภาพบำบัด', nameEn: 'Physiotherapy' },
  Sportwetenschap: { key: 'sportsScience', nameTh: 'วิทยาศาสตร์การกีฬา', nameEn: 'Sports Science' },
  Data_analyse: { key: 'dataAnalysis', nameTh: 'การวิเคราะห์ข้อมูล', nameEn: 'Data Analysis' },
  Jeugd: { key: 'workingWithYoungsters', nameTh: 'การทำงานกับเยาวชน', nameEn: 'Working with Youngsters' },
  KV_distributie: { key: 'gkDistribution', nameTh: 'การเปิดบอลผู้รักษาประตู', nameEn: 'GK Distribution' },
  KV_vangen: { key: 'gkHandling', nameTh: 'การรับบอลผู้รักษาประตู', nameEn: 'GK Handling' },
  KV_reflexen: { key: 'gkReflexes', nameTh: 'การป้องกันลูกยิงผู้รักษาประตู', nameEn: 'GK Shot Stopping' },
  Aanpassingsvermogen: { key: 'adaptability', nameTh: 'การปรับตัว', nameEn: 'Adaptability' }
};

const JOB_TITLE_MAP = {
  'Manager': { roleId: 'manager', category: 'coaching', nameTh: 'ผู้จัดการทีม', nameEn: 'Manager' },
  'Assistent-manager': { roleId: 'assistant_manager', category: 'coaching', nameTh: 'ผู้ช่วยผู้จัดการทีม', nameEn: 'Assistant Manager' },
  'Hoofd jeugdopleiding': { roleId: 'hoyd', category: 'coaching', nameTh: 'หัวหน้าฝ่ายพัฒนาเยาวชน', nameEn: 'Head of Youth Development' },
  'Trainer': { roleId: 'coach', category: 'coaching', nameTh: 'โค้ช', nameEn: 'Coach' },
  'Keeperstrainer': { roleId: 'gk_coach', category: 'coaching', nameTh: 'โค้ชผู้รักษาประตู', nameEn: 'Goalkeeping Coach' },
  'Conditietrainer': { roleId: 'fitness_coach', category: 'coaching', nameTh: 'โค้ชฟิตเนส', nameEn: 'Fitness Coach' },
  'Hoofd performance analyse': { roleId: 'head_perf_analyst', category: 'coaching', nameTh: 'หัวหน้านักวิเคราะห์ผลงาน', nameEn: 'Head of Performance Analysis' },
  'Prestatie analist': { roleId: 'perf_analyst', category: 'coaching', nameTh: 'นักวิเคราะห์ผลงาน', nameEn: 'Performance Analyst' },
  'Media-analist': { roleId: 'perf_analyst', category: 'coaching', nameTh: 'นักวิเคราะห์ผลงาน', nameEn: 'Performance Analyst' },
  'Directeur voetbalzaken': { roleId: 'dof', category: 'recruitment', nameTh: 'ผู้อำนวยการฟุตบอล', nameEn: 'Director of Football' },
  'Technisch directeur': { roleId: 'technical_director', category: 'recruitment', nameTh: 'ผู้อำนวยการฝ่ายเทคนิค', nameEn: 'Technical Director' },
  'Scout': { roleId: 'scout', category: 'recruitment', nameTh: 'แมวมอง', nameEn: 'Scout' },
  'Hoofdscout': { roleId: 'scout', category: 'recruitment', nameTh: 'หัวหน้าแมวมอง (Chief Scout)', nameEn: 'Chief Scout' },
  'Analist rekrutering': { roleId: 'recruitment_analyst', category: 'recruitment', nameTh: 'นักวิเคราะห์การสรรหา', nameEn: 'Recruitment Analyst' },
  '(Ver)huurmanager': { roleId: 'loan_manager', category: 'recruitment', nameTh: 'ผู้จัดการฝ่ายยืมตัว', nameEn: 'Loan Manager' },
  'Fysiotherapeut': { roleId: 'physio', category: 'medical', nameTh: 'นักกายภาพบำบัด', nameEn: 'Physiotherapist' },
  'Hoofd fysiotherapie': { roleId: 'physio', category: 'medical', nameTh: 'หัวหน้านักกายภาพบำบัด', nameEn: 'Head Physio' },
  'Arts': { roleId: 'physio', category: 'medical', nameTh: 'แพทย์ประจำสโมสร', nameEn: 'Club Doctor' },
  'Clubarts': { roleId: 'physio', category: 'medical', nameTh: 'แพทย์ประจำสโมสร', nameEn: 'Club Doctor' },
  'Sportwetenschapper': { roleId: 'sports_scientist', category: 'medical', nameTh: 'นักวิทยาศาสตร์การกีฬา', nameEn: 'Sports Scientist' },
  'Hoofd sportwetenschap': { roleId: 'sports_scientist', category: 'medical', nameTh: 'หัวหน้านักวิทยาศาสตร์การกีฬา', nameEn: 'Head of Sports Science' }
};

// 16 Roles grouped into 3 Categories matching FM Thai UI Screenshots
const ROLES_DEF = [
  // หมวด 1: การฝึกสอน (Coaching)
  {
    id: 'manager',
    category: 'coaching',
    nameTh: 'ผู้จัดการทีม',
    nameEn: 'Manager',
    match: s => s.job === 'Manager' || (!s.club && (s.prefJob || []).includes(0))
  },
  {
    id: 'assistant_manager',
    category: 'coaching',
    nameTh: 'ผู้ช่วยผู้จัดการทีม',
    nameEn: 'Assistant Manager',
    match: s => s.job === 'Assistent-manager' || (!s.club && (s.prefJob || []).includes(1))
  },
  {
    id: 'hoyd',
    category: 'coaching',
    nameTh: 'หัวหน้าฝ่ายพัฒนาเยาวชน',
    nameEn: 'Head of Youth Development',
    match: s => s.job === 'Hoofd jeugdopleiding' || (!s.club && (s.prefJob || []).includes(9) && (s.staffAttrs?.Jeugd || 0) >= 12)
  },
  {
    id: 'coach',
    category: 'coaching',
    nameTh: 'โค้ช',
    nameEn: 'Coach',
    match: s => s.job === 'Trainer' || (!s.club && (s.prefJob || []).includes(2))
  },
  {
    id: 'gk_coach',
    category: 'coaching',
    nameTh: 'โค้ชผู้รักษาประตู',
    nameEn: 'Goalkeeping Coach',
    match: s => s.job === 'Keeperstrainer' || (!s.club && (s.prefJob || []).includes(5))
  },
  {
    id: 'set_piece_coach',
    category: 'coaching',
    nameTh: 'โค้ชลูกตั้งเตะ',
    nameEn: 'Set Piece Coach',
    match: s => (s.staffAttrs?.Standaardsituaties || 0) >= 14 || (s.job === 'Trainer' && (s.staffAttrs?.Standaardsituaties || 0) >= 13)
  },
  {
    id: 'fitness_coach',
    category: 'coaching',
    nameTh: 'โค้ชฟิตเนส',
    nameEn: 'Fitness Coach',
    match: s => s.job === 'Conditietrainer' || (!s.club && (s.prefJob || []).includes(6))
  },
  {
    id: 'head_perf_analyst',
    category: 'coaching',
    nameTh: 'หัวหน้านักวิเคราะห์ผลงาน',
    nameEn: 'Head of Performance Analysis',
    match: s => s.job === 'Hoofd performance analyse'
  },
  {
    id: 'perf_analyst',
    category: 'coaching',
    nameTh: 'นักวิเคราะห์ผลงาน',
    nameEn: 'Performance Analyst',
    match: s => s.job === 'Prestatie analist' || s.job === 'Media-analist' || (!s.club && (s.prefJob || []).includes(12))
  },

  // หมวด 2: ทีมสรรหานักเตะ (Recruitment)
  {
    id: 'dof',
    category: 'recruitment',
    nameTh: 'ผู้อำนวยการฟุตบอล',
    nameEn: 'Director of Football',
    match: s => s.job === 'Directeur voetbalzaken' || (!s.club && (s.prefJob || []).includes(10))
  },
  {
    id: 'technical_director',
    category: 'recruitment',
    nameTh: 'ผู้อำนวยการฝ่ายเทคนิค',
    nameEn: 'Technical Director',
    match: s => s.job === 'Technisch directeur' || (!s.club && (s.prefJob || []).includes(14))
  },
  {
    id: 'scout',
    category: 'recruitment',
    nameTh: 'แมวมอง',
    nameEn: 'Scout / Chief Scout',
    match: s => s.job === 'Scout' || s.job === 'Hoofdscout' || (!s.club && (s.prefJob || []).includes(4))
  },
  {
    id: 'recruitment_analyst',
    category: 'recruitment',
    nameTh: 'นักวิเคราะห์การสรรหา',
    nameEn: 'Recruitment Analyst',
    match: s => s.job === 'Analist rekrutering'
  },
  {
    id: 'loan_manager',
    category: 'recruitment',
    nameTh: 'ผู้จัดการฝ่ายยืมตัว',
    nameEn: 'Loan Manager',
    match: s => s.job === '(Ver)huurmanager' || (!s.club && (s.prefJob || []).includes(11))
  },

  // หมวด 3: การแพทย์ (Medical)
  {
    id: 'physio',
    category: 'medical',
    nameTh: 'นักกายภาพบำบัด',
    nameEn: 'Physiotherapist',
    match: s => ['Fysiotherapeut', 'Hoofd fysiotherapie', 'Arts', 'Clubarts'].includes(s.job) || (!s.club && (s.staffAttrs?.Fysiotherapie || 0) >= 12)
  },
  {
    id: 'sports_scientist',
    category: 'medical',
    nameTh: 'นักวิทยาศาสตร์การกีฬา',
    nameEn: 'Sports Scientist',
    match: s => ['Sportwetenschapper', 'Hoofd sportwetenschap'].includes(s.job) || (!s.club && (s.staffAttrs?.Sportwetenschap || 0) >= 12)
  }
];

const CATEGORIES_DEF = [
  { id: 'coaching', nameTh: 'การฝึกสอน', nameEn: 'Coaching' },
  { id: 'recruitment', nameTh: 'ทีมสรรหานักเตะ', nameEn: 'Recruitment' },
  { id: 'medical', nameTh: 'การแพทย์', nameEn: 'Medical' }
];

/**
 * Calculates coaching rating and stars (1.0 to 5.0)
 */
const TRAINING_LABELS = {
  attacking: 'เกมรุก', defending: 'เกมรับ', possession: 'ครองบอล',
  fitness: 'ฟิตเนส', goalkeeping: 'ผู้รักษาประตู',
  attTac: 'เกมรุก · แท็กติก', attTech: 'เกมรุก · เทคนิค',
  defTac: 'เกมรับ · แท็กติก', defTech: 'เกมรับ · เทคนิค',
  posTac: 'ครองบอล · แท็กติก', posTech: 'ครองบอล · เทคนิค',
  gkHandling: 'ผู้รักษาประตู · รับบอล', gkShotStop: 'ผู้รักษาประตู · เซฟลูกยิง'
};

function calculateCoachingRating(s) {
  const a = s.staffAttrs || {};
  const dtm = (a.Vastberadenheid || 10) + (a.Motiveren || 10) + 10;
  
  const categories = {
    attTac: (a.Aanvallen || 0) * 8 + (a.Tactisch || 0) * 6 + dtm,
    attTech: (a.Aanvallen || 0) * 8 + (a.Technisch || 0) * 6 + dtm,
    defTac: (a.Verdedigen || 0) * 8 + (a.Tactisch || 0) * 6 + dtm,
    defTech: (a.Verdedigen || 0) * 8 + (a.Technisch || 0) * 6 + dtm,
    posTac: (a.Balbezit || 0) * 8 + (a.Tactisch || 0) * 6 + dtm,
    posTech: (a.Balbezit || 0) * 8 + (a.Technisch || 0) * 6 + dtm,
    fitness: (a.Fitheid || 0) * 9 + dtm,
    gkHandling: (a.KV_vangen || 0) * 8 + (a.Tactisch || 0) * 6 + dtm,
    gkShotStop: (a.KV_reflexen || 0) * 8 + (a.Tactisch || 0) * 6 + dtm
  };

  const ratings = {
    attacking: Math.max(categories.attTac, categories.attTech),
    defending: Math.max(categories.defTac, categories.defTech),
    possession: Math.max(categories.posTac, categories.posTech),
    fitness: categories.fitness,
    goalkeeping: Math.max(categories.gkHandling, categories.gkShotStop),
    ...categories
  };
  const bestScore = Math.max(...Object.values(ratings));
  const toStars = score => Math.max(1.5, Math.min(5, Math.floor(score / 30) * .5 + .5));
  const stars = toStars(bestScore);
  const trainingStars = Object.fromEntries(Object.entries(ratings).map(([key, score]) => [key, toStars(score)]));
  return { bestScore, stars, starsFormatted: stars.toFixed(1), trainingStars };
}

const PREF_JOB_ROLE_MAP = {
  0: 'manager',
  1: 'assistant_manager',
  2: 'coach',
  4: 'scout',
  5: 'gk_coach',
  6: 'fitness_coach',
  9: 'hoyd',
  10: 'dof',
  11: 'loan_manager',
  12: 'perf_analyst',
  14: 'technical_director'
};

/**
 * Determines the best matching primary role for a staff member
 */
function resolveStaffRole(s) {
  // 1. If staff has a specific job title in club, map directly
  if (s.job && JOB_TITLE_MAP[s.job]) {
    return JOB_TITLE_MAP[s.job];
  }

  // 2. If free agent, check preferred job order (s.prefJob)
  if (!s.club && Array.isArray(s.prefJob) && s.prefJob.length > 0) {
    for (const jobCode of s.prefJob) {
      const roleId = PREF_JOB_ROLE_MAP[jobCode];
      if (roleId) {
        const role = ROLES_DEF.find(r => r.id === roleId);
        if (role) {
          return {
            roleId: role.id,
            category: role.category,
            nameTh: role.nameTh,
            nameEn: role.nameEn
          };
        }
      }
    }
  }

  // 3. Fallback to medical attributes if high
  if ((s.staffAttrs?.Fysiotherapie || 0) >= 12) {
    const role = ROLES_DEF.find(r => r.id === 'physio');
    return { roleId: role.id, category: role.category, nameTh: role.nameTh, nameEn: role.nameEn };
  }
  if ((s.staffAttrs?.Sportwetenschap || 0) >= 12) {
    const role = ROLES_DEF.find(r => r.id === 'sports_scientist');
    return { roleId: role.id, category: role.category, nameTh: role.nameTh, nameEn: role.nameEn };
  }

  // 4. Otherwise match against ROLES_DEF
  for (const r of ROLES_DEF) {
    if (r.match(s)) {
      return {
        roleId: r.id,
        category: r.category,
        nameTh: r.nameTh,
        nameEn: r.nameEn
      };
    }
  }

  return {
    roleId: 'coach',
    category: 'coaching',
    nameTh: 'เจ้าหน้าที่ทีมงาน',
    nameEn: 'Staff Member'
  };
}

/**
 * Maps reputation to Thai label
 */
function getReputationLabel(rep) {
  const r = rep || 0;
  if (r >= 7000) return { label: 'ระดับโลก (World Class)', badge: 'rep-world', stars: '⭐⭐⭐⭐⭐' };
  if (r >= 5000) return { label: 'ระดับทวีป (Continental)', badge: 'rep-continental', stars: '⭐⭐⭐⭐' };
  if (r >= 3500) return { label: 'ระดับประเทศ (National)', badge: 'rep-national', stars: '⭐⭐⭐' };
  if (r >= 2000) return { label: 'ระดับภูมิภาค (Regional)', badge: 'rep-regional', stars: '⭐⭐' };
  return { label: 'ระดับท้องถิ่น (Local)', badge: 'rep-local', stars: '⭐' };
}

/**
 * Normalizes raw staff item into clean frontend format
 */
function normalizeStaff(s) {
  const role = resolveStaffRole(s);
  const coachRating = calculateCoachingRating(s);
  const rep = getReputationLabel(s.worldRep || s.curRep);
  const a = s.staffAttrs || {};

  return {
    id: s.id,
    name: s.name,
    age: s.age || 0,
    club: s.club || null,
    isFreeAgent: !s.club,
    div: s.div || null,
    nat: s.nat || [],
    ca: s.ca || 0,
    pa: s.pa || 0,
    wage: s.wage || 0,
    expires: s.expires || null,
    curRep: s.curRep || 0,
    worldRep: s.worldRep || 0,
    repLabel: rep.label,
    repStars: rep.stars,
    roleId: role.roleId,
    roleCategory: role.category,
    roleTh: role.nameTh,
    roleEn: role.nameEn,
    coachStars: coachRating.stars,
    coachStarsFormatted: coachRating.starsFormatted,
    // Key attributes summary
    keySkills: {
      attacking: a.Aanvallen || 0,
      defending: a.Verdedigen || 0,
      fitness: a.Fitheid || 0,
      tactical: a.Tactisch || 0,
      technical: a.Technisch || 0,
      jpa: a.Oordeel_vermogen || 0,
      jpp: a.Oordeel_potentie || 0,
      physiotherapy: a.Fysiotherapie || 0,
      sportsScience: a.Sportwetenschap || 0,
      youngsters: a.Jeugd || 0,
      determination: a.Vastberadenheid || 0,
      motivating: a.Motiveren || 0,
      manManagement: a['Man-management'] || 0
    }
  };
}

/**
 * Filters and paginates staff array
 */
function filterStaff(staffList, query = {}, skills = []) {
  let result = staffList;

  // Search by name
  const q = (query.q || '').trim().toLowerCase();
  if (q) {
    result = result.filter(s => s.name && s.name.toLowerCase().includes(q));
  }

  // Category filter (coaching, recruitment, medical)
  const cat = (query.category || '').trim().toLowerCase();
  if (cat && cat !== 'any' && cat !== 'all') {
    result = result.filter(s => resolveStaffRole(s).category === cat);
  }

  // Role filter (specific roleId)
  const roleId = (query.role || '').trim().toLowerCase();
  if (roleId && roleId !== 'any' && roleId !== 'all') {
    result = result.filter(s => resolveStaffRole(s).roleId === roleId);
  }

  // Employment status filter (unemployed, employed)
  const status = (query.status || '').trim().toLowerCase();
  if (status === 'unemployed' || status === 'free') {
    result = result.filter(s => !s.club);
  } else if (status === 'employed') {
    result = result.filter(s => Boolean(s.club));
  }

  // Reputation filter
  const rep = (query.rep || '').trim().toLowerCase();
  if (rep && rep !== 'any' && rep !== 'all') {
    if (rep === 'world') result = result.filter(s => (s.worldRep || s.curRep || 0) >= 7000);
    else if (rep === 'continental') result = result.filter(s => (s.worldRep || s.curRep || 0) >= 5000 && (s.worldRep || s.curRep || 0) < 7000);
    else if (rep === 'national') result = result.filter(s => (s.worldRep || s.curRep || 0) >= 3500 && (s.worldRep || s.curRep || 0) < 5000);
    else if (rep === 'regional') result = result.filter(s => (s.worldRep || s.curRep || 0) >= 2000 && (s.worldRep || s.curRep || 0) < 3500);
  }

  // Age Range
  const minAge = parseInt(query.minAge, 10);
  const maxAge = parseInt(query.maxAge, 10);
  if (!isNaN(minAge)) result = result.filter(s => typeof s.age === 'number' && s.age >= minAge && s.age > 0);
  if (!isNaN(maxAge)) result = result.filter(s => typeof s.age === 'number' && s.age <= maxAge && s.age > 0);

  // CA Range
  const minCA = parseInt(query.minCA, 10);
  const maxCA = parseInt(query.maxCA, 10);
  if (!isNaN(minCA)) result = result.filter(s => (s.ca || 0) >= minCA);
  if (!isNaN(maxCA)) result = result.filter(s => (s.ca || 0) <= maxCA);

  // PA Range
  const minPA = parseInt(query.minPA, 10);
  const maxPA = parseInt(query.maxPA, 10);
  if (!isNaN(minPA)) result = result.filter(s => (s.pa || 0) >= minPA);
  if (!isNaN(maxPA)) result = result.filter(s => (s.pa || 0) <= maxPA);

  // Presets
  const preset = (query.preset || '').trim().toLowerCase();
  const coachingRatings = new Map();
  function coachingRating(staff) {
    if (!coachingRatings.has(staff)) coachingRatings.set(staff, calculateCoachingRating(staff));
    return coachingRatings.get(staff);
  }
  if (skills.length) result = result.filter(s => skills.every(([key, minimum]) => (s.staffAttrs?.[key] ?? 0) >= minimum));
  const maxWage = Number(query.maxWage);
  if (Number.isSafeInteger(maxWage) && maxWage > 0) {
    result = result.filter(s => Number.isFinite(s.wage) && s.wage > 0 && s.wage <= maxWage);
  }
  const minStars = Number(query.minTrainingStars);
  if ((!query.training || Object.hasOwn(TRAINING_LABELS, query.training)) &&
      minStars >= 1.5 && minStars <= 5 && minStars % .5 === 0) {
    result = result.filter(s => {
      const rating = coachingRating(s);
      return (query.training ? rating.trainingStars[query.training] : rating.stars) >= minStars;
    });
  }
  if (preset === 'five_star') {
    result = result.filter(s => coachingRating(s).stars >= 4.5);
  } else if (preset === 'hoyd') {
    result = result.filter(s => (s.staffAttrs?.Jeugd || 0) >= 16 && (s.staffAttrs?.Oordeel_potentie || 0) >= 15);
  } else if (preset === 'diamond_scout' || preset === 'scout_elite') {
    result = result.filter(s => (s.staffAttrs?.Oordeel_vermogen || 0) >= 18 && (s.staffAttrs?.Oordeel_potentie || 0) >= 18);
  } else if (preset === 'god_physio' || preset === 'physio_elite') {
    result = result.filter(s => (s.staffAttrs?.Fysiotherapie || 0) >= 18);
  } else if (preset === 'free_agents') {
    result = result.filter(s => !s.club);
  } else if (preset === 'myclub' && query.myClub) {
    result = result.filter(s => s.club === query.myClub);
  }

  // Sorting
  const sortBy = query.sort || 'ca';
  const order = query.order === 'asc' ? 1 : -1;

  result.sort((a, b) => {
    let va = a[sortBy];
    let vb = b[sortBy];

    if (sortBy === 'role') {
      va = resolveStaffRole(a).nameTh;
      vb = resolveStaffRole(b).nameTh;
    } else if (sortBy === 'rep') {
      va = a.worldRep || a.curRep || 0;
      vb = b.worldRep || b.curRep || 0;
    } else if (sortBy === 'coachStars') {
      va = coachingRating(a).bestScore;
      vb = coachingRating(b).bestScore;
    } else if (sortBy === 'jpa') {
      va = a.staffAttrs?.Oordeel_vermogen || 0;
      vb = b.staffAttrs?.Oordeel_vermogen || 0;
    } else if (sortBy === 'jpp') {
      va = a.staffAttrs?.Oordeel_potentie || 0;
      vb = b.staffAttrs?.Oordeel_potentie || 0;
    } else if (sortBy === 'physio') {
      va = a.staffAttrs?.Fysiotherapie || 0;
      vb = b.staffAttrs?.Fysiotherapie || 0;
    } else if (sortBy === 'club') {
      va = a.club || '';
      vb = b.club || '';
    } else if (sortBy === 'name') {
      va = a.name || '';
      vb = b.name || '';
    } else if (sortBy === 'age') {
      va = a.age || 0;
      vb = b.age || 0;
    }

    if (va == null) va = typeof vb === 'string' ? '' : -9999;
    if (vb == null) vb = typeof va === 'string' ? '' : -9999;
    if (typeof va === 'string') return order * va.localeCompare(vb, 'th');
    return order * (va - vb);
  });

  const total = result.length;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(10, parseInt(query.limit, 10) || 50));
  const offset = (page - 1) * limit;

  const paginated = result.slice(offset, offset + limit).map(normalizeStaff);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    staff: paginated
  };
}

/**
 * Gets full staff details for modal
 */
const STAFF_SKILL_GROUPS = {
  coaching: [
    ["Aanvallen","การฝึกสอนเกมรุก (Attacking)"],
    ["Verdedigen","การฝึกสอนเกมรับ (Defending)"],
    ["Fitheid","การฝึกสอนฟิตเนส (Fitness)"],
    ["Balbezit","การครองบอล (Possession)"],
    ["Technisch","การฝึกสอนเทคนิค (Technical)"],
    ["Tactisch","การฝึกสอนแท็กติก (Tactical)"],
    ["Standaardsituaties","ลูกตั้งเตะ (Set Pieces)"],
    ["KV_distributie","การเปิดบอลโกล (GK Distribution)"],
    ["KV_vangen","การรับบอลโกล (GK Handling)"],
    ["KV_reflexen","การเซฟลูกยิงโกล (GK Shot Stopping)"]
  ],
  mental: [
    ["Vastberadenheid","ความมุ่งมั่น (Determination)"],
    ["Man-management","การบริหารคน (Man Management)"],
    ["Motiveren","การจูงใจ / ปลุกใจ (Motivating)"],
    ["Aanpassingsvermogen","การปรับตัว (Adaptability)"],
    ["Tactische_kennis","ความรู้ด้านแท็กติก (Tactical Knowledge)"]
  ],
  scouting: [
    ["Oordeel_vermogen","ประเมินความสามารถนักเตะ (JPA)"],
    ["Oordeel_potentie","ประเมินศักยภาพนักเตะ (JPP)"],
    ["Oordeel_staf","ประเมินทีมงาน (Judging Staff)"],
    ["Onderhandelen","การเจรจาต่อรอง (Negotiating)"],
    ["Jeugd","ทำงานกับเยาวชน (Youngsters)"]
  ],
  medical: [
    ["Fysiotherapie","กายภาพบำบัด (Physiotherapy)"],
    ["Sportwetenschap","วิทยาศาสตร์การกีฬา (Sports Science)"],
    ["Data_analyse","การวิเคราะห์ข้อมูล (Data Analysis)"]
  ]
};


function getStaffDetail(staffList, id) {
  const s = staffList.find(x => x.id === id);
  if (!s) return null;

  const norm = normalizeStaff(s);
  const rawAttrs = s.staffAttrs || {};

  const attrGroups = Object.fromEntries(Object.entries(STAFF_SKILL_GROUPS).map(([group, skills]) =>
    [group, skills.map(([key, nameTh]) => ({ nameTh, val: rawAttrs[key] ?? 0 }))]));

  return {
    ...norm,
    birthYear: Number.isInteger(s.birthYear) && s.birthYear > 0 ? s.birthYear : null,
    attrGroups,
    trainingStars: calculateCoachingRating(s).trainingStars,
    trainingLabels: TRAINING_LABELS,
    personality: {
      ambition: s.ambition || 10,
      loyalty: s.loyalty || 10,
      professionalism: s.professionalism || 10,
      pressure: s.pressure || 10,
      sportsmanship: s.sportsmanship || 10,
      temperament: s.temperament || 10,
      controversy: s.controversy || 10
    }
  };
}

module.exports = {
  STAFF_SKILL_GROUPS,
  TRAINING_LABELS,
  ROLES_DEF,
  CATEGORIES_DEF,
  JOB_TITLE_MAP,
  STAFF_ATTR_MAP,
  normalizeStaff,
  calculateCoachingRating,
  getReputationLabel,
  filterStaff,
  getStaffDetail
};
