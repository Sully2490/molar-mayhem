export const PROGRESS_KEY = 'mm-progress';

export function emptyProgress() {
  return { xp: 0, streak: 0, lastDay: '', lessons: {}, cards: {} };
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function previousDay(iso) {
  const [year, month, day] = String(iso).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
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
  return next;
}

/** Advance the streak when this UTC day is new. Same day leaves the count alone. */
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
