import { LIGHT, NA, PLANCK, RYDBERG, alt, num, scaled, span } from './kit.js';

const ELECTRON_MASS = 9.109e-31;

const frequency = (v) => LIGHT / (v.lambdaNm * 1e-9);
const wavelength = (v) => (LIGHT / v.hertz) * 1e9;
const photon = (v) => PLANCK * frequency(v);
const levelGap = (v) => RYDBERG * (1 / v.n1 ** 2 - 1 / (v.n1 + v.delta) ** 2);
const moleEnergy = (v) => levelGap(v) * v.moles * NA;
const deBroglie = (v) => PLANCK / (ELECTRON_MASS * v.speed * 1e6);

export const templates = [
  {
    id: 'ch03-frequency-from-wavelength',
    ch: 3,
    openstax_section: 'OpenStax AF2e §3.1',
    topic: 'light',
    vars: { lambdaNm: span(215.5, 685.5, 0.1, 4) },
    template: 'A photon has a wavelength of {lambdaNm} nm. What is its frequency in Hz? Use c = 2.998 × 10^8 m/s.',
    solve: frequency,
    unit: 'Hz',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'c = λν, so ν = c / λ. Convert nm to m before dividing.',
      '1 nm = 10^−9 m. Do not divide by the nanometer number alone.',
    ],
    why: (v, x) => `ν = (2.998 × 10^8 m/s) / (${num(v.lambdaNm, 4)} × 10^−9 m) = ${num(x, 4)} Hz.`,
    mistakes: [
      scaled(frequency, 1e-9, 'forgot-nm', 'The wavelength is still in nm. Convert to meters first (× 10^−9).'),
      alt(frequency, 'product', 'You multiplied c by λ. Frequency is c divided by λ.', (v) => LIGHT * v.lambdaNm * 1e-9),
    ],
  },
  {
    id: 'ch03-wavelength-from-frequency',
    ch: 3,
    openstax_section: 'OpenStax AF2e §3.1',
    topic: 'light',
    vars: { lambdaNm: span(215.5, 685.5, 0.1, 4) },
    derive(v) {
      return { hertz: Number(frequency(v).toPrecision(4)) };
    },
    format: { hertz: 4 },
    template: 'A photon has a frequency of {hertz} Hz. What is its wavelength in nm? Use c = 2.998 × 10^8 m/s.',
    solve: (v) => (LIGHT / v.hertz) * 1e9,
    unit: 'nm',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'λ = c / ν. The result in meters is still huge in scientific notation; convert to nm.',
      'Multiply meters by 10^9 to get nanometers.',
    ],
    why: (v, x) => `λ = (2.998 × 10^8) / ${num(v.hertz, 4)} = ${num(x / 1e9, 4)} m = ${num(x, 4)} nm.`,
    mistakes: [
      scaled((v) => (LIGHT / v.hertz) * 1e9, 1e-9, 'left-in-meters', 'That number is still in meters. This question asks for nm.'),
      alt((v) => (LIGHT / v.hertz) * 1e9, 'inverted', 'You divided frequency by c. Wavelength is c / ν.', (v) => (v.hertz / LIGHT) * 1e9),
    ],
  },
  {
    id: 'ch03-photon-energy',
    ch: 3,
    openstax_section: 'OpenStax AF2e §3.1',
    topic: 'photon energy',
    vars: { lambdaNm: span(215.5, 685.5, 0.1, 4) },
    template: 'What is the energy, in J, of one photon with wavelength {lambdaNm} nm? Use h = 6.626 × 10^−34 J·s and c = 2.998 × 10^8 m/s.',
    solve: photon,
    unit: 'J',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Find the frequency from c = λν, then E = hν. You can also use E = hc/λ.',
      'λ must be in meters. 1 nm = 10^−9 m.',
    ],
    why: (v, x) => `E = hc/λ = (6.626 × 10^−34)(2.998 × 10^8) / (${num(v.lambdaNm, 4)} × 10^−9) = ${num(x, 4)} J.`,
    mistakes: [
      scaled(photon, 1e-9, 'forgot-nm', 'The wavelength was not converted from nm to m.'),
      alt(photon, 'missing-c', 'That used h/λ and left out the speed of light.', (v) => PLANCK / (v.lambdaNm * 1e-9)),
    ],
  },
  {
    id: 'ch03-rydberg-energy',
    ch: 3,
    openstax_section: 'OpenStax AF2e §3.2',
    topic: 'rydberg',
    vars: {
      n1: { min: 1, max: 4, step: 1 },
      delta: { min: 1, max: 3, step: 1 },
      moles: span(0.125, 1.875, 0.001, 4),
    },
    template: 'How many joules are released when {moles} mol of electrons fall from n = {n1} + {delta} to n = {n1}? Use ΔE = 2.179 × 10^−18 J (1/n_low^2 − 1/n_high^2) for one electron, and N_A = 6.022 × 10^23.',
    solve: moleEnergy,
    unit: 'J',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Square each n, subtract the two 1/n^2 terms, then multiply by 2.179 × 10^−18 J.',
      'That is the energy of one electron. Multiply by the moles and by Avogadro’s number.',
    ],
    why: (v, x) => {
      const high = v.n1 + v.delta;
      return `One electron releases ${num(levelGap(v), 4)} J. For ${num(v.moles, 4)} mol, E = ${num(x, 4)} J. The jump is n = ${high} → n = ${v.n1}.`;
    },
    mistakes: [
      scaled(moleEnergy, -1, 'sign', 'The electron is falling, so this emission is positive in the way the question is asked. The levels were subtracted backward.'),
      scaled(moleEnergy, 1 / NA, 'one-electron', 'That is about the energy of the moles of electrons without Avogadro’s number. Multiply by 6.022 × 10^23.'),
    ],
  },
  {
    id: 'ch03-rydberg-wavelength',
    ch: 3,
    openstax_section: 'OpenStax AF2e §3.2',
    topic: 'rydberg',
    vars: {
      n1: { min: 1, max: 4, step: 1 },
      delta: { min: 1, max: 3, step: 1 },
      moles: span(0.125, 1.875, 0.001, 4),
    },
    template: 'A lamp produces {moles} mol of photons from the electron jump n = {n1} + {delta} → n = {n1}. What is the wavelength of one of those photons, in nm? Use ΔE = 2.179 × 10^−18 J (1/n_low^2 − 1/n_high^2), h = 6.626 × 10^−34 J·s, and c = 2.998 × 10^8 m/s.',
    solve: (v) => (PLANCK * LIGHT / levelGap(v)) * 1e9,
    unit: 'nm',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'The mole amount does not change the wavelength of one photon. Find ΔE for one electron, then λ = hc/ΔE.',
      'Convert meters to nm at the end (× 10^9).',
    ],
    why: (v, x) => `ΔE for one electron is ${num(levelGap(v), 4)} J. λ = hc/ΔE = ${num(x, 4)} nm. The ${num(v.moles, 4)} mol tells you how many photons, not the wavelength.`,
    mistakes: [
      scaled((v) => (PLANCK * LIGHT / levelGap(v)) * 1e9, 1e-9, 'meters', 'That wavelength is still in meters. Multiply by 10^9 for nm.'),
      alt((v) => (PLANCK * LIGHT / levelGap(v)) * 1e9, 'inverted', 'hc and ΔE were flipped. Wavelength is hc / ΔE.', (v) => (levelGap(v) / (PLANCK * LIGHT)) * 1e9),
    ],
  },
  {
    id: 'ch03-debroglie',
    ch: 3,
    openstax_section: 'OpenStax AF2e §3.3',
    topic: 'de broglie',
    vars: { speed: span(1.125, 6.875, 0.001, 4) },
    template: 'An electron (mass 9.109 × 10^−31 kg) moves at {speed} × 10^6 m/s. What is its de Broglie wavelength in meters? Use h = 6.626 × 10^−34 J·s.',
    solve: deBroglie,
    unit: 'm',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'λ = h / (mv). The speed in the question is already written as a power of ten.',
      'Use the speed in m/s: the printed number times 10^6. Do not use h × m × v.',
    ],
    why: (v, x) => `λ = h / (mv) = (6.626 × 10^−34) / [(9.109 × 10^−31)(${num(v.speed, 4)} × 10^6)] = ${num(x, 4)} m.`,
    mistakes: [
      scaled(deBroglie, 1e6, 'forgot-million', 'The speed is {number} × 10^6 m/s, not the number alone.'),
      alt(deBroglie, 'product', 'You multiplied h by mv. Wavelength is h divided by mv.', (v) => PLANCK * ELECTRON_MASS * v.speed * 1e6),
    ],
  },
];
