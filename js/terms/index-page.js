import { TERMS } from '../../content/terms/index.js';
import { escapeHtml } from './html.js';
import { triggerFlashcardDownload } from './cards.js';
import { bindTermLinks } from './dialog.js';

/** Short chapter names already used on the study map. */
export const CHAPTER_TITLES = {
  1: 'Essential ideas',
  2: 'Atoms and molecules',
  3: 'Electrons',
  4: 'Bonding',
  5: 'Advanced bonding',
  6: 'Moles',
  7: 'Reactions',
  8: 'Gases',
  9: 'Thermochemistry',
};

const CHAPTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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

/** First letter used by the A–Z jump. Non-letters share "#". */
export function letterOf(entry) {
  const ch = String(entry?.term ?? '').trim().charAt(0).toUpperCase();
  return ch >= 'A' && ch <= 'Z' ? ch : '#';
}

/** One sentence, capped, for the face of a glossary card. */
export function cardBlurb(text) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 140) return clean;
  const cut = clean.slice(0, 140);
  const space = cut.lastIndexOf(' ');
  const base = space > 80 ? cut.slice(0, space) : cut;
  return `${base.trim()}…`;
}

/**
 * Chapter sections, each split into letter blocks, terms A to Z inside a letter.
 * @param {typeof TERMS} terms
 */
