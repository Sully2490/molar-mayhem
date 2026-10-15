import { ELEMENTS } from '../elements.js';

const BY_SYMBOL = new Map(ELEMENTS.map((element) => [element.sym, element]));

/** Valence electrons used for Lewis structures and formal charge. */
export const VALENCE = {
  H: 1, He: 2, Li: 1, Be: 2, B: 3, C: 4, N: 5, O: 6, F: 7, Ne: 8,
  Na: 1, Mg: 2, Al: 3, Si: 4, P: 5, S: 6, Cl: 7, Ar: 8,
  K: 1, Ca: 2, Br: 7, I: 7, Xe: 8, Se: 6,
};

export const PLANCK = 6.626e-34;
export const SPEED = 2.998e8;
export const RYDBERG_J = 2.179e-18;

export const LAB_TOOLS = [
  { id: 'lewis', label: 'Lewis builder' },
  { id: 'wave', label: 'EM wave' },
  { id: 'standing', label: 'Standing waves' },
  { id: 'levels', label: 'H energy levels' },
  { id: 'orbitals', label: 'Orbital pictures' },
  { id: 'boxes', label: 'Orbital boxes' },
  { id: 'vsepr', label: 'VSEPR viewer' },
  { id: 'ionic', label: 'Ionic formulas' },
  { id: 'tray', label: 'Periodic table' },
];

export function toolById(id) {
  return LAB_TOOLS.find((tool) => tool.id === id) ?? LAB_TOOLS[0];
}

export function elementBySymbol(symbol) {
  return BY_SYMBOL.get(symbol) ?? null;
}

export function valenceOf(symbol) {
  return VALENCE[symbol] ?? null;
}

export function periodOf(symbol) {
  return elementBySymbol(symbol)?.period ?? 0;
}

export function enOf(symbol) {
  return elementBySymbol(symbol)?.en ?? 0;
}

/** @typedef {{ id: string, formula: string, name: string, charge: number, skeleton: [string, number][], geo: { eg: string, mg: string, ang: string, pol: string | null, about?: string }, note?: string }} Molecule */

/** @type {Molecule[]} */
export const MOLECULES = [
  { id: 'H2O', formula: 'H2O', name: 'water', charge: 0, skeleton: [['O', -1], ['H', 0], ['H', 0]], geo: { eg: 'tetrahedral', mg: 'bent', ang: '<109.5', pol: 'polar' } },
  { id: 'NH3', formula: 'NH3', name: 'ammonia', charge: 0, skeleton: [['N', -1], ['H', 0], ['H', 0], ['H', 0]], geo: { eg: 'tetrahedral', mg: 'trigonal pyramidal', ang: '<109.5', pol: 'polar' } },
  { id: 'CH4', formula: 'CH4', name: 'methane', charge: 0, skeleton: [['C', -1], ['H', 0], ['H', 0], ['H', 0], ['H', 0]], geo: { eg: 'tetrahedral', mg: 'tetrahedral', ang: '109.5', pol: 'nonpolar' } },
  { id: 'CO2', formula: 'CO2', name: 'carbon dioxide', charge: 0, skeleton: [['C', -1], ['O', 0], ['O', 0]], geo: { eg: 'linear', mg: 'linear', ang: '180', pol: 'nonpolar' } },
  { id: 'HCN', formula: 'HCN', name: 'hydrogen cyanide', charge: 0, skeleton: [['C', -1], ['H', 0], ['N', 0]], geo: { eg: 'linear', mg: 'linear', ang: '180', pol: 'polar' } },
  { id: 'BF3', formula: 'BF3', name: 'boron trifluoride', charge: 0, skeleton: [['B', -1], ['F', 0], ['F', 0], ['F', 0]], geo: { eg: 'trigonal planar', mg: 'trigonal planar', ang: '120', pol: 'nonpolar' }, note: 'Boron is content with 6 electrons here.' },
  { id: 'BeCl2', formula: 'BeCl2', name: 'beryllium chloride', charge: 0, skeleton: [['Be', -1], ['Cl', 0], ['Cl', 0]], geo: { eg: 'linear', mg: 'linear', ang: '180', pol: 'nonpolar' }, note: 'Beryllium is content with 4 electrons here.' },
  { id: 'PCl5', formula: 'PCl5', name: 'phosphorus pentachloride', charge: 0, skeleton: [['P', -1], ['Cl', 0], ['Cl', 0], ['Cl', 0], ['Cl', 0], ['Cl', 0]], geo: { eg: 'trigonal bipyramidal', mg: 'trigonal bipyramidal', ang: '90 and 120', pol: 'nonpolar' }, note: 'Phosphorus is in period 3, so it can hold 10 electrons.' },
  { id: 'SF4', formula: 'SF4', name: 'sulfur tetrafluoride', charge: 0, skeleton: [['S', -1], ['F', 0], ['F', 0], ['F', 0], ['F', 0]], geo: { eg: 'trigonal bipyramidal', mg: 'seesaw', ang: '<90 and <120', pol: 'polar' }, note: 'Sulfur expands its octet.' },
  { id: 'SF6', formula: 'SF6', name: 'sulfur hexafluoride', charge: 0, skeleton: [['S', -1], ['F', 0], ['F', 0], ['F', 0], ['F', 0], ['F', 0], ['F', 0]], geo: { eg: 'octahedral', mg: 'octahedral', ang: '90', pol: 'nonpolar' }, note: 'Sulfur holds 12 electrons.' },
  { id: 'XeF4', formula: 'XeF4', name: 'xenon tetrafluoride', charge: 0, skeleton: [['Xe', -1], ['F', 0], ['F', 0], ['F', 0], ['F', 0]], geo: { eg: 'octahedral', mg: 'square planar', ang: '90', pol: 'nonpolar' }, note: 'Xenon holds 12 electrons.' },
  { id: 'O3', formula: 'O3', name: 'ozone', charge: 0, skeleton: [['O', -1], ['O', 0], ['O', 0]], geo: { eg: 'trigonal planar', mg: 'bent', ang: '<120', pol: 'polar' } },
  { id: 'NO3', formula: 'NO3', name: 'nitrate', charge: -1, skeleton: [['N', -1], ['O', 0], ['O', 0], ['O', 0]], geo: { eg: 'trigonal planar', mg: 'trigonal planar', ang: '120', pol: null } },
  { id: 'SO4', formula: 'SO4', name: 'sulfate', charge: -2, skeleton: [['S', -1], ['O', 0], ['O', 0], ['O', 0], ['O', 0]], geo: { eg: 'tetrahedral', mg: 'tetrahedral', ang: '109.5', pol: null }, note: 'A period-3 sulfur can share more than 8 electrons, which keeps the formal charges small.' },
  { id: 'C2H4', formula: 'C2H4', name: 'ethene', charge: 0, skeleton: [['C', -1], ['C', 0], ['H', 0], ['H', 0], ['H', 1], ['H', 1]], geo: { eg: 'trigonal planar', mg: 'trigonal planar', ang: '120', pol: 'nonpolar', about: 'each carbon' } },
];

