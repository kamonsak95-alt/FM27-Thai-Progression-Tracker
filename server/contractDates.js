function getContractEnd(player) {
  const value = player.expires;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

function addContractMonths(date, months) {
  const start = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(+start)) return null;
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() + months);
  const last = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, last));
  return start.toISOString().slice(0, 10);
}

module.exports = { getContractEnd, addContractMonths };
