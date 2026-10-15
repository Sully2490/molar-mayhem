import schema from '../content/schema.json' with { type: 'json' };

export const LESSON_FIELDS = schema.required;

const CHECK_KINDS = new Set(schema.$defs.check.properties.kind.enum);
const CASE_RULES = new Set(schema.$defs.check.properties.case.enum);

export function validateLesson(lesson) {
  const errors = [];
  if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) {
    return ['Lesson must be an object'];
  }
  for (const field of LESSON_FIELDS) {
    if (lesson[field] === undefined) errors.push(`Missing ${field}`);
  }
  if (lesson.ch !== undefined && (!Number.isInteger(lesson.ch) || lesson.ch < 1 || lesson.ch > 9)) {
    errors.push('ch must be an integer from 1 to 9');
  }
  if (lesson.steps !== undefined && (!Array.isArray(lesson.steps) || lesson.steps.length === 0 || lesson.steps.some((step) => typeof step !== 'string' || step.length === 0))) {
    errors.push('steps must be a non-empty list of strings');
  }
  const example = lesson.worked_example;
  if (example !== undefined && (typeof example?.q !== 'string' || typeof example?.answer !== 'string')) {
    errors.push('worked_example needs q and answer');
  }
  const similar = lesson.similar_problem;
  if (similar !== undefined && (typeof similar?.q !== 'string' || typeof similar?.hint !== 'string' || typeof similar?.answer !== 'string')) {
    errors.push('similar_problem needs q, hint, and answer');
  }
  if (lesson.sources !== undefined && !Array.isArray(lesson.sources)) {
    errors.push('sources must be a list');
  }
  if (lesson.problems !== undefined) {
    if (!Array.isArray(lesson.problems)) errors.push('problems must be a list');
    else lesson.problems.forEach((problem, index) => {
      for (const error of validateProblem(problem)) errors.push(`problems[${index}]: ${error}`);
    });
  }
  return errors;
}

export function validateProblem(problem) {
  const errors = [];
  for (const field of ['id', 'q', 'a', 'why', 'hints', 'check']) {
    if (problem?.[field] === undefined) errors.push(`Missing ${field}`);
  }
  if (problem?.hints !== undefined && !Array.isArray(problem.hints)) errors.push('hints must be a list');
  if (problem?.check !== undefined && !CHECK_KINDS.has(problem.check.kind)) {
    errors.push('check.kind must be numeric, exact, set, or config');
  }
  if (problem?.check?.case !== undefined && !CASE_RULES.has(problem.check.case)) {
    errors.push('check.case must be insensitive, sensitive, or formula');
  }
  return errors;
}
