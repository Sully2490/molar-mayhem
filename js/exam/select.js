import { weightForState } from './mastery.js';

export const EXAM3_CHAPTERS = [5, 7];
export const EXAM3_COUNT = 10;

export function problemsFromLessons(lessons, chapters = EXAM3_CHAPTERS) {
  const wanted = new Set(chapters);
  const items = [];
  for (const lesson of lessons ?? []) {
    if (!wanted.has(Number(lesson?.ch))) continue;
    for (const problem of lesson.problems ?? []) {
      if (!problem || typeof problem.id !== 'string' || !problem.check) continue;
      items.push({
        ...problem,
        lessonId: lesson.id,
        ch: Number(lesson.ch),
        openstax_section: problem.openstax_section || lesson.openstax_section,
        guide: lesson.guide_line ?? '',
      });
    }
  }
  return items;
}

function weightedSample(pool, count, random) {
  const bag = pool.map((entry) => ({ ...entry }));
  const chosen = [];
  const limit = Math.min(count, bag.length);
  while (chosen.length < limit) {
    const total = bag.reduce((sum, entry) => sum + entry.weight, 0);
    let ticket = random() * total;
    let index = bag.length - 1;
    for (let i = 0; i < bag.length; i += 1) {
      ticket -= bag[i].weight;
      if (ticket <= 0) {
        index = i;
        break;
      }
    }
    chosen.push(bag[index]);
    bag.splice(index, 1);
  }
  return chosen;
}

/** If the draw missed a chapter that still has problems, swap one in. */
export function ensureChapterMix(picked, pool, chapters) {
  const items = picked.map((entry) => entry.item);
  if (items.length < 2) return items;
  const available = new Set(pool.map((entry) => entry.item.ch));
  for (const chapter of chapters) {
    if (!available.has(chapter) || items.some((item) => item.ch === chapter)) continue;
    let donorIndex = -1;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (items[i].ch !== chapter) {
        donorIndex = i;
        break;
      }
    }
    const replacement = pool
      .filter((entry) => entry.item.ch === chapter && !items.includes(entry.item))
      .sort((left, right) => right.weight - left.weight)[0];
    if (donorIndex < 0 || !replacement) continue;
    items[donorIndex] = replacement.item;
  }
  return items;
}

/**
 * Mixed Chapter 5 and Chapter 7 set. `progress.lessons` comes from readProgress.
 * `random` defaults to Math.random. Pass a function in tests.
 */
export function selectExam3(items, progress, options = {}) {
  const count = options.count ?? EXAM3_COUNT;
  const random = options.random ?? Math.random;
  const chapters = options.chapters ?? EXAM3_CHAPTERS;
  const states = progress?.lessons ?? {};
  const pool = (items ?? [])
    .filter((item) => chapters.includes(Number(item.ch)))
    .map((item) => ({
      item,
      weight: weightForState(states[item.lessonId]),
    }))
    .sort((left, right) => (
      String(left.item.lessonId).localeCompare(String(right.item.lessonId))
      || String(left.item.id).localeCompare(String(right.item.id))
    ));
  const picked = weightedSample(pool, count, random);
  const mixed = ensureChapterMix(picked, pool, chapters);
  return mixed.sort((left, right) => left.ch - right.ch || String(left.id).localeCompare(String(right.id)));
}
