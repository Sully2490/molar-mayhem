import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const dir = new URL('../content/ch04/', import.meta.url);
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

function bondClass(left, right) {
  const delta = Math.abs(left - right);
  if (delta < 0.4) return 'nonpolar';
  if (delta <= 1.8) return 'polar';
  return 'ionic';
}

test('chapter 4 lessons match the schema', () => {
  assert.equal(lessons.length, 4);
  const ids = lessons.flatMap((lesson) => lesson.problems.map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const lesson of lessons) {
    assert.deepEqual(validateLesson(lesson), []);
    assert.equal(lesson.ch, 4);
    assert.ok(lesson.problems.length >= 10);
  }
});

test('bond class follows the 0.4 and 1.8 cuts', () => {
  const rows = {
    'ch4-d-ch': [2.55, 2.2, 'nonpolar'],
    'ch4-d-oh': [3.44, 2.2, 'polar'],
    'ch4-d-nacl': [0.93, 3.16, 'ionic'],
    'ch4-d-co': [2.55, 3.44, 'polar'],
    'ch4-d-nn': [3.04, 3.04, 'nonpolar'],
    'ch4-d-mgo': [1.31, 3.44, 'ionic'],
    'ch4-d-hcl': [2.2, 3.16, 'polar'],
    'ch4-d-cs': [2.55, 2.58, 'nonpolar'],
    'ch4-d-kf': [0.82, 3.98, 'ionic'],
    'ch4-d-nh': [3.04, 2.2, 'polar'],
    'ch4-d-so': [2.58, 3.44, 'polar'],
    'ch4-d-br': [2.96, 2.96, 'nonpolar'],
  };
  for (const [id, [left, right, expected]] of Object.entries(rows)) {
    assert.equal(bondClass(left, right), expected, id);
    assert.equal(problem(id).a, expected, id);
    assert.equal(grade(expected, problem(id).check).ok, true, id);
  }
});

test('valence counts and formal charges are recomputed', () => {
  const counts = {
    'ch4-e-co2': 4 + 6 + 6,
    'ch4-e-h2o': 1 + 1 + 6,
    'ch4-e-nh3': 5 + 1 + 1 + 1,
    'ch4-e-hcn': 1 + 4 + 5,
    'ch4-e-no3': 5 + 6 + 6 + 6 + 1,
    'ch4-e-ch2o': 4 + 1 + 1 + 6,
    'ch4-e-so4': 6 + 6 * 4 + 2,
    'ch4-e-bf3': 3 + 7 * 3,
    'ch4-e-pcl5': 5 + 7 * 5,
    'ch4-e-cn': 4 + 5 + 1,
  };
  for (const [id, count] of Object.entries(counts)) {
    assert.equal(problem(id).check.value, count, id);
    assert.equal(grade(String(count), problem(id).check).ok, true, id);
  }
  assert.equal(problem('ch4-fc-o').check.value, 6 - 6 - 1);
  assert.equal(problem('ch4-fc-n').check.value, 5 - 0 - 4);
});

test('shapes and molecular polarity grade', () => {
  const shapes = {
    'ch4-s-ch4': 'tetrahedral',
    'ch4-s-nh3': 'trigonal pyramidal',
    'ch4-s-h2o': 'bent',
    'ch4-s-co2': 'linear',
    'ch4-s-bf3': 'trigonal planar',
    'ch4-s-xef4': 'square planar',
    'ch4-s-sf4': 'seesaw',
    'ch4-s-clf3': 't-shaped',
    'ch4-s-i3': 'linear',
    'ch4-s-pcl5': 'trigonal bipyramidal',
    'ch4-s-sf6': 'octahedral',
  };
  for (const [id, shape] of Object.entries(shapes)) {
    assert.equal(problem(id).a, shape);
    assert.equal(grade(shape, problem(id).check).ok, true, id);
  }
  assert.equal(grade('nonpolar', problem('ch4-p-co2').check).ok, true);
  assert.equal(grade('polar', problem('ch4-p-h2o').check).ok, true);
  assert.equal(grade('polar', problem('ch4-p-co2').check).ok, false);
  assert.equal(grade('nonpolar', problem('ch4-p-xef4').check).ok, true);
  assert.equal(grade('polar', problem('ch4-p-sf4').check).ok, true);
});
