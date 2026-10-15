import { molarMass } from '../../js/masses.js';
import { GASES, R_ATM, R_J, WATER_VAPOR, alt, gasByName, num, scaled, snap, span, vaporByLabel } from './kit.js';

const STP_MOLAR = 22.4;

const PAIRS = [
  { text: 'H2 compared with O2', light: 'H2', heavy: 'O2' },
  { text: 'H2 compared with N2', light: 'H2', heavy: 'N2' },
  { text: 'He compared with N2', light: 'He', heavy: 'N2' },
  { text: 'He compared with CO2', light: 'He', heavy: 'CO2' },
  { text: 'CH4 compared with CO2', light: 'CH4', heavy: 'CO2' },
  { text: 'H2 compared with CO2', light: 'H2', heavy: 'CO2' },
];

const gasNames = GASES.map((item) => item.text);
const pairNames = PAIRS.map((item) => item.text);
const vaporLabels = WATER_VAPOR.filter((item) => item.celsius >= 30).map((item) => item.text);

function pairRow(label) {
  const found = PAIRS.find((item) => item.text === label);
  if (!found) throw new Error(`Unknown gas pair ${label}`);
  return found;
}

function pressure(v) {
  return (v.n * R_ATM * v.T) / v.V;
}

function inRange(v) {
  const pressures = [v.P, v.P1, v.P2, v.Pgas, v.Ptot].filter((value) => typeof value === 'number');
  if (typeof v.n !== 'number' || v.n < 0.001 || v.n > 20) return false;
  if (pressures.length === 0 || pressures.some((value) => value < 0.1 || value > 10)) return false;
  if (typeof v.T === 'number' && (v.T < 250 || v.T > 500)) return false;
  if (typeof v.T2 === 'number' && (v.T2 < 250 || v.T2 > 500)) return false;
  return true;
}

const boyle = (v) => (v.P1 * v.V1) / v.P2;
const charles = (v) => v.V1 * v.T2 / v.T1;
const gayLussac = (v) => v.P1 * v.T2 / v.T1;
const combined = (v) => (v.P1 * v.V1 * v.T2) / (v.P2 * v.T1);
const idealV = (v) => (v.n * R_ATM * v.T) / v.P;
const idealP = (v) => pressure(v);
const idealN = (v) => (v.P * v.V) / (R_ATM * v.T);
const idealT = (v) => (v.P * v.V) / (v.n * R_ATM);
const density = (v) => (v.P * molarMass(gasByName(v.gas).formula)) / (R_ATM * v.T);
const molarFromDensity = (v) => (v.d * R_ATM * v.T) / v.P;
const partial = (v) => v.x * v.Ptot;
const dryPressure = (v) => v.Ptot - vaporByLabel(v.bath).torr / 760;
const stpVolume = (v) => (v.grams / molarMass(gasByName(v.gas).formula)) * STP_MOLAR;

function graham(v) {
  const row = pairRow(v.pair);
  return Math.sqrt(molarMass(row.heavy) / molarMass(row.light));
}

function rms(v) {
  const kg = molarMass(gasByName(v.gas).formula) / 1000;
  return Math.sqrt((3 * R_J * v.T) / kg);
}

