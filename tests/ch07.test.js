import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content', 'ch07');

// OpenStax Chemistry: Atoms First 2e, Chapter 7 outline.
// Chemistry 2e puts this material in Chapter 4, so those section numbers are not used.
const AF2E_CH7 = new Map([
  ['OpenStax AF2e §7.1', 'Writing and Balancing Chemical Equations'],
  ['OpenStax AF2e §7.2', 'Classifying Chemical Reactions'],
  ['OpenStax AF2e §7.3', 'Reaction Stoichiometry'],
  ['OpenStax AF2e §7.4', 'Reaction Yields'],
  ['OpenStax AF2e §7.5', 'Quantitative Chemical Analysis'],
]);

const STRONG_ACIDS = ['HCl', 'HBr', 'HI', 'HNO3', 'H2SO4', 'HClO4'];
const WEAK_ACIDS = ['HF', 'CH3COOH', 'H2CO3', 'H3PO4'];
const STRONG_BASES = ['LiOH', 'NaOH', 'KOH', 'RbOH', 'CsOH', 'Ca(OH)2', 'Sr(OH)2', 'Ba(OH)2'];

async function loadLessons() {
  const names = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  const lessons = [];
  for (const name of names) {
    const lesson = JSON.parse(await readFile(path.join(dir, name), 'utf8'));
    lessons.push({ name, lesson });
  }
  return lessons;
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
  if (check.kind === 'set') return 'NaCl';
  return 'not-the-answer';
}

function hasElementSymbol(text) {
  return /[A-Z]/.test(text);
}

test('chapter 7 cites only Atoms First 2e sections 7.1 through 7.5', async () => {
  const lessons = await loadLessons();
  assert.ok(lessons.length >= 6);
  const cited = new Set();
  for (const { name, lesson } of lessons) {
    assert.equal(lesson.ch, 7, name);
    assert.ok(AF2E_CH7.has(lesson.openstax_section), `${name} cites ${lesson.openstax_section}`);
    assert.ok(lesson.sources.includes(lesson.openstax_section), name);
    cited.add(lesson.openstax_section);
    assert.deepEqual(validateLesson(lesson), [], name);
    assert.ok(lesson.problems.length >= 10, `${name} has ${lesson.problems.length} problems`);
  }
  for (const section of AF2E_CH7.keys()) {
    assert.ok(cited.has(section), `missing ${section}`);
  }
});

test('every hint is specific to one problem', async () => {
  const lessons = await loadLessons();
  const seen = new Map();
  for (const { name, lesson } of lessons) {
    const similar = lesson.similar_problem.hint;
    assert.equal(typeof similar, 'string');
    assert.ok(similar.length > 0, name);
    assert.ok(!seen.has(similar), `reused hint: ${similar}`);
    seen.set(similar, `${name} similar`);
    for (const problem of lesson.problems) {
      assert.equal(problem.hints.length, 1, problem.id);
      const hint = problem.hints[0];
      assert.equal(typeof hint, 'string');
      assert.ok(hint.length > 0, problem.id);
      assert.ok(!seen.has(hint), `${problem.id} reuses a hint from ${seen.get(hint)}`);
      seen.set(hint, problem.id);
    }
  }
});

test('every key answer grades correct and a wrong answer fails', async () => {
  const lessons = await loadLessons();
  let checked = 0;
  for (const { lesson } of lessons) {
    for (const problem of lesson.problems) {
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
      const accepted = keyInputs(problem).map((input) => {
        const rule = problem.check.case ?? (problem.check.kind === 'set' ? 'formula' : 'insensitive');
        return rule === 'insensitive' ? input.toLowerCase() : input;
      });
      if (problem.check.kind !== 'numeric') {
        assert.ok(!accepted.includes(wrongInput(problem).toLowerCase()) || problem.check.case === 'sensitive');
      }
    }
  }
  assert.ok(checked > 80);
});

test('formula and element-symbol answers are case sensitive', async () => {
  const lessons = await loadLessons();
  for (const { lesson } of lessons) {
    for (const problem of lesson.problems) {
      const check = problem.check;
      if (check.kind !== 'exact' && check.kind !== 'set') continue;
      const texts = [check.text, ...(check.answers ?? [])].filter((item) => typeof item === 'string');
      if (texts.some(hasElementSymbol)) {
        assert.equal(check.case, 'sensitive', problem.id);
      }
    }
  }
  const hydrochloric = (await loadLessons())
    .flatMap(({ lesson }) => lesson.problems)
    .find((problem) => problem.id === 'ch07-cards-formula-hcl');
  assert.equal(grade('hcl', hydrochloric.check).ok, false);
  assert.equal(grade('HCl', hydrochloric.check).ok, true);
});

