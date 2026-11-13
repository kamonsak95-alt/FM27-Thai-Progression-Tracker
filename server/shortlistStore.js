const fs = require('node:fs');
const path = require('node:path');
const { getHistoryFilePath } = require('./historyEngine');

const validRef = ref => typeof ref === 'string' && /^#[\w-]{1,64}$/.test(ref);
const cleanIds = ids => [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))];

function shortlist(ref, change) {
  if (!validRef(ref)) throw new TypeError('Invalid career reference');
  const file = path.join(path.dirname(getHistoryFilePath()), 'shortlist.json');
  let store = {};
  try {
    store = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const existing = Object.hasOwn(store, ref);
  const ids = new Set(existing ? store[ref] : []);
  if (!change) return { ids: [...ids], exists: existing };

  if (change.action === 'toggle') {
    const [id] = cleanIds([change.id]);
    if (!id) throw new TypeError('Invalid player ID');
    if (!ids.delete(id)) ids.add(id);
  } else if (change.action === 'seed' && Array.isArray(change.ids)) {
    if (existing) return { ids: [...ids], exists: true };
    for (const id of cleanIds(change.ids)) ids.add(id);
  } else {
    throw new TypeError('Invalid shortlist action');
  }
  store[ref] = [...ids];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(store));
  fs.renameSync(temp, file);
  return { ids: store[ref], exists: true };
}

module.exports = { shortlist, validRef };
