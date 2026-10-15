const UNIT_ALIASES = new Map([
  ['g', 'g'],
  ['gram', 'g'],
  ['grams', 'g'],
  ['kg', 'kg'],
  ['mg', 'mg'],
  ['mol', 'mol'],
  ['mole', 'mol'],
  ['moles', 'mol'],
  ['m', 'm'],
  ['l', 'L'],
  ['liter', 'L'],
  ['liters', 'L'],
  ['ml', 'mL'],
  ['milliliter', 'mL'],
  ['milliliters', 'mL'],
  ['mol/l', 'M'],
  ['molar', 'M'],
  ['m', 'm'],
  ['kj', 'kJ'],
  ['j', 'J'],
  ['atm', 'atm'],
  ['mmhg', 'torr'],
  ['torr', 'torr'],
  ['pa', 'Pa'],
  ['kpa', 'kPa'],
  ['s', 's'],
  ['sec', 's'],
  ['min', 'min'],
  ['c', '°C'],
  ['°c', '°C'],
  ['celsius', '°C'],
  ['k', 'K'],
  ['kelvin', 'K'],
]);

/** Relative percent used when a numeric check omits tolerance. 0.5 means ±0.5%. */
export const DEFAULT_RELATIVE_PERCENT = 0.5;

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/**
 * Grade a student answer against a check descriptor.
 * Numeric tolerance is a relative percent. Sig-fig mismatches hint instead of failing.
 * Exact checks fold Unicode digits and charges. The default case is formula:
 * element symbols stay capitalized, so Co, CO, and co are different.
 * Use case "insensitive" only for element names and ordinary words.
 * Set checks compare unordered lists and can flag near-miss items.
 * Config checks expand noble-gas cores and compare orbitals, ignoring order.
 * @param {string} input
 * @param {{ kind: 'numeric' | 'exact' | 'set' | 'config', value?: number, tolerance?: number, sigFigs?: number, unit?: string | null, text?: string, case?: 'insensitive' | 'sensitive' | 'formula', answers?: string[], nearMiss?: Array<string | { text: string, hint?: string }> }} check
 */
export function grade(input, check) {
  switch (check?.kind) {
    case 'numeric':
      return gradeNumeric(input, check);
    case 'exact':
      return gradeExact(input, check);
    case 'set':
      return gradeSet(input, check);
    case 'config':
      return gradeConfig(input, check);
    default: {
      const kind = check?.kind;
      throw new Error(`Unknown check kind: ${String(kind)}`);
    }
  }
}

export function gradeNumeric(input, check) {
  const parsed = parseAnswer(input);
  if (!parsed) return { ok: false, reason: 'format' };
  if (check.unit) {
    if (!parsed.unit) return { ok: false, reason: 'unit' };
    if (canonicalUnit(parsed.unit) !== canonicalUnit(check.unit)) return { ok: false, reason: 'unit' };
  } else if (parsed.unit) {
    return { ok: false, reason: 'unit' };
  }
  const percent = check.tolerance ?? DEFAULT_RELATIVE_PERCENT;
  if (!withinRelativePercent(parsed.value, check.value, percent)) {
    return { ok: false, reason: 'tolerance' };
  }
  if (check.sigFigs != null && parsed.sigFigs !== check.sigFigs) {
    return {
      ok: true,
      hint: `The value is right. Check significant figures: this answer uses ${check.sigFigs}.`,
    };
  }
  return { ok: true };
}

export function withinRelativePercent(actual, expected, percent) {
  const limit = Math.abs(expected) * (percent / 100);
  return Math.abs(actual - expected) <= limit + 1e-9;
}

export function gradeExact(input, check) {
  const caseRule = check.case ?? 'formula';
  const actual = normalizeAnswer(input, caseRule);
  if (!actual) return { ok: false, reason: 'format' };
  const accepted = acceptedAnswers(check).map((item) => normalizeAnswer(item, caseRule));
  if (!accepted.includes(actual)) return { ok: false, reason: 'exact' };
  return { ok: true };
}

export function gradeSet(input, check) {
  const caseRule = check.case ?? 'formula';
  if (!collapseWhitespace(input)) return { ok: false, reason: 'format' };
  const items = splitSetItems(input);
  if (items.length === 0) return { ok: false, reason: 'format' };
  const student = new Set(items.map((item) => normalizeAnswer(item, caseRule)));
  const expectedList = acceptedAnswers(check).map((item) => normalizeAnswer(item, caseRule));
  const expected = new Set(expectedList);
  const nearHits = nearMissEntries(check).filter((entry) => student.has(normalizeAnswer(entry.text, caseRule)));
  if (nearHits.length > 0) {
    const hinted = nearHits.find((entry) => entry.hint);
    const hint = hinted?.hint || `${nearHits[0].text} is close, but it does not belong on this list.`;
    return { ok: false, reason: 'nearMiss', hint };
  }
  const allPresent = [...expected].every((item) => student.has(item));
  const noExtras = [...student].every((item) => expected.has(item));
  if (expected.size > 0 && allPresent && noExtras) return { ok: true };
  const some = [...student].some((item) => expected.has(item));
  if (some) {
    return { ok: false, reason: 'partial', hint: 'Some of those belong. Check the list and try again.' };
  }
  return { ok: false, reason: 'set', hint: 'None of those match this list.' };
}

