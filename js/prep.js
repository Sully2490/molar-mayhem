import { grade } from './grade.js';
import { CHAPTER_TITLES, FINAL_EXAM } from './final-exam.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Grade each written response. A missing response is an empty string.
 * @param {Array<{id: string, ch: number, q: string, a: string, steps: string[], check: object}>} items
 * @param {Record<string, string>} responses
 */
export function scoreFinal(items, responses) {
  return items.map((item) => {
    const given = responses[item.id] ?? '';
    const result = grade(given, item.check);
    return {
      id: item.id,
      ch: item.ch,
      q: item.q,
      ok: result.ok === true,
      given,
      answer: item.a,
      steps: item.steps,
    };
  });
}

export function renderSummary(rows) {
  const correct = rows.filter((row) => row.ok).length;
  const misses = rows.filter((row) => !row.ok);
  const cards = rows.map((row) => {
    const steps = row.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
    const mark = row.ok ? 'Correct' : 'Review this one';
    return `
      <article class="correction ${row.ok ? 'is-correct' : 'is-miss'}" data-result="${row.id}">
        <p class="kicker">Chapter ${row.ch} · ${mark}</p>
        <p>${escapeHtml(row.q)}</p>
        <p><strong>Your answer:</strong> ${escapeHtml(row.given || '(blank)')}</p>
        <p><strong>Key:</strong> ${escapeHtml(row.answer)}</p>
        <ol class="steps">${steps}</ol>
      </article>`;
  }).join('');
  const missLine = misses.length === 0
    ? 'Every answer matched the key.'
    : `${misses.length} ${misses.length === 1 ? 'item needs' : 'items need'} another look. The steps are under each one.`;
  return `
    <h2>Corrections</h2>
    <p class="feedback" data-score>${correct} of ${rows.length} match the key. ${missLine}</p>
    ${cards}
    <p><button type="button" class="table-btn" data-retry>Try the final again</button></p>
  `;
}

export function renderPrep() {
  const byChapter = new Map();
  for (const item of FINAL_EXAM) {
    if (!byChapter.has(item.ch)) byChapter.set(item.ch, []);
    byChapter.get(item.ch).push(item);
  }
  const chapters = [...byChapter.entries()].map(([ch, items]) => {
    const questions = items.map((item, index) => `
      <div class="final-q">
        <p><strong>${index + 1}.</strong> ${escapeHtml(item.q)}</p>
        <p class="fine">${escapeHtml(item.section)}</p>
        <label class="answer-label" for="${item.id}">Your answer</label>
        <input id="${item.id}" name="${item.id}" data-qid="${item.id}" autocomplete="off">
      </div>
    `).join('');
    return `
      <section class="final-ch">
        <h2>Chapter ${ch}: ${escapeHtml(CHAPTER_TITLES[ch] ?? '')}</h2>
        ${questions}
      </section>
    `;
  }).join('');

  return `
    <section class="page" data-route="Prep">
      <p class="kicker">Practice final</p>
      <h1>Chapters 1–9</h1>
      <p>This final is untimed. Work each item by hand, then submit once. Chapters 5 and 7 have more questions than the other chapters.</p>
      <p class="fine">Original problems. Textbook reference: OpenStax Chemistry: Atoms First 2e.</p>
      <form data-final>
        ${chapters}
        <p><button type="submit" class="table-btn">Submit the final</button></p>
      </form>
      <div class="feedback" data-summary hidden aria-live="polite"></div>
    </section>
  `;
}

export function bindPrep(root) {
  if (root.dataset.prepBound === 'yes') return;
  root.dataset.prepBound = 'yes';
  root.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-final]');
    if (!form) return;
    event.preventDefault();
    const summary = root.querySelector('[data-summary]');
    const responses = {};
    for (const input of form.querySelectorAll('[data-qid]')) {
      responses[input.getAttribute('data-qid')] = input.value;
    }
    summary.innerHTML = renderSummary(scoreFinal(FINAL_EXAM, responses));
    summary.hidden = false;
    form.hidden = true;
  });
  root.addEventListener('click', (event) => {
    if (!event.target.closest('[data-retry]')) return;
    const form = root.querySelector('[data-final]');
    const summary = root.querySelector('[data-summary]');
    if (!form || !summary) return;
    form.hidden = false;
    summary.hidden = true;
    summary.innerHTML = '';
    form.reset();
  });
}
