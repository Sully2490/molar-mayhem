import { showToast } from './celebrate.js';
import { grade } from './grade.js';
import { awardXp, readProgress, writeProgress } from './progress.js';

export const DRILL_ITEMS = [
  {
    id: 'drill-na-protons',
    q: 'How many protons are in one sodium atom?',
    a: '11',
    why: 'Sodium’s atomic number is 11, so each atom has 11 protons.',
    hints: ['The atomic number is the proton count.'],
    check: { kind: 'numeric', value: 11 },
  },
  {
    id: 'drill-water',
    q: 'Write the chemical formula for water.',
    a: 'H2O',
    why: 'A water molecule has two hydrogen atoms and one oxygen atom.',
    hints: ['Two H and one O.'],
    check: { kind: 'exact', text: 'H2O' },
  },
  {
    id: 'drill-share',
    q: 'Do atoms in a covalent bond share electrons or transfer them? Answer share or transfer.',
    a: 'share',
    why: 'A covalent bond is a shared pair of electrons.',
    hints: ['Covalent means the electrons are shared.'],
    check: { kind: 'exact', text: 'share', case: 'insensitive' },
  },
  {
    id: 'drill-mole',
    q: 'What counting unit holds 6.022 × 10²³ particles?',
    a: 'mole',
    why: 'One mole of anything is 6.022 × 10²³ particles.',
    hints: ['It is the unit used with molar mass.'],
    check: { kind: 'exact', text: 'mole', case: 'insensitive' },
  },
];

export function nextQueue(queue, id, correct) {
  const rest = queue.filter((item) => item !== id);
  if (!correct) rest.push(id);
  return rest;
}

export function firstDrill() {
  return DRILL_ITEMS[0];
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
      <p>A miss comes back at the end of the queue.</p>
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

export function bindDrill(root, storage) {
  if (bound.has(root)) return;
  bound.add(root);
  let queue = DRILL_ITEMS.map((item) => item.id);
  const misses = new Map();

  root.addEventListener('submit', (event) => {
    const form = event.target.closest?.('[data-drill]');
    if (!form || !root.contains(form) || form.hasAttribute('data-unit-problem')) return;
    event.preventDefault();
    const host = root.querySelector('[data-drill-queue]');
    if (!host) return;
    const id = form.getAttribute('data-drill');
    const item = DRILL_ITEMS.find((entry) => entry.id === id);
    if (!item) return;
    const input = form.querySelector('[name="answer"]');
    const result = grade(input?.value ?? '', item.check);
    if (result.ok) {
      const progress = awardXp(readProgress(storage), 10);
      writeProgress(progress, storage);
      queue = nextQueue(queue, id, true);
      showToast(root, 'Correct. +10 XP.');
      host.outerHTML = renderDrillQueue(DRILL_ITEMS.find((entry) => entry.id === queue[0]) ?? null, 'Correct. +10 XP.');
      return;
    }
    const used = (misses.get(id) ?? 0) + 1;
    misses.set(id, used);
    const hint = used >= 3
      ? `Solution: ${item.a}. ${item.why}`
      : `Not yet. ${item.hints[0]}`;
    queue = nextQueue(queue, id, used >= 3);
    const next = DRILL_ITEMS.find((entry) => entry.id === queue[0]) ?? null;
    host.outerHTML = renderDrillQueue(next, hint);
  });
}
