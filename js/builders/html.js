/** Small HTML helpers. Builders do not share the lab's copy. */

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';

export function subDigits(value) {
  return String(value).replace(/\d/g, (digit) => SUB[digit]);
}

export function supDigits(value) {
  return String(value).replace(/\d/g, (digit) => SUP[digit]);
}

/** Plain formula text with Unicode subscripts, safe to drop into a sentence. */
export function formulaText(formula) {
  return subDigits(formula);
}

export function formulaHtml(formula) {
  return escapeHtml(formula).replace(/(\d+)/g, '<sub>$1</sub>');
}

function readDigits(text, index) {
  let end = index;
  while (end < text.length && text[end] >= '0' && text[end] <= '9') end += 1;
  return text.slice(index, end);
}

/** One uppercase letter, plus a lowercase letter when the symbol has two. */
function readElement(text, index) {
  if (!/[A-Z]/.test(text[index] ?? '')) return '';
  if (/[a-z]/.test(text[index + 1] ?? '')) return text.slice(index, index + 2);
  return text[index];
}

/** Yields arrows display as →. <=> and ⇌ stay the equilibrium arrow. */
function readSeparator(text, index) {
  if (text.startsWith('<=>', index)) return { length: 3, display: '⇌' };
  if (text.startsWith('->', index)) return { length: 2, display: '→' };
  const ch = text[index];
  if (ch === '=') return { length: 1, display: '→' };
  if (ch === '→' || ch === '⇌' || ch === '+') return { length: 1, display: ch };
  return null;
}

function isHydrateDot(ch) {
  return ch === '·' || ch === '*' || ch === '.';
}

/**
 * Digits at the start of a term are a coefficient. A term starts at the
 * beginning, after whitespace, after + → -> ⇌ <=> =, or after a hydrate dot.
 * Only digits that follow an element symbol or ) are subscripts.
 */
function renderEquation(equation, plain, sub) {
  const text = String(equation);
  let index = 0;
  let atTermStart = true;
  let out = '';
  while (index < text.length) {
    const sep = readSeparator(text, index);
    if (sep) {
      out += plain(sep.display);
      index += sep.length;
      atTermStart = true;
      continue;
    }
    const ch = text[index];
    if (/\s/.test(ch) || isHydrateDot(ch)) {
      out += plain(ch);
      index += 1;
      atTermStart = true;
      continue;
    }
    if (atTermStart && ch >= '0' && ch <= '9') {
      const digits = readDigits(text, index);
      out += plain(digits);
      index += digits.length;
      atTermStart = false;
      continue;
    }
    const element = readElement(text, index);
    if (element) {
      out += plain(element);
      index += element.length;
      atTermStart = false;
      const count = readDigits(text, index);
      if (count) {
        out += sub(count);
        index += count.length;
      }
      continue;
    }
    out += plain(ch);
    index += 1;
    atTermStart = false;
    if (ch === ')') {
      const count = readDigits(text, index);
      if (count) {
        out += sub(count);
        index += count.length;
      }
    }
  }
  return out;
}

function unicodeSub(digits) {
  return [...digits].map((digit) => SUB[digit]).join('');
}

/**
 * Equation text with full-size coefficients and subscripted formula digits.
 * `2H2 + O2 -> 2H2O` becomes `2H₂ + O₂ → 2H₂O`.
 * `10H2O` becomes `10H₂O`. `=` yields; `<=>` is equilibrium.
 */
export function equationText(equation) {
  return renderEquation(equation, (value) => value, unicodeSub);
}

/** Same split as equationText, with formula digits in `<sub>` tags. */
export function equationHtml(equation) {
  return renderEquation(
    equation,
    (value) => escapeHtml(value),
    (digits) => `<sub>${escapeHtml(digits)}</sub>`,
  );
}
