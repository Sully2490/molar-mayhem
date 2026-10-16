import { grade } from './grade.js';
import { PROGRESS_KEY } from './progress.js';
import { validateProblem } from './schema.js';

/** Short untimed drill. The timed final still uses the full practice-final set. */
export const PREP_COUNT = 10;
const WEAK_WEIGHT = 5;

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

let loadedProblems = [];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function isMissing(error) {
  return error?.status === 404 || error?.code === 'ENOENT';
}

/** Published practice final. Questions stay in this file, not in the player. */
export const FINAL_URL = 'content/final/practice-final.json';

/**
 * Load the practice final from content/final/practice-final.json.
 * The file may be problem objects, file names, `{ files }`, or `{ problems }`.
 * A named file may be one problem or `{ problems: [...] }`.
 * Questions are not stored in this module.
 * @param {(url: string) => Promise<string>} [fetchText]
 */
export async function loadFinalProblems(fetchText = browserFetchText) {
  let raw;
  try {
    raw = await fetchText(FINAL_URL);
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
  const index = JSON.parse(raw);
  return expandFinalIndex(index, fetchText);
}

/**
 * @param {unknown} index
 * @param {(url: string) => Promise<string>} fetchText
 */
export async function expandFinalIndex(index, fetchText) {
  const problems = await readIndex(index, fetchText);
  const seen = new Set();
  for (const problem of problems) {
    const errors = validateProblem(problem);
    if (errors.length > 0) {
      throw new Error(`content/final problem ${problem?.id ?? '(missing id)'}: ${errors[0]}`);
    }
    if (seen.has(problem.id)) throw new Error(`content/final repeats problem id ${problem.id}`);
    seen.add(problem.id);
  }
  return problems;
}

async function readIndex(index, fetchText) {
  if (Array.isArray(index)) {
    if (index.every((item) => typeof item === 'string')) {
      const groups = [];
      for (const name of index) {
        const text = await fetchText(`content/final/${name.replace(/^\//, '')}`);
        groups.push(...problemsFrom(JSON.parse(text), name));
      }
      return groups;
    }
    return index.flatMap((item) => problemsFrom(item, 'practice-final.json'));
  }
  if (index && Array.isArray(index.files)) return readIndex(index.files, fetchText);
  if (index && Array.isArray(index.problems)) {
    return index.problems.flatMap((item) => problemsFrom(item, 'practice-final.json'));
  }
  throw new Error('content/final/practice-final.json must list practice-final problems');
}

function problemsFrom(data, name) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.problems)) return data.problems;
  if (data && typeof data === 'object' && (data.q || data.check || data.id)) return [data];
  throw new Error(`content/final/${name} must be a problem or a list of problems`);
}

async function browserFetchText(url) {
  const response = await fetch(url);
  if (response.status === 404) {
    const error = new Error(`Missing ${url}`);
    error.status = 404;
    throw error;
  }
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.text();
}

/**
 * @param {Array<{id: string, ch?: number, q: string, a: string, why?: string, steps?: string[], check: object}>} items
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
      why: item.why ?? '',
      steps: Array.isArray(item.steps) ? item.steps : [],
    };
  });
}

export function renderSummary(rows) {
  const correct = rows.filter((row) => row.ok).length;
  const misses = rows.filter((row) => !row.ok);
  const cards = rows.map((row) => {
    const steps = row.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
    const stepList = steps ? `<ol class="steps">${steps}</ol>` : '';
    const mark = row.ok ? 'Correct' : 'Review this one';
    const chapter = Number.isInteger(row.ch) ? `Chapter ${row.ch} · ` : '';
    return `
      <article class="correction ${row.ok ? 'is-correct' : 'is-miss'}" data-result="${escapeHtml(row.id)}">
        <p class="kicker">${chapter}${mark}</p>
        <p>${escapeHtml(row.q)}</p>
        <p><strong>Your answer:</strong> ${escapeHtml(row.given || '(blank)')}</p>
        <p><strong>Key:</strong> ${escapeHtml(row.answer)}</p>
        <p><strong>Worked solution:</strong> ${escapeHtml(row.why)}</p>
        ${stepList}
      </article>`;
  }).join('');
  const missLine = misses.length === 0
    ? 'Every answer matched the key.'
    : `${misses.length} ${misses.length === 1 ? 'item needs' : 'items need'} another look. The worked solution is under each one.`;
  return `
    <h2>Corrections</h2>
    <p class="feedback" data-score>${correct} of ${rows.length} match the key. ${missLine}</p>
    ${cards}
    <p><button type="button" class="table-btn" data-retry>Try the drill again</button></p>
  `;
}

/**
 * Problem ids the student has missed. `progress.missed` is a list of ids.
 * `progress.misses` may be that list or a map of id to count.
 * readProgress() drops these fields, so callers can pass the raw saved object.
 */
export function missedIdsFrom(progress) {
  const ids = new Set();
  const add = (id) => {
    if (typeof id === 'string' && id) ids.add(id);
  };
  if (Array.isArray(progress?.missed)) progress.missed.forEach(add);
  const misses = progress?.misses;
  if (Array.isArray(misses)) misses.forEach(add);
  else if (misses && typeof misses === 'object') {
    for (const [id, count] of Object.entries(misses)) {
      if (count) add(id);
    }
  }
  return ids;
}

