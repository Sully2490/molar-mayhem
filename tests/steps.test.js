import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { diagnose } from '../js/diagnose.js';
import { readProgress } from '../js/progress.js';
import {
  bindGuided,
  createSession,
  ctxFor,
  guidedInner,
  lastStepMatchesProblem,
  renderGuided,
  stepExpected,
  submitStep,
  PROBLEM_XP,
  STEP_XP,
} from '../js/steps/index.js';

const contentDir = new URL('../content/', import.meta.url);

function lessons() {
  const found = [];
  for (const folder of readdirSync(contentDir)) {
    const chapter = new URL(`${folder}/`, contentDir);
    let names;
    try {
      names = readdirSync(chapter);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.json') || name === 'index.json') continue;
      found.push(JSON.parse(readFileSync(new URL(name, chapter), 'utf8')));
    }
  }
  return found;
}

function guidedProblems() {
  const problems = [];
  for (const lesson of lessons()) {
    for (const problem of lesson.problems ?? []) {
      if (Array.isArray(problem.guided) && problem.guided.length > 0) {
        problems.push({ ch: lesson.ch, problem });
      }
    }
  }
  return problems;
}

test('guided-problem count stays at or above 60', () => {
  const count = guidedProblems().length;
  assert.ok(count >= 60, `guided-problem count dropped to ${count}`);
});

test('guided problems cover the chapter counts', () => {
  const problems = guidedProblems();
  const count = (ch) => problems.filter((item) => item.ch === ch).length;
  assert.ok(problems.length >= 60, `guided problems: ${problems.length}`);
  assert.ok(count(5) >= 20, `ch5: ${count(5)}`);
  assert.ok(count(7) >= 20, `ch7: ${count(7)}`);
  assert.ok(count(8) >= 10, `ch8: ${count(8)}`);
  assert.ok(count(9) >= 10, `ch9: ${count(9)}`);
});

test('every guided step grades, and the last step matches the problem', () => {
  for (const { problem } of guidedProblems()) {
    problem.guided.forEach((step, index) => {
      const expected = stepExpected(step);
      const result = grade(expected, step.check);
      assert.equal(result.ok, true, `${problem.id} step ${index + 1} (${expected})`);
    });
    const last = problem.guided[problem.guided.length - 1];
    const finalGrade = grade(stepExpected(last), problem.check);
    assert.equal(finalGrade.ok, true, `${problem.id} last step vs problem check`);
    if (problem.check.kind === 'numeric' && last.check?.kind === 'numeric') {
      assert.equal(lastStepMatchesProblem(problem), true, problem.id);
    }
  }
});

test('each chapter 5 guided problem stores an overcount', () => {
  for (const { ch, problem } of guidedProblems()) {
    if (ch !== 5) continue;
    assert.ok(
      problem.guided.some((step) => typeof step.overcount === 'string' && step.overcount.length > 0),
      problem.id,
    );
  }
});

test('each named mistake is a real miss and diagnoses to its own id', () => {
  for (const { problem } of guidedProblems()) {
    for (const mistake of problem.mistakes ?? []) {
      const graded = grade(mistake.wrong, problem.check);
      assert.equal(graded.ok, false, `${problem.id} ${mistake.id} graded as correct`);
      const found = diagnose(mistake.wrong, problem.check, problem.mistakes, {});
      assert.equal(found?.id, mistake.id, `${problem.id} ${mistake.id} diagnosed as ${found?.id}`);
    }
  }
});

function sampleProblem() {
  return {
    id: 'demo-guided',
    a: '4.000 g',
    why: 'Moles times molar mass.',
    check: { kind: 'numeric', value: 4, tolerance: 0.5, sigFigs: 4, unit: 'g' },
    mistakes: [{
      id: 'skip-moles',
      describe: 'You went straight from grams to grams. Convert to moles first.',
      wrong: '40 g',
      value: 40,
      unit: 'g',
    }],
    guided: [
      {
        prompt: 'How many grams is the product?',
        answer: '4.000 g',
        expected: '4.000 g',
        hint: 'Divide grams by molar mass.',
        unit: 'g',
        check: { kind: 'numeric', value: 4, tolerance: 0.5, sigFigs: 4, unit: 'g' },
      },
      {
        prompt: 'Write the same mass again to finish.',
        answer: '4.000 g',
        expected: '4.000 g',
        hint: 'Use the mass from the previous step.',
        unit: 'g',
        check: { kind: 'numeric', value: 4, tolerance: 0.5, sigFigs: 4, unit: 'g' },
      },
    ],
  };
}

