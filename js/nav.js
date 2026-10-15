/** Compact phone nav: primary links stay visible; the rest live behind More below 600px. */

export const PRIMARY_NAV = Object.freeze(['Learn', 'Drill', 'Exam3', 'Final']);
export const MORE_NAV = Object.freeze([
  'Map',
  'Lab',
  'Build',
  'Cards',
  'Terms',
  'Videos',
  'Weak',
  'Prep',
]);

const MQ = '(max-width: 599px)';

function escapeAttr(value) {
  return typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape(value)
    : String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * @param {ParentNode} root
 * @param {{ matchMedia?: (query: string) => MediaQueryList, addWindowListener?: (type: string, fn: EventListener) => void }} [env]
 */
export function bindCompactNav(root, env = {}) {
  const nav = root.querySelector('[data-compact-nav]');
  const button = root.querySelector('#nav-more-btn');
  const panel = root.querySelector('#nav-more-panel');
  const list = root.querySelector('.site-nav-list');
  if (!nav || !button || !panel || !list) {
    return {
      open() {},
      close() {},
      isOpen() { return false; },
      syncRoute() {},
      isCompact() { return false; },
    };
  }

  const matchMedia = env.matchMedia
    ?? (typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia.bind(globalThis) : null);
  const addWindowListener = env.addWindowListener
    ?? ((type, fn) => {
      if (typeof globalThis.addEventListener === 'function') globalThis.addEventListener(type, fn);
    });

  const slotOrder = [...list.querySelectorAll('[data-nav-slot]')].map((el) => el.getAttribute('data-nav-slot'));
  const moreWrap = list.querySelector('.nav-more');
  let open = false;

  function isCompact() {
    if (!matchMedia) return true;
    return matchMedia(MQ).matches;
  }

  function findSlot(id) {
    const sel = `[data-nav-slot="${escapeAttr(id)}"]`;
    return panel.querySelector(sel) ?? list.querySelector(sel);
  }

  function moveToPanel() {
    for (const id of MORE_NAV) {
      const item = findSlot(id);
      if (item && item.parentNode !== panel) panel.append(item);
    }
  }

  function restoreToList() {
    if (!moreWrap) return;
    for (const id of slotOrder) {
      const item = findSlot(id);
      if (item) list.insertBefore(item, moreWrap);
    }
  }

  function setOpen(next) {
    open = Boolean(next) && isCompact();
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
    nav.classList.toggle('is-more-open', open);
  }

  function openMenu() {
    if (!isCompact()) return;
    moveToPanel();
    setOpen(true);
  }

  function closeMenu({ restoreFocus = false } = {}) {
    const wasOpen = open;
    setOpen(false);
    if (restoreFocus && wasOpen && typeof button.focus === 'function') button.focus();
  }

  function layout() {
    if (isCompact()) {
      moveToPanel();
      if (!open) panel.hidden = true;
      button.hidden = false;
    } else {
      closeMenu();
      restoreToList();
      panel.hidden = true;
      button.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-more-open');
    }
  }

  function syncRoute(routeId) {
    const inMore = MORE_NAV.includes(routeId);
    button.classList.toggle('nav-more-btn--active', Boolean(inMore && isCompact()));
    if (open) closeMenu();
  }

  button.addEventListener('click', (event) => {
    event.preventDefault();
    if (open) closeMenu();
    else openMenu();
  });

  panel.addEventListener('click', (event) => {
    const target = event.target;
    const link = typeof target?.closest === 'function' ? target.closest('a[data-nav]') : null;
    if (link) closeMenu();
  });

  addWindowListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      closeMenu({ restoreFocus: true });
    }
  });

  addWindowListener('hashchange', () => {
    if (open) closeMenu();
  });

  if (matchMedia) {
    const mq = matchMedia(MQ);
    const onChange = () => layout();
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else if (typeof mq.addListener === 'function') mq.addListener(onChange);
  }

  layout();

  return {
    open: openMenu,
    close: closeMenu,
    isOpen() { return open; },
    syncRoute,
    isCompact,
  };
}