export function moleculeById(id) {
  return MOLECULES.find((molecule) => molecule.id === id) ?? MOLECULES[0];
}

export function formulaCount(formula) {
  const counts = {};
  const parts = String(formula).match(/[A-Z][a-z]?\d*/g) ?? [];
  for (const part of parts) {
    const match = part.match(/([A-Z][a-z]?)(\d*)/);
    counts[match[1]] = (counts[match[1]] || 0) + (Number(match[2]) || 1);
  }
  return counts;
}

export function totalValence(molecule) {
  return Object.entries(formulaCount(molecule.formula))
    .reduce((sum, [symbol, count]) => sum + valenceOf(symbol) * count, 0) - molecule.charge;
}

export function chargeLabel(charge) {
  if (!charge) return '';
  const size = Math.abs(charge);
  const mark = charge < 0 ? '−' : '+';
  return `${size === 1 ? '' : size}${mark}`;
}

function isCentral(skeleton, index) {
  return skeleton.some((atom) => atom[1] === index);
}

/**
 * Best Lewis placement: outer atoms finish an octet, then central atoms.
 * Prefers the smallest sum of |formal charge|, then negative charge on the
 * more electronegative atom.
 */
export function solveReference(molecule) {
  const skeleton = molecule.skeleton;
  const count = skeleton.length;
  const bonds = skeleton.map((atom, index) => [atom[1], index]).filter((bond) => bond[0] >= 0);
  const total = totalValence(molecule);
  let best = null;
  let matches = [];

  const visit = (index, orders) => {
    if (index === bonds.length) {
      const bondSums = Array(count).fill(0);
      bonds.forEach((bond, bondIndex) => {
        bondSums[bond[0]] += orders[bondIndex];
        bondSums[bond[1]] += orders[bondIndex];
      });
      let left = total - 2 * orders.reduce((sum, order) => sum + order, 0);
      if (left < 0) return;
      const lonePairs = Array(count).fill(0);
      for (let atom = 0; atom < count; atom += 1) {
        if (isCentral(skeleton, atom)) continue;
        const symbol = skeleton[atom][0];
        const need = symbol === 'H' ? 2 : 8;
        const electrons = need - 2 * bondSums[atom];
        if (electrons < 0 || electrons % 2) return;
        lonePairs[atom] = electrons / 2;
        left -= electrons;
      }
      if (left < 0 || left % 2) return;
      const centrals = skeleton.map((_, atom) => atom).filter((atom) => isCentral(skeleton, atom));
      for (const atom of centrals) {
        const symbol = skeleton[atom][0];
        const want = periodOf(symbol) <= 2 ? Math.max(0, 8 - 2 * bondSums[atom]) : left;
        const give = Math.min(left, want - (want % 2));
        lonePairs[atom] += give / 2;
        left -= give;
      }
      if (left) return;
      for (let atom = 0; atom < count; atom += 1) {
        const symbol = skeleton[atom][0];
        const electrons = 2 * (bondSums[atom] + lonePairs[atom]);
        const period = periodOf(symbol);
        if (symbol === 'H' && electrons !== 2) return;
        if (symbol !== 'H' && period <= 2 && symbol !== 'B' && symbol !== 'Be' && electrons !== 8) return;
        if ((symbol === 'B' || symbol === 'Be') && electrons > 8) return;
        if (period > 2 && electrons < 8) return;
      }
      const formal = skeleton.map((atom, atomIndex) => valenceOf(atom[0]) - 2 * lonePairs[atomIndex] - bondSums[atomIndex]);
      if (formal.reduce((sum, value) => sum + value, 0) !== molecule.charge) return;
      const magnitude = formal.reduce((sum, value) => sum + Math.abs(value), 0);
      const placement = Number(formal.reduce((sum, value, atomIndex) => (
        sum + Math.max(0, -value) * (4 - enOf(skeleton[atomIndex][0]))
      ), 0).toFixed(3));
      const solution = { orders: [...orders], lonePairs, formal, magnitude, placement };
      if (!best || magnitude < best.magnitude || (magnitude === best.magnitude && placement < best.placement)) {
        best = solution;
        matches = [solution];
      } else if (magnitude === best.magnitude && placement === best.placement) {
        matches.push(solution);
      }
      return;
    }
    for (const order of [1, 2, 3]) visit(index + 1, [...orders, order]);
  };

  visit(0, []);
  if (!best) return null;
  return { ...best, bonds, count: matches.length };
}

