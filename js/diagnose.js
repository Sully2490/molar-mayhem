import {
  DEFAULT_RELATIVE_PERCENT,
  canonicalUnit,
  grade,
  normalizeAnswer,
  parseAnswer,
  withinRelativePercent,
} from './grade.js';

/**
 * High-cost mistakes, cheapest rank first. Named hits use this order
 * before the generic rules. Lane A ids on the right are accepted too.
 */
export const MISTAKE_RANK = [
  ['skip-moles', 1],
  ['flip-ratio', 2],
  ['kelvin', 3],
  ['sign', 4],
  ['double-bond', 5],
  ['coefficient', 6],
  ['exponent', 7],
];

const RANK = new Map(MISTAKE_RANK);

const ALIASES = new Map([
  ['skip-grams-to-moles', 'skip-moles'],
  ['forgot-moles', 'skip-moles'],
  ['flipped-ratio', 'flip-ratio'],
  ['inverted-ratio', 'flip-ratio'],
  ['celsius-not-kelvin', 'kelvin'],
  ['celsius', 'kelvin'],
  ['wrong-sign', 'sign'],
  ['sign-q', 'sign'],
  ['enthalpy-sign', 'sign'],
  ['double-bond-two-groups', 'double-bond'],
  ['vsepr-double', 'double-bond'],
  ['missing-coefficient', 'coefficient'],
  ['dropped-power-of-ten', 'exponent'],
  ['power-of-ten', 'exponent'],
]);

export const MESSAGES = {
  sign: 'Check the sign: heat released means q (and ΔH) is negative.',
  exponent: 'Your digits are right but the power of ten is off.',
  kelvin: 'Use kelvin: K = °C + 273.15.',
  'flip-ratio': 'Your mole ratio is upside down. Put the unknown on top.',
  coefficient: 'Did you use the coefficient from the balanced equation?',
  'double-bond': 'A double bond counts as one electron group.',
  'skip-moles': 'You went straight from grams to grams. Convert to moles first.',
};

const POWERS = [1, -1, 2, -2, 3, -3];

function toleranceOf(check) {
  return check?.tolerance ?? DEFAULT_RELATIVE_PERCENT;
}

function canonicalId(id) {
  return ALIASES.get(id) ?? id;
}

function rankOf(id) {
  return RANK.get(canonicalId(id)) ?? 100;
}

function hit(id, message) {
  return { id, message };
}

function messageOf(mistake) {
  return mistake.describe || mistake.message || MESSAGES[canonicalId(mistake.id)] || mistake.id;
}

function numericHit(parsed, target, check) {
  if (!parsed || typeof target !== 'number' || !Number.isFinite(target)) return false;
  if (!withinRelativePercent(parsed.value, target, toleranceOf(check))) return false;
  if (check?.unit) {
    if (!parsed.unit) return false;
    if (canonicalUnit(parsed.unit) !== canonicalUnit(check.unit)) return false;
  } else if (parsed.unit) {
    return false;
  }
  return true;
}

function textHit(input, target, check) {
  if (typeof target !== 'string' || !target) return false;
  const rule = check?.case ?? 'insensitive';
  const actual = normalizeAnswer(input, rule);
  return actual.length > 0 && actual === normalizeAnswer(target, rule);
}

function targetIsCorrect(target, check) {
  if (typeof target === 'number' && check?.kind === 'numeric' && Number.isFinite(check.value)) {
    return withinRelativePercent(target, check.value, toleranceOf(check));
  }
  if (typeof target === 'string') return grade(target, check).ok === true;
  return false;
}

function producedTargets(mistake, ctx) {
  const targets = [];
  if (typeof mistake?.wrongAnswerFn === 'function') {
    try {
      targets.push(mistake.wrongAnswerFn(ctx));
    } catch {
      // Spec A templates are optional. A throw means "no value", not a crash.
    }
  }
  if (typeof mistake?.value === 'number') targets.push(mistake.value);
  if (typeof mistake?.wrong === 'number') targets.push(mistake.wrong);
  if (typeof mistake?.wrong === 'string') {
    targets.push(mistake.wrong);
    const parsed = parseAnswer(mistake.wrong);
    if (parsed && checkLooksNumeric(mistake)) targets.push(parsed.value);
  }
  return targets;
}

function checkLooksNumeric(mistake) {
  return typeof mistake.value === 'number' || typeof mistake.unit === 'string';
}

function matchesTarget(input, parsed, target, check) {
  if (targetIsCorrect(target, check)) return false;
  if (typeof target === 'number') return numericHit(parsed, target, check);
  if (typeof target === 'string') {
    if (textHit(input, target, check)) return true;
    const asNumber = parseAnswer(target);
    if (asNumber && check?.kind === 'numeric') return numericHit(parsed, asNumber.value, check);
  }
  return false;
}

function matchNamed(input, parsed, check, mistakes, ctx) {
  const list = Array.isArray(mistakes) ? mistakes : [];
  const ordered = list.map((mistake, index) => ({ mistake, index }));
  ordered.sort((left, right) => {
    const rank = rankOf(left.mistake?.id) - rankOf(right.mistake?.id);
    return rank !== 0 ? rank : left.index - right.index;
  });
  for (const { mistake } of ordered) {
    if (!mistake || typeof mistake.id !== 'string') continue;
    for (const target of producedTargets(mistake, ctx)) {
      if (matchesTarget(input, parsed, target, check)) {
        return hit(mistake.id, messageOf(mistake));
      }
    }
  }
  return null;
}

