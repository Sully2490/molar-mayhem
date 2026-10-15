import { feedbackFor, keypadFor } from '../learn.js';
import { grade } from '../grade.js';
import { renderMath } from '../math/render.js';
import { masteryWord } from './mastery.js';
import { answerText, scoreReport } from './report.js';

const CHOICE_SETS = [
  ['paramagnetic', 'diamagnetic'],
  ['yes', 'no'],
  ['polar', 'nonpolar'],
];

function foldWord(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

/** Choice buttons for yes/no, magnetism, and polarity. Null keeps the text box. */
export function choiceSet(problem) {
  const check = problem?.check;
  if (!check || check.kind === 'numeric' || check.kind === 'config' || check.kind === 'set') return null;
  const texts = [];
  if (typeof check.text === 'string') texts.push(check.text);
  if (Array.isArray(check.answers)) texts.push(...check.answers);
  const folded = new Set(texts.map(foldWord).filter(Boolean));
  for (const set of CHOICE_SETS) {
    if (set.some((choice) => folded.has(choice))) return set;
  }
  return null;
}

function choiceFields(problem, choices) {
  const buttons = choices.map((choice) => `
    <label class="mm-choice">
      <input type="radio" name="answer" value="${escapeHtml(choice)}" autocomplete="off" autocapitalize="off" spellcheck="false">
      <span>${escapeHtml(choice)}</span>
    </label>
  `).join('');
  return `<div class="mm-choices" role="radiogroup" aria-label="Choose an answer">${buttons}</div>`;
}

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function needsUnit(problem) {
  return Boolean(problem?.check?.unit);
}

const fieldAttrs = 'autocomplete="off" autocapitalize="off" spellcheck="false"';

export function answerFields(problem) {
  const choices = choiceSet(problem);
  if (choices) return choiceFields(problem, choices);
  const id = escapeHtml(problem.id);
  const keypad = keypadFor(problem);
  if (needsUnit(problem)) {
    return `
      <div class="mm-answer-row">
        <div class="mm-answer-field">
          <label class="answer-label" for="value-${id}">Value</label>
          <input id="value-${id}" name="value" ${fieldAttrs}${keypad}>
        </div>
        <div class="mm-answer-field">
          <label class="answer-label" for="unit-${id}">Unit</label>
          <input id="unit-${id}" name="unit" ${fieldAttrs}>
        </div>
      </div>
    `;
  }
  return `
    <div class="mm-answer-field">
      <label class="answer-label" for="answer-${id}">Your answer</label>
      <input id="answer-${id}" name="answer" ${fieldAttrs}${keypad}>
    </div>
  `;
}

export function readFormAnswer(form, problem) {
  if (needsUnit(problem)) {
    const value = form.querySelector('[name="value"]')?.value ?? '';
    const unit = form.querySelector('[name="unit"]')?.value ?? '';
    return `${value} ${unit}`.trim();
  }
  const fields = typeof form.querySelectorAll === 'function'
    ? [...form.querySelectorAll('[name="answer"]')]
    : [];
  if (fields.length && fields[0].type === 'radio') {
    return fields.find((field) => field.checked)?.value ?? '';
  }
  return form.querySelector('[name="answer"]')?.value ?? '';
}

export function renderExamProgress(done, total) {
  const safeTotal = Number(total) || 0;
  const safeDone = Math.min(safeTotal, Number(done) || 0);
  const pct = safeTotal === 0 ? 0 : Math.round((safeDone / safeTotal) * 100);
  return `
    <div class="mm-exam-progress" data-exam-progress>
      <div class="mm-exam-track" role="progressbar" aria-valuemin="0" aria-valuemax="${safeTotal}" aria-valuenow="${safeDone}" aria-label="Exam progress">
        <span class="mm-exam-fill" data-exam-fill style="width:${pct}%"></span>
      </div>
      <p data-exam-count>${safeDone} of ${safeTotal} checked</p>
    </div>
  `;
}

export function renderExamSummary({ correct, total, misses }) {
  const missItems = (misses ?? []).map((problem) => `
    <li data-exam-miss="${escapeHtml(problem.id)}">
      <p>${renderMath(problem.q)}</p>
      <p><strong>Answer:</strong> ${renderMath(problem.a)}</p>
    </li>
  `).join('');
  const missBlock = missItems
    ? `<h3>Review</h3><ol data-exam-misses>${missItems}</ol>`
    : '<p data-exam-clear>Every question was right.</p>';
  return `
    <section data-exam-summary>
      <h2>Exam summary</h2>
      <p data-exam-score>${correct} / ${total} correct</p>
      ${missBlock}
    </section>
  `;
}

export function renderExam3(problems) {
  const cards = (problems ?? []).map((problem, index) => `
    <form class="problem mm-problem" data-exam3="${escapeHtml(problem.id)}" data-lesson="${escapeHtml(problem.lessonId ?? '')}">
      <p class="kicker">Chapter ${escapeHtml(problem.ch)} · ${index + 1}</p>
      <p id="q-${escapeHtml(problem.id)}">${renderMath(problem.q)}</p>
      ${answerFields(problem)}
      <button type="submit">Check</button>
      <p class="feedback" id="live-${escapeHtml(problem.id)}" aria-live="polite"></p>
    </form>
  `).join('');
  const count = (problems ?? []).length;
  const body = cards || '<p data-exam3-empty>No Chapter 5 or Chapter 7 problems are loaded.</p>';
  return `
    <section class="page mm-exam" data-route="Exam3">
      <p class="kicker">Chapters 5 and 7</p>
      <h1>Exam 3</h1>
      <p>This mix leans toward lessons you have started and not mastered yet. A hint comes first. The solution shows after the third miss.</p>
      ${renderExamProgress(0, count)}
      ${body}
      <div data-exam-summary-slot></div>
    </section>
  `;
}

export function renderWeakPage(rows) {
  const items = (rows ?? []).map(({ lesson, state }) => `
    <li>
      <a href="#Learn/${encodeURIComponent(lesson.id)}">${renderMath(lesson.guide_line)}</a>
      <span>Ch ${escapeHtml(lesson.ch)}</span>
      <span data-mastery="${escapeHtml(lesson.id)}">${escapeHtml(masteryWord(state))}</span>
      <a href="#Drill">Drill</a>
    </li>
  `).join('');
  const list = items
    ? `<ul class="lesson-list" data-weak-list>${items}</ul>`
    : '<p data-weak-empty>Every lesson is mastered. A drill is still open if you want more practice.</p>';
  return `
    <section class="page mm-exam" data-route="Weak">
      <p class="kicker">On this device</p>
      <h1>Weak spots</h1>
      <p>Not started lessons come first. Practicing means the lesson is open and not mastered yet.</p>
      ${list}
      <p><a href="#Drill">Open drills</a></p>
    </section>
  `;
}

export function formatClock(seconds) {
  const left = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(left / 60);
  const remain = left % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

export function renderSetup(session) {
  const minutes = Number(session.minutes) > 0 ? Math.floor(session.minutes) : 50;
  return `
    <form class="mm-setup" data-exam-setup>
      <p>The timer is off until you turn it on.</p>
      <label class="mm-check"><input type="checkbox" name="timed"> Use a timer</label>
      <label class="mm-minutes">Minutes <input name="minutes" type="number" min="1" max="180" value="${minutes}" disabled></label>
      <button type="submit">Start</button>
      <p class="feedback" data-setup-note aria-live="polite"></p>
    </form>
  `;
}

export function renderRun(session) {
  const timer = session.timed
    ? `<p role="timer" data-timer>${formatClock(session.secondsLeft)}</p>`
    : '<p data-timer>No timer</p>';
  const cards = (session.problems ?? []).map((problem, index) => `
    <fieldset class="problem mm-problem" data-final="${escapeHtml(problem.id)}">
      <legend>Question ${index + 1}${problem.bonus ? ' · Bonus' : ''}</legend>
      <p>${renderMath(problem.q)}</p>
      ${answerFields(problem)}
    </fieldset>
  `).join('');
  return `
    ${timer}
    <form data-exam-run>
      ${cards}
      <button type="submit">Submit</button>
    </form>
  `;
}

function lessonLinks(row) {
  const lessons = row.lessons ?? [];
  if (lessons.length === 0) {
    return `<a href="#Learn">Lessons</a> <a href="#Drill">Drill</a>`;
  }
  const links = lessons.map((lesson) => (
    `<a href="#Learn/${encodeURIComponent(lesson.id)}">${escapeHtml(lesson.guide_line)}</a>`
  )).join(' ');
  return `${links} <a href="#Drill">Drill</a>`;
}

export function renderReport(report) {
  const chapters = (report.chapters ?? []).map((row) => (
    `<li data-chapter="${row.chapter}">Chapter ${row.chapter} · ${escapeHtml(row.title)}: ${row.earned} / ${row.possible}</li>`
  )).join('');
  const bonus = report.bonusPossible
    ? `<p data-bonus>Bonus (extra): ${report.bonusEarned} / ${report.bonusPossible}</p>`
    : '';
  const weak = (report.weak ?? []).map((row) => (
    `<li data-weak-section="${escapeHtml(row.section)}"><span>${escapeHtml(row.section)}</span> ${lessonLinks(row)}</li>`
  )).join('');
  const weakBlock = weak
    ? `<h2>Weak sections</h2><ul data-weak-sections>${weak}</ul>`
    : '<p data-weak-none>No weak section. Every scored section was right.</p>';
  const misses = (report.misses ?? []).map(({ problem }) => `
    <li>
      <p>${renderMath(problem.q)}</p>
      <p><strong>Answer:</strong> ${renderMath(problem.a)}</p>
      <p>${renderMath(problem.why)}</p>
    </li>
  `).join('');
  const missBlock = misses ? `<h2>Missed questions</h2><ol>${misses}</ol>` : '';
  return `
    <section data-exam-report aria-live="polite">
      <h2>Score</h2>
      <p data-score>${report.earned} / ${report.possible}</p>
      ${bonus}
      <h2>By chapter</h2>
      <ul>${chapters}</ul>
      ${weakBlock}
      ${missBlock}
    </section>
  `;
}

export function renderSimulator(session) {
  let body = renderSetup(session);
  if (session.phase === 'run') body = renderRun(session);
  if (session.phase === 'report') body = renderReport(session.report);
  return `
    <section class="page mm-exam" data-route="Final" data-phase="${escapeHtml(session.phase)}">
      <p class="kicker">Chapters 1–9</p>
      <h1>Practice final</h1>
      <p>Work every question, then submit. Nothing is marked until then.</p>
      ${body}
    </section>
  `;
}

export function freshSession(problems, lessons = [], minutes = 50) {
  return {
    phase: 'setup',
    timed: false,
    minutes,
    secondsLeft: null,
    problems: problems ?? [],
    lessons,
    answers: {},
    report: null,
  };
}

export function startSession(session, { timed = false, minutes = 0 } = {}) {
  const useTimer = Boolean(timed) && Number(minutes) > 0;
  return {
    ...session,
    phase: 'run',
    timed: useTimer,
    minutes: useTimer ? Math.floor(Number(minutes)) : session.minutes,
    secondsLeft: useTimer ? Math.floor(Number(minutes)) * 60 : null,
    answers: {},
    report: null,
  };
}

export function tickSession(session, elapsed = 1) {
  if (session.phase !== 'run' || !session.timed) return session;
  const left = Math.max(0, session.secondsLeft - elapsed);
  const next = { ...session, secondsLeft: left };
  if (left === 0) return submitSession(next, next.answers);
  return next;
}

export function submitSession(session, answers, lessons = session.lessons) {
  const report = scoreReport(session.problems, answers, lessons);
  return {
    ...session,
    phase: 'report',
    answers,
    lessons,
    report,
  };
}

export function gradeExam3(problem, input, attempt) {
  const result = grade(answerText(input), problem.check);
  return feedbackFor(result, attempt, problem);
}
