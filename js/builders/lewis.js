import { clamp, plural } from './util.js';

/** Elements a first-semester Lewis drawing needs. */
export const LEWIS_ELEMENTS = [
  { symbol: 'H', name: 'hydrogen', valence: 1, period: 1 },
  { symbol: 'B', name: 'boron', valence: 3, period: 2 },
  { symbol: 'C', name: 'carbon', valence: 4, period: 2 },
  { symbol: 'N', name: 'nitrogen', valence: 5, period: 2 },
  { symbol: 'O', name: 'oxygen', valence: 6, period: 2 },
  { symbol: 'F', name: 'fluorine', valence: 7, period: 2 },
  { symbol: 'P', name: 'phosphorus', valence: 5, period: 3 },
  { symbol: 'S', name: 'sulfur', valence: 6, period: 3 },
  { symbol: 'Cl', name: 'chlorine', valence: 7, period: 3 },
];

const BY_SYMBOL = new Map(LEWIS_ELEMENTS.map((element) => [element.symbol, element]));

export function elementInfo(symbol) {
  return BY_SYMBOL.get(symbol) ?? null;
}

export function valenceOf(symbol) {
  return elementInfo(symbol)?.valence ?? 0;
}

export function periodOf(symbol) {
  return elementInfo(symbol)?.period ?? 0;
}

/**
 * Guided targets. `atoms[center]` is the central atom.
 * `bonds` are [atomIndex, atomIndex, order]. `lone` is lone pairs per atom.
 */
