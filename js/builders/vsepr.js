import { plural } from './util.js';

const HYBRID = { 2: 'sp', 3: 'sp2', 4: 'sp3', 5: 'sp3d', 6: 'sp3d2' };

/**
 * Unit-ish domain directions. Lone pairs are removed from the front of the
 * index list for that domain count, except five-domain shapes, where lone
 * pairs take equatorial sites.
 */
const DIRECTIONS = {
  2: [[1, 0, 0], [-1, 0, 0]],
  3: [[1, 0, 0], [-0.5, 0.866, 0], [-0.5, -0.866, 0]],
  4: [
    [0.577, 0.577, 0.577],
    [0.577, -0.577, -0.577],
    [-0.577, 0.577, -0.577],
    [-0.577, -0.577, 0.577],
  ],
  5: [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-0.5, 0, 0.866], [-0.5, 0, -0.866]],
  6: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
};

const LONE_INDEX = {
  2: [],
  3: [0],
  4: [0, 1],
  5: [2, 3, 4],
  6: [4, 5],
};

export function hybridizationFor(domains) {
  return HYBRID[domains] ?? '';
}

function shape(entry) {
  const domains = entry.bonded + entry.lone;
  return { ...entry, domains, hybrid: hybridizationFor(domains) };
}

/** Every electron-domain family used in first-semester VSEPR, plus a few molecules. */
export const VSEPR_SHAPES = [
  shape({ id: 'AX2', label: 'AX2', bonded: 2, lone: 0, eg: 'linear', mg: 'linear', angle: '180', center: 'A', outer: 'X' }),
  shape({ id: 'AX3', label: 'AX3', bonded: 3, lone: 0, eg: 'trigonal planar', mg: 'trigonal planar', angle: '120', center: 'A', outer: 'X' }),
  shape({ id: 'AX2E', label: 'AX2E', bonded: 2, lone: 1, eg: 'trigonal planar', mg: 'bent', angle: '<120', center: 'A', outer: 'X' }),
  shape({ id: 'AX4', label: 'AX4', bonded: 4, lone: 0, eg: 'tetrahedral', mg: 'tetrahedral', angle: '109.5', center: 'A', outer: 'X' }),
  shape({ id: 'AX3E', label: 'AX3E', bonded: 3, lone: 1, eg: 'tetrahedral', mg: 'trigonal pyramidal', angle: '<109.5', center: 'A', outer: 'X' }),
  shape({ id: 'AX2E2', label: 'AX2E2', bonded: 2, lone: 2, eg: 'tetrahedral', mg: 'bent', angle: '<109.5', center: 'A', outer: 'X' }),
  shape({ id: 'AX5', label: 'AX5', bonded: 5, lone: 0, eg: 'trigonal bipyramidal', mg: 'trigonal bipyramidal', angle: '90 and 120', center: 'A', outer: 'X' }),
  shape({ id: 'AX4E', label: 'AX4E', bonded: 4, lone: 1, eg: 'trigonal bipyramidal', mg: 'seesaw', angle: '<90 and <120', center: 'A', outer: 'X' }),
  shape({ id: 'AX3E2', label: 'AX3E2', bonded: 3, lone: 2, eg: 'trigonal bipyramidal', mg: 'T-shaped', angle: '<90', center: 'A', outer: 'X' }),
  shape({ id: 'AX2E3', label: 'AX2E3', bonded: 2, lone: 3, eg: 'trigonal bipyramidal', mg: 'linear', angle: '180', center: 'A', outer: 'X' }),
  shape({ id: 'AX6', label: 'AX6', bonded: 6, lone: 0, eg: 'octahedral', mg: 'octahedral', angle: '90', center: 'A', outer: 'X' }),
  shape({ id: 'AX5E', label: 'AX5E', bonded: 5, lone: 1, eg: 'octahedral', mg: 'square pyramidal', angle: '<90', center: 'A', outer: 'X' }),
  shape({ id: 'AX4E2', label: 'AX4E2', bonded: 4, lone: 2, eg: 'octahedral', mg: 'square planar', angle: '90', center: 'A', outer: 'X' }),
  shape({ id: 'CO2', label: 'CO2', bonded: 2, lone: 0, eg: 'linear', mg: 'linear', angle: '180', center: 'C', outer: 'O' }),
  shape({ id: 'BF3', label: 'BF3', bonded: 3, lone: 0, eg: 'trigonal planar', mg: 'trigonal planar', angle: '120', center: 'B', outer: 'F' }),
  shape({ id: 'CH4', label: 'CH4', bonded: 4, lone: 0, eg: 'tetrahedral', mg: 'tetrahedral', angle: '109.5', center: 'C', outer: 'H' }),
  shape({ id: 'NH3', label: 'NH3', bonded: 3, lone: 1, eg: 'tetrahedral', mg: 'trigonal pyramidal', angle: '<109.5', center: 'N', outer: 'H' }),
  shape({ id: 'H2O', label: 'H2O', bonded: 2, lone: 2, eg: 'tetrahedral', mg: 'bent', angle: '<109.5', center: 'O', outer: 'H' }),
  shape({ id: 'PCl5', label: 'PCl5', bonded: 5, lone: 0, eg: 'trigonal bipyramidal', mg: 'trigonal bipyramidal', angle: '90 and 120', center: 'P', outer: 'Cl' }),
  shape({ id: 'SF6', label: 'SF6', bonded: 6, lone: 0, eg: 'octahedral', mg: 'octahedral', angle: '90', center: 'S', outer: 'F' }),
  shape({ id: 'XeF4', label: 'XeF4', bonded: 4, lone: 2, eg: 'octahedral', mg: 'square planar', angle: '90', center: 'Xe', outer: 'F' }),
];

