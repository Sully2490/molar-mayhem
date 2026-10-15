/** Animation gate. A missing media query counts as reduced motion. */

export function prefersReducedMotion(matchMedia) {
  if (typeof matchMedia !== 'function') return true;
  try {
    return Boolean(matchMedia('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return true;
  }
}

export function motionMode(reduced, playing = false) {
  if (reduced || !playing) return 'still';
  return 'run';
}
