import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const lessonDir = new URL('../content/ch05/', import.meta.url);
const lessons = readdirSync(lessonDir)
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(new URL(name, lessonDir), 'utf8')));

function byId(id) {
  for (const lesson of lessons) {
    const problem = lesson.problems.find((item) => item.id === id);
    if (problem) return problem;
  }
  return null;
}

const HYBRID_BY_GROUPS = { 2: 'sp', 3: 'sp2', 4: 'sp3', 5: 'sp3d', 6: 'sp3d2' };

// Bonding regions count a multiple bond as one region. Lone pairs are separate groups.
const HYBRID_CENTERS = {
  'ch5-hyb-ch4': { regions: 4, lonePairs: 0 },
  'ch5-hyb-co2': { regions: 2, lonePairs: 0 },
  'ch5-hyb-ch2o': { regions: 3, lonePairs: 0 },
  'ch5-hyb-nh3': { regions: 3, lonePairs: 1 },
  'ch5-hyb-h2o': { regions: 2, lonePairs: 2 },
  'ch5-hyb-bf3': { regions: 3, lonePairs: 0 },
  'ch5-hyb-hcn': { regions: 2, lonePairs: 0 },
  'ch5-hyb-pcl5': { regions: 5, lonePairs: 0 },
  'ch5-hyb-sf6': { regions: 6, lonePairs: 0 },
  'ch5-hyb-xef4': { regions: 4, lonePairs: 2 },
  'ch5-hyb-c2h4': { regions: 3, lonePairs: 0 },
  'ch5-hyb-c2h2': { regions: 2, lonePairs: 0 },
};

function hybridName(center) {
  return HYBRID_BY_GROUPS[center.regions + center.lonePairs];
}

// Each entry is a bond order. A bond contributes 1 sigma and (order - 1) pi bonds.
const BOND_ORDERS = {
  'ch5-sig-h2': [1],
  'ch5-sig-o2': [2],
  'ch5-sig-n2': [3],
  'ch5-sig-co2': [2, 2],
  'ch5-sig-c2h4': [1, 1, 1, 1, 2],
  'ch5-sig-c2h2': [1, 1, 3],
  'ch5-sig-hcn': [1, 3],
  'ch5-sig-ch2o': [1, 1, 2],
  'ch5-sig-ch4': [1, 1, 1, 1],
  'ch5-sig-c2h6': [1, 1, 1, 1, 1, 1, 1],
  'ch5-sig-h2o': [1, 1],
};

function sigmaPi(orders) {
  let sigma = 0;
  let pi = 0;
  for (const order of orders) {
    sigma += 1;
    pi += order - 1;
  }
  return { sigma, pi };
}

// Valence MO fill. Early period-2 order puts pi 2p under sigma 2p.
const EARLY_2P = [
  { cap: 2, bonding: true },
  { cap: 2, bonding: false },
  { cap: 4, bonding: true },
  { cap: 2, bonding: true },
  { cap: 4, bonding: false },
  { cap: 2, bonding: false },
];
const LATE_2P = [
  { cap: 2, bonding: true },
  { cap: 2, bonding: false },
  { cap: 2, bonding: true },
  { cap: 4, bonding: true },
  { cap: 4, bonding: false },
  { cap: 2, bonding: false },
];
const H_1S = [
  { cap: 2, bonding: true },
  { cap: 2, bonding: false },
];

function fillMo(levels, electrons) {
  let bonding = 0;
  let antibonding = 0;
  let unpaired = 0;
  let left = electrons;
  for (const level of levels) {
    const take = Math.min(level.cap, left);
    left -= take;
    if (level.bonding) bonding += take;
    else antibonding += take;
    const orbitals = level.cap / 2;
    const singles = Math.min(orbitals, take);
    const pairs = Math.max(0, take - orbitals);
    unpaired += singles - pairs;
  }
  if (left !== 0) throw new Error(`MO diagram overflow for ${electrons} electrons`);
  return {
    order: (bonding - antibonding) / 2,
    magnetism: unpaired > 0 ? 'paramagnetic' : 'diamagnetic',
    bonding,
    antibonding,
  };
}

const MO_SPECIES = {
  'ch5-mo-h2': fillMo(H_1S, 2),
  'ch5-mo-h2plus': fillMo(H_1S, 1),
  'ch5-mo-he2': fillMo(H_1S, 4),
  'ch5-mo-li2': fillMo(EARLY_2P, 2),
  'ch5-mo-b2': fillMo(EARLY_2P, 6),
  'ch5-mo-c2': fillMo(EARLY_2P, 8),
  'ch5-mo-n2': fillMo(EARLY_2P, 10),
  'ch5-mo-n2plus': fillMo(EARLY_2P, 9),
  'ch5-mo-o2': fillMo(LATE_2P, 12),
  'ch5-mo-o2minus': fillMo(LATE_2P, 13),
  'ch5-mo-o22minus': fillMo(LATE_2P, 14),
  'ch5-mo-f2': fillMo(LATE_2P, 14),
};

