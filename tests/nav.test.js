import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { MORE_NAV, PRIMARY_NAV, bindCompactNav } from '../js/nav.js';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('index.html exposes More toggle markup and aria wiring', () => {
  const html = read('index.html');
  assert.match(html, /data-compact-nav/);
  assert.match(html, /id="nav-more-btn"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="nav-more-panel"/);
  assert.match(html, /id="nav-more-panel"/);
  assert.match(html, /class="nav-more-btn"/);
  for (const id of PRIMARY_NAV) {
    assert.match(html, new RegExp(`data-nav-slot="${id}"[^>]*class="nav-primary"|class="nav-primary"[^>]*data-nav-slot="${id}"`));
  }
  for (const id of MORE_NAV) {
    assert.match(html, new RegExp(`data-nav-slot="${id}"`));
    assert.match(html, new RegExp(`data-nav="${id}"`));
  }
  assert.equal(PRIMARY_NAV.join(','), 'Learn,Drill,Exam3,Final');
  assert.equal(MORE_NAV.join(','), 'Map,Lab,Build,Cards,Terms,Videos,Weak,Prep');
});

test('compact CSS keeps a one-row nav under 600px with 44px targets', () => {
  const css = read('css/styles.css');
  assert.match(css, /@media \(max-width: 599px\)/);
  assert.match(css, /@media \(min-width: 600px\)[\s\S]*\.nav-more\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /\.nav-more-btn\s*\{[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.nav-more-panel a\s*\{[\s\S]*min-height:\s*44px/);
  assert.match(css, /flex-wrap:\s*nowrap/);
});

test('More toggles aria-expanded, closes on Escape with focus restore, and marks active routes', () => {
  const { doc, button, panel, windowListeners } = buildNavDoc();
  let compact = true;
  const api = bindCompactNav(doc, {
    matchMedia: () => ({
      matches: compact,
      addEventListener() {},
      addListener() {},
    }),
    addWindowListener: (type, fn) => {
      windowListeners[type] = windowListeners[type] ?? [];
      windowListeners[type].push(fn);
    },
  });

  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(panel.hidden, true);
  assert.equal(panel.children.length, MORE_NAV.length);

  button.dispatchEvent({ type: 'click', preventDefault() {} });
  assert.equal(api.isOpen(), true);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(panel.hidden, false);

  const escape = { key: 'Escape', stopPropagation() {} };
  for (const fn of windowListeners.keydown ?? []) fn(escape);
  assert.equal(api.isOpen(), false);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(doc.activeElement, button);

  button.dispatchEvent({ type: 'click', preventDefault() {} });
  assert.equal(api.isOpen(), true);
  const link = panel.querySelector('a[data-nav="Map"]');
  panel.dispatchEvent({ type: 'click', target: link });
  assert.equal(api.isOpen(), false);

  button.dispatchEvent({ type: 'click', preventDefault() {} });
  for (const fn of windowListeners.hashchange ?? []) fn({});
  assert.equal(api.isOpen(), false);

  api.syncRoute('Map');
  assert.equal(button.classList.contains('nav-more-btn--active'), true);
  api.syncRoute('Learn');
  assert.equal(button.classList.contains('nav-more-btn--active'), false);

  compact = false;
  // Re-bind to apply desktop layout with the same media query object pattern.
  const desktopDoc = buildNavDoc();
  const desktop = bindCompactNav(desktopDoc.doc, {
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    addWindowListener() {},
  });
  assert.equal(desktop.isCompact(), false);
  assert.equal(desktopDoc.button.hidden, true);
  assert.equal(desktopDoc.panel.children.length, 0);
  assert.equal(desktopDoc.list.querySelectorAll('[data-nav-slot]').length, PRIMARY_NAV.length + MORE_NAV.length);
});

test('app.js syncs the compact More active state from finish()', () => {
  const app = read('js/app.js');
  assert.match(app, /import \{ bindCompactNav \} from '\.\/nav\.js'/);
  assert.match(app, /bindCompactNav\(document\)/);
  assert.match(app, /compactNav\.syncRoute\(id\)/);
});

test('service worker salt is 20261015v3e', () => {
  const sw = read('sw.js');
  assert.match(sw, /const DEPLOY_SALT = '20261015v3e';/);
});

function buildNavDoc() {
  const doc = createDoc();
  const nav = el(doc, 'nav', { 'data-compact-nav': '', class: 'site-nav' });
  const list = el(doc, 'ul', { class: 'site-nav-list' });
  const order = [
    ['Map', false],
    ['Learn', true],
    ['Lab', false],
    ['Build', false],
    ['Drill', true],
    ['Cards', false],
    ['Terms', false],
    ['Videos', false],
    ['Exam3', true],
    ['Weak', false],
    ['Prep', false],
    ['Final', true],
  ];
  for (const [id, primary] of order) {
    const item = el(doc, 'li', {
      'data-nav-slot': id,
      class: primary ? 'nav-primary' : '',
    });
    const link = el(doc, 'a', { href: `#${id}`, 'data-nav': id });
    link.textContent = id;
    item.append(link);
    list.append(item);
  }
  const more = el(doc, 'li', { class: 'nav-more' });
  const button = el(doc, 'button', {
    type: 'button',
    id: 'nav-more-btn',
    class: 'nav-more-btn',
    'aria-expanded': 'false',
    'aria-controls': 'nav-more-panel',
  });
  button.textContent = 'More';
  const panel = el(doc, 'ul', { id: 'nav-more-panel', class: 'nav-more-panel' });
  panel.hidden = true;
  more.append(button, panel);
  list.append(more);
  nav.append(list);
  doc.body.append(nav);
  return { doc, nav, list, button, panel, windowListeners: {} };
}

function detach(child) {
  const parent = child.parentNode;
  if (!parent?.children) return;
  const index = parent.children.indexOf(child);
  if (index >= 0) parent.children.splice(index, 1);
  child.parentNode = null;
}

function createDoc() {
  const doc = { activeElement: null, children: [] };
  doc.createElement = (tag) => el(doc, tag);
  doc.body = el(doc, 'body');
  doc.body.parentNode = doc;
  doc.children.push(doc.body);
  doc.querySelector = (selector) => queryAll(doc, selector)[0] ?? null;
  doc.querySelectorAll = (selector) => queryAll(doc, selector);
  return doc;
}

function el(doc, tag, attrs = {}) {
  const node = {
    tagName: String(tag).toUpperCase(),
    ownerDocument: doc,
    parentNode: null,
    children: [],
    className: attrs.class ?? '',
    id: attrs.id ?? '',
    hidden: false,
    textContent: '',
    attributes: new Map(),
    listeners: new Map(),
  };
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'id') continue;
    node.attributes.set(key, String(value));
  }
  if (attrs.id) node.attributes.set('id', attrs.id);
  if (attrs.class) node.attributes.set('class', attrs.class);
  node.classList = {
    add(...names) {
      const next = new Set(String(node.className).split(/\s+/).filter(Boolean));
      for (const name of names) next.add(name);
      node.className = [...next].join(' ');
    },
    remove(...names) {
      const drop = new Set(names);
      node.className = String(node.className).split(/\s+/).filter((n) => n && !drop.has(n)).join(' ');
    },
    toggle(name, force) {
      const has = node.classList.contains(name);
      const on = force == null ? !has : Boolean(force);
      if (on) node.classList.add(name);
      else node.classList.remove(name);
      return on;
    },
    contains(name) {
      return String(node.className).split(/\s+/).includes(name);
    },
  };
  node.setAttribute = (name, value) => node.attributes.set(name, String(value));
  node.getAttribute = (name) => (node.attributes.has(name) ? node.attributes.get(name) : null);
  node.append = (...nodes) => {
    for (const child of nodes) {
      detach(child);
      child.parentNode = node;
      node.children.push(child);
    }
  };
  node.insertBefore = (child, ref) => {
    detach(child);
    child.parentNode = node;
    if (!ref) {
      node.children.push(child);
      return child;
    }
    const index = node.children.indexOf(ref);
    if (index < 0) node.children.push(child);
    else node.children.splice(index, 0, child);
    return child;
  };
  node.addEventListener = (type, fn) => {
    const list = node.listeners.get(type) ?? [];
    list.push(fn);
    node.listeners.set(type, list);
  };
  node.dispatchEvent = (event) => {
    for (const fn of node.listeners.get(event.type) ?? []) fn(event);
  };
  node.matches = (selector) => matches(node, selector);
  node.closest = (selector) => {
    let cur = node;
    const seen = new Set();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      if (typeof cur.matches === 'function' && cur.matches(selector)) return cur;
      cur = cur.parentNode;
    }
    return null;
  };
  node.focus = () => { doc.activeElement = node; };
  node.querySelector = (selector) => queryAll(node, selector)[0] ?? null;
  node.querySelectorAll = (selector) => queryAll(node, selector);
  return node;
}