export const templates = [
  {
    id: 'ch08-boyle',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.2',
    topic: 'gas laws',
    vars: {
      n: span(0.4, 1.6, 0.01, 3),
      T: span(290.5, 360.5, 0.1, 4),
      P1: span(2, 3.6, 0.01, 3),
      V1: span(2.5, 6.5, 0.01, 3),
      P2: span(0.6, 1.2, 0.01, 3),
    },
    derive(v) {
      return { P: v.P1, V2: boyle(v) };
    },
    template: '{n} mol of gas is held at {T} K. The pressure changes from {P1} atm to {P2} atm while the temperature stays fixed. The starting volume is {V1} L. What is the new volume?',
    solve: boyle,
    unit: 'L',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => inRange(v) && v.V2 >= 0.1 && v.V2 <= 50,
    hints: () => [
      'Boyle’s law: P1·V1 = P2·V2. Temperature and moles stay the same.',
      'Solve for V2 = P1·V1 / P2.',
    ],
    why: (v, x) => `V2 = (${num(v.P1, 3)})(${num(v.V1, 3)}) / ${num(v.P2, 3)} = ${num(x, 3)} L.`,
    mistakes: [
      alt(boyle, 'flipped', 'The pressures were flipped. The higher pressure goes with the smaller volume.', (v) => (v.P2 * v.V1) / v.P1),
      alt(boyle, 'unchanged', 'That is the starting volume. The pressure change has to change the volume.', (v) => v.V1),
    ],
  },
  {
    id: 'ch08-charles',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.2',
    topic: 'gas laws',
    vars: {
      n: span(0.35, 1.4, 0.01, 3),
      P: span(0.8, 2.4, 0.01, 3),
      V1: span(2.2, 6.2, 0.01, 3),
      T1: span(285.5, 320.5, 0.1, 4),
      T2: span(390.5, 460.5, 0.1, 4),
    },
    derive(v) {
      return { V2: charles(v) };
    },
    template: '{n} mol of gas is kept at {P} atm. The volume is {V1} L at {T1} K. What is the volume at {T2} K?',
    solve: charles,
    unit: 'L',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => inRange(v) && v.V2 >= 0.1 && v.V2 <= 50,
    hints: () => [
      'Charles’s law: V1/T1 = V2/T2. Both temperatures must stay in kelvin.',
      'V2 = V1 × T2 / T1.',
    ],
    why: (v, x) => `V2 = ${num(v.V1, 3)} × ${num(v.T2, 4)} / ${num(v.T1, 4)} = ${num(x, 3)} L.`,
    mistakes: [
      alt(charles, 'celsius', 'The temperatures were converted to °C before using Charles’s law. Keep kelvin.', (v) => v.V1 * (v.T2 - 273.15) / (v.T1 - 273.15)),
      alt(charles, 'flipped', 'The temperatures were flipped. The warmer gas takes more volume.', (v) => v.V1 * v.T1 / v.T2),
    ],
  },
  {
    id: 'ch08-gay-lussac',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.2',
    topic: 'gas laws',
    vars: {
      n: span(0.3, 1.2, 0.01, 3),
      V: span(3.5, 8.5, 0.01, 3),
      P1: span(0.7, 1.5, 0.01, 3),
      T1: span(290.5, 325.5, 0.1, 4),
      T2: span(400.5, 470.5, 0.1, 4),
    },
    derive(v) {
      return { P: gayLussac(v), P2: gayLussac(v) };
    },
    template: '{n} mol of gas is trapped in a {V} L container. The pressure is {P1} atm at {T1} K. What is the pressure at {T2} K if the volume stays fixed?',
    solve: gayLussac,
    unit: 'atm',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: inRange,
    hints: () => [
      'Gay-Lussac’s law: P1/T1 = P2/T2. Volume and moles stay fixed.',
      'Use kelvin. P2 = P1 × T2 / T1.',
    ],
    why: (v, x) => `P2 = ${num(v.P1, 3)} × ${num(v.T2, 4)} / ${num(v.T1, 4)} = ${num(x, 3)} atm.`,
    mistakes: [
      alt(gayLussac, 'celsius', 'Celsius temperatures were used. Gas-law ratios need kelvin.', (v) => v.P1 * (v.T2 - 273.15) / (v.T1 - 273.15)),
      alt(gayLussac, 'flipped', 'The temperatures were flipped, so the pressure moved the wrong way.', (v) => v.P1 * v.T1 / v.T2),
    ],
  },
  {
    id: 'ch08-combined',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.2',
    topic: 'gas laws',
    vars: {
      n: span(0.45, 1.35, 0.01, 3),
      P1: span(1.2, 2.2, 0.01, 3),
      V1: span(3.2, 6.2, 0.01, 3),
      T1: span(300.5, 340.5, 0.1, 4),
      P2: span(1.4, 2.6, 0.01, 3),
      T2: span(360.5, 440.5, 0.1, 4),
    },
    derive(v) {
      return { P: v.P1, V2: combined(v) };
    },
    template: '{n} mol of gas starts at {P1} atm, {V1} L, and {T1} K. What is the volume at {P2} atm and {T2} K?',
    solve: combined,
    unit: 'L',
    sigFigs: 'min',
    tolerance: 0.5,
    valid(v) {
      if (!(inRange(v) && v.V2 >= 0.1 && v.V2 <= 50)) return false;
      const boyle = (v.P1 * v.V1) / v.P2;
      const flipped = (v.P2 * v.V1 * v.T1) / (v.P1 * v.T2);
      const apart = (left, right) => Math.abs(left - right) > 0.02 * Math.max(Math.abs(left), Math.abs(right));
      return apart(boyle, flipped) && apart(flipped, v.V2) && apart(boyle, v.V2);
    },
    hints: () => [
      'Combined gas law: P1·V1 / T1 = P2·V2 / T2.',
      'V2 = P1·V1·T2 / (P2·T1). Temperatures stay in kelvin.',
    ],
    why: (v, x) => `V2 = (${num(v.P1, 3)})(${num(v.V1, 3)})(${num(v.T2, 4)}) / ((${num(v.P2, 3)})(${num(v.T1, 4)})) = ${num(x, 3)} L.`,
    mistakes: [
      alt(combined, 'boyle-only', 'The temperature change was ignored. This is not Boyle’s law alone.', (v) => (v.P1 * v.V1) / v.P2),
      alt(combined, 'flipped', 'Pressure and temperature were placed on the wrong sides of the combined law.', (v) => (v.P2 * v.V1 * v.T1) / (v.P1 * v.T2)),
    ],
  },
  {
    id: 'ch08-ideal-v',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.2',
    topic: 'gas laws',
    vars: {
      n: span(0.5, 1.5, 0.01, 3),
      T: span(285.5, 380.5, 0.1, 4),
      P: span(1.2, 3.6, 0.01, 3),
    },
    derive(v) {
      return { V: idealV(v) };
    },
    template: 'What volume does {n} mol of ideal gas occupy at {T} K and {P} atm? Use R = 0.08206 L·atm/(mol·K).',
    solve: idealV,
    unit: 'L',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => inRange(v) && v.V >= 0.1 && v.V <= 50,
    hints: () => [
      'PV = nRT, so V = nRT / P.',
      'With atm and liters, R is 0.08206, not 8.314. T is already in kelvin.',
    ],
    why: (v, x) => `V = (${num(v.n, 3)})(0.08206)(${num(v.T, 4)}) / ${num(v.P, 3)} = ${num(x, 3)} L.`,
    mistakes: [
      alt(idealV, 'R-joules', 'R = 8.314 was used. That R needs pascals, not atm.', (v) => (v.n * R_J * v.T) / v.P),
      alt(idealV, 'inverted', 'The ideal-gas law was solved upside down. V = nRT / P.', (v) => v.P / (v.n * R_ATM * v.T)),
    ],
  },
  {
    id: 'ch08-ideal-p',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.2',
    topic: 'gas laws',
    vars: {
      n: span(0.4, 1.6, 0.01, 3),
      T: span(295.5, 410.5, 0.1, 4),
      V: span(8.5, 22.5, 0.01, 3),
    },
    derive(v) {
      return { P: pressure(v) };
    },
    template: 'What pressure, in atm, does {n} mol of ideal gas exert in a {V} L container at {T} K? Use R = 0.08206 L·atm/(mol·K).',
    solve: idealP,
    unit: 'atm',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: inRange,
    hints: () => [
      'P = nRT / V.',
      'R = 0.08206 when the pressure unit is atm and the volume unit is liters.',
    ],
    why: (v, x) => `P = (${num(v.n, 3)})(0.08206)(${num(v.T, 4)}) / ${num(v.V, 3)} = ${num(x, 3)} atm.`,
    mistakes: [
      alt(idealP, 'celsius', 'The Celsius temperature was used. Add 273.15 before using the ideal-gas law.', (v) => (v.n * R_ATM * (v.T - 273.15)) / v.V),
      alt(idealP, 'R-joules', 'R = 8.314 does not go with atm and liters.', (v) => (v.n * R_J * v.T) / v.V),
    ],
  },
  {
    id: 'ch08-ideal-n',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.2',
    topic: 'gas laws',
    vars: {
      P: span(0.6, 2.8, 0.01, 3),
      V: span(2.5, 12.5, 0.01, 3),
      T: span(290.5, 430.5, 0.1, 4),
    },
    derive(v) {
      return { n: idealN(v) };
    },
    template: 'How many moles of ideal gas are in a {V} L container at {P} atm and {T} K? Use R = 0.08206 L·atm/(mol·K).',
    solve: idealN,
    unit: 'mol',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: inRange,
    hints: () => [
      'n = PV / RT.',
      'Do not multiply by R. R belongs in the denominator when you solve for moles.',
    ],
    why: (v, x) => `n = (${num(v.P, 3)})(${num(v.V, 3)}) / ((0.08206)(${num(v.T, 4)})) = ${num(x, 3)} mol.`,
    mistakes: [
      alt(idealN, 'times-R', 'PV was multiplied by RT instead of divided by it.', (v) => v.P * v.V * R_ATM * v.T),
      alt(idealN, 'celsius', 'A Celsius temperature was used in PV = nRT.', (v) => (v.P * v.V) / (R_ATM * (v.T - 273.15))),
    ],
  },
  {
    id: 'ch08-ideal-t',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.2',
    topic: 'gas laws',
    vars: {
      n: span(0.55, 1.15, 0.01, 3),
      V: span(10.5, 16.5, 0.01, 3),
      T: span(310.5, 420.5, 0.1, 4),
    },
    derive(v) {
      return { P: snap((v.n * R_ATM * v.T) / v.V, 4) };
    },
    format: { P: 4 },
    template: '{n} mol of ideal gas fills {V} L at {P} atm. What is the temperature in kelvin? Use R = 0.08206 L·atm/(mol·K).',
    solve: idealT,
    unit: 'K',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: inRange,
    hints: () => [
      'T = PV / nR.',
      'The answer is already in kelvin. Do not subtract 273.15.',
    ],
    why: (v, x) => `T = (${num(v.P, 4)})(${num(v.V, 3)}) / ((${num(v.n, 3)})(0.08206)) = ${num(x, 3)} K.`,
    mistakes: [
      alt(idealT, 'celsius', '273.15 was subtracted. The ideal-gas temperature is already in kelvin.', (v) => idealT(v) - 273.15),
      alt(idealT, 'R-joules', 'R = 8.314 was used with atm and liters.', (v) => (v.P * v.V) / (v.n * R_J)),
    ],
  },
  {
    id: 'ch08-density',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.2',
    topic: 'gas laws',
    vars: {
      gas: { choices: gasNames },
      n: span(0.4, 1.5, 0.01, 3),
      P: span(0.8, 2.5, 0.01, 3),
      T: span(290.5, 390.5, 0.1, 4),
    },
    template: 'What is the density, in g/L, of {gas} at {P} atm and {T} K? The sample contains {n} mol. Use R = 0.08206 L·atm/(mol·K).',
    solve: density,
    unit: 'g/L',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: inRange,
    hints: (v) => [
      'Density = PM / RT. M is the molar mass in g/mol.',
      `${v.gas} has molar mass ${num(molarMass(gasByName(v.gas).formula), 4)} g/mol. The mole amount is not needed once P and T are known.`,
    ],
    why: (v, x) => {
      const mass = molarMass(gasByName(v.gas).formula);
      return `d = (${num(v.P, 3)})(${num(mass, 4)}) / ((0.08206)(${num(v.T, 4)})) = ${num(x, 3)} g/L.`;
    },
    mistakes: [
      alt(density, 'celsius', 'The kelvin temperature was replaced with °C, which makes the density much too large.', (v) => (v.P * molarMass(gasByName(v.gas).formula)) / (R_ATM * (v.T - 273.15))),
      alt(density, 'R-joules', 'R = 8.314 was used with atm. Use 0.08206.', (v) => (v.P * molarMass(gasByName(v.gas).formula)) / (R_J * v.T)),
    ],
  },
  {
    id: 'ch08-molar-mass',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.2',
    topic: 'gas laws',
    vars: {
      gas: { choices: gasNames },
      n: span(0.35, 1.25, 0.01, 3),
      P: span(0.9, 2.2, 0.01, 3),
      T: span(295.5, 380.5, 0.1, 4),
    },
    derive(v) {
      const mass = molarMass(gasByName(v.gas).formula);
      return { d: snap((v.P * mass) / (R_ATM * v.T), 4) };
    },
    format: { d: 4 },
    template: 'A {n} mol sample of gas has density {d} g/L at {P} atm and {T} K. What is its molar mass? Use R = 0.08206 L·atm/(mol·K).',
    solve: molarFromDensity,
    unit: 'g/mol',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: inRange,
    hints: () => [
      'M = dRT / P.',
      'Density is in g/L, so the molar mass comes out in g/mol when R is 0.08206.',
    ],
    why: (v, x) => `M = (${num(v.d, 4)})(0.08206)(${num(v.T, 4)}) / ${num(v.P, 3)} = ${num(x, 3)} g/mol.`,
    mistakes: [
      alt(molarFromDensity, 'R-joules', 'R = 8.314 makes the molar mass about 100 times too large with these units.', (v) => (v.d * R_J * v.T) / v.P),
      alt(molarFromDensity, 'forgot-R', 'R was left out. Multiply by 0.08206.', (v) => (v.d * v.T) / v.P),
    ],
  },
  {
    id: 'ch08-dalton',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.3',
    topic: 'gas laws',
    vars: {
      n: span(0.8, 3.2, 0.01, 3),
      Ptot: span(1.2, 3.4, 0.01, 3),
      x: span(0.18, 0.55, 0.001, 3),
      T: span(295.5, 360.5, 0.1, 4),
    },
    derive(v) {
      return { P: v.x * v.Ptot };
    },
    template: 'A gas mixture has a total pressure of {Ptot} atm at {T} K and contains {n} mol total. One gas has mole fraction {x}. What is that gas’s partial pressure?',
    solve: partial,
    unit: 'atm',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: inRange,
    hints: () => [
      'Dalton’s law: partial pressure = mole fraction × total pressure.',
      'Do not divide the total pressure by the mole fraction.',
    ],
    why: (v, x) => `P = ${num(v.x, 3)} × ${num(v.Ptot, 3)} = ${num(x, 3)} atm.`,
    mistakes: [
      alt(partial, 'divided', 'The total pressure was divided by the mole fraction.', (v) => v.Ptot / v.x),
      alt(partial, 'total', 'That is the total pressure. Multiply by the mole fraction.', (v) => v.Ptot),
    ],
  },
  {
    id: 'ch08-over-water',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.3',
    topic: 'gas laws',
    vars: {
      bath: { choices: vaporLabels },
      Ptot: span(0.95, 1.05, 0.001, 3),
      V: span(1.2, 4.2, 0.01, 3),
    },
    derive(v) {
      const row = vaporByLabel(v.bath);
      const Pgas = v.Ptot - row.torr / 760;
      const T = row.celsius + 273.15;
      return {
        Pgas,
        P: Pgas,
        T,
        n: (Pgas * v.V) / (R_ATM * T),
        torr: row.torr,
      };
    },
    format: { torr: 3 },
    template: 'A gas is collected over water at {bath} °C. The vapor pressure of water at that temperature is {torr} torr. The total pressure is {Ptot} atm and the volume is {V} L. What is the partial pressure of the dry gas, in atm?',
    solve: dryPressure,
    unit: 'atm',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: inRange,
    hints: () => [
      'P_dry = P_total − P_water. Convert the vapor pressure from torr to atm first (÷ 760).',
      'The dry-gas pressure is a little lower than the total pressure.',
    ],
    why: (v, x) => `P_dry = ${num(v.Ptot, 3)} − ${num(v.torr, 3)}/760 = ${num(x, 3)} atm.`,
    mistakes: [
      alt(dryPressure, 'forgot-vapor', 'The water vapor was left in the total pressure.', (v) => v.Ptot),
      alt(dryPressure, 'added-vapor', 'The vapor pressure was added. It has to be subtracted.', (v) => v.Ptot + vaporByLabel(v.bath).torr / 760),
    ],
  },
  {
    id: 'ch08-stp-volume',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.3',
    topic: 'gas laws',
    vars: {
      gas: { choices: gasNames },
      grams: span(1.5, 4, 0.01, 3),
    },
    derive(v) {
      const n = v.grams / molarMass(gasByName(v.gas).formula);
      return { n, P: 1, T: 273.15, V: n * STP_MOLAR };
    },
    template: '{grams} g of {gas} is produced and measured at STP (1 atm and 273.15 K). What volume does it occupy? Use 22.4 L/mol.',
    solve: stpVolume,
    unit: 'L',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => inRange(v) && v.V >= 0.1 && v.V <= 50,
    hints: (v) => [
      'At STP, volume = moles × 22.4 L/mol.',
      `Molar mass of ${v.gas} is ${num(molarMass(gasByName(v.gas).formula), 4)} g/mol.`,
    ],
    why: (v, x) => `V = (${num(v.grams, 3)} / ${num(molarMass(gasByName(v.gas).formula), 4)}) × 22.4 = ${num(x, 3)} L.`,
    mistakes: [
      scaled(stpVolume, 24.5 / 22.4, 'room-temp', '22.4 L/mol is the STP volume. 24.5 L/mol is closer to room temperature.'),
      scaled(stpVolume, 0.1, 'decimal', 'The molar volume was entered as 2.24 L/mol.'),
    ],
  },
  {
    id: 'ch08-graham',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.4',
    topic: 'gas laws',
    vars: {
      pair: { choices: pairNames },
      n: span(0.25, 1.1, 0.01, 3),
      P: span(0.8, 2.2, 0.01, 3),
      T: span(295.5, 350.5, 0.1, 4),
      V: span(2.5, 8.5, 0.01, 3),
    },
    template: 'At {P} atm and {T} K, a {V} L bulb holds {n} mol of gas. How many times faster does the lighter gas effuse in this pair: {pair}?',
    solve: graham,
    unit: null,
    sigFigs: 3,
    tolerance: 0.5,
    valid: inRange,
    hints: () => [
      'Graham’s law: rate1/rate2 = sqrt(M2/M1). The lighter gas is faster.',
      'Pressure and temperature cancel when both gases are compared at the same conditions.',
    ],
    why: (v, x) => {
      const row = pairRow(v.pair);
      return `Rate ratio = sqrt(${num(molarMass(row.heavy), 4)} / ${num(molarMass(row.light), 4)}) = ${num(x, 3)}.`;
    },
    mistakes: [
      alt(graham, 'inverted', 'The heavier molar mass was placed under the square root in the wrong fraction, so the light gas looks slower.', (v) => {
        const row = pairRow(v.pair);
        return Math.sqrt(molarMass(row.light) / molarMass(row.heavy));
      }),
      alt(graham, 'no-root', 'The square root was skipped.', (v) => {
        const row = pairRow(v.pair);
        return molarMass(row.heavy) / molarMass(row.light);
      }),
    ],
  },
  {
    id: 'ch08-rms-speed',
    ch: 8,
    openstax_section: 'OpenStax AF2e §8.5',
    topic: 'gas laws',
    vars: {
      gas: { choices: gasNames },
      n: span(0.3, 1.4, 0.01, 3),
      P: span(0.7, 2.4, 0.01, 3),
      T: span(290.5, 420.5, 0.1, 4),
    },
    template: '{n} mol of {gas} is at {P} atm and {T} K. What is the root-mean-square speed, in m/s? Use R = 8.314 J/(mol·K) and the molar mass in kg/mol.',
    solve: rms,
    unit: 'm/s',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: inRange,
    hints: (v) => [
      'u_rms = sqrt(3RT/M). M must be kg/mol, which is the g/mol value divided by 1000.',
      `${v.gas} is ${num(molarMass(gasByName(v.gas).formula), 4)} g/mol. Pressure is not in this formula.`,
    ],
    why: (v, x) => {
      const kg = molarMass(gasByName(v.gas).formula) / 1000;
      return `u_rms = sqrt(3 × 8.314 × ${num(v.T, 4)} / ${num(kg, 4)}) = ${num(x, 3)} m/s.`;
    },
    mistakes: [
      alt(rms, 'forgot-three', 'The 3 inside the square root was left out.', (v) => {
        const kg = molarMass(gasByName(v.gas).formula) / 1000;
        return Math.sqrt((R_J * v.T) / kg);
      }),
      alt(rms, 'grams', 'The molar mass was left in g/mol, so the speed is far too small.', (v) => {
        const grams = molarMass(gasByName(v.gas).formula);
        return Math.sqrt((3 * R_J * v.T) / grams);
      }),
    ],
  },
];