test('chapter 5 lessons match the lesson schema', () => {
  assert.equal(lessons.length, 3);
  for (const lesson of lessons) {
    assert.deepEqual(validateLesson(lesson), []);
    assert.equal(lesson.ch, 5);
    assert.match(lesson.openstax_section, /OpenStax AF2e §5\.[123]/);
    assert.ok(lesson.problems.length >= 10);
    assert.ok(lesson.steps.length >= 3);
    assert.ok(lesson.similar_problem.hint.length > 0);
  }
});

test('hybridization follows the electron-group count', () => {
  const lesson = lessons.find((item) => item.id === 'ch5-hybridization');
  assert.equal(lesson.worked_example.answer, hybridName({ regions: 4, lonePairs: 0 }));
  assert.equal(lesson.similar_problem.answer, hybridName({ regions: 2, lonePairs: 0 }));
  for (const [id, center] of Object.entries(HYBRID_CENTERS)) {
    const problem = byId(id);
    const expected = hybridName(center);
    assert.equal(problem.a, expected, id);
    assert.equal(problem.check.text, expected, id);
    assert.equal(grade(problem.a, problem.check).ok, true, id);
    assert.equal(grade(expected.replace('2', '²').replace('3', '³'), problem.check).ok, true, id);
  }
});

test('sigma and pi counts follow the bond orders', () => {
  const lesson = lessons.find((item) => item.id === 'ch5-sigma-pi');
  assert.equal(lesson.worked_example.answer, '1 sigma, 0 pi');
  assert.equal(lesson.similar_problem.answer, '1 sigma, 1 pi');
  for (const [id, orders] of Object.entries(BOND_ORDERS)) {
    const problem = byId(id);
    const { sigma, pi } = sigmaPi(orders);
    const expected = `${sigma} sigma, ${pi} pi`;
    assert.equal(problem.a, expected, id);
    assert.ok(problem.check.answers.includes(expected), id);
    assert.equal(grade(problem.a, problem.check).ok, true, id);
    assert.equal(grade(`${sigma} σ, ${pi} π`, problem.check).ok, true, id);
    assert.equal(grade(`${sigma} sigma and ${pi} pi`, problem.check).ok, false, id);
  }
});

test('bond orders and magnetism come from the MO electron fill', () => {
  const lesson = lessons.find((item) => item.id === 'ch5-molecular-orbitals');
  assert.equal(lesson.worked_example.answer, '1, diamagnetic');
  assert.equal(lesson.similar_problem.answer, '0.5, paramagnetic');
  for (const [id, result] of Object.entries(MO_SPECIES)) {
    const order = byId(`${id}-order`);
    const magnetism = byId(`${id}-mag`);
    assert.equal(order.check.kind, 'numeric', id);
    assert.equal(order.check.value, result.order, id);
    assert.equal(Number(order.a), result.order, id);
    assert.equal(grade(order.a, order.check).ok, true, id);
    assert.equal(magnetism.a, result.magnetism, id);
    assert.equal(grade(magnetism.a, magnetism.check).ok, true, id);
    assert.equal(grade(result.magnetism === 'paramagnetic' ? 'diamagnetic' : 'paramagnetic', magnetism.check).ok, false, id);
  }
  assert.equal(MO_SPECIES['ch5-mo-b2'].magnetism, 'paramagnetic');
  assert.equal(MO_SPECIES['ch5-mo-o2'].order, 2);
  assert.equal(MO_SPECIES['ch5-mo-he2'].order, 0);
});

test('no two problems in chapter 5 share an identical first hint', () => {
  const firstHints = [];
  for (const lesson of lessons) {
    const hintSets = new Set();
    for (const problem of lesson.problems) {
      const first = problem.hints?.[0];
      assert.equal(typeof first, 'string', problem.id);
      assert.ok(first.trim().length > 0, problem.id);
      firstHints.push(first);
      hintSets.add(JSON.stringify(problem.hints));
    }
    assert.equal(hintSets.size, lesson.problems.length, lesson.id);
  }
  assert.equal(new Set(firstHints).size, firstHints.length);
  for (const id of ['ch5-hyb-ch4', 'ch5-sig-ch4']) {
    assert.doesNotMatch(byId(id).hints[0], /double bond/i, id);
  }
});
