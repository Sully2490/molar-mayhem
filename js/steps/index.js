import { startPageUpgrades } from '../math/upgrade.js';

export {
  ATTEMPTS,
  PROBLEM_XP,
  STEP_XP,
  createSession,
  ctxFor,
  lastStepMatchesProblem,
  stepCheck,
  stepExpected,
  submitStep,
  xpFor,
} from './engine.js';
export { bindGuided, guidedInner, renderGuided } from './render.js';
export { answersMatch, feedbackPlan, upgradeYourTurn, YOUR_TURN_ATTEMPTS } from './your-turn.js';

if (typeof document !== 'undefined') startPageUpgrades(document);
