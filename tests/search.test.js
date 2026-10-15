import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CONTENT_PATHS, loadRecords, loadTermRecords, recordsFromLesson, recordsFromPayload } from '../js/search/records.js';
import { buildIndex, search } from '../js/search/rank.js';
import { announcementFor, mountSearch } from '../js/search/mount.js';
import { enterFocusMode, exitFocusMode, focusModeIsOn } from '../js/search/focus.js';

test('lessons and problems from content are searchable and answers stay out of the index', () => {
  const records = CONTENT_PATHS.flatMap((path) => {
    const data = JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
    return recordsFromPayload(path, data);
  });
  assert.ok(records.filter((record) => record.kind === 'lesson').length >= 9);
  assert.ok(records.filter((record) => record.kind === 'problem').length >= 10);
  const lesson = JSON.parse(readFileSync(new URL('../content/ch01/sigfigs.json', import.meta.url), 'utf8'));
  const indexed = recordsFromLesson(lesson);
  const problem = indexed.find((record) => record.id === 'problem:ch01-sigfigs-01');
  assert.equal(problem.kind, 'problem');
  assert.equal(problem.text.includes(lesson.problems[0].why), false);
  assert.equal(problem.text.includes(lesson.problems[0].a), false);
  const index = buildIndex(records);
  const hit = search(index, 'significant figures');
  assert.equal(hit[0].kind, 'lesson');
  assert.match(hit[0].title, /significant figures/i);
  assert.match(hit[0].href, /^#Learn\//);
  assert.ok(search(index, 'gas laws').some((result) => result.kind === 'lesson'));
  assert.ok(search(index, 'sig').some((result) => /significant/i.test(result.title)));
});

test('a missing terms folder adds nothing and a terms index is ranked with lessons', async () => {
  const absent = await loadTermRecords(async () => { throw new Error('missing'); });
  assert.deepEqual(absent, []);
  const empty = await loadRecords(async (path) => (
    path === 'content/terms/index.json' ? { ok: false } : { ok: false }
  ), []);
  assert.deepEqual(empty, []);

  const records = await loadRecords(async (path) => {
    if (path === 'content/terms/index.json') return { ok: true, async json() { return ['mole.json']; } };
    if (path === 'content/terms/mole.json') {
      return {
        ok: true,
        async json() {
          return { id: 'mole', term: 'mole', definition: 'The counting unit for 6.022×10^23 particles.', ch: 6 };
        },
      };
    }
    return { ok: false };
  }, []);
  const index = buildIndex(records);
  const hit = search(index, 'mole');
  assert.equal(hit[0].kind, 'term');
  assert.equal(hit[0].title, 'mole');
  assert.equal(hit[0].chapter, 6);
});

test('title matches outrank a body mention and ranking stays fast', () => {
  const records = [
    { id: 'lesson:density', kind: 'lesson', title: 'Density', text: 'mass divided by volume', href: '#Learn/density', chapter: 1 },
    { id: 'lesson:note', kind: 'lesson', title: 'Mass and volume', text: 'The density of water is about one gram per milliliter', href: '#Learn/water', chapter: 1 },
    { id: 'problem:water', kind: 'problem', title: 'What is the density of water?', text: 'Density What is the density of water?', href: '#Learn/density', chapter: 1 },
    { id: 'term:density', kind: 'term', title: 'density', text: 'Mass per volume.', href: '#Learn', chapter: 1 },
  ];
  for (let i = 0; i < 4000; i += 1) {
    records.push({
      id: `problem:bulk-${i}`,
      kind: 'problem',
      title: `Practice item ${i} about moles`,
      text: `moles mass sample ${i}`,
      href: '#Learn/bulk',
      chapter: 6,
    });
  }
  const startedBuild = performance.now();
  const index = buildIndex(records);
  const buildMs = performance.now() - startedBuild;
  const ranked = search(index, 'density of water');
  assert.equal(ranked[0].id, 'problem:water');
  assert.equal(search(index, 'the')[0], undefined);
  const started = performance.now();
  for (let i = 0; i < 30; i += 1) search(index, 'molar mass');
  const searchMs = performance.now() - started;
  assert.ok(buildMs < 500, `index build took ${buildMs}ms`);
  assert.ok(searchMs < 100, `30 searches took ${searchMs}ms`);
  assert.equal(announcementFor(ranked), `${ranked.length} results. ${ranked[0].title}`);
  assert.equal(announcementFor([]), 'No matches.');
  assert.equal(announcementFor([ranked[0]]), `1 result. ${ranked[0].title}`);
});

test('search is a labeled field and results are announced in aria-live', async () => {
  const doc = createDoc();
  const ui = mountSearch(doc, { load: async () => [] });
  const label = doc.querySelector('label');
  assert.equal(label.textContent, 'Search');
  assert.equal(label.getAttribute('for'), ui.input.id);
  const live = doc.querySelector('[aria-live="polite"]');
  assert.equal(live, ui.live);
  assert.equal(ui.list.getAttribute('role'), 'listbox');
  assert.equal(ui.list.getAttribute('aria-label'), 'Search results');
  ui.setIndex([
    { id: 'lesson:sig', kind: 'lesson', title: 'Count significant figures', text: 'round the last digit', href: '#Learn/ch01-sigfigs', chapter: 1 },
    { id: 'problem:other', kind: 'problem', title: 'Add these masses', text: 'Add these masses', href: '#Learn/other', chapter: 1 },
  ]);
  ui.input.value = 'significant';
  ui.input.dispatchEvent({ type: 'input' });
  assert.match(ui.live.textContent, /^1 result\. Count significant figures$/);
  const option = ui.list.querySelector('[role="option"]');
  assert.equal(option.getAttribute('href') ?? option.href, '#Learn/ch01-sigfigs');
  assert.match(option.textContent, /Count significant figures/);
  assert.match(option.textContent, /Lesson/);
});

test('slash focuses search and Escape exits focus mode', () => {
  const doc = createDoc();
  const header = doc.createElement('header');
  header.className = 'site-header';
  doc.body.append(header);
  const page = doc.createElement('div');
  page.className = 'page';
  const steps = doc.createElement('p');
  steps.textContent = 'Lesson steps';
  const problem = doc.createElement('form');
  problem.className = 'problem';
  problem.setAttribute('data-problem', 'demo');
  const answer = doc.createElement('input');
  answer.setAttribute('name', 'answer');
  problem.append(answer);
  page.append(steps, problem);
  doc.body.append(page);

  const ui = mountSearch(doc, { load: async () => [] });
  let typedSlash = false;
  answer.addEventListener('keydown', (event) => {
    if (event.key === '/' && !event.defaultPrevented) typedSlash = true;
  });
  const inField = { type: 'keydown', key: '/', target: answer, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
  answer.dispatchEvent(inField);
  doc.dispatchEvent(inField);
  assert.equal(inField.defaultPrevented, false);
  assert.equal(typedSlash, true);
  assert.notEqual(doc.activeElement, ui.input);

  const shortcut = { type: 'keydown', key: '/', target: doc.body, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
  doc.dispatchEvent(shortcut);
  assert.equal(shortcut.defaultPrevented, true);
  assert.equal(doc.activeElement, ui.input);

  answer.focus();
  ui.toggle.dispatchEvent({ type: 'click' });
  assert.equal(focusModeIsOn(doc), true);
  assert.equal(problem.classList.contains('mm-focus-keep'), true);
  assert.equal(ui.toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(ui.toggle.textContent, 'Exit focus mode');
  doc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.equal(focusModeIsOn(doc), false);
  assert.equal(problem.classList.contains('mm-focus-keep'), false);
  assert.equal(ui.toggle.textContent, 'Focus mode');

  enterFocusMode(doc, problem);
  assert.equal(focusModeIsOn(doc), true);
  exitFocusMode(doc);
  assert.equal(focusModeIsOn(doc), false);
});

function createDoc() {
  const doc = {
    activeElement: null,
    listeners: new Map(),
    children: [],
  };
  doc.createElement = (tag) => makeElement(tag, doc);
  doc.body = makeElement('body', doc);
  doc.body.parentNode = doc;
  doc.children.push(doc.body);
  doc.addEventListener = (type, fn) => listen(doc, type, fn);
  doc.removeEventListener = (type, fn) => {
    const list = doc.listeners.get(type) ?? [];
    doc.listeners.set(type, list.filter((item) => item !== fn));
  };
  doc.dispatchEvent = (event) => fire(doc, event);
  doc.querySelector = (selector) => queryAll(doc, selector)[0] ?? null;
  doc.querySelectorAll = (selector) => queryAll(doc, selector);
  return doc;
}

function makeElement(tag, doc) {
  const el = {
    tagName: String(tag).toUpperCase(),
    ownerDocument: doc,
    parentNode: null,
    children: [],
    className: '',
    id: '',
    type: '',
    value: '',
    hidden: false,
    href: '',
    attributes: new Map(),
    listeners: new Map(),
    _text: '',
  };
  Object.defineProperty(el, 'textContent', {
    get() {
      if (el.children.length > 0) return el.children.map((child) => child.textContent).join('');
      return el._text;
    },
    set(value) {
      el._text = String(value);
      el.children = [];
    },
  });
  el.classList = classList(el);
  el.setAttribute = (name, value) => el.attributes.set(name, String(value));
  el.getAttribute = (name) => (el.attributes.has(name) ? el.attributes.get(name) : null);
  el.removeAttribute = (name) => el.attributes.delete(name);
  el.append = (...nodes) => {
    for (const node of nodes) {
      node.parentNode = el;
      el.children.push(node);
    }
  };
  el.addEventListener = (type, fn) => listen(el, type, fn);
  el.dispatchEvent = (event) => fire(el, event);
  el.insertAdjacentElement = (where, node) => {
    const parent = el.parentNode;
    const index = parent.children.indexOf(el);
    node.parentNode = parent;
    parent.children.splice(where === 'afterend' ? index + 1 : index, 0, node);
    return node;
  };
  el.matches = (selector) => matches(el, selector);
  el.closest = (selector) => {
    let node = el;
    const seen = new Set();
    while (node && !seen.has(node)) {
      seen.add(node);
      if (typeof node.matches === 'function' && node.matches(selector)) return node;
      node = node.parentNode;
    }
    return null;
  };
  el.focus = () => { doc.activeElement = el; };
  el.querySelector = (selector) => queryAll(el, selector)[0] ?? null;
  el.querySelectorAll = (selector) => queryAll(el, selector);
  return el;
}

function listen(target, type, fn) {
  const list = target.listeners.get(type) ?? [];
  list.push(fn);
  target.listeners.set(type, list);
}

function fire(target, event) {
  for (const fn of target.listeners.get(event.type) ?? []) fn(event);
}

function classList(el) {
  const read = () => String(el.className ?? '').split(/\s+/).filter(Boolean);
  return {
    add(...names) {
      const next = new Set(read());
      for (const name of names) next.add(name);
      el.className = [...next].join(' ');
    },
    remove(...names) {
      const drop = new Set(names);
      el.className = read().filter((name) => !drop.has(name)).join(' ');
    },
    contains(name) { return read().includes(name); },
  };
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

function matches(el, selector) {
  if (!el?.tagName) return false;
  const attr = /^([a-z0-9-]*)\[([^\]=]+)(?:="([^"]*)")?\]$/i.exec(selector);
  if (attr) {
    const [, tag, name, value] = attr;
    if (tag && el.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    const actual = el.getAttribute(name);
    if (value == null) return actual != null;
    return actual === value;
  }
  if (selector.startsWith('.')) return String(el.className ?? '').split(/\s+/).includes(selector.slice(1));
  if (selector.startsWith('#')) return el.id === selector.slice(1);
  if (/^[a-z0-9-]+$/i.test(selector)) return el.tagName.toLowerCase() === selector.toLowerCase();
  return false;
}
