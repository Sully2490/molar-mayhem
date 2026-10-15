import { grade } from './grade.js';

export const ATTEMPTS = 3;

const CHAPTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

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

function sectionRank(lesson) {
  const match = String(lesson.openstax_section ?? '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 99;
}

function sortLessons(lessons) {
  return lessons.sort((left, right) => (
    (left.ch ?? 0) - (right.ch ?? 0)
    || sectionRank(left) - sectionRank(right)
    || String(left.id).localeCompare(String(right.id))
  ));
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
  for (const chapter of CHAPTERS) {
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

export function renderLearn(lessons, lessonId = '') {
  const lesson = lessons.find((item) => item.id === lessonId);
  const body = lesson ? renderLesson(lesson) : renderList(lessons);
  return `<section class="page" data-route="Learn">${body}</section>`;
}

function renderList(lessons) {
  const items = lessons.length === 0
    ? '<p>No lessons are in the chapter folders yet.</p>'
    : `<ul class="lesson-list">${lessons.map((lesson) => (
      `<li><a href="${lessonLink(lesson)}">${escapeHtml(lesson.guide_line)}</a> <span>Ch ${lesson.ch}</span></li>`
    )).join('')}</ul>`;
  return `<h1>Learn</h1><p>Pick a lesson. Each one starts from scratch, then gives you practice.</p>${items}`;
}

function renderLesson(lesson) {
  const steps = (lesson.steps ?? []).map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  const example = lesson.worked_example ?? { q: '', answer: '' };
  const similar = lesson.similar_problem ?? { q: '', hint: '', answer: '' };
  const problems = (lesson.problems ?? []).map(renderProblem).join('');
  return `
    <p><a href="#Learn">All lessons</a></p>
    <p class="kicker">${escapeHtml(lesson.openstax_section ?? '')}</p>
    <h1>${escapeHtml(lesson.guide_line ?? '')}</h1>
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
