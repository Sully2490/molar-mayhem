import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { grade } from '../js/grade.js';
import { validateProblem } from '../js/schema.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../content/final');
const index = JSON.parse(readFileSync(path.join(dir, 'index.json'), 'utf8'));

function loadProblems() {
  const problems = [];
  for (const name of index) {
    const data = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
    const list = Array.isArray(data) ? data : data.problems;
    assert.ok(Array.isArray(list), name);
    problems.push(...list);
  }
  return problems;
}

const problems = loadProblems();

test('the practice final lists only files in content/final', () => {
  const files = new Set(readdirSync(dir));
  assert.ok(files.has('index.json'));
  for (const name of index) assert.ok(files.has(name), name);
  assert.equal(problems.length > 0, true);
});

test('chapters 5 and 7 outweigh every other chapter', () => {
  const counts = new Map();
  for (const problem of problems) counts.set(problem.ch, (counts.get(problem.ch) ?? 0) + 1);
  for (let ch = 1; ch <= 9; ch += 1) assert.ok(counts.get(ch) >= 1, `chapter ${ch}`);
  for (const ch of [1, 2, 3, 4, 6, 8, 9]) {
    assert.ok(counts.get(5) > counts.get(ch), `chapter 5 vs ${ch}`);
    assert.ok(counts.get(7) > counts.get(ch), `chapter 7 vs ${ch}`);
  }
});

test('every final key matches the chapter problem schema and grades correct', () => {
  const ids = new Set();
  for (const problem of problems) {
    assert.deepEqual(validateProblem(problem), [], problem.id);
    assert.equal(ids.has(problem.id), false, problem.id);
    ids.add(problem.id);
    assert.equal(Number.isInteger(problem.ch), true, problem.id);
    assert.equal(grade(problem.a, problem.check).ok, true, problem.id);
    assert.equal(grade('', problem.check).ok, false, problem.id);
  }
});
