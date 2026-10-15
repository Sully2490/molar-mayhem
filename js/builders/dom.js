import { prefersReducedMotion } from './motion.js';

const STYLE_HREF = 'css/builders/builders.css';

/** Inject the builder stylesheet once. Safe to call from every mount. */
export function ensureBuilderCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-mm-builders]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.setAttribute('data-mm-builders', '');
  document.head.appendChild(link);
}

export function reducedFrom(opts = {}) {
  if (typeof opts.reduced === 'boolean') return opts.reduced;
  const matchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia.bind(window)
    : null;
  return prefersReducedMotion(matchMedia);
}

export function restoreFocus(root, focusId) {
  if (!focusId || !root?.querySelector) return;
  const node = root.querySelector(`[data-focus="${focusId}"]`);
  if (typeof node?.focus === 'function') node.focus();
}

export function on(root, type, handler) {
  root.addEventListener(type, handler);
  return () => root.removeEventListener(type, handler);
}
