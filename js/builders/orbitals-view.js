import { escapeHtml } from './html.js';
import { ensureBuilderCss, on, reducedFrom, restoreFocus } from './dom.js';
import { missFeedback } from './feedback.js';
import { ELEMENTS } from '../elements.js';
import {
  addElectron,
  createOrbitals,
  describeOrbitals,
  elementByZ,
  emptyDiagram,
  gradeConfig,
  gradeDiagram,
  moveBoxFocus,
  removeElectron,
} from './orbitals.js';

const SPIN = ['·', '↑', '↑↓'];

export function renderOrbitals(state, motion = 'still') {
  const element = elementByZ(state.z);
  const options = ELEMENTS.filter((item) => item.z <= 36).map((item) => (
    `<option value="${item.z}" ${item.z === state.z ? 'selected' : ''}>${item.z} ${item.sym} ${item.name}</option>`
  )).join('');
  const focus = state.focus;
  const rows = Object.entries(state.boxes).map(([subshell, row]) => {
    const cells = row.map((value, index) => {
      const onCell = focus.subshell === subshell && focus.index === index;
      return `<button type="button" class="b-box" data-action="box" data-sub="${subshell}" data-index="${index}" data-focus="box-${subshell}-${index}" tabindex="${onCell ? '0' : '-1'}" aria-pressed="${onCell ? 'true' : 'false'}" aria-label="${subshell} box ${index + 1}, ${value === 0 ? 'empty' : value === 1 ? 'one electron' : 'two electrons'}">${SPIN[value] ?? '·'}</button>`;
    }).join('');
    return `<div class="b-sub"><div class="b-boxes" role="group" aria-label="${subshell}">${cells}</div><span>${subshell}</span></div>`;
  }).join('');
  return `
    <section class="b-tool" data-builder="orbitals" data-motion="${motion}">
      <h2>Orbital filling</h2>
      <p class="b-cite">OpenStax Chemistry: Atoms First 2e §3.4. Aufbau order, Hund’s rule, and the Pauli limit of two electrons in a box.</p>
      <p id="orb-summary" class="b-summary" aria-live="polite">${escapeHtml(describeOrbitals(state))}</p>
      <div class="b-controls">
        <label class="b-field">Element
          <select data-action="element" data-focus="element">${options}</select>
        </label>
        <button type="button" data-action="check-boxes" data-focus="check-boxes">Check boxes</button>
        <button type="button" data-action="reset" data-focus="reset">Reset</button>
      </div>
      <div class="b-aufbau" data-box-grid>${rows}</div>
      <p class="b-fine">Enter adds an electron to the selected box. Backspace removes one. Arrow keys move. A tap does the same as Enter.</p>
      <div class="b-controls">
        <label class="b-field">Ground configuration
          <input type="text" data-action="config" data-focus="config" value="${escapeHtml(state.configText)}" aria-label="Electron configuration" placeholder="1s2 2s2 2p4" autocapitalize="off" spellcheck="false">
        </label>
        <button type="button" data-action="check-config" data-focus="check-config">Check configuration</button>
      </div>
      <p class="b-msg" role="status" data-tone="${escapeHtml(state.tone)}">${escapeHtml(state.message || `Fill the ground state of ${element?.name ?? 'this element'}. One arrow in each box of a subshell before any pair.`)}</p>
    </section>
  `;
}

export function mount(el, opts = {}) {
  ensureBuilderCss();
  reducedFrom(opts);
  let state = createOrbitals(opts.z || 8);
  let alive = true;
  const stops = [];

  function paint(focusId) {
    if (!alive) return;
    el.innerHTML = renderOrbitals(state, 'still');
    restoreFocus(el, focusId);
  }

  function note(error) {
    if (error === 'pauli') {
      return { message: 'That box already has two electrons. Pauli stops a third.', tone: 'bad' };
    }
    if (error === 'hund') {
      return { message: 'Give every box in this subshell one electron before you make a pair. That is Hund’s rule.', tone: 'bad' };
    }
    return { message: '', tone: '' };
  }

  stops.push(on(el, 'click', (event) => {
    const target = event.target.closest?.('[data-action]');
    if (!target || !el.contains(target)) return;
    const action = target.getAttribute('data-action');
    if (action === 'box') {
      const subshell = target.getAttribute('data-sub');
      const index = Number(target.getAttribute('data-index'));
      const result = addElectron(state.boxes, subshell, index);
      const feedback = note(result.error);
      state = {
        ...state,
        boxes: result.boxes,
        focus: { subshell, index },
        message: feedback.message,
        tone: feedback.tone,
      };
      paint(`box-${subshell}-${index}`);
    }
    if (action === 'reset') {
      state = { ...createOrbitals(state.z), configText: state.configText };
      paint('reset');
    }
    if (action === 'check-boxes') {
      const result = gradeDiagram(state.boxes, state.z);
      const feedback = missFeedback(result.ok, result.success, result.hints, state.boxMisses);
      state = { ...state, message: feedback.message, tone: feedback.tone, boxMisses: feedback.misses, revealed: feedback.reveal };
      paint('check-boxes');
    }
    if (action === 'check-config') {
      const result = gradeConfig(state.configText, state.z);
      const feedback = missFeedback(result.ok, result.success, result.hints, state.configMisses);
      state = { ...state, message: feedback.message, tone: feedback.tone, configMisses: feedback.misses, revealed: feedback.reveal };
      paint('check-config');
    }
  }));

  stops.push(on(el, 'change', (event) => {
    if (event.target.getAttribute?.('data-action') === 'element') {
      const z = Number(event.target.value);
      state = createOrbitals(z);
      paint('element');
    }
  }));

  stops.push(on(el, 'input', (event) => {
    if (event.target.getAttribute?.('data-action') === 'config') {
      state = { ...state, configText: event.target.value };
      const summary = el.querySelector('#orb-summary');
      if (summary) summary.textContent = describeOrbitals(state);
    }
  }));

  stops.push(on(el, 'keydown', (event) => {
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const box = event.target.closest?.('[data-action="box"]');
    if (!box) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      const subshell = box.getAttribute('data-sub');
      const index = Number(box.getAttribute('data-index'));
      state = { ...state, boxes: removeElectron(state.boxes, subshell, index), focus: { subshell, index }, message: '', tone: '' };
      paint(box.getAttribute('data-focus'));
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      const next = moveBoxFocus(state.boxes, state.focus, event.key);
      if (!next) return;
      event.preventDefault();
      state = { ...state, focus: next };
      paint(`box-${next.subshell}-${next.index}`);
    }
  }));

  paint();
  return {
    getState: () => state,
    destroy() {
      alive = false;
      for (const stop of stops) stop();
      el.replaceChildren?.();
    },
  };
}

export { emptyDiagram };
