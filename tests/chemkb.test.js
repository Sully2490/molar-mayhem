import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grade, parseAnswer } from '../js/grade.js';
import { CHEM_KEYS, attachChemKeyboard, insertText } from '../js/chemkb/keyboard.js';
import { watchAnswerInputs } from '../js/offline/boot.js';

const SPOKEN = [
  'times ten to the',
  'minus',
  'superscript minus',
  'superscript plus',
  'reaction arrow',
  'equilibrium arrow',
  'delta',
  'degree',
  'open parenthesis',
  'close parenthesis',
  ...Array.from({ length: 10 }, (_, digit) => `superscript ${digit}`),
  ...Array.from({ length: 10 }, (_, digit) => `subscript ${digit}`),
];

test('chemistry keys are real buttons with spoken names', () => {
  const labels = CHEM_KEYS.map((key) => key.ariaLabel);
  for (const name of SPOKEN) assert.ok(labels.includes(name), name);
  assert.equal(new Set(labels).size, labels.length);
  const doc = createDoc();
  const input = doc.createElement('input');
  doc.body.append(input);
  const keyboard = attachChemKeyboard(input);
  assert.equal(keyboard.element.getAttribute('role'), 'toolbar');
  assert.equal(keyboard.element.getAttribute('aria-label'), 'Chemistry keyboard');
  const buttons = keyboard.element.querySelectorAll('button');
  assert.equal(buttons.length, CHEM_KEYS.length);
  for (const button of buttons) {
    assert.equal(button.tagName, 'BUTTON');
    assert.equal(button.getAttribute('type'), 'button');
    assert.equal(button.type, 'button');
    const spoken = button.getAttribute('aria-label');
    assert.equal(typeof spoken, 'string');
    assert.ok(spoken.length > 1);
    assert.ok(SPOKEN.includes(spoken));
  }
});

test('keys insert at the caret and replace a selection', () => {
  assert.deepEqual(insertText('NaCl', 2, 2, '⁺'), { value: 'Na⁺Cl', cursor: 3 });
  assert.deepEqual(insertText('abc', 1, 3, 'X'), { value: 'aX', cursor: 2 });
  assert.deepEqual(insertText('H2O', 1, 1, '₂'), { value: 'H₂2O', cursor: 2 });
  assert.deepEqual(insertText('', null, null, '−'), { value: '−', cursor: 1 });
});

test('a key press keeps the caret when the field would otherwise blur', () => {
  const doc = createDoc();
  const row = doc.createElement('div');
  row.className = 'answer-row';
  const input = doc.createElement('input');
  input.value = 'NaCl';
  input.selectionStart = 2;
  input.selectionEnd = 2;
  row.append(input);
  doc.body.append(row);
  const keyboard = attachChemKeyboard(input);
  assert.equal(keyboard.element.previousSibling(), row);
  const button = buttonByName(keyboard, 'superscript plus');
  let held = false;
  button.dispatchEvent({
    type: 'pointerdown',
    preventDefault() { held = true; },
  });
  assert.equal(held, true);
  input.selectionStart = null;
  input.selectionEnd = null;
  button.dispatchEvent({ type: 'click' });
  assert.equal(input.value, 'Na⁺Cl');
  assert.equal(input.selectionStart, 3);
  assert.equal(doc.activeElement, input);
});

test('the last typed caret is used when a phone keypad clears the selection', () => {
  const doc = createDoc();
  const input = doc.createElement('input');
  input.value = '4.307 J';
  input.selectionStart = 5;
  input.selectionEnd = 5;
  doc.body.append(input);
  const keyboard = attachChemKeyboard(input);
  input.dispatchEvent({ type: 'keyup' });
  input.selectionStart = null;
  input.selectionEnd = null;
  buttonByName(keyboard, 'times ten to the').dispatchEvent({ type: 'click' });
  assert.equal(input.value, '4.307×10^ J');
  assert.equal(input.selectionStart, '4.307×10^'.length);
});

test('attaching twice uses one keyboard, including inputs added on the page', () => {
  const doc = createDoc();
  const input = doc.createElement('input');
  input.setAttribute('name', 'answer');
  doc.body.append(input);
  const stop = watchAnswerInputs(doc);
  const again = attachChemKeyboard(input);
  assert.equal(doc.querySelectorAll('.chem-kb').length, 1);
  assert.equal(again.element, doc.querySelector('.chem-kb'));
  stop();
});