const referenceCache = new Map();

export function referenceFor(molecule) {
  if (!referenceCache.has(molecule.id)) referenceCache.set(molecule.id, solveReference(molecule));
  return referenceCache.get(molecule.id);
}

export function blankLewis() {
  return {
    atoms: [
      { id: 0, el: null, parent: -1, lp: 0 },
      { id: 1, el: null, parent: 0, lp: 0 },
    ],
    orders: { 1: 1 },
    selected: { kind: 'atom', id: 0 },
    showFormalCharge: true,
    showElectrons: false,
    message: '',
    messageTone: '',
    badIds: [],
  };
}

export function cloneLewis(state) {
  return {
    ...state,
    atoms: state.atoms.map((atom) => ({ ...atom })),
    orders: { ...state.orders },
    selected: state.selected ? { ...state.selected } : null,
    badIds: [...(state.badIds ?? [])],
  };
}

export function atomById(state, id) {
  return state.atoms.find((atom) => atom.id === id) ?? null;
}

export function childAtoms(state, id) {
  return state.atoms.filter((atom) => atom.parent === id);
}

export function degreeOf(state, id) {
  const atom = atomById(state, id);
  if (!atom) return 0;
  return childAtoms(state, id).length + (atom.parent >= 0 ? 1 : 0);
}

export function bondsOf(state, id) {
  const atom = atomById(state, id);
  const bonds = childAtoms(state, id).map((child) => ({ parent: id, child: child.id, order: state.orders[child.id] }));
  if (atom?.parent >= 0) bonds.push({ parent: atom.parent, child: id, order: state.orders[id] });
  return bonds;
}

export function bondSum(state, id) {
  return bondsOf(state, id).reduce((sum, bond) => sum + bond.order, 0);
}

export function formalChargeOf(state, atom) {
  if (!atom?.el) return null;
  return valenceOf(atom.el) - 2 * atom.lp - bondSum(state, atom.id);
}

export function electronsAround(state, atom) {
  return 2 * (bondSum(state, atom.id) + atom.lp);
}

export function electronsUsed(state) {
  const bonded = Object.values(state.orders).reduce((sum, order) => sum + order, 0);
  const lone = state.atoms.reduce((sum, atom) => sum + atom.lp, 0);
  return 2 * bonded + 2 * lone;
}

export function maxLoneElectrons(state, atom) {
  if (!atom) return 0;
  if (atom.el === 'H') return 0;
  return Math.min(8, 2 * Math.max(0, 6 - degreeOf(state, atom.id)));
}

function connectivityKey(entries) {
  return entries
    .map((entry) => `${entry.el}:${[...entry.neighbors].sort().join(',')}`)
    .sort()
    .join('|');
}

function referenceKey(molecule) {
  return connectivityKey(molecule.skeleton.map((atom, index) => ({
    el: atom[0],
    neighbors: molecule.skeleton
      .filter((other, otherIndex) => otherIndex === atom[1] || other[1] === index)
      .map((other) => other[0]),
  })));
}

function drawingKey(state) {
  return connectivityKey(state.atoms.map((atom) => ({
    el: atom.el,
    neighbors: bondsOf(state, atom.id).map((bond) => {
      const otherId = bond.parent === atom.id ? bond.child : bond.parent;
      return atomById(state, otherId)?.el;
    }),
  })));
}

export function stateFromSolution(molecule, solution = referenceFor(molecule)) {
  const atoms = molecule.skeleton.map((atom, id) => ({
    id,
    el: atom[0],
    parent: atom[1],
    lp: solution.lonePairs[id],
  }));
  const orders = {};
  solution.bonds.forEach((bond, index) => {
    orders[bond[1]] = solution.orders[index];
  });
  return {
    ...blankLewis(),
    atoms,
    orders,
    showFormalCharge: true,
    selected: { kind: 'atom', id: 0 },
  };
}

/**
 * @returns {{ stage: string, messages: string[], badIds: number[] }}
 */
