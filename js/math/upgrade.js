import { escapeHtml, renderMath } from './render.js';
import { upgradeYourTurn } from '../steps/your-turn.js';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SUP', 'SUB', 'BUTTON']);

function skipNode(node) {
  const parent = node.parentElement ?? node.parentNode;
  if (!parent || parent === node) return true;
  const tag = String(parent.tagName ?? '').toUpperCase();
  if (SKIP_TAGS.has(tag)) return true;
  if (typeof parent.closest === 'function' && parent.closest('script, style, textarea, input, sup, sub, button')) {
    return true;
  }
  return false;
}

function textNodes(root) {
  const found = [];
  const walk = (node) => {
    const children = node.childNodes ? [...node.childNodes] : [];
    for (const child of children) {
      if (child.nodeType === 3) found.push(child);
      else if (child.nodeType === 1) walk(child);
    }
  };
  if (root?.nodeType === 3) found.push(root);
  else walk(root);
  return found;
}

/** Replace plain chemistry in text nodes. Already rendered tags are left alone. */
export function upgradeMath(root) {
  if (!root) return;
  const doc = root.ownerDocument ?? (root.nodeType === 9 ? root : null);
  if (!doc?.createElement) return;
  for (const node of textNodes(root)) {
    const raw = String(node.nodeValue ?? '');
    if (!raw.trim()) continue;
    if (skipNode(node)) continue;
    const html = renderMath(raw);
    if (html === escapeHtml(raw)) continue;
    const holder = doc.createElement('span');
    holder.className = 'mm-math';
    holder.innerHTML = html;
    node.parentNode?.replaceChild?.(holder, node);
  }
}

function scan(doc) {
  const root = doc.getElementById?.('view') ?? doc.body;
  if (!root) return;
  upgradeYourTurn(root);
  upgradeMath(root);
}

/** Watch the page so lesson HTML picks up math and the hidden "Your turn" block. */
export function startPageUpgrades(doc = globalThis.document) {
  if (!doc?.body) return () => {};
  if (doc.body.dataset?.mmUpgrades === 'on') return () => {};
  if (doc.body.dataset) doc.body.dataset.mmUpgrades = 'on';
  scan(doc);
  if (typeof globalThis.MutationObserver !== 'function') return () => {};
  let pending = false;
  const observer = new globalThis.MutationObserver(() => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      scan(doc);
    });
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
