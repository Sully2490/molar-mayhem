import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { countSigFigs, grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

/**
 * Section numbers were checked against the OpenStax Chemistry: Atoms First 2e
 * chapter outline:
 * https://openstax.org/books/chemistry-atoms-first-2e/pages/5-introduction
 * 5.1 Valence Bond Theory (sigma and pi defined here)
 * 5.2 Hybrid Atomic Orbitals
 * 5.3 Multiple Bonds
 * 5.4 Molecular Orbital Theory (bond order and magnetism)
 * Lesson 5c is the molecular-orbital lesson, so it cites §5.4.
 */
const OUTLINE = [
  ['5a-hybridization.json', 'ch5-hybridization', 'OpenStax AF2e §5.2'],
  ['5b-sigma-pi.json', 'ch5-sigma-pi', 'OpenStax AF2e §5.1'],
  ['5c-molecular-orbitals.json', 'ch5-molecular-orbitals', 'OpenStax AF2e §5.4'],
  ['5d-multiple-bonds.json', 'ch5-multiple-bonds', 'OpenStax AF2e §5.3'],
];

const lessonDir = new URL('../content/ch05/', import.meta.url);
const files = readdirSync(lessonDir).filter((name) => name.endsWith('.json')).sort();
const lessons = files.map((name) => ({
  name,
  lesson: JSON.parse(readFileSync(new URL(name, lessonDir), 'utf8')),
}));

function byId(id) {
  for (const { lesson } of lessons) {
    const problem = lesson.problems.find((item) => item.id === id);
    if (problem) return problem;
  }
  return null;
}

const HYBRID_BY_GROUPS = { 2: 'sp', 3: 'sp2', 4: 'sp3', 5: 'sp3d', 6: 'sp3d2' };

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
  'ch5-hyb-becl2': { regions: 2, lonePairs: 0 },
  'ch5-hyb-so2': { regions: 2, lonePairs: 1 },
  'ch5-hyb-sf4': { regions: 4, lonePairs: 1 },
  'ch5-hyb-xef2': { regions: 2, lonePairs: 3 },
  'ch5-hyb-brf5': { regions: 5, lonePairs: 1 },
  'ch5-hyb-pcl3': { regions: 3, lonePairs: 1 },
  'ch5-hyb-bf4': { regions: 4, lonePairs: 0 },
  'ch5-hyb-co3': { regions: 3, lonePairs: 0 },
};

function hybridName(center) {
  return HYBRID_BY_GROUPS[center.regions + center.lonePairs];
}

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
    unpaired,
    bonding,
    antibonding,
  };
}

const MO_SPECIES = {
  'ch5-mo-h2': fillMo(H_1S, 2),
  'ch5-mo-h2plus': fillMo(H_1S, 1),
  'ch5-mo-he2': fillMo(H_1S, 4),
  'ch5-mo-he2plus': fillMo(H_1S, 3),
  'ch5-mo-li2': fillMo(EARLY_2P, 2),
  'ch5-mo-be2': fillMo(EARLY_2P, 4),
  'ch5-mo-b2': fillMo(EARLY_2P, 6),
  'ch5-mo-c2': fillMo(EARLY_2P, 8),
  'ch5-mo-n2': fillMo(EARLY_2P, 10),
  'ch5-mo-n2plus': fillMo(EARLY_2P, 9),
  'ch5-mo-o2': fillMo(LATE_2P, 12),
  'ch5-mo-o2plus': fillMo(LATE_2P, 11),
  'ch5-mo-o2minus': fillMo(LATE_2P, 13),
  'ch5-mo-o22minus': fillMo(LATE_2P, 14),
  'ch5-mo-f2': fillMo(LATE_2P, 14),
  'ch5-mo-ne2': fillMo(LATE_2P, 16),
};

const MULTIPLE_GROUPS = {
  'ch5-mb-so2': { regions: 2, lonePairs: 1 },
  'ch5-mb-benzene': { regions: 3, lonePairs: 0 },
  'ch5-mb-no3': { regions: 3, lonePairs: 0 },
  'ch5-mb-ketene-center': { regions: 2, lonePairs: 0 },
  'ch5-mb-ketene-end': { regions: 3, lonePairs: 0 },
  'ch5-mb-o3': { regions: 2, lonePairs: 1 },
  'ch5-mb-c2h4-sigma': { regions: 3, lonePairs: 0 },
  'ch5-mb-c2h2-sigma': { regions: 2, lonePairs: 0 },
};

