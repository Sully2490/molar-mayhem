import {
  MOLECULES,
  PI_MOLECULES,
  alt,
  moleculeByName,
  num,
  scaled,
  span,
} from './kit.js';

const names = MOLECULES.map((item) => item.text);
const piNames = PI_MOLECULES.map((item) => item.text);
const moles = span(0.125, 2.875, 0.001, 4);

const sigmaMoles = (v) => v.moles * moleculeByName(v.mol).sigma;
const piMoles = (v) => v.moles * moleculeByName(v.mol).pi;
const bondOrder = (v) => (v.bonding - v.anti) / 2;

export const templates = [
  {
    id: 'ch05-sigma-moles',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.1',
    topic: 'sigma pi',
    vars: { moles, mol: { choices: names } },
    template: 'How many moles of sigma bonds are in {moles} mol of {mol}?',
    solve: sigmaMoles,
    unit: 'mol',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Every single, double, and triple bond contains one sigma bond. Count those, then multiply by the moles.',
      'A double bond is still only one sigma bond. The extra bond is pi.',
    ],
    why: (v, x) => `${v.mol} has ${moleculeByName(v.mol).sigma} sigma bonds per molecule. ${num(v.moles, 4)} mol × ${moleculeByName(v.mol).sigma} = ${num(x, 4)} mol.`,
    mistakes: [
      alt(sigmaMoles, 'lone-as-bond', 'A lone pair was counted as another sigma bond.', (v) => v.moles * (moleculeByName(v.mol).sigma + 1)),
      scaled(sigmaMoles, 0.5, 'half', 'The count was cut in half. Each sigma bond in the molecule contributes once.'),
    ],
  },
  {
    id: 'ch05-pi-moles',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.1',
    topic: 'sigma pi',
    vars: { moles, mol: { choices: piNames } },
    template: 'How many moles of pi bonds are in {moles} mol of {mol}?',
    solve: piMoles,
    unit: 'mol',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'A double bond has one pi bond. A triple bond has two. Single bonds have none.',
      'Multiply that count by the moles of molecules.',
    ],
    why: (v, x) => `${v.mol} has ${moleculeByName(v.mol).pi} pi bond(s) per molecule. ${num(v.moles, 4)} × ${moleculeByName(v.mol).pi} = ${num(x, 4)} mol.`,
    mistakes: [
      alt(piMoles, 'sigma-added', 'The sigma bonds were added onto the pi bonds.', (v) => v.moles * (moleculeByName(v.mol).sigma + moleculeByName(v.mol).pi)),
      scaled(piMoles, 5, 'five-times', 'Each pi bond was counted five times.'),
    ],
  },
  {
    id: 'ch05-hybrid-count',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.2',
    topic: 'hybridization',
    kind: 'exact',
    case: 'insensitive',
    vars: { mol: { choices: names } },
    template: 'How many hybrid orbitals does the central atom in {mol} use?',
    solve: (v) => moleculeByName(v.mol).hybrid,
    hints: () => [
      'Count electron groups on the central atom. That count is the number of hybrid orbitals.',
      '2 groups use 2 hybrid orbitals, 3 use 3, 4 use 4, 5 use 5, and 6 use 6.',
    ],
    why: (v, x) => `${v.mol} has ${moleculeByName(v.mol).groups} electron groups on the central atom, so it uses ${x} hybrid orbitals.`,
    mistakes: [
      alt((v) => moleculeByName(v.mol).hybrid, 'plus-two', 'Two extra orbitals were added. Use the electron-group count.', (v) => moleculeByName(v.mol).hybrid + 2),
      scaled((v) => moleculeByName(v.mol).hybrid, 3, 'tripled', 'The hybrid count was tripled. It equals the number of electron groups.'),
    ],
  },
  {
    id: 'ch05-bond-angle',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.2',
    topic: 'bond angle',
    vars: { moles, mol: { choices: names } },
    template: 'A {moles} mol sample of {mol} is measured. What is the bond angle, in degrees, used for this shape?',
    solve: (v) => moleculeByName(v.mol).angle,
    unit: 'degrees',
    sigFigs: 4,
    tolerance: 0.5,
    hints: () => [
      'The angle follows the electron-group count: 2 → 180, 3 → 120, 4 → 109.5 (a bit less with lone pairs).',
      'Six groups give 90°. The moles do not change the angle.',
    ],
    why: (v, x) => `${v.mol} has ${moleculeByName(v.mol).groups} electron groups and ${moleculeByName(v.mol).lone} lone pair(s), so the angle used here is ${num(x, 4)} degrees.`,
    mistakes: [
      {
        id: 'straight',
        message: '180° is the angle for two electron groups. Check this group count.',
        value: (v) => (moleculeByName(v.mol).angle === 180 ? 90 : 180),
      },
      {
        id: 'tetrahedral',
        message: '109.5° is the tetrahedral angle. Check whether this atom has four groups and no lone pairs.',
        value: (v) => (moleculeByName(v.mol).angle === 109.5 ? 120 : 109.5),
      },
    ],
  },
  {
    id: 'ch05-bond-order',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.4',
    topic: 'bond order',
    vars: {
      moles,
      bonding: { min: 6, max: 10, step: 2 },
      anti: { min: 0, max: 4, step: 2 },
    },
    template: 'A molecular-orbital diagram for a {moles} mol sample has {bonding} bonding electrons and {anti} antibonding electrons. What is the bond order?',
    solve: bondOrder,
    unit: null,
    sigFigs: 2,
    tolerance: 0.5,
    hints: () => [
      'Bond order = (bonding electrons − antibonding electrons) / 2.',
      'The moles tell you the sample size. They are not part of the bond-order formula.',
    ],
    why: (v, x) => `Bond order = (${v.bonding} − ${v.anti}) / 2 = ${num(x, 2)}.`,
    mistakes: [
      scaled(bondOrder, 2, 'forgot-half', 'The difference was not divided by 2.'),
      scaled(bondOrder, -1, 'swapped', 'Antibonding electrons were subtracted in the wrong direction.'),
    ],
  },
  {
    id: 'ch05-sigma-count',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.1',
    topic: 'sigma pi',
    vars: { moles, mol: { choices: names } },
    template: 'How many sigma bonds are in one molecule of {mol}? A student weighed out {moles} mol of it.',
    solve: (v) => moleculeByName(v.mol).sigma,
    unit: null,
    sigFigs: 2,
    tolerance: 0.5,
    hints: () => [
      'Count one sigma bond for every connection between two atoms, even inside a double or triple bond.',
      'Report the count for one molecule, not for the whole mole sample.',
    ],
    why: (v, x) => `${v.mol} has ${num(x, 2)} sigma bonds in one molecule.`,
    mistakes: [
      alt((v) => moleculeByName(v.mol).sigma, 'extra-bond', 'An extra connection was counted. A double bond still has only one sigma bond.', (v) => moleculeByName(v.mol).sigma + 2),
      scaled((v) => moleculeByName(v.mol).sigma, 3, 'tripled', 'Each sigma bond was counted three times.'),
    ],
  },
  {
    id: 'ch05-pi-count',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.3',
    topic: 'sigma pi',
    vars: { moles, mol: { choices: piNames } },
    template: 'How many pi bonds are in one molecule of {mol}? The bottle holds {moles} mol.',
    solve: (v) => moleculeByName(v.mol).pi,
    unit: null,
    sigFigs: 2,
    tolerance: 0.5,
    hints: () => [
      'Each extra bond past the first one between two atoms is a pi bond.',
      'A triple bond contributes two pi bonds. Do not multiply by the moles.',
    ],
    why: (v, x) => `${v.mol} has ${num(x, 2)} pi bond(s) in one molecule.`,
    mistakes: [
      alt((v) => moleculeByName(v.mol).pi, 'sigma-added', 'The sigma bonds were added to the pi count.', (v) => moleculeByName(v.mol).sigma + moleculeByName(v.mol).pi),
      scaled((v) => moleculeByName(v.mol).pi, 5, 'five-times', 'Each pi bond was counted five times.'),
    ],
  },
  {
    id: 'ch05-electron-groups',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.2',
    topic: 'hybridization',
    vars: { moles, mol: { choices: names } },
    template: 'How many electron groups surround the central atom in {mol}? You have {moles} mol of the compound.',
    solve: (v) => moleculeByName(v.mol).groups,
    unit: null,
    sigFigs: 2,
    tolerance: 0.5,
    hints: () => [
      'Each bonded atom counts as one group, and each lone pair counts as one group.',
      'Double and triple bonds still count as one group.',
    ],
    why: (v, x) => `${v.mol} has ${num(x, 2)} electron groups on the central atom.`,
    mistakes: [
      alt((v) => moleculeByName(v.mol).groups, 'atoms-only', 'Lone pairs were left out, or a multiple bond was counted as extra groups.', (v) => moleculeByName(v.mol).groups + moleculeByName(v.mol).lone + 1),
      scaled((v) => moleculeByName(v.mol).groups, 2, 'doubled', 'The group count was doubled.'),
    ],
  },
  {
    id: 'ch05-unhybridized-p',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.3',
    topic: 'hybridization',
    vars: { moles, mol: { choices: piNames } },
    template: 'How many unhybridized p orbitals does the central atom in {mol} keep for pi bonding? The sample is {moles} mol.',
    solve: (v) => moleculeByName(v.mol).pi,
    unit: null,
    sigFigs: 1,
    tolerance: 0.5,
    hints: () => [
      'Each pi bond on that atom uses one leftover p orbital.',
      'Hybrid orbitals make the sigma framework. They are not the leftover p orbitals.',
    ],
    why: (v, x) => `${v.mol} has ${moleculeByName(v.mol).pi} pi bond(s) at the central atom, so ${num(x, 1)} p orbital(s) stay unhybridized.`,
    mistakes: [
      alt((v) => moleculeByName(v.mol).pi, 'hybrids', 'Hybrid orbitals were counted instead of the leftover p orbitals.', (v) => moleculeByName(v.mol).hybrid + moleculeByName(v.mol).groups),
      scaled((v) => moleculeByName(v.mol).pi, 3, 'triple', 'The leftover p count was tripled. It matches the number of pi bonds.'),
    ],
  },
  {
    id: 'ch05-total-bond-moles',
    ch: 5,
    openstax_section: 'OpenStax AF2e §5.1',
    topic: 'sigma pi',
    vars: { moles, mol: { choices: names } },
    template: 'How many moles of bonds (sigma plus pi) are in {moles} mol of {mol}?',
    solve: (v) => v.moles * (moleculeByName(v.mol).sigma + moleculeByName(v.mol).pi),
    unit: 'mol',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Add the sigma bonds and the pi bonds in one molecule, then multiply by the moles.',
      'A double bond contributes two bonds to this total: one sigma and one pi.',
    ],
    why: (v, x) => {
      const item = moleculeByName(v.mol);
      return `${v.mol} has ${item.sigma} sigma + ${item.pi} pi = ${item.sigma + item.pi} bonds. × ${num(v.moles, 4)} mol = ${num(x, 4)} mol.`;
    },
    mistakes: [
      alt((v) => v.moles * (moleculeByName(v.mol).sigma + moleculeByName(v.mol).pi), 'tripled', 'The bond count was multiplied by three instead of by the moles.', (v) => v.moles * (moleculeByName(v.mol).sigma + moleculeByName(v.mol).pi) * 3),
      scaled((v) => v.moles * (moleculeByName(v.mol).sigma + moleculeByName(v.mol).pi), 2, 'doubled', 'The total was doubled after the sigma and pi bonds were already added.'),
    ],
  },
];
