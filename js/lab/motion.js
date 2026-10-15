/** Animation gate. A missing media query counts as reduced motion. */

export function prefersReducedMotion(matchMedia) {
  if (typeof matchMedia !== 'function') return true;
  try {
    return Boolean(matchMedia('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return true;
  }
}

export function shouldAnimate(reduced) {
  return reduced !== true;
}

/**
 * @param {Storage | null | undefined} storage
 */
export function readLabPrefs(storage) {
  if (!storage) return {};
  try {
    const raw = storage.getItem('mm-lab');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {Record<string, unknown>} partial
 */
export function writeLabPrefs(storage, partial) {
  if (!storage) return;
  const next = { ...readLabPrefs(storage), ...partial };
  storage.setItem('mm-lab', JSON.stringify(next));
}
