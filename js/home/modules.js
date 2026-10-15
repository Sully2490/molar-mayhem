import { CHAPTERS, chapterByNumber, lessonsForChapter, shortTitle } from './chapters.js';
import { chapterStats, continueTarget } from '../progress.js';
import { progressRingHtml } from './ring.js';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function moduleHref(chapter, item = '') {
  const base = `mod-${Number(chapter)}`;
  return `#Learn/${item ? `${base}-${item}` : base}`;
}

function accentStyle(chapter) {
  return `--accent:${chapter.accent};--wash:${chapter.wash}`;
}

function lessonCountLabel(stats) {
  const lessons = stats.total === 1 ? '1 lesson' : `${stats.total} lessons`;
  if (stats.total === 0) return 'No lessons yet';
  if (stats.mastered === 0 && stats.practicing === 0) return lessons;
  const bits = [lessons];
  if (stats.mastered) bits.push(`${stats.mastered} mastered`);
  if (stats.practicing) bits.push(`${stats.practicing} in progress`);
  return bits.join(' · ');
}

export function moduleTileHtml(chapter, lessons, progress) {
  const stats = chapterStats(progress, lessons.map((lesson) => lesson.id));
  const href = moduleHref(chapter.number);
  return `<a class="module-tile" href="${href}" data-module="${chapter.number}" data-chapter="${chapter.number}" data-mastered="${stats.mastered}" data-total="${stats.total}" style="${accentStyle(chapter)}">
    <span class="module-num" aria-hidden="true">${chapter.number}</span>
    <span class="module-copy">
      <span class="module-kicker">Chapter ${chapter.number}</span>
      <span class="module-title">${escapeHtml(chapter.title)}</span>
      <span class="module-meta">${escapeHtml(lessonCountLabel(stats))}</span>
    </span>
    <span class="module-ring" aria-hidden="true">${progressRingHtml(stats.mastered, stats.total)}<span class="module-fraction">${stats.mastered}/${stats.total}</span></span>
  </a>`;
}

export function moduleGridHtml(lessons, progress) {
  const tiles = CHAPTERS.map((chapter) => (
    moduleTileHtml(chapter, lessonsForChapter(lessons, chapter.number), progress)
  )).join('');
  return `<div class="module-grid">${tiles}</div>`;
}

export function continueCardHtml(lessons, progress) {
  const pick = continueTarget(lessons, progress);
  if (pick.kind === 'empty') {
    return `<article class="learn-continue" data-learn-continue data-continue-kind="empty">
      <p class="kicker">Continue</p>
      <h2>Start with chapter 1</h2>
      <p>Lessons will show up here as the chapter folders load.</p>
      <a class="learn-continue-link" href="${moduleHref(1)}">Open Essential Ideas</a>
    </article>`;
  }
  if (pick.kind === 'done' || !pick.lesson) {
    return `<article class="learn-continue" data-learn-continue data-continue-kind="done">
      <p class="kicker">Continue</p>
      <h2>Every lesson is mastered</h2>
      <p>Nothing is locked. Drill is open if you want more practice.</p>
      <a class="learn-continue-link" href="#Drill">Practice in Drill</a>
    </article>`;
  }
  const lesson = pick.lesson;
  const chapter = chapterByNumber(lesson.ch) ?? {
    number: lesson.ch,
    title: `Chapter ${lesson.ch}`,
    accent: '#0f5c56',
    wash: '#e7f4f1',
  };
  const href = `#Learn/${encodeURIComponent(lesson.id)}`;
  const kicker = pick.kind === 'continue' ? 'Continue where you left off' : 'Up next';
  const action = pick.kind === 'continue' ? 'Continue this lesson' : 'Open this lesson';
  return `<article class="learn-continue" data-learn-continue data-continue-kind="${pick.kind}" data-continue-lesson="${escapeHtml(lesson.id)}" style="${accentStyle(chapter)}">
    <p class="kicker">${kicker}</p>
    <h2>${escapeHtml(shortTitle(lesson))}</h2>
    <p>Chapter ${escapeHtml(chapter.number)} · ${escapeHtml(chapter.title)}</p>
    <a class="learn-continue-link" href="${href}">${action}</a>
  </article>`;
}
