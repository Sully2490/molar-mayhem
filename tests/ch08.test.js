import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { grade, parseAnswer } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

// OpenStax Chemistry: Atoms First 2e, Chapter 8 introduction outline.
// Gases are chapter 8 here. In Chemistry 2e the same material is chapter 9,
// and chapter 8 is bonding, so those section numbers are not used.
const OUTLINE = [
  { section: '8.1', id: '8.1-pressure', title: 'Gas Pressure', marker: 'manometer' },
  { section: '8.2', id: '8.2-ideal-gas', title: 'Relating Pressure, Volume, Amount, and Temperature: The Ideal Gas Law', marker: 'PV = nRT' },
  { section: '8.3', id: '8.3-mixtures', title: 'Stoichiometry of Gaseous Substances, Mixtures, and Reactions', marker: 'partial pressure' },
  { section: '8.4', id: '8.4-effusion', title: 'Effusion and Diffusion of Gases', marker: 'Graham' },
  { section: '8.5', id: '8.5-kinetic', title: 'The Kinetic-Molecular Theory', marker: 'rms speed' },
  { section: '8.6', id: '8.6-real-gases', title: 'Non-Ideal Gas Behavior', marker: 'van der Waals' },
];

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../content/ch08');
const names = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort();
const lessons = await Promise.all(names.map(async (name) => JSON.parse(await readFile(path.join(dir, name), 'utf8'))));

function cite(section) {
  return `OpenStax AF2e §${section}`;
}

function walkStrings(value, out) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => walkStrings(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => walkStrings(item, out));
}

function isFormulaOrSymbol(text) {
  const compact = String(text).replace(/\s+/g, '');
  if (compact === 'PV=nRT') return true;
  if (/^[ab]$/.test(compact)) return true;
  return /^([A-Z][a-z]?\d*)+$/.test(compact);
}

function formulaItems(check) {
  if (check.kind === 'exact') return [check.text, ...(check.answers ?? [])].filter(Boolean);
  if (check.kind === 'set') return [...(check.answers ?? [])];
  return [];
}

function formatSig(value) {
  const raw = Number(value).toPrecision(4);
  if (!raw.includes('e')) return raw;
  const [coeff, exp] = raw.split('e');
  return `${coeff}e${Number(exp)}`;
}

function wrongInput(problem) {
  const { check } = problem;
  if (check.kind === 'numeric') {
    const value = check.value * 4 + 25;
    const body = formatSig(value);
    return check.unit ? `${body} ${check.unit}` : body;
  }
  return 'not-the-answer';
}

function flipCase(text) {
  return [...text].map((ch) => {
    const lower = ch.toLowerCase();
    const upper = ch.toUpperCase();
    if (lower === upper) return ch;
    return ch === lower ? upper : lower;
  }).join('');
}

test('chapter 8 citations match the Atoms First 2e gases outline', () => {
  assert.equal(lessons.length, OUTLINE.length);
  const allowed = new Set(OUTLINE.map((row) => row.section));
  for (const row of OUTLINE) {
    const lesson = lessons.find((item) => item.id === row.id);
    assert.ok(lesson, row.id);
    assert.equal(lesson.ch, 8);
    assert.equal(lesson.openstax_section, cite(row.section));
    assert.deepEqual(lesson.sources, [cite(row.section)]);
    const text = JSON.stringify(lesson);
    assert.match(text, new RegExp(row.marker, 'i'));
    assert.doesNotMatch(lesson.openstax_section, /§9\./);
  }
  for (const lesson of lessons) {
    const strings = [];
    walkStrings(lesson, strings);
    const cited = strings.flatMap((value) => [...value.matchAll(/§(\d+\.\d+)/g)].map((match) => match[1]));
    assert.ok(cited.length >= 2, lesson.id);
    for (const section of cited) assert.ok(allowed.has(section), `${lesson.id} cites §${section}`);
  }
});

test('every chapter 8 hint is unique', () => {
  const seen = new Map();
  for (const lesson of lessons) {
    const hints = [lesson.similar_problem.hint];
    for (const problem of lesson.problems) hints.push(...problem.hints);
    for (const hint of hints) {
      const key = hint.trim().toLowerCase();
      assert.ok(!seen.has(key), `reused hint: ${hint}`);
      seen.set(key, lesson.id);
      assert.ok(hint.length >= 24, hint);
    }
  }
  assert.ok(seen.size >= 80);
});

for (const lesson of lessons) {
  test(`${lesson.id} matches the lesson schema`, () => {
    assert.deepEqual(validateLesson(lesson), []);
    assert.ok(lesson.steps.length >= 3);
    assert.ok(lesson.worked_example.q && lesson.worked_example.answer);
    assert.ok(lesson.worked_example.steps?.length >= 2);
    assert.ok(lesson.similar_problem.hint);
    assert.ok(lesson.problems.length >= 10);
  });

  for (const problem of lesson.problems) {
    test(`${problem.id} answer key grades correctly and a wrong answer fails`, () => {
      const result = grade(problem.a, problem.check);
      assert.equal(result.ok, true, `${problem.a} ${JSON.stringify(result)}`);
      assert.equal(result.hint, undefined);
      assert.equal(problem.hints.length, 1);
      assert.ok(problem.why.length > problem.a.length);

      if (problem.check.kind === 'numeric') {
        const parsed = parseAnswer(problem.a);
        assert.equal(parsed.sigFigs, 4);
        assert.equal(problem.check.sigFigs, 4);
        const keyed = Number(problem.check.value.toPrecision(problem.check.sigFigs));
        assert.equal(problem.check.value, keyed, `${problem.id} value is not rounded to ${problem.check.sigFigs} sig figs`);
        assert.equal(problem.check.value, parsed.value);
      }

      const symbols = formulaItems(problem.check);
      if (symbols.some(isFormulaOrSymbol)) assert.equal(problem.check.case, 'sensitive');
      if (problem.check.case === 'sensitive') {
        const flipped = flipCase(problem.a);
        assert.notEqual(flipped, problem.a);
        assert.equal(grade(flipped, problem.check).ok, false, flipped);
      }

      const wrong = wrongInput(problem);
      assert.notEqual(wrong, problem.a);
      assert.equal(grade(wrong, problem.check).ok, false, wrong);
    });
  }
}
