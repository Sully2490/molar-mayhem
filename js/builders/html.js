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

/** A term starts at the beginning, or after +, →, ->, ⇌, or =. */
function equationParts(equation) {
  return String(equation).split(/(\s*(?:->|→|⇌|\+|=)\s*)/g);
}

/** A leading integer is the coefficient. Digits after that belong to the formula. */
function splitCoefficient(term) {
  const match = /^(\d+)(\s+)([\s\S]+)$/.exec(term);
  if (!match) return { coefficient: '', space: '', formula: term };
  return { coefficient: match[1], space: match[2], formula: match[3] };
}

function joinEquation(equation, formatFormula, formatPlain) {
  return equationParts(equation).map((part, index) => {
    if (index % 2 === 1) return formatPlain(part);
    const { coefficient, space, formula } = splitCoefficient(part);
    const lead = coefficient ? `${formatPlain(coefficient)}${formatPlain(space)}` : '';
    return `${lead}${formatFormula(formula)}`;
  }).join('');
}

/**
 * Equation text with full-size coefficients and subscripted formula digits.
 * `2 H2 + O2 -> 2 H2O` becomes `2 H₂ + O₂ -> 2 H₂O`.
 */
export function equationText(equation) {
  return joinEquation(equation, formulaText, (value) => value);
}

/** Same split as equationText, with formula digits in `<sub>` tags. */
export function equationHtml(equation) {
  return joinEquation(equation, formulaHtml, escapeHtml);
}
