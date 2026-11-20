const { getContractEnd, addContractMonths } = require('./contractDates');
const ROLES = [
  ['GK', 'ผู้รักษาประตู', ['GK'], 2],
  ['DR', 'แบ็กขวา', ['DR', 'WBR'], 2],
  ['DC', 'เซ็นเตอร์แบ็ก', ['DC', 'SW'], 4],
  ['DL', 'แบ็กซ้าย', ['DL', 'WBL'], 2],
  ['DM', 'กลางรับ', ['DM'], 2],
  ['MC', 'กองกลาง', ['MC'], 3],
  ['AMR', 'ริมเส้นขวา', ['AMR', 'MR'], 2],
  ['AMC', 'กลางรุก', ['AMC'], 2],
  ['AML', 'ริมเส้นซ้าย', ['AML', 'ML'], 2],
  ['ST', 'กองหน้า', ['ST', 'FC'], 2]
];

function analyzeSquad(dump, previousRound) {
  const club = dump?.meta?.myClub?.trim();
  if (!club) return { status: dump ? 'no-club' : 'no-scan' };
  const roster = (dump.players ?? []).filter(player => player.club === club);
  if (!roster.length) return { status: 'empty', club };
  const hasSquadTypes = roster.some(player => player.teamType === 0);
  const squad = hasSquadTypes ? roster.filter(player => player.teamType === 0) : roster;
  const youth = roster.filter(({ age, teamType }) =>
    Number.isInteger(teamType) && teamType > 0 && Number.isInteger(age) && age > 0 && age <= 21);
  const prospects = [];
  const today = getContractEnd({ expires: dump.meta?.gameDate });
  const contractPlans = today ? [6, 12].map(months => ({
    months, cutoff: addContractMonths(today, months), slots: []
  })) : [];
  const primaryPosition = player =>
    (player.posNat?.[0] || player.posArr?.[0] || player.pos?.split(',')[0])?.trim().toUpperCase();
  const slots = ROLES.map(([id, label, positions, target]) => {
    const matches = player => positions.includes(primaryPosition(player));
    const players = squad.filter(matches).sort((a, b) => (b.ca || 0) - (a.ca || 0));
    const [starter, backup] = players;
    const contracts = players.map(player => ({ player, end: getContractEnd(player) }));
    const unknown = contracts.filter(({ end }) => !end).length;
    for (const plan of contractPlans) {
      const expiring = contracts.filter(({ end }) => end && end <= plan.cutoff)
        .sort((a, b) => a.end.localeCompare(b.end))
        .map(({ player, end }) => ({ id: player.id, name: player.name, end, wage: player.wage }));
      if (!expiring.length && !unknown) continue;
      const remaining = players.length - expiring.length - unknown;
      const replacements = expiring.length && remaining < target ? youth.filter(player => {
        const end = getContractEnd(player);
        return matches(player) && end && end > plan.cutoff;
      }).sort((a, b) => (b.ca || 0) - (a.ca || 0) || (b.pa || 0) - (a.pa || 0))
        .slice(0, 2).map(({ id, name, age, ca, pa }) => ({ id, name, age, ca, pa })) : [];
      plan.slots.push({ id, label, positions, target, count: players.length, remaining, unknown, expiring, replacements });
    }
    if (hasSquadTypes && starter?.ca > 0) {
      for (const prospect of youth.filter(matches)) {
        const nearBackup = backup?.ca > 0 && prospect.ca > 0 && prospect.ca >= backup.ca - 10;
        const starterPotential = prospect.pa > 0 && prospect.pa >= starter.ca;
        if (!nearBackup && !starterPotential) continue;
        const { id: playerId, name, age, ca, pa } = prospect;
        prospects.push({ id: playerId, name, age, ca, pa, position: id, label,
          nearBackup, starterPotential,
          starterCA: starter.ca, starterName: starter.name, reserveCA: backup?.ca ?? null, reserveName: backup?.name ?? null });
      }
    }
    const gap = Number.isFinite(starter?.ca) && Number.isFinite(backup?.ca) ? starter.ca - backup.ca : null;
    const thin = players.length < target;
    const wideGap = gap >= 20;
    const status = !starter ? 'empty' : thin || wideGap ? 'reinforce' : 'strong';
    return {
      id, label, positions, target, status, gap, thin, wideGap, count: players.length,
      players: players.map(({ id, name, ca }) => ({ id, name, ca }))
    };
  });
  prospects.sort((a, b) => Number(b.starterPotential) - Number(a.starterPotential) ||
    (b.pa || 0) - (a.pa || 0) || (b.ca || 0) - (a.ca || 0));
  const loanedPlayers = (dump.players ?? []).filter(player =>
    player.ownerClub === club && player.club && player.club !== club
  ).map(({ id, name, age, ca, pa, club: currentClub, div, ...player }) => {
    const position = primaryPosition(player);
    const slot = slots.find(item => item.positions.includes(position));
    const benchmark = hasSquadTypes ? slot?.players[1] ?? slot?.players[0] : null;
    const previousCA = previousRound?.players?.[id]?.ca;
    return { id, name, age, ca, pa, currentClub, div, position,
      caChange: previousCA > 0 && ca > 0 ? ca - previousCA : null,
      depth: hasSquadTypes && slot ? { count: slot.count, target: slot.target, benchmark } : null
    };
  }).sort((a, b) => (b.ca || 0) - (a.ca || 0) || (b.pa || 0) - (a.pa || 0));
  return { status: 'ok', club, squadSize: squad.length, hasSquadTypes, slots, prospects, contractPlans,
    loanedPlayers, loanComparisonDate: previousRound?.gameDate ?? null };
}

module.exports = { analyzeSquad };
