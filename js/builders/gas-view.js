import { escapeHtml } from './html.js';
import { ensureBuilderCss, on, reducedFrom, restoreFocus } from './dom.js';
import { motionMode } from './motion.js';
import { missFeedback } from './feedback.js';
import {
  GAS_CHALLENGES,
  GAS_KEYS,
  GAS_RANGE,
  challengeById,
  clampGas,
  createGas,
  describeGas,
  equationText,
  gasParticles,
  gradeGas,
  particleCount,
  pistonY,
  temperatureColor,
} from './gas.js';

function slider(key, value) {
  const range = GAS_RANGE[key];
  const id = `gas-${key}`;
  return `
    <label class="b-field" for="${id}">${range.label} (${range.unit}) <b data-readout="${key}">${value}</b>
      <input id="${id}" type="range" min="${range.min}" max="${range.max}" step="${range.step}" value="${value}" data-gas="${key}" data-focus="range-${key}" aria-valuemin="${range.min}" aria-valuemax="${range.max}" aria-valuenow="${value}" aria-label="${range.label} in ${range.unit}">
      <input type="number" min="${range.min}" max="${range.max}" step="${range.step}" value="${value}" data-gas="${key}" data-focus="num-${key}" aria-label="${range.label} number in ${range.unit}">
    </label>
  `;
}

export function renderGas(state, motion = 'still') {
  const { P, V, T, n } = state.values;
  const challenge = challengeById(state.challengeId);
  const y = pistonY(V);
  const bounds = { left: 108, right: 212, top: Math.min(y + 20, 180), bottom: 190 };
  const dots = gasParticles(particleCount(n), bounds, motion === 'still' ? 0 : state.phase);
  const challenges = GAS_CHALLENGES.map((item) => (
    `<option value="${item.id}" ${item.id === challenge.id ? 'selected' : ''}>${escapeHtml(item.prompt.slice(0, 42))}…</option>`
  )).join('');
  const particles = dots.map((dot, index) => (
    `<circle data-particle="${index}" cx="${dot.x.toFixed(1)}" cy="${dot.y.toFixed(1)}" r="6" fill="${temperatureColor(T)}"/>`
  )).join('');
  return `
    <section class="b-tool" data-builder="gas" data-motion="${motion}">
      <h2>Gas-law piston</h2>
      <p class="b-cite">OpenStax Chemistry: Atoms First 2e §8.2. Ideal gas, R = 0.08206 L·atm/(mol·K).</p>
      <p id="gas-summary" class="b-summary" aria-live="polite">${escapeHtml(describeGas(state, motion))}</p>
      <div class="b-controls">
        ${GAS_KEYS.map((key) => slider(key, state.values[key])).join('')}
      </div>
      <p class="b-equation" data-equation>${escapeHtml(equationText(state.values))}</p>
      <svg class="b-svg" data-piston viewBox="0 0 320 220" role="img" aria-labelledby="gas-summary">
        <rect width="320" height="220" fill="#fffaf2" rx="16"/>
        <rect x="96" y="24" width="128" height="176" fill="#e7f3f1" stroke="#0f5c56" stroke-width="3" rx="6"/>
        ${particles}
        <rect data-handle x="90" y="${y.toFixed(1)}" width="140" height="16" rx="4" fill="#0f5c56"/>
        <text x="160" y="210" text-anchor="middle" font-size="12" fill="#5d675f">${motion === 'still' ? 'Still frame' : 'Moving'}</text>
      </svg>
      <p class="b-fine">Drag the dark piston handle to change volume. The volume slider and number box do the same thing from the keyboard.</p>
      <div class="b-controls">
        <label class="b-field">Challenge
          <select data-action="challenge" data-focus="challenge">${challenges}</select>
        </label>
        <p class="b-prompt">${escapeHtml(challenge.prompt)}</p>
        <label class="b-field">Your answer (${challenge.unit})
          <input type="number" step="any" data-action="guess" data-focus="guess" value="${escapeHtml(state.guess)}" aria-label="Challenge answer in ${challenge.unit}">
        </label>
        <button type="button" data-action="check" data-focus="check">Check</button>
      </div>
      <p class="b-msg" role="status" data-tone="${escapeHtml(state.tone)}">${escapeHtml(state.message || 'Move the sliders and watch P V and n R T. The challenge asks you to solve for the missing number.')}</p>
    </section>
  `;
}