export function auditLewis(state, molecule) {
  const blanks = state.atoms.filter((atom) => !atom.el);
  if (blanks.length) {
    return {
      stage: 'blank',
      messages: [`${blanks.length === 1 ? 'One atom is' : `${blanks.length} atoms are`} still empty. Choose an element for each dark atom.`],
      badIds: blanks.map((atom) => atom.id),
    };
  }
  const needed = formulaCount(molecule.formula);
  const have = {};
  for (const atom of state.atoms) have[atom.el] = (have[atom.el] || 0) + 1;
  const sameCounts = JSON.stringify(Object.entries(needed).sort()) === JSON.stringify(Object.entries(have).sort());
  if (!sameCounts) {
    const needText = Object.entries(needed).map(([symbol, count]) => `${count} ${symbol}`).join(', ');
    const haveText = Object.entries(have).map(([symbol, count]) => `${count} ${symbol}`).join(', ');
    return {
      stage: 'atoms',
      messages: [`${molecule.name} needs ${needText}. This drawing has ${haveText}.`],
      badIds: [],
    };
  }
  if (drawingKey(state) !== referenceKey(molecule)) {
    const center = molecule.skeleton[0][0];
    return {
      stage: 'skeleton',
      messages: [`The atoms are not joined in the usual way. Put ${center} in the middle, then attach the other atoms.`],
      badIds: [],
    };
  }
  const used = electronsUsed(state);
  const neededElectrons = totalValence(molecule);
  const messages = [];
  const badIds = [];
  if (used !== neededElectrons) {
    messages.push(used < neededElectrons
      ? `${used} of ${neededElectrons} valence electrons are placed. Add ${neededElectrons - used} more.`
      : `${used} electrons are placed, but only ${neededElectrons} are available. Remove ${used - neededElectrons}.`);
  }
  for (const atom of state.atoms) {
    const electrons = electronsAround(state, atom);
    const period = periodOf(atom.el);
    let problem = '';
    if (atom.el === 'H' && electrons !== 2) problem = `Hydrogen has ${electrons} electrons. It needs exactly 2.`;
    else if ((atom.el === 'B' || atom.el === 'Be') && electrons > 8) problem = `${atom.el} has too many electrons.`;
    else if (atom.el !== 'H' && atom.el !== 'B' && atom.el !== 'Be' && period <= 2 && electrons !== 8) {
      problem = `${atom.el} has ${electrons} electrons. A period-2 atom needs 8.`;
    } else if (period > 2 && electrons < 8) {
      problem = `${atom.el} has only ${electrons} electrons. It needs at least 8.`;
    }
    if (problem) {
      messages.push(problem);
      badIds.push(atom.id);
    }
  }
  if (messages.length) return { stage: 'octet', messages, badIds };
  const reference = referenceFor(molecule);
  const magnitude = state.atoms.reduce((sum, atom) => sum + Math.abs(formalChargeOf(state, atom)), 0);
  if (reference && magnitude > reference.magnitude) {
    return {
      stage: 'charge',
      messages: [`The atoms satisfy the counts, but the formal charges add to ${magnitude}. A structure with ${reference.magnitude} is possible. Turn a lone pair into a multiple bond.`],
      badIds: state.atoms.filter((atom) => formalChargeOf(state, atom)).map((atom) => atom.id),
    };
  }
  const placement = Number(state.atoms.reduce((sum, atom) => (
    sum + Math.max(0, -(formalChargeOf(state, atom) ?? 0)) * (4 - enOf(atom.el))
  ), 0).toFixed(3));
  if (reference && magnitude === reference.magnitude && placement > reference.placement + 0.001) {
    return {
      stage: 'charge',
      messages: ['A better drawing puts the negative formal charge on the atom that pulls electrons more strongly.'],
      badIds: state.atoms.filter((atom) => (formalChargeOf(state, atom) ?? 0) < 0).map((atom) => atom.id),
    };
  }
  return { stage: 'ok', messages: [], badIds: [] };
}

export function hintFor(stage, state, molecule) {
  const tips = {
    blank: `Start with ${molecule.skeleton[0][0]} as the center atom. Select a dark atom, then choose its element.`,
    atoms: `This formula uses ${Object.entries(formulaCount(molecule.formula)).map(([symbol, count]) => `${count} ${symbol}`).join(', ')}.`,
    skeleton: `Join the atoms the way ${molecule.name} is built: ${molecule.skeleton[0][0]} in the center.`,
    octet: electronsUsed(state) < totalValence(molecule)
      ? 'Select an outer atom and raise its lone-pair electrons until the count matches. Hydrogen gets none.'
      : 'Too many electrons. Lower the lone pairs on the center atom, or lower a bond from triple to double.',
    charge: 'Formal charge = valence electrons − lone-pair electrons − bonding pairs. Make those charges as small as you can.',
    ok: 'The structure matches. Formal charges are on the atoms.',
  };
  return tips[stage] ?? 'Select an atom or a bond and adjust the sliders.';
}

export function applyLewis(state, action) {
  const next = cloneLewis(state);
  next.message = '';
  next.messageTone = '';
  next.badIds = [];
  if (action.type === 'select') {
    next.selected = action.target;
    return next;
  }
  if (action.type === 'reset') return blankLewis();
  if (action.type === 'toggle') {
    next[action.flag] = !next[action.flag];
    return next;
  }
  if (action.type === 'element') {
    const atom = atomById(next, action.id);
    if (atom) {
      atom.el = action.el;
      if (atom.el === 'H') atom.lp = 0;
      const cap = maxLoneElectrons(next, atom) / 2;
      if (atom.lp > cap) atom.lp = cap;
    }
    return next;
  }
  if (action.type === 'degree') {
    return setDegree(next, action.id, action.degree);
  }
  if (action.type === 'lonePairs') {
    const atom = atomById(next, action.id);
    if (atom) atom.lp = action.pairs;
    return next;
  }
  if (action.type === 'bondOrder') {
    if (next.orders[action.id] != null) next.orders[action.id] = action.order;
    return next;
  }
  if (action.type === 'note') {
    next.message = action.message;
    next.messageTone = action.tone;
    next.badIds = action.badIds ?? [];
    return next;
  }
  return next;
}

