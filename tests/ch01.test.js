import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { feedbackFor, labelFor, renderLearn } from '../js/learn.js';
import { validateLesson } from '../js/schema.js';

const dir = new URL('../content/ch01/', import.meta.url);
const lessons = readdirSync(dir)
  .filter((name) => name.endsWith('.json') && name !== 'index.json')
  .sort()
  .map((name) => JSON.parse(readFileSync(new URL(name, dir), 'utf8')));

function problem(id) {
  for (const lesson of lessons) {
    const found = lesson.problems.find((item) => item.id === id);
    if (found) return found;
  }
  throw new Error(id);
}

function roundSig(value, sigs) {
  if (value === 0) return 0;
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (sigs - 1 - exponent);
  return Math.round(value * factor) / factor;
}

function countSig(text) {
  const coefficient = text.split(/[×x]/i)[0].trim();
  const digits = coefficient.replace(/^[+-]/, '');
  if (digits.includes('.')) {
    return `${digits.split('.')[0]}${digits.split('.')[1]}`.replace(/^0+/, '').length;
  }
  const body = digits.replace(/^0+/, '');
  if (body === '') return 1;
  return body.replace(/0+$/, '').length;
}

test('chapter 1 lessons match the schema and show labeled answers', () => {
  assert.equal(lessons.length, 6);
  for (const lesson of lessons) {
    assert.deepEqual(validateLesson(lesson), []);
    assert.equal(lesson.ch, 1);
    assert.ok(lesson.problems.length >= 10);
  }
  const html = renderLearn(lessons, 'ch1-density');
  assert.match(html, /class="answer-label"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Your answer/);
  const sample = problem('ch1-d-270');
  assert.equal(labelFor(sample), 'Your answer');
});

test('physical and matter answers follow the classification rules', () => {
  const physical = {
    'ch1-phys-melt': 'physical change',
    'ch1-phys-rust': 'chemical change',
    'ch1-phys-sugar': 'physical change',
    'ch1-phys-wood': 'chemical change',
    'ch1-phys-bp': 'physical property',
    'ch1-phys-flame': 'chemical property',
    'ch1-phys-conduct': 'physical property',
    'ch1-phys-fizz': 'chemical change',
    'ch1-phys-density': 'intensive',
    'ch1-phys-mass': 'extensive',
    'ch1-phys-tarnish': 'chemical change',
  };
  for (const [id, answer] of Object.entries(physical)) {
    assert.equal(problem(id).a.toLowerCase(), answer);
    assert.equal(grade(answer, problem(id).check).ok, true, id);
  }
  const matter = {
    'ch1-mat-o2': 'element',
    'ch1-mat-nacl': 'compound',
    'ch1-mat-saltwater': 'homogeneous mixture',
    'ch1-mat-sand': 'heterogeneous mixture',
    'ch1-mat-air': 'homogeneous mixture',
    'ch1-mat-water': 'compound',
    'ch1-mat-granite': 'heterogeneous mixture',
    'ch1-mat-brass': 'homogeneous mixture',
    'ch1-mat-hg': 'element',
    'ch1-mat-dressing': 'heterogeneous mixture',
    'ch1-mat-co2': 'compound',
  };
  for (const [id, answer] of Object.entries(matter)) {
    assert.equal(problem(id).a.toLowerCase(), answer);
    assert.equal(grade(answer, problem(id).check).ok, true, id);
  }
});

