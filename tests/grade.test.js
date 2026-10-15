import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countSigFigs, grade, parseAnswer } from '../js/grade.js';
import { generateProblem } from '../js/generate.js';
import { LESSON_FIELDS, validateLesson, validateProblem } from '../js/schema.js';

const numeric = {
  kind: 'numeric',
  value: 1.5,
  tolerance: 0.5,
  sigFigs: 3,
  unit: 'g',
};

test('schema lists the lesson fields', () => {
  assert.deepEqual(LESSON_FIELDS, [
    'id',
    'ch',
    'openstax_section',
    'guide_line',
    'steps',
    'worked_example',
    'similar_problem',
    'sources',
  ]);
});

test('validateLesson accepts a complete lesson and rejects a partial one', () => {
  const lesson = {
    id: 'demo',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.2',
    guide_line: 'Name the hybrid orbitals from the electron-region count.',
    steps: ['Count electron regions around the central atom.'],
    worked_example: { q: 'What hybrid orbitals does carbon use in CH4?', answer: 'sp3' },
    similar_problem: { q: 'What hybrid orbitals does carbon use in CO2?', hint: 'Count regions, not atoms.', answer: 'sp' },
    sources: ['OpenStax AF2e §5.2'],
  };
  assert.deepEqual(validateLesson(lesson), []);
  assert.ok(validateLesson({ id: 'demo' }).length > 0);
});

test('grade accepts tolerance, scientific notation, sig figs, and units', () => {
  assert.deepEqual(grade('1.50 g', numeric), { ok: true });
  assert.deepEqual(grade('1.50e0 g', numeric), { ok: true });
  assert.deepEqual(grade('1.50 × 10^0 grams', numeric), { ok: true });
  assert.equal(grade('2.00 g', numeric).reason, 'tolerance');
  assert.equal(grade('1.50 kg', numeric).reason, 'unit');
  assert.equal(grade('1.50', numeric).reason, 'unit');
  assert.equal(grade('about one gram', numeric).reason, 'format');
});

test('numeric tolerance is a relative percent and defaults to about 0.5%', () => {
  const check = { kind: 'numeric', value: 100, unit: null };
  assert.equal(grade('100.4', check).ok, true);
  assert.equal(grade('100.5', check).ok, true);
  assert.equal(grade('99.5', check).ok, true);
  assert.equal(grade('101', check).reason, 'tolerance');
  assert.equal(grade('99', check).reason, 'tolerance');
  const tight = { kind: 'numeric', value: 100, tolerance: 0.1, unit: null };
  assert.equal(grade('100.05', tight).ok, true);
  assert.equal(grade('100.2', tight).reason, 'tolerance');
});

test('a sig fig mismatch returns a hint and still counts', () => {
  const result = grade('1.5 g', numeric);
  assert.equal(result.ok, true);
  assert.equal(result.reason, undefined);
  assert.match(result.hint, /significant figures/i);
  assert.match(result.hint, /3/);
});

test('sig fig counts follow the written coefficient', () => {
  assert.equal(countSigFigs('0.00450'), 3);
  assert.equal(countSigFigs('100'), 1);
  assert.equal(countSigFigs('100.'), 3);
  assert.equal(countSigFigs('1.20'), 3);
  const parsed = parseAnswer('6.02 x 10^23 mol');
  assert.equal(parsed.sigFigs, 3);
  assert.ok(Math.abs(parsed.value - 6.02e23) / 6.02e23 < 1e-9);
});

test('exact answers ignore case and extra spaces', () => {
  const check = { kind: 'exact', text: 'sp3' };
  assert.deepEqual(grade('  SP3 ', check), { ok: true });
  assert.equal(grade('sp2', check).reason, 'exact');
  assert.equal(grade('   ', check).reason, 'format');
});