export function randomFromSeed(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return function random() {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedSample(pool, count, random) {
  const bag = pool.map((entry) => ({ ...entry }));
  const chosen = [];
  const limit = Math.min(count, bag.length);
  while (chosen.length < limit) {
    const total = bag.reduce((sum, entry) => sum + entry.weight, 0);
    let ticket = random() * total;
    let index = bag.length - 1;
    for (let i = 0; i < bag.length; i += 1) {
      ticket -= bag[i].weight;
      if (ticket <= 0) {
        index = i;
        break;
      }
    }
    chosen.push(bag[index]);
    bag.splice(index, 1);
  }
  return chosen;
}

/**
 * About 10 mixed questions from the practice-final bank.
 * Missed ids weigh more than the rest. The same seed draws the same set.
 * A bank of 10 or fewer is returned in full, still untimed.
 */
export function selectPrep(problems, progress = {}, options = {}) {
  const list = [...(problems ?? [])];
  const count = Math.min(options.count ?? PREP_COUNT, list.length);
  if (count === list.length) return list;
  const random = options.random
    ?? (options.seed == null ? Math.random : randomFromSeed(options.seed));
  const weak = missedIdsFrom(progress);
  const pool = list
    .map((item) => ({ item, weight: weak.has(item.id) ? WEAK_WEIGHT : 1 }))
    .sort((left, right) => String(left.item.id).localeCompare(String(right.item.id)));
  return weightedSample(pool, count, random)
    .map((entry) => entry.item)
    .sort((left, right) => (
      (Number(left.ch) || 0) - (Number(right.ch) || 0)
      || String(left.id).localeCompare(String(right.id))
    ));
}

function readStoredProgress() {
  try {
    const store = globalThis.localStorage;
    if (!store) return {};
    const raw = store.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function renderPrepPage(problems = [], message = '', options = {}) {
  const progress = options.progress ?? readStoredProgress();
  const drawn = selectPrep(problems, progress, options);
  loadedProblems = drawn;
  const notice = message
    ? `<p class="feedback" data-prep-status>${escapeHtml(message)}</p>`
    : '';
  if (drawn.length === 0) {
    return `
      <section class="page" data-route="Prep">
        <p class="kicker">Practice final</p>
        <h1>Short drill</h1>
        <p>This drill is untimed. It draws about 10 mixed questions from the practice final.</p>
        ${notice}
        <p data-prep-empty>No practice-final questions are published yet.</p>
        <div class="feedback" data-summary hidden aria-live="polite"></div>
      </section>`;
  }

  const sections = groupProblems(drawn).map(([ch, items]) => {
    const questions = items.map((item) => `
      <div class="final-q">
        <p><strong>${item.number}.</strong> ${escapeHtml(item.q)}</p>
        <label class="answer-label" for="final-${item.number}">Your answer</label>
        <input id="final-${item.number}" name="${escapeHtml(item.id)}" data-qid="${escapeHtml(item.id)}" autocomplete="off" autocapitalize="off" spellcheck="false">
      </div>`).join('');
    const heading = ch == null
      ? ''
      : `<h2>Chapter ${ch}: ${escapeHtml(CHAPTER_TITLES[ch] ?? '')}</h2>`;
    return `<section class="final-ch">${heading}${questions}</section>`;
  }).join('');

  const countLabel = drawn.length === 1 ? '1 mixed question' : `${drawn.length} mixed questions`;
  return `
    <section class="page" data-route="Prep">
      <p class="kicker">Practice final</p>
      <h1>Short drill</h1>
      <p>This drill is untimed. You get ${countLabel} from the practice final. Questions you have missed show up more often. The timed final is the full set.</p>
      <ol data-prep-plan>
        <li>Work each question by hand.</li>
        <li>Submit once. The worked solution is under each item.</li>
        <li>Take the timed final when you want every question.</li>
      </ol>
      <p class="fine">Original problems. Textbook reference: OpenStax Chemistry: Atoms First 2e.</p>
      ${notice}
      <form data-final data-prep-count="${drawn.length}">
        ${sections}
        <p><button type="submit" class="table-btn">Submit the drill</button></p>
      </form>
      <div class="feedback" data-summary hidden aria-live="polite"></div>
    </section>`;
}

function groupProblems(problems) {
  const numbered = problems.map((problem, index) => ({ ...problem, number: index + 1 }));
  const grouped = numbered.every((problem) => Number.isInteger(problem.ch));
  if (!grouped) return [[null, numbered]];
  const byChapter = new Map();
  for (const problem of numbered) {
    if (!byChapter.has(problem.ch)) byChapter.set(problem.ch, []);
    byChapter.get(problem.ch).push(problem);
  }
  return [...byChapter.entries()];
}

export function bindPrep(root) {
  if (root.dataset.prepBound === 'yes') return;
  root.dataset.prepBound = 'yes';
  root.addEventListener('submit', (event) => {
    const form = event.target instanceof Element ? event.target.closest('[data-final]') : null;
    if (!form || !root.contains(form)) return;
    event.preventDefault();
    const summary = root.querySelector('[data-summary]');
    const responses = {};
    for (const input of form.querySelectorAll('[data-qid]')) {
      responses[input.getAttribute('data-qid')] = input.value;
    }
    summary.innerHTML = renderSummary(scoreFinal(loadedProblems, responses));
    summary.hidden = false;
    form.hidden = true;
  });
  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('[data-retry]')) return;
    const form = root.querySelector('[data-final]');
    const summary = root.querySelector('[data-summary]');
    if (!form || !summary) return;
    form.hidden = false;
    summary.hidden = true;
    summary.innerHTML = '';
    form.reset();
  });
}
