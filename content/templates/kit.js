import { parseAnswer } from '../../js/grade.js';
import { formatSigFigs } from '../../js/generate.js';
import { molarMass } from '../../js/masses.js';

export const R_ATM = 0.08206;
export const R_J = 8.314;
export const NA = 6.022e23;
export const PLANCK = 6.626e-34;
export const LIGHT = 2.998e8;
export const RYDBERG = 2.179e-18;
export const WATER_C = 4.184;

export function span(min, max, step, sigFigs) {
  return { min, max, step, sigFigs };
}

export function num(value, digits) {
  return formatSigFigs(value, digits);
}

/** Round a computed input the way the question will display it. */
export function snap(value, digits) {
  const parsed = parseAnswer(formatSigFigs(value, digits));
  if (!parsed) throw new Error(`Could not snap ${value}`);
  return parsed.value;
}

export function mass(formula) {
  return molarMass(formula);
}

/** A wrong value that is a fixed multiple of the solved answer. */
export function scaled(solve, factor, id, message) {
  return { id, message, value: (vars) => solve(vars) * factor };
}

/** A wrong value from the same inputs. */
export function alt(solve, id, message, fn) {
  return { id, message, value: (vars) => fn(vars, solve(vars)) };
}

export function roundTo(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export const GASES = [
  { text: 'H2', formula: 'H2' },
  { text: 'He', formula: 'He' },
  { text: 'CH4', formula: 'CH4' },
  { text: 'N2', formula: 'N2' },
  { text: 'O2', formula: 'O2' },
  { text: 'CO2', formula: 'CO2' },
  { text: 'Ar', formula: 'Ar' },
];

export function gasByName(name) {
  const found = GASES.find((gas) => gas.text === name);
  if (!found) throw new Error(`Unknown gas ${name}`);
  return found;
}

export const MOLECULES = [
  { text: 'CO2', sigma: 2, pi: 2, groups: 2, lone: 0, angle: 180, hybrid: 2 },
  { text: 'HCN', sigma: 2, pi: 2, groups: 2, lone: 0, angle: 180, hybrid: 2 },
  { text: 'C2H2', sigma: 3, pi: 2, groups: 2, lone: 0, angle: 180, hybrid: 2 },
  { text: 'BF3', sigma: 3, pi: 0, groups: 3, lone: 0, angle: 120, hybrid: 3 },
  { text: 'CH2O', sigma: 3, pi: 1, groups: 3, lone: 0, angle: 120, hybrid: 3 },
  { text: 'SO2', sigma: 2, pi: 1, groups: 3, lone: 1, angle: 119, hybrid: 3 },
  { text: 'C2H4', sigma: 5, pi: 1, groups: 3, lone: 0, angle: 120, hybrid: 3 },
  { text: 'CH4', sigma: 4, pi: 0, groups: 4, lone: 0, angle: 109.5, hybrid: 4 },
  { text: 'NH3', sigma: 3, pi: 0, groups: 4, lone: 1, angle: 107, hybrid: 4 },
  { text: 'H2O', sigma: 2, pi: 0, groups: 4, lone: 2, angle: 104.5, hybrid: 4 },
  { text: 'PCl5', sigma: 5, pi: 0, groups: 5, lone: 0, angle: 90, hybrid: 5 },
  { text: 'SF6', sigma: 6, pi: 0, groups: 6, lone: 0, angle: 90, hybrid: 6 },
];

export function moleculeByName(name) {
  const found = MOLECULES.find((item) => item.text === name);
  if (!found) throw new Error(`Unknown molecule ${name}`);
  return found;
}

export const PI_MOLECULES = MOLECULES.filter((item) => item.pi > 0);

export const OX_SPECIES = [
  { text: 'S in SO4^2-', ox: 6 },
  { text: 'N in NO3^-', ox: 5 },
  { text: 'Mn in MnO4^-', ox: 7 },
  { text: 'Cr in Cr2O7^2-', ox: 6 },
  { text: 'C in CO2', ox: 4 },
  { text: 'Cl in ClO4^-', ox: 7 },
  { text: 'N in NH3', ox: -3 },
  { text: 'S in H2S', ox: -2 },
  { text: 'O in H2O', ox: -2 },
  { text: 'H in HCl', ox: 1 },
];

export function oxByName(name) {
  const found = OX_SPECIES.find((item) => item.text === name);
  if (!found) throw new Error(`Unknown species ${name}`);
  return found;
}

/** Vapor pressure of water (torr) at a few lab temperatures. */
export const WATER_VAPOR = [
  { text: '20.0', celsius: 20, torr: 17.5 },
  { text: '25.0', celsius: 25, torr: 23.8 },
  { text: '30.0', celsius: 30, torr: 31.8 },
  { text: '35.0', celsius: 35, torr: 42.2 },
  { text: '40.0', celsius: 40, torr: 55.3 },
];

export function vaporByLabel(label) {
  const found = WATER_VAPOR.find((item) => item.text === label);
  if (!found) throw new Error(`Unknown vapor temperature ${label}`);
  return found;
}
