import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countSigFigs, grade, parseAnswer } from '../js/grade.js';
import { generateProblem } from '../js/generate.js';
import { LESSON_FIELDS, validateLesson } from '../js/schema.js';

const numeric = {
  kind: 'numeric',
  value: 1.5,
  tolerance: 0.005,
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
  assert.equal(grade('1.5 g', numeric).reason, 'sigFigs');
  assert.equal(grade('2.00 g', numeric).reason, 'tolerance');
  assert.equal(grade('1.50 kg', numeric).reason, 'unit');
  assert.equal(grade('1.50', numeric).reason, 'unit');
  assert.equal(grade('about one gram', numeric).reason, 'format');
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
  assert.equal(generated.hints[0].includes('grams'), true);
  assert.equal(grade('20 g/mol', { ...generated.check, unit: 'g/mol', sigFigs: undefined }).ok, true);
});