export const ELECTRON_GEOMETRIES = ['linear', 'trigonal planar', 'tetrahedral', 'trigonal bipyramidal', 'octahedral'];
export const MOLECULAR_SHAPES = ['linear', 'bent', 'trigonal planar', 'tetrahedral', 'trigonal pyramidal', 'seesaw', 'T-shaped', 'square pyramidal', 'square planar', 'trigonal bipyramidal', 'octahedral'];
export const BOND_ANGLES = ['180', '120', '<120', '109.5', '<109.5', '90', '<90', '90 and 120', '<90 and <120'];
export const HYBRIDS = ['sp', 'sp2', 'sp3', 'sp3d', 'sp3d2'];

export const VSEPR_CHALLENGES = [
  {
    id: 'water',
    title: 'water',
    prompt: 'Water has 2 bonds and 2 lone pairs on oxygen. Choose the electron geometry, the shape of the atoms, the bond angle, and the hybridization.',
    eg: 'tetrahedral',
    mg: 'bent',
    angle: '<109.5',
    hybrid: 'sp3',
    shapeId: 'H2O',
    solution: 'Four domains make a tetrahedral electron geometry and sp3 hybridization. Two of the domains are lone pairs, so the atoms form a bent shape and the angle is a little under 109.5°.',
  },
  {
    id: 'co2',
    title: 'carbon dioxide',
    prompt: 'CO₂ has 2 bonds and no lone pairs on carbon. Choose the electron geometry, the molecular shape, the bond angle, and the hybridization.',
    eg: 'linear',
    mg: 'linear',
    angle: '180',
    hybrid: 'sp',
    shapeId: 'CO2',
    solution: 'Two domains stay opposite each other. Electron geometry and molecular shape are both linear, the angle is 180°, and the hybridization is sp.',
  },
  {
    id: 'bf3',
    title: 'boron trifluoride',
    prompt: 'BF₃ has 3 bonds and no lone pairs on boron. Choose the electron geometry, the molecular shape, the bond angle, and the hybridization.',
    eg: 'trigonal planar',
    mg: 'trigonal planar',
    angle: '120',
    hybrid: 'sp2',
    shapeId: 'BF3',
    solution: 'Three domains lie in a triangle. Electron geometry and molecular shape are both trigonal planar, the angle is 120°, and the hybridization is sp2.',
  },
  {
    id: 'pcl5',
    title: 'phosphorus pentachloride',
    prompt: 'PCl₅ has 5 bonds and no lone pairs on phosphorus. Choose the electron geometry, the molecular shape, the bond angle, and the hybridization.',
    eg: 'trigonal bipyramidal',
    mg: 'trigonal bipyramidal',
    angle: '90 and 120',
    hybrid: 'sp3d',
    shapeId: 'PCl5',
    solution: 'Five domains give a trigonal bipyramid. Angles are 90° and 120°. Hybridization is sp3d.',
  },
  {
    id: 'sf6',
    title: 'sulfur hexafluoride',
    prompt: 'SF₆ has 6 bonds and no lone pairs on sulfur. Choose the electron geometry, the molecular shape, the bond angle, and the hybridization.',
    eg: 'octahedral',
    mg: 'octahedral',
    angle: '90',
    hybrid: 'sp3d2',
    shapeId: 'SF6',
    solution: 'Six domains point to the corners of an octahedron. The angle is 90° and the hybridization is sp3d2.',
  },
];

export function shapeById(id) {
  return VSEPR_SHAPES.find((item) => item.id === id) ?? VSEPR_SHAPES[3];
}