test('each topic cites the Atoms First 2e section that teaches it', async () => {
  const lessons = await loadLessons();
  const byId = new Map();
  for (const { lesson } of lessons) {
    for (const problem of lesson.problems) byId.set(problem.id, lesson.openstax_section);
  }
  const expectSection = (id, section) => {
    assert.equal(byId.get(id), section, id);
  };
  // §7.1 is molecular, complete ionic, and net ionic equations. Solubility rules are Table 7.1 in §7.2.
  for (const id of ['ch07-net-silver-chloride', 'ch07-spectators-barium-sulfate', 'ch07-net-strong-neutralization', 'ch07-net-zinc-copper', 'ch07-balance-chlorate']) {
    expectSection(id, 'OpenStax AF2e §7.1');
  }
  for (const id of ['ch07-precip-lead-iodide', 'ch07-no-precipitate', 'ch07-precip-calcium-carbonate', 'ch07-class-precip', 'ch07-ox-sulfur', 'ch07-class-hf', 'ch07-permanganate-protons']) {
    expectSection(id, 'OpenStax AF2e §7.2');
  }
  // §7.3 includes solution molarity when both amounts are known. Limiting reactant is a §7.4 objective.
  for (const id of ['ch07-stoich-water-4', 'ch07-vol-sulfuric', 'ch07-vol-lime', 'ch07-vol-barium', 'ch07-vol-oxalic', 'ch07-stoich-limewater-acid']) {
    expectSection(id, 'OpenStax AF2e §7.3');
  }
  for (const id of ['ch07-limit-nitrogen', 'ch07-yield-ammonia-percent', 'ch07-excess-ethanol']) {
    expectSection(id, 'OpenStax AF2e §7.4');
  }
  // §7.5 is an unknown analyte concentration or a percent from a weighed precipitate.
  for (const id of ['ch07-titrate-hcl', 'ch07-titrate-sulfuric', 'ch07-grav-chloride', 'ch07-grav-chloride-small', 'ch07-vinegar', 'ch07-grav-sulfur']) {
    expectSection(id, 'OpenStax AF2e §7.5');
  }
  const balance = lessons.find(({ lesson }) => lesson.id === 'ch07-balance').lesson;
  assert.doesNotMatch(balance.steps.join(' '), /Solubility shortcuts|Ag\+/);
  const classify = lessons.find(({ lesson }) => lesson.id === 'ch07-classify').lesson;
  assert.match(classify.steps.join(' '), /Ag\+/);
});

test('strong-acid cards use the set check and flag HClO3', async () => {
  const lessons = await loadLessons();
  const cards = lessons.find(({ lesson }) => lesson.id === 'ch07-cards').lesson;
  assert.equal(cards.openstax_section, 'OpenStax AF2e §7.2');
  assert.match(cards.steps.join(' '), /Every other acid is weak/);
  const strong = cards.problems.find((problem) => problem.id === 'ch07-cards-strong-acids');
  assert.equal(strong.check.kind, 'set');
  assert.equal(strong.check.case, 'sensitive');
  assert.deepEqual([...strong.check.answers].sort(), [...STRONG_ACIDS].sort());
  const near = strong.check.nearMiss.find((entry) => entry.text === 'HClO3');
  assert.ok(near);
  assert.match(near.hint, /HClO4/);
  assert.equal(grade(STRONG_ACIDS.join(', '), strong.check).ok, true);
  const swapped = grade('HCl, HBr, HI, HNO3, H2SO4, HClO3', strong.check);
  assert.equal(swapped.ok, false);
  assert.equal(swapped.reason, 'nearMiss');
  assert.equal(grade('NaCl, H2O', strong.check).ok, false);

  for (const formula of WEAK_ACIDS) {
    const problem = cards.problems.find((item) => item.id === `ch07-cards-${formula.toLowerCase()}`);
    assert.ok(problem, formula);
    assert.equal(problem.a, 'weak');
    assert.equal(grade('weak', problem.check).ok, true);
    assert.equal(grade('strong', problem.check).ok, false);
  }

  const bases = cards.problems.find((problem) => problem.id === 'ch07-cards-strong-bases');
  assert.equal(bases.check.kind, 'set');
  assert.equal(bases.check.case, 'sensitive');
  assert.deepEqual([...bases.check.answers].sort(), [...STRONG_BASES].sort());
  assert.equal(grade(STRONG_BASES.join(', '), bases.check).ok, true);
  assert.equal(grade('NaOH, KOH', bases.check).ok, false);
  const magnesium = grade([...STRONG_BASES, 'Mg(OH)2'].join(', '), bases.check);
  assert.equal(magnesium.ok, false);
  assert.equal(magnesium.reason, 'nearMiss');
});