export function groupTerms(terms) {
  /** @type {Map<number, Map<string, object[]>>} */
  const byChapter = new Map();
  for (const entry of terms) {
    const chapter = Number(entry.chapter);
    if (!byChapter.has(chapter)) byChapter.set(chapter, new Map());
    const letters = byChapter.get(chapter);
    const letter = letterOf(entry);
    if (!letters.has(letter)) letters.set(letter, []);
    letters.get(letter).push(entry);
  }
  return [...byChapter.keys()].sort((a, b) => a - b).map((chapter) => {
    const letters = byChapter.get(chapter);
    const blocks = [...letters.keys()].sort().map((letter) => ({
      letter,
      terms: letters.get(letter).slice().sort((left, right) => (
        left.term.localeCompare(right.term, 'en') || left.id.localeCompare(right.id)
      )),
    }));
    return {
      chapter,
      title: CHAPTER_TITLES[chapter] ?? `Chapter ${chapter}`,
      blocks,
    };
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
  const available = new Set(shown.map(letterOf));
  return `
    <section class="terms-page" data-terms-page>
      <header class="terms-head">
        <p class="kicker">Chapters 1–9</p>
        <h1>Terms</h1>
        <div class="terms-tools-slot" data-mm-tools-mount></div>
        <p class="terms-lead">Plain-language words for OpenStax Chemistry: Atoms First 2e, chapters 1–9. Choose a chapter or jump to a letter. Tap a card to open the word.</p>
      </header>
      <form class="terms-search" role="search" data-terms-search>
        <label for="terms-q">Search terms</label>
        <input id="terms-q" name="q" type="search" autocomplete="off" value="${escapeHtml(filter.query ?? '')}" placeholder="Try mole, pressure, or bond">
      </form>
      <div class="terms-chapters" role="group" aria-label="Filter by chapter" data-terms-chapters>
        ${renderChapterChips(active)}
      </div>
      <nav class="terms-az" aria-label="Jump to a letter" data-terms-az>
        ${renderLetterButtons(available)}
      </nav>
      <p class="terms-count" data-terms-count aria-live="polite">${countLabel(shown.length)}</p>
      <div class="terms-groups" data-terms-list>
        ${renderTermGroups(shown)}
      </div>
      <p class="terms-actions">
        <a href="#Terms/recall">Quick recall</a>
        <button type="button" data-terms-export>Download flashcards</button>
      </p>
    </section>
  `;
}

export function renderChapterChips(active) {
  const allPressed = String(active) === 'all' || active === '' || active == null;
  const all = `<button type="button" data-terms-chapter="all" aria-pressed="${allPressed ? 'true' : 'false'}">All</button>`;
  const rest = CHAPTERS.map((chapter) => {
    const pressed = String(active) === String(chapter);
    const title = CHAPTER_TITLES[chapter];
    return `<button type="button" data-terms-chapter="${chapter}" aria-pressed="${pressed ? 'true' : 'false'}" aria-label="Chapter ${chapter}, ${escapeHtml(title)}"><span class="terms-chip-num">${chapter}</span><span class="terms-chip-name">${escapeHtml(title)}</span></button>`;
  }).join('');
  return all + rest;
}

export function renderLetterButtons(available) {
  return LETTERS.map((letter) => {
    const on = available.has(letter);
    const disabled = on ? '' : ' disabled';
    return `<button type="button" data-terms-letter="${letter}" aria-disabled="${on ? 'false' : 'true'}"${disabled}>${letter}</button>`;
  }).join('');
}

export function renderTermGroups(terms) {
  const groups = groupTerms(terms);
  if (groups.length === 0) return '<p class="terms-empty">No terms match that search.</p>';
  return groups.map((group) => `
    <section class="terms-chapter" data-terms-group="${group.chapter}" id="terms-chapter-${group.chapter}">
      <h2>Chapter ${group.chapter} <span>${escapeHtml(group.title)}</span></h2>
      ${group.blocks.map((block) => `
        <div class="terms-letter-block" data-terms-anchor="${escapeHtml(block.letter)}" id="terms-c${group.chapter}-${escapeHtml(block.letter)}">
          <h3 tabindex="-1">${escapeHtml(block.letter)}</h3>
          <div class="terms-grid">
            ${block.terms.map(renderTermCardTile).join('')}
          </div>
        </div>
      `).join('')}
    </section>
  `).join('');
}

export function renderTermCardTile(entry) {
  const letter = letterOf(entry);
  return `<a class="term-tile" href="#Terms/${encodeURIComponent(entry.id)}" data-term="${escapeHtml(entry.id)}" data-letter="${escapeHtml(letter)}"><span class="term-tile-name">${escapeHtml(entry.term)}</span><span class="term-tile-def">${escapeHtml(cardBlurb(entry.definition))}</span></a>`;
}

/** Card markup for a flat set of terms. The index groups these by chapter. */
export function renderTermItems(terms) {
  if (terms.length === 0) return '<p class="terms-empty">No terms match that search.</p>';
  return `<div class="terms-grid">${terms.map(renderTermCardTile).join('')}</div>`;
}

function countLabel(count) {
  return `${count} ${count === 1 ? 'term' : 'terms'}`;
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
  const pressedChapter = page.querySelector('[data-terms-chapter][aria-pressed="true"]');
  const state = {
    query: input?.value ?? '',
    chapter: pressedChapter?.getAttribute('data-terms-chapter') || 'all',
  };

  function paint() {
    const shown = filterTerms(terms, state);
    if (list) list.innerHTML = renderTermGroups(shown);
    if (count) count.textContent = countLabel(shown.length);
    const available = new Set(shown.map(letterOf));
    for (const button of page.querySelectorAll('[data-terms-chapter]')) {
      const value = button.getAttribute('data-terms-chapter');
      button.setAttribute('aria-pressed', value === String(state.chapter) ? 'true' : 'false');
    }
    for (const button of page.querySelectorAll('[data-terms-letter]')) {
      const letter = button.getAttribute('data-terms-letter');
      const on = available.has(letter);
      button.disabled = !on;
      button.setAttribute('aria-disabled', on ? 'false' : 'true');
      button.removeAttribute('aria-current');
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
    const letterButton = event.target.closest?.('[data-terms-letter]');
    if (letterButton && page.contains(letterButton)) {
      if (letterButton.disabled) return;
      jumpToLetter(page, letterButton.getAttribute('data-terms-letter') || '');
      return;
    }
    if (event.target.closest?.('[data-terms-export]')) {
      event.preventDefault();
      triggerFlashcardDownload(root.ownerDocument ?? document);
    }
  });
  bindTermLinks(page, dialog);
  return { paint, state, jumpToLetter: (letter) => jumpToLetter(page, letter) };
}

/**
 * Scroll the first visible letter block into view. Hash links are not used;
 * the router owns the URL hash.
 * @param {ParentNode} page
 * @param {string} letter
 */
export function jumpToLetter(page, letter) {
  if (!/^[A-Z]$/.test(letter)) return null;
  const target = page.querySelector?.(`[data-terms-anchor="${letter}"]`);
  if (!target) return null;
  const view = page.ownerDocument?.defaultView;
  const reduce = view?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const heading = target.querySelector?.('h3');
  if (typeof heading?.focus === 'function') {
    try {
      heading.focus({ preventScroll: true });
    } catch {
      heading.focus();
    }
  }
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }
  for (const button of page.querySelectorAll?.('[data-terms-letter]') ?? []) {
    if (button.getAttribute('data-terms-letter') === letter) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
  return target;
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
