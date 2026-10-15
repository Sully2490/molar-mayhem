import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const MASS = {
  H: 1.008, C: 12.01, N: 14.01, O: 16.00, Na: 22.99, Al: 26.98,
  Cl: 35.45, K: 39.10, Fe: 55.85, Ag: 107.87,
};

function mm(formula) {
  let i = 0;
  function count() {
    const match = formula.slice(i).match(/^(\d+)/);
    if (!match) return 1;
    i += match[0].length;
    return Number(match[1]);
  }
  function group() {
    let total = 0;
    while (i < formula.length && formula[i] !== ')') {
      if (formula[i] === '(') {
        i += 1;
        const inner = group();
        i += 1;
        total += inner * count();
      } else {
        const match = formula.slice(i).match(/^([A-Z][a-z]?)(\d*)/);
        i += match[0].length;
        total += MASS[match[1]] * (match[2] ? Number(match[2]) : 1);
      }
    }
    return total;
  }
  return group();
}

function roundSig(value, sigs) {
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (sigs - 1 - exponent);
  return Math.round(value * factor) / factor;
}

const dir = new URL('../content/ch07/', import.meta.url);
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

test('chapter 7 lessons match the schema', () => {
  assert.equal(lessons.length, 7);
  const ids = lessons.flatMap((lesson) => lesson.problems.map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const lesson of lessons) {
    assert.deepEqual(validateLesson(lesson), []);
    assert.equal(lesson.ch, 7);
    assert.ok(lesson.problems.length >= 10);
  }
});

test('strong acids treat HClO3 as a near miss', () => {
  const item = problem('ch7-strong-acids');
  assert.deepEqual(item.check.answers, ['HCl', 'HBr', 'HI', 'HNO3', 'H2SO4', 'HClO4']);
  assert.equal(grade('HCl, HBr, HI, HNO3, H2SO4, HClO4', item.check).ok, true);
  const miss = grade('HCl, HBr, HI, HNO3, H2SO4, HClO3', item.check);
  assert.equal(miss.ok, false);
  assert.equal(miss.reason, 'nearMiss');
  assert.match(miss.hint, /HClO4/);
  for (const formula of ['HF', 'CH3COOH', 'H2CO3', 'H3PO4']) {
    const found = lessons.flatMap((lesson) => lesson.problems).find((entry) => entry.q.includes(formula) && entry.a === 'weak');
    assert.equal(found.a, 'weak', formula);
  }
  assert.equal(grade('LiOH, NaOH, KOH, RbOH, CsOH, Ca(OH)2, Sr(OH)2, Ba(OH)2', problem('ch7-strong-bases').check).ok, true);
});

test('mass-mass, limiting yield, and titration are recomputed', () => {
  const water = (10 / mm('H2')) * mm('H2O');
  assert.equal(problem('ch7-st-h2').check.value, roundSig(water, 3));
  const fromH2 = (4 / mm('H2')) * mm('H2O');
  const fromO2 = (32 / mm('O2')) * (2 / 1) * mm('H2O');
  const theoretical = Math.min(fromH2, fromO2);
  assert.equal(problem('ch7-lim-water').a, 'H2');
  assert.equal(problem('ch7-th-water').check.value, roundSig(theoretical, 3));
  assert.equal(problem('ch7-py-water').check.value, roundSig((30 / theoretical) * 100, 3));
  assert.equal(problem('ch7-ox-mn').check.value, 7);
  assert.equal(problem('ch7-ox-cr').check.value, 6);
  assert.equal(problem('ch7-ox-o').check.value, -1);
  const acid = (0.2 * 0.03) / 2 / 0.015;
  assert.equal(problem('ch7-ti-h2so').check.value, roundSig(acid, 3));
  const chlorine = ((1 / mm('AgCl')) * MASS.Cl / 0.5) * 100;
  assert.equal(problem('ch7-ag').check.value, roundSig(chlorine, 3));
  assert.equal(problem('ch7-h').check.value, roundSig((5.4 / mm('H2O')) * 2, 3));
  assert.equal(grade('CH3', problem('ch7-emp').check).ok, true);
  assert.equal(grade('2, 1, 2', problem('ch7-b-water').check).ok, true);
});