function setDegree(state, id, want) {
  let guard = 0;
  while (degreeOf(state, id) < want && guard < 8) {
    const nextId = Math.max(...state.atoms.map((atom) => atom.id)) + 1;
    state.atoms.push({ id: nextId, el: null, parent: id, lp: 0 });
    state.orders[nextId] = 1;
    guard += 1;
  }
  guard = 0;
  while (degreeOf(state, id) > want && guard < 8) {
    const leaves = childAtoms(state, id)
      .filter((child) => !childAtoms(state, child.id).length)
      .sort((a, b) => (a.el ? 1 : 0) - (b.el ? 1 : 0));
    const leaf = leaves[0];
    if (!leaf) break;
    state.atoms = state.atoms.filter((atom) => atom.id !== leaf.id);
    delete state.orders[leaf.id];
    if (state.selected?.id === leaf.id) state.selected = { kind: 'atom', id };
    guard += 1;
  }
  const atom = atomById(state, id);
  const cap = maxLoneElectrons(state, atom) / 2;
  if (atom && atom.lp > cap) atom.lp = cap;
  return state;
}

export function layoutLewis(state) {
  const positions = {};
  const loneSlots = {};
  const root = state.atoms.find((atom) => atom.parent < 0) ?? state.atoms[0];
  positions[root.id] = [0, 0];

  const place = (atom, incoming) => {
    const children = childAtoms(state, atom.id);
    const slots = children.length + atom.lp + (atom.parent < 0 ? 0 : 1);
    const step = 360 / Math.max(slots, 1);
    const start = atom.parent < 0
      ? (children.length + atom.lp === 2 ? 180 : atom.lp ? 270 : 90)
      : incoming + 180;
    const angles = Array.from({ length: slots }, (_, index) => (start + index * step) % 360);
    const open = atom.parent < 0 ? angles : angles.slice(1);
    children.forEach((child, index) => {
      const radians = open[index] * Math.PI / 180;
      const length = child.el === 'H' ? 78 : 104;
      positions[child.id] = [
        positions[atom.id][0] + length * Math.cos(radians),
        positions[atom.id][1] + length * Math.sin(radians),
      ];
      place(child, open[index]);
    });
    loneSlots[atom.id] = open.slice(children.length);
  };
  place(root, 0);

  const xs = Object.values(positions).map((point) => point[0]);
  const ys = Object.values(positions).map((point) => point[1]);
  const width = Math.max(...xs) - Math.min(...xs) + 140;
  const height = Math.max(...ys) - Math.min(...ys) + 140;
  const scale = Math.min(1.35, 560 / width, 390 / height);
  const midX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const midY = (Math.max(...ys) + Math.min(...ys)) / 2;
  for (const id of Object.keys(positions)) {
    positions[id] = [300 + (positions[id][0] - midX) * scale, 210 + (positions[id][1] - midY) * scale];
  }
  return { positions, loneSlots, scale };
}

export const LEWIS_ELEMENTS = ['H', 'Be', 'B', 'C', 'N', 'O', 'F', 'Si', 'P', 'S', 'Cl', 'Br', 'I', 'Xe'];

export function waveRegion(lambdaNm) {
  if (lambdaNm < 10) return 'X-ray';
  if (lambdaNm < 380) return 'ultraviolet';
  if (lambdaNm <= 750) return 'visible';
  if (lambdaNm < 1e6) return 'infrared';
  return 'microwave or radio';
}

export function waveColor(lambdaNm) {
  if (lambdaNm < 380 || lambdaNm > 750) return '#667085';
  let red = 0;
  let green = 0;
  let blue = 0;
  if (lambdaNm < 440) {
    red = -(lambdaNm - 440) / 60;
    blue = 1;
  } else if (lambdaNm < 490) {
    green = (lambdaNm - 440) / 50;
    blue = 1;
  } else if (lambdaNm < 510) {
    green = 1;
    blue = -(lambdaNm - 510) / 20;
  } else if (lambdaNm < 580) {
    red = (lambdaNm - 510) / 70;
    green = 1;
  } else if (lambdaNm < 645) {
    red = 1;
    green = -(lambdaNm - 645) / 65;
  } else {
    red = 1;
  }
  return `rgb(${red * 255 | 0}, ${green * 255 | 0}, ${blue * 255 | 0})`;
}

export function photonFromWavelength(lambdaNm) {
  const lambdaM = lambdaNm * 1e-9;
  const frequency = SPEED / lambdaM;
  const energy = PLANCK * frequency;
  return { frequency, energy, region: waveRegion(lambdaNm), color: waveColor(lambdaNm) };
}

export function wavelengthFromSpectrum(x, width) {
  const lambda = 100 + (x / Math.max(width, 1)) * 900;
  return Math.round(Math.min(1000, Math.max(100, lambda)));
}

export function wavePath(lambdaNm, phase = 0, width = 600) {
  const pixelsPerWave = Math.max(lambdaNm / 5, 8);
  let path = '';
  for (let x = 0; x <= width; x += 3) {
    const y = 80 - 55 * Math.sin((2 * Math.PI * x) / pixelsPerWave - phase);
    path += `${x ? 'L' : 'M'}${x},${y.toFixed(1)}`;
  }
  return path;
}

export function waveNodes(lambdaNm, phase = 0, width = 600) {
  const pixelsPerWave = Math.max(lambdaNm / 5, 8);
  const nodes = [];
  for (let k = 0; k < 80; k += 1) {
    const x = (phase / (2 * Math.PI) + k / 2) * pixelsPerWave;
    if (x >= 0 && x <= width) nodes.push(x);
  }
  return nodes;
}