function queryAll(node, selector) {
  const found = [];
  const walk = (current) => {
    for (const child of current.children ?? []) {
      if (matches(child, selector)) found.push(child);
      walk(child);
    }
  };
  walk(node);
  return found;
}

function matches(node, selector) {
  if (!node?.tagName) return false;
  if (selector.startsWith('.')) {
    return String(node.className ?? '').split(/\s+/).includes(selector.slice(1));
  }
  if (selector.startsWith('#')) return node.id === selector.slice(1) || node.getAttribute('id') === selector.slice(1);
  const attr = /^([a-z0-9-]*)\[([^\]=]+)(?:="([^"]*)")?\]$/i.exec(selector);
  if (attr) {
    const [, tag, name, value] = attr;
    if (tag && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    const actual = name === 'class' ? node.className : node.getAttribute(name);
    if (name === 'id' && (node.id === value || actual === value)) return true;
    if (value == null) return actual != null;
    return actual === value;
  }
  if (/^[a-z0-9]+$/i.test(selector)) return node.tagName.toLowerCase() === selector.toLowerCase();
  // Compound: a[data-nav] or a[data-nav="Map"]
  const compound = /^([a-z0-9]+)(\[.+\])$/i.exec(selector);
  if (compound) return matches(node, compound[1]) && matches(node, compound[2]);
  return false;
}
