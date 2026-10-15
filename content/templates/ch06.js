import { ATOMIC_MASS, molarMass } from '../../js/masses.js';
import { NA, alt, num, scaled, snap, span } from './kit.js';

const FORMULAS = ['NaCl', 'CO2', 'H2O', 'NH3', 'Ca(OH)2', 'KNO3', 'MgCl2', 'C6H12O6', 'Fe2O3', 'H2SO4', 'CH4', 'Na2SO4'];

const PERCENT_ROWS = [
  { formula: 'NaCl', element: 'Na', count: 1 },
  { formula: 'CO2', element: 'C', count: 1 },
  { formula: 'H2O', element: 'O', count: 1 },
  { formula: 'NH3', element: 'N', count: 1 },
  { formula: 'KNO3', element: 'K', count: 1 },
  { formula: 'Fe2O3', element: 'Fe', count: 2 },
  { formula: 'H2SO4', element: 'S', count: 1 },
  { formula: 'Ca(OH)2', element: 'Ca', count: 1 },
];

const EMPIRICAL = [
  { text: 'CH2', a: 'C', ac: 1, b: 'H', bc: 2, wrong: 'CH4', doubled: 'C2H4' },
  { text: 'CH4', a: 'C', ac: 1, b: 'H', bc: 4, wrong: 'CH2', doubled: 'C2H8' },
  { text: 'H2O', a: 'H', ac: 2, b: 'O', bc: 1, wrong: 'HO', doubled: 'H2O2' },
  { text: 'NH3', a: 'N', ac: 1, b: 'H', bc: 3, wrong: 'NH2', doubled: 'N2H6' },
  { text: 'CO2', a: 'C', ac: 1, b: 'O', bc: 2, wrong: 'CO', doubled: 'C2O4' },
  { text: 'NO2', a: 'N', ac: 1, b: 'O', bc: 2, wrong: 'NO', doubled: 'N2O4' },
  { text: 'SO3', a: 'S', ac: 1, b: 'O', bc: 3, wrong: 'SO2', doubled: 'S2O6' },
  { text: 'PCl3', a: 'P', ac: 1, b: 'Cl', bc: 3, wrong: 'PCl5', doubled: 'P2Cl6' },
];

function percentRow(label) {
  const found = PERCENT_ROWS.find((item) => item.formula === label);
  if (!found) throw new Error(`Unknown percent row ${label}`);
  return found;
}

function empiricalRow(label) {
  const found = EMPIRICAL.find((item) => item.text === label);
  if (!found) throw new Error(`Unknown empirical target ${label}`);
  return found;
}

const formulaMass = (v) => molarMass(v.formula);
const gramsToMoles = (v) => v.grams / molarMass(v.formula);
const molesToGrams = (v) => v.moles * molarMass(v.formula);
const particles = (v) => v.moles * NA;
const composition = (v) => {
  const row = percentRow(v.formula);
  return (ATOMIC_MASS[row.element] * row.count / molarMass(row.formula)) * 100;
};
const molarity = (v) => v.moles / v.liters;
const diluted = (v) => v.C1 * v.V1 / v.V2;
const massPercent = (v) => (v.solute / v.solution) * 100;
const ppm = (v) => (v.solute / v.solution) * 1e6;
const moleFraction = (v) => v.nA / (v.nA + v.nB);