function readValues(state, key, raw) {
  return { ...state.values, [key]: clampGas(key, raw) };
}

export function mount(el, opts = {}) {
  ensureBuilderCss();
  const reduced = reducedFrom(opts);
  let state = createGas(opts.challenge || 'find-volume');
  state.playing = !reduced;
  let alive = true;
  let raf = 0;
  let drag = null;
  const stops = [];

  function mode() {
    return motionMode(reduced, state.playing);
  }

  function patch() {
    const y = pistonY(state.values.V);
    const handle = el.querySelector('[data-handle]');
    if (handle) handle.setAttribute('y', y.toFixed(1));
    const bounds = { left: 108, right: 212, top: Math.min(y + 20, 180), bottom: 190 };
    const dots = gasParticles(particleCount(state.values.n), bounds, mode() === 'still' ? 0 : state.phase);
    const svg = el.querySelector('[data-piston]');
    if (svg) {
      const existing = [...svg.querySelectorAll('[data-particle]')];
      if (existing.length !== dots.length) {
        paint();
        return;
      }
      dots.forEach((dot, index) => {
        existing[index].setAttribute('cx', dot.x.toFixed(1));
        existing[index].setAttribute('cy', dot.y.toFixed(1));
        existing[index].setAttribute('fill', temperatureColor(state.values.T));
      });
    }
    const equation = el.querySelector('[data-equation]');
    if (equation) equation.textContent = equationText(state.values);
    for (const key of GAS_KEYS) {
      const readout = el.querySelector(`[data-readout="${key}"]`);
      if (readout) readout.textContent = String(state.values[key]);
      el.querySelectorAll(`[data-gas="${key}"]`).forEach((input) => {
        const active = typeof document !== 'undefined' ? document.activeElement : null;
        if (input === active) return;
        input.value = String(state.values[key]);
        input.setAttribute('aria-valuenow', String(state.values[key]));
      });
    }
  }

  function kick() {
    if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
    raf = 0;
    if (mode() !== 'run' || typeof requestAnimationFrame !== 'function') return;
    const loop = () => {
      if (!alive || mode() !== 'run') return;
      state = { ...state, phase: state.phase + 0.08 };
      patch();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function paint(focusId) {
    if (!alive) return;
    el.innerHTML = renderGas(state, mode());
    restoreFocus(el, focusId);
    kick();
  }

  stops.push(on(el, 'input', (event) => {
    const key = event.target.getAttribute?.('data-gas');
    if (!key) return;
    state = { ...state, values: readValues(state, key, event.target.value) };
    patch();
  }));

  stops.push(on(el, 'change', (event) => {
    const action = event.target.getAttribute?.('data-action');
    if (event.target.getAttribute?.('data-gas')) {
      const summary = el.querySelector('#gas-summary');
      if (summary) summary.textContent = describeGas(state, mode());
    }
    if (action === 'guess') state = { ...state, guess: event.target.value };
    if (action === 'challenge') {
      state = { ...createGas(event.target.value), playing: !reduced };
      paint('challenge');
    }
  }));

  stops.push(on(el, 'click', (event) => {
    const target = event.target.closest?.('[data-action="check"]');
    if (!target || !el.contains(target)) return;
    const result = gradeGas(state.guess, challengeById(state.challengeId));
    const feedback = missFeedback(result.ok, result.success, result.hints, state.misses);
    state = { ...state, message: feedback.message, tone: feedback.tone, misses: feedback.misses, revealed: feedback.reveal };
    paint('check');
  }));

  stops.push(on(el, 'pointerdown', (event) => {
    if (!event.target.closest?.('[data-handle]')) return;
    drag = { pointer: event.pointerId, y: event.clientY };
    el.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }));

  stops.push(on(el, 'pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const svg = el.querySelector('[data-piston]');
    const rect = svg?.getBoundingClientRect?.();
    const scale = rect?.height ? 220 / rect.height : 1;
    const dy = (event.clientY - drag.y) * scale;
    drag.y = event.clientY;
    const { min, max } = GAS_RANGE.V;
    const next = state.values.V - dy * ((max - min) / 118);
    state = { ...state, values: { ...state.values, V: clampGas('V', next) } };
    patch();
  }));

  stops.push(on(el, 'pointerup', () => {
    if (!drag) return;
    drag = null;
    const summary = el.querySelector('#gas-summary');
    if (summary) summary.textContent = describeGas(state, mode());
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