export function challengeById(id) {
  return VSEPR_CHALLENGES.find((item) => item.id === id) ?? VSEPR_CHALLENGES[0];
}

export function initialView() {
  return { yaw: 0.6, pitch: 0.35 };
}

export function createVsepr(challengeId = 'water') {
  const challenge = challengeById(challengeId);
  return {
    shapeId: challenge.shapeId,
    view: initialView(),
    spin: false,
    challengeId,
    answer: { eg: '', mg: '', angle: '', hybrid: '' },
    message: '',
    tone: '',
    misses: 0,
    revealed: false,
  };
}

export function shapeSpec(entry) {
  const directions = DIRECTIONS[entry.domains] ?? [];
  const loneIndexes = new Set((LONE_INDEX[entry.domains] ?? []).slice(0, entry.lone));
  const atoms = [];
  const lonePairs = [];
  directions.forEach((vector, index) => {
    if (loneIndexes.has(index)) lonePairs.push(vector);
    else atoms.push(vector);
  });
  return { atoms, lonePairs, domains: entry.domains };
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

/** Perspective projection. Positive z comes toward the viewer. */
export function project(vector, view, width = 360, height = 300) {
  const [x, y, z] = vector;
  const cosYaw = Math.cos(view.yaw);
  const sinYaw = Math.sin(view.yaw);
  const cosPitch = Math.cos(view.pitch);
  const sinPitch = Math.sin(view.pitch);
  const x1 = x * cosYaw + z * sinYaw;
  const z1 = -x * sinYaw + z * cosYaw;
  const y1 = y * cosPitch - z1 * sinPitch;
  const z2 = y * sinPitch + z1 * cosPitch;
  const scale = 1 / (1 - z2 * 0.35);
  const radius = Math.min(width, height) * 0.32;
  return {
    x: width / 2 + radius * x1 * scale,
    y: height / 2 - radius * y1 * scale,
    z: z2,
    scale,
  };
}

export function frameLayout(entry, view, width = 360, height = 300) {
  const spec = shapeSpec(entry);
  const center = project([0, 0, 0], view, width, height);
  const atoms = spec.atoms.map((vector, index) => ({
    index,
    symbol: entry.outer,
    ...project(vector, view, width, height),
    vector,
  }));
  const lonePairs = spec.lonePairs.map((vector) => ({
    ...project(vector.map((value) => value * 0.62), view, width, height),
    vector,
  }));
  return { spec, center, atoms, lonePairs };
}

export function angleSpeech(angle) {
  return String(angle)
    .replaceAll('<', 'less than ')
    .replace('and', 'and')
    + ' degrees';
}

export function gradeVsepr(answer, challenge = challengeById('water')) {
  const wrong = [];
  if (answer.eg !== challenge.eg) wrong.push('electron geometry');
  if (answer.mg !== challenge.mg) wrong.push('molecular shape');
  if (answer.angle !== challenge.angle) wrong.push('bond angle');
  if (answer.hybrid !== challenge.hybrid) wrong.push('hybridization');
  const success = `${challenge.title} is ${challenge.mg}. Electron geometry ${challenge.eg}, angle ${angleSpeech(challenge.angle)}, hybridization ${challenge.hybrid}.`;
  if (!wrong.length) return { ok: true, success, hints: [challenge.solution], wrong };
  const hints = [
    `Check the ${wrong[0]}. Count domains first: each bond and each lone pair is one domain.`,
    'Electron geometry follows the domain count. Molecular shape ignores lone pairs. Hybridization: 2 domains sp, 3 sp2, 4 sp3, 5 sp3d, 6 sp3d2.',
    challenge.solution,
  ];
  return { ok: false, success, hints, wrong };
}

export function describeVsepr(state, motion = 'still') {
  const entry = shapeById(state.shapeId);
  const challenge = challengeById(state.challengeId);
  const frame = motion === 'still'
    ? 'The model is holding still. Arrow keys turn it. Home resets the view. Dragging also turns it.'
    : 'The model is turning. Arrow keys or a drag take over the spin.';
  const lone = entry.lone
    ? `${plural(entry.lone, 'lone pair')} sit on the center and push the bonds.`
    : 'There are no lone pairs.';
  return [
    `VSEPR model of ${entry.label}.`,
    `${plural(entry.bonded, 'bond')} and ${plural(entry.lone, 'lone pair')}, so ${plural(entry.domains, 'electron domain')}.`,
    `Electron geometry ${entry.eg}. Molecular shape ${entry.mg}. Bond angle ${angleSpeech(entry.angle)}. Hybridization ${entry.hybrid}.`,
    lone,
    `Challenge: ${challenge.prompt}`,
    frame,
  ].join(' ');
}
