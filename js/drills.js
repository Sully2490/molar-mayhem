import { showToast } from './celebrate.js';
import { grade } from './grade.js';
import { awardXp, readProgress, writeProgress } from './progress.js';

export function drillsFromLessons(lessons) {
  const items = [];
  for (const lesson of lessons ?? []) {
    for (const problem of lesson?.problems ?? []) {
      if (!problem || typeof problem.id !== 'string' || typeof problem.q !== 'string') continue;
      if (typeof problem.a !== 'string' || !problem.check || typeof problem.check !== 'object') continue;
      const hints = Array.isArray(problem.hints) && problem.hints.length
        ? problem.hints
        : ['Check the lesson and try again.'];
      items.push({
        id: problem.id,
        q: problem.q,
        a: problem.a,
        why: typeof problem.why === 'string' ? problem.why : '',
        hints,
        check: problem.check,
      });
    }
  }
  return items;
}

/**
 * Drop a correct id. A miss is weighted: one copy comes back next, and extra
 * copies follow the rest of the queue. `misses` is how many times it was missed.
 */
export function nextQueue(queue, id, correct, misses = 1) {
  const rest = queue.filter((item) => item !== id);
  if (correct) return rest;
  const copies = Math.min(Math.max(misses, 1) + 1, 4);
  const soon = rest.slice(0, 1);
  const later = rest.slice(1);
  const weighted = Array.from({ length: copies }, () => id);
  return [...soon, weighted[0], ...later, ...weighted.slice(1)];
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderDrillQueue(item, note = '') {
  const noteHtml = `<p class="feedback" data-drill-note aria-live="polite">${escapeHtml(note)}</p>`;
  if (!item) {
    return `<section data-drill-queue><h2>Extra practice</h2>${noteHtml}<p data-drill-empty>Queue clear.</p></section>`;
  }
  const inputId = `drill-${item.id}`;
  const liveId = `drill-live-${item.id}`;
  return `
    <section data-drill-queue>
      <h2>Extra practice</h2>
      <p>A miss comes back sooner, and it shows up more than once.</p>
      ${noteHtml}
      <form class="problem" data-drill="${escapeHtml(item.id)}">
        <p id="q-${escapeHtml(item.id)}">${escapeHtml(item.q)}</p>
        <div class="answer-row">
          <div class="answer-field">
            <label class="answer-label" for="${inputId}">Your answer</label>
            <input id="${inputId}" name="answer" autocomplete="off" aria-describedby="${liveId}">
          </div>
          <button type="submit">Check</button>
        </div>
        <p class="feedback" id="${liveId}" aria-live="polite"></p>
      </form>
    </section>
  `;
}

const bound = new WeakSet();

export function bindDrill(root, storage, items = []) {
  if (bound.has(root)) return;
  bound.add(root);
  const bank = items;
  let queue = bank.map((item) => item.id);
  const misses = new Map();

  root.addEventListener('submit', (event) => {
    const form = event.target.closest?.('[data-drill]');
    if (!form || !root.contains(form) || form.hasAttribute('data-unit-problem')) return;
    event.preventDefault();
    const host = root.querySelector('[data-drill-queue]');
    if (!host) return;
    const id = form.getAttribute('data-drill');
    const item = bank.find((entry) => entry.id === id);
    if (!item) return;
    const input = form.querySelector('[name="answer"]');
    const result = grade(input?.value ?? '', item.check);
    if (result.ok) {
      const progress = awardXp(readProgress(storage), 10);
      writeProgress(progress, storage);
      queue = nextQueue(queue, id, true);
      showToast(root, 'Correct. +10 XP.');
      host.outerHTML = renderDrillQueue(bank.find((entry) => entry.id === queue[0]) ?? null, 'Correct. +10 XP.');
      return;
    }
    const used = (misses.get(id) ?? 0) + 1;
    misses.set(id, used);
    const hint = used >= 3
      ? `Solution: ${item.a}. ${item.why}`
      : `Not yet. ${item.hints[0]}`;
    const drop = used >= 3;
    queue = nextQueue(queue, id, drop, used);
    const next = bank.find((entry) => entry.id === queue[0]) ?? null;
    host.outerHTML = renderDrillQueue(next, hint);
  });
}
