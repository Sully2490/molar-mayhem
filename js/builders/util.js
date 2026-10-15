/** Shared number helpers for the builders. */

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Hand-calculation tolerance: 1% of the expected value, and at least `floor`.
 * Counting problems should use an exact compare instead.
 */
export function nearMeasure(actual, expected, floor = 0.1) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  const tolerance = Math.max(floor, Math.abs(expected) * 0.01);
  return Math.abs(actual - expected) <= tolerance;
}

export function formatMeasure(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  return String(rounded);
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
