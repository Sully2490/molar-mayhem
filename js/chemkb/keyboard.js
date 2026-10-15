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

const keyboards = new WeakMap();

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

/**
 * Attach a chemistry key row to an answer field.
 * Keys are buttons, so they do not submit the form. pointerdown keeps the
 * phone keyboard and the caret in place, including on the iPhone decimal pad,
 * which has no minus key and no scientific notation.
 * @param {HTMLInputElement | HTMLTextAreaElement} input
 */
export function attachChemKeyboard(input) {
  if (!input) throw new Error('attachChemKeyboard needs an input');
  if (keyboards.has(input)) return keyboards.get(input);
  const doc = input.ownerDocument ?? globalThis.document;
  if (!doc?.createElement) throw new Error('attachChemKeyboard needs an input with a document');

  const bar = doc.createElement('div');
  bar.className = 'chem-kb';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Chemistry keyboard');
  if (!input.id) input.id = `chem-kb-input-${Math.random().toString(36).slice(2, 8)}`;
  bar.setAttribute('aria-controls', input.id);

  const saved = { start: null, end: null };
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

  for (const key of CHEM_KEYS) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.setAttribute('type', 'button');
    button.className = 'chem-kb-key';
    button.textContent = key.label;
    button.setAttribute('aria-label', key.ariaLabel);
    const holdCaret = (event) => {
      event.preventDefault?.();
      remember();
    };
    button.addEventListener('pointerdown', holdCaret);
    button.addEventListener('mousedown', holdCaret);
    button.addEventListener('touchstart', holdCaret, { passive: false });
    button.addEventListener('click', () => {
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

  const row = typeof input.closest === 'function' ? input.closest('.answer-row') : null;
  const anchor = row || input;
  if (typeof anchor.insertAdjacentElement === 'function') anchor.insertAdjacentElement('afterend', bar);
  else anchor.parentNode?.insertBefore?.(bar, anchor.nextSibling);

  const api = {
    element: bar,
    destroy() {
      bar.remove?.();
      keyboards.delete(input);
    },
  };
  keyboards.set(input, api);
  return api;
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
