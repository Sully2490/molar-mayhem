import { TERMS } from '../../content/terms/index.js';

export { TERMS };

const byId = new Map(TERMS.map((entry) => [entry.id, entry]));

/**
 * @param {string} id
 * @param {typeof TERMS} [terms]
 */
export function termById(id, terms = TERMS) {
  if (terms !== TERMS) return terms.find((entry) => entry.id === id) ?? null;
  return byId.get(id) ?? null;
}

/**
 * @param {number | string} chapter
 * @param {typeof TERMS} [terms]
 */
export function termsByChapter(chapter, terms = TERMS) {
  const number = Number(chapter);
  return terms.filter((entry) => entry.chapter === number);
}
