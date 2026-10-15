import { escapeHtml } from './html.js';
import { ensureBuilderCss, on, reducedFrom, restoreFocus } from './dom.js';
import { motionMode } from './motion.js';
import { missFeedback } from './feedback.js';
import {
  CALORIMETER_CHALLENGES,
  WATER_C,
  calorimeterSolution,
  challengeById,
  createCalorimeter,
  describeCalorimeter,
  gradeCalorimeter,
  heat,
  mixTemperature,
  thermometerFill,
} from './calorimeter.js';
import { formatMeasure } from './util.js';

function partFields(part, index) {
  return `
    <fieldset class="b-set">
      <legend>${escapeHtml(part.name)}</legend>
      <label class="b-field">Mass (g)
        <input type="number" min="1" max="500" step="1" value="${part.mass}" data-part="${index}" data-key="mass" data-focus="mass-${index}" aria-label="${escapeHtml(part.name)} mass in grams">
      </label>
      <label class="b-field">Temperature (°C)
        <input type="range" min="0" max="100" step="1" value="${part.temp}" data-part="${index}" data-key="temp" data-focus="temp-${index}" aria-label="${escapeHtml(part.name)} temperature in degrees Celsius" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${part.temp}">
      </label>
      <label class="b-field">Specific heat (J/g°C)
        <input type="number" min="0.1" max="5" step="0.001" value="${part.c}" data-part="${index}" data-key="c" data-focus="c-${index}" aria-label="${escapeHtml(part.name)} specific heat">
      </label>
    </fieldset>
  `;
}

export function renderCalorimeter(state, motion = 'still') {
  const finalTemp = mixTemperature(state.parts);
  const shown = state.showResult && finalTemp != null ? finalTemp : state.parts[0].temp;
  const fill = thermometerFill(shown);
  const mercury = 150 - fill * 120;
  const challenge = challengeById(state.challengeId);
  const challenges = CALORIMETER_CHALLENGES.map((item) => (
    `<option value="${item.id}" ${item.id === challenge.id ? 'selected' : ''}>${escapeHtml(item.id === 'metal' ? 'Metal in water' : 'Two samples of water')}</option>`
  )).join('');
  const readout = state.showResult && finalTemp != null
    ? `Final temperature ${formatMeasure(finalTemp, 2)} °C. ${state.parts.map((part) => `${part.name} q = ${formatMeasure(heat(part, finalTemp), 1)} J`).join('. ')}.`
    : 'Final temperature is hidden.';
  return `
    <section class="b-tool" data-builder="calorimeter" data-motion="${motion}">
      <h2>Coffee-cup calorimeter</h2>
      <p class="b-cite">OpenStax Chemistry: Atoms First 2e §9.2. Water’s specific heat starts at ${WATER_C} J/g°C.</p>
      <p id="cal-summary" class="b-summary" aria-live="polite">${escapeHtml(describeCalorimeter(state, motion))}</p>
      <div class="b-split">
        <svg class="b-svg" viewBox="0 0 320 220" role="img" aria-labelledby="cal-summary">
          <rect width="320" height="220" fill="#fffaf2" rx="16"/>
          <path d="M40 70 h70 v90 h-70 z" fill="#e7f3f1" stroke="#0f5c56" stroke-width="3"/>
          <path d="M150 70 h70 v90 h-70 z" fill="#fee2e2" stroke="#9a3412" stroke-width="3"/>
          <text x="75" y="180" text-anchor="middle" font-size="12" fill="#1c2430">${escapeHtml(state.parts[0].temp)}°C</text>
          <text x="185" y="180" text-anchor="middle" font-size="12" fill="#1c2430">${escapeHtml(state.parts[1].temp)}°C</text>
          <rect x="250" y="30" width="16" height="150" rx="8" fill="#e6e0d4" stroke="#1c2430"/>
          <rect data-mercury x="253" y="${mercury.toFixed(1)}" width="10" height="${(176 - mercury).toFixed(1)}" rx="5" fill="#e11d48"/>
          <text x="258" y="200" text-anchor="middle" font-size="12" fill="#5d675f">${motion === 'still' ? 'Still' : 'Moving'}</text>
        </svg>
        <div class="b-side">
          ${state.parts.map((part, index) => partFields(part, index)).join('')}
          <p class="b-equation" data-result>${escapeHtml(readout)}</p>
          <p class="b-fine">q = m c ΔT. Sliders and number boxes are the controls. Nothing here needs a drag.</p>
        </div>
      </div>
      <div class="b-controls">
        <label class="b-field">Challenge
          <select data-action="challenge" data-focus="challenge">${challenges}</select>
        </label>
        <p class="b-prompt">${escapeHtml(challenge.prompt)}</p>
        <label class="b-field">Predicted final temperature (°C)
          <input type="number" step="any" data-action="guess" data-focus="guess" value="${escapeHtml(state.guess)}" aria-label="Predicted final temperature in degrees Celsius">
        </label>
        <button type="button" data-action="check" data-focus="check">Check</button>
        <button type="button" data-action="toggle" data-focus="toggle" aria-pressed="${state.showResult ? 'true' : 'false'}">${state.showResult ? 'Hide mix result' : 'Show mix result'}</button>
      </div>
      <p class="b-msg" role="status" data-tone="${escapeHtml(state.tone)}">${escapeHtml(state.message || 'The cup on the left and the cup on the right mix. The thermometer shows where they meet.')}</p>
    </section>
  `;
}

