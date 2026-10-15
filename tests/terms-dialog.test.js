import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTermDialog, focusableElements, renderTermCard } from '../js/terms/dialog.js';
import { termById } from '../js/terms/catalog.js';

function createDocument() {
  const listeners = [];

  function parseInto(parent, html) {
    parent.children = [];
    const stack = [parent];
    const tokens = String(html).match(/<!--[\s\S]*?-->|<\/[^>]+>|<[^>]+>|[^<]+/g) ?? [];
    for (const token of tokens) {
      if (token.startsWith('<!--')) continue;
      if (token.startsWith('</')) {
        if (stack.length > 1) stack.pop();
        continue;
      }
      if (token.startsWith('<')) {
        const el = createElement(token);
        stack[stack.length - 1].append(el);
        const name = el.tagName.toLowerCase();
        const empty = /\/>\s*$/.test(token) || ['br', 'hr', 'img', 'meta', 'link'].includes(name);
        if (!empty) stack.push(el);
        continue;
      }
      stack[stack.length - 1].textContent += token;
    }
  }

  function createElement(tokenOrTag) {
    const token = tokenOrTag.startsWith('<') ? tokenOrTag : `<${tokenOrTag}>`;
    const name = (/^<\/?\s*([A-Za-z0-9]+)/.exec(token)?.[1] ?? 'div').toUpperCase();
    const el = {
      tagName: name,
      children: [],
      parentElement: null,
      attributes: new Map(),
      textContent: '',
      disabled: false,
      inert: false,
      classList: null,
      hidden: false,
      tabIndex: 0,
      _listeners: {},
    };
    const classes = new Set();
    el.classList = {
      add: (...names) => names.forEach((item) => classes.add(item)),
      remove: (...names) => names.forEach((item) => classes.delete(item)),
      contains: (item) => classes.has(item),
    };
    Object.defineProperty(el, 'className', {
      get: () => [...classes].join(' '),
      set: (value) => {
        classes.clear();
        String(value).split(/\s+/).filter(Boolean).forEach((item) => classes.add(item));
      },
    });
    el.setAttribute = (key, value) => el.attributes.set(key, String(value));
    el.getAttribute = (key) => (el.attributes.has(key) ? el.attributes.get(key) : null);
    el.hasAttribute = (key) => el.attributes.has(key);
    el.append = (...nodes) => {
      for (const node of nodes) {
        node.parentElement = el;
        el.children.push(node);
      }
    };
    el.remove = () => {
      const parent = el.parentElement;
      if (!parent) return;
      parent.children = parent.children.filter((child) => child !== el);
      el.parentElement = null;
    };
    el.contains = (node) => {
      if (node === el) return true;
      return el.children.some((child) => child.contains(node));
    };
    el.matches = (selector) => selector.split(',').some((part) => matchesSimple(el, part.trim()));
    el.closest = (selector) => {
      let node = el;
      while (node) {
        if (node.matches?.(selector)) return node;
        node = node.parentElement;
      }
      return null;
    };
    el.addEventListener = (type, fn) => {
      el._listeners[type] = el._listeners[type] ?? [];
      el._listeners[type].push(fn);
    };
    el.focus = () => {
      doc.activeElement = el;
    };
    Object.defineProperty(el, 'innerHTML', {
      set: (html) => {
        el.textContent = '';
        parseInto(el, html);
      },
    });
    const attr = /\s([A-Za-z_:][\w:.-]*)(?:="([^"]*)")?/g;
    let match = attr.exec(token);
    while (match) {
      el.setAttribute(match[1], match[2] ?? '');
      if (match[1] === 'class') el.className = match[2] ?? '';
      match = attr.exec(token);
    }
    return el;
  }

  function matchesSimple(el, selector) {
    if (!selector) return false;
    const parts = selector.match(/[.#]?[A-Za-z][\w-]*|\[[^\]]+\]/g) ?? [];
    if (parts.length === 0) return false;
    return parts.every((part) => {
      if (part.startsWith('.')) return el.classList.contains(part.slice(1));
      if (part.startsWith('#')) return el.getAttribute('id') === part.slice(1);
      if (part.startsWith('[')) {
        const body = part.slice(1, -1);
        const equal = body.match(/^([^=]+)="([^"]*)"$/);
        if (equal) return el.getAttribute(equal[1]) === equal[2];
        return el.hasAttribute(body);
      }
      return el.tagName.toLowerCase() === part.toLowerCase();
    });
  }

  function walk(node, visit) {
    visit(node);
    for (const child of node.children ?? []) walk(child, visit);
  }

  const doc = {
    activeElement: null,
    _listeners: { keydown: [] },
  };
  const body = createElement('body');
  const header = createElement('header');
  const main = createElement('main');
  const footer = createElement('footer');
  const skip = createElement('a');
  skip.className = 'skip';
  skip.setAttribute('href', '#view');
  const trigger = createElement('button');
  trigger.textContent = 'density';
  main.append(trigger);
  body.append(header, main, footer, skip);
  doc.body = body;
  doc.createElement = (tag) => createElement(tag);
  doc.querySelectorAll = (selector) => {
    const found = [];
    walk(body, (node) => {
      if (node.matches?.(selector)) found.push(node);
    });
    return found;
  };
  doc.addEventListener = (type, fn) => {
    doc._listeners[type] = doc._listeners[type] ?? [];
    doc._listeners[type].push(fn);
  };
  doc.removeEventListener = (type, fn) => {
    doc._listeners[type] = (doc._listeners[type] ?? []).filter((item) => item !== fn);
  };
  doc.dispatch = (type, event) => {
    for (const fn of doc._listeners[type] ?? []) fn(event);
  };
  return { doc, trigger, header, main, footer, skip };
}

