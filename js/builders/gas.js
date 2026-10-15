import { clamp, formatMeasure, nearMeasure } from './util.js';

/** L·atm·mol⁻¹·K⁻¹. Chosen so 1 mol at 1 atm and 273.15 K is 22.41 L. */
export const GAS_R = 0.08206;

export const GAS_RANGE = {
  P: { min: 0.2, max: 5, step: 0.05, unit: 'atm', label: 'Pressure' },
  V: { min: 1, max: 40, step: 0.1, unit: 'L', label: 'Volume' },
  T: { min: 200, max: 600, step: 1, unit: 'K', label: 'Temperature' },
  n: { min: 0.1, max: 3, step: 0.05, unit: 'mol', label: 'Amount' },
};

export const GAS_KEYS = ['P', 'V', 'T', 'n'];

export function solveIdeal({ P, V, T, n, unknown }, R = GAS_R) {
  if (unknown === 'V') {
    if (P <= 0) return null;
    return (n * R * T) / P;
  }
  if (unknown === 'P') {
    if (V <= 0) return null;
    return (n * R * T) / V;
  }
  if (unknown === 'T') {
    if (n <= 0 || R <= 0) return null;
    return (P * V) / (n * R);
  }
  if (unknown === 'n') {
    if (T <= 0 || R <= 0) return null;
    return (P * V) / (R * T);
  }
  return null;
}

export function gasSides({ P, V, T, n }, R = GAS_R) {
  const left = P * V;
  const right = n * R * T;
  return {
    left,
    right,
    balanced: Math.abs(left - right) <= Math.max(0.05, Math.abs(right) * 0.01),
  };
}

export function equationText(values, R = GAS_R) {
  const sides = gasSides(values, R);
  const status = sides.balanced ? 'The two sides match.' : 'The two sides do not match yet.';
  return `P V = ${formatMeasure(sides.left, 2)} and n R T = ${formatMeasure(sides.right, 2)}, with R = ${R} L·atm/(mol·K). ${status}`;
}

export const GAS_CHALLENGES = [
  {
    id: 'find-volume',
    unknown: 'V',
    unit: 'L',
    known: { P: 2, T: 300, n: 0.5 },
    prompt: 'A piston holds 0.50 mol of ideal gas at 2.00 atm and 300 K. What is the volume in liters?',
    rearrange: 'V = n R T / P',
  },
  {
    id: 'find-pressure',
    unknown: 'P',
    unit: 'atm',
    known: { V: 10, T: 350, n: 1 },
    prompt: '1.00 mol of ideal gas fills 10.0 L at 350 K. What is the pressure in atmospheres?',
    rearrange: 'P = n R T / V',
  },
  {
    id: 'find-temperature',
    unknown: 'T',
    unit: 'K',
    known: { P: 1, V: 24.6, n: 1 },
    prompt: '1.00 mol of ideal gas is at 1.00 atm in 24.6 L. What is the temperature in kelvin?',
    rearrange: 'T = P V / (n R)',
  },
];

export function challengeById(id) {
  return GAS_CHALLENGES.find((item) => item.id === id) ?? GAS_CHALLENGES[0];
}

export function createGas(challengeId = 'find-volume') {
  return {
    values: { P: 1, V: 22.4, T: 298, n: 1 },
    playing: true,
    phase: 0,
    challengeId,
    guess: '',
    message: '',
    tone: '',
    misses: 0,
    revealed: false,
  };
}

export function clampGas(key, value) {
  const range = GAS_RANGE[key];
  return clamp(Number(value), range.min, range.max);
}

/** Piston handle, in viewBox pixels. A larger volume lifts the piston. */
export function pistonY(volume) {
  const { min, max } = GAS_RANGE.V;
  const t = clamp((volume - min) / (max - min), 0, 1);
  return 156 - t * 118;
}

export function particleCount(amount) {
  return clamp(Math.round(amount * 4), 1, 10);
}

export function gasParticles(count, bounds, phase) {
  const n = clamp(Math.round(count), 0, 10);
  const dots = [];
  const spanX = bounds.right - bounds.left;
  const spanY = Math.max(12, bounds.bottom - bounds.top);
  for (let index = 0; index < n; index += 1) {
    const col = index % 5;
    const row = Math.floor(index / 5);
    const baseX = bounds.left + ((col + 1) / 6) * spanX;
    const baseY = bounds.top + ((row + 1) / 3) * spanY;
    const wobble = phase ? 1 : 0;
    const x = clamp(baseX + Math.sin(phase * (0.8 + index * 0.13) + index) * 8 * wobble, bounds.left, bounds.right);
    const y = clamp(baseY + Math.cos(phase * (1.1 + index * 0.07) + index) * 6 * wobble, bounds.top, bounds.bottom);
    dots.push({ x, y });
  }
  return dots;
}

export function temperatureColor(temperature) {
  const t = clamp((temperature - GAS_RANGE.T.min) / (GAS_RANGE.T.max - GAS_RANGE.T.min), 0, 1);
  const red = Math.round(80 + t * 160);
  const blue = Math.round(180 - t * 120);
  return `rgb(${red}, 90, ${blue})`;
}

export function expectedFor(challenge, R = GAS_R) {
  return solveIdeal({ P: 1, V: 1, T: 1, n: 1, ...challenge.known, unknown: challenge.unknown }, R);
}

export function gradeGas(guess, challenge = challengeById('find-volume')) {
  const expected = expectedFor(challenge);
  const actual = Number(guess);
  const ok = nearMeasure(actual, expected, 0.05);
  const shown = expected == null ? '—' : formatMeasure(expected, 2);
  const success = `${shown} ${challenge.unit}. ${challenge.rearrange}, with R = ${GAS_R}.`;
  const hints = [
    `Start from P V = n R T. Rearrange it to ${challenge.rearrange}.`,
    `Use R = ${GAS_R} L·atm/(mol·K). Plug in the three given numbers, then round to two decimals.`,
    success,
  ];
  return { ok, expected, success, hints };
}

export function describeGas(state, motion = 'still') {
  const { P, V, T, n } = state.values;
  const challenge = challengeById(state.challengeId);
  const top = pistonY(V);
  const frame = motion === 'still'
    ? 'The piston is holding still. Sliders and number boxes change P, V, T, and n. Dragging the piston changes volume; the volume slider is the keyboard path.'
    : 'Particles in the piston are moving. Sliders and number boxes change P, V, T, and n. Dragging the piston changes volume; the volume slider is the keyboard path.';
  return [
    `Gas piston. Pressure ${formatMeasure(P, 2)} atm, volume ${formatMeasure(V, 2)} L, temperature ${formatMeasure(T, 0)} K, amount ${formatMeasure(n, 2)} mol.`,
    equationText(state.values),
    `The piston handle is ${Math.round(top)} pixels down the cylinder.`,
    `Challenge: ${challenge.prompt}`,
    frame,
  ].join(' ');
}
