import { clamp, formatMeasure } from './util.js';

export const REACTIONS = [
  {
    id: 'water',
    name: 'making water',
    equation: '2 H2 + O2 → 2 H2O',
    reactants: [
      { id: 'H2', formula: 'H2', coeff: 2, color: '#334155' },
      { id: 'O2', formula: 'O2', coeff: 1, color: '#e11d48' },
    ],
    products: [
      { id: 'H2O', formula: 'H2O', coeff: 2, color: '#0f5c56' },
    ],
  },
  {
    id: 'ammonia',
    name: 'making ammonia',
    equation: 'N2 + 3 H2 → 2 NH3',
    reactants: [
      { id: 'N2', formula: 'N2', coeff: 1, color: '#2563eb' },
      { id: 'H2', formula: 'H2', coeff: 3, color: '#334155' },
    ],
    products: [
      { id: 'NH3', formula: 'NH3', coeff: 2, color: '#7c3aed' },
    ],
  },
  {
    id: 'combustion',
    name: 'burning methane',
    equation: 'CH4 + 2 O2 → CO2 + 2 H2O',
    reactants: [
      { id: 'CH4', formula: 'CH4', coeff: 1, color: '#57534e' },
      { id: 'O2', formula: 'O2', coeff: 2, color: '#e11d48' },
    ],
    products: [
      { id: 'CO2', formula: 'CO2', coeff: 1, color: '#44403c' },
      { id: 'H2O', formula: 'H2O', coeff: 2, color: '#0f5c56' },
    ],
  },
];

export function reactionById(id) {
  return REACTIONS.find((item) => item.id === id) ?? REACTIONS[0];
}

export function emptyAmounts(reaction) {
  return Object.fromEntries(reaction.reactants.map((reactant) => [reactant.id, 0]));
}

export function createStoich(reactionId = 'water') {
  const reaction = reactionById(reactionId);
  return {
    reactionId,
    amounts: { H2: 4, O2: 1, N2: 1, CH4: 1 },
    shown: 'before',
    playing: false,
    phase: 0,
    answer: { limiter: '', products: {}, leftover: {} },
    message: '',
    tone: '',
    misses: 0,
    revealed: false,
  };
}

export function runReaction(reaction, amounts) {
  const ratios = reaction.reactants.map((reactant) => ({
    id: reactant.id,
    runs: Math.max(0, Number(amounts[reactant.id] ?? 0)) / reactant.coeff,
  }));
  const runs = ratios.length ? Math.min(...ratios.map((row) => row.runs)) : 0;
  const limiters = ratios.filter((row) => Math.abs(row.runs - runs) < 1e-9).map((row) => row.id);
  const leftover = {};
  for (const reactant of reaction.reactants) {
    leftover[reactant.id] = Math.max(0, Number(amounts[reactant.id] ?? 0) - runs * reactant.coeff);
  }
  const products = {};
  for (const product of reaction.products) products[product.id] = runs * product.coeff;
  return { runs, limiters, leftover, products };
}

export function formatCount(value) {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return formatMeasure(value, 1);
}

function nearly(actual, expected) {
  if (actual === '' || actual == null) return false;
  const number = Number(actual);
  return Number.isFinite(number) && Number.isFinite(expected) && Math.abs(number - expected) <= 0.001;
}

