import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { countSigFigs, grade, parseAnswer } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

// OpenStax Chemistry: Atoms First 2e, Chapter 6 outline (not Chemistry 2e 3.1–3.4):
// 6.1 Formula Mass
// 6.2 Determining Empirical and Molecular Formulas
// 6.3 Molarity
// 6.4 Other Units for Solution Concentrations
const OUTLINE = [
  ['ch06-formula-mass', 'OpenStax AF2e §6.1', '6.1 Formula Mass'],
  ['ch06-empirical', 'OpenStax AF2e §6.2', '6.2 Determining Empirical and Molecular Formulas'],
  ['ch06-molarity', 'OpenStax AF2e §6.3', '6.3 Molarity'],
  ['ch06-concentration', 'OpenStax AF2e §6.4', '6.4 Other Units for Solution Concentrations'],
];

const m = {
  H: 1.00794,
  C: 12.011,
  N: 14.0067,
  O: 15.9994,
  Na: 22.989769,
  Mg: 24.305,
  Al: 26.981539,
  P: 30.973762,
  S: 32.066,
  Cl: 35.453,
  K: 39.0983,
  Ca: 40.078,
  Fe: 55.845,
  Cu: 63.546,
  Zn: 65.38,
};
const NA = 6.022e23;

const mm = (pairs) => pairs.reduce((sum, [el, count]) => sum + count * m[el], 0);
const H2O = mm([['H', 2], ['O', 1]]);
const CO2 = mm([['C', 1], ['O', 2]]);
const NaCl = mm([['Na', 1], ['Cl', 1]]);
const CaCl2 = mm([['Ca', 1], ['Cl', 2]]);
const H2SO4 = mm([['H', 2], ['S', 1], ['O', 4]]);
const glucose = mm([['C', 6], ['H', 12], ['O', 6]]);
const Fe2O3 = mm([['Fe', 2], ['O', 3]]);
const amm = mm([['N', 2], ['H', 8], ['S', 1], ['O', 4]]);
const NaHCO3 = mm([['Na', 1], ['H', 1], ['C', 1], ['O', 3]]);
const MgNO3 = mm([['Mg', 1], ['N', 2], ['O', 6]]);
const NH4NO3 = mm([['N', 2], ['H', 4], ['O', 3]]);
const soda = mm([['Na', 2], ['C', 1], ['O', 3]]) + 10 * H2O;
const K2SO4 = mm([['K', 2], ['S', 1], ['O', 4]]);
const CaCO3 = mm([['Ca', 1], ['C', 1], ['O', 3]]);
const CH2 = mm([['C', 1], ['H', 2]]);
const CH2O = mm([['C', 1], ['H', 2], ['O', 1]]);
const zincHydrate = mm([['Zn', 1], ['S', 1], ['O', 4]]) + 7 * H2O;
const KOH = mm([['K', 1], ['O', 1], ['H', 1]]);
const KNO3 = mm([['K', 1], ['N', 1], ['O', 3]]);
const NaOH = mm([['Na', 1], ['O', 1], ['H', 1]]);

function roundSig(n, digits = 4) {
  const exp = Math.floor(Math.log10(Math.abs(n)) + 1e-12);
  const scale = 10 ** (digits - 1 - exp);
  return Math.round(n * scale) / scale;
}

function formatSig(n, digits = 4) {
  const rounded = roundSig(n, digits);
  const exp = Math.floor(Math.log10(Math.abs(rounded)) + 1e-12);
  if (exp >= -3 && exp <= 4) {
    const text = rounded.toFixed(digits - 1 - exp);
    if (countSigFigs(text) === digits) return text;
  }
  const man = rounded / 10 ** exp;
  return `${roundSig(man, digits).toFixed(digits - 1)}e${exp}`;
}

function numeric(full, unit) {
  return { kind: 'numeric', full, unit };
}

function exact(text) {
  return { kind: 'exact', text };
}

