import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const dir = new URL('../content/ch02/', import.meta.url);
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
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (sigs - 1 - exponent);
  return Math.round(value * factor) / factor;
}

function weighted(m1, percent, m2) {
  const fraction = percent / 100;
  return m1 * fraction + m2 * (1 - fraction);
}

test('chapter 2 lessons match the schema', () => {
  assert.equal(lessons.length, 5);
  for (const lesson of lessons) {
    assert.deepEqual(validateLesson(lesson), []);
    assert.equal(lesson.ch, 2);
    assert.ok(lesson.problems.length >= 10);
    assert.match(lesson.openstax_section, /OpenStax AF2e §2/);
  }
});

test('particle counts follow Z, A, and charge', () => {
  const rows = {
    'ch2-p-c13': [6, 13, 0],
    'ch2-p-cl37': [17, 37, 0],
    'ch2-p-fe': [26, 56, 3],
    'ch2-p-o': [8, 16, -2],
    'ch2-p-na': [11, 23, 1],
    'ch2-p-u': [92, 238, 0],
    'ch2-p-s': [16, 32, -2],
    'ch2-p-ca': [20, 40, 2],
    'ch2-p-br': [35, 81, -1],
    'ch2-p-al': [13, 27, 3],
  };
  for (const [id, [protons, mass, charge]] of Object.entries(rows)) {
    const neutrons = mass - protons;
    const electrons = protons - charge;
    const answer = `${protons}, ${neutrons}, ${electrons}`;
    assert.equal(problem(id).a, answer, id);
    assert.equal(grade(answer, problem(id).check).ok, true, id);
    assert.equal(grade(answer.replaceAll(', ', ','), problem(id).check).ok, true, id);
  }
});

test('average masses and abundances are recomputed', () => {
  const averages = {
    'ch2-m-cl': [34.969, 75.76, 36.966, 5],
    'ch2-m-cu': [62.93, 69.15, 64.928, 5],
    'ch2-m-b': [10.013, 19.9, 11.009, 5],
    'ch2-m-li': [6.015, 7.59, 7.016, 4],
    'ch2-m-br': [78.918, 50.69, 80.916, 5],
    'ch2-m-ag': [106.905, 51.84, 108.905, 5],
  };
  for (const [id, [m1, percent, m2, sigs]] of Object.entries(averages)) {
    const value = roundSig(weighted(m1, percent, m2), sigs);
    assert.equal(problem(id).check.value, value, id);
    assert.equal(grade(String(value), problem(id).check).ok, true, id);
  }
  const percents = {
    'ch2-m-xcu': [62.93, 64.928, 63.546],
    'ch2-m-xsr': [84.912, 86.909, 85.468],
    'ch2-m-xga': [68.926, 70.925, 69.723],
    'ch2-m-xsb': [120.904, 122.904, 121.76],
  };
  for (const [id, [m1, m2, average]] of Object.entries(percents)) {
    const value = roundSig(((average - m2) / (m1 - m2)) * 100, 3);
    assert.equal(problem(id).check.value, value, id);
  }
});

test('ionic, covalent, formula, and name answers grade', () => {
  const bonds = {
    'ch2-b-mgcl': 'ionic',
    'ch2-b-co2': 'covalent',
    'ch2-b-mgo': 'ionic',
    'ch2-b-nh3': 'covalent',
    'ch2-b-mgno': 'ionic',
    'ch2-b-so3': 'covalent',
    'ch2-b-naf': 'ionic',
    'ch2-b-ccl': 'covalent',
    'ch2-b-nh4': 'ionic',
    'ch2-b-n2o': 'covalent',
    'ch2-b-ca': 'ionic',
    'ch2-b-pcl': 'covalent',
  };
  for (const [id, answer] of Object.entries(bonds)) {
    assert.equal(problem(id).check.case, 'insensitive');
    assert.equal(grade(answer, problem(id).check).ok, true, id);
  }
  assert.equal(grade('Al2O3', problem('ch2-f-al').check).ok, true);
  assert.equal(grade('al2o3', problem('ch2-f-al').check).ok, false);
  assert.equal(grade('Ca3(PO4)2', problem('ch2-f-ca').check).ok, true);
  assert.equal(grade('Ca3PO42', problem('ch2-f-ca').check).ok, false);
  assert.equal(grade('iron(III) chloride', problem('ch2-n-fe').check).ok, true);
  assert.equal(grade('dinitrogen pentoxide', problem('ch2-c-n2o5').check).ok, true);
  assert.equal(grade('carbon monoxide', problem('ch2-c-co').check).ok, true);
  for (const lesson of lessons) {
    for (const item of lesson.problems) {
      const sample = item.check.kind === 'numeric' ? String(item.check.value) : item.check.text;
      assert.equal(grade(sample, item.check).ok, true, item.id);
    }
  }
});
