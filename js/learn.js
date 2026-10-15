import { grade } from './grade.js';

export const ATTEMPTS = 3;

const CHAPTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

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

export async function loadLessons(fetchImpl = fetch) {
  const lessons = [];
  for (const chapter of CHAPTERS) {
    const folder = chapterFolder(chapter);
    let names = [];
    try {
      const indexResponse = await fetchImpl(`${folder}/index.json`);
      if (!indexResponse.ok) continue;
      names = await indexResponse.json();
    } catch {
      continue;
    }
    if (!Array.isArray(names)) continue;
    for (const name of names) {
      const response = await fetchImpl(`${folder}/${name}`);
      if (!response.ok) continue;
      lessons.push(await response.json());
    }
  }
  return lessons;
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
  const steps = lesson.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  const example = lesson.worked_example;
  const similar = lesson.similar_problem;
  const problems = (lesson.problems ?? []).map(renderProblem).join('');
  return `
    <p><a href="#Learn">All lessons</a></p>
    <p class="kicker">${escapeHtml(lesson.openstax_section)}</p>
    <h1>${escapeHtml(lesson.guide_line)}</h1>
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

function renderProblem(problem) {
  const inputId = `answer-${problem.id}`;
  const liveId = `live-${problem.id}`;
  return `
    <form class="problem" data-problem="${escapeHtml(problem.id)}">
      <p id="q-${escapeHtml(problem.id)}">${escapeHtml(problem.q)}</p>
      <label class="answer-label" for="${inputId}">${escapeHtml(labelFor(problem))}</label>
      <div class="answer-row">
        <input id="${inputId}" name="answer" autocomplete="off" aria-describedby="${liveId}">
        <button type="submit">Check</button>
      </div>
      <p class="feedback" id="${liveId}" aria-live="polite"></p>
    </form>
  `;
}

export function bindLearn(root, lessons) {
  const attempts = new Map();
  root.addEventListener('submit', (event) => {
    const form = event.target.closest?.('[data-problem]');
    if (!form) return;
    event.preventDefault();
    const id = form.getAttribute('data-problem');
    const problem = lessons.flatMap((lesson) => lesson.problems ?? []).find((item) => item.id === id);
    if (!problem) return;
    const used = attempts.get(id) ?? 0;
    if (used >= ATTEMPTS) return;
    const input = form.querySelector('input');
    const live = form.querySelector('.feedback');
    const result = grade(input.value, problem.check);
    const next = result.ok ? used : used + 1;
    if (!result.ok) attempts.set(id, next);
    const message = feedbackFor(result, next, problem);
    live.dataset.status = message.status;
    live.textContent = message.text;
    if (message.done) input.disabled = true;
  });
}
