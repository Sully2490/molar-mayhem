import { attachChemKeyboard } from '../chemkb/keyboard.js';
import { mountSearch } from '../search/mount.js';
import { registerOffline } from './register.js';

const watched = new WeakSet();

/** Attach the chemistry keyboard to answer fields already on the page and ones added later. */
export function watchAnswerInputs(doc, attach = attachChemKeyboard) {
  const scan = (root) => {
    if (!root) return;
    const inputs = [];
    if (typeof root.matches === 'function' && root.matches('input[name="answer"]')) inputs.push(root);
    if (typeof root.querySelectorAll === 'function') inputs.push(...root.querySelectorAll('input[name="answer"]'));
    for (const input of inputs) {
      if (watched.has(input)) continue;
      watched.add(input);
      attach(input);
    }
  };
  scan(doc);
  if (typeof globalThis.MutationObserver !== 'function' || !doc?.body) return () => {};
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) scan(node);
    }
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

/** Start search, focus mode, the chemistry keyboard, and offline registration. */
export function startLaneF(doc = globalThis.document, env = {}) {
  if (!doc?.body) return null;
  const search = mountSearch(doc, env);
  const stopWatch = watchAnswerInputs(doc, env.attach);
  const registration = registerOffline({
    navigator: env.navigator ?? globalThis.navigator,
    document: doc,
    origin: env.origin ?? doc.location?.origin,
  });
  return {
    search,
    registration,
    stop() {
      stopWatch();
      search?.destroy?.();
    },
  };
}
