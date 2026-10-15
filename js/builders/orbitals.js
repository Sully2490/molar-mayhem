import { ELEMENTS } from '../elements.js';

export const FILL_ORDER = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p'];
const CAPACITY = { s: 2, p: 6, d: 10, f: 14 };
const BOXES = { s: 1, p: 3, d: 5, f: 7 };

const NOBLE = {
  He: '1s2',
  Ne: '1s2 2s2 2p6',
  Ar: '1s2 2s2 2p6 3s2 3p6',
};

const SUPERSCRIPTS = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
};

export function elementByZ(z) {
  return ELEMENTS.find((element) => element.z === z) ?? null;
}

export function subshellCapacity(subshell) {
  return CAPACITY[subshell?.[1]] ?? 0;
}

export function boxCount(subshell) {
  return BOXES[subshell?.[1]] ?? 0;
}

export function groundOccupancy(z) {
  const map = {};
  let left = z;
  for (const subshell of FILL_ORDER) {
    if (left <= 0) break;
    const take = Math.min(left, subshellCapacity(subshell));
    map[subshell] = take;
    left -= take;
  }
  if (z === 24) {
    map['4s'] = 1;
    map['3d'] = 5;
  }
  if (z === 29) {
    map['4s'] = 1;
    map['3d'] = 10;
  }
  return map;
}

export function subshellsFor(z) {
  const map = groundOccupancy(z);
  let last = 0;
  FILL_ORDER.forEach((subshell, index) => {
    if (map[subshell]) last = index;
  });
  return FILL_ORDER.slice(0, last + 1);
}

export function emptyDiagram(z) {
  const boxes = {};
  for (const subshell of subshellsFor(z)) {
    boxes[subshell] = Array(boxCount(subshell)).fill(0);
  }
  return boxes;
}

export function createOrbitals(z = 8) {
  return {
    z,
    boxes: emptyDiagram(z),
    focus: { subshell: '1s', index: 0 },
    configText: '',
    message: '',
    tone: '',
    boxMisses: 0,
    configMisses: 0,
    revealed: false,
  };
}

export function cloneDiagram(boxes) {
  return Object.fromEntries(Object.entries(boxes).map(([key, row]) => [key, [...row]]));
}

export function electronsIn(boxes) {
  return Object.values(boxes).flat().reduce((sum, value) => sum + value, 0);
}

export function occupancy(boxes) {
  const map = {};
  for (const [subshell, row] of Object.entries(boxes)) {
    map[subshell] = row.reduce((sum, value) => sum + value, 0);
  }
  return map;
}

export function hundViolation(boxes) {
  for (const row of Object.values(boxes)) {
    if (row.some((value) => value >= 2) && row.some((value) => value === 0)) return true;
  }
  return false;
}

/**
 * Add one electron. Refuses a third electron in a box, and refuses a pair
 * while an empty box remains in that subshell.
 */
export function addElectron(boxes, subshell, index) {
  const next = cloneDiagram(boxes);
  const row = next[subshell];
  if (!row || row[index] == null) return { boxes, error: 'missing' };
  if (row[index] >= 2) return { boxes, error: 'pauli' };
  if (row[index] === 1 && row.some((value) => value === 0)) return { boxes, error: 'hund' };
  row[index] += 1;
  return { boxes: next, error: null };
}

export function removeElectron(boxes, subshell, index) {
  const next = cloneDiagram(boxes);
  if (next[subshell]?.[index]) next[subshell][index] -= 1;
  return next;
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

export function firstMismatch(boxes, z) {
  const target = groundOccupancy(z);
  for (const subshell of subshellsFor(z)) {
    const have = (boxes[subshell] ?? []).reduce((sum, value) => sum + value, 0);
    if (have !== (target[subshell] ?? 0)) return subshell;
  }
  for (const subshell of Object.keys(boxes)) {
    const have = (boxes[subshell] ?? []).reduce((sum, value) => sum + value, 0);
    if (have !== (target[subshell] ?? 0)) return subshell;
  }
  return null;
}

export function configurationText(z) {
  const map = groundOccupancy(z);
  return subshellsFor(z).map((subshell) => `${subshell}${map[subshell]}`).join(' ');
}

function exceptionNote(z) {
  if (z === 24) return 'Chromium is an exception: 4s1 3d5, not 4s2 3d4.';
  if (z === 29) return 'Copper is an exception: 4s1 3d10, not 4s2 3d9.';
  return '';
}

export function gradeDiagram(boxes, z) {
  const element = elementByZ(z);
  const symbol = element?.sym ?? String(z);
  const success = `${symbol} matches the ground state: ${configurationText(z)}.`;
  if (!firstMismatch(boxes, z) && !hundViolation(boxes)) {
    return { ok: true, success, hints: [success] };
  }
  const subshell = firstMismatch(boxes, z);
  const target = groundOccupancy(z);
  const hints = [];
  if (hundViolation(boxes)) {
    hints.push('Hund\'s rule: give every box in a subshell one electron before you pair any of them.');
  }
  if (subshell) {
    hints.push(`Check ${subshell}. Aufbau fills ${FILL_ORDER.join(', ')} in that order. ${symbol} has ${target[subshell] ?? 0} electrons in ${subshell}.`);
  }
  const note = exceptionNote(z);
  hints.push(note ? `${note} Full configuration: ${configurationText(z)}.` : `Full configuration: ${configurationText(z)}.`);
  return { ok: false, success, hints: hints.slice(0, 3) };
}

export function flattenConfig(text) {
  return String(text).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/g, (char) => SUPERSCRIPTS[char] ?? char);
}