export function normalizeSymbols(text) {
  return String(text ?? '')
    .replaceAll('−', '-')
    .replaceAll('⁺', '+')
    .replaceAll('⁻', '-')
    .replace(/[₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => {
      const sub = SUBSCRIPTS.indexOf(ch);
      if (sub !== -1) return String(sub);
      const sup = SUPERSCRIPTS.indexOf(ch);
      if (sup !== -1) return String(sup);
      return ch;
    });
}

export function collapseWhitespace(text) {
  return String(text ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeAnswer(text, caseRule) {
  const collapsed = collapseWhitespace(normalizeSymbols(text));
  switch (caseRule) {
    case 'insensitive':
      return collapsed.toLowerCase();
    case 'sensitive':
      return collapsed;
    case 'formula':
      return canonicalizeFormula(collapsed);
    default:
      throw new Error(`Unknown case rule: ${String(caseRule)}`);
  }
}

const NOBLE_GAS_CORES = [
  ['[rn]', '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6'],
  ['[xe]', '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6'],
  ['[kr]', '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6'],
  ['[ar]', '1s2 2s2 2p6 3s2 3p6'],
  ['[ne]', '1s2 2s2 2p6'],
  ['[he]', '1s2'],
];

/**
 * Parse an electron configuration into orbital → electron count.
 * Noble-gas shorthand is expanded. Spacing, commas, and superscripts are ignored.
 * Orbital order does not matter.
 * @param {string} raw
 * @returns {Map<string, number> | null}
 */
export function parseConfig(raw) {
  let text = normalizeSymbols(raw).toLowerCase().replace(/[\s,]+/g, '');
  if (!text) return null;
  for (const [token, expansion] of NOBLE_GAS_CORES) {
    text = text.replaceAll(token, expansion.replace(/\s+/g, ''));
  }
  return readOrbitals(text);
}

const SUBSHELL_MAX = { s: 2, p: 6, d: 10, f: 14 };

function readOrbitals(text) {
  const orbitals = new Map();
  let index = 0;
  while (index < text.length) {
    const shell = text[index];
    const subshell = text[index + 1];
    if (!/[1-9]/.test(shell) || !SUBSHELL_MAX[subshell]) return null;
    index += 2;
    const limit = SUBSHELL_MAX[subshell];
    const two = text.slice(index, index + 2);
    const one = text.slice(index, index + 1);
    let count = 0;
    if (/^\d{2}$/.test(two) && Number(two) >= 1 && Number(two) <= limit) {
      count = Number(two);
      index += 2;
    } else if (/^\d$/.test(one) && Number(one) >= 1 && Number(one) <= limit) {
      count = Number(one);
      index += 1;
    } else {
      return null;
    }
    const key = `${shell}${subshell}`;
    if (orbitals.has(key)) return null;
    orbitals.set(key, count);
  }
  return orbitals.size === 0 ? null : orbitals;
}

function sameOrbitals(left, right) {
  if (left.size !== right.size) return false;
  for (const [key, count] of left) {
    if (right.get(key) !== count) return false;
  }
  return true;
}

export function gradeConfig(input, check) {
  const actual = parseConfig(input);
  if (!actual) return { ok: false, reason: 'format' };
  const accepted = acceptedAnswers(check).map((item) => parseConfig(item)).filter(Boolean);
  if (accepted.some((parsed) => sameOrbitals(parsed, actual))) return { ok: true };
  return {
    ok: false,
    reason: 'config',
    hint: 'Check each orbital. A noble-gas core stands for the orbitals inside it, and order does not matter.',
  };
}

function canonicalizeFormula(text) {
  const compact = text.replace(/[\s^]/g, '').replace(/[{}]/g, '');
  return compact.replace(/([+-])(\d+)$/, (_, sign, digits) => `${digits}${sign}`);
}

function acceptedAnswers(check) {
  const answers = [];
  if (typeof check.text === 'string' && check.text.length > 0) answers.push(check.text);
  if (Array.isArray(check.answers)) answers.push(...check.answers);
  return answers;
}

function nearMissEntries(check) {
  return (check.nearMiss ?? []).map((entry) => (
    typeof entry === 'string' ? { text: entry, hint: '' } : { text: entry.text, hint: entry.hint ?? '' }
  ));
}

function splitSetItems(raw) {
  return String(raw)
    .split(/[,;\n]|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseAnswer(raw) {
  const text = String(raw ?? '')
    .trim()
    .replaceAll('−', '-')
    .replaceAll('×', 'x')
    .replaceAll('·', 'x')
    .replace(/\s+/g, ' ');
  const match = text.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(?:\s*(?:e|x\s*10\s*\^)\s*([+-]?\d+))?\s*([^\d\s].*)?$/i);
  if (!match) return null;
  const coefficient = match[1];
  const exponent = match[2] == null ? 0 : Number(match[2]);
  const value = Number(coefficient) * 10 ** exponent;
  if (!Number.isFinite(value)) return null;
  const unit = match[3]?.trim() || null;
  return { value, sigFigs: countSigFigs(coefficient), unit, coefficient };
}

export function countSigFigs(coefficient) {
  const digits = coefficient.replace(/^[+-]/, '');
  if (digits.includes('.')) {
    const [whole, fraction] = digits.split('.');
    const significant = `${whole}${fraction}`.replace(/^0+/, '');
    return significant.length;
  }
  const trimmed = digits.replace(/^0+/, '').replace(/0+$/, '');
  if (digits.replace(/^0+/, '') === '') return 1;
  return trimmed.length;
}

export function canonicalUnit(unit) {
  const compact = String(unit).trim().replace(/\s+/g, '');
  if (compact === 'M') return 'M';
  const key = compact.toLowerCase();
  return UNIT_ALIASES.get(key) ?? compact;
}
