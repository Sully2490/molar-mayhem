import data from '../data/elements.json' with { type: 'json' };

/**
 * Element facts for the shared periodic table.
 * Records are adapted from Bowserinator Periodic-Table-JSON.
 * See data/ATTRIBUTION.md. `sym` is the symbol older callers already use.
 */

/** @typedef {'main' | 'lanthanide' | 'actinide'} ElementSeries */
/** @typedef {'s' | 'p' | 'd' | 'f'} ElementBlock */

/**
 * @typedef {object} ElementRecord
 * @property {number} z
 * @property {string} sym
 * @property {string} name
 * @property {number} period
 * @property {number} group
 * @property {ElementSeries} series
 * @property {ElementBlock} block
 * @property {string} category
 * @property {string} phase
 * @property {number | null} mass
 * @property {boolean} massBracket
 * @property {number | null} en
 * @property {number | null} radius Empirical atomic radius in pm, when comparable.
 * @property {number | null} ie First ionization energy in kJ/mol, when known.
 * @property {number | null} ea Electron affinity in kJ/mol, when known.
 * @property {string} config
 * @property {number[]} shells
 * @property {number | null} fRow
 * @property {number | null} fCol
 */

/** @type {ElementRecord[]} */
export const ELEMENTS = data.elements.map((element) => ({
  z: element.z,
  sym: element.symbol,
  name: element.name,
  period: element.period,
  group: element.group,
  series: element.series,
  block: element.block,
  category: element.category,
  phase: element.phase,
  mass: element.mass,
  massBracket: Boolean(element.massBracket),
  en: element.en,
  radius: element.radius,
  ie: element.ie,
  ea: element.ea,
  config: element.config,
  shells: element.shells,
  fRow: element.fRow,
  fCol: element.fCol,
}));
