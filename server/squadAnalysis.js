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

function analyzeSquad(dump) {
  const club = dump?.meta?.myClub?.trim();
  if (!club) return { status: dump ? 'no-club' : 'no-scan' };
  const roster = (dump.players ?? []).filter(player => player.club === club);
  if (!roster.length) return { status: 'empty', club };
  const hasSquadTypes = roster.some(player => player.teamType === 0);
  const squad = hasSquadTypes ? roster.filter(player => player.teamType === 0) : roster;
  const youth = roster.filter(({ age, teamType }) =>
    Number.isInteger(teamType) && teamType > 0 && Number.isInteger(age) && age > 0 && age <= 21);
  const prospects = [];
  const slots = ROLES.map(([id, label, positions, target]) => {
    const matches = player => {
      const primary = player.posNat?.[0] || player.posArr?.[0] || player.pos?.split(',')[0];
      return positions.includes(primary?.trim().toUpperCase());
    };
    const players = squad.filter(matches).sort((a, b) => (b.ca || 0) - (a.ca || 0));
    const [starter, backup] = players;
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
  return { status: 'ok', club, squadSize: squad.length, hasSquadTypes, slots, prospects };
}

module.exports = { analyzeSquad };
