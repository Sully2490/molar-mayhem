import { videos as publishedVideos } from '../content/videos/catalog.js';
import { grade } from './grade.js';
import {
  chapterByNumber,
  CHAPTERS,
  lessonsForChapter,
  orderedLessons,
  sectionLabel,
  shortTitle,
} from './home/chapters.js';
import { ensureLearnCss } from './home/css.js';
import { continueCardHtml, moduleGridHtml, moduleHref } from './home/modules.js';
import { chapterStats, readProgress } from './progress.js';
import { progressRingHtml } from './home/ring.js';
import { termsByChapter } from './terms/catalog.js';

export const ATTEMPTS = 3;

export const MODULE_ITEMS = Object.freeze([
  { id: 'overview', label: 'Overview', hint: 'What this chapter covers' },
  { id: 'lesson', label: 'Lesson', hint: 'Read each lesson from scratch' },
  { id: 'examples', label: 'Worked examples', hint: 'See one problem worked out' },
  { id: 'practice', label: 'Practice', hint: 'Try the problems' },
  { id: 'quiz', label: 'Quiz', hint: 'A short check, one problem each' },
  { id: 'videos', label: 'Videos', hint: 'Public clips for this chapter' },
  { id: 'terms', label: 'Terms', hint: 'Words from this chapter' },
]);

/** Lesson files already on the site. GitHub Pages cannot list a folder. */
export const LESSON_FILES = [
  'content/ch01/classify.json',
  'content/ch01/context.json',
  'content/ch01/convert.json',
  'content/ch01/measure.json',
  'content/ch01/properties.json',
  'content/ch01/sigfigs.json',
  'content/ch02/2-1-early-ideas.json',
  'content/ch02/2-2-evolution.json',
  'content/ch02/2-3-structure.json',
  'content/ch02/2-4-formulas.json',
  'content/ch03/3.1.json',
  'content/ch03/3.2.json',
  'content/ch03/3.3.json',
  'content/ch03/3.4.json',
  'content/ch03/3.5.json',
  'content/ch03/3.6.json',
  'content/ch03/3.7.json',
  'content/ch04/4.1-ionic-bonding.json',
  'content/ch04/4.2-covalent-bonding.json',
  'content/ch04/4.3-nomenclature.json',
  'content/ch04/4.4-lewis-structures.json',
  'content/ch04/4.5-formal-charge-resonance.json',
  'content/ch04/4.6-shape-and-polarity.json',
  'content/ch05/5a-hybridization.json',
  'content/ch05/5b-sigma-pi.json',
  'content/ch05/5c-molecular-orbitals.json',
  'content/ch05/5d-multiple-bonds.json',
  'content/ch06/6-1-formula-mass.json',
  'content/ch06/6-2-empirical.json',
  'content/ch06/6-3-molarity.json',
  'content/ch06/6-4-concentration.json',
  'content/ch07/7-1-balancing.json',
  'content/ch07/7-2-classifying.json',
  'content/ch07/7-3-stoichiometry.json',
  'content/ch07/7-4-yields.json',
  'content/ch07/7-5-analysis.json',
  'content/ch07/cards.json',
  'content/ch08/8.1-pressure.json',
  'content/ch08/8.2-ideal-gas.json',
  'content/ch08/8.3-mixtures.json',
  'content/ch08/8.4-effusion.json',
  'content/ch08/8.5-kinetic.json',
  'content/ch08/8.6-real-gases.json',
  'content/ch09/9-1-energy.json',
  'content/ch09/9-2-calorimetry.json',
  'content/ch09/9-3-enthalpy.json',
  'content/ch09/9-4-bonds.json',
];

const lessonsByRoot = new WeakMap();
const attemptsByRoot = new WeakMap();

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function chapterFolder(chapter) {
  return `content/ch${String(chapter).padStart(2, '0')}`;
}

function sortLessons(lessons) {
  return orderedLessons(lessons);
}