function matchSign(value, expected, check) {
  if (!Number.isFinite(expected) || expected === 0) return null;
  if (!withinRelativePercent(value, -expected, toleranceOf(check))) return null;
  return hit('sign', MESSAGES.sign);
}

function matchExponent(value, expected, check) {
  if (!Number.isFinite(expected) || expected === 0 || value === 0) return null;
  const percent = toleranceOf(check);
  for (const power of POWERS) {
    const wrong = expected * 10 ** power;
    if (withinRelativePercent(value, wrong, percent)) return hit('exponent', MESSAGES.exponent);
  }
  return null;
}

function recomputeValue(ctx) {
  if (typeof ctx?.recompute !== 'function') return null;
  try {
    const value = ctx.recompute(ctx);
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function matchKelvin(value, expected, check, ctx) {
  const percent = toleranceOf(check);
  const recomputed = recomputeValue(ctx);
  if (recomputed != null && !withinRelativePercent(recomputed, expected, percent)) {
    if (withinRelativePercent(value, recomputed, percent)) return hit('kelvin', MESSAGES.kelvin);
  }
  if (!Number.isFinite(expected)) return null;
  if (withinRelativePercent(Math.abs(value - expected), 273.15, percent)) return hit('kelvin', MESSAGES.kelvin);
  return null;
}

function ratioPairs(ratio) {
  if (typeof ratio === 'number' && Number.isFinite(ratio) && ratio !== 0) return [[1, ratio]];
  if (Array.isArray(ratio) && ratio.length >= 2) {
    const a = Number(ratio[0]);
    const b = Number(ratio[1]);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== 0 && b !== 0) return [[a, b]];
  }
  return [];
}

function matchFlip(value, expected, check, ctx) {
  if (!Number.isFinite(expected) || expected === 0) return null;
  const percent = toleranceOf(check);
  for (const [a, b] of ratioPairs(ctx?.ratio)) {
    const factors = [(b / a) ** 2, (a / b) ** 2];
    for (const factor of factors) {
      if (!Number.isFinite(factor) || withinRelativePercent(factor, 1, percent)) continue;
      if (withinRelativePercent(value, expected * factor, percent)) return hit('flip-ratio', MESSAGES['flip-ratio']);
      if (withinRelativePercent(value * expected, factor, percent)) return hit('flip-ratio', MESSAGES['flip-ratio']);
    }
  }
  return null;
}

function matchCoefficient(value, expected, check, ctx) {
  if (!Number.isFinite(expected) || expected === 0) return null;
  const list = Array.isArray(ctx?.coefficients) ? ctx.coefficients : [];
  const percent = toleranceOf(check);
  for (const raw of list) {
    const coefficient = Number(raw);
    if (!Number.isFinite(coefficient) || coefficient === 0) continue;
    if (withinRelativePercent(Math.abs(coefficient), 1, percent)) continue;
    if (withinRelativePercent(value, expected * coefficient, percent)) return hit('coefficient', MESSAGES.coefficient);
    if (withinRelativePercent(value, expected / coefficient, percent)) return hit('coefficient', MESSAGES.coefficient);
  }
  return null;
}

function matchDoubleBond(input, check, ctx) {
  const target = ctx?.overcount;
  if (typeof target !== 'string' || !target) return null;
  if (check?.kind && check.kind !== 'exact') return null;
  if (!textHit(input, target, check)) return null;
  return hit('double-bond', MESSAGES['double-bond']);
}

/**
 * Explain a wrong answer. Returns null when the answer is correct or no rule fits.
 * Named mistakes are checked first, highest-cost id first.
 * Lane A entries use {id, describe, wrongAnswerFn}. A missing or throwing
 * wrongAnswerFn is ignored.
 * @param {string} input
 * @param {object} check grader check for the answer that was graded wrong
 * @param {Array<{id: string, describe?: string, message?: string, value?: number, wrong?: string | number, unit?: string, wrongAnswerFn?: Function}>} [mistakes]
 * @param {{ recompute?: Function, ratio?: number | number[], coefficients?: number[], overcount?: string }} [ctx]
 * @returns {{id: string, message: string} | null}
 */
export function diagnose(input, check, mistakes = [], ctx = {}) {
  if (!check) return null;
  let graded;
  try {
    graded = grade(input, check);
  } catch {
    return null;
  }
  if (graded.ok) return null;
  const parsed = parseAnswer(input);
  const named = matchNamed(input, parsed, check, mistakes, ctx);
  if (named) return named;
  const expected = check.kind === 'numeric' ? check.value : null;
  if (parsed && Number.isFinite(expected)) {
    const sign = matchSign(parsed.value, expected, check);
    if (sign) return sign;
    const exponent = matchExponent(parsed.value, expected, check);
    if (exponent) return exponent;
    const kelvin = matchKelvin(parsed.value, expected, check, ctx);
    if (kelvin) return kelvin;
    const flip = matchFlip(parsed.value, expected, check, ctx);
    if (flip) return flip;
    const coefficient = matchCoefficient(parsed.value, expected, check, ctx);
    if (coefficient) return coefficient;
  }
  const doubled = matchDoubleBond(input, check, ctx);
  if (doubled) return doubled;
  return null;
}

/**
 * Load Spec A per-template mistakes. Returns [] when js/gen is not there.
 * @param {object} [problem]
 */
export async function loadLaneAMistakes(problem) {
  try {
    const mod = await import('./gen/mistakes.js');
    const list = typeof mod.mistakesFor === 'function' ? mod.mistakesFor(problem) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
