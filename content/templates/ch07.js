import { molarMass } from '../../js/masses.js';
import { alt, num, scaled, span } from './kit.js';

const REACTIONS = [
  { text: 'N2 + 3 H2 → 2 NH3', a: 'N2', ca: 1, b: 'H2', cb: 3, p: 'NH3', cp: 2, fa: 'N2', fb: 'H2', fp: 'NH3' },
  { text: 'CH4 + 2 O2 → CO2 + 2 H2O', a: 'CH4', ca: 1, b: 'O2', cb: 2, p: 'H2O', cp: 2, fa: 'CH4', fb: 'O2', fp: 'H2O' },
  { text: '2 H2 + O2 → 2 H2O', a: 'H2', ca: 2, b: 'O2', cb: 1, p: 'H2O', cp: 2, fa: 'H2', fb: 'O2', fp: 'H2O' },
  { text: '2 SO2 + O2 → 2 SO3', a: 'SO2', ca: 2, b: 'O2', cb: 1, p: 'SO3', cp: 2, fa: 'SO2', fb: 'O2', fp: 'SO3' },
  { text: '4 Fe + 3 O2 → 2 Fe2O3', a: 'Fe', ca: 4, b: 'O2', cb: 3, p: 'Fe2O3', cp: 2, fa: 'Fe', fb: 'O2', fp: 'Fe2O3' },
  { text: 'C3H8 + 5 O2 → 3 CO2 + 4 H2O', a: 'C3H8', ca: 1, b: 'O2', cb: 5, p: 'CO2', cp: 3, fa: 'C3H8', fb: 'O2', fp: 'CO2' },
];

const PRODUCT_RATIOS = REACTIONS.filter((item) => item.cp !== item.ca);
const EXCESS_REACTIONS = REACTIONS.filter((item) => item.cb / item.ca >= 2);

function reaction(label) {
  const found = REACTIONS.find((item) => item.text === label);
  if (!found) throw new Error(`Unknown reaction ${label}`);
  return found;
}

const names = REACTIONS.map((item) => item.text);
const productNames = PRODUCT_RATIOS.map((item) => item.text);
const excessNames = EXCESS_REACTIONS.map((item) => item.text);

const reactantMoles = (v) => v.moles * reaction(v.rxn).cb / reaction(v.rxn).ca;
const productMoles = (v) => v.moles * reaction(v.rxn).cp / reaction(v.rxn).ca;

function gramsProduct(v) {
  const rxn = reaction(v.rxn);
  return (v.grams / molarMass(rxn.fa)) * (rxn.cp / rxn.ca) * molarMass(rxn.fp);
}

function gramsOther(v) {
  const rxn = reaction(v.rxn);
  return (v.grams / molarMass(rxn.fa)) * (rxn.cb / rxn.ca) * molarMass(rxn.fb);
}

function limitingFormula(v) {
  return reaction(v.rxn).fa;
}

function excessMoles(v) {
  const rxn = reaction(v.rxn);
  return v.molesB - v.molesA * (rxn.cb / rxn.ca);
}

function limitingProductMoles(v) {
  const rxn = reaction(v.rxn);
  return v.molesA * (rxn.cp / rxn.ca);
}

function eitherLimitingProductMoles(v) {
  const rxn = reaction(v.rxn);
  const extA = v.molesA / rxn.ca;
  const extB = v.molesB / rxn.cb;
  return Math.min(extA, extB) * rxn.cp;
}

function limitingGrams(v) {
  const rxn = reaction(v.rxn);
  return limitingProductMoles(v) * molarMass(rxn.fp);
}

const percentYield = (v) => (v.actual / v.theo) * 100;
const actualYield = (v) => v.theo * (v.percent / 100);
const titrationMolarity = (v) => v.Ma * v.Va / v.Vb;
const titrationVolume = (v) => v.Ma * v.Va / v.Mb;
const solutionMoles = (v) => v.molarity * (v.mL / 1000);

function solutionGrams(v) {
  const rxn = reaction(v.rxn);
  return v.molarity * (v.mL / 1000) * (rxn.cp / rxn.ca) * molarMass(rxn.fp);
}

const OX = [
  { text: 'S in SO4^2-', ox: 6 },
  { text: 'N in NO3^-', ox: 5 },
  { text: 'Mn in MnO4^-', ox: 7 },
  { text: 'Cr in Cr2O7^2-', ox: 6 },
  { text: 'C in CO2', ox: 4 },
  { text: 'Cl in ClO4^-', ox: 7 },
  { text: 'N in NH3', ox: -3 },
  { text: 'S in H2S', ox: -2 },
  { text: 'H in HCl', ox: 1 },
];

