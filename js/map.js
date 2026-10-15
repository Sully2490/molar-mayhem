import { showConfetti, showToast, toastHtml } from './celebrate.js';
import { masterLesson, readProgress, writeProgress } from './progress.js';
import { bindSync, exportCode, renderSyncForm } from './sync.js';

export function masteryLabel(state) {
  if (state === 'mastered') return 'Mastered';
  if (state === 'practicing') return 'Practicing';
  return 'Not started';
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderMap(lessons, progress) {
  const saved = progress ?? { xp: 0, streak: 0, lessons: {} };
  const items = (lessons ?? []).map((lesson) => {
    const state = saved.lessons?.[lesson.id] ?? '';
    const href = `#Learn/${encodeURIComponent(lesson.id)}`;
    return `
      <li>
        <a href="${href}">${escapeHtml(lesson.guide_line)}</a>
        <span>Ch ${escapeHtml(lesson.ch)}</span>
        <span data-mastery="${escapeHtml(lesson.id)}">${masteryLabel(state)}</span>
        <button type="button" data-master="${escapeHtml(lesson.id)}">Mark mastered</button>
      </li>
    `;
  }).join('');
  const list = items
    ? `<ul class="lesson-list">${items}</ul>`
    : '<p>No lessons are in the chapter folders yet.</p>';
  return `
    <section class="page" data-route="Map" data-xp="${saved.xp ?? 0}" data-streak="${saved.streak ?? 0}">
      <h1>Map</h1>
      <p>Skip ahead any time. A later lesson stays open.</p>
      <p><strong data-xp-text>${saved.xp ?? 0} XP</strong> · <span data-streak-text>Streak ${saved.streak ?? 0}</span></p>
      ${toastHtml()}
      ${list}
      ${renderSyncForm()}
    </section>
  `;
}

const bound = new WeakSet();

export function bindMap(root, storage) {
  bindSync(root, {
    onImported(progress) {
      const xp = root.querySelector('[data-xp-text]');
      const streak = root.querySelector('[data-streak-text]');
      const page = root.querySelector('[data-route="Map"]');
      if (xp) xp.textContent = `${progress.xp} XP`;
      if (streak) streak.textContent = `Streak ${progress.streak}`;
      if (page) {
        page.dataset.xp = String(progress.xp);
        page.dataset.streak = String(progress.streak);
      }
      for (const [id, state] of Object.entries(progress.lessons)) {
        const label = root.querySelector(`[data-mastery="${CSS.escape(id)}"]`);
        if (label) label.textContent = masteryLabel(state);
      }
    },
  });
  if (bound.has(root)) return;
  bound.add(root);
  root.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-master]');
    if (!button || !root.contains(button)) return;
    const id = button.getAttribute('data-master');
    const result = masterLesson(readProgress(storage), id);
    writeProgress(result.progress, storage);
    const label = root.querySelector(`[data-mastery="${CSS.escape(id)}"]`);
    if (label) label.textContent = 'Mastered';
    const page = root.querySelector('[data-route="Map"]');
    if (page) {
      page.dataset.xp = String(result.progress.xp);
      page.dataset.streak = String(result.progress.streak);
    }
    const xp = root.querySelector('[data-xp-text]');
    const streak = root.querySelector('[data-streak-text]');
    if (xp) xp.textContent = `${result.progress.xp} XP`;
    if (streak) streak.textContent = `Streak ${result.progress.streak}`;
    showToast(root, result.toast);
    if (result.celebrate) showConfetti(root);
    const field = root.querySelector('#sync-code');
    if (field) field.value = exportCode(result.progress);
  });
}