function clampPart(key, value) {
  const number = Number(value);
  if (key === 'mass') return Math.min(500, Math.max(1, number || 1));
  if (key === 'temp') return Math.min(100, Math.max(0, number || 0));
  return Math.min(5, Math.max(0.1, number || 0.1));
}

export function mount(el, opts = {}) {
  ensureBuilderCss();
  const reduced = reducedFrom(opts);
  let state = createCalorimeter(opts.challenge || 'equal-water');
  state.playing = !reduced;
  let alive = true;
  let raf = 0;
  const stops = [];

  function mode() {
    return motionMode(reduced, state.playing && state.showResult);
  }

  function paint(focusId) {
    if (!alive) return;
    if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
    raf = 0;
    el.innerHTML = renderCalorimeter(state, mode());
    restoreFocus(el, focusId);
    if (mode() !== 'run' || typeof requestAnimationFrame !== 'function') return;
    const finalTemp = mixTemperature(state.parts);
    if (finalTemp == null) return;
    const start = performance.now?.() ?? 0;
    const from = state.parts[0].temp;
    const loop = (now) => {
      if (!alive || mode() !== 'run') return;
      const t = Math.min(1, ((now ?? start) - start) / 700);
      const shown = from + (finalTemp - from) * t;
      const mercury = el.querySelector('[data-mercury]');
      if (mercury) {
        const y = 150 - thermometerFill(shown) * 120;
        mercury.setAttribute('y', y.toFixed(1));
        mercury.setAttribute('height', (176 - y).toFixed(1));
      }
      if (t < 1) raf = requestAnimationFrame(loop);
      else {
        state = { ...state, playing: false };
        const summary = el.querySelector('#cal-summary');
        if (summary) summary.textContent = describeCalorimeter(state, 'still');
      }
    };
    raf = requestAnimationFrame(loop);
  }

  stops.push(on(el, 'input', (event) => {
    const index = event.target.getAttribute?.('data-part');
    const key = event.target.getAttribute?.('data-key');
    if (index == null || !key) return;
    const parts = state.parts.map((part, partIndex) => (
      partIndex === Number(index) ? { ...part, [key]: clampPart(key, event.target.value) } : part
    ));
    state = { ...state, parts, playing: !reduced, showResult: state.showResult };
    const finalTemp = mixTemperature(parts);
    const result = el.querySelector('[data-result]');
    if (result && state.showResult && finalTemp != null) {
      result.textContent = `Final temperature ${formatMeasure(finalTemp, 2)} °C. ${parts.map((part) => `${part.name} q = ${formatMeasure(heat(part, finalTemp), 1)} J`).join('. ')}.`;
    }
    const mercury = el.querySelector('[data-mercury]');
    if (mercury && state.showResult && finalTemp != null && reduced) {
      const y = 150 - thermometerFill(finalTemp) * 120;
      mercury.setAttribute('y', y.toFixed(1));
      mercury.setAttribute('height', (176 - y).toFixed(1));
    }
    event.target.setAttribute('aria-valuenow', event.target.value);
  }));

  stops.push(on(el, 'change', (event) => {
    const action = event.target.getAttribute?.('data-action');
    if (event.target.getAttribute?.('data-part')) {
      const summary = el.querySelector('#cal-summary');
      if (summary) summary.textContent = describeCalorimeter({ ...state, playing: false }, 'still');
    }
    if (action === 'guess') state = { ...state, guess: event.target.value };
    if (action === 'challenge') {
      state = { ...createCalorimeter(event.target.value), playing: !reduced };
      paint('challenge');
    }
  }));

  stops.push(on(el, 'click', (event) => {
    const target = event.target.closest?.('[data-action]');
    if (!target || !el.contains(target)) return;
    const action = target.getAttribute('data-action');
    if (action === 'toggle') {
      state = { ...state, showResult: !state.showResult, playing: !reduced && !state.showResult };
      paint('toggle');
    }
    if (action === 'check') {
      const result = gradeCalorimeter(state.guess, challengeById(state.challengeId));
      const feedback = missFeedback(result.ok, result.success, result.hints, state.misses);
      state = { ...state, message: feedback.message, tone: feedback.tone, misses: feedback.misses, revealed: feedback.reveal };
      paint('check');
    }
  }));

  paint();
  return {
    getState: () => state,
    destroy() {
      alive = false;
      if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
      for (const stop of stops) stop();
      el.replaceChildren?.();
    },
  };
}

export { calorimeterSolution };
