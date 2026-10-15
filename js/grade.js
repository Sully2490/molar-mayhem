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

/**
 * Grade a student answer against a check descriptor.
 * Numeric checks understand tolerance, scientific notation, sig figs, and units.
 * @param {string} input
 * @param {{ kind: 'numeric' | 'exact', value?: number, tolerance?: number, sigFigs?: number, unit?: string | null, text?: string }} check
 */
export function grade(input, check) {
  switch (check?.kind) {
    case 'numeric':
      return gradeNumeric(input, check);
    case 'exact':
      return gradeExact(input, check);
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
  const tolerance = check.tolerance ?? 0;
  if (Math.abs(parsed.value - check.value) > tolerance) return { ok: false, reason: 'tolerance' };
  if (check.sigFigs != null && parsed.sigFigs !== check.sigFigs) return { ok: false, reason: 'sigFigs' };
  return { ok: true };
}

export function gradeExact(input, check) {
  const expected = String(check.text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const actual = String(input ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!actual) return { ok: false, reason: 'format' };
  if (actual !== expected) return { ok: false, reason: 'exact' };
  return { ok: true };
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
