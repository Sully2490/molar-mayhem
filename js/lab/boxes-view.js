import { ELEMENTS } from '../elements.js';
import {
  addBoxElectron,
  diagramElectrons,
  diagramMatches,
  emptyDiagram,
  groundMap,
  removeBoxElectron,
  subshellsFor,
  unpairedInDiagram,
} from './chem.js';
import { escapeHtml, supDigits } from './html.js';

const SPIN = ['', '↑', '↑↓'];

export function boxFocus(state) {
  return state.focus ?? { subshell: '1s', index: 0 };
}

export function describeBoxes(state) {
  const symbol = ELEMENTS.find((element) => element.z === state.z)?.sym ?? '';
  const name = ELEMENTS.find((element) => element.z === state.z)?.name ?? '';
  const placed = diagramElectrons(state.boxes);
  const target = Object.entries(groundMap(state.z))
    .map(([subshell, count]) => `${subshell}${supDigits(count)}`)
    .join(' ');
  const rows = Object.entries(state.boxes).map(([subshell, row]) => `${subshell} ${row.map((value) => SPIN[value] || 'empty').join(' ')}`);
  const extra = state.z === 24
    ? ' Chromium is an exception: 4s¹ 3d⁵, not 4s² 3d⁴.'
    : state.z === 29
      ? ' Copper is an exception: 4s¹ 3d¹⁰, not 4s² 3d⁹.'
      : '';
  const status = state.message ? ` ${state.message}` : '';
  return `${name} (${symbol}), atomic number ${state.z}. The boxes show ${placed} of ${state.z} electrons: ${rows.join('; ')}. ${unpairedInDiagram(state.boxes)} unpaired. Ground state target: ${target}.${extra}${status} The diagram stays still. Enter or a tap adds an electron. Backspace removes one. Arrow keys move between boxes.`;
}

export function renderBoxes(state) {
  const options = ELEMENTS.filter((element) => element.z <= 36).map((element) => (
    `<option value="${element.z}" ${element.z === state.z ? 'selected' : ''}>${element.sym} ${element.name}</option>`
  )).join('');
  const focus = boxFocus(state);
  const rows = subshellsFor(state.z).map((subshell) => {
    const cells = (state.boxes[subshell] ?? []).map((value, index) => {
      const on = focus.subshell === subshell && focus.index === index;
      return `<button type="button" class="lab-box" data-action="box" data-sub="${subshell}" data-index="${index}" data-focus="box-${subshell}-${index}" tabindex="${on ? '0' : '-1'}" aria-pressed="${on ? 'true' : 'false'}" aria-label="${subshell} box ${index + 1}, ${value === 0 ? 'empty' : value === 1 ? 'one electron' : 'two electrons'}">${SPIN[value] || '·'}</button>`;
    }).join('');
    return `<div class="lab-sub"><div class="lab-boxes" role="group" aria-label="${subshell}">${cells}</div><span>${subshell}</span></div>`;
  }).join('');
  return `
    <section class="lab-tool" data-tool="boxes" data-motion="still">
      <h2>Orbital boxes</h2>
      <p id="lab-desc" class="lab-desc" aria-live="polite">${escapeHtml(describeBoxes(state))}</p>
      <div class="lab-controls">
        <label>Element
          <select data-action="element-z" data-focus="element-z">${options}</select>
        </label>
        <button type="button" data-action="check-boxes" data-focus="check-boxes">Check</button>
        <button type="button" data-action="reset-boxes" data-focus="reset-boxes">Reset</button>
      </div>
      <div class="lab-aufbau" data-box-grid>${rows}</div>
      <p class="lab-msg" data-tone="${escapeHtml(state.tone || '')}" role="status">${escapeHtml(state.message || 'Add electrons from 1s upward. One per box before any pair.')}</p>
    </section>
  `;
}

export function boxesAfterAdd(state, subshell, index) {
  const result = addBoxElectron(state.boxes, subshell, index);
  if (result.error === 'pauli') {
    return { ...state, focus: { subshell, index }, message: 'That box already has two electrons with opposite spins. Pauli stops a third.', tone: 'bad' };
  }
  if (result.error === 'hund') {
    return { ...state, focus: { subshell, index }, message: `Give every ${subshell} box one electron before pairing.`, tone: 'bad' };
  }
  return { ...state, boxes: result.boxes, focus: { subshell, index }, message: '', tone: '' };
}

export function boxesAfterRemove(state, subshell, index) {
  return {
    ...state,
    boxes: removeBoxElectron(state.boxes, subshell, index),
    focus: { subshell, index },
    message: '',
    tone: '',
  };
}

export function boxesAfterCheck(state) {
  const ok = diagramMatches(state.boxes, state.z);
  return {
    ...state,
    message: ok ? 'That matches the ground state.' : 'Not yet. Compare the electron count in each subshell with the target in the sentence above.',
    tone: ok ? 'ok' : 'bad',
  };
}

export function moveBoxFocus(boxes, focus, key) {
  const subs = Object.keys(boxes);
  const subIndex = Math.max(0, subs.indexOf(focus.subshell));
  const row = boxes[focus.subshell] ?? [];
  if (key === 'ArrowRight') {
    if (focus.index + 1 < row.length) return { subshell: focus.subshell, index: focus.index + 1 };
    if (subIndex + 1 < subs.length) return { subshell: subs[subIndex + 1], index: 0 };
  }
  if (key === 'ArrowLeft') {
    if (focus.index > 0) return { subshell: focus.subshell, index: focus.index - 1 };
    if (subIndex > 0) {
      const previous = subs[subIndex - 1];
      return { subshell: previous, index: boxes[previous].length - 1 };
    }
  }
  if (key === 'ArrowDown' && subIndex + 1 < subs.length) return { subshell: subs[subIndex + 1], index: 0 };
  if (key === 'ArrowUp' && subIndex > 0) return { subshell: subs[subIndex - 1], index: 0 };
  if (key === 'Home') return { subshell: subs[0], index: 0 };
  if (key === 'End') {
    const last = subs[subs.length - 1];
    return { subshell: last, index: boxes[last].length - 1 };
  }
  return null;
}

export function freshBoxes(z) {
  return { z, boxes: emptyDiagram(z), focus: { subshell: '1s', index: 0 }, message: '', tone: '' };
}
