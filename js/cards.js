import { showToast, toastHtml } from './celebrate.js';
import { readProgress, reviewCard, writeProgress } from './progress.js';

export const DECK = [
  { id: 'card-protons', front: 'What does the atomic number count?', back: 'The protons in one atom of that element.' },
  { id: 'card-ion', front: 'How does an atom become a positive ion?', back: 'It loses one or more electrons.' },
  { id: 'card-covalent', front: 'What is a covalent bond?', back: 'A bond where atoms share electrons.' },
  { id: 'card-ionic', front: 'What holds an ionic compound together?', back: 'The pull between a positive ion and a negative ion.' },
  { id: 'card-mole', front: 'How many particles are in one mole?', back: '6.022 × 10²³ particles.' },
  { id: 'card-ideal', front: 'What does the ideal gas law connect?', back: 'Pressure, volume, moles, and temperature: PV = nRT.' },
  { id: 'card-neutral', front: 'What is the pH of neutral water at 25 °C?', back: '7.' },
  { id: 'card-enthalpy', front: 'What is enthalpy?', back: 'Heat exchanged at constant pressure.' },
];

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

export function renderCards(index = 0, face = 'front') {
  const card = DECK[index] ?? DECK[0];
  const text = face === 'back' ? card.back : card.front;
  return `
    <section class="page" data-route="Cards" data-card-index="${index}" data-card-face="${face}">
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

export function bindCards(root, storage) {
  if (bound.has(root)) return;
  bound.add(root);
  let index = 0;
  let face = 'front';

  function paint() {
    const page = root.querySelector('[data-route="Cards"]');
    const card = DECK[index];
    if (!page || !card) return;
    page.dataset.cardIndex = String(index);
    page.dataset.cardFace = face;
    const text = page.querySelector('[data-card] p');
    if (text) text.textContent = face === 'back' ? card.back : card.front;
  }

  function run(action) {
    const page = root.querySelector('[data-route="Cards"]');
    if (!page) return;
    if (action === 'flip') {
      face = face === 'front' ? 'back' : 'front';
      if (face === 'back') {
        const result = reviewCard(readProgress(storage), DECK[index].id);
        writeProgress(result.progress, storage);
        if (result.awarded) {
          const status = page.querySelector('[data-card-status]');
          if (status) status.textContent = 'Reviewed. +5 XP.';
          showToast(page, 'Reviewed. +5 XP.');
        }
      }
    } else if (action === 'next') {
      index = (index + 1) % DECK.length;
      face = 'front';
    } else if (action === 'prev') {
      index = (index - 1 + DECK.length) % DECK.length;
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
