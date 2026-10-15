import { formatMeasure, nearMeasure } from './util.js';

export const WATER_C = 4.184;

export function mixTemperature(parts) {
  const denominator = parts.reduce((sum, part) => sum + part.mass * part.c, 0);
  if (denominator === 0) return null;
  const numerator = parts.reduce((sum, part) => sum + part.mass * part.c * part.temp, 0);
  return numerator / denominator;
}

/** q = m c ΔT. Negative means the sample lost heat. */
export function heat(part, finalTemp) {
  return part.mass * part.c * (finalTemp - part.temp);
}

export function thermometerFill(temp, min = 0, max = 100) {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (temp - min) / (max - min)));
}

export function createSample(partial) {
  return {
    name: 'water',
    mass: 50,
    c: WATER_C,
    temp: 20,
    ...partial,
  };
}

export const CALORIMETER_CHALLENGES = [
  {
    id: 'equal-water',
    prompt: 'A coffee cup mixes 40.0 g of water at 90.0 °C with 40.0 g of water at 30.0 °C. Both have c = 4.184 J/g°C. Predict the final temperature in °C.',
    parts: [
      { name: 'hot water', mass: 40, c: WATER_C, temp: 90 },
      { name: 'cool water', mass: 40, c: WATER_C, temp: 30 },
    ],
  },
  {
    id: 'metal',
    prompt: 'A coffee cup holds 100.0 g of water at 25.0 °C (c = 4.184 J/g°C). A 20.0 g piece of metal at 100.0 °C (c = 0.450 J/g°C) is dropped in. Predict the final temperature in °C.',
    parts: [
      { name: 'water', mass: 100, c: WATER_C, temp: 25 },
      { name: 'metal', mass: 20, c: 0.45, temp: 100 },
    ],
  },
];

export function challengeById(id) {
  return CALORIMETER_CHALLENGES.find((item) => item.id === id) ?? CALORIMETER_CHALLENGES[0];
}

export function createCalorimeter(challengeId = 'equal-water') {
  return {
    parts: [
      createSample({ name: 'hot water', mass: 50, temp: 80 }),
      createSample({ name: 'cool water', mass: 50, temp: 20 }),
    ],
    showResult: true,
    playing: true,
    challengeId,
    guess: '',
    message: '',
    tone: '',
    misses: 0,
    revealed: false,
  };
}

export function calorimeterSolution(parts) {
  const finalTemp = mixTemperature(parts);
  if (finalTemp == null) return 'Enter a mass and a specific heat greater than zero.';
  const flows = parts.map((part) => {
    const q = heat(part, finalTemp);
    return `${part.name}: q = ${part.mass} × ${part.c} × (${formatMeasure(finalTemp, 2)} − ${part.temp}) = ${formatMeasure(q, 1)} J`;
  });
  return `Final temperature = Σ(m c T) / Σ(m c) = ${formatMeasure(finalTemp, 2)} °C. ${flows.join('. ')}. The heats sum to 0.`;
}

export function gradeCalorimeter(guess, challenge = challengeById('equal-water')) {
  const expected = mixTemperature(challenge.parts);
  const actual = Number(guess);
  const ok = nearMeasure(actual, expected, 0.15);
  const success = calorimeterSolution(challenge.parts);
  const hints = [
    'Heat lost equals heat gained. Write q = m c ΔT for each sample. The two q values add to 0.',
    'Final temperature = (m1 c1 T1 + m2 c2 T2) / (m1 c1 + m2 c2).',
    success,
  ];
  return { ok, expected, success, hints };
}

export function describeCalorimeter(state, motion = 'still') {
  const finalTemp = mixTemperature(state.parts);
  const bits = state.parts.map((part) => (
    `${part.mass} g of ${part.name} at ${part.temp} °C, c = ${part.c} J/g°C`
  ));
  const result = finalTemp == null
    ? 'The final temperature is not defined until the masses and specific heats are above zero.'
    : `Final temperature ${formatMeasure(finalTemp, 2)} °C. ${state.parts.map((part) => `${part.name} q = ${formatMeasure(heat(part, finalTemp), 1)} J`).join('. ')}.`;
  const frame = motion === 'still'
    ? 'The thermometer is still. Number boxes and sliders change the masses and temperatures.'
    : 'The thermometer is moving toward the final temperature. Number boxes and sliders change the masses and temperatures.';
  const challenge = challengeById(state.challengeId);
  return [
    `Coffee-cup calorimeter. Mixing ${bits.join(' with ')}.`,
    'q = m c ΔT.',
    state.showResult ? result : 'The calculated temperature of this mix is hidden.',
    `Challenge, separate from the sliders: ${challenge.prompt}`,
    frame,
  ].join(' ');
}