async function namesForChapter(chapter, fetchImpl) {
  const folder = chapterFolder(chapter);
  const fallback = LESSON_FILES.filter((path) => path.startsWith(`${folder}/`));
  try {
    const indexResponse = await fetchImpl(`${folder}/index.json`);
    if (!indexResponse.ok) return fallback;
    const listed = await indexResponse.json();
    if (!Array.isArray(listed)) return fallback;
    return listed
      .filter((name) => typeof name === 'string' && name.endsWith('.json') && !name.includes('..'))
      .map((name) => `${folder}/${name}`);
  } catch {
    return fallback;
  }
}

export async function loadLessons(fetchImpl = fetch) {
  const lessons = [];
  for (const chapter of CHAPTERS.map((item) => item.number)) {
    const paths = await namesForChapter(chapter, fetchImpl);
    for (const path of paths) {
      try {
        const response = await fetchImpl(path);
        if (!response.ok) continue;
        const lesson = await response.json();
        if (lesson && typeof lesson.id === 'string') lessons.push(lesson);
      } catch {
        // Skip a file the host cannot read. The list still shows the rest.
      }
    }
  }
  return sortLessons(lessons);
}

export function labelFor(problem) {
  const unit = problem.check?.unit;
  return unit ? `Your answer (${unit})` : 'Your answer';
}

/**
 * @param {{ ok: boolean, hint?: string, reason?: string }} result
 * @param {number} attempt 1-based count of misses so far, including this one
 * @param {{ a: string, why: string, hints?: string[] }} problem
 */
export function feedbackFor(result, attempt, problem) {
  if (result.ok) {
    const extra = result.hint ? ` ${result.hint}` : '';
    return { done: true, status: 'correct', text: `Correct.${extra}` };
  }
  if (attempt >= ATTEMPTS) {
    return {
      done: true,
      status: 'solution',
      text: `Solution: ${problem.a}. ${problem.why}`,
    };
  }
  const stored = problem.hints?.[Math.min(attempt - 1, (problem.hints?.length ?? 1) - 1)];
  const hint = result.hint || stored || 'Check the steps and try again.';
  const status = result.reason === 'nearMiss' ? 'near' : 'miss';
  const lead = status === 'near' ? '' : 'Not yet. ';
  return { done: false, status, text: `${lead}${hint}` };
}

function lessonLink(lesson) {
  return `#Learn/${encodeURIComponent(lesson.id)}`;
}

export function parseLearnToken(token) {
  const raw = String(token ?? '').trim();
  if (!raw) return { kind: 'modules' };
  const match = raw.match(/^mod-(\d+)(?:-([a-z]+))?$/);
  if (!match) return { kind: 'lesson', lessonId: raw };
  const chapter = Number(match[1]);
  const item = match[2] ?? '';
  if (!chapterByNumber(chapter)) return { kind: 'missing', token: raw };
  if (!item) return { kind: 'chapter', chapter };
  if (!MODULE_ITEMS.some((entry) => entry.id === item)) return { kind: 'missing', token: raw };
  return { kind: 'item', chapter, item };
}

/** True when the hash segment is a lesson id, not a chapter module. */
export function isLessonTarget(token) {
  return parseLearnToken(token).kind === 'lesson';
}

export function renderLearn(lessons, lessonId = '', progress = undefined) {
  ensureLearnCss();
  const saved = progress === undefined ? readProgress() : progress;
  const target = parseLearnToken(lessonId);
  let body = '';
  if (target.kind === 'modules') body = renderModules(lessons, saved);
  else if (target.kind === 'chapter') body = renderChapter(lessons, target.chapter, saved);
  else if (target.kind === 'item') body = renderItem(lessons, target.chapter, target.item, saved);
  else if (target.kind === 'missing') body = renderMissing(target.token);
  else {
    const lesson = (lessons ?? []).find((item) => item.id === target.lessonId);
    body = lesson ? renderLesson(lesson) : renderMissing(target.lessonId);
  }
  const view = target.kind === 'lesson' ? 'lesson' : target.kind;
  return `<section class="page learn-page" data-route="Learn" data-learn-view="${escapeHtml(view)}">${body}</section>`;
}

