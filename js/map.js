import { showConfetti, showToast, toastHtml } from './celebrate.js';
import { CHAPTERS, sectionLabel, shortTitle } from './home/chapters.js';
import { ensureLearnCss } from './home/css.js';
import { progressRingHtml } from './home/ring.js';
import { chapterStats, masterLesson, readProgress, writeProgress } from './progress.js';
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

function lessonRow(lesson, saved) {
  const state = saved.lessons?.[lesson.id] ?? '';
  const href = `#Learn/${encodeURIComponent(lesson.id)}`;
  const section = sectionLabel(lesson);
  return `
    <li>
      <a href="${href}">${escapeHtml(shortTitle(lesson))}</a>
      ${section ? `<span>${escapeHtml(section)}</span>` : ''}
      <span data-mastery="${escapeHtml(lesson.id)}">${masteryLabel(state)}</span>
      <button type="button" data-master="${escapeHtml(lesson.id)}">Mark mastered</button>
    </li>
  `;
}

function chapterBlocks(lessons, saved) {
  const rows = lessons ?? [];
  if (!rows.length) return '<p>No lessons are in the chapter folders yet.</p>';
  const known = new Set(CHAPTERS.map((chapter) => chapter.number));
  const blocks = CHAPTERS.map((chapter) => {
    const inChapter = rows.filter((lesson) => Number(lesson.ch) === chapter.number);
    if (!inChapter.length) return '';
    const stats = chapterStats(saved, inChapter.map((lesson) => lesson.id));
    return `<section class="map-chapter" data-chapter="${chapter.number}" style="--accent:${chapter.accent};--wash:${chapter.wash}">
      <h2><span class="map-ch-num" aria-hidden="true">${chapter.number}</span> ${escapeHtml(chapter.title)}</h2>
      <p class="map-chapter-meta">${escapeHtml(chapter.sections)}</p>
      <div class="map-chapter-ring" aria-hidden="true">${progressRingHtml(stats.mastered, stats.total)}<span class="module-fraction">${stats.mastered}/${stats.total}</span></div>
      <ul class="lesson-list">${inChapter.map((lesson) => lessonRow(lesson, saved)).join('')}</ul>
    </section>`;
  }).join('');
  const extras = rows.filter((lesson) => !known.has(Number(lesson.ch)));
  const extra = extras.length
    ? `<section class="map-chapter" data-chapter="other"><h2>More</h2><ul class="lesson-list">${extras.map((lesson) => lessonRow(lesson, saved)).join('')}</ul></section>`
    : '';
  return `${blocks}${extra}`;
}

export function renderMap(lessons, progress) {
  ensureLearnCss();
  const saved = progress ?? { xp: 0, streak: 0, lessons: {} };
  return `
    <section class="page mm-map" data-route="Map" data-xp="${saved.xp ?? 0}" data-streak="${saved.streak ?? 0}">
      <h1>Map</h1>
      <p>Skip ahead any time. A later lesson stays open.</p>
      <p><strong data-xp-text>${saved.xp ?? 0} XP</strong> · <span data-streak-text>Streak ${saved.streak ?? 0}</span></p>
      ${toastHtml()}
      ${chapterBlocks(lessons, saved)}
      ${renderSyncForm()}
    </section>
  `;
}

const bound = new WeakSet();

export function bindMap(root, storage) {
  ensureLearnCss();
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
