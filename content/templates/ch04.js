import { alt, num, scaled, span } from './kit.js';

const FRAGMENTS = [
  { text: '5 valence electrons, 0 nonbonding electrons, and 8 bonding electrons', v: 5, lone: 0, bond: 8 },
  { text: '6 valence electrons, 2 nonbonding electrons, and 6 bonding electrons', v: 6, lone: 2, bond: 6 },
  { text: '7 valence electrons, 4 nonbonding electrons, and 4 bonding electrons', v: 7, lone: 4, bond: 4 },
  { text: '6 valence electrons, 0 nonbonding electrons, and 8 bonding electrons', v: 6, lone: 0, bond: 8 },
  { text: '4 valence electrons, 2 nonbonding electrons, and 6 bonding electrons', v: 4, lone: 2, bond: 6 },
  { text: '5 valence electrons, 2 nonbonding electrons, and 8 bonding electrons', v: 5, lone: 2, bond: 8 },
  { text: '6 valence electrons, 4 nonbonding electrons, and 6 bonding electrons', v: 6, lone: 4, bond: 6 },
  { text: '7 valence electrons, 6 nonbonding electrons, and 4 bonding electrons', v: 7, lone: 6, bond: 4 },
];

function fragmentByText(text) {
  const found = FRAGMENTS.find((item) => item.text === text);
  if (!found) throw new Error('Unknown fragment');
  return found;
}

const formal = (v) => {
  const atom = fragmentByText(v.atom);
  return atom.v - atom.lone - atom.bond / 2;
};
const deltaEn = (v) => v.high - v.low;

function bondClass(delta) {
  if (delta > 1.8) return 'ionic';
  if (delta >= 0.4) return 'polar covalent';
  return 'nonpolar covalent';
}

export const templates = [
  {
    id: 'ch04-formal-charge',
    ch: 4,
    openstax_section: 'OpenStax AF2e §4.5',
    topic: 'formal charge',
    vars: {
      mass: span(12.5, 36.5, 0.01, 4),
      atom: { choices: FRAGMENTS.map((item) => item.text) },
    },
    template: 'In a {mass} g sample, one atom has {atom}. What is the formal charge on that atom?',
    solve: formal,
    unit: null,
    sigFigs: 2,
    tolerance: 0.5,
    hints: () => [
      'Formal charge = valence electrons − nonbonding electrons − half the bonding electrons.',
      'The sample mass is not part of the formal-charge count.',
    ],
    why: (v, x) => {
      const atom = fragmentByText(v.atom);
      return `Formal charge = ${atom.v} − ${atom.lone} − ${atom.bond}/2 = ${num(x, 2)}. The ${num(v.mass, 4)} g sample does not change the count.`;
    },
    mistakes: [
      alt(formal, 'forgot-half', 'All of the bonding electrons were subtracted. Use only half of them.', (v) => {
        const atom = fragmentByText(v.atom);
        return atom.v - atom.lone - atom.bond;
      }),
      alt(formal, 'added', 'The valence electrons and the nonbonding electrons were added together.', (v) => {
        const atom = fragmentByText(v.atom);
        return atom.v + atom.lone;
      }),
    ],
  },
  {
    id: 'ch04-formal-charge-sum',
    ch: 4,
    openstax_section: 'OpenStax AF2e §4.5',
    topic: 'formal charge',
    vars: {
      count: span(12.5, 36.5, 0.1, 3),
      atom: { choices: FRAGMENTS.map((item) => item.text) },
    },
    template: 'Each of {count} identical atoms has {atom}. What is the sum of their formal charges?',
    solve: (v) => formal(v) * v.count,
    unit: null,
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Find the formal charge of one atom, then multiply by how many atoms you have.',
      'Formal charge = valence − nonbonding − (bonding electrons)/2.',
    ],
    why: (v, x) => `One atom has formal charge ${num(formal(v), 1)}. ${num(v.count, 3)} atoms give a sum of ${num(x, 3)}.`,
    mistakes: [
      alt((v) => formal(v) * v.count, 'one-atom', 'That is the formal charge of one atom. Multiply by the number of atoms.', (v) => formal(v)),
      scaled((v) => formal(v) * v.count, 2, 'double', 'The bonding electrons were handled twice. Multiply the one-atom formal charge by the count only once.'),
    ],
  },
  {
    id: 'ch04-delta-en',
    ch: 4,
    openstax_section: 'OpenStax AF2e §4.2',
    topic: 'electronegativity',
    vars: {
      low: span(0.825, 1.775, 0.001, 4),
      high: span(2.125, 3.875, 0.001, 4),
    },
    template: 'One atom has electronegativity {low} and the other has {high}. What is the electronegativity difference?',
    solve: deltaEn,
    unit: null,
    sigFigs: 'min',
    tolerance: 0.5,
    hints: () => [
      'Subtract the smaller value from the larger one. The difference is positive.',
      'Do not add the two electronegativities.',
    ],
    why: (v, x) => `ΔEN = ${num(v.high, 4)} − ${num(v.low, 4)} = ${num(x, 4)}.`,
    mistakes: [
      alt(deltaEn, 'sum', 'The two values were added. Subtract them.', (v) => v.high + v.low),
      scaled(deltaEn, 10, 'times-ten', 'A decimal place moved. The difference itself is the answer.'),
    ],
  },
  {
    id: 'ch04-bond-class',
    ch: 4,
    openstax_section: 'OpenStax AF2e §4.2',
    topic: 'electronegativity',
    kind: 'exact',
    case: 'insensitive',
    vars: {
      low: span(0.825, 1.775, 0.001, 4),
      high: span(2.125, 3.875, 0.001, 4),
    },
    template: 'One atom has electronegativity {low} and the other has {high}. Classify the bond as nonpolar covalent, polar covalent, or ionic.',
    solve: (v) => bondClass(deltaEn(v)),
    hints: () => [
      'Subtract the electronegativities first.',
      'Under 0.4 is nonpolar covalent, 0.4 to 1.8 is polar covalent, and above 1.8 is ionic.',
    ],
    why: (v, x) => `ΔEN = ${num(deltaEn(v), 4)}. Using cutoffs 0.4 and 1.8, the bond is ${x}.`,
    mistakes: [
      {
        id: 'neighbor',
        message: 'Check the cutoffs again: 0.4 separates nonpolar from polar, and 1.8 separates polar from ionic.',
        wrong: (v) => {
          const right = bondClass(deltaEn(v));
          if (right === 'ionic') return 'polar covalent';
          if (right === 'polar covalent') return 'nonpolar covalent';
          return 'ionic';
        },
      },
      {
        id: 'other-end',
        message: 'That label is at the other end of the scale from this difference.',
        wrong: (v) => {
          const right = bondClass(deltaEn(v));
          if (right === 'ionic') return 'nonpolar covalent';
          if (right === 'nonpolar covalent') return 'polar covalent';
          return 'ionic';
        },
      },
    ],
  },
];
