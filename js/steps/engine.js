import { correctLine, grade, SIGFIG_HINT, withinRelativePercent, DEFAULT_RELATIVE_PERCENT } from '../grade.js';
import { diagnose } from '../diagnose.js';

/** Same attempt count as the Learn player. The third miss reveals the step. */
export const ATTEMPTS = 3;

/** A single worked step never adds points. */
export const STEP_XP = 0;

/** A clean finish awards the same points as one drill problem. */
export const PROBLEM_XP = 10;

export function stepExpected(step) {
  return step?.expected ?? step?.answer ?? '';
}

export function stepCheck(step) {
  return step?.check;
}

/**
 * Context for diagnose from data stored on the step or the problem.
 * Functions such as recompute are copied when a caller put them on the object.
 */
export function ctxFor(problem, step = {}) {
  const fromProblem = problem?.ctx ?? {};
  const fromStep = step?.ctx ?? {};
  return {
    ...fromProblem,
    ...fromStep,
    overcount: step?.overcount ?? fromStep.overcount ?? fromProblem.overcount,
    ratio: step?.ratio ?? fromStep.ratio ?? fromProblem.ratio,
    coefficients: step?.coefficients ?? fromStep.coefficients ?? fromProblem.coefficients,
    recompute: step?.recompute ?? fromStep.recompute ?? fromProblem.recompute,
    problem,
    check: step?.check ?? problem?.check,
  };
}

export function createSession(problem) {
  const count = problem?.guided?.length ?? 0;
  return {
    index: 0,
    misses: 0,
    correct: Array(count).fill(false),
    revealed: Array(count).fill(false),
    notes: Array(count).fill(''),
    revealedAny: false,
    finished: count === 0,
    xpGiven: false,
  };
}

function advance(session, problem) {
  session.misses = 0;
  session.index += 1;
  if (session.index >= (problem.guided?.length ?? 0)) {
    session.index = problem.guided.length;
    session.finished = true;
  }
}

export function xpFor(session) {
  if (!session?.finished || session.revealedAny) return STEP_XP;
  return PROBLEM_XP;
}

/**
 * Grade the active step. A miss returns the hint and any diagnosis.
 * The third miss reveals stepExpected and unlocks the next step.
 */
export function submitStep(problem, session, input) {
  const steps = problem?.guided ?? [];
  if (session.finished || session.index >= steps.length) {
    return {
      ok: false,
      feedback: '',
      diagnosis: null,
      revealed: false,
      finished: true,
      attempt: session.misses,
      xp: xpFor(session),
    };
  }
  const step = steps[session.index];
  const check = stepCheck(step);
  const result = grade(input, check);
  if (result.reason === 'sigfigs') {
    return {
      ok: false,
      feedback: result.hint || SIGFIG_HINT,
      diagnosis: null,
      revealed: false,
      finished: false,
      attempt: session.misses,
      xp: STEP_XP,
    };
  }
  if (result.ok) {
    session.correct[session.index] = true;
    advance(session, problem);
    return {
      ok: true,
      feedback: correctLine(step.why),
      diagnosis: null,
      revealed: false,
      finished: session.finished,
      attempt: 0,
      xp: xpFor(session),
    };
  }
  const diagnosis = diagnose(input, check, problem.mistakes ?? [], ctxFor(problem, step));
  session.misses += 1;
  if (session.misses >= ATTEMPTS) {
    session.revealed[session.index] = true;
    session.revealedAny = true;
    const expected = stepExpected(step);
    const hint = step.hint ? ` ${step.hint}` : '';
    advance(session, problem);
    return {
      ok: false,
      feedback: `Solution: ${expected}.${hint}`,
      diagnosis,
      revealed: true,
      finished: session.finished,
      attempt: ATTEMPTS,
      xp: xpFor(session),
    };
  }
  const hint = step.hint || 'Check this step and try again.';
  const extra = diagnosis ? ` ${diagnosis.message}` : '';
  return {
    ok: false,
    feedback: `Not yet. ${hint}${extra}`,
    diagnosis,
    revealed: false,
    finished: false,
    attempt: session.misses,
    xp: STEP_XP,
  };
}

export function lastStepMatchesProblem(problem) {
  const steps = problem?.guided ?? [];
  const last = steps[steps.length - 1];
  if (!last || problem?.check?.kind !== 'numeric' || last.check?.kind !== 'numeric') return true;
  const percent = problem.check.tolerance ?? last.check.tolerance ?? DEFAULT_RELATIVE_PERCENT;
  return withinRelativePercent(last.check.value, problem.check.value, percent);
}
