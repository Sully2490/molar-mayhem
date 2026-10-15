import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const R = 0.08206;
const dir = new URL('../content/ch08/', import.meta.url);
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

test('chapter 8 lessons match the schema', () => {
  assert.equal(lessons.length, 5);
  const ids = lessons.flatMap((lesson) => lesson.problems.map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const lesson of lessons) {
    assert.deepEqual(validateLesson(lesson), []);
    assert.equal(lesson.ch, 8);
    assert.ok(lesson.problems.length >= 10);
  }
});

test('pressure, gas laws, and PV = nRT are recomputed', () => {
  assert.equal(problem('ch8-p-745').check.value, roundSig(745 / 760, 3));
  assert.equal(problem('ch8-p-kpa').check.value, roundSig(98.5 / 101.325, 3));
  assert.equal(problem('ch8-p-add').check.value, 785);
  assert.equal(problem('ch8-p-sub').check.value, 715);
  assert.equal(problem('ch8-l-charles').check.value, roundSig(5 * (373 / 298), 3));
  assert.equal(problem('ch8-l-comb').check.value, roundSig((1 * 2 / 273) * (350 / 2.5), 3));
  assert.equal(problem('ch8-i-v').check.value, roundSig((2 * R * 300) / 1.5, 3));
  assert.equal(problem('ch8-i-o2').check.value, roundSig(((8 / 32) * R * 300) / 4, 3));
  assert.equal(problem('ch8-s-rx').check.value, roundSig((4 / 2.016) * 0.5 * 22.4, 3));
  assert.equal(problem('ch8-d-wet').check.value, roundSig(755 - 23.8, 3));
  assert.equal(problem('ch8-d-he').check.value, roundSig(2 * 0.25, 3));
  for (const lesson of lessons) {
    for (const item of lesson.problems) {
      assert.equal(grade(String(item.check.value), item.check).ok, true, item.id);
    }
  }
});