function collectText(node) {
  let text = node.textContent ?? '';
  for (const child of node.children ?? []) text += collectText(child);
  return text;
}

function keyEvent(target, key, shiftKey = false) {
  return {
    key,
    shiftKey,
    target,
    defaultPrevented: false,
    stopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.stopped = true; },
  };
}

test('the term card names itself for assistive tech', () => {
  const density = termById('density');
  const html = renderTermCard(density);
  assert.match(html, /id="term-dialog-title"/);
  assert.match(html, /id="term-dialog-def"/);
  assert.match(html, /data-term-close/);
  assert.match(html, /Escape closes this card/);
  assert.match(html, /<svg\b/);
  assert.match(html, /href="#Learn\/ch01-measure"/);
});

test('the dialog traps focus, closes on Escape, and restores focus', () => {
  const { doc, trigger, header, main, footer, skip } = createDocument();
  const dialog = createTermDialog(doc);
  trigger.focus();
  assert.equal(dialog.open('density', trigger), true);
  assert.equal(dialog.isOpen(), true);
  assert.equal(dialog.dialog.getAttribute('role'), 'dialog');
  assert.equal(dialog.dialog.getAttribute('aria-modal'), 'true');
  assert.equal(dialog.dialog.getAttribute('aria-labelledby'), 'term-dialog-title');
  assert.equal(dialog.dialog.getAttribute('aria-describedby'), 'term-dialog-def');
  assert.equal(dialog.dialog.hidden, false);
  assert.equal(dialog.backdrop.hidden, false);
  assert.equal(header.inert, true);
  assert.equal(main.inert, true);
  assert.equal(footer.inert, true);
  assert.equal(skip.inert, true);
  assert.equal(doc.activeElement, dialog.dialog);
  assert.equal(doc.body.classList.contains('term-open'), true);

  const items = focusableElements(dialog.dialog);
  assert.ok(items.length >= 2);
  assert.equal(items[0].getAttribute('data-term-close'), '');
  items[0].focus();
  const backward = keyEvent(items[0], 'Tab', true);
  doc.dispatch('keydown', backward);
  assert.equal(backward.defaultPrevented, true);
  assert.equal(doc.activeElement, items[items.length - 1]);
  const forward = keyEvent(items[items.length - 1], 'Tab', false);
  doc.dispatch('keydown', forward);
  assert.equal(forward.defaultPrevented, true);
  assert.equal(doc.activeElement, items[0]);

  const escape = keyEvent(items[0], 'Escape');
  doc.dispatch('keydown', escape);
  assert.equal(escape.defaultPrevented, true);
  assert.equal(escape.stopped, true);
  assert.equal(dialog.isOpen(), false);
  assert.equal(header.inert, false);
  assert.equal(main.inert, false);
  assert.equal(footer.inert, false);
  assert.equal(skip.inert, false);
  assert.equal(doc.activeElement, trigger);
  assert.equal(doc.body.classList.contains('term-open'), false);
});

test('a related term keeps the original trigger for restored focus', () => {
  const { doc, trigger } = createDocument();
  const dialog = createTermDialog(doc);
  dialog.open('density', trigger);
  const related = focusableElements(dialog.dialog).find((el) => el.getAttribute('data-term'));
  assert.ok(related);
  const click = {
    target: related,
    preventDefault() {},
  };
  for (const fn of dialog.dialog._listeners.click ?? []) fn(click);
  const text = collectText(dialog.dialog);
  assert.match(text, new RegExp(termById(related.getAttribute('data-term')).term, 'i'));
  doc.dispatch('keydown', keyEvent(dialog.dialog, 'Escape'));
  assert.equal(doc.activeElement, trigger);
});