test('inserted scientific notation, charges, and formulas pass through parseAnswer', () => {
  const negative = typeKeys('4.307', [
    'times ten to the',
    'superscript minus',
    'superscript 1',
    'superscript 9',
  ]);
  const negativeAnswer = `${negative} J`;
  assert.equal(negativeAnswer, '4.307×10^⁻¹⁹ J');
  const parsedNegative = parseAnswer(negativeAnswer);
  assert.equal(parsedNegative.unit, 'J');
  assert.equal(parsedNegative.sigFigs, 4);
  assert.ok(Math.abs(parsedNegative.value - 4.307e-19) / 4.307e-19 < 1e-9);
  assert.equal(grade(negativeAnswer, {
    kind: 'numeric',
    value: 4.307e-19,
    sigFigs: 4,
    unit: 'J',
  }).ok, true);

  const positive = typeKeys('6.02', ['times ten to the', 'superscript 2', 'superscript 3']);
  assert.equal(positive, '6.02×10^²³');
  const parsedPositive = parseAnswer(positive);
  assert.ok(Math.abs(parsedPositive.value - 6.02e23) / 6.02e23 < 1e-9);
  assert.equal(parsedPositive.sigFigs, 3);

  const signed = typeKeys('', ['minus']);
  const cold = parseAnswer(`${signed}2.50`);
  assert.equal(cold.value, -2.5);
  assert.equal(cold.coefficient, '-2.50');

  const ion = `Fe${typeKeys('', ['superscript 3', 'superscript plus'])}`;
  assert.equal(ion, 'Fe³⁺');
  assert.equal(grade(ion, { kind: 'exact', text: 'Fe3+' }).ok, true);

  const water = typeKeys('H', ['subscript 2']);
  assert.equal(grade(`${water}O`, { kind: 'exact', text: 'H2O' }).ok, true);

  const base = typeKeys('Ca', ['open parenthesis']);
  const hydroxide = typeKeys(`${base}OH`, ['close parenthesis', 'subscript 2']);
  assert.equal(hydroxide, 'Ca(OH)₂');
  assert.equal(grade(hydroxide, { kind: 'exact', text: 'Ca(OH)2' }).ok, true);

  const reaction = typeKeys('H2', ['reaction arrow']);
  assert.equal(`${reaction} 2H`, 'H2→ 2H');
  const equilibrium = typeKeys('', ['equilibrium arrow', 'delta', 'degree']);
  assert.equal(equilibrium, '⇌Δ°');
});

function typeKeys(start, labels) {
  let value = start;
  let cursor = start.length;
  for (const label of labels) {
    const key = CHEM_KEYS.find((item) => item.ariaLabel === label);
    const next = insertText(value, cursor, cursor, key.insert);
    value = next.value;
    cursor = next.cursor;
  }
  return value;
}

function buttonByName(keyboard, name) {
  return keyboard.element.querySelectorAll('button').find((button) => button.getAttribute('aria-label') === name);
}

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
    selectionStart: null,
    selectionEnd: null,
    attributes: new Map(),
    listeners: new Map(),
  };
  el.classList = classList(el);
  el.setAttribute = (name, value) => el.attributes.set(name, String(value));
  el.getAttribute = (name) => (el.attributes.has(name) ? el.attributes.get(name) : null);
  el.append = (...nodes) => {
    for (const node of nodes) {
      node.parentNode = el;
      el.children.push(node);
    }
  };
  el.addEventListener = (type, fn) => {
    const list = el.listeners.get(type) ?? [];
    list.push(fn);
    el.listeners.set(type, list);
  };
  el.dispatchEvent = (event) => {
    for (const fn of el.listeners.get(event.type) ?? []) fn(event);
  };
  el.insertAdjacentElement = (where, node) => {
    const parent = el.parentNode;
    const index = parent.children.indexOf(el);
    node.parentNode = parent;
    parent.children.splice(where === 'afterend' ? index + 1 : index, 0, node);
    return node;
  };
  el.previousSibling = () => {
    const index = el.parentNode?.children.indexOf(el) ?? -1;
    return index > 0 ? el.parentNode.children[index - 1] : null;
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
  el.setSelectionRange = (start, end) => {
    el.selectionStart = start;
    el.selectionEnd = end;
  };
  el.querySelector = (selector) => queryAll(el, selector)[0] ?? null;
  el.querySelectorAll = (selector) => queryAll(el, selector);
  return el;
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
  if (/^[a-z0-9-]+$/i.test(selector)) return el.tagName.toLowerCase() === selector.toLowerCase();
  return false;
}