function renderModules(lessons, progress) {
  const note = (lessons ?? []).length === 0
    ? '<p>No lessons are in the chapter folders yet.</p>'
    : '<p>Pick a chapter. Every item stays open. Nothing is locked.</p>';
  return `<p class="kicker">Chapters 1–9</p>
    <h1>Learn</h1>
    ${note}
    ${continueCardHtml(lessons, progress)}
    ${moduleGridHtml(lessons, progress)}`;
}

function renderMissing(token) {
  return `<p class="learn-crumbs"><a href="#Learn">Chapters</a></p>
    <h1>That page is not here</h1>
    <p>No lesson or chapter item matches <span class="learn-missing">${escapeHtml(token || 'that link')}</span>.</p>`;
}

function chapterStyle(chapter) {
  return `--accent:${chapter.accent};--wash:${chapter.wash}`;
}

function renderChapter(lessons, number, progress) {
  const chapter = chapterByNumber(number);
  const rows = lessonsForChapter(lessons, number);
  const stats = chapterStats(progress, rows.map((lesson) => lesson.id));
  const items = MODULE_ITEMS.map((item, index) => `
    <li>
      <a class="module-item" href="${moduleHref(number, item.id)}" data-item="${item.id}">
        <span class="module-item-index" aria-hidden="true">${index + 1}</span>
        <span class="module-item-copy">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.hint)}</span>
        </span>
        <span class="module-item-go" aria-hidden="true">Open</span>
      </a>
    </li>`).join('');
  return `<p class="learn-crumbs"><a href="#Learn">Chapters</a></p>
    <header class="module-head" data-chapter="${number}" style="${chapterStyle(chapter)}">
      <div>
        <p class="kicker">Chapter ${number}</p>
        <h1>${escapeHtml(chapter.title)}</h1>
        <p>${escapeHtml(chapter.blurb)}</p>
        <p class="module-cite">${escapeHtml(chapter.sections)}</p>
      </div>
      <div class="module-head-ring" aria-hidden="true">${progressRingHtml(stats.mastered, stats.total)}<span class="module-fraction">${stats.mastered}/${stats.total}</span></div>
    </header>
    <p class="module-open">Open browsing. Every item below is unlocked.</p>
    <ol class="module-items">${items}</ol>`;
}

function itemNav(number, current) {
  const links = MODULE_ITEMS.map((item) => {
    const here = item.id === current ? ' aria-current="page"' : '';
    return `<a href="${moduleHref(number, item.id)}" data-item="${item.id}"${here}>${escapeHtml(item.label)}</a>`;
  }).join('');
  return `<nav class="module-subnav" aria-label="Chapter items">${links}</nav>`;
}

function lessonRows(rows) {
  if (!rows.length) return '<p>No lessons are in this chapter yet.</p>';
  return `<ul class="learn-rows">${rows.map((lesson) => `
    <li>
      <a class="learn-row" href="${lessonLink(lesson)}">
        <span class="learn-row-section">${escapeHtml(sectionLabel(lesson) || 'Lesson')}</span>
        <span class="learn-row-title">${escapeHtml(shortTitle(lesson))}</span>
      </a>
    </li>`).join('')}</ul>`;
}

function renderItem(lessons, number, item, progress) {
  const chapter = chapterByNumber(number);
  const rows = lessonsForChapter(lessons, number);
  const crumbs = `<p class="learn-crumbs"><a href="#Learn">Chapters</a> · <a href="${moduleHref(number)}">${escapeHtml(chapter.title)}</a></p>`;
  const head = MODULE_ITEMS.find((entry) => entry.id === item);
  const intro = `<header class="module-head module-head-item" data-chapter="${number}" style="${chapterStyle(chapter)}">
      <div>
        <p class="kicker">Chapter ${number}</p>
        <h1>${escapeHtml(head.label)}</h1>
        <p>${escapeHtml(head.hint)}</p>
      </div>
    </header>
    ${itemNav(number, item)}`;
  return `${crumbs}${intro}${itemBody(item, chapter, rows, progress)}`;
}

