import { readProgress } from '../progress.js';

/** Not started is lowest. Practicing is in the middle. Mastered is done. */
export function masteryScore(state) {
  if (state === 'mastered') return 2;
  if (state === 'practicing') return 1;
  return 0;
}

/**
 * Exam 3 draws more often from lessons the student has not mastered.
 * Practicing weighs the most: those are the lessons they still miss.
 * Not started is next. Mastered stays in the mix, but rarely.
 */
export function weightForState(state) {
  if (state === 'practicing') return 5;
  if (state === 'mastered') return 1;
  return 2;
}

export function masteryWord(state) {
  if (state === 'mastered') return 'Mastered';
  if (state === 'practicing') return 'Practicing';
  return 'Not started';
}

export function progressLessons(storage) {
  return readProgress(storage).lessons ?? {};
}

/** Lessons that are not mastered, lowest score first. */
export function weakLessons(lessons, progress) {
  const states = progress?.lessons ?? {};
  return (lessons ?? [])
    .filter((lesson) => lesson && typeof lesson.id === 'string')
    .map((lesson) => {
      const state = states[lesson.id] ?? '';
      return { lesson, state, score: masteryScore(state) };
    })
    .filter((item) => item.score < 2)
    .sort((left, right) => (
      left.score - right.score
      || (left.lesson.ch ?? 0) - (right.lesson.ch ?? 0)
      || String(left.lesson.id).localeCompare(String(right.lesson.id))
    ));
}
