import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { validateProblem } from '../js/schema.js';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content', 'final', 'practice-final.json');

const SECTION = /^OpenStax AF2e §\d+\.\d+$/;

async function loadExam() {
  return JSON.parse(await readFile(file, 'utf8'));
}

function keyInputs(problem) {
  const check = problem.check;
  if (check.kind === 'numeric' || check.kind === 'set') return [problem.a];
  const inputs = [];
  if (typeof check.text === 'string' && check.text.length > 0) inputs.push(check.text);
  if (Array.isArray(check.answers)) inputs.push(...check.answers);
  if (!inputs.includes(problem.a)) inputs.push(problem.a);
  return inputs;
}

function wrongInput(problem) {
  const check = problem.check;
  if (check.kind === 'numeric') {
    const unit = check.unit ? ` ${check.unit}` : '';
    return `0${unit}`;
  }
  return 'not-the-answer';
}

function isBonus(problem) {
  return problem.group === 'bonus' || problem.bonus === true;
}

test('practice final is untimed and weights gases and thermochemistry most heavily', async () => {
  const exam = await loadExam();
  assert.equal(exam.id, 'practice-final');
  assert.equal(exam.timed, false);
  assert.ok(exam.problems.length >= 45, `only ${exam.problems.length} problems`);

  const gases = exam.problems.filter((problem) => problem.group === 'gases');
  const thermo = exam.problems.filter((problem) => problem.group === 'thermochemistry');
  assert.ok(gases.length >= 10, `gases: ${gases.length}`);
  assert.ok(thermo.length >= 10, `thermochemistry: ${thermo.length}`);
  assert.ok(gases.every((problem) => problem.ch === 8 && problem.points === 3));
  assert.ok(thermo.every((problem) => problem.ch === 9 && problem.points === 3));

  const bonusPoints = exam.problems.filter(isBonus).reduce((sum, problem) => sum + problem.points, 0);
  assert.equal(bonusPoints, 40);

  const byChapter = new Map();
  for (const problem of exam.problems) {
    if (isBonus(problem)) continue;
    byChapter.set(problem.ch, (byChapter.get(problem.ch) ?? 0) + problem.points);
  }
  const gasesPoints = byChapter.get(8);
  const thermoPoints = byChapter.get(9);
  assert.ok(gasesPoints > 0 && thermoPoints > 0);
  for (const [ch, points] of byChapter) {
    if (ch === 8 || ch === 9) continue;
    assert.ok(gasesPoints > points, `ch 8 (${gasesPoints}) should outweigh ch ${ch} (${points})`);
    assert.ok(thermoPoints > points, `ch 9 (${thermoPoints}) should outweigh ch ${ch} (${points})`);
  }
});

test('every problem cites a section, has one unique hint, and matches the grader schema', async () => {
  const exam = await loadExam();
  const seen = new Map();
  const ids = new Set();
  for (const problem of exam.problems) {
    assert.ok(!ids.has(problem.id), `duplicate id ${problem.id}`);
    ids.add(problem.id);
    assert.deepEqual(validateProblem(problem), [], problem.id);
    assert.match(problem.openstax_section, SECTION, problem.id);
    assert.ok(problem.why.startsWith(problem.openstax_section), problem.id);
    assert.equal(problem.hints.length, 1, problem.id);
    const hint = problem.hints[0];
    assert.equal(typeof hint, 'string');
    assert.ok(hint.length > 0, problem.id);
    assert.ok(!seen.has(hint), `${problem.id} reuses a hint from ${seen.get(hint)}`);
    seen.set(hint, problem.id);
    if (problem.check.kind === 'numeric') {
      assert.equal(problem.check.tolerance, 0.5, problem.id);
      assert.equal(problem.check.sigFigs, 4, problem.id);
    }
  }
});

test('every key answer grades correct and a wrong answer fails', async () => {
  const exam = await loadExam();
  let checked = 0;
  for (const problem of exam.problems) {
    for (const input of keyInputs(problem)) {
      const result = grade(input, problem.check);
      assert.equal(result.ok, true, `${problem.id} rejected ${input}: ${result.reason || ''}`);
      if (problem.check.kind === 'numeric') {
        assert.equal(result.hint, undefined, `${problem.id} sig figs: ${input}`);
      }
      checked += 1;
    }
    const wrong = grade(wrongInput(problem), problem.check);
    assert.equal(wrong.ok, false, `${problem.id} accepted ${wrongInput(problem)}`);
  }
  assert.ok(checked >= exam.problems.length);
});

test('the strong-acid bonus accepts the six acids and rejects HClO3', async () => {
  const exam = await loadExam();
  const acids = exam.problems.find((problem) => problem.id === 'final-b01');
  assert.ok(acids);
  assert.equal(acids.bonus, true);
  assert.equal(acids.points, 30);
  const correct = grade('HCl, HBr, HI, HNO3, H2SO4, HClO4', acids.check);
  assert.equal(correct.ok, true);
  const swapped = grade('HCl, HBr, HI, HNO3, H2SO4, HClO3', acids.check);
  assert.equal(swapped.ok, false);
  assert.equal(swapped.reason, 'nearMiss');
});