export function standingPath(halfWaves, amplitude = 55, width = 340) {
  let upper = '';
  let lower = '';
  for (let x = 0; x <= width; x += 2) {
    const y = Math.sin((halfWaves * Math.PI * x) / width);
    upper += `${x ? 'L' : 'M'}${10 + x},${(80 - amplitude * y).toFixed(1)}`;
    lower += `${x ? 'L' : 'M'}${10 + x},${(80 + 55 * y).toFixed(1)}`;
  }
  const nodes = Array.from({ length: halfWaves + 1 }, (_, index) => 10 + (width * index) / halfWaves);
  return { upper, lower, nodes, nodeCount: halfWaves + 1 };
}

export function bohrEnergyEv(n) {
  return -13.6 / n / n;
}

export function emission(ni, nf) {
  const energy = RYDBERG_J * (1 / nf ** 2 - 1 / ni ** 2);
  const lambdaNm = (PLANCK * SPEED / energy) * 1e9;
  const series = nf === 1 ? 'Lyman' : nf === 2 ? 'Balmer' : nf === 3 ? 'Paschen' : `series ending at n = ${nf}`;
  return {
    ni,
    nf,
    energy,
    lambdaNm,
    series,
    region: waveRegion(lambdaNm),
    color: waveColor(lambdaNm),
  };
}

export const ORBITAL_TYPES = ['s', 'px', 'py', 'pz', 'dxy', 'dxz', 'dyz', 'dx2y2', 'dz2'];

export function orbitalFamily(type) {
  if (type === 's') return 's';
  if (type.startsWith('p')) return 'p';
  return 'd';
}

export function orbitalLabel(type) {
  const labels = {
    s: 's',
    px: 'px',
    py: 'py',
    pz: 'pz',
    dxy: 'dxy',
    dxz: 'dxz',
    dyz: 'dyz',
    dx2y2: 'dx²−y²',
    dz2: 'dz²',
  };
  return labels[type] ?? type;
}

export function orbitalBlurb(type) {
  const family = orbitalFamily(type);
  if (family === 's') return 'An s orbital is a sphere. The electron is most likely near the middle. l = 0, and there is 1 orbital.';
  if (family === 'p') return 'A p orbital has two lobes and a flat node through the nucleus. l = 1, so there are 3 orbitals: px, py, and pz.';
  return 'A d orbital usually has four lobes. dz² has two lobes and a ring. l = 2, so there are 5 orbitals.';
}

const FILL_ORDER = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s'];
const SUBSHELL_CAP = { s: 2, p: 6, d: 10, f: 14 };

export function subshellCapacity(subshell) {
  return SUBSHELL_CAP[subshell[1]] ?? 0;
}

export function groundMap(z) {
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
  const map = groundMap(z);
  const last = Math.max(...Object.keys(map).map((subshell) => FILL_ORDER.indexOf(subshell)));
  return FILL_ORDER.slice(0, last + 1);
}

export function emptyDiagram(z) {
  const boxes = {};
  for (const subshell of subshellsFor(z)) {
    boxes[subshell] = Array(subshellCapacity(subshell) / 2).fill(0);
  }
  return boxes;
}

export function diagramElectrons(boxes) {
  return Object.values(boxes).flat().reduce((sum, value) => sum + value, 0);
}

export function unpairedInDiagram(boxes) {
  return Object.values(boxes).flat().reduce((sum, value) => sum + (value === 1 ? 1 : 0), 0);
}

/**
 * Add one electron. Refuses a third electron in one box, and refuses pairing
 * while an empty box remains in that subshell.
 */
export function addBoxElectron(boxes, subshell, index) {
  const next = Object.fromEntries(Object.entries(boxes).map(([key, row]) => [key, [...row]]));
  const row = next[subshell];
  if (!row || row[index] == null) return { boxes: next, error: 'missing' };
  if (row[index] >= 2) return { boxes, error: 'pauli' };
  if (row[index] === 1 && row.some((value) => value === 0)) return { boxes, error: 'hund' };
  row[index] += 1;
  return { boxes: next, error: null };
}

export function removeBoxElectron(boxes, subshell, index) {
  const next = Object.fromEntries(Object.entries(boxes).map(([key, row]) => [key, [...row]]));
  if (next[subshell]?.[index]) next[subshell][index] -= 1;
  return next;
}

export function diagramMatches(boxes, z) {
  const target = groundMap(z);
  const keys = new Set([...Object.keys(boxes), ...Object.keys(target)]);
  for (const key of keys) {
    const have = (boxes[key] ?? []).reduce((sum, value) => sum + value, 0);
    if (have !== (target[key] ?? 0)) return false;
  }
  return true;
}