export const LEWIS_CHALLENGES = [
  {
    id: 'H2',
    title: 'hydrogen',
    formula: 'H2',
    charge: 0,
    center: 0,
    atoms: ['H', 'H'],
    bonds: [[0, 1, 1]],
    lone: [0, 0],
    prompt: 'Build H₂. Join the two hydrogen atoms with one single bond. There are no lone pairs.',
    success: 'H₂ is a single bond. Each hydrogen has 2 electrons and formal charge 0.',
    solution: 'Each hydrogen brings 1 valence electron, so H₂ has 2. One single bond uses both. Each hydrogen has 2 electrons. Formal charge of each H is 1 − 0 lone-pair electrons − 1 bond = 0.',
  },
  {
    id: 'H2O',
    title: 'water',
    formula: 'H2O',
    charge: 0,
    center: 0,
    atoms: ['O', 'H', 'H'],
    bonds: [[0, 1, 1], [0, 2, 1]],
    lone: [2, 0, 0],
    prompt: 'Build water, H₂O. Put oxygen in the middle, use two single bonds, and put two lone pairs on oxygen.',
    success: 'Water matches. Oxygen has a full octet, each hydrogen has 2 electrons, and every formal charge is 0.',
    solution: 'Oxygen brings 6 valence electrons and each hydrogen brings 1, so water has 8. Two O–H single bonds use 4 electrons. The other 4 sit as two lone pairs on oxygen. Electrons around oxygen: 8. Formal charge of oxygen is 6 − 4 − 2 = 0. Each hydrogen is 1 − 0 − 1 = 0.',
  },
  {
    id: 'NH3',
    title: 'ammonia',
    formula: 'NH3',
    charge: 0,
    center: 0,
    atoms: ['N', 'H', 'H', 'H'],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]],
    lone: [1, 0, 0, 0],
    prompt: 'Build ammonia, NH₃. Nitrogen is in the middle with three single bonds and one lone pair.',
    success: 'Ammonia matches. Nitrogen has 8 electrons and formal charge 0.',
    solution: 'Nitrogen brings 5 valence electrons and three hydrogens bring 1 each, so ammonia has 8. Three N–H single bonds use 6 electrons. The last 2 are one lone pair on nitrogen. Formal charge of nitrogen is 5 − 2 − 3 = 0.',
  },
  {
    id: 'CH4',
    title: 'methane',
    formula: 'CH4',
    charge: 0,
    center: 0,
    atoms: ['C', 'H', 'H', 'H', 'H'],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
    lone: [0, 0, 0, 0, 0],
    prompt: 'Build methane, CH₄. Carbon is in the middle with four single bonds and no lone pairs.',
    success: 'Methane matches. Carbon has a full octet and formal charge 0.',
    solution: 'Carbon brings 4 valence electrons and four hydrogens bring 1 each, so methane has 8. Four C–H single bonds use all 8 electrons. Carbon has no lone pairs. Formal charge of carbon is 4 − 0 − 4 = 0.',
  },
  {
    id: 'CO2',
    title: 'carbon dioxide',
    formula: 'CO2',
    charge: 0,
    center: 0,
    atoms: ['C', 'O', 'O'],
    bonds: [[0, 1, 2], [0, 2, 2]],
    lone: [0, 2, 2],
    prompt: 'Build CO₂. Carbon is in the middle with a double bond to each oxygen. Each oxygen has two lone pairs.',
    success: 'Carbon dioxide matches. 16 valence electrons, full octets, and formal charges of 0.',
    solution: 'Carbon brings 4 valence electrons and each oxygen brings 6, so CO₂ has 16. Two C=O double bonds use 8 electrons. Each oxygen keeps two lone pairs, which uses the other 8. Formal charge of carbon is 4 − 0 − 4 = 0. Each oxygen is 6 − 4 − 2 = 0.',
  },
  {
    id: 'BF3',
    title: 'boron trifluoride',
    formula: 'BF3',
    charge: 0,
    center: 0,
    atoms: ['B', 'F', 'F', 'F'],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]],
    lone: [0, 3, 3, 3],
    prompt: 'Build BF₃. Boron is in the middle with three single bonds. Each fluorine has three lone pairs. Boron is content with 6 electrons.',
    success: 'BF₃ matches. Boron has 6 electrons, each fluorine has 8, and every formal charge is 0.',
    solution: 'Boron brings 3 valence electrons and each fluorine brings 7, so BF₃ has 24. Three B–F single bonds use 6 electrons. Each fluorine gets three lone pairs, which uses the other 18. Boron has 6 electrons. That incomplete octet is normal for boron here. Formal charge of boron is 3 − 0 − 3 = 0. Each fluorine is 7 − 6 − 1 = 0.',
  },
  {
    id: 'N2',
    title: 'nitrogen',
    formula: 'N2',
    charge: 0,
    center: 0,
    atoms: ['N', 'N'],
    bonds: [[0, 1, 3]],
    lone: [1, 1],
    prompt: 'Build N₂. Use a triple bond, and give each nitrogen one lone pair.',
    success: 'N₂ matches. A triple bond plus one lone pair on each nitrogen fills both octets.',
    solution: 'Each nitrogen brings 5 valence electrons, so N₂ has 10. A triple bond uses 6. Each nitrogen keeps one lone pair, which uses the other 4. Formal charge of each nitrogen is 5 − 2 − 3 = 0.',
  },
];

export function challengeById(id) {
  return LEWIS_CHALLENGES.find((challenge) => challenge.id === id) ?? LEWIS_CHALLENGES[1];
}

export function createLewis(challengeId = 'H2O') {
  return {
    atoms: [],
    bonds: [],
    lone: {},
    charge: challengeById(challengeId).charge,
    selected: null,
    partner: null,
    nextId: 1,
    challengeId,
    message: '',
    tone: '',
    misses: 0,
    revealed: false,
  };
}

export function slotPosition(index) {
  if (index === 0) return { x: 160, y: 132 };
  const angle = -Math.PI / 2 + (index - 1) * ((2 * Math.PI) / 5);
  return {
    x: clamp(Math.round(160 + Math.cos(angle) * 96), 36, 284),
    y: clamp(Math.round(132 + Math.sin(angle) * 78), 36, 244),
  };
}

