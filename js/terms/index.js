import { createTermDialog, bindTermLinks } from './dialog.js';

export { TERMS, termById, termsByChapter } from './catalog.js';
export { linkTerms, linkPlain } from './linker.js';
export {
  createTermDialog,
  bindTermLinks,
  renderTermCard,
  focusableElements,
  INERT_PAGE_SELECTOR,
} from './dialog.js';
export {
  filterTerms,
  renderTermsIndex,
  renderTermItems,
  bindTermsIndex,
  termIdFromHash,
} from './index-page.js';
export {
  toFlashcards,
  recallFlashcards,
  allFlashcards,
  flashcardsJson,
  triggerFlashcardDownload,
  FLASHCARD_FILENAME,
} from './cards.js';
export {
  RECALL_DECKS,
  looseKey,
  checkCard,
  startRecall,
  submitAnswer,
  revealAnswer,
  markSelf,
  deckById,
  renderRecallIndex,
  renderRecallSession,
  bindRecall,
  recallDeckFromHash,
  answerHits,
  splitRecallList,
} from './recall.js';
export { visualSvg, VISUAL_IDS } from './art.js';

/** Hash route for the browsable index. Documented for the route lane. */
export const TERMS_ROUTE = 'Terms';

/**
 * One dialog for the page. Call this once after the document exists.
 * Lesson HTML still has to pass through linkTerms at render time.
 * @param {Document} [doc]
 */
export function installTerms(doc = document) {
  const dialog = createTermDialog(doc);
  bindTermLinks(doc, dialog);
  return dialog;
}
