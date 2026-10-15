import { PRECACHE_PATHS } from '../offline/precache.js';

export const CONTENT_PATHS = PRECACHE_PATHS.filter((path) => (
  path.startsWith('content/')
  && path.endsWith('.json')
  && !path.endsWith('/schema.json')
  && !path.startsWith('content/terms/')
  && path !== 'content/lab-help.json'
));

export function recordsFromPayload(path, data) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) {
    if (String(path).includes('/terms/')) return data.flatMap((item) => recordsFromTerm(item));
    return [];
  }
  if (String(path).includes('/terms/') || isTerm(data)) {
    const own = recordsFromTerm(data);
    const nested = Array.isArray(data.terms) ? data.terms.flatMap((item) => recordsFromTerm(item)) : [];
    return [...own, ...nested];
  }
  if (Array.isArray(data.terms)) return data.terms.flatMap((item) => recordsFromTerm(item));
  return recordsFromLesson(data);
}

export function recordsFromTerm(term) {
  if (!term || typeof term.term !== 'string' || term.term.trim() === '') return [];
  const id = typeof term.id === 'string' && term.id ? term.id : slug(term.term);
  return [{
    id: `term:${id}`,
    kind: 'term',
    title: term.term,
    text: String(term.definition ?? term.text ?? ''),
    href: typeof term.href === 'string' ? term.href : '#Learn',
    chapter: term.ch ?? null,
  }];
}

export function recordsFromLesson(lesson) {
  if (!lesson || typeof lesson.id !== 'string') return [];
  if (typeof lesson.guide_line !== 'string' && !Array.isArray(lesson.problems)) return [];
  const href = `#Learn/${encodeURIComponent(lesson.id)}`;
  const records = [];
  if (typeof lesson.guide_line === 'string') {
    const parts = [
      lesson.guide_line,
      lesson.openstax_section,
      ...(lesson.steps ?? []),
      lesson.worked_example?.q,
      lesson.similar_problem?.q,
    ];
    records.push({
      id: `lesson:${lesson.id}`,
      kind: 'lesson',
      title: lesson.guide_line,
      text: parts.filter((part) => typeof part === 'string').join(' '),
      href,
      chapter: lesson.ch ?? null,
    });
  }
  for (const problem of lesson.problems ?? []) {
    if (!problem || typeof problem.id !== 'string' || typeof problem.q !== 'string') continue;
    records.push({
      id: `problem:${problem.id}`,
      kind: 'problem',
      title: problem.q,
      text: [lesson.guide_line, problem.q].filter((part) => typeof part === 'string').join(' '),
      href,
      chapter: lesson.ch ?? null,
      problemId: problem.id,
    });
  }
  return records;
}

export async function loadRecords(fetchImpl, paths = CONTENT_PATHS) {
  const loaded = await Promise.all(paths.map(async (path) => {
    try {
      const response = await fetchImpl(path);
      if (!response?.ok) return [];
      return recordsFromPayload(path, await response.json());
    } catch {
      return [];
    }
  }));
  const terms = await loadTermRecords(fetchImpl);
  return [...loaded.flat(), ...terms];
}

/** Read content/terms/index.json when that folder exists. A missing folder yields no terms. */
export async function loadTermRecords(fetchImpl) {
  try {
    const response = await fetchImpl('content/terms/index.json');
    if (!response?.ok) return [];
    const listed = await response.json();
    if (!Array.isArray(listed)) return recordsFromPayload('content/terms/index.json', listed);
    const files = await Promise.all(listed.map(async (name) => {
      if (typeof name !== 'string' || !name.endsWith('.json') || name.includes('..') || name.includes('/')) return [];
      const path = `content/terms/${name}`;
      try {
        const file = await fetchImpl(path);
        if (!file?.ok) return [];
        return recordsFromPayload(path, await file.json());
      } catch {
        return [];
      }
    }));
    return files.flat();
  } catch {
    return [];
  }
}

function isTerm(data) {
  return typeof data.term === 'string' && (typeof data.definition === 'string' || typeof data.text === 'string');
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'term';
}