export function addAtom(state, symbol) {
  if (!elementInfo(symbol)) return state;
  const id = state.nextId;
  const spot = slotPosition(state.atoms.length);
  return {
    ...state,
    nextId: id + 1,
    selected: id,
    partner: state.selected && state.selected !== id ? state.selected : state.partner,
    atoms: [...state.atoms, { id, symbol, x: spot.x, y: spot.y }],
    lone: { ...state.lone, [id]: 0 },
    message: '',
    tone: '',
  };
}

export function selectAtom(state, id) {
  const atom = state.atoms.find((item) => item.id === id);
  if (!atom) return state;
  const partner = state.selected && state.selected !== id ? state.selected : state.partner;
  return { ...state, selected: id, partner: partner === id ? null : partner };
}

export function moveAtom(state, id, dx, dy) {
  return {
    ...state,
    atoms: state.atoms.map((atom) => (
      atom.id === id
        ? { ...atom, x: clamp(atom.x + dx, 28, 292), y: clamp(atom.y + dy, 28, 252) }
        : atom
    )),
  };
}

export function removeAtom(state, id) {
  const atoms = state.atoms.filter((atom) => atom.id !== id);
  const lone = { ...state.lone };
  delete lone[id];
  return {
    ...state,
    atoms,
    lone,
    bonds: state.bonds.filter((bond) => bond.a !== id && bond.b !== id),
    selected: state.selected === id ? (atoms[0]?.id ?? null) : state.selected,
    partner: state.partner === id ? null : state.partner,
  };
}

export function maxLonePairs(symbol) {
  if (symbol === 'H') return 0;
  return 4;
}

export function setLonePairs(state, id, pairs) {
  const atom = state.atoms.find((item) => item.id === id);
  if (!atom) return state;
  const next = clamp(Math.round(pairs), 0, maxLonePairs(atom.symbol));
  return { ...state, lone: { ...state.lone, [id]: next }, selected: id };
}

export function bondBetween(state, a, b) {
  return state.bonds.find((bond) => (
    (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a)
  )) ?? null;
}

export function setBondOrder(state, a, b, order) {
  if (a == null || b == null || a === b) return state;
  const existing = bondBetween(state, a, b);
  const nextOrder = clamp(Math.round(order), 0, 3);
  if (!nextOrder) {
    return { ...state, bonds: state.bonds.filter((bond) => bond !== existing) };
  }
  if (!existing) {
    const id = state.bonds.reduce((max, bond) => Math.max(max, bond.id), 0) + 1;
    return { ...state, bonds: [...state.bonds, { id, a, b, order: nextOrder }] };
  }
  return {
    ...state,
    bonds: state.bonds.map((bond) => (bond === existing ? { ...bond, order: nextOrder } : bond)),
  };
}

export function cycleBond(state, bondId) {
  const bond = state.bonds.find((item) => item.id === bondId);
  if (!bond) return state;
  const order = bond.order >= 3 ? 1 : bond.order + 1;
  return setBondOrder(state, bond.a, bond.b, order);
}

export function raiseBond(state, a, b) {
  const existing = bondBetween(state, a, b);
  const order = existing ? Math.min(3, existing.order + 1) : 1;
  return setBondOrder(state, a, b, order);
}

export function bondSum(state, id) {
  return state.bonds.reduce((sum, bond) => (
    sum + ((bond.a === id || bond.b === id) ? bond.order : 0)
  ), 0);
}

export function lonePairsOf(state, id) {
  return state.lone[id] ?? 0;
}

export function formalCharge(state, atom) {
  return valenceOf(atom.symbol) - 2 * lonePairsOf(state, atom.id) - bondSum(state, atom.id);
}

export function electronsAround(state, atom) {
  return 2 * (bondSum(state, atom.id) + lonePairsOf(state, atom.id));
}

export function availableElectrons(state) {
  const valence = state.atoms.reduce((sum, atom) => sum + valenceOf(atom.symbol), 0);
  return valence - state.charge;
}

export function usedElectrons(state) {
  const bonded = state.bonds.reduce((sum, bond) => sum + bond.order, 0);
  const lone = state.atoms.reduce((sum, atom) => sum + lonePairsOf(state, atom.id), 0);
  return 2 * bonded + 2 * lone;
}

