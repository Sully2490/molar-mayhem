import { escapeHtml, formulaText } from './html.js';
import { ensureBuilderCss, on, reducedFrom, restoreFocus } from './dom.js';
import { missFeedback } from './feedback.js';
import {
  LEWIS_CHALLENGES,
  LEWIS_ELEMENTS,
  addAtom,
  bondBetween,
  bondPhrase,
  bondSegment,
  challengeById,
  createLewis,
  cycleBond,
  describeLewis,
  gradeLewis,
  lonePairsOf,
  moveAtom,
  raiseBond,
  removeAtom,
  selectAtom,
  setBondOrder,
  setLonePairs,
  stateFromChallenge,
} from './lewis.js';

const FILL = {
  H: '#f8fafc', B: '#fecdd3', C: '#334155', N: '#2563eb', O: '#e11d48',
  F: '#16a34a', P: '#f97316', S: '#eab308', Cl: '#65a30d',
};
const INK = {
  H: '#1c2430', B: '#1c2430', C: '#fffaf2', N: '#fffaf2', O: '#fffaf2',
  F: '#fffaf2', P: '#1c2430', S: '#1c2430', Cl: '#1c2430',
};

function lineOffsets(order) {
  if (order === 2) return [-4, 4];
  if (order === 3) return [-6, 0, 6];
  return [0];
}

function bondMarkup(state, bond) {
  const a = state.atoms.find((atom) => atom.id === bond.a);
  const b = state.atoms.find((atom) => atom.id === bond.b);
  if (!a || !b) return '';
  const segment = bondSegment(a, b);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const px = -dy / length;
  const py = dx / length;
  const lines = lineOffsets(bond.order).map((offset) => (
    `<line x1="${(segment.x1 + px * offset).toFixed(1)}" y1="${(segment.y1 + py * offset).toFixed(1)}" x2="${(segment.x2 + px * offset).toFixed(1)}" y2="${(segment.y2 + py * offset).toFixed(1)}" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>`
  )).join('');
  return `<g data-bond="${bond.id}" data-action="cycle-bond" data-focus="bond-${bond.id}" tabindex="0" role="button" aria-label="${bondPhrase(bond.order)} bond. Enter cycles the order.">${lines}<line data-hit x1="${segment.x1.toFixed(1)}" y1="${segment.y1.toFixed(1)}" x2="${segment.x2.toFixed(1)}" y2="${segment.y2.toFixed(1)}" stroke="transparent" stroke-width="18"/></g>`;
}

function loneDots(pairs) {
  const spots = [[-16, -14], [-6, -18], [6, -18], [16, -14]];
  let marks = '';
  for (let index = 0; index < pairs; index += 1) {
    const [x, y] = spots[index] ?? [0, -18];
    marks += `<circle cx="${x - 3}" cy="${y}" r="2" fill="#5b21b6"/><circle cx="${x + 3}" cy="${y}" r="2" fill="#5b21b6"/>`;
  }
  return marks;
}

