import { normalizeProgress, readProgress, writeProgress } from './progress.js';
import { setBehindInert } from './glossary.js';

let pendingNote = '';
let pendingImport = null;

const LINK_ERROR = 'That link could not be read.';
const CODE_ERROR = 'That code could not be read.';

export function exportCode(progress) {
  return encodeSyncPayload(normalizeProgress(progress));
}

export function encodeSyncPayload(value) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const b64 = btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return `mm1.${b64}`;
}

function textFromBase64Url(text) {
  const pad = '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(`${text.replaceAll('-', '+').replaceAll('_', '/')}${pad}`);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isCount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Reject null, arrays, and fields whose types are not progress. */
export function isProgressShape(raw) {
  if (!isRecord(raw)) return false;
  if ('xp' in raw && !isCount(raw.xp)) return false;
  if ('streak' in raw && !isCount(raw.streak)) return false;
  if ('lastDay' in raw && typeof raw.lastDay !== 'string') return false;
  if ('lessons' in raw) {
    if (!isRecord(raw.lessons)) return false;
    for (const state of Object.values(raw.lessons)) {
      if (state !== 'practicing' && state !== 'mastered') return false;
    }
  }
  if ('cards' in raw) {
    if (!isRecord(raw.cards)) return false;
    for (const done of Object.values(raw.cards)) {
      if (done !== true) return false;
    }
  }
  return true;
}

export function needsConfirm(progress) {
  return isCount(progress?.xp) && progress.xp > 0;
}

function decodeSyncText(raw) {
  let text = String(raw ?? '').trim();
  const linked = text.match(/(?:^#|[?&#])sync=([^&#]*)/);
  if (!linked) return { ok: true, text };
  try {
    text = decodeURIComponent(linked[1]);
  } catch {
    return { ok: false, error: LINK_ERROR };
  }
  return { ok: true, text };
}

export function importCode(raw) {
  const decoded = decodeSyncText(raw);
  if (!decoded.ok) return { ok: false, error: decoded.error };
  let text = decoded.text;
  if (text.startsWith('mm1.')) text = text.slice(4);
  if (!text) return { ok: false, error: 'Paste a code first.' };
  try {
    const parsed = JSON.parse(textFromBase64Url(text));
    if (!isProgressShape(parsed)) return { ok: false, error: CODE_ERROR };
    return { ok: true, progress: normalizeProgress(parsed) };
  } catch {
    return { ok: false, error: CODE_ERROR };
  }
}

export function codeFromHash(hash) {
  const match = String(hash ?? '').match(/(?:^#|[?&#])sync=([^&#]*)/);
  if (!match) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** Read a #sync= code. Writes only when the device has no XP yet. */
export function applySyncHash(hash, storage) {
  const raw = String(hash ?? '');
  if (!/(?:^#|[?&#])sync=/.test(raw)) return { handled: false };
  const code = codeFromHash(raw);
  const base = { handled: true, needsConfirm: false, nextHash: '#Map' };
  if (code == null) {
    return { ...base, ok: false, progress: null, note: LINK_ERROR };
  }
  const result = importCode(code);
  if (!result.ok) {
    return { ...base, ok: false, progress: null, note: result.error };
  }
  const current = readProgress(storage);
  if (needsConfirm(current)) {
    return {
      ...base,
      ok: true,
      progress: result.progress,
      needsConfirm: true,
      note: 'This link would replace your saved progress. Confirm to import it.',
    };
  }
  writeProgress(result.progress, storage);
  return {
    ...base,
    ok: true,
    progress: result.progress,
    note: 'Code imported from the link.',
  };
}

export function rememberNote(text) {
  pendingNote = text;
}

export function takeNote() {
  const note = pendingNote;
  pendingNote = '';
  return note;
}

export function rememberPending(progress) {
  pendingImport = progress;
}

export function takePending() {
  const progress = pendingImport;
  pendingImport = null;
  return progress;
}

export function renderSyncForm() {
  return `
    <form class="sync-box" data-sync>
      <h2>Sync code</h2>
      <p>Copy this code, or paste one from another browser. It stays on this device.</p>
      <label class="answer-label" for="sync-code">Export / import code</label>
      <textarea id="sync-code" name="code" rows="3" spellcheck="false"></textarea>
      <div class="sync-actions">
        <button type="button" data-copy-code>Copy code</button>
        <button type="button" data-import-code>Import code</button>
      </div>
      <p class="feedback" data-sync-status aria-live="polite"></p>
      <div class="term-popup" data-import-dialog role="dialog" aria-modal="true" aria-labelledby="import-confirm-title" hidden>
        <h3 id="import-confirm-title">Replace saved progress?</h3>
        <p id="import-confirm-body" data-import-confirm-body></p>
        <div class="sync-actions">
          <button type="button" data-import-cancel>Keep mine</button>
          <button type="button" data-import-yes>Import and replace</button>
        </div>
      </div>
    </form>
  `;
}

const syncHooks = new WeakMap();
const pendingByRoot = new WeakMap();

function commitImport(root, progress) {
  writeProgress(progress);
  const field = root.querySelector('#sync-code');
  const status = root.querySelector('[data-sync-status]');
  const dialog = root.querySelector('[data-import-dialog]');
  if (field) field.value = exportCode(progress);
  if (status) status.textContent = 'Code imported. This browser now uses that progress.';
  if (dialog) dialog.hidden = true;
  if (dialog) setBehindInert(dialog, !dialog.hidden);
  pendingByRoot.delete(root);
  syncHooks.get(root)?.onImported?.(progress);
}

function stageConfirm(root, progress) {
  pendingByRoot.set(root, progress);
  const dialog = root.querySelector('[data-import-dialog]');
  const body = root.querySelector('[data-import-confirm-body]');
  if (body) {
    body.textContent = `This browser has ${readProgress().xp} XP. Importing replaces that progress.`;
  }
  if (!dialog) return;
  dialog.hidden = false;
  if (dialog) setBehindInert(dialog, !dialog.hidden);
  dialog.querySelector('[data-import-cancel]')?.focus();
}

function fillSync(root) {
  const field = root.querySelector('#sync-code');
  const status = root.querySelector('[data-sync-status]');
  if (field) field.value = exportCode(readProgress());
  const note = takeNote();
  if (note && status) status.textContent = note;
  const pending = takePending();
  if (pending) stageConfirm(root, pending);
}

export function bindSync(root, hooks = {}) {
  syncHooks.set(root, hooks);
  fillSync(root);
  if (root.dataset.syncBound) return;
  root.dataset.syncBound = '1';
  root.addEventListener('click', async (event) => {
    const copy = event.target.closest?.('[data-copy-code]');
    const importButton = event.target.closest?.('[data-import-code]');
    const confirmButton = event.target.closest?.('[data-import-yes]');
    const cancelButton = event.target.closest?.('[data-import-cancel]');
    if (!copy && !importButton && !confirmButton && !cancelButton) return;
    const field = root.querySelector('#sync-code');
    const status = root.querySelector('[data-sync-status]');
    const dialog = root.querySelector('[data-import-dialog]');
    if (cancelButton) {
      pendingByRoot.delete(root);
      if (dialog) dialog.hidden = true;
      if (dialog) setBehindInert(dialog, !dialog.hidden);
      if (status) status.textContent = 'Kept your saved progress.';
      field?.focus();
      return;
    }
    if (confirmButton) {
      const pending = pendingByRoot.get(root);
      if (pending) commitImport(root, pending);
      return;
    }
    if (!field || !status) return;
    if (copy) {
      field.value = exportCode(readProgress());
      try {
        await navigator.clipboard.writeText(field.value);
        status.textContent = 'Code copied.';
      } catch {
        field.focus();
        field.select();
        status.textContent = 'Select the code and copy it.';
      }
      return;
    }
    const result = importCode(field.value);
    if (!result.ok) {
      status.textContent = result.error;
      return;
    }
    if (needsConfirm(readProgress())) {
      stageConfirm(root, result.progress);
      status.textContent = 'Importing replaces your saved progress. Confirm to continue.';
      return;
    }
    commitImport(root, result.progress);
  });
  root.addEventListener('keydown', (event) => {
    const dialog = root.querySelector('[data-import-dialog]');
    if (!dialog || dialog.hidden || event.key !== 'Escape') return;
    event.stopPropagation();
    pendingByRoot.delete(root);
    dialog.hidden = true;
    if (dialog) setBehindInert(dialog, !dialog.hidden);
    const status = root.querySelector('[data-sync-status]');
    if (status) status.textContent = 'Kept your saved progress.';
    root.querySelector('#sync-code')?.focus();
  });
}
