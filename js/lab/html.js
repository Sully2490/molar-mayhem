/** Small HTML helpers shared by the lab tools. */

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

/** 1.23×10^14, using superscripts so the text stays readable. */
export function sci(value, digits = 2) {
  if (!Number.isFinite(value) || value === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = (value / 10 ** exp).toFixed(digits);
  const power = [...String(exp)].map((char) => (char === '-' ? '⁻' : SUP[char])).join('');
  return `${mantissa}×10${power}`;
}

export function formulaHtml(formula) {
  return escapeHtml(formula).replace(/(\d+)/g, '<sub>$1</sub>');
}
