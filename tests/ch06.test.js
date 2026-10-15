import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const MASS = {
  H: 1.008, C: 12.01, N: 14.01, O: 16.00, Na: 22.99, Al: 26.98,
  S: 32.06, Cl: 35.45, K: 39.10, Ca: 40.08, Fe: 55.85, Cu: 63.55,
};
const NA = 6.022e23;

function molarMass(formula) {
  let i = 0;
  function readCount() {
    const match = formula.slice(i).match(/^(\d+)/);
    if (!match) return 1;
    i += match[0].length;
    return Number(match[1]);
  }
  function parseGroup() {
    let total = 0;
    while (i < formula.length && formula[i] !== ')') {
      if (formula[i] === '(') {
        i += 1;
        const inner = parseGroup();
        i += 1;
        total += inner * readCount();
      } else {
        const match = formula.slice(i).match(/^([A-Z][a-z]?)(\d*)/);
        i += match[0].length;
        total += MASS[match[1]] * (match[2] ? Number(match[2]) : 1);
      }
    }
    return total;
  }
  return parseGroup();
}

function roundSig(value, sigs) {
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (sigs - 1 - exponent);
  return Math.round(value * factor) / factor;
}

const dir = new URL('../content/ch06/', import.meta.url);
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

test('chapter 6 lessons match the schema', () => {
  assert.equal(lessons.length, 6);
  const ids = lessons.flatMap((lesson) => lesson.problems.map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const lesson of lessons) {
    assert.deepEqual(validateLesson(lesson), []);
    assert.equal(lesson.ch, 6);
    assert.ok(lesson.problems.length >= 10);
  }
});

test('molar masses, moles, and percents are recomputed', () => {
  const masses = { 'ch6-mm-h2o': 'H2O', 'ch6-mm-co2': 'CO2', 'ch6-mm-nacl': 'NaCl', 'ch6-mm-glu': 'C6H12O6', 'ch6-mm-ca': 'Ca(NO3)2' };
  for (const [id, formula] of Object.entries(masses)) {
    assert.equal(problem(id).check.value, roundSig(molarMass(formula), 4), id);
  }
  assert.equal(problem('ch6-mol-h2o').check.value, roundSig(36 / molarMass('H2O'), 3));
  assert.equal(problem('ch6-g-co2').check.value, roundSig(0.25 * molarMass('CO2'), 3));
  assert.equal(problem('ch6-p-fe').check.value, roundSig(3.01e24 / NA, 3));
  assert.equal(problem('ch6-pct-h-h2o').check.value, roundSig((2 * MASS.H / molarMass('H2O')) * 100, 3));
  assert.equal(problem('ch6-pct-fe-ox').check.value, roundSig((2 * MASS.Fe / molarMass('Fe2O3')) * 100, 3));
  assert.equal(problem('ch6-pct-al-sulf').check.value, roundSig((2 * MASS.Al / molarMass('Al2(SO4)3')) * 100, 3));
  assert.equal(grade('CH2O', problem('ch6-ef-ch2o').check).ok, true);
  assert.equal(grade('Fe2O3', problem('ch6-ef-fe2o3').check).ok, true);
  assert.equal(grade('C6H12O6', problem('ch6-mf-glu').check).ok, true);
  assert.equal(grade('ch2o', problem('ch6-ef-ch2o').check).ok, false);
});

test('molarity and dilution use liters', () => {
  assert.equal(problem('ch6-M-nacl').check.value, roundSig((5.85 / molarMass('NaCl')) / 0.5, 3));
  assert.equal(problem('ch6-g-kcl').check.value, roundSig(0.15 * 0.25 * molarMass('KCl'), 3));
  assert.equal(problem('ch6-n-75').check.value, roundSig(0.2 * 0.075, 3));
  assert.equal(problem('ch6-d-m1').check.value, roundSig(6 * 25 / 500, 3));
  assert.equal(problem('ch6-d-v1').check.value, roundSig(1 * 250 / 12, 3));
  assert.equal(problem('ch6-w-salt').check.value, roundSig(10 / 100 * 100, 3));
  assert.equal(problem('ch6-ppm-pb').check.value, roundSig((0.002 / 500) * 1e6, 3));
  assert.equal(problem('ch6-ppb-hg').check.value, roundSig((4e-6 / 1000) * 1e9, 3));
  assert.equal(problem('ch6-g-glu').check.value, roundSig(5 * 250 / 100, 3));
  for (const lesson of lessons) {
    for (const item of lesson.problems) {
      const sample = item.check.kind === 'numeric' ? String(item.check.value) : item.check.text;
      assert.equal(grade(sample, item.check).ok, true, item.id);
    }
  }
});
