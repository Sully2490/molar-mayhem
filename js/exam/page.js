import { bindSharedKeypad } from '../chemkb/keyboard.js';
import { loadLessons } from '../learn.js';
import { loadFinalProblems } from '../prep.js';
import { readProgress } from '../progress.js';
import {
  formatClock,
  freshSession,
  gradeExam3,
  readFormAnswer,
  renderExam3,
  renderExamProgress,
  renderExamSummary,
  renderSimulator,
  renderWeakPage,
  startSession,
  submitSession,
  tickSession,
} from './html.js';
import { weakLessons } from './mastery.js';
import { problemsFromLessons, selectExam3 } from './select.js';

export function examHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  const head = raw.split(/[/?]/)[0]?.toLowerCase() ?? '';
  if (head === 'exam3') return 'Exam3';
  if (head === 'weak') return 'Weak';
  if (head === 'final') return 'Final';
  return '';
}

export function ensureExamCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-mm-exam]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/exam/exam.css';
  link.setAttribute('data-mm-exam', '');
  document.head.appendChild(link);
}

function storageOf(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function renderExam3Page(lessons, storage, options = {}) {
  const items = problemsFromLessons(lessons);
  const progress = readProgress(storageOf(storage));
  const picked = selectExam3(items, progress, options);
  return renderExam3(picked);
}

export function renderWeakSpots(lessons, storage) {
  const rows = weakLessons(lessons, readProgress(storageOf(storage)));
  return renderWeakPage(rows);
}

export function examOutcome(root, problems) {
  const forms = typeof root?.querySelectorAll === 'function' ? [...root.querySelectorAll('[data-exam3]')] : [];
  const total = problems?.length ?? 0;
  let done = 0;
  let correct = 0;
  const misses = [];
  for (const problem of problems ?? []) {
    const form = forms.find((item) => item.getAttribute?.('data-exam3') === problem.id);
    const status = form?.getAttribute?.('data-done') ?? '';
    if (!status) continue;
    done += 1;
    if (status === 'correct') correct += 1;
    else misses.push(problem);
  }
  return { done, correct, total, misses, finished: total > 0 && done === total };
}

export function paintExamChrome(root, problems) {
  if (!root || typeof root.querySelector !== 'function') return;
  const outcome = examOutcome(root, problems);
  const progress = root.querySelector('[data-exam-progress]');
  if (progress) progress.outerHTML = renderExamProgress(outcome.done, outcome.total);
  const slot = root.querySelector('[data-exam-summary-slot]');
  if (slot && outcome.finished) slot.innerHTML = renderExamSummary(outcome);
}

export function bindExam3(root, problems) {
  if (!root) return;
  root._mmExam3Abort?.abort();
  const abort = new AbortController();
  root._mmExam3Abort = abort;
  const attempts = new Map();
  const bank = new Map((problems ?? []).map((problem) => [problem.id, problem]));
  bindSharedKeypad(root);
  root.addEventListener('submit', (event) => {
    const form = event.target.closest?.('[data-exam3]');
    if (!form || !root.contains(form)) return;
    event.preventDefault();
    const id = form.getAttribute('data-exam3');
    const problem = bank.get(id);
    if (!problem || form.hasAttribute('data-done')) return;
    const used = (attempts.get(id) ?? 0) + 1;
    attempts.set(id, used);
    const feedback = gradeExam3(problem, readFormAnswer(form, problem), used);
    const live = form.querySelector('.feedback');
    if (live) live.textContent = feedback.text;
    if (feedback.done) {
      form.setAttribute('data-done', feedback.status);
      for (const input of form.querySelectorAll('input')) input.disabled = true;
      paintExamChrome(root, problems);
    }
  }, { signal: abort.signal });
}

function collectRunAnswers(root, problems) {
  const answers = {};
  for (const problem of problems) {
    const field = root.querySelector(`[data-final="${CSS.escape(problem.id)}"]`);
    answers[problem.id] = field ? readFormAnswer(field, problem) : '';
  }
  return answers;
}

export function bindSimulator(root, session, options = {}) {
  if (!root) return;
  root._mmFinalAbort?.abort();
  const abort = new AbortController();
  root._mmFinalAbort = abort;
  let current = session;
  const setIntervalImpl = options.setInterval ?? globalThis.setInterval;
  const clearIntervalImpl = options.clearInterval ?? globalThis.clearInterval;
  let timer = 0;

  function stopTimer() {
    if (timer) clearIntervalImpl(timer);
    timer = 0;
  }

  function paint() {
    stopTimer();
    root.innerHTML = renderSimulator(current);
    if (current.phase !== 'run' || !current.timed) return;
    timer = setIntervalImpl(() => {
      current = { ...current, answers: collectRunAnswers(root, current.problems) };
      current = tickSession(current, 1);
      if (current.phase === 'run') {
        const clock = root.querySelector('[data-timer]');
        if (clock) clock.textContent = formatClock(current.secondsLeft);
        return;
      }
      stopTimer();
      root.innerHTML = renderSimulator(current);
    }, 1000);
  }

  root.addEventListener('change', (event) => {
    const box = event.target.closest?.('[name="timed"]');
    if (!box || !root.contains(box)) return;
    const minutes = root.querySelector('[name="minutes"]');
    if (minutes) minutes.disabled = !box.checked;
  }, { signal: abort.signal });

  root.addEventListener('submit', (event) => {
    const setup = event.target.closest?.('[data-exam-setup]');
    const run = event.target.closest?.('[data-exam-run]');
    if (setup && root.contains(setup)) {
      event.preventDefault();
      const timed = Boolean(setup.querySelector('[name="timed"]')?.checked);
      const minutes = Number(setup.querySelector('[name="minutes"]')?.value);
      if (timed && !(minutes > 0)) {
        const note = setup.querySelector('[data-setup-note]');
        if (note) note.textContent = 'Enter the number of minutes.';
        return;
      }
      current = startSession(current, { timed, minutes });
      paint();
      return;
    }
    if (run && root.contains(run)) {
      event.preventDefault();
      if (timer) clearIntervalImpl(timer);
      timer = 0;
      const answers = collectRunAnswers(root, current.problems);
      current = submitSession(current, answers, current.lessons);
      root.innerHTML = renderSimulator(current);
    }
  }, { signal: abort.signal });

  abort.signal.addEventListener('abort', stopTimer);
  paint();
}

/**
 * Paint #Exam3, #Weak, or #Final. Returns false for every other hash.
 */
export async function mountLane(root, hash, options = {}) {
  const route = examHash(hash);
  if (!route || !root) return false;
  ensureExamCss();
  const storage = storageOf(options.storage);
  const lessons = options.lessons ?? await loadLessons(options.fetchImpl);
  if (route === 'Exam3') {
    const items = problemsFromLessons(lessons);
    const progress = readProgress(storage);
    const picked = selectExam3(items, progress, options);
    root.innerHTML = renderExam3(picked);
    bindExam3(root, picked);
    return true;
  }
  if (route === 'Weak') {
    root.innerHTML = renderWeakPage(weakLessons(lessons, readProgress(storage)));
    return true;
  }
  const problems = options.problems ?? await loadFinalProblems(options.fetchText);
  const session = freshSession(problems, lessons);
  bindSimulator(root, session, options);
  return true;
}
