import assert from 'node:assert/strict';
import test from 'node:test';
import { bindDrill, renderDrillQueue } from '../js/drills.js';
import { readProgress } from '../js/progress.js';

const koh = {
  id: 'koh',
  q: 'What is the molarity of the KOH?',
  a: '0.1200 M',
  why: 'Divide moles by liters. The quotient uses four figures.',
  hints: ['Divide the moles by the liters.', 'Count four figures in the molarity.'],
  check: { kind: 'numeric', value: 0.12, sigFigs: 4, unit: 'M' },
  topic: 'molarity',
};

const water = {
  id: 'water',
  q: 'Write the formula for water.',
  a: 'H2O',
  why: 'Water is two hydrogens and one oxygen.',
  hints: ['Two hydrogens.', 'One oxygen.'],
  check: { kind: 'exact', text: 'H2O' },
};

function memory() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

function mount(items) {
  const listeners = {};
  const store = memory();
  let html = renderDrillQueue(items[0]);
  const host = {
    get outerHTML() {
      return html;
    },
    set outerHTML(value) {
      html = value;
    },
  };
  const root = {
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
    querySelector(selector) {
      if (selector === '[data-drill-queue]') return host;
      return null;
    },
    contains() {
      return true;
    },
  };
  bindDrill(root, store, items);

  function currentId() {
    const match = html.match(/data-drill="([^"]*)"/);
    return match ? match[1] : '';
  }

  function formFor(value) {
    const id = currentId();
    return {
      closest(selector) {
        return selector === '[data-drill]' ? formFor(value) : null;
      },
      hasAttribute(name) {
        if (name === 'data-unit-problem') return false;
        if (name === 'data-drill-solved') return html.includes('data-drill-solved');
        return false;
      },
      getAttribute(name) {
        return name === 'data-drill' ? id : null;
      },
      querySelector(selector) {
        if (selector === '[name="answer"]') return { value };
        return null;
      },
    };
  }

  return {
    store,
    get html() {
      return html;
    },
    get id() {
      return currentId();
    },
    submit(value) {
      listeners.submit({ target: formFor(value), preventDefault() {} });
    },
    next() {
      const id = currentId();
      const form = {
        getAttribute(name) {
          return name === 'data-drill' ? id : null;
        },
      };
      const button = {
        closest(selector) {
          if (selector === '[data-drill-next]') return button;
          if (selector === '[data-drill]') return form;
          return null;
        },
      };
      listeners.click({ target: button });
    },
  };
}

test('a drill question renders formulas', () => {
  const html = renderDrillQueue({ ...water, q: 'How many atoms are in one H2O molecule?' });
  assert.match(html, /How many atoms are in one H<sub>2<\/sub>O molecule\?/);
  assert.doesNotMatch(html, /H2O/);
});

test('a drill miss stays on the same question until the worked solution', () => {
  const view = mount([koh, water]);
  view.submit('0.12 M');
  view.submit('0.12 M');
  view.submit('0.12 M');
  assert.equal(view.id, 'koh');
  assert.match(view.html, /Check sig figs/);
  assert.doesNotMatch(view.html, /Solution:/);
  assert.doesNotMatch(view.html, /data-drill-next/);

  view.submit('9 M');
  assert.equal(view.id, 'koh');
  assert.match(view.html, /Divide the moles by the liters/);
  assert.doesNotMatch(view.html, /Count four figures/);

  view.submit('8 M');
  assert.equal(view.id, 'koh');
  assert.match(view.html, /Count four figures/);
  assert.doesNotMatch(view.html, /Divide the moles by the liters/);

  view.submit('7 M');
  assert.equal(view.id, 'koh');
  assert.match(view.html, /Solution: 0\.1200 M\. Divide moles by liters\. The quotient uses four figures\./);
  assert.match(view.html, /data-drill-next/);
  assert.match(view.html, />Next</);

  view.next();
  assert.equal(view.id, 'water');
  assert.match(view.html, /Write the formula for water/);
  assert.doesNotMatch(view.html, /Solution:/);
});

test('a drill miss is saved and a sig-fig warning is not', () => {
  const view = mount([koh, water]);
  view.submit('0.12 M');
  view.submit('0.12 M');
  assert.equal(readProgress(view.store).misses[koh.id], undefined);
  assert.equal(readProgress(view.store).missesByTopic.molarity, undefined);
  view.submit('9 M');
  view.submit('8 M');
  assert.equal(readProgress(view.store).misses[koh.id], 2);
  assert.equal(readProgress(view.store).missesByTopic.molarity, 2);
  assert.equal(readProgress(view.store).misses[water.id], undefined);
});

test('a correct drill note includes the first sentence of why', () => {
  const view = mount([koh, water]);
  view.submit('0.1200 M');
  assert.equal(view.id, 'water');
  assert.match(view.html, /Correct\. Divide moles by liters\./);
  assert.match(view.html, /\+10 XP/);
  assert.doesNotMatch(view.html, /four figures/);
});
