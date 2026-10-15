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
