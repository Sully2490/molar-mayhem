export const SCOPE = '/molar-mayhem/';
export const UPDATE_PROMPT_TEXT = 'New version, tap to refresh';

export function workerScriptUrl(origin) {
  return new URL('sw.js', new URL(SCOPE, origin)).href;
}

/**
 * Register the root service worker for the GitHub Pages subpath.
 * A waiting update shows a prompt. Nothing calls skipWaiting until the tap.
 */
export function registerOffline(env = {}) {
  const nav = env.navigator ?? globalThis.navigator;
  const doc = env.document ?? globalThis.document;
  const origin = env.origin ?? doc?.location?.origin;
  if (!nav?.serviceWorker?.register || !origin) return Promise.resolve(null);
  return nav.serviceWorker.register(workerScriptUrl(origin), { scope: SCOPE, type: 'module' })
    .then((registration) => {
      bindUpdatePrompt(registration, nav.serviceWorker, doc);
      return registration;
    })
    .catch(() => null);
}

export function showUpdatePrompt(doc, worker) {
  if (!doc?.body || !worker) return null;
  const existing = doc.querySelector?.('[data-mm-update]');
  if (existing) return existing;
  const bar = doc.createElement('div');
  bar.className = 'mm-update';
  bar.setAttribute('data-mm-update', '');
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'mm-update-button';
  button.textContent = UPDATE_PROMPT_TEXT;
  button.addEventListener('click', () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
  });
  bar.append(button);
  doc.body.append(bar);
  return bar;
}

export function bindUpdatePrompt(registration, serviceWorker, doc) {
  if (!registration || !serviceWorker || !doc) return;
  let armed = false;
  const consider = (worker) => {
    if (!worker || !serviceWorker.controller) return null;
    const bar = showUpdatePrompt(doc, worker);
    const button = bar?.querySelector?.('button');
    if (button && button.dataset?.reloadBound !== 'true') {
      if (button.dataset) button.dataset.reloadBound = 'true';
      button.addEventListener('click', () => {
        armed = true;
      });
    }
    return bar;
  };
  consider(registration.waiting);
  registration.addEventListener?.('updatefound', () => {
    const installing = registration.installing;
    installing?.addEventListener?.('statechange', () => {
      if (installing.state === 'installed') consider(installing);
    });
  });
  serviceWorker.addEventListener?.('controllerchange', () => {
    if (armed) doc.location?.reload?.();
  });
}