function oxRow(label) {
  const found = OX.find((item) => item.text === label);
  if (!found) throw new Error(`Unknown oxidation row ${label}`);
  return found;
}

export const templates = [
  {
    id: 'ch07-mole-ratio-reactant',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.3',
    topic: 'stoichiometry',
    vars: {
      rxn: { choices: names },
      moles: span(0.25, 1.75, 0.01, 3),
    },
    template: 'For the reaction {rxn}, how many moles of the second reactant are needed to consume {moles} mol of the first reactant?',
    solve: reactantMoles,
    unit: 'mol',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: (v) => {
      const rxn = reaction(v.rxn);
      return [
        `Use the mole ratio ${rxn.cb} mol ${rxn.b} / ${rxn.ca} mol ${rxn.a}.`,
        'Multiply the given moles by that ratio. Do not flip it.',
      ];
    },
    why: (v, x) => {
      const rxn = reaction(v.rxn);
      return `${num(v.moles, 3)} mol ${rxn.a} × (${rxn.cb} ${rxn.b} / ${rxn.ca} ${rxn.a}) = ${num(x, 3)} mol ${rxn.b}.`;
    },
    mistakes: [
      alt(reactantMoles, 'flipped', 'The mole ratio was upside down.', (v) => v.moles * reaction(v.rxn).ca / reaction(v.rxn).cb),
      alt(reactantMoles, 'no-ratio', 'The coefficient ratio was left out. The given moles are not the answer.', (v) => v.moles),
    ],
  },
  {
    id: 'ch07-mole-ratio-product',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.3',
    topic: 'stoichiometry',
    vars: {
      rxn: { choices: productNames },
      moles: span(0.25, 1.75, 0.01, 3),
    },
    derive(v) {
      return { product: reaction(v.rxn).p };
    },
    template: 'For the reaction {rxn}, how many moles of {product} form from {moles} mol of the first reactant? The other reactant is in excess.',
    solve: productMoles,
    unit: 'mol',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: (v) => {
      const rxn = reaction(v.rxn);
      return [
        `Mole ratio = ${rxn.cp} mol ${rxn.p} / ${rxn.ca} mol ${rxn.a}.`,
        'The other reactant is in excess, so the first reactant sets the product amount.',
      ];
    },
    why: (v, x) => {
      const rxn = reaction(v.rxn);
      return `${num(v.moles, 3)} mol ${rxn.a} × (${rxn.cp} / ${rxn.ca}) = ${num(x, 3)} mol ${rxn.p}.`;
    },
    mistakes: [
      alt(productMoles, 'flipped', 'The product and reactant coefficients were flipped.', (v) => v.moles * reaction(v.rxn).ca / reaction(v.rxn).cp),
      alt(productMoles, 'no-ratio', 'The coefficient ratio was skipped.', (v) => v.moles),
    ],
  },
  {
    id: 'ch07-grams-to-grams',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.3',
    topic: 'stoichiometry',
    vars: {
      rxn: { choices: productNames },
      grams: span(8.5, 32.5, 0.1, 3),
    },
    derive(v) {
      return { product: reaction(v.rxn).p };
    },
    template: 'For {rxn}, what mass of {product} forms from {grams} g of the first reactant when the other reactant is in excess?',
    solve: gramsProduct,
    unit: 'g',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Convert grams of reactant to moles, use the mole ratio, then convert moles of product to grams.',
      'Each step uses a different molar mass. Do not stop at moles.',
    ],
    why: (v, x) => {
      const rxn = reaction(v.rxn);
      const moles = v.grams / molarMass(rxn.fa);
      return `${num(v.grams, 3)} g ${rxn.a} → ${num(moles, 3)} mol → × ${rxn.cp}/${rxn.ca} → × ${num(molarMass(rxn.fp), 4)} g/mol = ${num(x, 3)} g ${rxn.p}.`;
    },
    mistakes: [
      alt(gramsProduct, 'moles-only', 'The calculation stopped at moles of product. Convert those moles to grams.', (v) => {
        const rxn = reaction(v.rxn);
        return (v.grams / molarMass(rxn.fa)) * (rxn.cp / rxn.ca);
      }),
      alt(gramsProduct, 'both-masses', 'The product molar mass was applied and then the reactant molar mass was applied again.', (v) => gramsProduct(v) * molarMass(reaction(v.rxn).fa)),
    ],
  },
  {
    id: 'ch07-grams-other-reactant',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.3',
    topic: 'stoichiometry',
    vars: {
      rxn: { choices: names },
      grams: span(8.5, 28.5, 0.1, 3),
    },
    template: 'For {rxn}, what mass of the second reactant is needed to consume {grams} g of the first reactant?',
    solve: gramsOther,
    unit: 'g',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Grams → moles of the first reactant → mole ratio → grams of the second reactant.',
      'Use each substance’s own molar mass.',
    ],
    why: (v, x) => {
      const rxn = reaction(v.rxn);
      return `${num(v.grams, 3)} g ${rxn.a} needs ${num(x, 3)} g ${rxn.b} by the ratio ${rxn.cb}/${rxn.ca}.`;
    },
    mistakes: [
      alt(gramsOther, 'moles-only', 'That is moles of the second reactant, not grams.', (v) => {
        const rxn = reaction(v.rxn);
        return (v.grams / molarMass(rxn.fa)) * (rxn.cb / rxn.ca);
      }),
      alt(gramsOther, 'same-grams', 'The gram amount was copied. The two reactants do not have the same mass in this mixture.', (v) => v.grams),
    ],
  },
  {
    id: 'ch07-limiting-identity',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.4',
    topic: 'limiting reagent',
    kind: 'exact',
    case: 'formula',
    vars: {
      rxn: { choices: names },
      molesA: span(0.2, 0.5, 0.001, 3),
      molesB: span(3, 4.5, 0.01, 3),
    },
    template: 'For {rxn}, a mixture starts with {molesA} mol of the first reactant and {molesB} mol of the second. Which reactant is limiting? Answer with its formula.',
    solve: limitingFormula,
    hints: () => [
      'Divide each mole amount by its coefficient. The smaller result is the limiting reactant.',
      'The limiting reactant is used up first. It is not always the one with fewer moles.',
    ],
    why: (v) => {
      const rxn = reaction(v.rxn);
      const extA = v.molesA / rxn.ca;
      const extB = v.molesB / rxn.cb;
      return `${rxn.a}: ${num(v.molesA, 3)}/${rxn.ca} = ${num(extA, 3)}. ${rxn.b}: ${num(v.molesB, 3)}/${rxn.cb} = ${num(extB, 3)}. ${rxn.a} is limiting.`;
    },
    mistakes: [
      {
        id: 'other-reactant',
        message: 'That reactant is in excess. Compare moles divided by coefficients.',
        value: (v) => reaction(v.rxn).fb,
      },
      {
        id: 'product',
        message: 'That is a product. The limiting reactant is one of the starting substances.',
        value: (v) => reaction(v.rxn).fp,
      },
    ],
  },
  {
    id: 'ch07-limiting-product-moles',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.4',
    topic: 'limiting reagent',
    vars: {
      rxn: { choices: productNames },
      extent: { min: 0.5, max: 1.2, step: 0.01 },
      tick: { min: 0, max: 1, step: 0.01 },
      band: { choices: ['close', 'wide'] },
      who: { choices: ['first', 'second'] },
    },
    derive(v) {
      const rxn = reaction(v.rxn);
      const gap = v.band === 'close' ? 0.08 + v.tick * 0.06 : 0.22 + v.tick * 0.18;
      const short = 1 - gap;
      const molesA = v.who === 'first' ? v.extent * rxn.ca * short : v.extent * rxn.ca;
      const molesB = v.who === 'second' ? v.extent * rxn.cb * short : v.extent * rxn.cb;
      return {
        product: rxn.p,
        molesA,
        molesB,
        ca: rxn.ca,
        cb: rxn.cb,
        cp: rxn.cp,
      };
    },
    format: { molesA: 3, molesB: 3 },
    template: 'For {rxn}, {molesA} mol of the first reactant is mixed with {molesB} mol of the second. How many moles of {product} form?',
    solve: eitherLimitingProductMoles,
    unit: 'mol',
    sigFigs: 3,
    tolerance: 0.5,
    valid(v) {
      const extA = v.molesA / v.ca;
      const extB = v.molesB / v.cb;
      const low = Math.min(extA, extB);
      const high = Math.max(extA, extB);
      if (!(low > 0 && high >= low * 1.05)) return false;
      const firstLimits = extA < extB;
      return v.who === 'first' ? firstLimits : !firstLimits;
    },
    hints: () => [
      "Divide each reactant's moles by its coefficient, and the smaller result is the limiting reactant.",
    ],
    why: (v, x) => {
      const rxn = reaction(v.rxn);
      const extA = v.molesA / rxn.ca;
      const extB = v.molesB / rxn.cb;
      const limiting = extA < extB ? rxn.a : rxn.b;
      return `${rxn.a}: ${num(v.molesA, 3)}/${rxn.ca} = ${num(extA, 3)}. ${rxn.b}: ${num(v.molesB, 3)}/${rxn.cb} = ${num(extB, 3)}. ${limiting} is smaller, so moles of ${rxn.p} = ${num(Math.min(extA, extB), 3)} × ${rxn.cp} = ${num(x, 3)}.`;
    },
    mistakes: [
      alt(eitherLimitingProductMoles, 'used-excess', 'The excess reactant was used to predict the product.', (v) => {
        const rxn = reaction(v.rxn);
        return Math.max(v.molesA / rxn.ca, v.molesB / rxn.cb) * rxn.cp;
      }),
      alt(eitherLimitingProductMoles, 'no-coefficient', 'The smaller result was left as the answer. Multiply it by the product coefficient.', (v) => {
        const rxn = reaction(v.rxn);
        return Math.min(v.molesA / rxn.ca, v.molesB / rxn.cb);
      }),
    ],
  },
  {
    id: 'ch07-theoretical-yield',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.4',
    topic: 'percent yield',
    vars: {
      rxn: { choices: productNames },
      grams: span(10.5, 28.5, 0.1, 3),
      percent: span(55, 85, 0.1, 3),
    },
    derive(v) {
      return { product: reaction(v.rxn).p };
    },
    template: 'A past run of {rxn} had a percent yield of {percent}%. This batch starts with {grams} g of the first reactant and excess of the other. What is the theoretical yield of {product}, in grams?',
    solve: gramsProduct,
    unit: 'g',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Theoretical yield assumes every bit of the limiting reactant becomes product. Ignore the old percent.',
      'Grams → moles → mole ratio → grams of product.',
    ],
    why: (v, x) => `The theoretical yield is ${num(x, 3)} g. The old ${num(v.percent, 3)}% yield is not part of a theoretical yield.`,
    mistakes: [
      alt(gramsProduct, 'old-percent', 'The old percent yield was applied. Theoretical yield is the 100% amount.', (v) => gramsProduct(v) * v.percent / 100),
      alt(gramsProduct, 'moles-only', 'That is moles of product, not grams.', (v) => {
        const rxn = reaction(v.rxn);
        return (v.grams / molarMass(rxn.fa)) * (rxn.cp / rxn.ca);
      }),
    ],
  },
  {
    id: 'ch07-percent-yield',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.4',
    topic: 'percent yield',
    vars: {
      actual: span(12.5, 28.5, 0.1, 3),
      theo: span(40.5, 72.5, 0.1, 3),
    },
    template: 'A reaction produces {actual} g of product. The theoretical yield is {theo} g. What is the percent yield?',
    solve: percentYield,
    unit: '%',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Percent yield = (actual / theoretical) × 100.',
      'The result must be at or below 100% when the actual mass is smaller.',
    ],
    why: (v, x) => `% yield = (${num(v.actual, 3)} / ${num(v.theo, 3)}) × 100 = ${num(x, 3)}%.`,
    mistakes: [
      alt(percentYield, 'actual-mass', 'That is the actual mass, not the percent.', (v) => v.actual),
      scaled(percentYield, 0.01, 'fraction', 'That is the yield as a fraction. Multiply by 100.'),
    ],
  },
  {
    id: 'ch07-actual-yield',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.4',
    topic: 'percent yield',
    vars: {
      theo: span(24.5, 64.5, 0.1, 3),
      percent: span(42.5, 88.5, 0.1, 3),
    },
    template: 'The theoretical yield is {theo} g and the percent yield is {percent}%. What mass of product is actually collected?',
    solve: actualYield,
    unit: 'g',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Actual = theoretical × (percent yield / 100).',
      'A percent has to be turned into a fraction before you multiply.',
    ],
    why: (v, x) => `Actual = ${num(v.theo, 3)} × (${num(v.percent, 3)} / 100) = ${num(x, 3)} g.`,
    mistakes: [
      alt(actualYield, 'forgot-percent', 'The percent was used without dividing by 100.', (v) => v.theo * v.percent),
      alt(actualYield, 'theoretical', 'That is the theoretical yield. Scale it by the percent.', (v) => v.theo),
    ],
  },
  {
    id: 'ch07-titration-molarity',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.5',
    topic: 'titration',
    vars: {
      Ma: span(0.42, 0.86, 0.01, 3),
      Va: span(15, 25, 0.1, 3),
      Vb: span(40, 70, 0.1, 3),
    },
    template: 'In a 1-to-1 titration, {Va} mL of {Ma} M acid is neutralized by {Vb} mL of base. What is the molarity of the base?',
    solve: titrationMolarity,
    unit: 'M',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'For a 1-to-1 reaction, Ma·Va = Mb·Vb.',
      'Milliliters cancel. You do not have to convert both volumes to liters.',
    ],
    why: (v, x) => `Mb = (${num(v.Ma, 3)})(${num(v.Va, 3)}) / ${num(v.Vb, 3)} = ${num(x, 3)} M.`,
    mistakes: [
      alt(titrationMolarity, 'flipped-volumes', 'The two volumes were swapped.', (v) => v.Ma * v.Vb / v.Va),
      alt(titrationMolarity, 'acid-molarity', 'That is the acid molarity. The base is more dilute here.', (v) => v.Ma),
    ],
  },
  {
    id: 'ch07-titration-volume',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.5',
    topic: 'titration',
    vars: {
      Ma: span(0.45, 0.85, 0.01, 3),
      Mb: span(0.12, 0.22, 0.001, 3),
      Va: span(18.5, 32.5, 0.1, 3),
    },
    template: 'A 1-to-1 titration uses {Va} mL of {Ma} M acid and a {Mb} M base. What volume of base, in mL, is required?',
    solve: titrationVolume,
    unit: 'mL',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Vb = Ma·Va / Mb for a 1-to-1 titration.',
      'A more dilute base takes a larger volume.',
    ],
    why: (v, x) => `Vb = (${num(v.Ma, 3)})(${num(v.Va, 3)}) / ${num(v.Mb, 3)} = ${num(x, 3)} mL.`,
    mistakes: [
      alt(titrationVolume, 'flipped', 'The molarities were flipped. Divide by the base molarity.', (v) => v.Mb * v.Va / v.Ma),
      alt(titrationVolume, 'acid-volume', 'That is the acid volume. The base volume is larger because the base is more dilute.', (v) => v.Va),
    ],
  },
  {
    id: 'ch07-solution-moles',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.3',
    topic: 'solution stoichiometry',
    vars: {
      molarity: span(0.25, 1.8, 0.01, 3),
      mL: span(25, 80, 0.1, 3),
    },
    template: 'How many moles of solute are in {mL} mL of a {molarity} M solution?',
    solve: solutionMoles,
    unit: 'mol',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Convert mL to L, then multiply by molarity.',
      '1 mL = 0.001 L. Molarity is moles per liter.',
    ],
    why: (v, x) => `Moles = ${num(v.molarity, 3)} mol/L × ${num(v.mL / 1000, 3)} L = ${num(x, 3)} mol.`,
    mistakes: [
      alt(solutionMoles, 'forgot-mL', 'Milliliters were used as liters.', (v) => v.molarity * v.mL),
      scaled(solutionMoles, 10, 'centi', 'The volume was divided by 100 instead of 1000.'),
    ],
  },
  {
    id: 'ch07-solution-grams',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.3',
    topic: 'solution stoichiometry',
    vars: {
      rxn: { choices: productNames },
      molarity: span(0.5, 1.8, 0.01, 3),
      mL: span(40, 90, 0.1, 3),
    },
    derive(v) {
      return { product: reaction(v.rxn).p };
    },
    template: 'For {rxn}, {mL} mL of a {molarity} M solution of the first reactant reacts completely. The other reactant is in excess. What mass of {product} forms, in grams?',
    solve: solutionGrams,
    unit: 'g',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Moles of reactant = molarity × liters. Then use the mole ratio and the product molar mass.',
      'Change mL to L before multiplying by molarity.',
    ],
    why: (v, x) => {
      const rxn = reaction(v.rxn);
      const moles = v.molarity * (v.mL / 1000);
      return `${num(moles, 3)} mol ${rxn.a} × ${rxn.cp}/${rxn.ca} × ${num(molarMass(rxn.fp), 4)} g/mol = ${num(x, 3)} g.`;
    },
    mistakes: [
      alt(solutionGrams, 'forgot-mL', 'The volume was left in milliliters, so the mole count is 1000 times too big.', (v) => solutionGrams(v) * 1000),
      alt(solutionGrams, 'moles-only', 'The product moles were not converted to grams.', (v) => {
        const rxn = reaction(v.rxn);
        return v.molarity * (v.mL / 1000) * (rxn.cp / rxn.ca);
      }),
    ],
  },
  {
    id: 'ch07-oxidation-number',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.2',
    topic: 'oxidation number',
    vars: {
      species: { choices: OX.map((item) => item.text) },
      mass: span(12.5, 36.5, 0.1, 3),
    },
    template: 'A {mass} g sample contains {species}. What is the oxidation number of the named atom?',
    solve: (v) => oxRow(v.species).ox,
    unit: null,
    sigFigs: 1,
    tolerance: 0.5,
    hints: () => [
      'Oxygen is usually −2 and hydrogen in these compounds is +1. The ion’s charge is the sum of the oxidation numbers.',
      'The gram amount does not change an oxidation number.',
    ],
    why: (v, x) => `${v.species} has oxidation number ${num(x, 1)}. The ${num(v.mass, 3)} g sample is only the amount on the balance.`,
    mistakes: [
      alt((v) => oxRow(v.species).ox, 'sign', 'The sign of the oxidation number was reversed.', (v) => -oxRow(v.species).ox),
      alt((v) => oxRow(v.species).ox, 'off-by-two', 'A subscript of 2 was missed while assigning oxygen or hydrogen.', (v) => {
        const ox = oxRow(v.species).ox;
        const shifted = ox + 2;
        return shifted === -ox ? ox - 2 : shifted;
      }),
    ],
  },
  {
    id: 'ch07-excess-moles',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.4',
    topic: 'limiting reagent',
    vars: {
      rxn: { choices: excessNames },
      molesA: span(0.4, 0.6, 0.001, 3),
      molesB: span(4, 5.5, 0.01, 3),
    },
    template: 'For {rxn}, {molesA} mol of the first reactant is mixed with {molesB} mol of the second. How many moles of the second reactant are left over?',
    solve: excessMoles,
    unit: 'mol',
    sigFigs: 'min',
    tolerance: 0.5,
    valid: (v) => excessMoles(v) > 0.2,
    hints: () => [
      'The first reactant is limiting. Moles of the second that react = moles of the first × (its coefficient / the first coefficient).',
      'Leftover = starting moles − moles that react.',
    ],
    why: (v, x) => {
      const rxn = reaction(v.rxn);
      const used = v.molesA * (rxn.cb / rxn.ca);
      return `${num(v.molesB, 3)} − ${num(used, 3)} = ${num(x, 3)} mol ${rxn.b} left.`;
    },
    mistakes: [
      alt(excessMoles, 'starting', 'That is the starting amount of the excess reactant. Subtract the part that reacts.', (v) => v.molesB),
      alt(excessMoles, 'consumed', 'That is the amount that reacts, not the amount left over.', (v) => {
        const rxn = reaction(v.rxn);
        return v.molesA * (rxn.cb / rxn.ca);
      }),
    ],
  },
  {
    id: 'ch07-limiting-grams',
    ch: 7,
    openstax_section: 'OpenStax AF2e §7.4',
    topic: 'limiting reagent',
    vars: {
      rxn: { choices: productNames },
      molesA: span(0.25, 0.55, 0.001, 3),
      molesB: span(3.2, 4.8, 0.01, 3),
    },
    derive(v) {
      return { product: reaction(v.rxn).p };
    },
    template: 'For {rxn}, {molesA} mol of the first reactant is combined with {molesB} mol of the second. What mass of {product} can form, in grams?',
    solve: limitingGrams,
    unit: 'g',
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Find which reactant is limiting, convert that amount to moles of product, then to grams.',
      'In these mixtures the first reactant is limiting.',
    ],
    why: (v, x) => {
      const rxn = reaction(v.rxn);
      return `${num(limitingProductMoles(v), 3)} mol ${rxn.p} × ${num(molarMass(rxn.fp), 4)} g/mol = ${num(x, 3)} g.`;
    },
    mistakes: [
      alt(limitingGrams, 'used-excess', 'The excess reactant was treated as limiting.', (v) => {
        const rxn = reaction(v.rxn);
        return v.molesB * (rxn.cp / rxn.cb) * molarMass(rxn.fp);
      }),
      alt(limitingGrams, 'moles-only', 'That is moles of product. Multiply by the product molar mass.', (v) => limitingProductMoles(v)),
    ],
  },
];
