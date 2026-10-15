import { bindSharedKeypad } from '../chemkb/keyboard.js';
import { keypadFor } from '../learn.js';
import { renderMath } from '../math/render.js';
import { awardXp, readProgress, writeProgress } from '../progress.js';
import {
  PROBLEM_XP,
  createSession,
  stepExpected,
  submitStep,
  xpFor,
} from './engine.js';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function labelFor(step) {
  const unit = step.unit || (typeof step.check?.unit === 'string' ? step.check.unit : '');
  return unit ? `Your answer (${unit})` : 'Your answer';
}

function stepState(session, index) {
  if (session.correct[index]) return 'correct';
  if (session.revealed[index]) return 'revealed';
  if (index === session.index && !session.finished) return 'active';
  return 'locked';
}

function stepBody(problem, session, step, index) {
  const state = stepState(session, index);
  const promptId = `mm-step-prompt-${problem.id}-${index}`;
  const inputId = `mm-step-input-${problem.id}-${index}`;
  const liveId = `mm-step-live-${problem.id}-${index}`;
  const expected = stepExpected(step);
  const note = session.notes?.[index] ?? '';
  let controls = '';
  if (state === 'active') {
    controls = `
      <label for="${inputId}">${escapeHtml(labelFor(step))}</label>
      <input id="${inputId}" name="answer" autocomplete="off" autocapitalize="off" spellcheck="false"${keypadFor(step)} aria-describedby="${liveId}">
      <button type="submit">Check</button>
      <p class="feedback" id="${liveId}" aria-live="polite">${renderMath(note)}</p>
    `;
  } else if (state === 'correct' || state === 'revealed') {
    const text = note || (state === 'correct' ? `Correct. ${expected}` : `Revealed. Solution: ${expected}`);
    controls = `<p class="feedback mm-guided-result" id="${liveId}" aria-live="polite">${renderMath(text)}</p>`;
  } else {
    controls = `<p class="mm-guided-result">Not open yet.</p>`;
  }
  return `
    <li class="mm-guided-step" data-step="${index}" data-state="${state}">
      <p class="mm-guided-prompt" id="${promptId}">Step ${index + 1}. ${renderMath(step.prompt)}</p>
      ${controls}
    </li>
  `;
}

function finalBlock(problem, session) {
  if (!session.finished) return '';
  const points = xpFor(session);
  const pointsText = points === PROBLEM_XP
    ? `Practice points: +${points}.`
    : 'Practice points: +0. A revealed step does not add points.';
  return `
    <section class="mm-guided-final">
      <h3>Final answer</h3>
      <p>${renderMath(problem.a)}</p>
      <p>${renderMath(problem.why)}</p>
      <p class="mm-guided-xp">${pointsText}</p>
    </section>
  `;
}

export function guidedInner(problem, session) {
  const steps = problem.guided ?? [];
  const items = steps.map((step, index) => stepBody(problem, session, step, index)).join('');
  return `<ol class="mm-guided-list">${items}</ol>${finalBlock(problem, session)}`;
}

export function renderGuided(problem) {
  const session = createSession(problem);
  return `
    <form class="mm-guided" data-problem="${escapeHtml(problem.id)}" novalidate>
      ${guidedInner(problem, session)}
    </form>
  `;
}

function storageOf(options) {
  if (!options || options.storage === null) return null;
  if (options.storage) return options.storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function award(session, storage) {
  const points = xpFor(session);
  if (points <= 0 || session.xpGiven || !storage) return;
  session.xpGiven = true;
  writeProgress(awardXp(readProgress(storage), points), storage);
}

/**
 * Bind one guided form. Enter in the active field submits.
 * Focus moves to the next step after a reveal or a correct check.
 */
export function bindGuided(root, problem, options = {}) {
  const form = root?.matches?.('form.mm-guided') ? root : root.querySelector('form.mm-guided');
  if (!form || form.dataset.bound === 'true') return form;
  form.dataset.bound = 'true';
  const session = createSession(problem);
  const storage = storageOf(options);

  function paint(moveFocus) {
    form.innerHTML = guidedInner(problem, session);
    bindSharedKeypad(form);
    if (!moveFocus) return;
    form.querySelector('.mm-guided-step[data-state="active"] input')?.focus();
  }

  function apply(input) {
    const before = session.index;
    const outcome = submitStep(problem, session, input);
    if (outcome.revealed) session.notes[before] = `Revealed. ${outcome.feedback}`;
    else session.notes[before] = outcome.feedback;
    if (outcome.finished) award(session, storage);
    paint((outcome.ok || outcome.revealed) && !outcome.finished);
    return outcome;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const field = form.querySelector('.mm-guided-step[data-state="active"] input');
    if (!field || field.disabled) return;
    apply(field.value);
  });

  form.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    if (event.target?.tagName !== 'INPUT') return;
    event.preventDefault();
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  return form;
}
