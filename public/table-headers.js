// Keep the original sortable headers inside their horizontal scroll containers.
(() => {
  const appHeader = document.querySelector('.app-header');
  const tables = [...document.querySelectorAll('#players-table, #staff-table')];
  let scheduled = false;

  function update() {
    scheduled = false;
    const top = Math.max(0, appHeader.getBoundingClientRect().bottom);
    const positions = tables.map(table => {
      const bounds = table.getBoundingClientRect();
      const heading = table.tHead;
      const height = heading.getBoundingClientRect().height;
      const offset = bounds.height ? Math.max(0, Math.min(top - bounds.top, bounds.height - height)) : 0;
      return { heading, offset };
    });
    for (const { heading, offset } of positions) {
      heading.style.transform = `translateY(${offset}px)`;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  const observer = new ResizeObserver(schedule);
  for (const element of [appHeader, document.querySelector('.app-main'), ...tables]) {
    if (element) observer.observe(element);
  }
  schedule();
})();