const SPECS = {
  'ch06-mm-nahco3': numeric(NaHCO3, 'g/mol'),
  'ch06-mm-nitrate': numeric(MgNO3, 'g/mol'),
  'ch06-mol-co2': numeric(8.5 / CO2, 'mol'),
  'ch06-g-cacl2': numeric(0.25 * CaCl2, 'g'),
  'ch06-n-molecules': numeric(0.18 * NA, 'molecules'),
  'ch06-g-water-count': numeric((2.5e22 / NA) * H2O, 'g'),
  'ch06-o-atoms': numeric((4.2 / H2SO4) * 4 * NA, 'atoms'),
  'ch06-mol-cl': numeric((5 / CaCl2) * 2, 'mol'),
  'ch06-g-carbon': numeric(10 * (6 * m.C) / glucose, 'g'),
  'ch06-al-atoms': numeric((3.4 / m.Al) * NA, 'atoms'),
  'ch06-g-rust': numeric(1.25 * Fe2O3, 'g'),
  'ch06-mol-n-salt': numeric((6.8 / amm) * 2, 'mol'),
  'ch06-pct-o-co2': numeric((2 * m.O / CO2) * 100, '%'),
  'ch06-pct-n-nitrate': numeric((2 * m.N / NH4NO3) * 100, '%'),
  'ch06-pct-water-soda': numeric((10 * H2O / soda) * 100, '%'),
  'ch06-emp-fe2o3': exact('Fe2O3'),
  'ch06-emp-ch2': exact('CH2'),
  'ch06-mf-c2h4o2': exact('C2H4O2'),
  'ch06-emp-combust': exact('CH3'),
  'ch06-pct-s-k2so4': numeric((m.S / K2SO4) * 100, '%'),
  'ch06-pct-ca-caco3': numeric((m.Ca / CaCO3) * 100, '%'),
  'ch06-mf-c2h4': exact('C2H4'),
  'ch06-emp-no2': exact('NO2'),
  'ch06-pct-water-zinc': numeric((7 * H2O / zincHydrate) * 100, '%'),
  'ch06-symbol-zn': exact('Zn'),
  'ch06-m-from-mol': numeric(0.355 / 0.5, 'M'),
  'ch06-g-koh': numeric(0.5 * 0.2 * KOH, 'g'),
  'ch06-mol-acid': numeric(0.18 * 0.075, 'mol'),
  'ch06-ml-nacl': numeric((3 / NaCl) / 0.25 * 1000, 'mL'),
  'ch06-dilute-v1': numeric((0.25 * 500) / 12, 'mL'),
  'ch06-dilute-m2': numeric((1.8 * 25) / 100, 'M'),
  'ch06-g-glucose': numeric(0.25 * 0.15 * glucose, 'g'),
  'ch06-m-kno3': numeric((2.45 / KNO3) / 0.1, 'M'),
  'ch06-l-cacl2': numeric(0.08 / 0.4, 'L'),
  'ch06-dilute-acid': numeric((6 * 15) / 250, 'M'),
  'ch06-g-naoh': numeric(2 * 0.125 * NaOH, 'g'),
  'ch06-dilute-ml-to-l': numeric((2.5 * 0.04) / 0.5, 'M'),
  'ch06-mass-pct': numeric((25 / 150) * 100, '%'),
  'ch06-g-from-pct': numeric(400 * 0.085, 'g'),
  'ch06-mass-dilute': numeric((10 * 250) / 68, 'g'),
  'ch06-vol-pct': numeric((30 / 250) * 100, '%'),
  'ch06-mv-pct': numeric((5 / 200) * 100, '%'),
  'ch06-ppm-cu': numeric((0.00325 / 500) * 1e6, 'ppm'),
  'ch06-ppb-hg': numeric((4.2e-6 / 250) * 1e9, 'ppb'),
  'ch06-ppm-to-m': numeric(0.025 / m.Cu, 'M'),
  'ch06-hardness': numeric(0.175 / CaCO3, 'M'),
  'ch06-g-ethanol': numeric(80 * 0.12, 'g'),
  'ch06-ppm-soil': numeric((0.0084 / 2000) * 1e6, 'ppm'),
  'ch06-sugar-pct': numeric((18 / 160) * 100, '%'),
};

const TEACHING = {
  'ch06-formula-mass': {
    worked: numeric((4.5 / H2O) * NA, 'molecules'),
    similar: numeric((9 / H2O) * NA, 'molecules'),
  },
  'ch06-empirical': {
    worked: exact('CH2O'),
    similar: exact('C2H6O'),
  },
  'ch06-molarity': {
    worked: numeric((12.5 / NaCl) / 0.25, 'M'),
    similar: numeric((6.25 / NaCl) / 0.5, 'M'),
  },
  'ch06-concentration': {
    worked: numeric((10 / NaCl) / ((100 / 1.074) / 1000), 'M'),
    similar: numeric((5 / NaCl) / ((100 / 1.034) / 1000), 'M'),
  },
};

const contentDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../content/ch06');
const lessons = Object.fromEntries(readdirSync(contentDir).filter((name) => name.endsWith('.json')).sort().map((name) => {
  const lesson = JSON.parse(readFileSync(path.join(contentDir, name), 'utf8'));
  return [lesson.id, lesson];
}));

