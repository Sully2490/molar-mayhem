import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { diagnose } from '../js/diagnose.js';
import { readProgress } from '../js/progress.js';
import {
  bindGuided,
  createSession,
  ctxFor,
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
      if (!name.endsWith('.json')) continue;
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

test('the guided form reveals after three misses and focuses the next input', async () => {
  const { JSDOM } = await import('jsdom');
  const problem = sampleProblem();
  const dom = new JSDOM(`<!doctype html><html><body>${renderGuided(problem)}</body></html>`, {
    pretendToBeVisual: true,
  });
  const { document, HTMLElement } = dom.window;
  if (HTMLElement.prototype.focus && !document.activeElement) {
    document.documentElement.tabIndex = 0;
  }
  const memory = new Map();
  const storage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
  bindGuided(document.body, problem, { storage });

  const active = () => document.querySelector('.mm-guided-step[data-state="active"] input');
  const field = active();
  assert.equal(field.getAttribute('inputmode'), 'decimal');
  assert.ok(field.labels?.[0] || document.querySelector(`label[for="${field.id}"]`));
  const label = document.querySelector(`label[for="${field.id}"]`);
  assert.match(label.textContent, /Your answer \(g\)/);
  const live = document.getElementById(field.getAttribute('aria-describedby'));
  assert.equal(live.classList.contains('feedback'), true);
  assert.equal(live.getAttribute('aria-live'), 'polite');
  assert.match(document.querySelector('.mm-guided-step[data-step="1"]').textContent, /Not open yet/);

  function enter(value) {
    const input = active();
    input.value = value;
    input.focus();
    input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));
  }

  enter('40 g');
  const pending = document.querySelector('.mm-guided-step[data-state="active"] .feedback');
  assert.match(pending.textContent, /Divide grams by molar mass/);
  assert.match(pending.textContent, /Convert to moles first/);

  enter('40 g');
  enter('40 g');

  const first = document.querySelector('.mm-guided-step[data-step="0"]');
  assert.equal(first.dataset.state, 'revealed');
  assert.match(first.textContent, /Revealed/);
  assert.match(first.textContent, /Solution: 4\.000 g/);
  const next = active();
  assert.equal(next.id, 'mm-step-input-demo-guided-1');
  assert.equal(document.activeElement, next);

  enter('4.000 g');
  assert.match(document.querySelector('.mm-guided-final').textContent, /Final answer/);
  assert.match(document.querySelector('.mm-guided-final').textContent, /4\.000 g/);
  assert.match(document.querySelector('.mm-guided-xp').textContent, /\+0/);
  assert.equal(readProgress(storage).xp, 0);

  const cleanDom = new JSDOM(`<!doctype html><html><body>${renderGuided(problem)}</body></html>`, {
    pretendToBeVisual: true,
  });
  const cleanStore = {
    getItem: (key) => (memory.has(`clean:${key}`) ? memory.get(`clean:${key}`) : null),
    setItem: (key, value) => memory.set(`clean:${key}`, String(value)),
    removeItem: (key) => memory.delete(`clean:${key}`),
  };
  bindGuided(cleanDom.window.document.body, problem, { storage: cleanStore });
  const cleanActive = () => cleanDom.window.document.querySelector('.mm-guided-step[data-state="active"] input');
  for (const value of ['4.000 g', '4.000 g']) {
    const input = cleanActive();
    input.value = value;
    input.closest('form').querySelector('button[type="submit"]').click();
  }
  assert.match(cleanDom.window.document.querySelector('.mm-guided-xp').textContent, /\+10/);
  assert.equal(readProgress(cleanStore).xp, PROBLEM_XP);
});

test('step controls meet the tap-target size in CSS', () => {
  const css = readFileSync(new URL('../css/steps/steps.css', import.meta.url), 'utf8');
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
