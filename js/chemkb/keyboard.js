const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

/** Symbols the answer keys insert. Labels are spoken names for each button. */
export const CHEM_KEYS = [
  { insert: '×10^', label: '×10^', ariaLabel: 'times ten to the' },
  { insert: '−', label: '−', ariaLabel: 'minus' },
  ...[...SUPERSCRIPT_DIGITS].map((insert, digit) => ({
    insert,
    label: insert,
    ariaLabel: `superscript ${digit}`,
  })),
  { insert: '⁻', label: '⁻', ariaLabel: 'superscript minus' },
  { insert: '⁺', label: '⁺', ariaLabel: 'superscript plus' },
  ...[...SUBSCRIPT_DIGITS].map((insert, digit) => ({
    insert,
    label: insert,
    ariaLabel: `subscript ${digit}`,
  })),
  { insert: '→', label: '→', ariaLabel: 'reaction arrow' },
  { insert: '⇌', label: '⇌', ariaLabel: 'equilibrium arrow' },
  { insert: 'Δ', label: 'Δ', ariaLabel: 'delta' },
  { insert: '°', label: '°', ariaLabel: 'degree' },
  { insert: '(', label: '(', ariaLabel: 'open parenthesis' },
  { insert: ')', label: ')', ariaLabel: 'close parenthesis' },
];

const pages = new WeakMap();
const attached = new WeakSet();

function caretFor(input) {
  let saved = attachedCarets.get(input);
  if (saved) return saved;
  saved = { start: null, end: null };
  const remember = () => {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (Number.isFinite(start) && Number.isFinite(end)) {
      saved.start = start;
      saved.end = end;
    }
  };
  input.addEventListener('keyup', remember);
  input.addEventListener('mouseup', remember);
  input.addEventListener('touchend', remember);
  input.addEventListener('select', remember);
  input.addEventListener('input', remember);
  input.addEventListener('focus', () => {
    const page = pages.get(input.ownerDocument);
    if (!page) return;
    page.target = input;
    if (input.id) page.element.setAttribute('aria-controls', input.id);
    remember();
  });
  attachedCarets.set(input, saved);
  return saved;
}

const attachedCarets = new WeakMap();

function isChoice(input) {
  const type = String(input?.type || '').toLowerCase();
  return type === 'radio' || type === 'checkbox' || type === 'button' || type === 'hidden';
}

function pageFor(doc) {
  let page = pages.get(doc);
  if (page) return page;
  const bar = doc.createElement('div');
  bar.className = 'chem-kb';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Chemistry keyboard');
  page = { element: bar, target: null, users: 0 };
  pages.set(doc, page);
  for (const key of CHEM_KEYS) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.setAttribute('type', 'button');
    button.className = 'chem-kb-key';
    button.textContent = key.label;
    button.setAttribute('aria-label', key.ariaLabel);
    const holdCaret = (event) => {
      event.preventDefault?.();
      const input = page.target;
      if (!input) return;
      const saved = caretFor(input);
      const start = input.selectionStart;
      const end = input.selectionEnd;
      if (Number.isFinite(start) && Number.isFinite(end)) {
        saved.start = start;
        saved.end = end;
      }
    };
    button.addEventListener('pointerdown', holdCaret);
    button.addEventListener('mousedown', holdCaret);
    button.addEventListener('touchstart', holdCaret, { passive: false });
    button.addEventListener('click', () => {
      const input = page.target;
      if (!input) return;
      const saved = caretFor(input);
      const start = Number.isFinite(saved.start) ? saved.start : input.selectionStart;
      const end = Number.isFinite(saved.end) ? saved.end : input.selectionEnd;
      const next = insertText(input.value, start, end, key.insert);
      input.value = next.value;
      saved.start = next.cursor;
      saved.end = next.cursor;
      try {
        input.setSelectionRange?.(next.cursor, next.cursor);
      } catch {
        // Some keypad input types reject a selection range. The value is still inserted.
      }
      input.focus?.();
      emitInput(input);
    });
    bar.append(button);
  }
  if (typeof doc.body?.append === 'function') doc.body.append(bar);
  else doc.body?.appendChild?.(bar);
  return page;
}

export function setKeyboardTarget(input) {
  if (!input || isChoice(input)) return;
  const doc = input.ownerDocument ?? globalThis.document;
  if (!doc) return;
  const page = pages.get(doc);
  if (!page) return;
  page.target = input;
  if (input.id) page.element.setAttribute('aria-controls', input.id);
}

/**
 * One chemistry keypad for the page. It types into the focused answer field.
 * @param {HTMLInputElement | HTMLTextAreaElement} input
 */
export function attachChemKeyboard(input) {
  if (!input) throw new Error('attachChemKeyboard needs an input');
  if (isChoice(input)) return { element: null, destroy() {} };
  const doc = input.ownerDocument ?? globalThis.document;
  if (!doc?.createElement) throw new Error('attachChemKeyboard needs an input with a document');
  const page = pageFor(doc);
  if (!input.id) input.id = `chem-kb-input-${Math.random().toString(36).slice(2, 8)}`;
  if (!page.target) {
    page.target = input;
    page.element.setAttribute('aria-controls', input.id);
  }
  if (attached.has(input)) {
    return { element: page.element, destroy() {} };
  }
  attached.add(input);
  caretFor(input);
  page.users += 1;
  const api = {
    element: page.element,
    destroy() {
      if (!attached.has(input)) return;
      attached.delete(input);
      page.users -= 1;
      if (page.target === input) page.target = null;
      if (page.users <= 0) {
        page.element.remove?.();
        pages.delete(doc);
      }
    },
  };
  return api;
}

/** Attach the shared keypad to answer and value fields inside root. Unit boxes are left alone. */
export function bindSharedKeypad(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const inputs = [...root.querySelectorAll('input[name="answer"], input[name="value"]')].filter((input) => !isChoice(input));
  for (const input of inputs) attachChemKeyboard(input);
  const focused = inputs.find((input) => input.ownerDocument?.activeElement === input);
  if (focused) setKeyboardTarget(focused);
  else if (inputs.length === 1) setKeyboardTarget(inputs[0]);
}

/**
 * Insert text at a caret, or replace the selected range.
 * @param {string} value
 * @param {number} start
 * @param {number} end
 * @param {string} text
 * @returns {{ value: string, cursor: number }}
 */
export function insertText(value, start, end, text) {
  const source = String(value ?? '');
  const from = clamp(start, 0, source.length);
  const to = clamp(end, from, source.length);
  const next = `${source.slice(0, from)}${text}${source.slice(to)}`;
  return { value: next, cursor: from + text.length };
}

function emitInput(input) {
  const ViewEvent = input.ownerDocument?.defaultView?.Event ?? globalThis.Event;
  if (typeof input.dispatchEvent !== 'function' || typeof ViewEvent !== 'function') return;
  input.dispatchEvent(new ViewEvent('input', { bubbles: true }));
}

function clamp(value, min, max) {
  if (value == null || value === '') return max;
  const number = Number(value);
  if (!Number.isFinite(number)) return max;
  return Math.min(max, Math.max(min, number));
}
