import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade, parseAnswer } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

// OpenStax Chemistry: Atoms First 2e, Chapter 2 introduction outline.
// Sections 2.5–2.7 are Chemistry 2e headings, not this book.
const OUTLINE = {
  'ch2-early-ideas': '2.1',
  'ch2-evolution': '2.2',
  'ch2-structure': '2.3',
  'ch2-formulas': '2.4',
};

const AMU = {
  H: 1.008,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  Na: 22.990,
  Mg: 24.305,
  S: 32.06,
  Cl: 35.45,
};

const lessonDir = new URL('../content/ch02/', import.meta.url);
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

function roundSig(value, digits = 4) {
  return Number(value.toPrecision(digits));
}

const NUMERIC = {
  'ch2-21-product': () => 24 + 16,
  'ch2-21-missing': () => 27.5 - 15,
  'ch2-21-gas': () => 10 - 6,
  'ch2-21-percent': () => 0.4 * 12.5,
  'ch2-21-scale': () => (8 / 20) * 50,
  'ch2-21-iron': () => (1.5 / 4) * 10,
  'ch2-21-ratio-oxygen': () => 4.568 / 2.284,
  'ch2-21-ratio-q': () => 9 / 3,
  'ch2-21-other': () => 25 * (1 - 0.6),
  'ch2-23-protons-p': () => 15,
  'ch2-23-neutrons-cl37': () => 37 - 17,
  'ch2-23-electrons-s2': () => 16 + 2,
  'ch2-23-mass-number': () => 20 + 20,
  'ch2-23-avg-b': () => 0.25 * 10.0129 + 0.75 * 11.0093,
  'ch2-23-avg-ne': () => 0.9 * 19.9924 + 0.1 * 21.9914,
  'ch2-23-avg-ne3': () => 0.7 * 19.9924 + 0.01 * 20.9938 + 0.29 * 21.9914,
  'ch2-23-protons-ca': () => 20,
  'ch2-23-percent-ne': () => (100 * (21.9914 - 20.1923)) / (21.9914 - 19.9924),
  'ch2-23-electrons-fe3': () => 26 - 3,
  'ch2-23-oil-drop': () => 9.612e-19 / 1.602e-19,
  'ch2-24-mm-h2o': () => 2 * AMU.H + AMU.O,
  'ch2-24-mm-co2': () => AMU.C + 2 * AMU.O,
  'ch2-24-mm-nacl': () => AMU.Na + AMU.Cl,
  'ch2-24-moles-water': () => 36.04 / 18.02,
  'ch2-24-molecules': () => 0.25 * 6.022e23,
  'ch2-24-mass-nacl': () => 2.5 * 58.44,
  'ch2-24-atoms': () => 0.1 * 6.022e23,
  'ch2-24-mm-mgcl2': () => AMU.Mg + 2 * AMU.Cl,
  'ch2-24-moles-carbon': () => 24.02 / AMU.C,
  'ch2-24-atoms-to-moles': () => 3.011e23 / 6.022e23,
  'ch2-24-na-atoms': () => (11.5 / AMU.Na) * 6.022e23,
};

const SHOWN = {
  'ch2-early-ideas': {
    worked: { answer: '44.00 g', check: { kind: 'numeric', value: roundSig(12 + 32), tolerance: 0.05, sigFigs: 4, unit: 'g' } },
    similar: { answer: '16.00 g', check: { kind: 'numeric', value: roundSig(8 + 8), tolerance: 0.05, sigFigs: 4, unit: 'g' } },
  },
  'ch2-evolution': {
    worked: { answer: 'nucleus', check: { kind: 'exact', text: 'nucleus', case: 'insensitive' } },
    similar: { answer: 'electron', check: { kind: 'exact', text: 'electron', case: 'insensitive' } },
  },
  'ch2-structure': {
    worked: { answer: '39', check: { kind: 'numeric', value: 19 + 20, tolerance: 0, unit: null } },
    similar: { answer: '37', check: { kind: 'numeric', value: 17 + 20, tolerance: 0, unit: null } },
  },
  'ch2-formulas': {
    worked: {
      answer: '16.04 g/mol',
      check: { kind: 'numeric', value: roundSig(AMU.C + 4 * AMU.H), tolerance: 0.05, sigFigs: 4, unit: 'g/mol' },
    },
    similar: {
      answer: '64.06 g/mol',
      check: { kind: 'numeric', value: roundSig(AMU.S + 2 * AMU.O), tolerance: 0.05, sigFigs: 4, unit: 'g/mol' },
    },
  },
};

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

