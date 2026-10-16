export const PROGRESS_KEY = 'mm-progress';

export function emptyProgress() {
  return { xp: 0, streak: 0, lastDay: '', lessons: {}, cards: {}, misses: {} };
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function previousDay(iso) {
  const [year, month, day] = String(iso).split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() - 1);
  return todayKey(date);
}

export function normalizeProgress(raw) {
  const next = emptyProgress();
  if (!raw || typeof raw !== 'object') return next;
  if (Number.isFinite(raw.xp) && raw.xp > 0) next.xp = Math.floor(raw.xp);
  if (Number.isFinite(raw.streak) && raw.streak > 0) next.streak = Math.floor(raw.streak);
  if (typeof raw.lastDay === 'string') next.lastDay = raw.lastDay;
  if (raw.lessons && typeof raw.lessons === 'object') {
    for (const [id, state] of Object.entries(raw.lessons)) {
      if (state === 'practicing' || state === 'mastered') next.lessons[id] = state;
    }
  }
  if (raw.cards && typeof raw.cards === 'object') {
    for (const [id, done] of Object.entries(raw.cards)) {
      if (done === true) next.cards[id] = true;
    }
  }
  if (raw.misses && typeof raw.misses === 'object' && !Array.isArray(raw.misses)) {
    for (const [id, count] of Object.entries(raw.misses)) {
      if (typeof id !== 'string' || id.length === 0) continue;
      if (!Number.isFinite(count) || count <= 0) continue;
      next.misses[id] = Math.floor(count);
    }
  }
  return next;
}

/** Advance the streak when this local day is new. Same day leaves the count alone. */
export function noteDay(progress, day = todayKey()) {
  const next = normalizeProgress(progress);
  if (next.lastDay === day) return next;
  next.streak = next.lastDay === previousDay(day) ? next.streak + 1 : 1;
  next.lastDay = day;
  return next;
}

function storageOf(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readProgress(storage) {
  const store = storageOf(storage);
  if (!store) return emptyProgress();
  try {
    const raw = store.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

export function writeProgress(progress, storage) {
  const next = normalizeProgress(progress);
  const store = storageOf(storage);
  if (!store) return next;
  try {
    store.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // A private window can refuse the write. The visit still works.
  }
  return next;
}

export function openLesson(progress, id, day = todayKey()) {
  const next = noteDay(progress, day);
  if (id && next.lessons[id] !== 'mastered') next.lessons[id] = 'practicing';
  return next;
}

export function masterLesson(progress, id, day = todayKey()) {
  const next = noteDay(progress, day);
  const already = next.lessons[id] === 'mastered';
  next.lessons[id] = 'mastered';
  if (!already) next.xp += 25;
  return {
    progress: next,
    awarded: already ? 0 : 25,
    celebrate: !already,
    toast: already
      ? `Already mastered. Streak ${next.streak}.`
      : `Mastered. +25 XP. Streak ${next.streak}.`,
  };
}

/** Add one miss for a problem. Lane D reads `progress.misses` to weight Prep. */
export function recordMiss(progress, id, day = todayKey()) {
  const next = noteDay(progress, day);
  if (typeof id !== 'string' || id.length === 0) return next;
  next.misses[id] = (next.misses[id] ?? 0) + 1;
  return next;
}

export function awardXp(progress, amount, day = todayKey()) {
  const next = noteDay(progress, day);
  if (amount > 0) next.xp += amount;
  return next;
}

export function reviewCard(progress, id, day = todayKey()) {
  const next = noteDay(progress, day);
  if (next.cards[id]) return { progress: next, awarded: 0 };
  next.cards[id] = true;
  next.xp += 5;
  return { progress: next, awarded: 5 };
}

function lessonRows(lessons) {
  return (lessons ?? []).filter((lesson) => lesson && typeof lesson.id === 'string' && lesson.id);
}

function lessonMap(progress) {
  const lessons = progress?.lessons;
  return lessons && typeof lessons === 'object' ? lessons : {};
}

/** '', 'practicing', or 'mastered'. Other stored values count as not started. */
export function lessonState(progress, id) {
  const state = lessonMap(progress)[id];
  return state === 'mastered' || state === 'practicing' ? state : '';
}

/** Counts for one chapter. Mastered lessons fill the progress ring. */
export function chapterStats(progress, lessonIds) {
  const ids = Array.isArray(lessonIds) ? lessonIds : [];
  let mastered = 0;
  let practicing = 0;
  for (const id of ids) {
    const state = lessonState(progress, id);
    if (state === 'mastered') mastered += 1;
    else if (state === 'practicing') practicing += 1;
  }
  const total = ids.length;
  return {
    total,
    mastered,
    practicing,
    notStarted: total - mastered - practicing,
    fraction: total === 0 ? 0 : mastered / total,
  };
}

/** The practicing lesson added most recently. Null when none are in progress. */
export function continueLesson(lessons, progress) {
  const states = lessonMap(progress);
  const order = Object.keys(states);
  const practicing = lessonRows(lessons).filter((lesson) => states[lesson.id] === 'practicing');
  if (!practicing.length) return null;
  practicing.sort((left, right) => order.indexOf(right.id) - order.indexOf(left.id));
  return practicing[0];
}

/**
 * Earliest open lesson. A practicing lesson ranks ahead of one not started,
 * because that is the spot the student has already found hard.
 */
export function weakestLesson(lessons, progress) {
  const states = lessonMap(progress);
  const open = lessonRows(lessons).filter((lesson) => states[lesson.id] !== 'mastered');
  if (!open.length) return null;
  open.sort((left, right) => {
    const rank = (lesson) => (states[lesson.id] === 'practicing' ? 0 : 1);
    return rank(left) - rank(right)
      || (Number(left.ch) || 0) - (Number(right.ch) || 0)
      || String(left.id).localeCompare(String(right.id));
  });
  return open[0];
}

/** First lesson in the given order that is not mastered. */
export function nextLesson(lessons, progress) {
  const states = lessonMap(progress);
  return lessonRows(lessons).find((lesson) => states[lesson.id] !== 'mastered') ?? null;
}

/**
 * Card on the Learn modules page.
 * kind is continue, next, done, or empty.
 */
export function continueTarget(lessons, progress) {
  const current = continueLesson(lessons, progress);
  if (current) return { lesson: current, kind: 'continue' };
  const upcoming = nextLesson(lessons, progress);
  if (upcoming) return { lesson: upcoming, kind: 'next' };
  if (!lessonRows(lessons).length) return { lesson: null, kind: 'empty' };
  return { lesson: null, kind: 'done' };
}

/**
 * Home "Start here" card.
 * A practicing lesson is the weak spot. Otherwise the next unmastered lesson.
 * kind is weak, next, done, or empty.
 */
export function startHere(lessons, progress) {
  if (!lessonRows(lessons).length) return { kind: 'empty', lesson: null, alt: null };
  const weak = weakestLesson(lessons, progress);
  const upcoming = nextLesson(lessons, progress);
  const states = lessonMap(progress);
  if (weak && states[weak.id] === 'practicing') {
    return {
      kind: 'weak',
      lesson: weak,
      alt: upcoming && upcoming.id !== weak.id ? upcoming : null,
    };
  }
  if (upcoming) return { kind: 'next', lesson: upcoming, alt: null };
  return { kind: 'done', lesson: null, alt: null };
}
