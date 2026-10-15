import { alt, num, scaled, span } from './kit.js';

const length = (v) => v.km * 1000;
const density = (v) => v.mass / v.volume;
const kelvin = (v) => v.celsius + 273.15;
const fahrenheit = (v) => (9 / 5) * v.celsius + 32;
const rounded = (v) => Number(v.value.toPrecision(3));
const pumped = (v) => (v.mL / 1000) * v.hours * 60;

export const templates = [
  {
    id: 'ch01-length-km-m',
    ch: 1,
    openstax_section: 'OpenStax AF2e §1.4',
    topic: 'unit conversion',
    vars: { km: span(1.25, 18.75, 0.01, 4) },
    template: 'Convert {km} km to meters.',
    solve: length,
    unit: 'm',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Kilo means 1000. Multiply the kilometers by 1000.',
      '1 km = 1000 m. Do not divide.',
    ],
    why: (v, x) => `${num(v.km, 4)} km × 1000 m/km = ${num(x, 4)} m.`,
    mistakes: [
      scaled(length, 0.1, 'hecto', 'That is a factor of 100 too small. Kilo means 1000, not 100.'),
      scaled(length, 0.001, 'inverted', 'You divided by 1000. Meters are smaller, so the number gets larger.'),
    ],
  },
  {
    id: 'ch01-density',
    ch: 1,
    openstax_section: 'OpenStax AF2e §1.4',
    topic: 'density',
    vars: {
      mass: span(12.5, 48.5, 0.01, 4),
      volume: span(6.25, 18.75, 0.01, 4),
    },
    template: 'A sample has a mass of {mass} g and a volume of {volume} mL. What is its density in g/mL?',
    solve: density,
    unit: 'g/mL',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Density is mass divided by volume.',
      'Grams divided by milliliters gives g/mL. Do not multiply the two measurements.',
    ],
    why: (v, x) => `Density = mass / volume = ${num(v.mass, 4)} g / ${num(v.volume, 4)} mL = ${num(x, 4)} g/mL.`,
    mistakes: [
      alt(density, 'product', 'You multiplied mass by volume. Divide mass by volume.', (v) => v.mass * v.volume),
      scaled(density, 1000, 'kg-m3', 'That is the number for kg/m^3. This question asks for g/mL.'),
    ],
  },
  {
    id: 'ch01-celsius-kelvin',
    ch: 1,
    openstax_section: 'OpenStax AF2e §1.6',
    topic: 'temperature',
    vars: { celsius: span(12.5, 78.5, 0.01, 4) },
    template: 'Convert {celsius} °C to kelvin.',
    solve: kelvin,
    unit: 'K',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Add 273.15 to the Celsius temperature. Do not multiply.',
      'K = °C + 273.15. A Celsius temperature is not already in kelvin.',
    ],
    why: (v, x) => `K = ${num(v.celsius, 4)} + 273.15 = ${num(x, 4)} K.`,
    mistakes: [
      alt(kelvin, 'celsius', 'That is still the Celsius temperature. Add 273.15.', (v) => v.celsius),
      alt(kelvin, 'fahrenheit', 'That is the Fahrenheit conversion. Kelvin is °C + 273.15.', (v) => (9 / 5) * v.celsius + 32),
    ],
  },
  {
    id: 'ch01-celsius-fahrenheit',
    ch: 1,
    openstax_section: 'OpenStax AF2e §1.6',
    topic: 'temperature',
    vars: { celsius: span(12.5, 78.5, 0.01, 4) },
    template: 'Convert {celsius} °C to degrees Fahrenheit.',
    solve: fahrenheit,
    unit: '°F',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Multiply by 9/5, then add 32.',
      '°F = (9/5)(°C) + 32. Adding 273.15 gives kelvin, not Fahrenheit.',
    ],
    why: (v, x) => `°F = (9/5)(${num(v.celsius, 4)}) + 32 = ${num(x, 4)} °F.`,
    mistakes: [
      alt(fahrenheit, 'no-offset', 'You skipped +32 after multiplying by 9/5.', (v) => (9 / 5) * v.celsius),
      alt(fahrenheit, 'kelvin', 'You added 273.15. That converts to kelvin, not Fahrenheit.', (v) => v.celsius + 273.15),
    ],
  },
  {
    id: 'ch01-sigfig-round',
    ch: 1,
    openstax_section: 'OpenStax AF2e §1.5',
    topic: 'significant figures',
    vars: { value: span(1.125, 8.875, 0.001, 4) },
    template: 'Round {value} to three significant figures.',
    solve: rounded,
    unit: null,
    sigFigs: 3,
    tolerance: 0.5,
    hints: () => [
      'Keep three digits, starting at the first nonzero digit, and round the third one.',
      'Do not move the decimal point. Only the last kept digit changes.',
    ],
    why: (v, x) => `${num(v.value, 4)} rounded to three significant figures is ${num(x, 3)}.`,
    mistakes: [
      scaled(rounded, 10, 'decimal-right', 'The decimal point moved. Rounding does not change the size by a factor of 10.'),
      scaled(rounded, 0.1, 'decimal-left', 'The decimal point moved the other way. Keep the same place value.'),
    ],
  },
  {
    id: 'ch01-pump-liters',
    ch: 1,
    openstax_section: 'OpenStax AF2e §1.6',
    topic: 'dimensional analysis',
    vars: {
      mL: span(12.5, 48.5, 0.01, 4),
      hours: span(1.25, 4.75, 0.01, 3),
    },
    template: 'A pump delivers {mL} mL of water each minute. How many liters does it deliver in {hours} hours?',
    solve: pumped,
    unit: 'L',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Change minutes to hours (× 60), then change mL to L (÷ 1000).',
      'Liters = (mL/min) × (60 min/h) × hours × (1 L / 1000 mL).',
    ],
    why: (v, x) => `${num(v.mL, 4)} mL/min × 60 min/h × ${num(v.hours, 3)} h × (1 L / 1000 mL) = ${num(x, 3)} L.`,
    mistakes: [
      scaled(pumped, 1000, 'forgot-mL', 'The mL were not converted to L. Divide by 1000.'),
      scaled(pumped, 1 / 60, 'forgot-minutes', 'Each hour has 60 minutes. The minute rate has to be scaled up.'),
    ],
  },
];