test('chapter 5 cites the Atoms First 2e sections, including §5.4 for lesson 5c', () => {
  assert.deepEqual(files, OUTLINE.map(([name]) => name));
  assert.equal(lessons.length, 4);
  lessons.forEach(({ name, lesson }, index) => {
    const [, id, section] = OUTLINE[index];
    assert.equal(lesson.id, id, name);
    assert.equal(lesson.ch, 5, name);
    assert.equal(lesson.openstax_section, section, name);
    assert.deepEqual(lesson.sources, [section], name);
    assert.deepEqual(validateLesson(lesson), [], name);
    assert.ok(lesson.problems.length >= 10, name);
    assert.ok(lesson.steps.length >= 3, name);
    assert.ok(lesson.similar_problem.hint.length > 0, name);
    const marker = section.replace('OpenStax AF2e ', '');
    const cited = JSON.stringify(lesson).match(/§\d+\.\d+/g) ?? [];
    assert.ok(cited.length > 0, name);
    for (const cite of cited) assert.equal(cite, marker, `${name} cites ${cite}`);
  });
  const molecular = lessons.find((item) => item.name === '5c-molecular-orbitals.json').lesson;
  assert.equal(molecular.openstax_section, 'OpenStax AF2e §5.4');
  assert.equal(JSON.stringify(molecular).includes('§5.3'), false);
});

test('hybridization follows the electron-group count', () => {
  const lesson = lessons.find((item) => item.lesson.id === 'ch5-hybridization').lesson;
  assert.equal(lesson.worked_example.answer, hybridName({ regions: 4, lonePairs: 0 }));
  assert.equal(lesson.similar_problem.answer, hybridName({ regions: 2, lonePairs: 0 }));
  for (const [id, center] of Object.entries(HYBRID_CENTERS)) {
    const problem = byId(id);
    const expected = hybridName(center);
    assert.equal(problem.a, expected, id);
    assert.equal(problem.check.text, expected, id);
    assert.equal(grade(problem.a, problem.check).ok, true, id);
    const pretty = expected.replace('2', '²').replace('3', '³');
    assert.equal(grade(pretty, problem.check).ok, true, id);
    assert.equal(grade(expected === 'sp' ? 'sp3' : 'sp', problem.check).ok, false, id);
  }
  assert.equal(byId('ch5-hyb-xef4').a, 'sp3d2');
  assert.equal(byId('ch5-hyb-sf4').a, 'sp3d');
});

test('sigma and pi counts follow the bond orders', () => {
  const lesson = lessons.find((item) => item.lesson.id === 'ch5-sigma-pi').lesson;
  assert.equal(lesson.worked_example.answer, '1 sigma, 0 pi');
  assert.equal(lesson.similar_problem.answer, '1 sigma, 1 pi');
  assert.equal(lesson.openstax_section, 'OpenStax AF2e §5.1');
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
  assert.equal(byId('ch5-vb-h2-type').a, 'sigma');
  assert.equal(byId('ch5-vb-side-p').a, 'pi');
  assert.equal(byId('ch5-vb-cl2').a, 'sigma');
  assert.equal(byId('ch5-vb-hf').a, '2p');
  assert.equal(byId('ch5-vb-hcl').a, '3p');
  assert.equal(grade('yes', byId('ch5-vb-node').check).ok, true);
  assert.equal(grade('pi', byId('ch5-vb-first').check).ok, false);
});

test('bond orders and magnetism come from the MO electron fill', () => {
  const lesson = lessons.find((item) => item.lesson.id === 'ch5-molecular-orbitals').lesson;
  assert.equal(lesson.worked_example.answer, '2.000, paramagnetic');
  assert.equal(lesson.similar_problem.answer, '3.000, diamagnetic');
  for (const [id, result] of Object.entries(MO_SPECIES)) {
    const order = byId(`${id}-order`);
    const magnetism = byId(`${id}-mag`);
    assert.equal(magnetism.a, result.magnetism, id);
    assert.equal(grade(magnetism.a, magnetism.check).ok, true, id);
    assert.equal(grade(result.magnetism === 'paramagnetic' ? 'diamagnetic' : 'paramagnetic', magnetism.check).ok, false, id);
    if (result.order === 0) {
      assert.equal(order.check.kind, 'exact', id);
      assert.equal(order.a, '0', id);
      assert.equal(grade('0', order.check).ok, true, id);
      assert.equal(grade('1', order.check).ok, false, id);
    } else {
      assert.equal(order.check.kind, 'numeric', id);
      assert.equal(order.check.value, result.order, id);
      assert.equal(order.check.sigFigs, 4, id);
      assert.equal(order.check.tolerance, 0.5, id);
      assert.equal(order.check.unit, null, id);
      assert.equal(order.a, result.order.toPrecision(4), id);
      assert.equal(countSigFigs(order.a), 4, id);
      assert.deepEqual(grade(order.a, order.check), { ok: true }, id);
      const outside = result.order * 1.01;
      assert.equal(grade(String(outside), order.check).ok, false, id);
    }
  }
  assert.equal(MO_SPECIES['ch5-mo-b2'].magnetism, 'paramagnetic');
  assert.equal(MO_SPECIES['ch5-mo-b2'].unpaired, 2);
  assert.equal(MO_SPECIES['ch5-mo-o2'].order, 2);
  assert.equal(MO_SPECIES['ch5-mo-o2'].unpaired, 2);
  assert.equal(MO_SPECIES['ch5-mo-he2'].order, 0);
  assert.equal(MO_SPECIES['ch5-mo-n2'].order, 3);
  assert.equal(byId('ch5-mo-o2-unpaired').a, '2');
  assert.equal(byId('ch5-mo-b2-unpaired').a, '2');
  assert.equal(byId('ch5-mo-n2-unpaired').a, '0');
  assert.equal(byId('ch5-mo-mixing-b2').a, 'sigma 2p');
  assert.equal(byId('ch5-mo-mixing-o2').a, 'sigma 2p');
});