function itemBody(item, chapter, rows, progress) {
  if (item === 'overview') return renderOverview(chapter, rows, progress);
  if (item === 'lesson') return lessonRows(rows);
  if (item === 'examples') return renderExamples(rows);
  if (item === 'practice') return renderPractice(rows, 'Practice these by hand. A hint comes first. The solution shows after three misses.');
  if (item === 'quiz') return renderQuiz(rows);
  if (item === 'videos') return renderVideos(chapter.number);
  if (item === 'terms') return renderTerms(chapter.number);
  return '';
}

function renderOverview(chapter, rows, progress) {
  const stats = chapterStats(progress, rows.map((lesson) => lesson.id));
  const count = stats.total === 1 ? '1 lesson' : `${stats.total} lessons`;
  return `<p>${escapeHtml(chapter.blurb)} ${escapeHtml(count)} in this chapter. ${stats.mastered} mastered.</p>
    <p class="module-cite">${escapeHtml(chapter.sections)}</p>
    ${lessonRows(rows)}`;
}

function renderExamples(rows) {
  const cards = rows.map((lesson) => {
    const example = lesson.worked_example ?? { q: '', answer: '' };
    return `<article class="problem learn-example">
      <h2>${escapeHtml(shortTitle(lesson))}</h2>
      <p>${escapeHtml(example.q)}</p>
      <p><strong>Answer:</strong> ${escapeHtml(example.answer)}</p>
      <p><a href="${lessonLink(lesson)}">Open the lesson</a></p>
    </article>`;
  }).join('');
  return cards || '<p>No worked example is in this chapter yet.</p>';
}

function renderPractice(rows, lead) {
  const problems = rows.flatMap((lesson) => lesson.problems ?? []).map(renderProblem).join('');
  if (!problems) return `<p>${escapeHtml(lead)}</p><p>No practice problems are in this chapter yet.</p>`;
  return `<p>${escapeHtml(lead)}</p>${problems}`;
}

function renderQuiz(rows) {
  const problems = rows
    .map((lesson) => (lesson.problems ?? [])[0])
    .filter(Boolean)
    .map(renderProblem)
    .join('');
  const lead = 'A short check. One problem from each lesson. Nothing is locked.';
  if (!problems) return `<p>${lead}</p><p>No quiz problem is in this chapter yet.</p>`;
  return `<p>${lead}</p>${problems}`;
}

function renderVideos(chapter) {
  const clips = (publishedVideos ?? []).filter((video) => Number(video.chapter) === Number(chapter));
  const href = `#Videos/${chapter}`;
  if (!clips.length) {
    return `<p>No public video is listed for this chapter yet.</p><p><a href="${href}">Open the video page</a></p>`;
  }
  const items = clips.map((video) => `<li><a href="${href}">${escapeHtml(video.title || 'Video')}</a></li>`).join('');
  return `<ul class="learn-rows">${items}</ul><p><a href="${href}">Open the video page</a></p>`;
}

function renderTerms(chapter) {
  const terms = termsByChapter(chapter);
  if (!terms.length) return '<p>No glossary terms are listed for this chapter yet.</p>';
  const pills = terms.map((entry) => (
    `<li><a href="#Terms/${encodeURIComponent(entry.id)}">${escapeHtml(entry.term)}</a></li>`
  )).join('');
  return `<ul class="term-pills">${pills}</ul>`;
}