test('exact answers fold Unicode digits, follow case rules, and accept any listed answer', () => {
  const formula = { kind: 'exact', text: 'HNO3', case: 'formula' };
  assert.equal(grade('HNO₃', formula).ok, true);
  assert.equal(grade('HNO 3', formula).ok, true);
  assert.equal(grade('hno3', formula).reason, 'exact');

  const config = { kind: 'exact', text: '1s2', case: 'sensitive' };
  assert.equal(grade('1s²', config).ok, true);
  assert.equal(grade('1S2', config).reason, 'exact');
  assert.equal(grade('1s   2', { kind: 'exact', text: '1s 2', case: 'sensitive' }).ok, true);
  assert.equal(grade('1s²', { kind: 'exact', text: '1s2', case: 'formula' }).ok, true);
  assert.equal(grade('1s  2', { kind: 'exact', text: '1s2', case: 'formula' }).ok, true);

  const hybrids = { kind: 'exact', answers: ['sp3', 'sp^3'], case: 'insensitive' };
  assert.equal(grade('SP3', hybrids).ok, true);
  assert.equal(grade('sp^3', hybrids).ok, true);
  assert.equal(grade('sp2', hybrids).reason, 'exact');
  assert.throws(() => grade('sp3', { kind: 'exact', text: 'sp3', case: 'title' }), /Unknown case rule: title/);
});

test('unordered sets ignore order and flag near-miss items', () => {
  const strongAcids = {
    kind: 'set',
    answers: ['HCl', 'HBr', 'HI', 'HNO3', 'H2SO4', 'HClO4'],
    nearMiss: [{ text: 'HClO3', hint: 'HClO3 is close. The chlorine oxyacid on this list is HClO4.' }],
  };
  assert.equal(grade('HClO4, H2SO4, HNO₃, HI, HBr, and HCl', strongAcids).ok, true);
  assert.equal(grade('HCl, HCl, HBr, HI, HNO3, H2SO4, HClO4', strongAcids).ok, true);
  const missed = grade('HCl, HBr', strongAcids);
  assert.equal(missed.ok, false);
  assert.equal(missed.reason, 'partial');
  assert.match(missed.hint, /Some of those belong/);
  assert.doesNotMatch(missed.hint, /HClO4/);
  const near = grade('HCl, HBr, HI, HNO3, H2SO4, HClO3', strongAcids);
  assert.equal(near.ok, false);
  assert.equal(near.reason, 'nearMiss');
  assert.match(near.hint, /HClO3/);
  assert.match(near.hint, /HClO4/);
  const wrong = grade('NaCl, H2O', strongAcids);
  assert.equal(wrong.reason, 'set');
  assert.equal(grade('', strongAcids).reason, 'format');
  const plain = grade('HClO₃', { kind: 'set', answers: ['HCl'], nearMiss: ['HClO3'] });
  assert.equal(plain.reason, 'nearMiss');
  assert.match(plain.hint, /HClO3/);
});

test('electron configurations expand noble-gas cores and ignore orbital order', () => {
  const sodium = { kind: 'config', text: '[Ne] 3s1' };
  assert.equal(grade('[Ne] 3s1', sodium).ok, true);
  assert.equal(grade('1s2 2s2 2p6 3s1', sodium).ok, true);
  assert.equal(grade('1s² 2s² 2p⁶ 3s¹', sodium).ok, true);
  assert.equal(grade('[Ne]3s1', sodium).ok, true);
  const sodiumWrong = grade('[Ne] 3s2', sodium);
  assert.equal(sodiumWrong.ok, false);
  assert.equal(sodiumWrong.reason, 'config');

  const iron = { kind: 'config', text: '[Ar] 4s2 3d6' };
  assert.equal(grade('[Ar] 3d6 4s2', iron).ok, true);
  assert.equal(grade('1s2 2s2 2p6 3s2 3p6 4s2 3d6', iron).ok, true);
  assert.equal(grade('[Ar] 4s² 3d⁶', iron).ok, true);
  assert.equal(grade('[Ar] 4s2 3d5', iron).ok, false);

  const zinc = { kind: 'config', text: '[Ar] 4s2 3d10' };
  assert.equal(grade('[Ar] 3d10 4s2', zinc).ok, true);
  assert.equal(grade('[Ar] 4s2 3d10', zinc).ok, true);
  assert.equal(grade('1s2 2s2 2p6 3s2 3p6 3d10 4s2', zinc).ok, true);
  assert.equal(grade('[Ar] 4s1 3d10', zinc).reason, 'config');
  assert.equal(grade('', zinc).reason, 'format');
  assert.equal(grade('not a configuration', zinc).reason, 'format');
  assert.deepEqual(validateProblem({
    id: 'na',
    q: 'Write the configuration of Na.',
    a: '[Ne] 3s1',
    why: 'Sodium has one 3s electron past neon.',
    hints: ['The neon core is 1s2 2s2 2p6.'],
    check: { kind: 'config', text: '[Ne] 3s1' },
  }), []);
});