/** 'ok', 'short', or 'over'. Boron may stop at 6. Period 3 may hold 8, 10, or 12. */
export function octetStatus(symbol, electrons) {
  if (symbol === 'H') {
    if (electrons === 2) return 'ok';
    return electrons < 2 ? 'short' : 'over';
  }
  if (symbol === 'B') {
    if (electrons === 6 || electrons === 8) return 'ok';
    return electrons < 6 ? 'short' : 'over';
  }
  if (periodOf(symbol) <= 2) {
    if (electrons === 8) return 'ok';
    return electrons < 8 ? 'short' : 'over';
  }
  if (electrons >= 8 && electrons <= 12 && electrons % 2 === 0) return 'ok';
  return electrons < 8 ? 'short' : 'over';
}

function octetHint(symbol, electrons, status) {
  const name = elementInfo(symbol)?.name ?? symbol;
  if (symbol === 'H') {
    return status === 'short'
      ? `${name} needs one single bond so it has 2 electrons.`
      : `${name} should have only 2 electrons. Remove the extra bond or lone pair.`;
  }
  if (symbol === 'B' && electrons < 6) {
    return 'Boron in BF₃ is stable with 6 electrons. Add bonds until it has 6.';
  }
  if (status === 'short') {
    return `${name} has ${electrons} electrons around it. Add lone pairs or a higher bond order until it has a full octet.`;
  }
  return `${name} has ${electrons} electrons around it. That is too many for this atom. Lower a bond order or remove a lone pair.`;
}

export function auditLewis(state) {
  const available = availableElectrons(state);
  const used = usedElectrons(state);
  const formal = state.atoms.map((atom) => ({
    id: atom.id,
    symbol: atom.symbol,
    charge: formalCharge(state, atom),
  }));
  const octets = state.atoms.map((atom) => {
    const electrons = electronsAround(state, atom);
    return { id: atom.id, symbol: atom.symbol, electrons, status: octetStatus(atom.symbol, electrons) };
  });
  const issues = [];
  if (!state.atoms.length) {
    issues.push({ code: 'empty', hint: 'Add atoms first. Then add bonds and lone pairs.' });
  }
  if (state.atoms.length && used !== available) {
    issues.push({
      code: 'electrons',
      hint: `These atoms supply ${available} valence electrons (the charge is already counted). The drawing uses ${used}. Each bond line is 2 electrons and each lone pair is 2.`,
    });
  }
  for (const row of octets) {
    if (row.status !== 'ok') {
      issues.push({ code: 'octet', hint: octetHint(row.symbol, row.electrons, row.status) });
    }
  }
  const formalSum = formal.reduce((sum, row) => sum + row.charge, 0);
  if (state.atoms.length && formalSum !== state.charge) {
    issues.push({
      code: 'formal',
      hint: `Formal charges add to ${formalSum}, but the overall charge is ${state.charge}. Formal charge = valence electrons − lone-pair electrons − number of bonds.`,
    });
  }
  return { ok: issues.length === 0, issues, available, used, formal, octets, formalSum };
}

function symbolCounts(symbols) {
  const counts = {};
  for (const symbol of symbols) counts[symbol] = (counts[symbol] ?? 0) + 1;
  return counts;
}

function permutations(items) {
  if (items.length <= 1) return [items];
  const out = [];
  for (let index = 0; index < items.length; index += 1) {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of permutations(rest)) out.push([items[index], ...tail]);
  }
  return out;
}