export const VSEPR_SHAPES = [
  { id: 'AX2', label: 'AX2', bonded: 2, lone: 0, eg: 'linear', mg: 'linear', angle: '180', center: 'A', outer: 'X' },
  { id: 'AX3', label: 'AX3', bonded: 3, lone: 0, eg: 'trigonal planar', mg: 'trigonal planar', angle: '120', center: 'A', outer: 'X' },
  { id: 'AX2E', label: 'AX2E', bonded: 2, lone: 1, eg: 'trigonal planar', mg: 'bent', angle: '<120', center: 'A', outer: 'X' },
  { id: 'AX4', label: 'AX4', bonded: 4, lone: 0, eg: 'tetrahedral', mg: 'tetrahedral', angle: '109.5', center: 'A', outer: 'X' },
  { id: 'AX3E', label: 'AX3E', bonded: 3, lone: 1, eg: 'tetrahedral', mg: 'trigonal pyramidal', angle: '<109.5', center: 'A', outer: 'X' },
  { id: 'AX2E2', label: 'AX2E2', bonded: 2, lone: 2, eg: 'tetrahedral', mg: 'bent', angle: '<109.5', center: 'A', outer: 'X' },
  { id: 'AX5', label: 'AX5', bonded: 5, lone: 0, eg: 'trigonal bipyramidal', mg: 'trigonal bipyramidal', angle: '90 and 120', center: 'A', outer: 'X' },
  { id: 'AX4E', label: 'AX4E', bonded: 4, lone: 1, eg: 'trigonal bipyramidal', mg: 'seesaw', angle: '<90 and <120', center: 'A', outer: 'X' },
  { id: 'AX3E2', label: 'AX3E2', bonded: 3, lone: 2, eg: 'trigonal bipyramidal', mg: 'T-shaped', angle: '<90', center: 'A', outer: 'X' },
  { id: 'AX2E3', label: 'AX2E3', bonded: 2, lone: 3, eg: 'trigonal bipyramidal', mg: 'linear', angle: '180', center: 'A', outer: 'X' },
  { id: 'AX6', label: 'AX6', bonded: 6, lone: 0, eg: 'octahedral', mg: 'octahedral', angle: '90', center: 'A', outer: 'X' },
  { id: 'AX5E', label: 'AX5E', bonded: 5, lone: 1, eg: 'octahedral', mg: 'square pyramidal', angle: '<90', center: 'A', outer: 'X' },
  { id: 'AX4E2', label: 'AX4E2', bonded: 4, lone: 2, eg: 'octahedral', mg: 'square planar', angle: '90', center: 'A', outer: 'X' },
  { id: 'H2O', label: 'H2O', bonded: 2, lone: 2, eg: 'tetrahedral', mg: 'bent', angle: '<109.5', center: 'O', outer: 'H' },
  { id: 'NH3', label: 'NH3', bonded: 3, lone: 1, eg: 'tetrahedral', mg: 'trigonal pyramidal', angle: '<109.5', center: 'N', outer: 'H' },
  { id: 'CO2', label: 'CO2', bonded: 2, lone: 0, eg: 'linear', mg: 'linear', angle: '180', center: 'C', outer: 'O' },
  { id: 'CH4', label: 'CH4', bonded: 4, lone: 0, eg: 'tetrahedral', mg: 'tetrahedral', angle: '109.5', center: 'C', outer: 'H' },
  { id: 'BF3', label: 'BF3', bonded: 3, lone: 0, eg: 'trigonal planar', mg: 'trigonal planar', angle: '120', center: 'B', outer: 'F' },
  { id: 'SF4', label: 'SF4', bonded: 4, lone: 1, eg: 'trigonal bipyramidal', mg: 'seesaw', angle: '<90 and <120', center: 'S', outer: 'F' },
  { id: 'XeF4', label: 'XeF4', bonded: 4, lone: 2, eg: 'octahedral', mg: 'square planar', angle: '90', center: 'Xe', outer: 'F' },
];

const DOMAIN_DIRECTIONS = {
  2: [[1, 0, 0], [-1, 0, 0]],
  3: [[0, 1, 0], [0.866, -0.5, 0], [-0.866, -0.5, 0]],
  4: [[0, 1, 0], [0.943, -0.333, 0], [-0.471, -0.333, 0.816], [-0.471, -0.333, -0.816]],
  5: [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-0.5, 0.866, 0], [-0.5, -0.866, 0]],
  6: [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]],
};

const LONE_PAIR_INDEX = { 3: [0], 4: [0, 1], 5: [2, 3, 4], 6: [0, 1] };

export function shapeSpec(shape) {
  const domains = shape.bonded + shape.lone;
  const directions = DOMAIN_DIRECTIONS[domains];
  const loneIndexes = new Set((LONE_PAIR_INDEX[domains] ?? []).slice(0, shape.lone));
  const atoms = [];
  const lonePairs = [];
  directions.forEach((vector, index) => {
    if (loneIndexes.has(index)) lonePairs.push(vector);
    else atoms.push(vector);
  });
  return { atoms, lonePairs, domains };
}

export function vseprById(id) {
  return VSEPR_SHAPES.find((shape) => shape.id === id) ?? VSEPR_SHAPES[3];
}

export function initialView() {
  return { yaw: 0.6, pitch: 0.35 };
}

export function rotateView(view, key) {
  const step = 0.28;
  if (key === 'ArrowLeft') return { ...view, yaw: view.yaw - step };
  if (key === 'ArrowRight') return { ...view, yaw: view.yaw + step };
  if (key === 'ArrowUp') return { ...view, pitch: view.pitch - step };
  if (key === 'ArrowDown') return { ...view, pitch: view.pitch + step };
  if (key === 'Home') return initialView();
  return null;
}

export function dragView(view, dx, dy) {
  return { yaw: view.yaw + dx * 0.01, pitch: view.pitch + dy * 0.01 };
}

export function projectPoint(vector, view, width = 360, height = 300) {
  const [x, y, z] = vector;
  const yaw = view.yaw;
  const pitch = view.pitch;
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
  const scale = 1 / (1 - z2 * 0.25);
  const radius = Math.min(width, height) * 0.33;
  return {
    x: width / 2 + radius * x1 * scale,
    y: height / 2 - radius * y1 * scale,
    z: z2,
    scale,
  };
}