test('significant-figure counts and rounded arithmetic are recomputed', () => {
  const written = {
    'ch1-sf-00450': '0.00450',
    'ch1-sf-1200': '1200',
    'ch1-sf-1200dot': '1200.',
    'ch1-sf-30070': '30.070',
    'ch1-sf-sci': '5.0×10³',
    'ch1-sf-0102': '0.0102',
    'ch1-sf-100': '100.0',
    'ch1-sf-7': '7',
  };
  for (const [id, text] of Object.entries(written)) {
    assert.equal(problem(id).check.value, countSig(text), id);
  }
  const arithmetic = {
    'ch1-sf-mul': { raw: 4.56 * 1.4, sigs: 2 },
    'ch1-sf-add': { raw: 12.11 + 3.2, sigs: 3, places: 1 },
    'ch1-sf-div': { raw: 0.084 / 2, sigs: 2 },
  };
  assert.equal(problem('ch1-sf-mul').check.value, roundSig(arithmetic['ch1-sf-mul'].raw, 2));
  const added = Math.round((12.11 + 3.2) * 10) / 10;
  assert.equal(problem('ch1-sf-add').check.value, added);
  assert.equal(problem('ch1-sf-div').check.value, roundSig(0.084 / 2, 2));
  for (const lesson of lessons) {
    for (const item of lesson.problems) {
      if (item.check.kind !== 'numeric') continue;
      assert.equal(grade(String(item.check.value), item.check).ok, true, item.id);
    }
  }
});

test('metric, density, and temperature values are recomputed', () => {
  const expected = {
    'ch1-m-km': roundSig(2.5 * 1000, 2),
    'ch1-m-mg': roundSig(450 * 0.001, 2),
    'ch1-m-l': roundSig(0.035 * 1000, 2),
    'ch1-m-nm': roundSig(625 * 1e-9, 3),
    'ch1-m-ug': roundSig(3.2 * 1e-6, 2),
    'ch1-m-cm': roundSig(12.5 * 0.01, 3),
    'ch1-m-mm': roundSig(7.8e5 * 1e-6, 3),
    'ch1-m-kg': roundSig(0.0042 * 1e6, 2),
    'ch1-m-ml': roundSig(250 * 0.001, 3),
    'ch1-m-ghz': roundSig(1.5 * 1e9, 2),
    'ch1-d-270': roundSig(25 / 9.26, 3),
    'ch1-d-136': roundSig(13.6 / 1, 3),
    'ch1-d-079': roundSig(5 / 6.33, 2),
    'ch1-d-113': roundSig(48.2 / 4.26, 3),
    'ch1-d-787': roundSig(100 / 12.7, 3),
    'ch1-d-disp1': roundSig(30.5 / (23.9 - 20), 2),
    'ch1-d-disp2': roundSig(15.2 / (55.6 - 50), 2),
    'ch1-d-disp3': roundSig(88 / (21.3 - 10), 3),
    'ch1-d-gold': roundSig(19.3 * 2.5, 3),
    'ch1-d-eth': roundSig(50 / 0.789, 3),
    'ch1-da-in': roundSig(12 * 2.54, 3),
    'ch1-da-lb': roundSig(155 * 453.6 / 1000, 3),
    'ch1-da-qt': roundSig(2 / 1.057, 3),
    'ch1-da-mph': roundSig(65 * 1609 / 3600, 3),
    'ch1-da-days': roundSig(3.5 * 24 * 60 * 60, 3),
    'ch1-da-k': 25 + 273.15,
    'ch1-da-f': roundSig((98.6 - 32) / 1.8, 3),
    'ch1-da-neg': 1.8 * -40 + 32,
    'ch1-da-c': 350 - 273.15,
    'ch1-da-fuel': roundSig(8.5 * 340 / 100, 3),
  };
  for (const [id, value] of Object.entries(expected)) {
    const stored = problem(id).check.value;
    assert.ok(Math.abs(stored - value) <= 1e-9 * Math.max(1, Math.abs(value)), id);
  }
});

test('a wrong answer gets a hint, then the solution on the third miss', () => {
  const item = problem('ch1-phys-melt');
  const first = feedbackFor({ ok: false, reason: 'exact' }, 1, item);
  assert.equal(first.done, false);
  assert.match(first.text, /Not yet/);
  const last = feedbackFor({ ok: false, reason: 'exact' }, 3, item);
  assert.equal(last.done, true);
  assert.match(last.text, /Physical change/);
  const right = feedbackFor({ ok: true }, 1, item);
  assert.equal(right.status, 'correct');
});