function renderLesson(lesson) {
  const steps = (lesson.steps ?? []).map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  const example = lesson.worked_example ?? { q: '', answer: '' };
  const similar = lesson.similar_problem ?? { q: '', hint: '', answer: '' };
  const problems = (lesson.problems ?? []).map(renderProblem).join('');
  const chapter = chapterByNumber(lesson.ch);
  const crumb = chapter
    ? `<a href="${moduleHref(lesson.ch)}">${escapeHtml(chapter.title)}</a>`
    : `<a href="#Learn">Chapters</a>`;
  return `
    <p class="learn-crumbs"><a href="#Learn">Chapters</a> · ${crumb}</p>
    <p class="kicker">${escapeHtml(lesson.openstax_section ?? '')}</p>
    <h1>${escapeHtml(shortTitle(lesson))}</h1>
    <p class="learn-objective">${escapeHtml(lesson.guide_line ?? '')}</p>
    <ol>${steps}</ol>
    <section class="problem">
      <h2>Worked example</h2>
      <p>${escapeHtml(example.q)}</p>
      <p><strong>Answer:</strong> ${escapeHtml(example.answer)}</p>
    </section>
    <section class="problem">
      <h2>Your turn</h2>
      <p>${escapeHtml(similar.q)}</p>
      <p><strong>Hint:</strong> ${escapeHtml(similar.hint)}</p>
      <p><strong>Answer:</strong> ${escapeHtml(similar.answer)}</p>
    </section>
    <h2>Practice</h2>
    ${problems}
  `;
}

// Phones: a decimal keypad only when the answer needs no minus sign or exponent,
// because iOS decimal keypads have neither.
export function keypadFor(problem) {
  const check = problem.check ?? {};
  if (check.kind !== 'numeric' || typeof check.value !== 'number') return '';
  const v = check.value;
  return v >= 0 && (v === 0 || (v >= 1e-3 && v < 1e6)) ? ' inputmode="decimal"' : '';
}

function renderProblem(problem) {
  const inputId = `answer-${problem.id}`;
  const liveId = `live-${problem.id}`;
  const numeric = problem.check?.kind === 'numeric';
  const unitId = `unit-${problem.id}`;
  const unitBox = numeric && problem.check.unit
    ? `<label class="answer-label" for="${unitId}">Unit</label>
        <input id="${unitId}" name="unit" class="unit-input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="${liveId}">`
    : '';
  return `
    <form class="problem" data-problem="${escapeHtml(problem.id)}">
      <p id="q-${escapeHtml(problem.id)}">${escapeHtml(problem.q)}</p>
      <label class="answer-label" for="${inputId}">${escapeHtml(numeric ? 'Your answer' : labelFor(problem))}</label>
      <div class="answer-row">
        <input id="${inputId}" name="answer" autocomplete="off" autocapitalize="off" spellcheck="false"${keypadFor(problem)} aria-describedby="${liveId}">
        ${unitBox}
        <button type="submit">Check</button>
      </div>
      <p class="feedback" id="${liveId}" aria-live="polite"></p>
    </form>
  `;
}

export function bindLearn(root, lessons) {
  ensureLearnCss();
  lessonsByRoot.set(root, lessons);
  if (attemptsByRoot.has(root)) return;
  const attempts = new Map();
  attemptsByRoot.set(root, attempts);
  root.addEventListener('submit', (event) => {
    const form = event.target.closest?.('[data-problem]');
    if (!form) return;
    event.preventDefault();
    const id = form.getAttribute('data-problem');
    const problem = (lessonsByRoot.get(root) ?? [])
      .flatMap((lesson) => lesson.problems ?? [])
      .find((item) => item.id === id);
    if (!problem) return;
    const used = attempts.get(id) ?? 0;
    if (used >= ATTEMPTS) return;
    const input = form.querySelector('input[name="answer"]') ?? form.querySelector('input');
    const unitInput = form.querySelector?.('input[name="unit"]');
    const live = form.querySelector('.feedback');
    const typed = unitInput && unitInput.value.trim() ? `${input.value.trim()} ${unitInput.value.trim()}` : input.value;
    const result = grade(typed, problem.check);
    const next = result.ok ? used : used + 1;
    if (!result.ok) attempts.set(id, next);
    const message = feedbackFor(result, next, problem);
    live.dataset.status = message.status;
    live.textContent = message.text;
    if (message.done) {
      input.disabled = true;
      if (unitInput) unitInput.disabled = true;
    }
  });
}