export function parseConfig(text) {
  let raw = flattenConfig(text).trim();
  const noble = raw.match(/^\[(He|Ne|Ar)\]\s*/i);
  let expanded = '';
  if (noble) {
    const key = noble[1][0].toUpperCase() + noble[1].slice(1).toLowerCase();
    expanded = NOBLE[key] ?? '';
    raw = raw.slice(noble[0].length);
  }
  const source = `${expanded} ${raw}`;
  const map = {};
  const tokens = source.match(/(\d)\s*([spdf])\s*(\d+)/gi) ?? [];
  for (const token of tokens) {
    const match = token.match(/(\d)\s*([spdf])\s*(\d+)/i);
    const subshell = `${match[1]}${match[2].toLowerCase()}`;
    map[subshell] = (map[subshell] ?? 0) + Number(match[3]);
  }
  return map;
}

export function gradeConfig(text, z) {
  const parsed = parseConfig(text);
  const target = groundOccupancy(z);
  const element = elementByZ(z);
  const symbol = element?.sym ?? String(z);
  const success = `${symbol} is ${configurationText(z)}.`;
  if (!Object.keys(parsed).length) {
    return {
      ok: false,
      success,
      hints: [
        'Write subshells in order, like 1s2 2s2 2p4. Superscripts are fine.',
        'You can also start from a noble gas, like [Ne] 3s2.',
        success,
      ],
    };
  }
  const overflow = Object.entries(parsed).find(([subshell, count]) => count > subshellCapacity(subshell));
  if (overflow) {
    return {
      ok: false,
      success,
      hints: [
        `${overflow[0]} holds at most ${subshellCapacity(overflow[0])} electrons.`,
        `Aufbau order is ${FILL_ORDER.join(', ')}.`,
        success,
      ],
    };
  }
  const keys = [...new Set([...Object.keys(parsed), ...Object.keys(target)])];
  const miss = keys.find((key) => (parsed[key] ?? 0) !== (target[key] ?? 0));
  if (!miss) return { ok: true, success, hints: [success] };
  const note = exceptionNote(z);
  return {
    ok: false,
    success,
    hints: [
      `Check ${miss}. The ground state has ${target[miss] ?? 0} electrons there.`,
      note || `Fill lower subshells before higher ones: ${FILL_ORDER.join(', ')}.`,
      success,
    ],
  };
}

const SPIN = ['empty', 'one electron', 'two electrons'];

export function describeOrbitals(state) {
  const element = elementByZ(state.z);
  const rows = Object.entries(state.boxes).map(([subshell, row]) => (
    `${subshell}: ${row.map((value) => SPIN[value] ?? 'empty').join(', ')}`
  ));
  const placed = electronsIn(state.boxes);
  const hund = hundViolation(state.boxes)
    ? 'Hund\'s rule is not satisfied yet: a pair shares a subshell with an empty box.'
    : 'No subshell has a pair while an empty box is still open.';
  return [
    `Orbital filling for ${element?.name ?? 'an element'} (${element?.sym ?? state.z}), atomic number ${state.z}.`,
    `${placed} of ${state.z} electrons are in the boxes.`,
    rows.join('. ') + '.',
    hund,
    `Aufbau order on this board: ${Object.keys(state.boxes).join(', ')}.`,
    state.configText ? `Typed configuration: ${state.configText}.` : 'The configuration box is empty.',
    'The boxes stay still. Enter or a tap adds an electron. Backspace removes one. Arrow keys move between boxes. The buttons under the boxes do the same work.',
  ].join(' ');
}