test('a miss shows the hint, and the third miss reveals the next step', () => {
  const problem = sampleProblem();
  const session = createSession(problem);
  const first = submitStep(problem, session, '40 g');
  assert.equal(first.ok, false);
  assert.equal(first.attempt, 1);
  assert.equal(first.xp, STEP_XP);
  assert.match(first.feedback, /^Not yet\. Divide grams by molar mass\./);
  assert.equal(first.diagnosis.id, 'skip-moles');
  assert.match(first.feedback, /Convert to moles first/);

  submitStep(problem, session, '40 g');
  const third = submitStep(problem, session, '40 g');
  assert.equal(third.revealed, true);
  assert.equal(third.attempt, 3);
  assert.match(third.feedback, /Solution: 4\.000 g/);
  assert.equal(session.index, 1);
  assert.equal(session.revealedAny, true);

  const finish = submitStep(problem, session, '4.000 g');
  assert.equal(finish.finished, true);
  assert.equal(finish.xp, STEP_XP);
});

test('a right value with wrong sig figs does not spend a step try', () => {
  const problem = sampleProblem();
  problem.guided[0].why = 'Add 273.15 to the Celsius temperature. Do not multiply.';
  const session = createSession(problem);
  const loose = submitStep(problem, session, '4.0 g');
  assert.equal(loose.ok, false);
  assert.match(loose.feedback, /Check sig figs/);
  assert.equal(loose.revealed, false);
  assert.equal(session.misses, 0);
  assert.equal(session.index, 0);
  assert.equal(session.revealedAny, false);
  submitStep(problem, session, '4.0 g');
  submitStep(problem, session, '4.00 g');
  assert.equal(session.misses, 0);
  assert.equal(session.index, 0);
  const right = submitStep(problem, session, '4.000 g');
  assert.equal(right.ok, true);
  assert.match(right.feedback, /^Correct\. Add 273\.15 to the Celsius temperature\./);
  assert.doesNotMatch(right.feedback, /Do not multiply/);
  assert.equal(session.index, 1);
  assert.equal(session.misses, 0);
});

test('a clean finish awards problem XP and a revealed step does not', () => {
  const problem = sampleProblem();
  const clean = createSession(problem);
  assert.equal(submitStep(problem, clean, '4.000 g').xp, STEP_XP);
  const done = submitStep(problem, clean, '4.000 g');
  assert.equal(done.ok, true);
  assert.equal(done.finished, true);
  assert.equal(done.xp, PROBLEM_XP);
  assert.equal(done.diagnosis, null);

  const revealed = createSession(problem);
  submitStep(problem, revealed, '1 g');
  submitStep(problem, revealed, '1 g');
  submitStep(problem, revealed, '1 g');
  submitStep(problem, revealed, '4.000 g');
  assert.equal(revealed.finished, true);
  assert.equal(revealed.xpGiven, false);
});

test('ctxFor copies step fields used by diagnose', () => {
  const ctx = ctxFor(
    { id: 'p', ctx: { ratio: [1, 1] } },
    { overcount: 'sp3', ratio: [1, 2], coefficients: [5], check: { kind: 'exact' } },
  );
  assert.equal(ctx.overcount, 'sp3');
  assert.deepEqual(ctx.ratio, [1, 2]);
  assert.deepEqual(ctx.coefficients, [5]);
});

/**
 * Same shape of stub as tests/learn.test.js: a plain object with the few DOM
 * methods bindGuided calls. No DOM library.
 */
function mountGuided(problem) {
  const form = {
    dataset: {},
    html: guidedInner(problem, createSession(problem)),
    focused: null,
    prevented: false,
    listeners: {},
    input: null,
    matches(selector) {
      return selector === 'form.mm-guided';
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    requestSubmit() {
      this.listeners.submit?.({ preventDefault() {} });
    },
    querySelector(selector) {
      if (selector !== '.mm-guided-step[data-state="active"] input') return null;
      const step = this.html.match(/<li class="mm-guided-step" data-step="\d+" data-state="active">[\s\S]*?<\/li>/);
      const id = step?.[0].match(/<input id="([^"]+)"/)?.[1];
      if (!id) return null;
      if (this.input?.id === id && this.input.source === this.html) return this.input;
      const node = {
        id,
        tagName: 'INPUT',
        value: '',
        disabled: false,
        source: this.html,
        focus: () => {
          form.focused = id;
        },
      };
      this.input = node;
      return node;
    },
  };
  Object.defineProperty(form, 'innerHTML', {
    get() {
      return form.html;
    },
    set(value) {
      form.html = value;
      form.input = null;
    },
  });
  return form;
}

function enter(form, value) {
  const input = form.querySelector('.mm-guided-step[data-state="active"] input');
  input.value = value;
  form.listeners.keydown({
    key: 'Enter',
    target: input,
    preventDefault() {
      form.prevented = true;
    },
  });
}

