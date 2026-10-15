import catalog from '../../content/lab-help.json' with { type: 'json' };
import { templateById } from '../../content/templates/index.js';
import { generateFromSeed, generateProblem } from '../generate.js';
import { grade } from '../grade.js';
import { ATTEMPTS, feedbackFor, labelFor } from '../learn.js';
import { escapeHtml } from './html.js';

export { ATTEMPTS };

export function labHelpCategories() {
  return catalog.categories;
}

export function categoryFor(tool) {
  return labHelpCategories().find((item) => item.tool === tool) ?? null;
}

export function practiceKey(tool, index) {
  return `${tool}:${index}`;
}

export function practiceProblems(category) {
  return category.practice.map((item, index) => {
    const problem = item.template
      ? generateFromSeed(templateById(item.template), item.seed)
      : generateProblem(item.problem);
    return { ...problem, index };
  });
}

export function helpAfterCheck(help, tool, index, input, problem) {
  const key = practiceKey(tool, index);
  const state = help ?? {};
  const prior = state.notes?.[key];
  if (prior?.done) return state;
  const result = grade(input, problem.check);
  const attempt = result.ok ? (state.tries?.[key] ?? 0) : (state.tries?.[key] ?? 0) + 1;
  const feedback = feedbackFor(result, Math.max(attempt, 1), problem);
  return {
    ...state,
    tries: { ...(state.tries ?? {}), [key]: attempt },
    notes: { ...(state.notes ?? {}), [key]: feedback },
    drafts: { ...(state.drafts ?? {}), [key]: input },
  };
}

function sectionMarks(refs) {
  return refs.map((ref) => {
    const mark = String(ref).match(/§\d+\.\d+/);
    return mark ? mark[0] : String(ref);
  }).join(' · ');
}

function lessonHref(id) {
  return `#Learn/${encodeURIComponent(id)}`;
}

function toneFor(status) {
  if (status === 'correct') return 'ok';
  if (status === 'solution') return 'solution';
  if (status === 'near') return 'hint';
  return 'bad';
}

function renderWorked(worked) {
  const steps = (worked.steps ?? []).map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  return `
    <h3>Worked example</h3>
    <p>${escapeHtml(worked.q)}</p>
    <ol>${steps}</ol>
    <p><strong>Answer:</strong> ${escapeHtml(worked.answer)}</p>
  `;
}

function renderPractice(tool, problems, help) {
  const items = problems.map((problem) => {
    const key = practiceKey(tool, problem.index);
    const note = help.notes?.[key];
    const draft = help.drafts?.[key] ?? '';
    const done = Boolean(note?.done);
    const feedback = note
      ? `<p class="lab-msg" data-tone="${toneFor(note.status)}" role="status">${escapeHtml(note.text)}</p>`
      : '';
    return `
      <li data-practice="${problem.index}">
        <p>${escapeHtml(problem.q)}</p>
        <label>${escapeHtml(labelFor(problem))}
          <input type="text" data-help-input="${problem.index}" data-focus="help-${problem.index}" value="${escapeHtml(draft)}" ${done ? 'disabled' : ''} autocomplete="off">
        </label>
        <button type="button" data-action="help-check" data-practice="${problem.index}" ${done ? 'disabled' : ''}>Check</button>
        ${feedback}
      </li>
    `;
  }).join('');
  return `<h3>Practice</h3><ol class="lab-practice">${items}</ol>`;
}

export function renderLabHelp(tool, help = {}) {
  const category = categoryFor(tool);
  if (!category) return '';
  const problems = practiceProblems(category);
  const open = help.open ? ' open' : '';
  const links = [
    `<a href="${lessonHref(category.lessonId)}">${escapeHtml(category.lessonLabel)}</a>`,
    ...(category.also ?? []).map((item) => `<a href="${lessonHref(item.id)}">${escapeHtml(item.label)}</a>`),
  ].join(' · ');
  return `
    <details class="lab-help" data-lab-help="${escapeHtml(tool)}"${open}>
      <summary>Help: ${escapeHtml(category.title)}</summary>
      <p class="lab-cite">OpenStax Chemistry: Atoms First 2e ${escapeHtml(sectionMarks(category.openstax))}.</p>
      <h3>Tutor hint</h3>
      <ol>${category.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      ${renderWorked(category.worked)}
      ${renderPractice(tool, problems, help)}
      <p class="lab-fine">Lesson: ${links}</p>
    </details>
  `;
}

export function renderPracticeItem(tool, problem, help = {}) {
  return renderPractice(tool, [problem], help);
}
