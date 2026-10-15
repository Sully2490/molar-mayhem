import { collapseWhitespace, normalizeSymbols } from '../grade.js';
import { RECALL_DECKS } from '../../content/terms/recall/index.js';
import { escapeHtml } from './html.js';

export { RECALL_DECKS };

/**
 * Fold formulas, charges, and ordinary names onto one comparison key.
 * @param {string} text
 */
export function looseKey(text) {
  return collapseWhitespace(normalizeSymbols(text))
    .toLowerCase()
    .replace(/degrees|degree/g, '')
    .replace(/°/g, '')
    .replace(/[\s,^_{}[\]()]/g, '')
    .replace(/≈/g, '')
    .replace(/([+-])(\d+)$/, '$2$1');
}

export function splitRecallList(raw) {
  return String(raw ?? '')
    .split(/[,;\n]|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function answerHits(input, accepts) {
  const key = looseKey(input);
  if (!key) return false;
  return accepts.some((accept) => looseKey(accept) === key);
}

/**
 * @param {object} card
 * @param {string} input
 */
export function checkCard(card, input) {
  if (card.kind === 'list') return checkList(card, input);
  return checkItem(card, input);
}

function checkList(card, input) {
  const parts = splitRecallList(input);
  const matched = new Set();
  const extras = [];
  const hints = [];
  for (const part of parts) {
    const hit = card.items.find((item) => !matched.has(item.id) && answerHits(part, item.accepts));
    if (hit) {
      matched.add(hit.id);
      continue;
    }
    const near = (card.nearMiss ?? []).find((entry) => answerHits(part, [entry.text, ...(entry.accepts ?? [])]));
    if (near?.hint) hints.push(near.hint);
    extras.push(part);
  }
  const missing = card.items.filter((item) => !matched.has(item.id));
  return {
    ok: parts.length > 0 && missing.length === 0 && extras.length === 0,
    missing: missing.map((item) => item.label),
    extras,
    hints,
    official: card.items.map((item) => item.label),
    matched: matched.size,
    total: card.items.length,
  };
}

function checkItem(card, input) {
  const accepts = card.accepts ?? [card.answer];
  const ok = answerHits(input, accepts);
  const typed = collapseWhitespace(input);
  const near = (card.nearMiss ?? []).find((entry) => answerHits(input, [entry.text, ...(entry.accepts ?? [])]));
  return {
    ok,
    missing: ok ? [] : [card.answer],
    extras: ok || !typed ? [] : [typed],
    hints: !ok && near?.hint ? [near.hint] : [],
    official: [card.answer],
    matched: ok ? 1 : 0,
    total: 1,
  };
}

export function deckById(id, decks = RECALL_DECKS) {
  return decks.find((deck) => deck.id === id) ?? null;
}

/**
 * @param {object} deck
 */
export function startRecall(deck) {
  return {
    deckId: deck.id,
    title: deck.title,
    intro: deck.intro,
    cards: deck.cards.slice(),
    index: 0,
    phase: 'ask',
    correct: 0,
    missed: 0,
    log: [],
    pending: null,
  };
}

export function currentCard(session) {
  if (session.phase === 'done') return null;
  return session.cards[session.index] ?? null;
}

/**
 * A matching answer counts and advances. Anything else stays for a self-check.
 * @param {ReturnType<typeof startRecall>} session
 * @param {string} input
 */
export function submitAnswer(session, input) {
  if (session.phase === 'done') return session;
  const card = session.cards[session.index];
  const result = checkCard(card, input);
  if (result.ok) return finish(session, card, true, result);
  return { ...session, phase: 'review', pending: result };
}

export function revealAnswer(session) {
  if (session.phase === 'done') return session;
  const card = session.cards[session.index];
  const blank = checkCard(card, '');
  return {
    ...session,
    phase: 'review',
    pending: { ...blank, ok: false, revealed: true },
  };
}

/**
 * Learner override after the answer is showing.
 * @param {ReturnType<typeof startRecall>} session
 * @param {boolean} hadIt
 */
export function markSelf(session, hadIt) {
  if (session.phase !== 'review') return session;
  const card = session.cards[session.index];
  return finish(session, card, Boolean(hadIt), session.pending);
}

function finish(session, card, hadIt, detail) {
  const log = [...session.log, { id: card.id, hadIt, detail }];
  const correct = session.correct + (hadIt ? 1 : 0);
  const missed = session.missed + (hadIt ? 0 : 1);
  const next = session.index + 1;
  const done = next >= session.cards.length;
  return {
    ...session,
    log,
    correct,
    missed,
    index: done ? session.index : next,
    phase: done ? 'done' : 'ask',
    pending: null,
  };
}

export function renderRecallIndex(decks = RECALL_DECKS) {
  const items = decks.map((deck) => (
    `<li><a href="#Terms/recall/${encodeURIComponent(deck.id)}">${escapeHtml(deck.title)}</a> <span>${deck.cards.length} cards</span></li>`
  )).join('');
  return `
    <section class="recall-page" data-recall-page>
      <p><a href="#Terms">All terms</a></p>
      <h1>Quick recall</h1>
      <p>Lists you should be able to say from memory. Type an answer, check it, and mark a miss yourself when the wording differs.</p>
      <p data-recall-count aria-live="polite">${decks.length} decks</p>
      <ul class="recall-decks" data-recall-decks>${items}</ul>
      <div data-recall-mount></div>
    </section>
  `;
}

/**
 * @param {ReturnType<typeof startRecall>} session
 */
export function renderRecallSession(session) {
  if (session.phase === 'done') {
    return `
      <section class="recall-session" data-recall-session data-phase="done">
        <h2>${escapeHtml(session.title)}</h2>
        <p data-recall-score aria-live="polite">You marked ${session.correct} right and ${session.missed} missed.</p>
        <button type="button" data-recall-again>Try this deck again</button>
        <p><a href="#Terms/recall">All recall decks</a></p>
      </section>
    `;
  }
  const card = session.cards[session.index];
  const step = `${session.index + 1} of ${session.cards.length}`;
  const review = session.phase === 'review' ? renderReview(session.pending) : '';
  return `
    <section class="recall-session" data-recall-session data-phase="${session.phase}">
      <p class="recall-progress" data-recall-progress>${escapeHtml(session.title)} · ${step}</p>
      <h2 id="recall-prompt">${escapeHtml(card.prompt)}</h2>
      <form data-recall-form>
        <label for="recall-answer">Your answer</label>
        <textarea id="recall-answer" name="answer" rows="3" ${session.phase === 'review' ? '' : 'autofocus'}></textarea>
        <div class="recall-actions">
          <button type="submit">Check</button>
          <button type="button" data-recall-reveal>Show the answer</button>
        </div>
      </form>
      <div data-recall-review aria-live="polite">${review}</div>
    </section>
  `;
}

function renderReview(pending) {
  if (!pending) return '';
  const official = pending.official.join('; ');
  const hint = pending.hints?.[0] ? `<p class="recall-hint">${escapeHtml(pending.hints[0])}</p>` : '';
  const lead = pending.revealed
    ? 'Answer:'
    : pending.matched > 0
      ? `Not yet. ${pending.matched} of ${pending.total} matched.`
      : 'Not yet.';
  return `
    <p><strong>${escapeHtml(lead)}</strong> ${escapeHtml(official)}</p>
    ${hint}
    <div class="recall-actions">
      <button type="button" data-recall-had>I had it</button>
      <button type="button" data-recall-miss>I missed it</button>
    </div>
  `;
}

/**
 * @param {ParentNode} root
 * @param {typeof RECALL_DECKS} [decks]
 */
export function bindRecall(root, decks = RECALL_DECKS) {
  const page = root.querySelector?.('[data-recall-page]') ?? root;
  const mount = page.querySelector('[data-recall-mount]');
  let session = null;

  function show(next) {
    session = next;
    if (mount) mount.innerHTML = session ? renderRecallSession(session) : '';
  }

  function openDeck(id) {
    const deck = deckById(id, decks);
    if (!deck || !mount) return;
    show(startRecall(deck));
    mount.querySelector('#recall-answer')?.focus();
  }

  page.addEventListener('click', (event) => {
    const again = event.target.closest?.('[data-recall-again]');
    if (again && session) {
      event.preventDefault();
      openDeck(session.deckId);
      return;
    }
    const deckLink = event.target.closest?.('a[href^="#Terms/recall/"]');
    if (deckLink && page.contains(deckLink)) {
      const id = recallDeckFromHash(deckLink.getAttribute('href'));
      if (id) {
        event.preventDefault();
        openDeck(id);
      }
    }
  });

  page.addEventListener('submit', (event) => {
    const form = event.target.closest?.('[data-recall-form]');
    if (!form || !session) return;
    event.preventDefault();
    const input = form.querySelector('#recall-answer')?.value ?? '';
    show(submitAnswer(session, input));
  });

  page.addEventListener('click', (event) => {
    if (!session) return;
    if (event.target.closest?.('[data-recall-reveal]')) {
      event.preventDefault();
      show(revealAnswer(session));
      return;
    }
    if (event.target.closest?.('[data-recall-had]')) {
      event.preventDefault();
      show(markSelf(session, true));
      return;
    }
    if (event.target.closest?.('[data-recall-miss]')) {
      event.preventDefault();
      show(markSelf(session, false));
    }
  });

  return { openDeck, get session() { return session; } };
}

/**
 * @param {string} hash
 * @returns {string | null}
 */
export function recallDeckFromHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  const parts = raw.split('/');
  if (parts[0]?.toLowerCase() !== 'terms') return null;
  if (parts[1]?.toLowerCase() !== 'recall') return null;
  if (!parts[2]) return '';
  return decodeURIComponent(parts[2]);
}