test('the guided form reveals after three misses and focuses the next input', () => {
  const problem = sampleProblem();
  const html = renderGuided(problem);
  assert.match(html, /<label for="mm-step-input-demo-guided-0">Your answer \(g\)<\/label>/);
  assert.match(html, /inputmode="decimal"/);
  assert.match(html, /aria-describedby="mm-step-live-demo-guided-0"/);
  assert.match(html, /<p class="feedback" id="mm-step-live-demo-guided-0" aria-live="polite">/);
  assert.match(html, /Not open yet/);
  assert.match(html, /<button type="submit">Check<\/button>/);

  const memory = new Map();
  const storage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
  const form = mountGuided(problem);
  bindGuided(form, problem, { storage });

  enter(form, '40 g');
  assert.equal(form.prevented, true);
  assert.match(form.html, /Not yet\. Divide grams by molar mass\./);
  assert.match(form.html, /Convert to moles first/);
  assert.match(form.html, /data-step="0" data-state="active"/);

  enter(form, '40 g');
  enter(form, '40 g');
  assert.match(form.html, /data-step="0" data-state="revealed"/);
  assert.match(form.html, /Revealed\. Solution: 4\.000 g/);
  assert.match(form.html, /data-step="1" data-state="active"/);
  assert.equal(form.focused, 'mm-step-input-demo-guided-1');

  enter(form, '4.000 g');
  assert.match(form.html, /Final answer/);
  assert.match(form.html, /4\.000 g/);
  assert.match(form.html, /Practice points: \+0/);
  assert.equal(readProgress(storage).xp, 0);

  const cleanStore = {
    getItem: (key) => (memory.has(`clean:${key}`) ? memory.get(`clean:${key}`) : null),
    setItem: (key, value) => memory.set(`clean:${key}`, String(value)),
    removeItem: (key) => memory.delete(`clean:${key}`),
  };
  const clean = mountGuided(problem);
  bindGuided(clean, problem, { storage: cleanStore });
  enter(clean, '4.000 g');
  assert.equal(clean.focused, 'mm-step-input-demo-guided-1');
  enter(clean, '4.000 g');
  assert.match(clean.html, /Practice points: \+10/);
  assert.equal(readProgress(cleanStore).xp, PROBLEM_XP);
});

const MAIN_LESSON_HASHES = {
  'content/ch05/5a-hybridization.json': '89898cce77a7430a0ce4da5bf08dad7b04579bc28bd0b2d2bbb5192d717a0bf8',
  'content/ch05/5b-sigma-pi.json': '3765196db18303ee44c28947a7c5d357bd77db301e734dd0baf07ace67be4f1b',
  // Bond order is a plain decimal (1, 0.5, 2.5), not 4 significant figures.
  'content/ch05/5c-molecular-orbitals.json': 'd8496d1d3bac8ae0f7d31e19c3b3943c63ea0be077cc08fd650aa3b614ed96eb',
  'content/ch05/5d-multiple-bonds.json': 'd6090d826dc000757511d7abbb48e6f8ca2c6d48faa02b2fd9058c805dc70cff',
  'content/ch07/7-1-balancing.json': '9359e2096a912cec2ed39cf625cfeab679499b66c6aac08a54fb87f0e4907e52',
  'content/ch07/7-2-classifying.json': '5df23d01ad75b0a0f5a1deba191db4f61e95b0cd8290325bdd27b9109f70c32c',
  'content/ch07/7-3-stoichiometry.json': 'e04ac5e74f5ff9a7f8c2f6b3bd627479078f0e884d82194dd3ff5dbc5986cb97',
  // Intentional change from main: ch07-limit-hydrogen explains
  // "20.00 / 28.014 = 0.7139 mol, which needs 2.142 mol of H2."
  'content/ch07/7-4-yields.json': '8704f001534a18062191f6eb00cbd35f0a5f0b4ef9dc335462523768843bb91a',
  // mL-to-L note is inside mistakes, so this lesson hash stays the same.
  'content/ch07/7-5-analysis.json': '5352245ba29f87c0c16614ff7e87620000333d8c8f8319faba7ffd531a70364f',
  // Strong-base hint: Ca, Sr, and Ba hydroxides dissolve only slightly.
  'content/ch07/cards.json': 'e14b536ce76126830d7ff664fb5538c883c4a379a9faf9b44798898218cfd263',
  'content/ch08/8.1-pressure.json': '987c09b57fbc4be5b5ea89f6a0a98bdb49265238bad50ecac93e05a6009e4aa6',
  // AgCl and He mL-to-L notes live in mistakes, so these lesson hashes stay put.
  'content/ch08/8.2-ideal-gas.json': '9fd704a5bf78b23cb57a13186f773216d43cac828c5fd4d27a79e3e7d4fb9118',
  'content/ch08/8.3-mixtures.json': '92e67bcb1719184db633437517c61b3d2dcda3448d55f7406e0323f30fcf1a04',
  'content/ch08/8.4-effusion.json': 'f102db3dc84f80f0a1491a553a6fdf80b5af6381c9a654c1873c55ed3318a750',
  'content/ch08/8.5-kinetic.json': '8cfbf051ac3f2ac70e6d33140a30d9c5465682dfd1c16919a642f03be58b5adf',
  'content/ch08/8.6-real-gases.json': 'a31e57ab0a281bbb3a75c3b48c99b526ccbb44e9dca0ce2961dca2280268642f',
  'content/ch09/9-1-energy.json': 'b697709eab59a0b87e82a538833b174e6d4df81e425abf3a697be9554645f643',
  'content/ch09/9-2-calorimetry.json': '9529f63342c142823281e90cb5efe66a45ae9299aabfdbdc245b617cb8d7b80e',
  'content/ch09/9-3-enthalpy.json': '4bde59f4d86c91d7c075c8c83bed85ec51c1c9691f5426f8c1300f834a784001',
  'content/ch09/9-4-bonds.json': '196d694a172e2d411d9876172d127fcaaf2a69e1126d106446fea266768cb1b3',
};

