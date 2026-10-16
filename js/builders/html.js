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

const EQUATION_GAP = / \+ | → /g;

function equationPieces(equation) {
  const source = String(equation);
  const pieces = [];
  let last = 0;
  for (const match of source.matchAll(EQUATION_GAP)) {
    pieces.push({ term: source.slice(last, match.index), gap: match[0] });
    last = match.index + match[0].length;
  }
  pieces.push({ term: source.slice(last), gap: '' });
  return pieces;
}

/** A leading integer is the coefficient. Digits after that belong to the formula. */
function splitCoefficient(term) {
  const match = /^(\d+) ([\s\S]+)$/.exec(term);
  if (!match) return { coefficient: '', formula: term };
  return { coefficient: match[1], formula: match[2] };
}

/**
 * Equation text with full-size coefficients and subscripted formula digits.
 * `2 H2 + O2 → 2 H2O` becomes `2 H₂ + O₂ → 2 H₂O`.
 */
export function equationText(equation) {
  return equationPieces(equation).map(({ term, gap }) => {
    const { coefficient, formula } = splitCoefficient(term);
    const lead = coefficient ? `${coefficient} ` : '';
    return `${lead}${formulaText(formula)}${gap}`;
  }).join('');
}

/** Same split as equationText, with formula digits in `<sub>` tags. */
export function equationHtml(equation) {
  return equationPieces(equation).map(({ term, gap }) => {
    const { coefficient, formula } = splitCoefficient(term);
    const lead = coefficient ? `${escapeHtml(coefficient)} ` : '';
    return `${lead}${formulaHtml(formula)}${escapeHtml(gap)}`;
  }).join('');
}