export function renderLewis(state, motion = 'still') {
  const challenge = challengeById(state.challengeId);
  const options = LEWIS_CHALLENGES.map((item) => (
    `<option value="${item.id}" ${item.id === challenge.id ? 'selected' : ''}>${escapeHtml(formulaText(item.formula))} ${escapeHtml(item.title)}</option>`
  )).join('');
  const palette = LEWIS_ELEMENTS.map((element) => (
    `<button type="button" class="b-key" data-action="add" data-el="${element.symbol}" data-focus="el-${element.symbol}">${element.symbol}</button>`
  )).join('');
  const bonds = state.bonds.map((bond) => bondMarkup(state, bond)).join('');
  const atoms = state.atoms.map((atom) => {
    const selected = atom.id === state.selected;
    const pairs = lonePairsOf(state, atom.id);
    return `<g data-atom="${atom.id}" data-action="select" data-focus="atom-${atom.id}" tabindex="0" role="button" aria-pressed="${selected ? 'true' : 'false'}" aria-label="${atom.symbol}, ${pairs} lone pairs" transform="translate(${atom.x} ${atom.y})"><circle r="22" fill="transparent"/><circle r="16" fill="${FILL[atom.symbol] ?? '#e7e5e4'}" stroke="${selected ? '#9a3412' : '#1c2430'}" stroke-width="${selected ? 3 : 1.5}"/>${loneDots(pairs)}<text y="5" text-anchor="middle" font-size="13" font-weight="700" fill="${INK[atom.symbol] ?? '#1c2430'}">${atom.symbol}</text></g>`;
  }).join('');
  const partners = state.atoms.filter((atom) => atom.id !== state.selected);
  const partnerOptions = partners.map((atom) => (
    `<option value="${atom.id}" ${atom.id === state.partner ? 'selected' : ''}>${atom.symbol}</option>`
  )).join('');
  const current = state.selected != null && state.partner != null
    ? bondBetween(state, state.selected, state.partner)
    : null;
  const order = current?.order ?? 0;
  const selected = state.atoms.find((atom) => atom.id === state.selected);
  const pairCount = selected ? lonePairsOf(state, selected.id) : 0;
  return `
    <section class="b-tool" data-builder="lewis" data-motion="${motion}">
      <h2>Lewis structure builder</h2>
      <p class="b-cite">OpenStax Chemistry: Atoms First 2e §4.4–§4.5.</p>
      <p id="lewis-summary" class="b-summary" aria-live="polite">${escapeHtml(describeLewis(state, motion))}</p>
      <div class="b-controls">
        <label class="b-field">Challenge
          <select data-action="challenge" data-focus="challenge">${options}</select>
        </label>
        <label class="b-field">Overall charge
          <input type="number" min="-3" max="3" step="1" value="${state.charge}" data-action="charge" data-focus="charge" aria-describedby="lewis-summary">
        </label>
      </div>
      <div class="b-palette" role="group" aria-label="Add an atom">${palette}</div>
      <div class="b-split">
        <svg class="b-svg" data-stage viewBox="0 0 320 280" role="img" aria-labelledby="lewis-summary">
          <rect width="320" height="280" fill="#fffaf2" rx="16"/>
          ${bonds}
          ${atoms}
        </svg>
        <div class="b-side">
          <p><b>Selected:</b> ${selected ? selected.symbol : 'none'}</p>
          <label class="b-field">Bond partner
            <select data-action="partner" data-focus="partner" ${partners.length ? '' : 'disabled'}>${partnerOptions || '<option value="">Add another atom</option>'}</select>
          </label>
          <div class="b-row" role="group" aria-label="Bond order">
            ${[1, 2, 3].map((value) => `<button type="button" data-action="order" data-order="${value}" data-focus="order-${value}" aria-pressed="${order === value ? 'true' : 'false'}">${value === 1 ? 'Single' : value === 2 ? 'Double' : 'Triple'}</button>`).join('')}
            <button type="button" data-action="order" data-order="0" data-focus="order-0">Remove bond</button>
          </div>
          <div class="b-row" role="group" aria-label="Lone pairs on the selected atom">
            <button type="button" data-action="lone" data-delta="-1" data-focus="lone-down" aria-label="Remove a lone pair">−</button>
            <span class="b-readout" data-lone-readout>${pairCount} lone ${pairCount === 1 ? 'pair' : 'pairs'}</span>
            <button type="button" data-action="lone" data-delta="1" data-focus="lone-up" aria-label="Add a lone pair">+</button>
          </div>
          <div class="b-row">
            <button type="button" data-action="check" data-focus="check">Check</button>
            <button type="button" data-action="undo" data-focus="undo">Undo</button>
            <button type="button" data-action="reset" data-focus="reset">Reset</button>
            <button type="button" data-action="remove" data-focus="remove">Remove atom</button>
            ${state.revealed ? '<button type="button" data-action="solve" data-focus="solve">Draw the worked structure</button>' : ''}
          </div>
          <p class="b-fine">Drag one atom onto another to add a bond. Arrow keys move the selected atom. Tap a bond to raise its order.</p>
          <p class="b-drag" data-lone-source tabindex="0" role="button" data-focus="lone-chip" aria-label="Lone pair chip. Drag it onto an atom, or use the plus button.">Lone pair</p>
        </div>
      </div>
      <p class="b-msg" role="status" data-tone="${escapeHtml(state.tone)}">${escapeHtml(state.message || 'Place atoms, connect them, then add lone pairs. Check looks at octets, formal charge, and the electron count.')}</p>
    </section>
  `;
}

