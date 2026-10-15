import { TERMS } from '../../content/terms/index.js';
import { escapeHtml } from './html.js';
import { triggerFlashcardDownload } from './cards.js';
import { bindTermLinks } from './dialog.js';

/**
 * @param {typeof TERMS} terms
 * @param {{ query?: string, chapter?: number | string }} [filter]
 */
export function filterTerms(terms, { query = '', chapter = 'all' } = {}) {
  const needle = String(query).trim().toLowerCase();
  const chapterNumber = chapter === 'all' || chapter === '' || chapter == null
    ? null
    : Number(chapter);
  return terms.filter((entry) => {
    if (chapterNumber != null && entry.chapter !== chapterNumber) return false;
    if (!needle) return true;
    const haystack = [
      entry.term,
      entry.definition,
      entry.example,
      entry.use,
      ...(entry.aliases ?? []),
    ].join('\n').toLowerCase();
    return haystack.includes(needle);
  });
}

/**
 * Browsable index. Search and the chapter filter work after bindTermsIndex.
 * @param {typeof TERMS} [terms]
 * @param {{ query?: string, chapter?: number | string }} [filter]
 */
export function renderTermsIndex(terms = TERMS, filter = {}) {
  const active = filter.chapter ?? 'all';
  const shown = filterTerms(terms, filter);
  const chapters = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((chapter) => {
    const pressed = String(active) === String(chapter);
    return `<button type="button" data-terms-chapter="${chapter}" aria-pressed="${pressed ? 'true' : 'false'}">${chapter}</button>`;
  }).join('');
  return `
    <section class="terms-page" data-terms-page>
      <p class="kicker">Chapters 1–9</p>
      <h1>Terms</h1>
      <p>Search a plain-language glossary. Tap a word to open its card.</p>
      <form class="terms-search" role="search" data-terms-search>
        <label for="terms-q">Search terms</label>
        <input id="terms-q" name="q" type="search" autocomplete="off" value="${escapeHtml(filter.query ?? '')}">
      </form>
      <div class="terms-chapters" role="group" aria-label="Filter by chapter" data-terms-chapters>
        <button type="button" data-terms-chapter="all" aria-pressed="${String(active) === 'all' ? 'true' : 'false'}">All</button>
        ${chapters}
      </div>
      <p class="terms-count" data-terms-count aria-live="polite">${shown.length} ${shown.length === 1 ? 'term' : 'terms'}</p>
      <ul class="terms-index" data-terms-list>
        ${renderTermItems(shown)}
      </ul>
      <p class="terms-actions">
        <a href="#Terms/recall">Quick recall</a>
        <button type="button" data-terms-export>Download flashcards</button>
      </p>
    </section>
  `;
}

export function renderTermItems(terms) {
  if (terms.length === 0) return '<li class="terms-empty">No terms match that search.</li>';
  return terms.map((entry) => (
    `<li><a class="term-link" href="#Terms/${encodeURIComponent(entry.id)}" data-term="${escapeHtml(entry.id)}">${escapeHtml(entry.term)}</a> <span class="terms-ch">Ch ${entry.chapter}</span></li>`
  )).join('');
}

/**
 * @param {ParentNode} root
 * @param {{ open: Function, dialog?: HTMLElement }} dialog
 * @param {typeof TERMS} [terms]
 */
export function bindTermsIndex(root, dialog, terms = TERMS) {
  const page = root.querySelector?.('[data-terms-page]') ?? root;
  const input = page.querySelector('#terms-q');
  const list = page.querySelector('[data-terms-list]');
  const count = page.querySelector('[data-terms-count]');
  const state = { query: input?.value ?? '', chapter: 'all' };

  function paint() {
    const shown = filterTerms(terms, state);
    if (list) list.innerHTML = renderTermItems(shown);
    if (count) count.textContent = `${shown.length} ${shown.length === 1 ? 'term' : 'terms'}`;
    for (const button of page.querySelectorAll('[data-terms-chapter]')) {
      const value = button.getAttribute('data-terms-chapter');
      button.setAttribute('aria-pressed', value === String(state.chapter) ? 'true' : 'false');
    }
  }

  input?.addEventListener('input', () => {
    state.query = input.value;
    paint();
  });
  page.addEventListener('click', (event) => {
    const chapterButton = event.target.closest?.('[data-terms-chapter]');
    if (chapterButton && page.contains(chapterButton)) {
      state.chapter = chapterButton.getAttribute('data-terms-chapter') || 'all';
      paint();
      return;
    }
    if (event.target.closest?.('[data-terms-export]')) {
      event.preventDefault();
      triggerFlashcardDownload(root.ownerDocument ?? document);
    }
  });
  bindTermLinks(page, dialog);
  return { paint, state };
}

/**
 * @param {string} hash
 * @returns {string | null} term id, or null when the hash is not a term card
 */
export function termIdFromHash(hash) {
  const parts = hashParts(hash);
  if (!parts || parts[0].toLowerCase() !== 'terms') return null;
  if (!parts[1] || parts[1].toLowerCase() === 'recall') return null;
  return decodeURIComponent(parts[1]);
}

export function hashParts(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  if (!raw) return null;
  return raw.split('/');
}
