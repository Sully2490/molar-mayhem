import { WATER_C, alt, num, scaled, span } from './kit.js';

const FORMATION = [
  {
    text: 'CH4 + 2 O2 → CO2 + 2 H2O',
    given: 'CH4 −74.8, CO2 −393.5, H2O −285.8, O2 0',
    dh: -890.3,
  },
  {
    text: '2 H2 + O2 → 2 H2O',
    given: 'H2 0, O2 0, H2O −285.8',
    dh: -571.6,
  },
  {
    text: 'CaO + CO2 → CaCO3',
    given: 'CaO −634.9, CO2 −393.5, CaCO3 −1207.0',
    dh: -178.6,
  },
  {
    text: 'C2H4 + 3 O2 → 2 CO2 + 2 H2O',
    given: 'C2H4 52.4, CO2 −393.5, H2O −285.8, O2 0',
    dh: -1411,
  },
];

function formationRow(label) {
  const found = FORMATION.find((item) => item.text === label);
  if (!found) throw new Error(`Unknown formation reaction ${label}`);
  return found;
}

const heatQ = (v) => v.mass * WATER_C * v.dT;
const massFromQ = (v) => (v.q * 1000) / (WATER_C * v.dT);
const deltaFromQ = (v) => (v.q * 1000) / (v.mass * WATER_C);
const specificHeat = (v) => (v.q * 1000) / (v.mass * v.dT);
const coffeeHeat = (v) => v.mass * WATER_C * (v.T2 - v.T1);
const mixTemp = (v) => (v.mC * v.Tc + v.mH * v.Th) / (v.mC + v.mH);
const bombHeat = (v) => v.Ccal * v.dT;
const hess = (v) => v.h1 + v.h2;
const formation = (v) => formationRow(v.rxn).dh * v.moles;
const bondEnergy = (v) => v.moles * (436 + 243 - 2 * 431);
const perGram = (v) => v.q / v.mass;
const perMole = (v) => v.q / v.moles;

