import { consumesAttempt, grade } from '../grade.js';
import { readProgress, recordMiss, writeProgress } from '../progress.js';

const CHAPTER_TITLES = {
  1: 'Essential ideas',
  2: 'Atoms and molecules',
  3: 'Electrons',
  4: 'Bonding',
  5: 'Advanced bonding',
  6: 'Moles',
  7: 'Reactions',
  8: 'Gases',
  9: 'Thermochemistry',
};

export function chapterTitle(chapter) {
  return CHAPTER_TITLES[chapter] ?? `Chapter ${chapter}`;
}

export function sectionNumber(value) {
  const match = String(value ?? '').match(/(\d+\.\d+)/);
  return match ? match[1] : '';
}

export function answerText(answer) {
  if (answer && typeof answer === 'object') {
    return `${answer.value ?? ''} ${answer.unit ?? ''}`.trim();
  }
  return String(answer ?? '').trim();
}

export function lessonsForSection(lessons, section, chapter) {
  const key = sectionNumber(section);
  if (!key) return [];
  return (lessons ?? []).filter((lesson) => (
    Number(lesson.ch) === Number(chapter)
    && sectionNumber(lesson.openstax_section) === key
  ));
}

function pointsOf(problem) {
  const points = Number(problem.points);
  return Number.isFinite(points) && points > 0 ? points : 1;
}

function chapterOf(problem) {
  if (Number.isInteger(problem.ch)) return problem.ch;
  const match = String(problem.openstax_section ?? '').match(/(\d+)\.\d+/);
  return match ? Number(match[1]) : 0;
}

/**
 * Score a finished exam. Bonus points stay off the main total.
 * A section is weak when any of its points were missed.
 */
export function scoreReport(problems, answers, lessons = [], storage) {
  const chapters = new Map();
  const sections = new Map();
  let earned = 0;
  let possible = 0;
  let bonusEarned = 0;
  let bonusPossible = 0;
  const misses = [];
  let progress = readProgress(storage);
  let recorded = false;

  for (const problem of problems ?? []) {
    const points = pointsOf(problem);
    const given = answerText(answers?.[problem.id]);
    const result = grade(given, problem.check);
    const got = result.ok ? points : 0;
    const chapter = chapterOf(problem);
    const section = problem.openstax_section || `Chapter ${chapter}`;
    if (problem.bonus) {
      bonusEarned += got;
      bonusPossible += points;
    } else {
      earned += got;
      possible += points;
      const bucket = chapters.get(chapter) ?? {
        chapter,
        title: chapterTitle(chapter),
        earned: 0,
        possible: 0,
      };
      bucket.earned += got;
      bucket.possible += points;
      chapters.set(chapter, bucket);
    }
    const sectionBucket = sections.get(section) ?? {
      section,
      chapter,
      earned: 0,
      possible: 0,
    };
    sectionBucket.earned += got;
    sectionBucket.possible += points;
    sections.set(section, sectionBucket);
    if (!result.ok) misses.push({ problem, given, result });
    if (consumesAttempt(result) && typeof problem.id === 'string' && problem.id) {
      progress = recordMiss(progress, problem.id, problem.topic);
      recorded = true;
    }
  }
  if (recorded) writeProgress(progress, storage);

  const weak = [...sections.values()]
    .filter((row) => row.earned < row.possible)
    .sort((left, right) => left.chapter - right.chapter || left.section.localeCompare(right.section))
    .map((row) => ({
      ...row,
      lessons: lessonsForSection(lessons, row.section, row.chapter),
    }));

  return {
    earned,
    possible,
    bonusEarned,
    bonusPossible,
    chapters: [...chapters.values()].sort((left, right) => left.chapter - right.chapter),
    weak,
    misses,
  };
}