export const templates = [
  {
    id: 'ch06-formula-mass',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.1',
    topic: 'formula mass',
    vars: {
      formula: { choices: FORMULAS },
      count: span(2, 5, 1, 1),
      mass: span(5.25, 48.75, 0.01, 4),
    },
    template: 'A {mass} g sample contains {count} formula units of {formula}. What is the formula mass of {formula}, in amu?',
    solve: formulaMass,
    unit: 'amu',
    sigFigs: 4,
    tolerance: 0.5,
    hints: () => [
      'Add each atomic mass once for every atom in the formula. The sample count is not part of the formula mass.',
      'Use the OpenStax atomic masses (H 1.008, C 12.01, O 16.00, Na 22.99, Cl 35.45, and so on).',
    ],
    why: (v, x) => `The formula mass of ${v.formula} is ${num(x, 4)} amu. The ${v.count} formula units do not change the mass of one unit.`,
    mistakes: [
      alt(formulaMass, 'times-count', 'The formula mass was multiplied by how many units were in the sample.', (v) => formulaMass(v) * v.count),
      alt(formulaMass, 'one-element', 'Only one element was counted. Add every atom in the formula.', (v) => {
        const match = String(v.formula).match(/[A-Z][a-z]?/);
        return ATOMIC_MASS[match[0]];
      }),
    ],
  },
  {
    id: 'ch06-grams-to-moles',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.1',
    topic: 'grams moles',
    vars: {
      formula: { choices: FORMULAS },
      grams: span(8.5, 42.5, 0.01, 3),
    },
    template: 'How many moles are in {grams} g of {formula}?',
    solve: gramsToMoles,
    unit: 'mol',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Moles = grams / molar mass.',
      'The molar mass is in g/mol, so grams cancel and moles are left.',
    ],
    why: (v, x) => `Moles = ${num(v.grams, 3)} g / ${num(molarMass(v.formula), 4)} g/mol = ${num(x, 3)} mol.`,
    mistakes: [
      alt(gramsToMoles, 'times-mass', 'Grams were multiplied by the molar mass. Divide by it.', (v) => v.grams * molarMass(v.formula)),
      alt(gramsToMoles, 'grams-only', 'That is still the gram amount. Divide by the molar mass.', (v) => v.grams),
    ],
  },
  {
    id: 'ch06-moles-to-grams',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.1',
    topic: 'grams moles',
    vars: {
      formula: { choices: FORMULAS },
      moles: span(0.25, 2.5, 0.01, 3),
    },
    template: 'What is the mass, in grams, of {moles} mol of {formula}?',
    solve: molesToGrams,
    unit: 'g',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Grams = moles × molar mass.',
      'Molar mass is the grams in one mole of the formula.',
    ],
    why: (v, x) => `Mass = ${num(v.moles, 3)} mol × ${num(molarMass(v.formula), 4)} g/mol = ${num(x, 3)} g.`,
    mistakes: [
      alt(molesToGrams, 'divided', 'The moles were divided by the molar mass. Multiply.', (v) => v.moles / molarMass(v.formula)),
      alt(molesToGrams, 'moles-only', 'That is the mole amount. Multiply by the molar mass to get grams.', (v) => v.moles),
    ],
  },
  {
    id: 'ch06-moles-to-particles',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.1',
    topic: 'grams moles',
    vars: { moles: span(0.125, 0.875, 0.001, 3) },
    template: 'How many molecules are in {moles} mol? Use 6.022 × 10^23 mol^−1.',
    solve: particles,
    unit: 'molecules',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Multiply moles by Avogadro’s number, 6.022 × 10^23.',
      'A smaller mole amount still needs the full 10^23 factor.',
    ],
    why: (v, x) => `Molecules = ${num(v.moles, 3)} × 6.022 × 10^23 = ${num(x, 3)} molecules.`,
    mistakes: [
      scaled(particles, 1e-3, 'milli', 'The 10^23 was replaced with 10^20. Keep Avogadro’s number.'),
      alt(particles, 'moles-only', 'That is the mole amount. Multiply by 6.022 × 10^23.', (v) => v.moles),
    ],
  },
  {
    id: 'ch06-percent-composition',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.1',
    topic: 'percent composition',
    vars: {
      formula: { choices: PERCENT_ROWS.map((item) => item.formula) },
      mass: span(12.5, 48.5, 0.1, 3),
    },
    derive(v) {
      return { element: percentRow(v.formula).element };
    },
    template: 'What is the mass percent of {element} in {formula}? The lab sample has a mass of {mass} g.',
    solve: composition,
    unit: '%',
    sigFigs: 4,
    tolerance: 0.5,
    hints: (v) => {
      const row = percentRow(v.formula);
      return [
        `Mass percent of ${row.element} = (mass of ${row.element} in one formula unit / formula mass) × 100.`,
        'The sample mass cancels. It does not change the percent.',
      ];
    },
    why: (v, x) => {
      const row = percentRow(v.formula);
      const part = ATOMIC_MASS[row.element] * row.count;
      return `% ${row.element} = (${num(part, 4)} / ${num(molarMass(row.formula), 4)}) × 100 = ${num(x, 4)}%. The ${num(v.mass, 3)} g sample is not used.`;
    },
    mistakes: [
      alt(composition, 'complement', 'That is the percent of everything else in the formula.', (v) => 100 - composition(v)),
      scaled(composition, 0.01, 'forgot-percent', 'That is the fraction. Multiply by 100 to get a percent.'),
    ],
  },
  {
    id: 'ch06-empirical-formula',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.2',
    topic: 'empirical formula',
    kind: 'exact',
    case: 'formula',
    vars: {
      recipe: { choices: EMPIRICAL.map((item) => item.text) },
      scale: span(0.5, 2.5, 0.01, 3),
    },
    derive(v) {
      const row = empiricalRow(v.recipe);
      return {
        gramsA: snap(row.ac * ATOMIC_MASS[row.a] * v.scale, 4),
        gramsB: snap(row.bc * ATOMIC_MASS[row.b] * v.scale, 4),
        elementA: row.a,
        elementB: row.b,
      };
    },
    format: { gramsA: 4, gramsB: 4 },
    template: 'A compound contains {gramsA} g of {elementA} and {gramsB} g of {elementB}. What is its empirical formula?',
    solve: (v) => empiricalRow(v.recipe).text,
    hints: () => [
      'Convert each mass to moles, divide by the smaller mole amount, then round to a small whole-number ratio.',
      'The empirical formula uses the smallest whole-number ratio, not a doubled one.',
    ],
    why: (v) => {
      const row = empiricalRow(v.recipe);
      return `Moles of ${row.a} and ${row.b} are in the ratio ${row.ac}:${row.bc}, so the empirical formula is ${row.text}.`;
    },
    mistakes: [
      {
        id: 'neighbor',
        message: 'The mole ratio was rounded to the wrong whole numbers.',
        wrong: (v) => empiricalRow(v.recipe).wrong,
      },
      {
        id: 'doubled',
        message: 'That is a doubled ratio. The empirical formula uses the smallest whole numbers.',
        wrong: (v) => empiricalRow(v.recipe).doubled,
      },
    ],
  },
  {
    id: 'ch06-molarity',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.3',
    topic: 'molarity',
    vars: {
      moles: span(0.25, 1.5, 0.01, 3),
      liters: span(0.5, 2, 0.01, 3),
    },
    template: '{moles} mol of solute is dissolved to make {liters} L of solution. What is the molarity?',
    solve: molarity,
    unit: 'M',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Molarity = moles of solute / liters of solution.',
      'Divide. Multiplying the moles by the volume does not give molarity.',
    ],
    why: (v, x) => `M = ${num(v.moles, 3)} mol / ${num(v.liters, 3)} L = ${num(x, 3)} M.`,
    mistakes: [
      scaled(molarity, 2, 'half-volume', 'The volume was cut in half before dividing. Use the full solution volume.'),
      scaled(molarity, 0.001, 'milliliters', 'The liters were treated like milliliters. Divide by liters, not by liters × 1000.'),
    ],
  },
  {
    id: 'ch06-dilution',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.3',
    topic: 'dilution',
    vars: {
      C1: span(1.2, 4, 0.01, 3),
      V1: span(25, 60, 0.1, 3),
      V2: span(120, 250, 0.1, 3),
    },
    derive(v) {
      return { C2: v.C1 * v.V1 / v.V2 };
    },
    template: 'A {C1} M solution is diluted from {V1} mL to {V2} mL. What is the new molarity?',
    solve: diluted,
    unit: 'M',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => v.C2 < v.C1 && v.V2 > v.V1 && v.C2 >= 0.01 && v.C2 <= 6,
    hints: () => [
      'Use C1·V1 = C2·V2. The volumes can stay in mL because the units cancel.',
      'Dilution lowers the molarity, so C2 is smaller than C1.',
    ],
    why: (v, x) => `C2 = (${num(v.C1, 3)})(${num(v.V1, 3)}) / ${num(v.V2, 3)} = ${num(x, 3)} M.`,
    mistakes: [
      alt(diluted, 'inverted', 'The volumes were flipped. C2 = C1·V1 / V2.', (v) => v.C1 * v.V2 / v.V1),
      alt(diluted, 'unchanged', 'That is the starting molarity. Dilution lowers it.', (v) => v.C1),
    ],
  },
  {
    id: 'ch06-mass-percent',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.4',
    topic: 'concentration',
    vars: {
      solute: span(4.5, 16.5, 0.01, 3),
      solution: span(120, 240, 0.1, 3),
    },
    template: 'A solution contains {solute} g of solute in {solution} g of solution. What is the mass percent of solute?',
    solve: massPercent,
    unit: '%',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Mass percent = (grams of solute / grams of solution) × 100.',
      'Divide by the solution mass, which already includes the solute.',
    ],
    why: (v, x) => `% = (${num(v.solute, 3)} / ${num(v.solution, 3)}) × 100 = ${num(x, 3)}%.`,
    mistakes: [
      scaled(massPercent, 0.01, 'fraction', 'That is the mass fraction. Multiply by 100.'),
      alt(massPercent, 'product', 'The masses were multiplied. Divide solute by solution, then multiply by 100.', (v) => v.solute * v.solution),
    ],
  },
  {
    id: 'ch06-ppm',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.4',
    topic: 'concentration',
    vars: {
      solute: span(0.025, 0.085, 0.001, 3),
      solution: span(200, 400, 1, 3),
    },
    template: 'A sample contains {solute} g of solute in {solution} g of solution. What is the concentration in ppm?',
    solve: ppm,
    unit: 'ppm',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'ppm = (mass of solute / mass of solution) × 1,000,000.',
      'Percent would stop at × 100. ppm uses one million.',
    ],
    why: (v, x) => `ppm = (${num(v.solute, 3)} / ${num(v.solution, 3)}) × 10^6 = ${num(x, 3)} ppm.`,
    mistakes: [
      scaled(ppm, 1e-4, 'percent', 'That is the mass percent. ppm multiplies the fraction by 10^6, not by 100.'),
      alt(ppm, 'inverted', 'The masses were flipped. Divide solute by solution.', (v) => (v.solution / v.solute) * 1e6),
    ],
  },
  {
    id: 'ch06-mole-fraction',
    ch: 6,
    openstax_section: 'OpenStax AF2e §6.4',
    topic: 'concentration',
    vars: {
      nA: span(0.4, 1.2, 0.01, 3),
      nB: span(2, 4, 0.01, 3),
    },
    template: 'A mixture contains {nA} mol of A and {nB} mol of B. What is the mole fraction of A?',
    solve: moleFraction,
    unit: null,
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Mole fraction of A = moles of A / total moles.',
      'Add the moles of A and B before you divide.',
    ],
    why: (v, x) => `X_A = ${num(v.nA, 3)} / (${num(v.nA, 3)} + ${num(v.nB, 3)}) = ${num(x, 3)}.`,
    mistakes: [
      alt(moleFraction, 'ratio-only', 'That is moles of A divided by moles of B. Use the total moles.', (v) => v.nA / v.nB),
      alt(moleFraction, 'other', 'That is the mole fraction of B.', (v) => v.nB / (v.nA + v.nB)),
    ],
  },
];