function remember(history, state) {
  history.push(JSON.stringify({
    atoms: state.atoms,
    bonds: state.bonds,
    lone: state.lone,
    charge: state.charge,
    selected: state.selected,
    partner: state.partner,
  }));
  if (history.length > 40) history.shift();
}

export function mount(el, opts = {}) {
  ensureBuilderCss();
  reducedFrom(opts);
  let state = createLewis(opts.challenge || 'H2O');
  if (opts.challenge) state.challengeId = opts.challenge;
  const history = [];
  let alive = true;
  let drag = null;
  const stops = [];
  const motion = 'still';
  let suppressClick = false;

  function paint(focusId) {
    if (!alive) return;
    el.innerHTML = renderLewis(state, motion);
    restoreFocus(el, focusId);
  }

  function patchPositions() {
    const svg = el.querySelector('[data-stage]');
    if (!svg) return;
    for (const atom of state.atoms) {
      svg.querySelector(`[data-atom="${atom.id}"]`)?.setAttribute('transform', `translate(${atom.x} ${atom.y})`);
    }
    for (const bond of state.bonds) {
      const node = svg.querySelector(`[data-bond="${bond.id}"]`);
      const a = state.atoms.find((atom) => atom.id === bond.a);
      const b = state.atoms.find((atom) => atom.id === bond.b);
      if (!node || !a || !b) continue;
      const segment = bondSegment(a, b);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      const px = -dy / length;
      const py = dx / length;
      const lines = [...node.querySelectorAll('line')];
      const offsets = lineOffsets(bond.order);
      lines.forEach((line, index) => {
        const offset = line.hasAttribute('data-hit') ? 0 : (offsets[index] ?? 0);
        line.setAttribute('x1', (segment.x1 + px * offset).toFixed(1));
        line.setAttribute('y1', (segment.y1 + py * offset).toFixed(1));
        line.setAttribute('x2', (segment.x2 + px * offset).toFixed(1));
        line.setAttribute('y2', (segment.y2 + py * offset).toFixed(1));
      });
    }
  }

  function apply(next, focusId, snapshot = true) {
    if (snapshot) remember(history, state);
    state = next;
    paint(focusId);
  }

  stops.push(on(el, 'click', (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const target = event.target.closest?.('[data-action]');
    if (!target || !el.contains(target)) return;
    const action = target.getAttribute('data-action');
    if (action === 'add') {
      apply(addAtom(state, target.getAttribute('data-el')), `el-${target.getAttribute('data-el')}`);
      return;
    }
    if (action === 'select') {
      state = selectAtom(state, Number(target.getAttribute('data-atom')));
      paint(target.getAttribute('data-focus'));
      return;
    }
    if (action === 'cycle-bond') {
      apply(cycleBond(state, Number(target.getAttribute('data-bond'))), target.getAttribute('data-focus'));
      return;
    }
    if (action === 'order') {
      apply(setBondOrder(state, state.selected, state.partner, Number(target.getAttribute('data-order'))), target.getAttribute('data-focus'));
      return;
    }
    if (action === 'lone') {
      const atom = state.atoms.find((item) => item.id === state.selected);
      if (!atom) return;
      apply(setLonePairs(state, atom.id, lonePairsOf(state, atom.id) + Number(target.getAttribute('data-delta'))), target.getAttribute('data-focus'));
      return;
    }
    if (action === 'remove') {
      if (state.selected == null) return;
      apply(removeAtom(state, state.selected), 'remove');
      return;
    }
    if (action === 'undo') {
      const previous = history.pop();
      if (previous) state = { ...state, ...JSON.parse(previous) };
      paint('undo');
      return;
    }
    if (action === 'reset') {
      apply(createLewis(state.challengeId), 'reset');
      return;
    }
    if (action === 'solve') {
      const solved = stateFromChallenge(challengeById(state.challengeId));
      state = { ...solved, message: state.message, tone: state.tone, misses: state.misses, revealed: true };
      paint('solve');
      return;
    }
    if (action === 'check') {
      const result = gradeLewis(state);
      const feedback = missFeedback(result.ok, result.success, result.hints, state.misses);
      state = {
        ...state,
        message: feedback.message,
        tone: feedback.tone,
        misses: feedback.misses,
        revealed: feedback.reveal,
      };
      paint('check');
    }
  }));

  stops.push(on(el, 'change', (event) => {
    const action = event.target.getAttribute?.('data-action');
    if (action === 'challenge') {
      history.length = 0;
      state = createLewis(event.target.value);
      paint('challenge');
    }
    if (action === 'partner') {
      state = { ...state, partner: Number(event.target.value) };
      paint('partner');
    }
  }));

  stops.push(on(el, 'input', (event) => {
    if (event.target.getAttribute?.('data-action') !== 'charge') return;
    state = { ...state, charge: Math.max(-3, Math.min(3, Number(event.target.value) || 0)) };
    const summary = el.querySelector('#lewis-summary');
    if (summary) summary.textContent = describeLewis(state, 'still');
  }));

  stops.push(on(el, 'keydown', (event) => {
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const graphic = event.target.closest?.('[data-atom], [data-bond], [data-stage]');
    if ((event.key === 'Enter' || event.key === ' ') && graphic && event.target.closest('[data-action]')) {
      event.preventDefault();
      event.target.closest('[data-action]').click();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    if (state.selected == null) return;
    if (!graphic && event.target.closest('button')) return;
    event.preventDefault();
    const step = 8;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    state = moveAtom(state, state.selected, dx, dy);
    patchPositions();
  }));

  stops.push(on(el, 'pointerdown', (event) => {
    const chip = event.target.closest?.('[data-lone-source]');
    const atom = event.target.closest?.('[data-atom]');
    if (chip && el.contains(chip)) {
      drag = { kind: 'lone', pointer: event.pointerId };
      el.setPointerCapture?.(event.pointerId);
      return;
    }
    if (!atom || !el.contains(atom)) return;
    drag = {
      kind: 'atom',
      id: Number(atom.getAttribute('data-atom')),
      x: event.clientX,
      y: event.clientY,
      moved: false,
      pointer: event.pointerId,
    };
    el.setPointerCapture?.(event.pointerId);
  }));

  stops.push(on(el, 'pointermove', (event) => {
    if (!drag || drag.kind !== 'atom' || event.pointerId !== drag.pointer) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    const svg = el.querySelector('[data-stage]');
    const rect = svg?.getBoundingClientRect?.();
    const scaleX = rect?.width ? 320 / rect.width : 1;
    const scaleY = rect?.height ? 280 / rect.height : 1;
    state = moveAtom(state, drag.id, dx * scaleX, dy * scaleY);
    drag.x = event.clientX;
    drag.y = event.clientY;
    patchPositions();
  }));

  stops.push(on(el, 'pointerup', (event) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const current = drag;
    drag = null;
    const hit = typeof document !== 'undefined' && document.elementFromPoint
      ? document.elementFromPoint(event.clientX, event.clientY)
      : event.target;
    const atom = hit?.closest?.('[data-atom]');
    const otherId = atom ? Number(atom.getAttribute('data-atom')) : null;
    if (current.kind === 'lone' && otherId) {
      apply(setLonePairs(state, otherId, lonePairsOf(state, otherId) + 1), `atom-${otherId}`);
      return;
    }
    if (current.kind === 'atom' && current.moved && otherId && otherId !== current.id) {
      suppressClick = true;
      apply(raiseBond({ ...state, selected: current.id }, current.id, otherId), `atom-${current.id}`);
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
