import { escapeHtml, formulaText } from './html.js';
import { ensureBuilderCss, on, reducedFrom, restoreFocus } from './dom.js';
import { motionMode } from './motion.js';
import { missFeedback } from './feedback.js';
import {
  BOND_ANGLES,
  ELECTRON_GEOMETRIES,
  HYBRIDS,
  MOLECULAR_SHAPES,
  VSEPR_CHALLENGES,
  VSEPR_SHAPES,
  challengeById,
  createVsepr,
  describeVsepr,
  dragView,
  frameLayout,
  gradeVsepr,
  rotateView,
  shapeById,
} from './vsepr.js';

const FILL = {
  H: '#f8fafc', C: '#334155', N: '#2563eb', O: '#e11d48', F: '#16a34a',
  B: '#fecdd3', S: '#eab308', P: '#f97316', Cl: '#65a30d', Xe: '#0f766e',
  A: '#0f5c56', X: '#e7e5e4',
};
const INK = {
  H: '#1c2430', C: '#fffaf2', N: '#fffaf2', O: '#fffaf2', F: '#fffaf2',
  B: '#1c2430', S: '#1c2430', P: '#1c2430', Cl: '#fffaf2', Xe: '#fffaf2',
  A: '#fffaf2', X: '#1c2430',
};

function circleAtom(ctx, point, symbol, radius) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = FILL[symbol] ?? '#e7e5e4';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1c2430';
  ctx.stroke();
  ctx.fillStyle = INK[symbol] ?? '#1c2430';
  ctx.font = '700 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, point.x, point.y);
}

