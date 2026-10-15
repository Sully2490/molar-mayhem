import { toastHtml } from './celebrate.js';
import { renderDrillQueue } from './drills.js';
import { grade } from './grade.js';
import { keypadFor } from './learn.js';

export const ATTEMPTS = 3;

export const UNIT_PROBLEMS = [
  {
    id: 'i1-gold',
    q: 'Gold has a density of 19.3 g/cm³. What is the mass of 2.50 cm³?',
    a: '48.3 g',
    why: 'Mass = 19.3 g/cm³ × 2.50 cm³ = 48.3 g.',
    hints: ['Multiply density by volume.'],
    check: { kind: 'numeric', value: 48.3, sigFigs: 3, unit: 'g' },
  },
  {
    id: 'i1-ethanol',
    q: 'Ethanol has a density of 0.789 g/mL. What volume holds 50.0 g?',
    a: '63.4 mL',
    why: 'Volume = 50.0 g / 0.789 g/mL = 63.4 mL.',
    hints: ['Divide mass by density.'],
    check: { kind: 'numeric', value: 63.4, sigFigs: 3, unit: 'mL' },
  },
];

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function feedbackForUnit(result, attempt, problem) {
  if (result.ok && result.hint) {
    return { done: true, status: 'sig', text: result.hint };
  }
  if (result.ok) return { done: true, status: 'correct', text: 'Correct.' };
  if (attempt >= ATTEMPTS) {
    return { done: true, status: 'solution', text: `Solution: ${problem.a}. ${problem.why}` };
  }
  if (result.reason === 'unit') {
    return {
      done: false,
      status: 'unit',
      text: `The unit does not match. This answer uses ${problem.check.unit}.`,
    };
  }
  if (result.reason === 'tolerance') {
    return { done: false, status: 'miss', text: `Not yet. ${problem.hints[0]}` };
  }
  return { done: false, status: 'miss', text: 'Not yet. Type the number in Value and the unit in Unit.' };
}

export function renderDrill(item) {
  const forms = UNIT_PROBLEMS.map(renderProblem).join('');
  const queue = item === undefined ? '' : renderDrillQueue(item);
  return `<section class="page" data-route="Drill"><h1>Drill</h1><p>Type the number and the unit in separate boxes.</p>${forms}${queue}${toastHtml()}</section>`;
}

function renderProblem(problem) {
  const valueId = `value-${problem.id}`;
  const unitId = `unit-${problem.id}`;
  const liveId = `live-${problem.id}`;
  return `
    <form class="problem" data-unit-problem="${escapeHtml(problem.id)}">
      <p id="q-${escapeHtml(problem.id)}">${escapeHtml(problem.q)}</p>
      <div class="answer-row">
        <div class="answer-field">
          <label class="answer-label" for="${valueId}">Value</label>
          <input id="${valueId}" name="value" autocomplete="off" autocapitalize="off" spellcheck="false"${keypadFor(problem)} aria-describedby="${liveId}">
        </div>
        <div class="answer-field">
          <label class="answer-label" for="${unitId}">Unit</label>
          <input id="${unitId}" name="unit" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="${liveId}">
        </div>
        <button type="submit">Check</button>
      </div>
      <p class="feedback" id="${liveId}" aria-live="polite"></p>
    </form>
  `;
}

const unitBound = new WeakSet();

export function bindUnitEntry(root, problems = UNIT_PROBLEMS) {
  if (unitBound.has(root)) return;
  unitBound.add(root);
  const attempts = new Map();
  root.addEventListener('submit', (event) => {
    const form = event.target.closest?.('[data-unit-problem]');
    if (!form) return;
    event.preventDefault();
    const id = form.getAttribute('data-unit-problem');
    const problem = problems.find((item) => item.id === id);
    if (!problem) return;
    const used = attempts.get(id) ?? 0;
    if (used >= ATTEMPTS) return;
    const value = form.querySelector('[name="value"]');
    const unit = form.querySelector('[name="unit"]');
    const live = form.querySelector('.feedback');
    const result = grade(`${value.value} ${unit.value}`.trim(), problem.check);
    const next = result.ok ? used : used + 1;
    if (!result.ok) attempts.set(id, next);
    const message = feedbackForUnit(result, next, problem);
    live.dataset.status = message.status;
    live.textContent = message.text;
    if (message.done) {
      value.disabled = true;
      unit.disabled = true;
    }
  });
}
