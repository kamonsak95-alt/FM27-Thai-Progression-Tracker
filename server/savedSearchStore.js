const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { getHistoryFilePath } = require('./historyEngine');

function savedSearches(change) {
  const file = path.join(path.dirname(getHistoryFilePath()), 'saved-searches.json');
  let searches = new Map();
  try {
    searches = new Map(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!change) return [...searches];

  const validName = name => typeof name === 'string' && name.trim() === name && name.length > 0 && name.length <= 100;
  function put(name, value, overwrite) {
    if (!validName(name) || !value?.filters || typeof value.filters !== 'object' ||
        !['positions', 'attributes', 'divisions', 'transfer'].every(key => Array.isArray(value[key]))) {
      throw new TypeError('Invalid saved search');
    }
    if (overwrite || !searches.has(name)) searches.set(name, value);
  }
  if (change.action === 'save') put(change.name, change.value, true);
  else if (change.action === 'delete' && validName(change.name)) searches.delete(change.name);
  else if (change.action === 'import' && Array.isArray(change.entries)) {
    for (const [name, value] of change.entries) put(name, value, false);
  } else throw new TypeError('Invalid saved search action');

  const entries = [...searches];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.' + randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temp, JSON.stringify(entries));
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
  return entries;
}

module.exports = { savedSearches };
