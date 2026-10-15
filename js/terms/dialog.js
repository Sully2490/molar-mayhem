import { termById } from './catalog.js';
import { visualSvg } from './art.js';
import { escapeHtml } from './html.js';

/**
 * Page regions the tray dialog names. The term card uses the sibling walk in
 * js/glossary.js `setBehindInert` instead, so later page regions stay blocked too.
 */
export const INERT_PAGE_SELECTOR = 'header, main, footer, .skip';

const FOCUSABLE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea']);

/**
 * Accessible term card. Opens from a term link, traps Tab, closes on Escape,
 * and restores focus. Background regions match the tray dialog in js/app.js.
 * @param {Document} [doc]
 * @param {{ terms?: import('../../content/terms/index.js').TERMS, lookup?: typeof termById }} [options]
 */
export function createTermDialog(doc = document, options = {}) {
  const lookup = options.lookup ?? ((id) => termById(id, options.terms));
  const shell = doc.createElement('div');
  shell.className = 'term-shell';
  const backdrop = doc.createElement('div');
  backdrop.className = 'term-backdrop';
  backdrop.hidden = true;
  const dialog = doc.createElement('div');
  dialog.className = 'term-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'term-dialog-title');
  dialog.setAttribute('aria-describedby', 'term-dialog-def');
  dialog.tabIndex = -1;
  dialog.hidden = true;
  shell.append(backdrop, dialog);
  doc.body.append(shell);

  let lastFocus = null;

  // Same walk as setBehindInert in js/glossary.js. The shell stays active so
  // the backdrop can still be clicked. Uses `doc` so tests do not need a global document.
  function setPageBehindInert(on) {
    let node = shell;
    while (node && node.parentElement) {
      for (const sib of node.parentElement.children) {
        if (sib !== node) sib.inert = on;
      }
      node = node.parentElement;
      if (node === doc.body) break;
    }
  }

  function open(id, trigger) {
    const term = typeof id === 'string' ? lookup(id) : id;
    if (!term) return false;
    if (dialog.hidden) lastFocus = trigger ?? doc.activeElement;
    else if (trigger && trigger !== dialog && !dialog.contains(trigger)) lastFocus = trigger;
    dialog.innerHTML = renderTermCard(term, lookup);
    backdrop.hidden = false;
    dialog.hidden = false;
    doc.body.classList.add('term-open');
    setPageBehindInert(true);
    dialog.focus();
    return true;
  }

  function close() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    backdrop.hidden = true;
    doc.body.classList.remove('term-open');
    setPageBehindInert(false);
    const back = lastFocus;
    lastFocus = null;
    if (back && typeof back.focus === 'function') back.focus();
  }

  function onKey(event) {
    if (dialog.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusableElements(dialog);
    if (items.length === 0) {
      event.preventDefault();
      event.stopPropagation();
      dialog.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = doc.activeElement;
    if (event.shiftKey) {
      if (active === first || active === dialog || !dialog.contains(active)) {
        event.preventDefault();
        event.stopPropagation();
        last.focus();
      }
      return;
    }
    if (active === last) {
      event.preventDefault();
      event.stopPropagation();
      first.focus();
    }
  }

  doc.addEventListener('keydown', onKey, true);
  const view = doc.defaultView;
  if (view && typeof view.addEventListener === 'function') {
    view.addEventListener('hashchange', () => close());
  }
  backdrop.addEventListener('click', close);
  dialog.addEventListener('click', (event) => {
    const closer = event.target.closest?.('[data-term-close]');
    if (closer) {
      event.preventDefault();
      close();
      return;
    }
    const link = event.target.closest?.('[data-term]');
    if (!link || !dialog.contains(link)) return;
    event.preventDefault();
    open(link.getAttribute('data-term'), lastFocus);
  });

  return {
    open,
    close,
    dialog,
    backdrop,
    isOpen: () => !dialog.hidden,
    destroy() {
      doc.removeEventListener('keydown', onKey, true);
      close();
      shell.remove();
    },
  };
}

/**
 * Delegate clicks on term links inside root to the dialog.
 * @param {ParentNode} root
 * @param {ReturnType<typeof createTermDialog>} dialog
 */
export function bindTermLinks(root, dialog) {
  root.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[data-term], button[data-term]');
    if (!link || !root.contains(link)) return;
    if (dialog.dialog?.contains(link)) return;
    event.preventDefault();
    dialog.open(link.getAttribute('data-term'), link);
  });
}

/**
 * @param {HTMLElement} root
 */
export function focusableElements(root) {
  const out = [];
  const walk = (el) => {
    for (const child of el.children ?? []) {
      if (child.hidden) continue;
      if (isFocusable(child)) out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

function isFocusable(el) {
  if (!el || el.disabled) return false;
  const tab = el.getAttribute?.('tabindex');
  if (tab === '-1') return false;
  const tag = String(el.tagName || '').toLowerCase();
  if (tag === 'a') return el.hasAttribute?.('href') || Boolean(el.getAttribute?.('href'));
  if (FOCUSABLE_TAGS.has(tag)) return true;
  return tab != null && tab !== '-1';
}

/**
 * Inner HTML for one term card.
 * @param {object} term
 * @param {typeof termById} [lookup]
 */
export function renderTermCard(term, lookup = termById) {
  const svg = term.visual ? visualSvg(term.visual) : '';
  const related = (term.related ?? [])
    .map((id) => {
      const other = lookup(id);
      if (!other) return '';
      return `<li><a class="term-link" href="#Terms/${encodeURIComponent(other.id)}" data-term="${escapeHtml(other.id)}">${escapeHtml(other.term)}</a></li>`;
    })
    .filter(Boolean)
    .join('');
  const relatedBlock = related
    ? `<h3>Related</h3><ul class="term-related">${related}</ul>`
    : '';
  return `
    <div class="term-card">
      <div class="term-card-bar">
        <h2 id="term-dialog-title">${escapeHtml(term.term)}</h2>
        <button type="button" class="term-close" data-term-close>Close</button>
      </div>
      <p class="term-meta">Chapter ${escapeHtml(term.chapter)} · <a href="#Learn/${encodeURIComponent(term.lesson)}">Open the lesson</a></p>
      ${svg}
      <p id="term-dialog-def">${escapeHtml(term.definition)}</p>
      <h3>Example</h3>
      <p>${escapeHtml(term.example)}</p>
      <h3>Where you meet it</h3>
      <p>${escapeHtml(term.use)}</p>
      ${relatedBlock}
      <p class="term-hint">Escape closes this card and returns you to the page.</p>
    </div>
  `;
}
