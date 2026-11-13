function createShortlist(storage) {
  const keyFor = ref => typeof ref === 'string' && ref.startsWith('#') ? `fm27.shortlist.${ref}` : null;
  const validId = id => Number.isSafeInteger(id) && id > 0;

  function read(ref) {
    const key = keyFor(ref);
    if (!key) return [];
    const saved = JSON.parse(storage.getItem(key) ?? '[]');
    return Array.isArray(saved) ? saved.filter(validId) : [];
  }

  return {
    read,
    toggle(ref, id) {
      const key = keyFor(ref);
      if (!key || !validId(id)) throw new Error('ยังระบุเซฟหรือนักเตะไม่ได้');
      const ids = new Set(read(ref));
      const added = !ids.delete(id);
      if (added) ids.add(id);
      storage.setItem(key, JSON.stringify([...ids]));
      return added;
    }
  };
}