export const templates = [
  {
    id: 'ch09-heat-q',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.1',
    topic: 'calorimetry',
    vars: {
      mass: span(55.5, 145.5, 0.1, 4),
      T1: span(12.5, 28.5, 0.1, 3),
      dT: span(8.5, 24.5, 0.1, 3),
    },
    derive(v) {
      return { T2: v.T1 + v.dT };
    },
    template: '{mass} g of water warms from {T1} °C by {dT} °C. How much heat, in J, does the water gain? Use c = 4.184 J/(g·°C).',
    solve: heatQ,
    unit: 'J',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => v.T1 >= 5 && v.T2 <= 95 && v.dT >= 1 && v.dT <= 60,
    hints: () => [
      'q = m·c·ΔT. For water, c = 4.184 J/(g·°C).',
      'ΔT is already the change. Do not add 273.',
    ],
    why: (v, x) => `q = (${num(v.mass, 4)})(4.184)(${num(v.dT, 3)}) = ${num(x, 3)} J. The water ends at ${num(v.T2, 3)} °C.`,
    mistakes: [
      alt(heatQ, 'forgot-c', 'The specific heat was left out. Multiply by 4.184.', (v) => v.mass * v.dT),
      alt(heatQ, 'kelvin-span', '273 was added to ΔT. The temperature change is the same on both scales.', (v) => v.mass * WATER_C * (v.dT + 273.15)),
    ],
  },
  {
    id: 'ch09-mass-from-q',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.1',
    topic: 'calorimetry',
    vars: {
      q: span(2.5, 8.5, 0.01, 3),
      dT: span(10.5, 28.5, 0.1, 3),
      T1: span(15.5, 30.5, 0.1, 3),
    },
    derive(v) {
      return { T2: v.T1 + v.dT, mass: massFromQ(v) };
    },
    template: 'Water starts at {T1} °C and its temperature rises by {dT} °C after it gains {q} kJ. What is the mass of the water, in grams? Use c = 4.184 J/(g·°C).',
    solve: massFromQ,
    unit: 'g',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => v.T1 >= 5 && v.T2 <= 95 && v.dT >= 1 && v.dT <= 60 && v.mass >= 0.1 && v.mass <= 500,
    hints: () => [
      'Solve q = m·c·ΔT for m. Convert kJ to J first.',
      'm = q / (c·ΔT).',
    ],
    why: (v, x) => `m = (${num(v.q, 3)} × 1000) / ((4.184)(${num(v.dT, 3)})) = ${num(x, 3)} g.`,
    mistakes: [
      alt(massFromQ, 'forgot-kilo', 'The heat was left in kJ, so the mass is 1000 times too small.', (v) => v.q / (WATER_C * v.dT)),
      alt(massFromQ, 'times', 'q, c, and ΔT were multiplied. Mass is q divided by c·ΔT.', (v) => v.q * 1000 * WATER_C * v.dT),
    ],
  },
  {
    id: 'ch09-delta-t',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.1',
    topic: 'calorimetry',
    vars: {
      mass: span(60.5, 140.5, 0.1, 4),
      q: span(2.5, 6.5, 0.01, 3),
      T1: span(18.5, 32.5, 0.1, 3),
    },
    derive(v) {
      const dT = deltaFromQ(v);
      return { dT, T2: v.T1 + dT };
    },
    template: '{mass} g of water starts at {T1} °C and gains {q} kJ. What is ΔT, in °C? Use c = 4.184 J/(g·°C).',
    solve: deltaFromQ,
    unit: '°C',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => v.T1 >= 5 && v.T2 <= 95 && v.dT >= 1 && v.dT <= 60,
    hints: () => [
      'ΔT = q / (m·c). Convert kJ to J.',
      'A temperature change in °C has the same number as a change in kelvin.',
    ],
    why: (v, x) => `ΔT = (${num(v.q, 3)} × 1000) / ((${num(v.mass, 4)})(4.184)) = ${num(x, 3)} °C. The water ends at ${num(v.T2, 3)} °C.`,
    mistakes: [
      alt(deltaFromQ, 'forgot-kilo', 'The heat stayed in kJ, so ΔT is 1000 times too small.', (v) => v.q / (v.mass * WATER_C)),
      alt(deltaFromQ, 'celsius-shift', '273 was added to the temperature change.', (v) => deltaFromQ(v) + 273.15),
    ],
  },
  {
    id: 'ch09-specific-heat',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.2',
    topic: 'calorimetry',
    vars: {
      mass: span(52.5, 68.5, 0.1, 3),
      dT: span(15.5, 19.5, 0.1, 3),
      q: span(2.8, 4.4, 0.01, 3),
      T1: span(16.5, 28.5, 0.1, 3),
    },
    derive(v) {
      return { T2: v.T1 + v.dT };
    },
    template: 'A liquid sample of {mass} g starts at {T1} °C, warms by {dT} °C, and gains {q} kJ. What is its specific heat, in J/(g·°C)?',
    solve: specificHeat,
    unit: 'J/g°C',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => v.T1 >= 5 && v.T2 <= 95 && v.dT >= 1 && v.dT <= 60,
    hints: () => [
      'c = q / (m·ΔT). Convert kJ to J.',
      'Specific heat is energy per gram per degree.',
    ],
    why: (v, x) => `c = (${num(v.q, 3)} × 1000) / ((${num(v.mass, 3)})(${num(v.dT, 3)})) = ${num(x, 3)} J/(g·°C).`,
    mistakes: [
      alt(specificHeat, 'forgot-mass', 'The mass was left out of the denominator.', (v) => (v.q * 1000) / v.dT),
      scaled(specificHeat, 4.184, 'times-water', 'The water value 4.184 was multiplied in. This sample’s c is what you are solving for.'),
    ],
  },
  {
    id: 'ch09-coffee-cup-heat',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.2',
    topic: 'calorimetry',
    vars: {
      mass: span(60.5, 110.5, 0.1, 4),
      T1: span(14.5, 24.5, 0.1, 3),
      T2: span(40.5, 62.5, 0.1, 3),
    },
    derive(v) {
      return { dT: v.T2 - v.T1 };
    },
    template: 'In a coffee-cup calorimeter, {mass} g of water warms from {T1} °C to {T2} °C. How much heat, in J, did the water gain? Use c = 4.184 J/(g·°C).',
    solve: coffeeHeat,
    unit: 'J',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => v.T1 >= 5 && v.T2 <= 95 && v.T2 > v.T1 && v.dT >= 1 && v.dT <= 60,
    hints: () => [
      'ΔT = final − initial. Then q = m·c·ΔT.',
      'The coffee cup is treated as if only the water stores the heat.',
    ],
    why: (v, x) => `ΔT = ${num(v.T2, 3)} − ${num(v.T1, 3)} = ${num(v.dT, 3)} °C. q = (${num(v.mass, 4)})(4.184)(${num(v.dT, 3)}) = ${num(x, 3)} J.`,
    mistakes: [
      alt(coffeeHeat, 'swapped', 'The temperatures were subtracted in the wrong order, so the heat came out negative.', (v) => v.mass * WATER_C * (v.T1 - v.T2)),
      alt(coffeeHeat, 'forgot-c', 'The specific heat of water was left out.', (v) => v.mass * (v.T2 - v.T1)),
    ],
  },
  {
    id: 'ch09-coffee-cup-mix',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.2',
    topic: 'calorimetry',
    vars: {
      mC: span(85.5, 115.5, 0.1, 4),
      mH: span(40.5, 55.5, 0.1, 3),
      Tc: span(10.5, 22.5, 0.1, 3),
      Th: span(48.5, 70.5, 0.1, 3),
    },
    derive(v) {
      const Tf = mixTemp(v);
      return { Tf, dT: Tf - v.Tc, dTHot: v.Th - Tf };
    },
    template: '{mC} g of water at {Tc} °C is mixed with {mH} g of water at {Th} °C in a coffee cup. What is the final temperature, in °C? Both samples are water, c = 4.184 J/(g·°C).',
    solve: mixTemp,
    unit: '°C',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => v.Tc >= 5 && v.Th <= 95 && v.Tf > v.Tc && v.Tf < v.Th && v.dT >= 1 && v.dT <= 60 && v.dTHot >= 1 && v.dTHot <= 60,
    hints: () => [
      'Heat lost by the hot water equals heat gained by the cold water.',
      'Because both are water, Tf = (m_cold·T_cold + m_hot·T_hot) / (m_cold + m_hot).',
    ],
    why: (v, x) => `Tf = (${num(v.mC, 4)})(${num(v.Tc, 3)}) + (${num(v.mH, 3)})(${num(v.Th, 3)}) all over ${num(v.mC + v.mH, 4)} = ${num(x, 3)} °C.`,
    mistakes: [
      alt(mixTemp, 'hot-start', 'That is the hot water’s starting temperature. The mixture ends between the two starts.', (v) => v.Th),
      alt(mixTemp, 'cold-start', 'That is the cold water’s starting temperature. The mixture ends warmer than that.', (v) => v.Tc),
    ],
  },
  {
    id: 'ch09-bomb',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.2',
    topic: 'calorimetry',
    vars: {
      Ccal: span(4.5, 9.5, 0.01, 3),
      dT: span(2.5, 8.5, 0.01, 3),
      T1: span(20.5, 25.5, 0.1, 3),
    },
    derive(v) {
      return { T2: v.T1 + v.dT };
    },
    template: 'A bomb calorimeter has C = {Ccal} kJ/°C. Its water bath starts at {T1} °C and rises by {dT} °C during a combustion. How much heat, in kJ, did the reaction release?',
    solve: bombHeat,
    unit: 'kJ',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => v.T1 >= 5 && v.T2 <= 95 && v.dT >= 1 && v.dT <= 60,
    hints: () => [
      'Heat released = C_cal × ΔT. The calorimeter warms, so the reaction is exothermic.',
      'Report the positive heat released. C is already in kJ/°C.',
    ],
    why: (v, x) => `q = (${num(v.Ccal, 3)})(${num(v.dT, 3)}) = ${num(x, 3)} kJ. The bath ends at ${num(v.T2, 3)} °C.`,
    mistakes: [
      alt(bombHeat, 'calorimeter-constant', 'That is C, not C × ΔT.', (v) => v.Ccal),
      scaled(bombHeat, 1000, 'joules', 'The answer was converted to joules. C is already in kJ/°C, so the product is in kJ.'),
    ],
  },
  {
    id: 'ch09-hess',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.3',
    topic: 'thermochemistry',
    vars: {
      h1: span(-186.5, -112.5, 0.1, 4),
      h2: span(-96.5, -42.5, 0.1, 4),
    },
    template: 'Step 1 has ΔH = {h1} kJ. Step 2 has ΔH = {h2} kJ. The target reaction is step 1 followed by step 2. What is ΔH for the target, in kJ?',
    solve: hess,
    unit: 'kJ',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Hess’s law: add the step enthalpies when the target is the sum of the steps.',
      'Keep the signs. Both steps here are exothermic.',
    ],
    why: (v, x) => `ΔH = ${num(v.h1, 4)} + ${num(v.h2, 4)} = ${num(x, 4)} kJ.`,
    mistakes: [
      alt(hess, 'one-step', 'Only the first step was kept. Add the second step as well.', (v) => v.h1),
      alt(hess, 'subtracted', 'The second step was subtracted. The target uses both steps in the forward direction.', (v) => v.h1 - v.h2),
    ],
  },
  {
    id: 'ch09-formation',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.3',
    topic: 'thermochemistry',
    vars: {
      rxn: { choices: FORMATION.map((item) => item.text) },
      moles: span(0.25, 0.75, 0.001, 3),
    },
    derive(v) {
      return { given: formationRow(v.rxn).given };
    },
    template: 'For {moles} mol of {rxn}, use these ΔHf° values in kJ/mol: {given}. What is ΔH, in kJ?',
    solve: formation,
    unit: 'kJ',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'ΔH°rxn = Σ n·ΔHf°(products) − Σ n·ΔHf°(reactants), then multiply by the moles of reaction.',
      'Elements in their standard states have ΔHf° = 0.',
    ],
    why: (v, x) => `Per mole of reaction, ΔH = ${num(formationRow(v.rxn).dh, 4)} kJ. For ${num(v.moles, 3)} mol, ΔH = ${num(x, 3)} kJ.`,
    mistakes: [
      alt(formation, 'per-mole', 'That is the enthalpy for one mole of reaction. Multiply by the moles given.', (v) => formationRow(v.rxn).dh),
      scaled(formation, -1, 'sign', 'The products and reactants were switched, so the sign flipped.'),
    ],
  },
  {
    id: 'ch09-bond-energy',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.4',
    topic: 'thermochemistry',
    vars: { moles: span(0.25, 0.85, 0.001, 3) },
    template: 'Estimate ΔH, in kJ, for {moles} mol of H2 + Cl2 → 2 HCl. Use bond energies H–H 436 kJ/mol, Cl–Cl 243 kJ/mol, and H–Cl 431 kJ/mol.',
    solve: bondEnergy,
    unit: 'kJ',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'ΔH ≈ Σ bonds broken − Σ bonds formed.',
      'Two H–Cl bonds form, so subtract 2 × 431. Then multiply by the moles.',
    ],
    why: (v, x) => `Per mole: (436 + 243) − 2(431) = −183 kJ. For ${num(v.moles, 3)} mol, ΔH = ${num(x, 3)} kJ.`,
    mistakes: [
      alt(bondEnergy, 'sign', 'Bonds formed and bonds broken were subtracted in the wrong order.', (v) => v.moles * (2 * 431 - 436 - 243)),
      alt(bondEnergy, 'one-hcl', 'Only one H–Cl bond was counted on the product side.', (v) => v.moles * (436 + 243 - 431)),
    ],
  },
  {
    id: 'ch09-per-gram',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.3',
    topic: 'thermochemistry',
    vars: {
      mass: span(12.5, 36.5, 0.1, 3),
      q: span(155, 415, 1, 3),
    },
    template: 'Burning {mass} g of a fuel releases {q} kJ. What is the heat released per gram, in kJ/g?',
    solve: perGram,
    unit: 'kJ/g',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Divide the heat by the grams burned.',
      'The result is an energy density, kJ for each gram.',
    ],
    why: (v, x) => `${num(v.q, 3)} kJ / ${num(v.mass, 3)} g = ${num(x, 3)} kJ/g.`,
    mistakes: [
      alt(perGram, 'total', 'That is the total heat, not the heat per gram.', (v) => v.q),
      alt(perGram, 'inverted', 'Grams were divided by the heat. Divide heat by grams.', (v) => v.mass / v.q),
    ],
  },
  {
    id: 'ch09-per-mole',
    ch: 9,
    openstax_section: 'OpenStax AF2e §9.3',
    topic: 'thermochemistry',
    vars: {
      moles: span(0.25, 0.65, 0.001, 3),
      q: span(40.5, 95.5, 0.1, 3),
    },
    template: '{moles} mol of a reaction releases {q} kJ. What is ΔH per mole of reaction, in kJ/mol?',
    solve: perMole,
    unit: 'kJ/mol',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Divide the heat by the moles of reaction.',
      'Per mole means one mole, so the mole amount has to come out of the total.',
    ],
    why: (v, x) => `${num(v.q, 3)} kJ / ${num(v.moles, 3)} mol = ${num(x, 3)} kJ/mol.`,
    mistakes: [
      alt(perMole, 'total', 'That is the total heat for the sample, not the value per mole.', (v) => v.q),
      alt(perMole, 'times', 'The heat was multiplied by the moles. Divide instead.', (v) => v.q * v.moles),
    ],
  },
];