/** Draw one still frame with the page's own math. No 3D library. */
export function drawVsepr(ctx, entry, view, width, height) {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fffaf2';
  ctx.fillRect(0, 0, width, height);
  const frame = frameLayout(entry, view, width, height);
  const items = [];
  for (const atom of frame.atoms) {
    items.push({
      z: (frame.center.z + atom.z) / 2,
      draw() {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(frame.center.x, frame.center.y);
        ctx.lineTo(atom.x, atom.y);
        ctx.stroke();
      },
    });
    items.push({
      z: atom.z,
      draw() { circleAtom(ctx, atom, atom.symbol, 15 * atom.scale); },
    });
  }
  for (const lone of frame.lonePairs) {
    items.push({
      z: lone.z,
      draw() {
        ctx.fillStyle = 'rgba(196, 181, 253, 0.9)';
        ctx.beginPath();
        ctx.ellipse(lone.x, lone.y, 20, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5b21b6';
        ctx.beginPath();
        ctx.arc(lone.x - 4, lone.y, 2.2, 0, Math.PI * 2);
        ctx.arc(lone.x + 4, lone.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      },
    });
  }
  items.push({
    z: frame.center.z,
    draw() { circleAtom(ctx, frame.center, entry.center, 18); },
  });
  items.sort((a, b) => a.z - b.z);
  for (const item of items) item.draw();
  if (frame.atoms.length >= 2) {
    const left = frame.atoms[0];
    const right = frame.atoms[1];
    ctx.fillStyle = '#9a3412';
    ctx.font = '700 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${entry.angle}°`, (left.x + right.x) / 2, (left.y + right.y) / 2);
  }
  ctx.fillStyle = '#5d675f';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${entry.hybrid} hybridization`, 12, height - 16);
}

function choices(name, legend, values, selected) {
  const radios = values.map((value) => (
    `<label class="b-choice"><input type="radio" name="${name}" data-answer="${name}" value="${escapeHtml(value)}" ${selected === value ? 'checked' : ''}> ${escapeHtml(value)}</label>`
  )).join('');
  return `<fieldset class="b-set"><legend>${escapeHtml(legend)}</legend><div class="b-choices">${radios}</div></fieldset>`;
}

export function renderVsepr(state, motion = 'still') {
  const entry = shapeById(state.shapeId);
  const challenge = challengeById(state.challengeId);
  const shapes = VSEPR_SHAPES.map((item) => (
    `<option value="${item.id}" ${item.id === entry.id ? 'selected' : ''}>${escapeHtml(formulaText(item.label))} · ${escapeHtml(item.mg)}</option>`
  )).join('');
  const challenges = VSEPR_CHALLENGES.map((item) => (
    `<option value="${item.id}" ${item.id === challenge.id ? 'selected' : ''}>${escapeHtml(item.title)}</option>`
  )).join('');
  const frame = motion === 'still' ? 'Still frame.' : 'Turning.';
  return `
    <section class="b-tool" data-builder="vsepr" data-motion="${motion}">
      <h2>VSEPR viewer</h2>
      <p class="b-cite">OpenStax Chemistry: Atoms First 2e §4.6 and §5.2.</p>
      <p id="vsepr-summary" class="b-summary" aria-live="polite">${escapeHtml(describeVsepr(state, motion))}</p>
      <div class="b-controls">
        <label class="b-field">Shape
          <select data-action="shape" data-focus="shape">${shapes}</select>
        </label>
        <label class="b-field">Challenge
          <select data-action="challenge" data-focus="challenge">${challenges}</select>
        </label>
      </div>
      <div class="b-split">
        <canvas class="b-canvas" data-rotate tabindex="0" data-focus="viewer" width="360" height="300" role="application" aria-label="3D ${escapeHtml(entry.mg)} model. ${frame} Bond angle ${escapeHtml(entry.angle)} degrees. Hybridization ${escapeHtml(entry.hybrid)}. Arrow keys rotate. Home resets." aria-describedby="vsepr-summary" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home"></canvas>
        <div class="b-side">
          <p><b>Electron geometry:</b> ${escapeHtml(entry.eg)}</p>
          <p><b>Molecular shape:</b> ${escapeHtml(entry.mg)}</p>
          <p><b>Bond angle:</b> ${escapeHtml(entry.angle)}°</p>
          <p><b>Hybridization:</b> ${escapeHtml(entry.hybrid)}</p>
          <div class="b-row">
            <button type="button" data-action="spin" data-focus="spin" aria-pressed="${motion === 'run' ? 'true' : 'false'}" ${state.locked ? 'disabled' : ''}>${state.locked ? 'Still' : motion === 'run' ? 'Hold still' : 'Spin'}</button>
            <button type="button" data-action="reset-view" data-focus="reset-view">Reset view</button>
          </div>
          <p class="b-fine">Arrow keys turn the model. Home resets it. A finger drag does the same thing.</p>
        </div>
      </div>
      ${choices('eg', 'Electron geometry', ELECTRON_GEOMETRIES, state.answer.eg)}
      ${choices('mg', 'Molecular shape', MOLECULAR_SHAPES, state.answer.mg)}
      ${choices('angle', 'Bond angle', BOND_ANGLES, state.answer.angle)}
      ${choices('hybrid', 'Hybridization', HYBRIDS, state.answer.hybrid)}
      <div class="b-row">
        <button type="button" data-action="check" data-focus="check">Check challenge</button>
      </div>
      <p class="b-msg" role="status" data-tone="${escapeHtml(state.tone)}">${escapeHtml(state.message || challenge.prompt)}</p>
    </section>
  `;
}

export function mount(el, opts = {}) {
  ensureBuilderCss();
  const reduced = reducedFrom(opts);
  let state = createVsepr(opts.challenge || 'water');
  state.locked = reduced;
  state.spin = false;
  let alive = true;
  let raf = 0;
  let drag = null;
  const stops = [];

  function mode() {
    return motionMode(reduced, state.spin);
  }

  function draw() {
    const canvas = el.querySelector('canvas');
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 260;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawVsepr(ctx, shapeById(state.shapeId), state.view, width, height);
  }

  function kick() {
    if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
    raf = 0;
    draw();
    if (mode() !== 'run' || typeof requestAnimationFrame !== 'function') return;
    const loop = () => {
      if (!alive || mode() !== 'run') return;
      state = { ...state, view: { ...state.view, yaw: state.view.yaw + 0.012 } };
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function paint(focusId) {
    if (!alive) return;
    el.innerHTML = renderVsepr(state, mode());
    restoreFocus(el, focusId);
    kick();
  }

  stops.push(on(el, 'click', (event) => {
    const target = event.target.closest?.('[data-action]');
    if (!target || !el.contains(target)) return;
    const action = target.getAttribute('data-action');
    if (action === 'spin') {
      if (reduced) return;
      state = { ...state, spin: !state.spin };
      paint('spin');
    }
    if (action === 'reset-view') {
      state = { ...state, view: { yaw: 0.6, pitch: 0.35 }, spin: false };
      paint('reset-view');
    }
    if (action === 'check') {
      const result = gradeVsepr(state.answer, challengeById(state.challengeId));
      const feedback = missFeedback(result.ok, result.success, result.hints, state.misses);
      state = { ...state, message: feedback.message, tone: feedback.tone, misses: feedback.misses, revealed: feedback.reveal };
      paint('check');
    }
  }));

  stops.push(on(el, 'change', (event) => {
    const action = event.target.getAttribute?.('data-action');
    if (action === 'shape') {
      state = { ...state, shapeId: event.target.value, view: { yaw: 0.6, pitch: 0.35 } };
      paint('shape');
    }
    if (action === 'challenge') {
      const next = createVsepr(event.target.value);
      state = { ...next, locked: reduced, spin: false };
      paint('challenge');
    }
    const field = event.target.getAttribute?.('data-answer');
    if (field) {
      state = { ...state, answer: { ...state.answer, [field]: event.target.value } };
    }
  }));

  stops.push(on(el, 'keydown', (event) => {
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (!event.target.closest?.('[data-rotate]')) return;
    const next = rotateView(state.view, event.key);
    if (!next) return;
    event.preventDefault();
    state = { ...state, view: next, spin: false };
    draw();
    const summary = el.querySelector('#vsepr-summary');
    if (summary) summary.textContent = describeVsepr(state, 'still');
    const spin = el.querySelector('[data-action="spin"]');
    if (spin && !spin.disabled) {
      spin.textContent = 'Spin';
      spin.setAttribute('aria-pressed', 'false');
    }
  }));

  stops.push(on(el, 'pointerdown', (event) => {
    const canvas = event.target.closest?.('[data-rotate]');
    if (!canvas || !el.contains(canvas)) return;
    drag = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
    state = { ...state, spin: false };
    el.setPointerCapture?.(event.pointerId);
  }));

  stops.push(on(el, 'pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    state = { ...state, view: dragView(state.view, dx, dy) };
    draw();
  }));

  stops.push(on(el, 'pointerup', () => {
    drag = null;
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
