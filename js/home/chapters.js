/** Chapter names and short lesson titles for the module tiles. */

export const CHAPTERS = Object.freeze([
  {
    number: 1,
    title: 'Essential Ideas',
    blurb: 'How chemists describe matter, measure it, and convert units.',
    sections: 'OpenStax AF2e §1.1–§1.6',
    accent: '#0f5c56',
    wash: '#e7f4f1',
  },
  {
    number: 2,
    title: 'Atoms and Ions',
    blurb: 'What atoms are made of, and how a mass becomes a count of particles.',
    sections: 'OpenStax AF2e §2.1–§2.4',
    accent: '#1d4e89',
    wash: '#e7f0f8',
  },
  {
    number: 3,
    title: 'Electrons',
    blurb: 'Light, energy levels, electron arrangements, and periodic trends.',
    sections: 'OpenStax AF2e §3.1–§3.7',
    accent: '#5b3d8a',
    wash: '#f1eaf8',
  },
  {
    number: 4,
    title: 'Bonding and Shape',
    blurb: 'Ionic and covalent bonds, names, Lewis structures, and molecular shape.',
    sections: 'OpenStax AF2e §4.1–§4.6',
    accent: '#9a3412',
    wash: '#f8efe8',
  },
  {
    number: 5,
    title: 'Bonding Theories',
    blurb: 'Sigma and pi bonds, hybrid orbitals, and molecular orbitals.',
    sections: 'OpenStax AF2e §5.1–§5.4',
    accent: '#8a5a12',
    wash: '#f8f1e4',
  },
  {
    number: 6,
    title: 'Composition',
    blurb: 'Moles, formulas, and how concentrated a solution is.',
    sections: 'OpenStax AF2e §6.1–§6.4',
    accent: '#0e7490',
    wash: '#e5f4f8',
  },
  {
    number: 7,
    title: 'Stoichiometry',
    blurb: 'Balanced equations, yields, and numbers from a lab analysis.',
    sections: 'OpenStax AF2e §7.1–§7.5',
    accent: '#3f6212',
    wash: '#eef3e4',
  },
  {
    number: 8,
    title: 'Gases',
    blurb: 'Pressure, the ideal gas law, mixtures, and when the law fails.',
    sections: 'OpenStax AF2e §8.1–§8.6',
    accent: '#1e3a5f',
    wash: '#e8eef5',
  },
  {
    number: 9,
    title: 'Thermochemistry',
    blurb: 'Heat, calorimetry, enthalpy, and energy stored in bonds.',
    sections: 'OpenStax AF2e §9.1–§9.4',
    accent: '#9f1239',
    wash: '#f8e8ee',
  },
]);

const LESSON_TITLES = Object.freeze({
  'ch01-context': 'Hypothesis, law, theory',
  'ch01-classify': 'States and mixtures',
  'ch01-properties': 'Physical and chemical',
  'ch01-measure': 'Units and density',
  'ch01-sigfigs': 'Significant figures',
  'ch01-convert': 'Unit conversions',
  'ch2-early-ideas': "Dalton's ideas",
  'ch2-evolution': 'Inside the atom',
  'ch2-structure': 'Protons and neutrons',
  'ch2-formulas': 'Grams and moles',
  'ch03-electromagnetic': 'Light and photons',
  'ch03-bohr': 'Energy levels',
  'ch03-quantum': 'Quantum numbers',
  'ch03-configurations': 'Electron configurations',
  'ch03-periodic-trends': 'Periodic trends',
  'ch03-periodic-table': 'Reading the table',
  'ch03-compounds': 'Ionic or molecular',
  'ch04-ionic-bonding': 'Ionic bonds',
  'ch04-covalent-bonding': 'Covalent bonds',
  'ch04-nomenclature': 'Naming compounds',
  'ch04-lewis-structures': 'Lewis structures',
  'ch04-formal-charge-resonance': 'Formal charge',
  'ch04-shape-and-polarity': 'Shape and polarity',
  'ch5-sigma-pi': 'Sigma and pi bonds',
  'ch5-hybridization': 'Hybrid orbitals',
  'ch5-multiple-bonds': 'Multiple bonds',
  'ch5-molecular-orbitals': 'Molecular orbitals',
  'ch06-formula-mass': 'Formula mass',
  'ch06-empirical': 'Empirical formulas',
  'ch06-molarity': 'Molarity',
  'ch06-concentration': 'Other concentrations',
  'ch07-balance': 'Balancing equations',
  'ch07-classify': 'Reaction types',
  'ch07-cards': 'Strong acids and bases',
  'ch07-stoich': 'Mole ratios',
  'ch07-yield': 'Limiting reactant',
  'ch07-analysis': 'Titration and analysis',
  '8.1-pressure': 'Pressure',
  '8.2-ideal-gas': 'Ideal gas law',
  '8.3-mixtures': 'Gas mixtures',
  '8.4-effusion': 'Effusion',
  '8.5-kinetic': 'Kinetic energy',
  '8.6-real-gases': 'Real gases',
  'ch09-energy': 'Heat and temperature',
  'ch09-calorimetry': 'Calorimetry',
  'ch09-enthalpy': 'Enthalpy',
  'ch09-bonds': 'Bond energy',
});

export function chapterByNumber(number) {
  return CHAPTERS.find((chapter) => chapter.number === Number(number)) ?? null;
}

export function sectionRank(lesson) {
  const text = String(lesson?.openstax_section ?? '');
  const marked = text.match(/§\s*(\d+(?:\.\d+)?)/);
  if (marked) return Number(marked[1]);
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 99;
}

export function sectionLabel(lesson) {
  const match = String(lesson?.openstax_section ?? '').match(/§\s*[\d.]+/);
  return match ? match[0].replace(/\s+/g, '') : '';
}

export function orderedLessons(lessons) {
  return [...(lessons ?? [])]
    .filter((lesson) => lesson && typeof lesson.id === 'string' && lesson.id)
    .sort((left, right) => (
      (Number(left.ch) || 0) - (Number(right.ch) || 0)
      || sectionRank(left) - sectionRank(right)
      || String(left.id).localeCompare(String(right.id))
    ));
}

export function lessonsForChapter(lessons, chapter) {
  return orderedLessons(lessons).filter((lesson) => Number(lesson.ch) === Number(chapter));
}

/** A short name for a tile. Unknown lessons use the first clause of the objective. */
export function shortTitle(lesson) {
  if (!lesson) return 'Lesson';
  const known = LESSON_TITLES[lesson.id];
  if (known) return known;
  const line = String(lesson.guide_line ?? lesson.id ?? 'Lesson').trim();
  const cut = line.split(/[.,:;]/)[0].trim();
  if (!cut) return 'Lesson';
  if (cut.length <= 42) return cut;
  return `${cut.slice(0, 41).trim()}…`;
}
