/**
 * One glossary entry.
 * chapter: 1–9. lesson: a lesson id in content/chNN.
 * visual: a key from js/terms/art.js, included only when a diagram helps.
 * match: "formula" keeps letter case (Co is not CO). Omitted means a whole word or phrase.
 * @param {{
 *   chapter: number,
 *   lesson: string,
 *   id: string,
 *   term: string,
 *   definition: string,
 *   example: string,
 *   use: string,
 *   related: string[],
 *   visual?: string,
 *   aliases?: string[],
 *   match?: 'word' | 'formula',
 * }} row
 */
export function term(row) {
  const record = {
    chapter: row.chapter,
    lesson: row.lesson,
    id: row.id,
    term: row.term,
    definition: row.definition,
    example: row.example,
    use: row.use,
    related: row.related,
  };
  if (row.visual) record.visual = row.visual;
  if (row.aliases?.length) record.aliases = row.aliases;
  if (row.match) record.match = row.match;
  return record;
}
