import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const C = 4.184;
const dir = new URL('../content/ch09/', import.meta.url);
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

test('chapter 9 lessons match the schema', () => {
  assert.equal(lessons.length, 5);
  const ids = lessons.flatMap((lesson) => lesson.problems.map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const lesson of lessons) {
    assert.deepEqual(validateLesson(lesson), []);
    assert.equal(lesson.ch, 9);
    assert.ok(lesson.problems.length >= 10);
  }
});

test('heat, calorimetry, and Hess values are recomputed', () => {
  assert.equal(problem('ch9-q-warm').check.value, roundSig(50 * C * 25, 4));
  assert.equal(problem('ch9-q-cool').check.value, roundSig(100 * C * -55, 5));
  assert.equal(problem('ch9-q-c').check.value, roundSig(150 / (10 * 33), 3));
  const copper = (50 * 0.385 * 100 + 100 * C * 20) / (50 * 0.385 + 100 * C);
  assert.equal(problem('ch9-c-cu').check.value, roundSig(copper, 3));
  assert.equal(problem('ch9-c-rxn').check.value, roundSig(-100 * C * 5.2, 4));
  assert.equal(problem('ch9-h-h2').check.value, roundSig((10 / 2.016) * (-572 / 2), 4));
  assert.equal(problem('ch9-f-so').check.value, roundSig(2 * -395.7 - 2 * -296.8, 4));
  assert.equal(problem('ch9-z-co').check.value, roundSig(-393.5 + 283, 4));
  assert.equal(problem('ch9-z-ch4').check.value, roundSig(-393.5 + 2 * -285.8 + 890.3, 4));
  for (const lesson of lessons) {
    for (const item of lesson.problems) {
      assert.equal(grade(String(item.check.value), item.check).ok, true, item.id);
    }
  }
});
