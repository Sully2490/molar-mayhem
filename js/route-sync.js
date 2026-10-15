/**
 * Hash-router sync.
 *
 * The page was painting twice for one navigation: popstate and hashchange
 * both fired, and each paint replaced #view. A click on the hash that is
 * already open does not fire hashchange, so a stale view stayed up.
 *
 * createRouteSync notifies once per hash. A same-hash click still notifies,
 * and a following hashchange for that same hash does not notify again.
 * Wiring into js/app.js is in docs/v3/integration-A.md.
 */

export function createRouteSync({
  getHash,
  onRoute,
  target = globalThis,
  document: doc,
} = {}) {
  if (typeof getHash !== 'function') throw new Error('createRouteSync needs getHash');
  if (typeof onRoute !== 'function') throw new Error('createRouteSync needs onRoute');
  const root = doc ?? target?.document ?? globalThis.document ?? null;
  let last = null;
  let seq = 0;
  let started = false;

  function publish(hash, reason, force) {
    const next = String(hash ?? '');
    if (!force && next === last) return false;
    last = next;
    const token = ++seq;
    onRoute({
      hash: next,
      reason,
      token,
      stale: () => token !== seq,
    });
    return true;
  }

  function onHashChange() {
    publish(getHash(), 'hashchange', false);
  }

  function onPopState() {
    publish(getHash(), 'popstate', false);
  }

  function onClick(event) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const node = event.target;
    const link = typeof node?.closest === 'function' ? node.closest('a[href]') : null;
    if (!link) return;
    const href = link.getAttribute?.('href') ?? '';
    if (!href.startsWith('#')) return;
    if (href !== String(getHash() ?? '')) return;
    event.preventDefault?.();
    publish(href, 'same-hash', true);
  }

  function start() {
    if (started) return;
    started = true;
    last = String(getHash() ?? '');
    target.addEventListener?.('hashchange', onHashChange);
    target.addEventListener?.('popstate', onPopState);
    (root ?? target).addEventListener?.('click', onClick);
  }

  function stop() {
    if (!started) return;
    started = false;
    target.removeEventListener?.('hashchange', onHashChange);
    target.removeEventListener?.('popstate', onPopState);
    (root ?? target).removeEventListener?.('click', onClick);
  }

  return {
    start,
    stop,
    current: () => last,
    publish,
  };
}