test('section 7.4 guided steps show 0.7139 mol N2 and 2.142 mol H2 needed', () => {
  const lesson = JSON.parse(readFileSync(new URL('../content/ch07/7-4-yields.json', import.meta.url), 'utf8'));
  const problem = lesson.problems.find((item) => item.id === 'ch07-limit-hydrogen');
  const nitrogen = problem.guided[0];
  const needed = problem.guided[2];
  assert.match(nitrogen.prompt, /moles of N2/);
  assert.equal(nitrogen.answer, '0.7139 mol');
  assert.equal(nitrogen.expected, '0.7139 mol');
  assert.equal(nitrogen.check.value, 0.7139);
  assert.equal(grade(nitrogen.answer, nitrogen.check).ok, true);
  assert.match(needed.prompt, /moles of H2 does that N2 need/);
  assert.equal(needed.answer, '2.142 mol');
  assert.equal(needed.expected, '2.142 mol');
  assert.equal(needed.check.value, 2.142);
  assert.equal(grade(needed.answer, needed.check).ok, true);
  assert.match(problem.why, /20\.00 \/ 28\.014 = 0\.7139 mol, which needs 2\.142 mol of H2/);
});

test('AgCl and helium notes say the mistake is skipping the mL to L conversion', () => {
  const analysis = JSON.parse(readFileSync(new URL('../content/ch07/7-5-analysis.json', import.meta.url), 'utf8'));
  const gas = JSON.parse(readFileSync(new URL('../content/ch08/8.2-ideal-gas.json', import.meta.url), 'utf8'));
  const chloride = analysis.problems.find((item) => item.id === 'ch07-grav-chloride');
  const helium = gas.problems.find((item) => item.id === '8.2-16');
  for (const problem of [chloride, helium]) {
    assert.equal(problem.mistakes[0].describe, 'The mistake is skipping the mL to L conversion.');
  }
});

function stepHtml(check) {
  return renderGuided({
    id: 'keypad',
    a: '1',
    why: 'Shown.',
    guided: [{ prompt: 'Type the value.', answer: '1', hint: 'Use the keypad that fits.', check }],
  });
}

test('step inputs use keypadFor and keep a full keyboard for signed and scientific answers', () => {
  const plain = stepHtml({ kind: 'numeric', value: 59.41, unit: 'g' });
  assert.match(plain, /autocomplete="off"/);
  assert.match(plain, /autocapitalize="off"/);
  assert.match(plain, /spellcheck="false"/);
  assert.match(plain, /inputmode="decimal"/);

  for (const check of [
    { kind: 'numeric', value: -29.67, unit: 'kJ' },
    { kind: 'numeric', value: 4.307e-19, unit: 'J' },
    { kind: 'numeric', value: 1e6, unit: 'J' },
    { kind: 'exact', text: 'H2', case: 'sensitive' },
  ]) {
    const html = stepHtml(check);
    assert.match(html, /autocapitalize="off"/);
    assert.match(html, /spellcheck="false"/);
    assert.equal(/<input[^>]*inputmode=/.test(html), false, JSON.stringify(check));
  }
});

test('chapter 5, 7, 8, and 9 keep every existing answer, check, and value', () => {
  for (const [rel, expected] of Object.entries(MAIN_LESSON_HASHES)) {
    const lesson = JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
    for (const problem of lesson.problems ?? []) {
      delete problem.guided;
      delete problem.mistakes;
    }
    const hash = createHash('sha256').update(JSON.stringify(lesson)).digest('hex');
    assert.equal(hash, expected, `${rel} changed more than guided and mistakes since main e57d6a9, apart from the noted 0.7139 mol N2 explanation and the strong-base hint`);
  }
});

test('step controls meet the tap-target size in CSS', () => {
  const css = readFileSync(new URL('../css/steps/steps.css', import.meta.url), 'utf8');
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
