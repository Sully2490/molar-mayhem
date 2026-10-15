import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../content/ch04');

// OpenStax Chemistry: Atoms First 2e, Chapter 4 outline (chapter introduction).
// Nomenclature is 4.3, so Lewis structures are 4.4, not the Chemistry 2e order.
const OUTLINE = [
  ['4.1-ionic-bonding.json', 'OpenStax AF2e §4.1'],
  ['4.2-covalent-bonding.json', 'OpenStax AF2e §4.2'],
  ['4.3-nomenclature.json', 'OpenStax AF2e §4.3'],
  ['4.4-lewis-structures.json', 'OpenStax AF2e §4.4'],
  ['4.5-formal-charge-resonance.json', 'OpenStax AF2e §4.5'],
  ['4.6-shape-and-polarity.json', 'OpenStax AF2e §4.6'],
];

const SUBSCRIPTS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

function loadLessons() {
  const files = readdirSync(dir).filter((name) => name.endsWith('.json') && name !== 'index.json').sort();
  assert.deepEqual(files, OUTLINE.map(([name]) => name));
  return files.map((name) => ({
    name,
    lesson: JSON.parse(readFileSync(path.join(dir, name), 'utf8')),
  }));
}

function listedAnswers(check) {
  const answers = [];
  if (typeof check.text === 'string' && check.text.length > 0) answers.push(check.text);
  if (Array.isArray(check.answers)) answers.push(...check.answers);
  return answers;
}

function keyResponses(problem) {
  const check = problem.check;
  if (check.kind === 'set') return [problem.a];
  return [...new Set([problem.a, ...listedAnswers(check)])];
}

function isFormulaOrSymbol(text) {
  const noRoman = String(text).replace(/\((?:i|v|x|l|c|d|m)+\)/gi, ' ');
  if (/[A-Z][a-z]?\d/.test(noRoman)) return true;
  if (/[A-Z][a-z]?[A-Z]/.test(noRoman)) return true;
  if (/[A-Z][a-z]?[+-]/.test(noRoman)) return true;
  if (/[A-Z][a-z]?\s*[-–=]\s*[A-Z][a-z]?/.test(noRoman)) return true;
  return /^[A-Z][a-z]?$/.test(noRoman.trim());
}

function wrongInput(problem) {
  const check = problem.check;
  if (check.kind === 'numeric') {
    const bad = check.value === 0 ? 9 : 0;
    return check.unit ? `${bad} ${check.unit}` : String(bad);
  }
  if (check.kind === 'config') return '1s1';
  if (check.kind === 'set') return 'qqqq';
  return 'not-the-answer';
}

function withSubscript(answer) {
  const index = answer.search(/\d/);
  if (index === -1) return null;
  const digit = answer[index];
  return `${answer.slice(0, index)}${SUBSCRIPTS[Number(digit)]}${answer.slice(index + 1)}`;
}

const lessons = loadLessons();

test('chapter 4 cites the Atoms First 2e sections 4.1 through 4.6', () => {
  assert.equal(lessons.length, 6);
  lessons.forEach(({ name, lesson }, index) => {
    const expected = OUTLINE[index][1];
    assert.equal(lesson.openstax_section, expected, name);
    assert.deepEqual(lesson.sources, [expected]);
    assert.equal(lesson.ch, 4);
    assert.ok(lesson.problems.length >= 10, `${name} needs at least 10 problems`);
    assert.deepEqual(validateLesson(lesson), [], name);
    assert.equal(lesson.similar_problem.q, lesson.problems[0].q);
    assert.equal(lesson.similar_problem.answer, lesson.problems[0].a);
    assert.equal(lesson.similar_problem.hint, lesson.problems[0].hints[0]);
    assert.doesNotMatch(lesson.openstax_section, /§(?:5|6|7|8|9)\./);
  });
});

test('every chapter 4 hint is specific to one problem', () => {
  const seen = new Map();
  for (const { lesson } of lessons) {
    for (const problem of lesson.problems) {
      assert.ok(problem.hints.length >= 1, problem.id);
      for (const hint of problem.hints) {
        assert.ok(hint.length >= 20, problem.id);
        assert.equal(seen.has(hint), false, `${problem.id} reuses a hint from ${seen.get(hint)}`);
        seen.set(hint, problem.id);
      }
      for (const entry of problem.check.nearMiss ?? []) {
        if (typeof entry !== 'object' || !entry.hint) continue;
        assert.equal(seen.has(entry.hint), false, `${problem.id} near-miss reuses a hint`);
        seen.set(entry.hint, `${problem.id} near-miss`);
      }
    }
  }
});

for (const { lesson } of lessons) {
  for (const problem of lesson.problems) {
    test(`${problem.id} grades every key answer and rejects a wrong one`, () => {
      const check = problem.check;
      const answers = keyResponses(problem);
      for (const answer of answers) {
        const result = grade(answer, check);
        assert.equal(result.ok, true, `${problem.id} rejected key ${answer}`);
        assert.equal(result.hint, undefined, `${problem.id} key ${answer} should not need a hint`);
      }
      if (check.kind === 'set') {
        const members = listedAnswers(check);
        assert.equal(grade(members.slice().reverse().join(', '), check).ok, true, problem.id);
        if (members.length > 1) {
          assert.equal(grade(members[0], check).ok, false, `${problem.id} accepted a partial list`);
        }
      }
      const bad = grade(wrongInput(problem), check);
      assert.equal(bad.ok, false, `${problem.id} accepted a wrong answer`);

      const symbolic = [...answers, ...listedAnswers(check)].some((answer) => isFormulaOrSymbol(answer));
      if (symbolic && (check.kind === 'exact' || check.kind === 'set')) {
        assert.equal(check.case, 'sensitive', problem.id);
        for (const answer of answers) {
          const lower = answer.toLowerCase();
          if (lower !== answer) {
            assert.equal(grade(lower, check).ok, false, `${problem.id} ignored case for ${answer}`);
          }
          const subscripted = withSubscript(answer);
          if (subscripted && isFormulaOrSymbol(answer)) {
            assert.equal(grade(subscripted, check).ok, true, `${problem.id} rejected subscript form`);
          }
        }
      }
      if ((check.case ?? 'insensitive') === 'insensitive' && check.kind === 'exact') {
        assert.equal(grade(problem.a.toUpperCase(), check).ok, true, problem.id);
      }
    });
  }
}
