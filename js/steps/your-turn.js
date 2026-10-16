import { correctLine } from '../grade.js';

/** Similar-problem block: hint stays hidden until the student asks. The answer starts closed. */

export const YOUR_TURN_ATTEMPTS = 3;

export function answersMatch(typed, expected) {
  const fold = (value) => String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('×', 'x')
    .replaceAll('−', '-')
    .replace(/\s+/g, ' ');
  const left = fold(typed);
  const right = fold(expected);
  return left.length > 0 && left === right;
}

export function feedbackPlan(attempt, correct, why = '') {
  if (correct) return { done: true, showHint: false, showAnswer: false, text: correctLine(why) };
  const showAnswer = attempt >= YOUR_TURN_ATTEMPTS;
  return {
    done: showAnswer,
    showHint: true,
    showAnswer,
    text: showAnswer
      ? 'Not yet. The answer is below.'
      : 'Not yet. Use the hint and try again.',
  };
}

function answerText(paragraph) {
  return String(paragraph?.textContent ?? '').replace(/^\s*answer:\s*/i, '').trim();
}

function isLabeled(paragraph, label) {
  const strong = paragraph?.querySelector?.('strong');
  return String(strong?.textContent ?? '').trim().toLowerCase().startsWith(label);
}

function answerDetails(answer) {
  return answer?.closest?.('details') ?? null;
}

/** A closed details block already hides the answer. A bare paragraph is hidden. */
function concealAnswer(answer) {
  const details = answerDetails(answer);
  if (details) {
    details.open = false;
    return;
  }
  answer.hidden = true;
}

function revealAnswer(answer) {
  answer.hidden = false;
  const details = answerDetails(answer);
  if (details) details.open = true;
}

/**
 * Hide the hint and the answer in each "Your turn" section.
 * A Show hint button reveals the hint. A wrong check reveals the hint.
 * The answer stays hidden until the third miss.
 */
export function upgradeYourTurn(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const headings = root.querySelectorAll('h2');
  for (const heading of headings) {
    if (String(heading.textContent ?? '').trim() !== 'Your turn') continue;
    const section = heading.parentElement;
    if (!section || section.dataset?.yourTurn === 'ready') continue;
    const paragraphs = [...(section.querySelectorAll?.('p') ?? [])];
    const hint = paragraphs.find((paragraph) => isLabeled(paragraph, 'hint'));
    const answer = paragraphs.find((paragraph) => isLabeled(paragraph, 'answer'));
    if (!hint || !answer) continue;
    const doc = section.ownerDocument ?? root.ownerDocument;
    if (!doc?.createElement) continue;
    section.dataset.yourTurn = 'ready';
    section.dataset.answer = answerText(answer);
    section.dataset.attempts = '0';
    if (typeof section.className === 'string' && !section.className.includes('mm-your-turn')) {
      section.className = `${section.className} mm-your-turn`.trim();
    }
    hint.hidden = true;
    concealAnswer(answer);

    const controls = doc.createElement('div');
    controls.className = 'mm-your-turn-controls';
    const show = doc.createElement('button');
    show.type = 'button';
    show.textContent = 'Show hint';
    const label = doc.createElement('label');
    label.className = 'answer-label';
    label.textContent = 'Your answer';
    const input = doc.createElement('input');
    input.setAttribute('name', 'answer');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    const inputId = `your-turn-${Math.random().toString(36).slice(2, 8)}`;
    input.id = inputId;
    label.setAttribute('for', inputId);
    const check = doc.createElement('button');
    check.type = 'button';
    check.textContent = 'Check';
    const live = doc.createElement('p');
    live.className = 'feedback';
    live.setAttribute('aria-live', 'polite');
    live.dataset.yourTurnLive = 'true';
    controls.append(show, label, input, check, live);
    if (typeof hint.parentNode?.insertBefore === 'function') hint.parentNode.insertBefore(controls, hint);
    else section.append?.(controls);

    show.addEventListener('click', () => {
      hint.hidden = false;
    });
    check.addEventListener('click', () => {
      if (section.dataset.done === 'true') return;
      const correct = answersMatch(input.value, section.dataset.answer);
      const attempt = correct ? Number(section.dataset.attempts || '0') : Number(section.dataset.attempts || '0') + 1;
      if (!correct) section.dataset.attempts = String(attempt);
      const plan = feedbackPlan(attempt, correct, section.dataset?.why ?? '');
      if (plan.showHint) hint.hidden = false;
      if (plan.showAnswer) revealAnswer(answer);
      if (plan.done) {
        section.dataset.done = 'true';
        input.disabled = true;
      }
      live.textContent = plan.text;
    });
  }
}