export function matchesReference(state, challenge) {
  if (state.charge !== challenge.charge) return false;
  if (state.atoms.length !== challenge.atoms.length) return false;
  if (state.bonds.length !== challenge.bonds.length) return false;
  const slots = challenge.atoms.map((_, index) => index);
  for (const perm of permutations(slots)) {
    let aligned = true;
    for (let index = 0; index < state.atoms.length; index += 1) {
      const atom = state.atoms[index];
      if (atom.symbol !== challenge.atoms[perm[index]]) {
        aligned = false;
        break;
      }
      if (lonePairsOf(state, atom.id) !== challenge.lone[perm[index]]) {
        aligned = false;
        break;
      }
    }
    if (!aligned) continue;
    const key = (left, right, order) => `${Math.min(left, right)}:${Math.max(left, right)}:${order}`;
    const have = new Set(state.bonds.map((bond) => {
      const left = state.atoms.findIndex((atom) => atom.id === bond.a);
      const right = state.atoms.findIndex((atom) => atom.id === bond.b);
      return key(perm[left], perm[right], bond.order);
    }));
    const need = challenge.bonds.map(([left, right, order]) => key(left, right, order));
    if (have.size === need.length && need.every((item) => have.has(item))) return true;
  }
  return false;
}

function inventoryHint(state, challenge) {
  const have = symbolCounts(state.atoms.map((atom) => atom.symbol));
  const need = symbolCounts(challenge.atoms);
  const symbols = [...new Set([...Object.keys(have), ...Object.keys(need)])];
  for (const symbol of symbols) {
    if ((have[symbol] ?? 0) !== (need[symbol] ?? 0)) {
      const name = elementInfo(symbol)?.name ?? symbol;
      return `${challenge.title} needs ${plural(need[symbol] ?? 0, name)}. The board has ${have[symbol] ?? 0}.`;
    }
  }
  return '';
}

function bondHint(state, challenge) {
  const centerSymbol = challenge.atoms[challenge.center];
  const expected = challenge.bonds.filter(([left, right]) => (
    left === challenge.center || right === challenge.center
  )).length;
  const centers = state.atoms.filter((atom) => atom.symbol === centerSymbol);
  const ready = centers.some((atom) => (
    state.bonds.filter((bond) => bond.a === atom.id || bond.b === atom.id).length === expected
  ));
  if (!ready) {
    return `Put ${centerSymbol} in the middle with ${plural(expected, 'bond')}.`;
  }
  const wanted = challenge.bonds.map((bond) => bond[2]).sort().join('');
  const drawn = state.bonds.map((bond) => bond.order).sort().join('');
  if (wanted !== drawn) {
    return 'Check the bond orders. One line is a single bond, two lines a double bond, three lines a triple bond.';
  }
  return '';
}

function loneHint(state, challenge) {
  const needed = {};
  challenge.atoms.forEach((symbol, index) => {
    needed[symbol] = needed[symbol] ?? [];
    needed[symbol].push(challenge.lone[index]);
  });
  for (const [symbol, pairs] of Object.entries(needed)) {
    const have = state.atoms
      .filter((atom) => atom.symbol === symbol)
      .map((atom) => lonePairsOf(state, atom.id))
      .sort((a, b) => a - b);
    const want = [...pairs].sort((a, b) => a - b);
    if (have.join() !== want.join()) {
      return `Check lone pairs on ${symbol}. A lone pair is 2 electrons that are not in a bond.`;
    }
  }
  return '';
}

export function gradeLewis(state, challenge = challengeById(state.challengeId)) {
  const audit = auditLewis(state);
  if (matchesReference(state, challenge)) {
    return {
      ok: true,
      code: 'ok',
      success: challenge.success,
      hints: [challenge.solution],
      audit,
    };
  }
  const hints = [];
  if (state.charge !== challenge.charge) {
    hints.push(`Set the overall charge to ${challenge.charge}.`);
  }
  const inventory = inventoryHint(state, challenge);
  if (inventory) hints.push(inventory);
  if (state.atoms.length && audit.used !== audit.available) {
    hints.push(audit.issues.find((issue) => issue.code === 'electrons')?.hint
      ?? 'Count the valence electrons again.');
  }
  const bonds = bondHint(state, challenge);
  if (bonds) hints.push(bonds);
  const lone = loneHint(state, challenge);
  if (lone) hints.push(lone);
  const octet = audit.issues.find((issue) => issue.code === 'octet');
  if (octet) hints.push(octet.hint);
  const formal = audit.issues.find((issue) => issue.code === 'formal');
  if (formal) hints.push(formal.hint);
  const specific = [...new Set(hints)].filter((hint) => hint !== challenge.solution);
  const first = specific[0] || 'Compare the drawing with the sentence at the top.';
  const second = specific[1] || 'Check the center atom, the bond orders, and the lone pairs. Formal charge = valence electrons − lone-pair electrons − bonds.';
  return { ok: false, code: 'miss', success: challenge.success, hints: [first, second, challenge.solution], audit };
}