test('schema accepts a set check', () => {
  const problem = {
    id: 'acids',
    q: 'Name the strong acids in this set.',
    a: 'HCl, HBr, HI, HNO3, H2SO4, HClO4',
    why: 'These six fully ionize in water.',
    hints: ['Chloric acid is not the one on the strong list.'],
    check: {
      kind: 'set',
      answers: ['HCl', 'HBr', 'HI', 'HNO3', 'H2SO4', 'HClO4'],
      nearMiss: [{ text: 'HClO3', hint: 'HClO3 is close. The chlorine oxyacid on this list is HClO4.' }],
    },
  };
  assert.deepEqual(validateProblem(problem), []);
  assert.ok(validateProblem({ ...problem, check: { kind: 'sketch' } }).some((error) => /set/.test(error)));
});

test('unknown check kinds throw', () => {
  assert.throws(() => grade('1', { kind: 'graph' }), /Unknown check kind: graph/);
});

test('generateProblem returns q, a, why, hints, and check', () => {
  const staticProblem = generateProblem({
    q: 'How many sigma bonds are in HCN?',
    a: '2',
    why: 'H–C and C–N are the two end-to-end overlaps. The other two C–N overlaps are pi bonds.',
    hints: ['A single bond is one sigma bond. A triple bond is one sigma and two pi.'],
    check: { kind: 'numeric', value: 2, tolerance: 0, sigFigs: 1, unit: null },
  });
  assert.deepEqual(Object.keys(staticProblem).sort(), ['a', 'check', 'hints', 'q', 'why']);
  assert.equal(staticProblem.hints.length, 1);

  const generated = generateProblem({
    template: 'A sample is {mass} g and {moles} mol. What is the molar mass?',
    vars: {
      mass: { min: 10, max: 10, step: 1 },
      moles: { min: 0.5, max: 0.5, step: 0.1 },
    },
    solve: (vars) => vars.mass / vars.moles,
    why: (vars, value) => `${vars.mass} g / ${vars.moles} mol = ${value} g/mol.`,
    hints: () => ['Molar mass is grams divided by moles.'],
    sigFigs: 2,
    unit: 'g/mol',
    tolerance: 0.05,
  }, () => 0);
  assert.match(generated.q, /10 g/);
  assert.equal(generated.check.value, 20);
  assert.equal(generated.check.kind, 'numeric');
  assert.equal(generated.check.tolerance, 0.05);
  const defaulted = generateProblem({
    template: 'Mass is {mass} g.',
    vars: { mass: { min: 2, max: 2, step: 1 } },
    solve: (vars) => vars.mass,
    why: () => 'The mass is given.',
    hints: () => ['Read the mass.'],
    unit: 'g',
  }, () => 0);
  assert.equal(defaulted.check.tolerance, 0.5);
  assert.equal(generated.hints[0].includes('grams'), true);
  assert.equal(grade('20 g/mol', { ...generated.check, unit: 'g/mol', sigFigs: undefined }).ok, true);
});
