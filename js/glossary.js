export const TERMS = [
  { id: 'element', term: 'Element', text: 'A substance made of one kind of atom. Gold is an element.' },
  { id: 'compound', term: 'Compound', text: 'Two or more elements joined in a fixed ratio. Water is a compound.' },
  { id: 'atom', term: 'Atom', text: 'The smallest piece of an element that still acts like that element.' },
  { id: 'ion', term: 'Ion', text: 'An atom or group with a charge, after it gains or loses electrons.' },
  { id: 'mole', term: 'Mole', text: 'A counting unit. One mole is 6.022 × 10²³ particles.' },
  { id: 'isotope', term: 'Isotope', text: 'Atoms of one element that differ in the number of neutrons.' },
];

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderGlossary() {
  const buttons = TERMS.map((item) => (
    `<button type="button" class="term-btn" data-term="${item.id}">${escapeHtml(item.term)}</button>`
  )).join('');
  return `
    <section class="glossary">
      <h2>Glossary</h2>
      <p>Tap a word to read a short definition.</p>
      <div class="term-row">${buttons}</div>
      <div class="term-popup" data-glossary-dialog role="dialog" aria-modal="true" aria-labelledby="glossary-title" hidden>
        <h3 id="glossary-title"></h3>
        <p data-glossary-body></p>
        <button type="button" data-glossary-close>Close</button>
      </div>
    </section>
  `;
}

const bound = new WeakSet();

export function bindGlossary(root) {
  if (bound.has(root)) return;
  bound.add(root);
  let opener = null;
  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', () => {
      for (const el of document.querySelectorAll('[inert]')) el.inert = false;
    });
  }
  root.addEventListener('click', (event) => {
    const dialog = root.querySelector('[data-glossary-dialog]');
    if (!dialog) return;
    const termButton = event.target.closest?.('[data-term]');
    if (termButton && root.contains(termButton)) {
      const item = TERMS.find((term) => term.id === termButton.getAttribute('data-term'));
      if (!item) return;
      opener = termButton;
      dialog.querySelector('#glossary-title').textContent = item.term;
      dialog.querySelector('[data-glossary-body]').textContent = item.text;
      dialog.hidden = false;
      setBehindInert(dialog, true);
      dialog.querySelector('[data-glossary-close]')?.focus();
      return;
    }
    if (event.target.closest?.('[data-glossary-close]')) closeDialog(root, opener);
  });
  root.addEventListener('keydown', (event) => {
    const dialog = root.querySelector('[data-glossary-dialog]');
    if (!dialog || dialog.hidden || event.key !== 'Escape') return;
    event.stopPropagation();
    closeDialog(root, opener);
  });
}

function closeDialog(root, opener) {
  const dialog = root.querySelector('[data-glossary-dialog]');
  if (!dialog) return;
  dialog.hidden = true;
  setBehindInert(dialog, false);
  if (opener instanceof HTMLElement) opener.focus();
}

// Keep Tab inside the open dialog: make everything else on the page inert.
function setBehindInert(dialog, on) {
  if (typeof document === 'undefined') return;
  let node = dialog;
  while (node && node.parentElement) {
    for (const sib of node.parentElement.children) {
      if (sib !== node) sib.inert = on;
    }
    node = node.parentElement;
    if (node === document.body) break;
  }
}
