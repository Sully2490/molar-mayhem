/**
 * Three misses: a hint, a stronger hint, then the worked solution.
 * `misses` is how many wrong checks have already been recorded.
 */
export function missFeedback(ok, success, hints, misses) {
  if (ok) {
    return { ok: true, tone: 'ok', message: success, reveal: true, misses };
  }
  const steps = hints.length ? hints : ['Try again.'];
  const next = misses + 1;
  const reveal = next >= steps.length;
  const message = steps[Math.min(next - 1, steps.length - 1)];
  return { ok: false, tone: reveal ? 'bad' : 'hint', message, reveal, misses: next };
}
