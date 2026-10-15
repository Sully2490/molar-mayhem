import { isRemoteUrl, pageUrl } from './policy.js';

const pending = new Map();

export function graphicsApi() {
  return globalThis.$3Dmol || globalThis['3Dmol'] || null;
}

/** Load one same-origin classic script. Repeated calls share one promise. */
export function loadScript(src, doc = globalThis.document) {
  if (isRemoteUrl(src)) return Promise.reject(new Error('Remote libraries are not allowed'));
  if (pending.has(src)) return pending.get(src);
  const promise = new Promise((resolve, reject) => {
    if (!doc?.head || typeof doc.createElement !== 'function') {
      reject(new Error('This page cannot load the molecule viewer'));
      return;
    }
    const ready = graphicsApi();
    const found = doc.querySelector?.(`script[data-mm-src="${src}"]`);
    if (found?.dataset?.ready === '1' && ready) {
      resolve(ready);
      return;
    }
    const script = doc.createElement('script');
    script.async = true;
    script.dataset.mmSrc = src;
    script.src = pageUrl(src, doc.baseURI || 'http://localhost/');
    script.onload = () => {
      script.dataset.ready = '1';
      const api = graphicsApi();
      if (api) resolve(api);
      else reject(new Error('Molecule viewer did not start'));
    };
    script.onerror = () => reject(new Error('Molecule viewer did not load'));
    doc.head.appendChild(script);
  });
  pending.set(src, promise);
  promise.catch(() => pending.delete(src));
  return promise;
}
