import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const dir = fileURLToPath(new URL('../content/ch01/', import.meta.url));

// Checked against the OpenStax Chemistry: Atoms First 2e Chapter 1 outline:
// 1.1 Chemistry in Context
// 1.2 Phases and Classification of Matter
// 1.3 Physical and Chemical Properties
// 1.4 Measurements
// 1.5 Measurement Uncertainty, Accuracy, and Precision
// 1.6 Mathematical Treatment of Measurement Results
const SECTIONS = {
  'ch01-context': 'OpenStax AF2e §1.1',
  'ch01-classify': 'OpenStax AF2e §1.2',
  'ch01-properties': 'OpenStax AF2e §1.3',
  'ch01-measure': 'OpenStax AF2e §1.4',
  'ch01-sigfigs': 'OpenStax AF2e §1.5',
  'ch01-convert': 'OpenStax AF2e §1.6',
};

const FORMULA = /^(?:[A-Z][a-z]?\d*)+$/;

async function loadLessons() {
  const names = (await readdir(dir)).filter((name) => name.endsWith('.json') && name !== 'index.json').sort();
  const lessons = [];
  for (const name of names) {
    const lesson = JSON.parse(await readFile(path.join(dir, name), 'utf8'));
    lessons.push({ name, lesson });
  }
  return lessons;
}

function acceptedTexts(check) {
  const texts = [];
  if (typeof check.text === 'string' && check.text.length > 0) texts.push(check.text);
  if (Array.isArray(check.answers)) texts.push(...check.answers);
  return texts;
}

function hintTexts(lesson) {
  const hints = [lesson.similar_problem.hint];
  for (const problem of lesson.problems) {
    hints.push(...problem.hints);
    for (const entry of problem.check.nearMiss ?? []) {
      if (typeof entry === 'string') hints.push(entry);
      else if (entry.hint) hints.push(entry.hint);
    }
  }
  return hints;
}

function wrongInput(problem) {
  const { check } = problem;
  if (check.kind === 'numeric') {
    const unit = check.unit ? ` ${check.unit}` : '';
    return `999999${unit}`;
  }
  return 'not-the-answer';
}

const lessons = await loadLessons();

test('chapter 1 cites each Atoms First 2e section once', () => {
  assert.equal(lessons.length, 6);
  const seen = new Set();
  for (const { name, lesson } of lessons) {
    assert.deepEqual(validateLesson(lesson), [], name);
    assert.equal(lesson.ch, 1, name);
    const expected = SECTIONS[lesson.id];
    assert.equal(lesson.openstax_section, expected, lesson.id);
    assert.ok(lesson.sources.includes(expected), lesson.id);
    const cites = JSON.stringify(lesson).match(/§\d+\.\d+/g) ?? [];
    assert.deepEqual([...new Set(cites)], [expected.replace('OpenStax AF2e ', '')], lesson.id);
    assert.ok(lesson.problems.length >= 10, `${lesson.id} has ${lesson.problems.length} problems`);
    seen.add(lesson.openstax_section);
  }
  assert.deepEqual([...seen].sort(), Object.values(SECTIONS).sort());
});

test('every chapter 1 hint is specific to one problem', () => {
  const hints = lessons.flatMap(({ lesson }) => hintTexts(lesson));
  assert.equal(new Set(hints).size, hints.length);
  for (const hint of hints) assert.ok(hint.length >= 20, hint);
});

for (const { lesson } of lessons) {
  for (const problem of lesson.problems) {
    test(`${problem.id} answer grades correct and a wrong answer fails`, () => {
      const result = grade(problem.a, problem.check);
      assert.equal(result.ok, true, `${problem.id}: ${JSON.stringify(result)}`);
      assert.equal(result.hint, undefined, `${problem.id} key should not need a sig-fig hint`);
      const wrong = grade(wrongInput(problem), problem.check);
      assert.equal(wrong.ok, false, problem.id);

      const formulaLike = acceptedTexts(problem.check).some((text) => FORMULA.test(text));
      if (formulaLike) assert.equal(problem.check.case, 'sensitive', problem.id);
      if (problem.check.case === 'sensitive') {
        for (const flipped of [problem.a.toLowerCase(), problem.a.toUpperCase()]) {
          if (flipped !== problem.a) assert.equal(grade(flipped, problem.check).ok, false, problem.id);
        }
      }
      if (problem.check.kind === 'exact') {
        for (const text of acceptedTexts(problem.check)) {
          assert.equal(grade(text, problem.check).ok, true, `${problem.id} ${text}`);
        }
      }
    });
  }
}
