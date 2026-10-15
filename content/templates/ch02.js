import { alt, num, scaled, span } from './kit.js';

const average = (v) => v.fraction * v.light + (1 - v.fraction) * v.heavy;
const neutrons = (v) => v.massNumber - v.protons;
const electrons = (v) => v.protons - v.charge;
const shownAverage = (v) => Number(average(v).toPrecision(4));
const percentLight = (v) => ((shownAverage(v) - v.heavy) / (v.light - v.heavy)) * 100;

export const templates = [
  {
    id: 'ch02-average-atomic-mass',
    ch: 2,
    openstax_section: 'OpenStax AF2e §2.3',
    topic: 'average atomic mass',
    vars: {
      light: span(10.25, 12.75, 0.01, 4),
      heavy: span(24.25, 26.75, 0.01, 4),
      fraction: span(0.15, 0.4, 0.001, 3),
    },
    template: 'An element has isotope masses {light} amu and {heavy} amu. The lighter isotope is {fraction} of the atoms. What is the average atomic mass in amu?',
    solve: average,
    unit: 'amu',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Average mass = (fraction × mass) + (the other fraction × the other mass).',
      'The heavier fraction is 1 minus the lighter fraction. Do not just average the two masses.',
    ],
    why: (v, x) => {
      const other = 1 - v.fraction;
      return `(${num(v.fraction, 3)})(${num(v.light, 4)}) + (${num(other, 3)})(${num(v.heavy, 4)}) = ${num(x, 3)} amu.`;
    },
    mistakes: [
      alt(average, 'swapped', 'The fractions are on the wrong isotopes.', (v) => (1 - v.fraction) * v.light + v.fraction * v.heavy),
      alt(average, 'lighter-only', 'That is only the lighter isotope. Both isotopes belong in the average.', (v) => v.light),
    ],
  },
  {
    id: 'ch02-neutron-count',
    ch: 2,
    openstax_section: 'OpenStax AF2e §2.3',
    topic: 'subatomic particles',
    vars: {
      mass: span(12.5, 36.5, 0.01, 4),
      massNumber: { min: 28, max: 42, step: 1 },
      protons: { min: 12, max: 18, step: 1 },
    },
    template: 'A {mass} g sample is the isotope with mass number {massNumber} and atomic number {protons}. How many neutrons are in one atom?',
    solve: neutrons,
    unit: null,
    sigFigs: 2,
    tolerance: 0.5,
    valid: (v) => neutrons(v) >= 10 && neutrons(v) <= 30,
    hints: () => [
      'Neutrons = mass number − atomic number.',
      'The gram amount is the sample size. It does not change the count inside one atom.',
    ],
    why: (v, x) => `Neutrons = ${v.massNumber} − ${v.protons} = ${num(x, 2)}.`,
    mistakes: [
      alt(neutrons, 'sum', 'Protons and neutrons add to the mass number. Subtract the atomic number.', (v) => v.massNumber + v.protons),
      alt(neutrons, 'mass-number', 'That is the mass number. Subtract the atomic number to get neutrons.', (v) => v.massNumber),
    ],
  },
  {
    id: 'ch02-ion-electrons',
    ch: 2,
    openstax_section: 'OpenStax AF2e §2.3',
    topic: 'subatomic particles',
    vars: {
      mass: span(12.5, 36.5, 0.01, 4),
      protons: { min: 11, max: 20, step: 1 },
      charge: { choices: [-2, -1, 1, 2, 3] },
    },
    template: 'A {mass} g sample contains an ion with atomic number {protons} and charge {charge}. How many electrons are in one ion?',
    solve: electrons,
    unit: null,
    sigFigs: 2,
    tolerance: 0.5,
    hints: () => [
      'A positive charge means electrons were lost. Electrons = protons − charge.',
      'Charge +2 removes 2 electrons. Charge −2 adds 2 electrons.',
    ],
    why: (v, x) => `Electrons = ${v.protons} − (${v.charge}) = ${num(x, 2)}.`,
    mistakes: [
      alt(electrons, 'added-charge', 'The charge was added to the protons. Subtract a positive charge.', (v) => v.protons + v.charge),
      alt(electrons, 'protons-only', 'That is the proton count. The charge changes the electron count.', (v) => v.protons),
    ],
  },
  {
    id: 'ch02-percent-abundance',
    ch: 2,
    openstax_section: 'OpenStax AF2e §2.3',
    topic: 'average atomic mass',
    vars: {
      light: span(19.25, 21.25, 0.01, 4),
      heavy: span(22.25, 24.25, 0.01, 4),
      fraction: span(0.15, 0.4, 0.001, 3),
    },
    derive(v) {
      return { average: shownAverage(v) };
    },
    format: { average: 4 },
    template: 'Two isotopes have masses {light} amu and {heavy} amu. Their average atomic mass is {average} amu. What percent of the atoms are the lighter isotope?',
    solve: percentLight,
    unit: '%',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Let x be the lighter fraction. Then x(m1) + (1 − x)(m2) = average.',
      'Percent is the fraction times 100. The heavier percent is what is left over.',
    ],
    why: (v, x) => `The lighter fraction is ${num(v.fraction, 3)}, so the percent is ${num(x, 3)}%.`,
    mistakes: [
      alt(percentLight, 'other-isotope', 'That is the percent of the heavier isotope.', (v) => (1 - v.fraction) * 100),
      scaled(percentLight, 0.01, 'forgot-percent', 'That is the fraction, not the percent. Multiply by 100.'),
    ],
  },
];