export const CATIONS = [
  { id: 'Na', formula: 'Na', name: 'sodium', charge: 1, polyatomic: false },
  { id: 'K', formula: 'K', name: 'potassium', charge: 1, polyatomic: false },
  { id: 'Mg', formula: 'Mg', name: 'magnesium', charge: 2, polyatomic: false },
  { id: 'Ca', formula: 'Ca', name: 'calcium', charge: 2, polyatomic: false },
  { id: 'Al', formula: 'Al', name: 'aluminum', charge: 3, polyatomic: false },
  { id: 'Fe2', formula: 'Fe', name: 'iron(II)', charge: 2, polyatomic: false },
  { id: 'Fe3', formula: 'Fe', name: 'iron(III)', charge: 3, polyatomic: false },
  { id: 'Cu2', formula: 'Cu', name: 'copper(II)', charge: 2, polyatomic: false },
  { id: 'NH4', formula: 'NH4', name: 'ammonium', charge: 1, polyatomic: true },
  { id: 'Hg2', formula: 'Hg2', name: 'mercury(I)', charge: 2, polyatomic: true },
];

export const ANIONS = [
  { id: 'Cl', formula: 'Cl', name: 'chloride', charge: 1, polyatomic: false },
  { id: 'O', formula: 'O', name: 'oxide', charge: 2, polyatomic: false },
  { id: 'N', formula: 'N', name: 'nitride', charge: 3, polyatomic: false },
  { id: 'S', formula: 'S', name: 'sulfide', charge: 2, polyatomic: false },
  { id: 'OH', formula: 'OH', name: 'hydroxide', charge: 1, polyatomic: true },
  { id: 'NO3', formula: 'NO3', name: 'nitrate', charge: 1, polyatomic: true },
  { id: 'SO4', formula: 'SO4', name: 'sulfate', charge: 2, polyatomic: true },
  { id: 'PO4', formula: 'PO4', name: 'phosphate', charge: 3, polyatomic: true },
  { id: 'CO3', formula: 'CO3', name: 'carbonate', charge: 2, polyatomic: true },
  { id: 'C2H3O2', formula: 'C2H3O2', name: 'acetate', charge: 1, polyatomic: true },
];

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

function piece(ion, count) {
  if (count > 1 && ion.polyatomic) return `(${ion.formula})${count}`;
  return `${ion.formula}${count === 1 ? '' : count}`;
}

export function ionicFormula(cation, anion) {
  const shared = (cation.charge * anion.charge) / gcd(cation.charge, anion.charge);
  const cationCount = shared / cation.charge;
  const anionCount = shared / anion.charge;
  return {
    formula: piece(cation, cationCount) + piece(anion, anionCount),
    cationCount,
    anionCount,
    name: `${cation.name} ${anion.name}`,
    parentheses: (cationCount > 1 && cation.polyatomic) || (anionCount > 1 && anion.polyatomic),
  };
}

export function ionById(list, id) {
  return list.find((ion) => ion.id === id) ?? list[0];
}

/** Arrow directions for the three heat maps already on the site. */
export const TREND_ARROWS = {
  radius: [
    { axis: 'period', direction: 'left', text: 'Atomic radius increases to the left across a period.' },
    { axis: 'group', direction: 'down', text: 'Atomic radius increases down a group.' },
  ],
  ie: [
    { axis: 'period', direction: 'right', text: 'Ionization energy increases to the right across a period.' },
    { axis: 'group', direction: 'up', text: 'Ionization energy increases up a group.' },
  ],
  en: [
    { axis: 'period', direction: 'right', text: 'Electronegativity increases to the right across a period.' },
    { axis: 'group', direction: 'up', text: 'Electronegativity increases up a group.' },
  ],
};

export function moveSelection(z, key, elements = ELEMENTS) {
  const current = elements.find((element) => element.z === z);
  if (!current) return elements[0]?.z ?? null;
  const pool = current.series === 'main'
    ? elements.filter((element) => element.series === 'main')
    : elements.filter((element) => element.series === current.series);
  const pick = (list) => list.sort((a, b) => a.z - b.z)[0] ?? current;
  if (key === 'ArrowRight') {
    return pick(pool.filter((element) => (
      current.series === 'main'
        ? element.period === current.period && element.group > current.group
        : element.z > current.z
    ))).z;
  }
  if (key === 'ArrowLeft') {
    const choices = pool.filter((element) => (
      current.series === 'main'
        ? element.period === current.period && element.group < current.group
        : element.z < current.z
    ));
    return (choices.sort((a, b) => b.z - a.z)[0] ?? current).z;
  }
  if (key === 'ArrowDown') {
    if (current.series === 'main') {
      return pick(pool.filter((element) => element.group === current.group && element.period > current.period)).z;
    }
    const actinides = elements.filter((element) => element.series === 'actinide');
    if (current.series === 'lanthanide') return actinides[current.z - 57]?.z ?? current.z;
    return current.z;
  }
  if (key === 'ArrowUp') {
    if (current.series === 'main') {
      const choices = pool.filter((element) => element.group === current.group && element.period < current.period);
      return (choices.sort((a, b) => b.period - a.period)[0] ?? current).z;
    }
    const lanthanides = elements.filter((element) => element.series === 'lanthanide');
    if (current.series === 'actinide') return lanthanides[current.z - 89]?.z ?? current.z;
    return current.z;
  }
  if (key === 'Home') return 1;
  if (key === 'End') return 118;
  return current.z;
}

export function tablistMove(ids, current, key) {
  const index = Math.max(0, ids.indexOf(current));
  if (key === 'ArrowRight' || key === 'ArrowDown') return ids[(index + 1) % ids.length];
  if (key === 'ArrowLeft' || key === 'ArrowUp') return ids[(index - 1 + ids.length) % ids.length];
  if (key === 'Home') return ids[0];
  if (key === 'End') return ids[ids.length - 1];
  return null;
}