function toSubscripts(text) {
  return text.replace(/\d/g, (digit) => SUBSCRIPTS[digit]);
}

function answerTexts(check) {
  const texts = [];
  if (typeof check.text === 'string') texts.push(check.text);
  if (Array.isArray(check.answers)) texts.push(...check.answers);
  return texts;
}

function isSymbolOrFormula(check) {
  return answerTexts(check).some((text) => (
    /^[A-Z][a-z]?$/.test(text)
    || /^[A-Z][a-z]?-\d+$/.test(text)
    || (/[A-Za-z]/.test(text) && /\d/.test(text))
  ));
}

function wrongAttempt(problem) {
  const { check } = problem;
  if (check.kind === 'numeric') {
    return check.unit ? `0 ${check.unit}` : '0';
  }
  if (check.kind === 'set') return 'Xe';
  return 'not-the-answer';
}

test('chapter 2 lessons follow the Atoms First 2e outline and the lesson schema', () => {
  assert.equal(lessons.length, 4);
  const seen = new Set();
  for (const lesson of lessons) {
    assert.deepEqual(validateLesson(lesson), [], lesson.id);
    assert.equal(lesson.ch, 2, lesson.id);
    const section = OUTLINE[lesson.id];
    assert.equal(section, lesson.openstax_section.replace('OpenStax AF2e §', ''), lesson.id);
    assert.deepEqual(lesson.sources, [`OpenStax AF2e §${section}`], lesson.id);
    assert.ok(lesson.problems.length >= 10, lesson.id);
    assert.ok(lesson.steps.length >= 3, lesson.id);
    seen.add(section);
    const blob = JSON.stringify(lesson);
    const cites = blob.match(/§\s*\d+\.\d+/g) ?? [];
    assert.ok(cites.length >= 2, lesson.id);
    for (const cite of cites) assert.match(cite, /§2\.[1-4]$/, `${lesson.id} ${cite}`);
    assert.doesNotMatch(blob, /§\s*2\.[5-9]/, lesson.id);
    assert.doesNotMatch(blob, /§\s*[013-9]\d*\./, lesson.id);
  }
  assert.deepEqual([...seen].sort(), ['2.1', '2.2', '2.3', '2.4']);
});

test('every keyed answer grades correct and a wrong answer fails', () => {
  const numericIds = [];
  for (const lesson of lessons) {
    for (const problem of lesson.problems) {
      const graded = grade(problem.a, problem.check);
      assert.equal(graded.ok, true, problem.id);
      assert.equal(graded.hint, undefined, problem.id);
      const missed = grade(wrongAttempt(problem), problem.check);
      assert.equal(missed.ok, false, problem.id);
      if (problem.check.kind === 'numeric') {
        numericIds.push(problem.id);
        const expected = problem.check.sigFigs
          ? roundSig(NUMERIC[problem.id](), problem.check.sigFigs)
          : NUMERIC[problem.id]();
        assert.equal(problem.check.value, expected, problem.id);
        if (problem.check.sigFigs) assert.equal(parseAnswer(problem.a).sigFigs, problem.check.sigFigs, problem.id);
      }
      if (isSymbolOrFormula(problem.check)) {
        assert.equal(problem.check.case, 'sensitive', problem.id);
      }
    }
    for (const slot of ['worked', 'similar']) {
      const spec = SHOWN[lesson.id][slot];
      const shown = slot === 'worked' ? lesson.worked_example.answer : lesson.similar_problem.answer;
      assert.equal(shown, spec.answer, `${lesson.id} ${slot}`);
      assert.equal(grade(shown, spec.check).ok, true, `${lesson.id} ${slot}`);
      assert.equal(grade(wrongAttempt({ check: spec.check }), spec.check).ok, false, `${lesson.id} ${slot}`);
    }
  }
  assert.deepEqual(numericIds.sort(), Object.keys(NUMERIC).sort());
});

