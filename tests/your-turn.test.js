import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answersMatch, feedbackPlan, upgradeYourTurn, YOUR_TURN_ATTEMPTS } from '../js/steps/your-turn.js';

test('answers match after case, space, and times-sign folding', () => {
  assert.equal(answersMatch('  2, Paramagnetic ', '2, paramagnetic'), true);
  assert.equal(answersMatch('2.179×10−18', '2.179x10-18'), true);
  assert.equal(answersMatch('', '0'), false);
  assert.equal(answersMatch('1', '0.5'), false);
});

test('the hint comes first and the answer waits until the third miss', () => {
  assert.equal(YOUR_TURN_ATTEMPTS, 3);
  assert.deepEqual(feedbackPlan(1, true), {
    done: true,
    showHint: false,
    showAnswer: false,
    text: 'Correct.',
  });
  assert.equal(feedbackPlan(1, false).showAnswer, false);
  assert.equal(feedbackPlan(2, false).showAnswer, false);
  assert.equal(feedbackPlan(3, false).showAnswer, true);
  assert.match(feedbackPlan(3, false).text, /answer is below/i);
});

test('Your turn hides the hint and answer until the student asks or misses', () => {
  const doc = fakeDoc();
  const section = doc.createElement('section');
  section.append(doc.createElement('h2', 'Your turn'));
  section.append(doc.createElement('p', 'What is the bond order of N2?'));
  const hint = doc.createElement('p');
  hint.append(doc.createElement('strong', 'Hint:'));
  hint.append(doc.createText(' Count 10 valence electrons.'));
  const answer = doc.createElement('p');
  answer.append(doc.createElement('strong', 'Answer:'));
  answer.append(doc.createText(' 3, diamagnetic'));
  section.append(hint, answer);
  doc.body.append(section);

  upgradeYourTurn(doc.body);
  assert.equal(hint.hidden, true);
  assert.equal(answer.hidden, true);
  assert.equal(section.dataset.answer, '3, diamagnetic');
  const buttons = section.querySelectorAll('button');
  assert.equal(buttons[0].textContent, 'Show hint');
  buttons[0].dispatchEvent({ type: 'click' });
  assert.equal(hint.hidden, false);
  assert.equal(answer.hidden, true);

  const input = section.querySelector('input');
  const check = buttons.find((button) => button.textContent === 'Check');
  input.value = '2, paramagnetic';
  check.dispatchEvent({ type: 'click' });
  check.dispatchEvent({ type: 'click' });
  assert.equal(answer.hidden, true);
  check.dispatchEvent({ type: 'click' });
  assert.equal(answer.hidden, false);
  assert.match(section.querySelector('[data-your-turn-live]').textContent, /answer is below/i);

  const fresh = doc.createElement('section');
  fresh.append(doc.createElement('h2', 'Your turn'));
  const freshHint = doc.createElement('p');
  freshHint.append(doc.createElement('strong', 'Hint:'));
  freshHint.append(doc.createText(' Add.'));
  const freshAnswer = doc.createElement('p');
  freshAnswer.append(doc.createElement('strong', 'Answer:'));
  freshAnswer.append(doc.createText(' 4'));
  fresh.append(freshHint, freshAnswer);
  doc.body.append(fresh);
  upgradeYourTurn(doc.body);
  const freshInput = fresh.querySelector('input');
  const freshCheck = fresh.querySelectorAll('button').find((button) => button.textContent === 'Check');
  freshInput.value = '4';
  freshCheck.dispatchEvent({ type: 'click' });
  assert.equal(freshAnswer.hidden, true);
  assert.equal(fresh.querySelector('[data-your-turn-live]').textContent, 'Correct.');
});

function fakeDoc() {
  const doc = {};
  doc.createElement = (tag, text) => makeEl(tag, doc, text);
  doc.createText = (value) => ({ nodeType: 3, nodeValue: value, textContent: value });
  doc.body = doc.createElement('body');
  return doc;
}

function makeEl(tag, doc, text = '') {
  const el = {
    tagName: String(tag).toUpperCase(),
    ownerDocument: doc,
    parentNode: null,
    parentElement: null,
    children: [],
    className: '',
    hidden: false,
    disabled: false,
    id: '',
    value: '',
    textContent: text,
    dataset: {},
    attributes: new Map(),
    listeners: new Map(),
  };
  el.append = (...nodes) => {
    for (const node of nodes) {
      node.parentNode = el;
      node.parentElement = el;
      el.children.push(node);
      if (node.textContent) el.textContent += node.textContent;
    }
  };
  el.setAttribute = (name, value) => el.attributes.set(name, String(value));
  el.getAttribute = (name) => (el.attributes.has(name) ? el.attributes.get(name) : null);
  el.addEventListener = (type, fn) => {
    const list = el.listeners.get(type) ?? [];
    list.push(fn);
    el.listeners.set(type, list);
  };
  el.dispatchEvent = (event) => {
    for (const fn of el.listeners.get(event.type) ?? []) fn(event);
  };
  el.querySelector = (selector) => query(el, selector)[0] ?? null;
  el.querySelectorAll = (selector) => query(el, selector);
  return el;
}

function query(node, selector) {
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
  if (selector === 'h2' || selector === 'p' || selector === 'strong' || selector === 'button' || selector === 'input') {
    return el.tagName === selector.toUpperCase();
  }
  if (selector === '[data-your-turn-live]') return el.dataset?.yourTurnLive === 'true';
  return false;
}