export function stateFromChallenge(challenge) {
  let state = { ...createLewis(challenge.id), charge: challenge.charge, atoms: [], bonds: [], lone: {} };
  const ids = [];
  for (const symbol of challenge.atoms) {
    state = addAtom(state, symbol);
    ids.push(state.selected);
  }
  const lone = {};
  challenge.lone.forEach((pairs, index) => {
    lone[ids[index]] = pairs;
  });
  const bonds = challenge.bonds.map(([left, right, order], index) => ({
    id: index + 1,
    a: ids[left],
    b: ids[right],
    order,
  }));
  return {
    ...state,
    lone,
    bonds,
    selected: ids[challenge.center] ?? ids[0] ?? null,
    partner: ids[1] ?? null,
  };
}

export function chargeText(value) {
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}

export function bondPhrase(order) {
  if (order === 2) return 'double';
  if (order === 3) return 'triple';
  return 'single';
}

export function describeLewis(state, motion = 'still') {
  const challenge = challengeById(state.challengeId);
  const audit = auditLewis(state);
  const sentences = [
    `Lewis builder for ${challenge.title} (${challenge.formula}). ${challenge.prompt}`,
  ];
  if (!state.atoms.length) {
    sentences.push('No atoms are on the board yet.');
  } else {
    const listed = state.atoms.map((atom) => atom.symbol).join(', ');
    sentences.push(`Atoms on the board: ${listed}.`);
    if (state.bonds.length) {
      const bonds = state.bonds.map((bond) => {
        const left = state.atoms.find((atom) => atom.id === bond.a);
        const right = state.atoms.find((atom) => atom.id === bond.b);
        return `${left?.symbol ?? '?'}–${right?.symbol ?? '?'} ${bondPhrase(bond.order)}`;
      });
      sentences.push(`Bonds: ${bonds.join(', ')}.`);
    } else {
      sentences.push('No bonds yet.');
    }
    const pairs = state.atoms.map((atom) => `${atom.symbol} ${lonePairsOf(state, atom.id)}`);
    sentences.push(`Lone pairs: ${pairs.join(', ')}.`);
    sentences.push(`Valence electrons placed: ${audit.used} of ${audit.available}. Overall charge ${chargeText(state.charge)}.`);
    if (audit.formal.length) {
      const charges = audit.formal.map((row) => `${row.symbol} ${chargeText(row.charge)}`);
      sentences.push(`Formal charges: ${charges.join(', ')}.`);
    }
    if (audit.octets.length) {
      const octets = audit.octets.map((row) => `${row.symbol} ${row.electrons} electrons (${row.status})`);
      sentences.push(`Octet check: ${octets.join(', ')}.`);
    }
  }
  const selected = state.atoms.find((atom) => atom.id === state.selected);
  if (selected) sentences.push(`${selected.symbol} is selected.`);
  sentences.push(motion === 'still'
    ? 'The picture is still. Tab reaches every control. Arrow keys move the selected atom. Dragging one atom onto another draws a bond; the Bond partner buttons do the same from the keyboard.'
    : 'The picture is still. Dragging moves atoms. The keyboard buttons do the same work.');
  return sentences.join(' ');
}

export function bondSegment(a, b, pad = 22) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  return {
    x1: a.x + ux * pad,
    y1: a.y + uy * pad,
    x2: b.x - ux * pad,
    y2: b.y - uy * pad,
  };
}
