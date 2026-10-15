import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeHtml, renderMath } from '../js/math/render.js';
import { upgradeMath } from '../js/math/upgrade.js';
import { renderExam3 } from '../js/exam/html.js';
import { renderGuided } from '../js/steps/render.js';

test('one renderer turns powers, scientific notation, and formulas into HTML', () => {
  assert.equal(renderMath('Z^2'), 'Z<sup>2</sup>');
  assert.equal(renderMath('2.179e-18'), '2.179×10<sup>−18</sup>');
  assert.equal(renderMath('H2O'), 'H<sub>2</sub>O');
  assert.equal(renderMath('Ca(OH)2'), 'Ca(OH)<sub>2</sub>');
  assert.equal(renderMath('n_low'), 'n<sub>low</sub>');
  assert.equal(renderMath('n_low^2'), 'n<sub>low</sub><sup>2</sup>');
  assert.equal(renderMath('SO4^2-'), 'SO<sub>4</sub><sup>2−</sup>');
  assert.equal(renderMath('O2−'), 'O<sub>2</sub>−');
  assert.equal(renderMath('O2^2−'), 'O<sub>2</sub><sup>2−</sup>');
  assert.equal(renderMath('sp3'), 'sp3');
  assert.equal(renderMath('OpenStax AF2e §5.4'), 'OpenStax AF2e §5.4');
  assert.equal(renderMath('He+'), 'He+');
  assert.equal(renderMath('Be careful'), 'Be careful');
  assert.equal(renderMath('a < b & c'), 'a &lt; b &amp; c');
  assert.equal(escapeHtml('<'), '&lt;');
});

test('guided steps and Exam 3 questions use the same renderer', () => {
  const guided = renderGuided({
    id: 'rydberg',
    a: 'Z^2',
    why: 'The constant is 2.179e-18 J.',
    guided: [],
  });
  assert.match(guided, /Z<sup>2<\/sup>/);
  assert.match(guided, /2\.179×10<sup>−18<\/sup>/);

  const exam = renderExam3([{
    id: 'water',
    ch: 1,
    q: 'Write H2O and Z^2.',
    a: 'H2O',
    why: 'Two hydrogens.',
    check: { kind: 'exact', text: 'H2O' },
  }]);
  assert.match(exam, /H<sub>2<\/sub>O/);
  assert.match(exam, /Z<sup>2<\/sup>/);
});

test('math upgrade rewrites text nodes and leaves tags alone', () => {
  const doc = fakeDoc();
  const paragraph = doc.createElement('p');
  paragraph.appendChild(doc.createText('Energy 2.179e-18'));
  const already = doc.createElement('sup');
  already.appendChild(doc.createText('2'));
  paragraph.appendChild(already);
  doc.body.appendChild(paragraph);
  upgradeMath(doc.body);
  assert.equal(paragraph.childNodes[0].className, 'mm-math');
  assert.match(paragraph.childNodes[0].innerHTML, /10<sup>−18<\/sup>/);
  assert.equal(paragraph.childNodes[1].tagName, 'SUP');
  assert.equal(paragraph.childNodes[1].childNodes[0].nodeValue, '2');
});

function fakeDoc() {
  const doc = { nodeType: 9 };
  doc.createElement = (tag) => makeEl(tag, doc);
  doc.createText = (value) => ({ nodeType: 3, nodeValue: value, parentNode: null, parentElement: null });
  doc.body = doc.createElement('body');
  return doc;
}

function makeEl(tag, doc) {
  const el = {
    nodeType: 1,
    tagName: String(tag).toUpperCase(),
    ownerDocument: doc,
    childNodes: [],
    className: '',
    innerHTML: '',
    parentNode: null,
    parentElement: null,
  };
  el.appendChild = (child) => {
    child.parentNode = el;
    child.parentElement = el;
    el.childNodes.push(child);
  };
  el.replaceChild = (next, old) => {
    const index = el.childNodes.indexOf(old);
    next.parentNode = el;
    next.parentElement = el;
    el.childNodes[index] = next;
  };
  return el;
}
