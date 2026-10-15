import { bindFocusModeKeys, enterFocusMode, exitFocusMode, focusModeIsOn } from './focus.js';
import { buildIndex, search } from './rank.js';
import { loadRecords } from './records.js';

const KIND_LABEL = { lesson: 'Lesson', problem: 'Problem', term: 'Term' };

export function announcementFor(results) {
  if (!results || results.length === 0) return 'No matches.';
  const noun = results.length === 1 ? 'result' : 'results';
  return `${results.length} ${noun}. ${results[0].title}`;
}

export function isTypingContext(target) {
  if (!target) return false;
  const tag = String(target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return Boolean(target.isContentEditable);
}

/** Slash focuses search unless the student is already typing in a field. */
export function handleShortcut(event, input) {
  if (!event || event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return false;
  if (isTypingContext(event.target)) return false;
  event.preventDefault?.();
  input?.focus?.();
  return true;
}

/**
 * Mount a labeled search field, an aria-live result count, and the focus-mode toggle.
 * @param {Document} doc
 * @param {{ load?: () => Promise<object[]> }} [options]
 */
export function mountSearch(doc, options = {}) {
  if (!doc?.createElement || !doc.body) return null;

  const tools = doc.createElement('div');
  tools.className = 'mm-tools';

  const root = doc.createElement('div');
  root.className = 'mm-search';

  const form = doc.createElement('form');
  form.setAttribute('role', 'search');
  form.addEventListener('submit', (event) => event.preventDefault?.());

  const label = doc.createElement('label');
  label.setAttribute('for', 'mm-search-input');
  label.textContent = 'Search';

  const input = doc.createElement('input');
  input.id = 'mm-search-input';
  input.type = 'search';
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('aria-controls', 'mm-search-results');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');

  const live = doc.createElement('p');
  live.id = 'mm-search-status';
  live.className = 'mm-search-status';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');

  const list = doc.createElement('ul');
  list.id = 'mm-search-results';
  list.className = 'mm-search-results';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Search results');
  setHidden(list, true);

  form.append(label, input);
  root.append(form, live, list);

  const toggle = doc.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mm-focus-toggle';
  toggle.setAttribute('data-mm-focus', '');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.textContent = 'Focus mode';
  toggle.addEventListener('click', () => {
    if (focusModeIsOn(doc)) exitFocusMode(doc);
    else enterFocusMode(doc);
  });

  tools.append(root, toggle);
  placeSearchTools(doc, tools);
  const stopPlace = watchSearchPlacement(doc, tools);

  let index = buildIndex([]);

  const run = () => {
    const query = String(input.value ?? '').trim();
    if (!query) {
      clear(list);
      setHidden(list, true);
      live.textContent = '';
      input.setAttribute('aria-expanded', 'false');
      return;
    }
    const results = search(index, query);
    paint(doc, list, results);
    setHidden(list, results.length === 0);
    input.setAttribute('aria-expanded', results.length > 0 ? 'true' : 'false');
    live.textContent = announcementFor(results);
  };

  input.addEventListener('input', run);

  const onKey = (event) => {
    if (handleShortcut(event, input)) return;
    if (event.key !== 'ArrowDown' || doc.activeElement !== input) return;
    const first = list.querySelector?.('a');
    if (!first) return;
    event.preventDefault?.();
    first.focus?.();
  };
  doc.addEventListener('keydown', onKey);
  const stopFocus = bindFocusModeKeys(doc);

  const load = options.load ?? (() => loadRecords((url, init) => globalThis.fetch(url, init)));
  Promise.resolve()
    .then(() => load())
    .then((records) => {
      index = buildIndex(records ?? []);
      if (String(input.value ?? '').trim()) run();
    })
    .catch(() => {
      if (!live.textContent) live.textContent = 'Search is unavailable.';
    });

  return {
    root: tools,
    input,
    live,
    list,
    toggle,
    setIndex(records) {
      index = buildIndex(records ?? []);
      run();
    },
    destroy() {
      stopPlace();
      stopFocus();
      doc.removeEventListener?.('keydown', onKey);
      tools.remove?.();
    },
  };
}

function paint(doc, list, results) {
  clear(list);
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    const item = doc.createElement('li');
    item.setAttribute('role', 'presentation');
    const link = doc.createElement('a');
    link.id = `mm-search-opt-${i}`;
    link.href = result.href;
    link.setAttribute('role', 'option');
    const title = doc.createElement('span');
    title.className = 'mm-search-title';
    title.textContent = result.title;
    const meta = doc.createElement('span');
    meta.className = 'mm-search-meta';
    const bits = [KIND_LABEL[result.kind] || 'Result'];
    if (result.chapter != null) bits.push(`Ch ${result.chapter}`);
    meta.textContent = bits.join(' · ');
    link.append(title, meta);
    item.append(link);
    list.append(item);
  }
}

function clear(node) {
  if (typeof node.replaceChildren === 'function') node.replaceChildren();
  else if (node.children) node.children.length = 0;
}

function setHidden(node, hidden) {
  node.hidden = hidden;
  if (hidden) node.setAttribute?.('hidden', '');
  else node.removeAttribute?.('hidden');
}

/**
 * Put Search and Focus mode under the page title.
 * A `[data-mm-tools-mount]` slot wins. Otherwise the tools sit after the
 * first h1 in `#view`. With neither, they stay under the site header.
 * Route renders replace `#view`, so call this again after each paint.
 * @param {Document} doc
 * @param {HTMLElement} tools
 */
export function placeSearchTools(doc, tools) {
  if (!doc || !tools) return 'missing';
  const mount = doc.querySelector?.('[data-mm-tools-mount]');
  if (mount && mount !== tools) {
    if (!isInside(mount, tools)) moveInto(mount, tools);
    return 'mount';
  }
  const title = findPageTitle(doc);
  if (title && title.parentNode && title !== tools) {
    if (nextElement(title) !== tools) {
      detach(tools);
      title.insertAdjacentElement('afterend', tools);
    }
    return 'title';
  }
  const header = doc.querySelector?.('.site-header');
  if (typeof header?.insertAdjacentElement === 'function') {
    if (nextElement(header) !== tools) {
      detach(tools);
      header.insertAdjacentElement('afterend', tools);
    }
    return 'header';
  }
  if (!tools.parentNode && doc.body) {
    if (typeof doc.body.insertBefore === 'function') doc.body.insertBefore(tools, doc.body.firstChild ?? null);
    else doc.body.append?.(tools);
    return 'body';
  }
  return 'unchanged';
}

function findPageTitle(doc) {
  const view = doc.querySelector?.('#view') || doc.querySelector?.('main');
  if (!view || typeof view.querySelector !== 'function') return null;
  return view.querySelector('h1');
}

function watchSearchPlacement(doc, tools) {
  const Observer = globalThis.MutationObserver;
  if (typeof Observer !== 'function') return () => {};
  const root = doc.querySelector?.('#view') || doc.body;
  if (!root) return () => {};
  let placing = false;
  let observer;
  const run = () => {
    if (placing) return;
    placing = true;
    try {
      placeSearchTools(doc, tools);
    } finally {
      placing = false;
    }
  };
  try {
    observer = new Observer(run);
    observer.observe(root, { childList: true });
  } catch {
    return () => {};
  }
  return () => observer.disconnect();
}

function moveInto(parent, node) {
  detach(node);
  parent.append(node);
}

function detach(node) {
  const parent = node?.parentNode;
  if (!parent) return;
  if (typeof parent.removeChild === 'function') {
    parent.removeChild(node);
    return;
  }
  const kids = parent.children;
  if (kids && typeof kids.indexOf === 'function') {
    const index = kids.indexOf(node);
    if (index >= 0) kids.splice(index, 1);
  }
  node.parentNode = null;
}

function nextElement(node) {
  if (!node) return null;
  if (node.nextElementSibling !== undefined) return node.nextElementSibling;
  const kids = node.parentNode?.children;
  if (!kids || typeof kids.indexOf !== 'function') return null;
  const index = kids.indexOf(node);
  return index >= 0 ? (kids[index + 1] ?? null) : null;
}

function isInside(parent, node) {
  if (!parent || !node) return false;
  if (typeof parent.contains === 'function') {
    try {
      return parent.contains(node);
    } catch {
      // A test double may not implement Node.contains.
    }
  }
  let current = node;
  while (current) {
    if (current === parent) return true;
    current = current.parentNode;
  }
  return false;
}