test('multiple-bond hybrids, pi orbitals, and rotation match the group count', () => {
  const lesson = lessons.find((item) => item.lesson.id === 'ch5-multiple-bonds').lesson;
  assert.equal(lesson.openstax_section, 'OpenStax AF2e §5.3');
  assert.equal(lesson.worked_example.answer, 'unhybridized p');
  assert.equal(lesson.similar_problem.answer, '2');
  for (const [id, center] of Object.entries(MULTIPLE_GROUPS)) {
    const problem = byId(id);
    assert.equal(problem.a, hybridName(center), id);
    assert.equal(grade(problem.a, problem.check).ok, true, id);
  }
  assert.equal(byId('ch5-mb-c2h4-pi').a, 'unhybridized p');
  assert.equal(grade('2p', byId('ch5-mb-c2h4-pi').check).ok, true);
  assert.equal(byId('ch5-mb-c2h2-pcount').a, '2');
  assert.equal(byId('ch5-mb-co2-p').a, '2');
  assert.equal(byId('ch5-mb-c2h4-rotate').a, 'no');
  assert.equal(byId('ch5-mb-c2h6-rotate').a, 'yes');
  assert.equal(byId('ch5-mb-carbonate').a, 'no');
  assert.equal(grade('yes', byId('ch5-mb-c2h4-rotate').check).ok, false);
});

test('numeric keys use 4 sig figs with about 0.5% tolerance', () => {
  const numeric = [];
  for (const { lesson } of lessons) {
    for (const problem of lesson.problems) {
      if (problem.check.kind !== 'numeric') continue;
      numeric.push(problem);
      assert.equal(problem.check.sigFigs, 4, problem.id);
      assert.equal(problem.check.tolerance, 0.5, problem.id);
      assert.equal(problem.check.unit, null, problem.id);
      assert.equal(countSigFigs(problem.a), 4, problem.id);
      assert.equal(Number(problem.a), problem.check.value, problem.id);
      assert.deepEqual(grade(problem.a, problem.check), { ok: true }, problem.id);
      const sloppy = String(problem.check.value);
      if (countSigFigs(sloppy) !== 4) {
        const hinted = grade(sloppy, problem.check);
        assert.equal(hinted.ok, true, problem.id);
        assert.equal(typeof hinted.hint, 'string', problem.id);
      }
    }
  }
  assert.ok(numeric.length >= 10);
});

test('no two problems in chapter 5 share an identical first hint', () => {
  const firstHints = [];
  const everyHint = new Map();
  for (const { lesson } of lessons) {
    for (const problem of lesson.problems) {
      const first = problem.hints?.[0];
      assert.equal(typeof first, 'string', problem.id);
      assert.ok(first.trim().length > 0, problem.id);
      firstHints.push(first);
      for (const hint of problem.hints) {
        assert.equal(everyHint.has(hint), false, `${problem.id} reuses a hint from ${everyHint.get(hint)}`);
        everyHint.set(hint, problem.id);
      }
    }
  }
  assert.equal(new Set(firstHints).size, firstHints.length);
  for (const id of ['ch5-hyb-ch4', 'ch5-sig-ch4']) {
    assert.doesNotMatch(byId(id).hints[0], /double bond/i, id);
  }
});

test('every chapter 5 key grades and a wrong answer fails', () => {
  for (const { lesson } of lessons) {
    for (const problem of lesson.problems) {
      const result = grade(problem.a, problem.check);
      assert.equal(result.ok, true, problem.id);
      assert.equal(result.hint, undefined, problem.id);
      const wrong = problem.check.kind === 'numeric' ? '9' : 'not-the-answer';
      assert.equal(grade(wrong, problem.check).ok, false, problem.id);
    }
  }
});
