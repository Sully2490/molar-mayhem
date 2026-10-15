import { showToast, toastHtml } from './celebrate.js';
import { readProgress, reviewCard, writeProgress } from './progress.js';

const PH_CARD = /\bpH\b/i;

export function cardsFromLessons(lessons) {
  const cards = [];
  for (const lesson of lessons ?? []) {
    const similar = lesson?.similar_problem;
    if (!similar || typeof similar.q !== 'string' || typeof similar.answer !== 'string') continue;
    const front = similar.q.trim();
    const back = similar.answer.trim();
    if (!front || !back) continue;
    if (PH_CARD.test(front) || PH_CARD.test(back) || PH_CARD.test(lesson.guide_line ?? '')) continue;
    cards.push({ id: `card-${lesson.id}`, front, back });
  }
  return cards;
}

export function cardAction(key) {
  if (key === 'ArrowRight') return 'next';
  if (key === 'ArrowLeft') return 'prev';
  if (key === 'Enter' || key === ' ') return 'flip';
  return '';
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderCards(deck = [], index = 0, face = 'front') {
  const card = deck[index] ?? deck[0];
  const text = !card
    ? 'No cards are in the chapter folders yet.'
    : (face === 'back' ? card.back : card.front);
  return `
    <section class="page" data-route="Cards" data-card-index="${card ? index : 0}" data-card-face="${face}">
      <h1>Cards</h1>
      <p>Flip a card, then move on. Arrow keys work when a card is focused.</p>
      <article class="study-card" tabindex="0" data-card aria-live="polite">
        <p>${escapeHtml(text)}</p>
      </article>
      <div class="card-controls">
        <button type="button" data-card-prev>Previous</button>
        <button type="button" data-card-flip>Flip</button>
        <button type="button" data-card-next>Next</button>
      </div>
      <p class="feedback" data-card-status aria-live="polite"></p>
      ${toastHtml()}
    </section>
  `;
}

const bound = new WeakSet();

export function bindCards(root, deck = [], storage) {
  if (bound.has(root)) return;
  bound.add(root);
  const cards = deck;
  let index = 0;
  let face = 'front';

  function paint() {
    const page = root.querySelector('[data-route="Cards"]');
    const card = cards[index];
    if (!page || !card) return;
    page.dataset.cardIndex = String(index);
    page.dataset.cardFace = face;
    const text = page.querySelector('[data-card] p');
    if (text) text.textContent = face === 'back' ? card.back : card.front;
  }

  function run(action) {
    const page = root.querySelector('[data-route="Cards"]');
    if (!page || cards.length === 0) return;
    if (action === 'flip') {
      face = face === 'front' ? 'back' : 'front';
      if (face === 'back') {
        const result = reviewCard(readProgress(storage), cards[index].id);
        writeProgress(result.progress, storage);
        if (result.awarded) {
          const status = page.querySelector('[data-card-status]');
          if (status) status.textContent = 'Reviewed. +5 XP.';
          showToast(page, 'Reviewed. +5 XP.');
        }
      }
    } else if (action === 'next') {
      index = (index + 1) % cards.length;
      face = 'front';
    } else if (action === 'prev') {
      index = (index - 1 + cards.length) % cards.length;
      face = 'front';
    }
    paint();
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-card-flip], [data-card-next], [data-card-prev]');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-card-flip')) run('flip');
    if (button.hasAttribute('data-card-next')) run('next');
    if (button.hasAttribute('data-card-prev')) run('prev');
  });

  root.addEventListener('keydown', (event) => {
    const action = cardAction(event.key);
    if (!action || !root.querySelector('[data-route="Cards"]')) return;
    const inField = event.target.closest?.('textarea, input');
    const onButton = event.target.closest?.('button');
    if (inField) return;
    if (onButton && action === 'flip') return;
    event.preventDefault();
    run(action);
  });
}
