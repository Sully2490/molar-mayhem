import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canonicalUnit,
  consumesAttempt,
  correctLine,
  countSigFigs,
  examCredit,
  firstSentence,
  grade,
  parseAnswer,
  SIGFIG_HINT,
} from '../js/grade.js';
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

test('unit aliases match names, cubic centimeters, and compound units', () => {
  const density = { kind: 'numeric', value: 7.958, unit: 'g/mL' };
  assert.equal(grade('7.958 g/ml', density).ok, true);
  assert.equal(grade('7.958 g/cm3', density).ok, true);
  assert.equal(grade('7.958 g/cm³', density).ok, true);
  assert.equal(grade('7.958 g/cm^3', density).ok, true);
  assert.equal(grade('7.958 kg/mL', density).reason, 'unit');
  const volume = { kind: 'numeric', value: 1250, unit: 'mL' };
  assert.equal(grade('1250 ml', volume).ok, true);
  assert.equal(grade('1250 milliliters', volume).ok, true);
  assert.equal(grade('1250 cm3', volume).ok, true);
  const molar = { kind: 'numeric', value: 0.5, unit: 'M' };
  assert.equal(grade('0.5 mol/L', molar).ok, true);
  assert.equal(grade('0.5 mol/l', molar).ok, true);
  assert.equal(grade('0.5 m', molar).reason, 'unit');
  assert.equal(canonicalUnit('kJ/mol'), 'kJ/mol');
  assert.equal(canonicalUnit('kj/mol'), 'kJ/mol');
  assert.equal(canonicalUnit('KJ/MOL'), 'kJ/mol');
  assert.equal(canonicalUnit('M'), 'M');
  assert.equal(canonicalUnit('m'), 'm');
  assert.equal(canonicalUnit('J/g°C'), 'J/g·°C');
  assert.equal(canonicalUnit('j/g°c'), canonicalUnit('J/g°C'));
  assert.equal(canonicalUnit('J/(g·°C)'), canonicalUnit('J/g°C'));
  assert.equal(canonicalUnit('J/°C'), canonicalUnit('j/c'));
  assert.equal(canonicalUnit('kJ/°C'), canonicalUnit('kj/°c'));
  assert.equal(canonicalUnit('kJ/g'), canonicalUnit('KJ/G'));
  assert.equal(canonicalUnit('g/mol'), canonicalUnit('G/MOL'));
  assert.equal(canonicalUnit('g/L'), canonicalUnit('g/l'));
  assert.equal(canonicalUnit('m/s'), canonicalUnit('M/S'));
  const heat = { kind: 'numeric', value: 418, unit: 'J/g°C' };
  assert.equal(grade('418 j/g°c', heat).ok, true);
  assert.equal(grade('418 J/(g·°C)', heat).ok, true);
  const speed = { kind: 'numeric', value: 340, unit: 'm/s' };
  assert.equal(grade('340 M/S', speed).ok, true);
  const length = { kind: 'numeric', value: 2, unit: 'cm' };
  assert.equal(grade('2 cm', length).ok, true);
  assert.equal(grade('2 C', length).reason, 'unit');
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

test('a right value with the wrong sig figs is not correct', () => {
  const titration = { kind: 'numeric', value: 0.12, sigFigs: 4, unit: 'M' };
  const result = grade('0.12 M', titration);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'sigfigs');
  assert.equal(result.hint, SIGFIG_HINT);
  assert.match(result.hint, /check sig figs/i);
  assert.equal(result.credit, 0.5);
  assert.equal(result.flag, 'sigfigs');
  assert.equal(consumesAttempt(result), false);
  assert.deepEqual(grade('0.1200 M', titration), { ok: true });
  assert.equal(consumesAttempt(grade('0.1200 M', titration)), false);
  assert.equal(consumesAttempt(grade('1.5 g', numeric)), false);
  assert.equal(consumesAttempt(grade('9 M', titration)), true);

  const loose = grade('1.5 g', numeric);
  assert.equal(loose.ok, false);
  assert.equal(loose.reason, 'sigfigs');
  assert.equal(loose.hint, 'Check sig figs.');
});

test('exam credit gives half for a sig-fig miss and never zero', () => {
  const titration = { kind: 'numeric', value: 0.12, sigFigs: 4, unit: 'M' };
  const half = examCredit(grade('0.12 M', titration), 1);
  assert.deepEqual(half, { points: 0.5, fraction: 0.5, flag: 'sigfigs' });
  assert.notEqual(half.points, 0);
  assert.deepEqual(examCredit(grade('0.12 M', titration), 2), { points: 1, fraction: 0.5, flag: 'sigfigs' });
  assert.deepEqual(examCredit(grade('0.1200 M', titration), 2), { points: 2, fraction: 1, flag: null });
  assert.deepEqual(examCredit(grade('4 M', titration), 2), { points: 0, fraction: 0, flag: null });
});

test('correct feedback uses the first sentence of the reason', () => {
  assert.equal(firstSentence('Divide moles by liters. The quotient uses four figures.'), 'Divide moles by liters.');
  assert.equal(firstSentence('Mass = 19.3 g/cm³ × 2.50 cm³ = 48.3 g.'), 'Mass = 19.3 g/cm³ × 2.50 cm³ = 48.3 g.');
  assert.equal(firstSentence(''), '');
  assert.equal(correctLine('Divide moles by liters. Then stop.'), 'Correct. Divide moles by liters.');
  assert.equal(correctLine(''), 'Correct.');
});

test('scientific notation accepts a times sign and a superscript exponent', () => {
  const energy = { kind: 'numeric', value: 4.307e-19, sigFigs: 4, unit: 'J' };
  for (const input of ['4.307×10⁻¹⁹ J', '4.307 x 10^-19 J']) {
    const parsed = parseAnswer(input);
    assert.equal(parsed.unit, 'J');
    assert.equal(parsed.sigFigs, 4);
    assert.equal(parsed.coefficient, '4.307');
    assert.ok(Math.abs(parsed.value - 4.307e-19) / 4.307e-19 < 1e-9, input);
    assert.deepEqual(grade(input, energy), { ok: true });
  }
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

test('exact answers are case-sensitive for symbols and ignore case only for words', () => {
  const symbol = { kind: 'exact', text: 'sp3' };
  assert.equal(grade('sp3', symbol).ok, true);
  assert.equal(grade('SP3', symbol).reason, 'exact');
  assert.equal(grade('sp2', symbol).reason, 'exact');
  assert.equal(grade('   ', symbol).reason, 'format');

  const name = { kind: 'exact', text: 'sodium', case: 'insensitive' };
  assert.equal(grade('Sodium', name).ok, true);
  assert.equal(grade('SODIUM', name).ok, true);
  assert.equal(grade('  sodium ', name).ok, true);
});

test('default exact checks tell Co, CO, and NaCl apart', () => {
  const cobalt = { kind: 'exact', text: 'Co' };
  assert.equal(grade('Co', cobalt).ok, true);
  assert.equal(grade('CO', cobalt).reason, 'exact');
  assert.equal(grade('co', cobalt).reason, 'exact');

  const salt = { kind: 'exact', text: 'NaCl' };
  assert.equal(grade('NaCl', salt).ok, true);
  assert.equal(grade('nacl', salt).reason, 'exact');
  assert.equal(grade('Nacl', salt).reason, 'exact');
});

test('superscript charges match plain ion formulas', () => {
  assert.equal(grade('Fe³⁺', { kind: 'exact', text: 'Fe3+' }).ok, true);
  assert.equal(grade('Fe3+', { kind: 'exact', text: 'Fe3+' }).ok, true);
  assert.equal(grade('SO4 2-', { kind: 'exact', text: 'SO42-' }).ok, true);
  assert.equal(grade('SO₄²⁻', { kind: 'exact', text: 'SO4 2-' }).ok, true);
  assert.equal(grade('O²⁻', { kind: 'exact', text: 'O2-' }).ok, true);
  assert.equal(grade('O2-', { kind: 'exact', text: 'O2-' }).ok, true);
  assert.equal(grade('o2-', { kind: 'exact', text: 'O2-' }).reason, 'exact');
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

test('formula answers keep element-symbol case and fold superscript charges', () => {
  const cobalt = { kind: 'exact', text: 'Co', case: 'formula' };
  assert.equal(grade('Co', cobalt).ok, true);
  assert.equal(grade('CO', cobalt).reason, 'exact');
  assert.equal(grade('co', cobalt).reason, 'exact');

  const iron = { kind: 'exact', text: 'Fe3+', case: 'formula' };
  assert.equal(grade('Fe³⁺', iron).ok, true);
  assert.equal(grade('Fe^3+', iron).ok, true);
  assert.equal(grade('Fe{3+}', iron).ok, true);
  assert.equal(grade('Fe+3', iron).ok, true);
  assert.equal(grade('fe3+', iron).reason, 'exact');

  const oxide = { kind: 'exact', text: 'SO42-', case: 'formula' };
  assert.equal(grade('SO₄²⁻', oxide).ok, true);
  assert.equal(grade('SO4^2-', oxide).ok, true);
  assert.equal(grade('SO4 2-', oxide).ok, true);
  assert.equal(grade('SO4-2', oxide).ok, true);
  assert.equal(grade('Fe³⁺, SO₄²⁻', { kind: 'set', answers: ['SO42-', 'Fe3+'] }).ok, true);

  const molar = { kind: 'numeric', value: 1.5, sigFigs: 2, unit: 'M' };
  assert.equal(grade('1.5 M', molar).ok, true);
  assert.equal(grade('1.5 mol/L', molar).ok, true);
  assert.equal(grade('1.5 m', molar).reason, 'unit');
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
