import { normalizeProgress, readProgress, writeProgress } from './progress.js';

let pendingNote = '';

export function exportCode(progress) {
  const json = JSON.stringify(normalizeProgress(progress));
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

export function importCode(raw) {
  let text = String(raw ?? '').trim();
  const linked = text.match(/(?:^#|[?&#])sync=([^&#]+)/);
  if (linked) text = decodeURIComponent(linked[1]);
  if (text.startsWith('mm1.')) text = text.slice(4);
  if (!text) return { ok: false, error: 'Paste a code first.' };
  try {
    const progress = normalizeProgress(JSON.parse(textFromBase64Url(text)));
    return { ok: true, progress };
  } catch {
    return { ok: false, error: 'That code could not be read.' };
  }
}

export function codeFromHash(hash) {
  const match = String(hash ?? '').match(/(?:^#|[?&#])sync=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/** Read a #sync= code into localStorage. The page then opens #Map. */
export function applySyncHash(hash, storage) {
  const code = codeFromHash(hash);
  if (!code) return { handled: false };
  const result = importCode(code);
  if (result.ok) writeProgress(result.progress, storage);
  return {
    handled: true,
    ok: result.ok,
    progress: result.ok ? result.progress : null,
    note: result.ok ? 'Code imported from the link.' : result.error,
    nextHash: '#Map',
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
    </form>
  `;
}

const syncHooks = new WeakMap();

function fillSync(root) {
  const field = root.querySelector('#sync-code');
  const status = root.querySelector('[data-sync-status]');
  if (!field) return;
  field.value = exportCode(readProgress());
  const note = takeNote();
  if (note && status) status.textContent = note;
}

export function bindSync(root, hooks = {}) {
  syncHooks.set(root, hooks);
  fillSync(root);
  if (root.dataset.syncBound) return;
  root.dataset.syncBound = '1';
  root.addEventListener('click', async (event) => {
    const copy = event.target.closest?.('[data-copy-code]');
    const importButton = event.target.closest?.('[data-import-code]');
    if (!copy && !importButton) return;
    const field = root.querySelector('#sync-code');
    const status = root.querySelector('[data-sync-status]');
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
    writeProgress(result.progress);
    field.value = exportCode(result.progress);
    status.textContent = 'Code imported. This browser now uses that progress.';
    syncHooks.get(root)?.onImported?.(result.progress);
  });
}
