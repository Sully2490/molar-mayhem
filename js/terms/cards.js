import { TERMS } from '../../content/terms/index.js';
import { RECALL_DECKS } from '../../content/terms/recall/index.js';

/**
 * Glossary cards for another lane to import. No network.
 * @param {typeof TERMS} [terms]
 */
export function toFlashcards(terms = TERMS) {
  return terms.map((entry) => ({
    id: entry.id,
    kind: 'term',
    front: entry.term,
    back: entry.definition,
    example: entry.example,
    use: entry.use,
    chapter: entry.chapter,
    lesson: entry.lesson,
    related: entry.related,
  }));
}

/**
 * @param {typeof RECALL_DECKS} [decks]
 */
export function recallFlashcards(decks = RECALL_DECKS) {
  const cards = [];
  for (const deck of decks) {
    for (const card of deck.cards) {
      const back = card.kind === 'list'
        ? card.items.map((item) => item.label).join('; ')
        : card.answer;
      cards.push({
        id: `${deck.id}:${card.id}`,
        kind: 'recall',
        deck: deck.id,
        front: card.prompt,
        back,
        chapter: deck.chapter,
        lesson: deck.lesson,
      });
    }
  }
  return cards;
}

export function allFlashcards(terms = TERMS, decks = RECALL_DECKS) {
  return [...toFlashcards(terms), ...recallFlashcards(decks)];
}

export function flashcardsJson(cards = allFlashcards()) {
  return `${JSON.stringify({ version: 1, source: 'molar-mayhem', cards }, null, 2)}\n`;
}

export const FLASHCARD_FILENAME = 'molar-mayhem-flashcards.json';

/**
 * Save the deck as a local file. Nothing is uploaded.
 * @param {Document} [doc]
 */
export function triggerFlashcardDownload(doc = document, cards = allFlashcards()) {
  const blob = new Blob([flashcardsJson(cards)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = FLASHCARD_FILENAME;
  link.hidden = true;
  doc.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
