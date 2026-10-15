import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const contentDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../content/ch09');

async function loadLessons() {
  const names = (await readdir(contentDir)).filter((name) => name.endsWith('.json')).sort();
  const lessons = [];
  for (const name of names) {
    const lesson = JSON.parse(await readFile(path.join(contentDir, name), 'utf8'));
    lessons.push({ name, lesson });
  }
  return lessons;
}

function wrongAnswer(problem) {
  const check = problem.check;
  if (check.kind === 'numeric') {
    const bad = check.value + Math.abs(check.value) * 0.1 + 1;
    return check.unit ? `${bad} ${check.unit}` : String(bad);
  }
  return 'not-an-answer';
}

test('chapter 9 has one lesson for each OpenStax section 9.1-9.4', async () => {
  const lessons = await loadLessons();
  assert.equal(lessons.length, 4);
  const sections = lessons.map(({ lesson }) => lesson.openstax_section);
  assert.deepEqual(sections.sort(), [
    'OpenStax AF2e §9.1',
    'OpenStax AF2e §9.2',
    'OpenStax AF2e §9.3',
    'OpenStax AF2e §9.4',
  ]);
  for (const { name, lesson } of lessons) {
    assert.deepEqual(validateLesson(lesson), [], name);
    assert.equal(lesson.ch, 9);
    assert.ok(lesson.steps.length >= 4, name);
    assert.ok(lesson.worked_example.q && lesson.worked_example.answer, name);
    assert.ok(lesson.similar_problem.hint.length > 0, name);
    assert.ok(lesson.similar_problem.answer.length > 0, name);
    assert.ok(lesson.problems.length >= 10, name);
  }
});

test('every hint is specific to one problem', async () => {
  const lessons = await loadLessons();
  const seen = new Map();
  for (const { lesson } of lessons) {
    const similar = lesson.similar_problem.hint;
    assert.equal(seen.has(similar), false, similar);
    seen.set(similar, `${lesson.id} similar`);
    for (const problem of lesson.problems) {
      assert.equal(problem.hints.length, 1, problem.id);
      const hint = problem.hints[0];
      assert.equal(seen.has(hint), false, `${problem.id} reuses a hint`);
      seen.set(hint, problem.id);
    }
  }
  assert.equal(seen.size, 4 + 48);
});

test('chapter 9 answer key grades and a wrong answer fails', async (t) => {
  const lessons = await loadLessons();
  let count = 0;
  for (const { lesson } of lessons) {
    for (const problem of lesson.problems) {
      await t.test(problem.id, () => {
        const result = grade(problem.a, problem.check);
        assert.equal(result.ok, true, `${problem.id} ${problem.a} ${JSON.stringify(result)}`);
        assert.equal(result.hint, undefined, `${problem.id} sig figs`);
        const missed = grade(wrongAnswer(problem), problem.check);
        assert.equal(missed.ok, false, problem.id);
        if (problem.check.case === 'sensitive') {
          assert.equal(grade(problem.a.toLowerCase(), problem.check).ok, false, problem.id);
        }
      });
      count += 1;
    }
  }
  assert.equal(count, 48);
});