test('formula and element-symbol answers keep case', () => {
  const cobalt = byId('ch2-23-symbol-co');
  assert.equal(grade('Co', cobalt.check).ok, true);
  assert.equal(grade('CO', cobalt.check).ok, false);
  assert.equal(grade('co', cobalt.check).ok, false);

  const sodium = byId('ch2-23-symbol-na');
  assert.equal(grade('NA', sodium.check).ok, false);
  assert.equal(grade('Na', sodium.check).ok, true);

  const bromine = byId('ch2-23-symbol-br79');
  assert.equal(grade('Br-79', bromine.check).ok, true);
  assert.equal(grade('br-79', bromine.check).ok, false);
  assert.equal(grade(toSubscripts('Br-79'), bromine.check).ok, true);

  for (const id of ['ch2-24-empirical', 'ch2-24-molecular', 'ch2-24-empirical-p4', 'ch2-24-hydrogen-molecule']) {
    const problem = byId(id);
    assert.equal(grade(problem.a.toLowerCase(), problem.check).ok, false, id);
    assert.equal(grade(toSubscripts(problem.a), problem.check).ok, true, id);
  }

  const diatomic = byId('ch2-24-diatomics');
  assert.equal(grade('I2, Br2, Cl2, F2, O2, N2, H2', diatomic.check).ok, true);
  assert.equal(grade('h2, n2, o2, f2, cl2, br2, i2', diatomic.check).ok, false);
  assert.equal(grade(toSubscripts('H2, N2, O2, F2, Cl2, Br2, I2'), diatomic.check).ok, true);
  const sulfur = grade('H2, N2, O2, F2, Cl2, Br2, I2, S8', diatomic.check);
  assert.equal(sulfur.ok, false);
  assert.equal(sulfur.reason, 'nearMiss');

  const oxide = byId('ch2-23-symbol-o2');
  assert.equal(grade('O2-', oxide.check).ok, true);
  assert.equal(grade('O2+', oxide.check).ok, false);
  assert.equal(grade('o2-', oxide.check).ok, false);
});

test('common chapter 2 traps fail', () => {
  assert.equal(grade('18', byId('ch2-23-protons-ca').check).ok, false);
  assert.equal(grade('20.20 amu', byId('ch2-23-avg-ne').check).ok, false);
  assert.equal(grade('20.59 amu', byId('ch2-23-avg-ne3').check).ok, false);
  assert.equal(grade('59.76 g/mol', byId('ch2-24-mm-mgcl2').check).ok, false);
  assert.equal(grade('288.5 mol', byId('ch2-24-moles-carbon').check).ok, false);
  assert.equal(grade('2H', byId('ch2-24-hydrogen-molecule').check).ok, false);
});

test('every problem has its own hint', () => {
  const hints = [];
  for (const lesson of lessons) {
    assert.ok(lesson.similar_problem.hint.length > 0, lesson.id);
    hints.push(lesson.similar_problem.hint);
    for (const problem of lesson.problems) {
      assert.ok(problem.hints.length >= 1, problem.id);
      for (const hint of problem.hints) {
        assert.ok(hint.length > 0, problem.id);
        hints.push(hint);
      }
      for (const entry of problem.check.nearMiss ?? []) {
        if (typeof entry === 'object' && entry.hint) hints.push(entry.hint);
      }
    }
  }
  const unique = new Set(hints);
  assert.equal(unique.size, hints.length, [...hints].filter((hint, index) => hints.indexOf(hint) !== index).join(' | '));
});