export function gradeStoich(answer, reaction, amounts) {
  const result = runReaction(reaction, amounts);
  const wrong = [];
  const limiterOk = result.limiters.length > 1
    ? answer.limiter === 'both'
    : answer.limiter === result.limiters[0];
  if (!limiterOk) wrong.push('limiting reactant');
  for (const product of reaction.products) {
    if (!nearly(answer.products?.[product.id], result.products[product.id])) {
      wrong.push(`${product.formula} produced`);
    }
  }
  for (const reactant of reaction.reactants) {
    if (!nearly(answer.leftover?.[reactant.id], result.leftover[reactant.id])) {
      wrong.push(`${reactant.formula} left over`);
    }
  }
  const limiterText = result.limiters.length > 1
    ? 'both reactants run out together'
    : `${result.limiters[0]} is limiting`;
  const productText = reaction.products
    .map((product) => `${formatCount(result.products[product.id])} ${product.formula}`)
    .join(' and ');
  const leftText = reaction.reactants
    .map((reactant) => `${formatCount(result.leftover[reactant.id])} ${reactant.formula}`)
    .join(' and ');
  const success = `${limiterText}. The picture makes ${productText}. Leftover: ${leftText}.`;
  const hints = [
    wrong.length
      ? `Check the ${wrong[0]}. Divide each starting count by its coefficient. The smaller quotient runs out first.`
      : 'Divide each starting count by its coefficient.',
    'Product count = quotient × product coefficient. Leftover = start − quotient × reactant coefficient.',
    success,
  ];
  return { ok: wrong.length === 0, wrong, result, success, hints };
}

export function speciesById(reaction, id) {
  return [...reaction.reactants, ...reaction.products].find((item) => item.id === id) ?? null;
}

/** Circles for the still picture. Counts above 8 are labeled, not all drawn. */
export function particleGroups(reaction, amounts, shown) {
  const result = runReaction(reaction, amounts);
  if (shown !== 'after') {
    return reaction.reactants.map((reactant) => ({
      id: reactant.id,
      formula: reactant.formula,
      color: reactant.color,
      count: Math.max(0, Number(amounts[reactant.id] ?? 0)),
      role: 'reactant',
    }));
  }
  const groups = reaction.products.map((product) => ({
    id: product.id,
    formula: product.formula,
    color: product.color,
    count: result.products[product.id],
    role: 'product',
  }));
  for (const reactant of reaction.reactants) {
    if (result.leftover[reactant.id] > 0.001) {
      groups.push({
        id: reactant.id,
        formula: reactant.formula,
        color: reactant.color,
        count: result.leftover[reactant.id],
        role: 'leftover',
      });
    }
  }
  return groups;
}

export function layoutParticles(groups, width = 320, height = 180) {
  const columns = Math.max(1, groups.length);
  const dots = [];
  groups.forEach((group, groupIndex) => {
    const draw = clamp(Math.round(group.count), 0, 8);
    const left = (groupIndex + 0.5) * (width / columns);
    for (let index = 0; index < draw; index += 1) {
      const col = index % 4;
      const row = Math.floor(index / 4);
      dots.push({
        id: group.id,
        formula: group.formula,
        color: group.color,
        role: group.role,
        x: left + (col - 1.5) * 18,
        y: 48 + row * 28,
      });
    }
  });
  return dots.filter((dot) => dot.x > 8 && dot.x < width - 8 && dot.y > 8 && dot.y < height - 8);
}

export function describeStoich(state, motion = 'still') {
  const reaction = reactionById(state.reactionId);
  const result = runReaction(reaction, state.amounts);
  const start = reaction.reactants
    .map((reactant) => `${formatCount(state.amounts[reactant.id] ?? 0)} ${reactant.formula}`)
    .join(' and ');
  const frame = motion === 'still'
    ? 'The particles are still. Plus and minus buttons change the counts. Those buttons are the keyboard path.'
    : 'The particles are moving from reactants to products. Plus and minus buttons change the counts.';
  const outcome = state.shown === 'after'
    ? `After the reaction, ${result.limiters.length > 1 ? 'both reactants run out' : `${result.limiters[0]} runs out`}. Products: ${reaction.products.map((product) => `${formatCount(result.products[product.id])} ${product.formula}`).join(', ')}. Leftover: ${reaction.reactants.map((reactant) => `${formatCount(result.leftover[reactant.id])} ${reactant.formula}`).join(', ')}.`
    : 'The picture still shows only the starting molecules. Run it to see products and leftover excess.';
  return [
    `Limiting-reactant picture for ${reaction.equation}.`,
    `Starting molecules: ${start}.`,
    outcome,
    frame,
  ].join(' ');
}

export function amountOf(state, id) {
  return clamp(Math.round(Number(state.amounts[id] ?? 0)), 0, 12);
}
