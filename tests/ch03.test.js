import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const C = 2.998e8;
const H = 6.626e-34;
const R = 1.097e7;

const dir = new URL('../content/ch03/', import.meta.url);
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

test('chapter 3 lessons match the schema', () => {
  assert.equal(lessons.length, 7);
  const ids = lessons.flatMap((lesson) => lesson.problems.map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const lesson of lessons) {
    assert.deepEqual(validateLesson(lesson), []);
    assert.equal(lesson.ch, 3);
    assert.ok(lesson.problems.length >= 10);
    assert.match(lesson.openstax_section, /OpenStax AF2e §3/);
  }
});

test('photon frequency and energy use OpenStax c and h', () => {
  for (const nm of [400, 486, 550, 656, 700]) {
    const lambda = nm * 1e-9;
    const frequency = roundSig(C / lambda, 3);
    const energy = roundSig((H * C) / lambda, 3);
    assert.equal(problem(`ch3-nu-${nm}`).check.value, frequency, `nu ${nm}`);
    assert.equal(problem(`ch3-e-${nm}`).check.value, energy, `e ${nm}`);
  }
});

test('Rydberg wavelengths use R = 1.097e7', () => {
  const jumps = [[3, 2], [4, 2], [5, 2], [6, 2], [2, 1], [3, 1], [4, 3], [5, 3], [4, 1], [5, 4]];
  for (const [hi, lo] of jumps) {
    const delta = (1 / lo ** 2) - (1 / hi ** 2);
    const nm = roundSig(1e9 / (R * delta), 3);
    assert.equal(problem(`ch3-ry-${hi}${lo}`).check.value, nm, `${hi}-${lo}`);
  }
});

test('quantum-number rules and Hund counts grade', () => {
  assert.equal(grade('valid', problem('ch3-q-ok').check).ok, true);
  assert.equal(grade('invalid', problem('ch3-q-l').check).ok, true);
  assert.equal(grade('invalid', problem('ch3-q-ml').check).ok, true);
  assert.equal(grade('invalid', problem('ch3-q-spin').check).ok, true);
  assert.equal(problem('ch3-q-orb').check.value, 2 * 2 + 1);
  assert.equal(problem('ch3-q-e').check.value, 2 * 3 ** 2);
  assert.equal(grade('sphere', problem('ch3-shape-s').check).ok, true);
  assert.equal(grade('dumbbell', problem('ch3-shape-p').check).ok, true);
  const unpaired = { c: 2, n: 3, o: 2, p: 3, s: 2, fe: 4, f: 1, ti: 2, cr: 6, mn: 5 };
  for (const [id, count] of Object.entries(unpaired)) {
    assert.equal(problem(`ch3-o-${id}`).check.value, count);
  }
});

test('configurations identify the element and reject a wrong config', () => {
  const cores = { '[He]': 2, '[Ne]': 10, '[Ar]': 18, '[Kr]': 36 };
  const names = {
    'ch3-z-f': 9,
    'ch3-z-mg': 12,
    'ch3-z-p': 15,
    'ch3-z-cl': 17,
    'ch3-z-k': 19,
    'ch3-z-v': 23,
    'ch3-z-fe': 26,
    'ch3-z-ga': 31,
    'ch3-z-se': 34,
    'ch3-z-kr': 36,
    'ch3-z-si': 14,
  };
  for (const [id, atomicNumber] of Object.entries(names)) {
    const configuration = problem(id).q.match(/configuration (.+)\?/)[1];
    let total = 0;
    const core = configuration.match(/\[[A-Za-z]+\]/);
    if (core) total += cores[core[0]];
    for (const count of configuration.matchAll(/[spdf](\d+)/g)) total += Number(count[1]);
    assert.equal(total, atomicNumber, id);
    assert.equal(grade(problem(id).a, problem(id).check).ok, true, id);
  }
  assert.equal(grade('1s2 2s2 2p3', problem('ch3-c-n').check).ok, true);
  assert.equal(grade('[Ar] 4s2 3d6', problem('ch3-c-fe').check).ok, true);
  assert.equal(grade('[Ar] 4s2 3d10', problem('ch3-c-zn').check).ok, true);
  assert.equal(grade('[Ar] 3d6', problem('ch3-i-fe2').check).ok, true);
  assert.equal(grade('[Ar] 4s2 3d4', problem('ch3-i-fe2').check).ok, false);
  assert.equal(grade('1s2 2s2 2p6 3s2 3p6 4s2 3d4', problem('ch3-c-cr').check).ok, false);
  assert.equal(grade('sodium', problem('ch3-t-na').check).ok, true);
  assert.equal(grade('O < S < Se', problem('ch3-t-rank-r').check).ok, true);
});