function stringsIn(value, found = []) {
  if (typeof value === 'string') found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => stringsIn(item, found));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => stringsIn(item, found));
  return found;
}

function expectedAnswer(spec) {
  if (spec.kind === 'exact') return spec.text;
  return `${formatSig(spec.full)} ${spec.unit}`;
}

function checkFor(spec) {
  if (spec.kind === 'exact') return { kind: 'exact', text: spec.text, case: 'sensitive' };
  return {
    kind: 'numeric',
    value: roundSig(spec.full),
    tolerance: 0.5,
    sigFigs: 4,
    unit: spec.unit,
  };
}

function wrongInput(answer, spec) {
  if (spec.kind === 'exact') return answer.toLowerCase();
  return `${formatSig(spec.full * 2)} ${spec.unit}`;
}

function assertGrades(label, answer, spec) {
  const check = checkFor(spec);
  assert.equal(answer, expectedAnswer(spec), label);
  const result = grade(answer, check);
  assert.deepEqual(result, { ok: true }, label);
  const missed = grade(wrongInput(answer, spec), check);
  assert.equal(missed.ok, false, `${label} wrong answer`);
}

test('chapter 6 cites only the Atoms First 2e outline', () => {
  assert.deepEqual(Object.keys(lessons).sort(), OUTLINE.map(([id]) => id).sort());
  for (const [id, section, title] of OUTLINE) {
    const lesson = lessons[id];
    assert.equal(lesson.ch, 6, id);
    assert.equal(lesson.openstax_section, section, id);
    assert.deepEqual(lesson.sources, [section], id);
    assert.equal(lesson.steps[0].startsWith(title), true, lesson.steps[0]);
    assert.deepEqual(validateLesson(lesson), [], id);
    assert.ok(lesson.problems.length >= 10, id);
    const cited = stringsIn(lesson).join('\n').match(/§\s*\d+\.\d+/g) ?? [];
    assert.ok(cited.length > 0, id);
    for (const cite of cited) assert.equal(cite, section.replace('OpenStax AF2e ', ''), `${id} ${cite}`);
  }
  const blob = Object.values(lessons).flatMap((lesson) => stringsIn(lesson)).join('\n');
  assert.doesNotMatch(blob, /§\s*3\.[1-4]/);
  assert.doesNotMatch(blob, /Chemistry 2e/);
  assert.doesNotMatch(blob, /Formula Mass and the Mole Concept/);
});

for (const [id, lesson] of Object.entries(lessons)) {
  test(`${id} worked example grades and a wrong answer fails`, () => {
    assertGrades(`${id} worked`, lesson.worked_example.answer, TEACHING[id].worked);
  });
  test(`${id} similar problem grades and a wrong answer fails`, () => {
    assertGrades(`${id} similar`, lesson.similar_problem.answer, TEACHING[id].similar);
    assert.equal(lesson.similar_problem.hint.length > 0, true);
  });
  for (const problem of lesson.problems) {
    test(`${problem.id} grades the key and rejects a wrong answer`, () => {
      const spec = SPECS[problem.id];
      assert.ok(spec, `missing spec for ${problem.id}`);
      assert.equal(problem.hints.length, 1, problem.id);
      assert.equal(problem.why.includes(problem.hints[0]), false, problem.id);
      if (spec.kind === 'exact') {
        assert.equal(problem.check.case, 'sensitive', problem.id);
        assert.equal(problem.check.kind, 'exact');
        assert.equal(problem.check.text, spec.text);
      } else {
        assert.equal(problem.check.kind, 'numeric');
        assert.equal(problem.check.sigFigs, 4);
        assert.equal(problem.check.unit, spec.unit);
        const expected = roundSig(spec.full);
        assert.ok(Math.abs(problem.check.value - expected) <= Math.abs(expected) * 1e-9 + 1e-12, problem.id);
      }
      assert.equal(problem.a, expectedAnswer(spec), problem.id);
      const result = grade(problem.a, problem.check);
      assert.deepEqual(result, { ok: true }, problem.id);
      const missed = grade(wrongInput(problem.a, spec), problem.check);
      assert.equal(missed.ok, false, problem.id);
    });
  }
}

test('every chapter 6 hint is specific to one problem', () => {
  const hints = [];
  for (const lesson of Object.values(lessons)) {
    hints.push(lesson.similar_problem.hint);
    for (const problem of lesson.problems) hints.push(...problem.hints);
  }
  assert.equal(new Set(hints).size, hints.length);
  assert.equal(Object.keys(SPECS).length, Object.values(lessons).reduce((sum, lesson) => sum + lesson.problems.length, 0));
});
