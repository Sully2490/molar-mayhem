import { escapeHtml, formulaHtml, formulaText } from './html.js';
import { ensureBuilderCss, on, reducedFrom, restoreFocus } from './dom.js';
import { motionMode } from './motion.js';
import { missFeedback } from './feedback.js';
import {
  REACTIONS,
  amountOf,
  createStoich,
  describeStoich,
  formatCount,
  gradeStoich,
  layoutParticles,
  particleGroups,
  reactionById,
  runReaction,
} from './stoich.js';

function amountFields(reaction, state) {
  return reaction.reactants.map((reactant) => {
    const count = amountOf(state, reactant.id);
    return `
      <div class="b-row" role="group" aria-label="${escapeHtml(formulaText(reactant.formula))} molecules">
        <button type="button" data-action="bump" data-id="${reactant.id}" data-delta="-1" data-focus="down-${reactant.id}" aria-label="Remove one ${escapeHtml(formulaText(reactant.formula))}">−</button>
        <span class="b-readout">${count} ${formulaHtml(reactant.formula)}</span>
        <button type="button" data-action="bump" data-id="${reactant.id}" data-delta="1" data-focus="up-${reactant.id}" aria-label="Add one ${escapeHtml(formulaText(reactant.formula))}">+</button>
      </div>
    `;
  }).join('');
}

function answerFields(reaction, state) {
  const limiter = ['both', ...reaction.reactants.map((item) => item.id)];
  const options = [`<option value="" ${state.answer.limiter ? '' : 'selected'}>Choose</option>`].concat(limiter.map((id) => (
    `<option value="${id}" ${state.answer.limiter === id ? 'selected' : ''}>${id === 'both' ? 'both run out' : formulaText(id)}</option>`
  ))).join('');
  const products = reaction.products.map((product) => `
    <label class="b-field">How many ${formulaHtml(product.formula)} form?
      <input type="number" min="0" max="24" step="0.1" value="${escapeHtml(state.answer.products[product.id] ?? '')}" data-answer="product" data-id="${product.id}" data-focus="prod-${product.id}" aria-label="How many ${formulaText(product.formula)} form">
    </label>
  `).join('');
  const leftover = reaction.reactants.map((reactant) => `
    <label class="b-field">How many ${formulaHtml(reactant.formula)} are left?
      <input type="number" min="0" max="24" step="0.1" value="${escapeHtml(state.answer.leftover[reactant.id] ?? '')}" data-answer="leftover" data-id="${reactant.id}" data-focus="left-${reactant.id}" aria-label="How many ${formulaText(reactant.formula)} are left">
    </label>
  `).join('');
  return `
    <label class="b-field">Which reactant runs out?
      <select data-answer="limiter" data-focus="limiter">${options}</select>
    </label>
    ${products}
    ${leftover}
  `;
}

export function renderStoich(state, motion = 'still') {
  const reaction = reactionById(state.reactionId);
  const groups = particleGroups(reaction, state.amounts, state.shown);
  const dots = layoutParticles(groups);
  const reactions = REACTIONS.map((item) => (
    `<option value="${item.id}" ${item.id === reaction.id ? 'selected' : ''}>${escapeHtml(formulaText(item.equation))}</option>`
  )).join('');
  const circles = dots.map((dot) => (
    `<g transform="translate(${dot.x.toFixed(1)} ${dot.y.toFixed(1)})"><circle r="12" fill="${dot.color}"/><text y="4" text-anchor="middle" font-size="8" font-weight="700" fill="#fffaf2">${escapeHtml(formulaText(dot.formula))}</text></g>`
  )).join('');
  const captions = groups.map((group) => (
    `${formatCount(group.count)} ${formulaText(group.formula)}${group.role === 'leftover' ? ' left over' : ''}`
  )).join(' · ');
  return `
    <section class="b-tool" data-builder="stoich" data-motion="${motion}">
      <h2>Limiting reactant</h2>
      <p class="b-cite">OpenStax Chemistry: Atoms First 2e §7.3–§7.4.</p>
      <p id="stoich-summary" class="b-summary" aria-live="polite">${escapeHtml(describeStoich(state, motion))}</p>
      <div class="b-controls">
        <label class="b-field">Reaction
          <select data-action="reaction" data-focus="reaction">${reactions}</select>
        </label>
        ${amountFields(reaction, state)}
        <button type="button" data-action="run" data-focus="run">${state.shown === 'after' ? 'Show the start' : 'Run the reaction'}</button>
      </div>
      <p class="b-equation">${formulaHtml(reaction.equation)}</p>
      <svg class="b-svg" viewBox="0 0 320 180" role="img" aria-labelledby="stoich-summary">
        <rect width="320" height="180" fill="#fffaf2" rx="16"/>
        ${circles}
        <text x="16" y="168" font-size="12" fill="#5d675f">${escapeHtml(captions || 'Add molecules')} · ${motion === 'still' ? 'Still' : 'Moving'}</text>
      </svg>
      <p class="b-fine">At most 8 circles are drawn for each kind. The number beside the buttons is the real count. Plus and minus are the keyboard controls.</p>
      <div class="b-controls">
        ${answerFields(reaction, state)}
        <button type="button" data-action="check" data-focus="check">Check</button>
      </div>
      <p class="b-msg" role="status" data-tone="${escapeHtml(state.tone)}">${escapeHtml(state.message || 'Set the starting molecules, predict what runs out, then run the picture.')}</p>
    </section>
  `;
}

export function mount(el, opts = {}) {
  ensureBuilderCss();
  const reduced = reducedFrom(opts);
  let state = createStoich(opts.challenge || 'water');
  let alive = true;
  let raf = 0;
  const stops = [];

  function mode() {
    return motionMode(reduced, state.playing);
  }

  function paint(focusId) {
    if (!alive) return;
    if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
    raf = 0;
    el.innerHTML = renderStoich(state, mode());
    restoreFocus(el, focusId);
    if (mode() !== 'run' || typeof requestAnimationFrame !== 'function') return;
    const started = performance.now?.() ?? 0;
    const nodes = [...el.querySelectorAll('.b-svg g')];
    const bases = nodes.map((node) => node.getAttribute('transform') || '');
    const loop = (now) => {
      if (!alive || !state.playing) return;
      const t = Math.min(1, ((now ?? started) - started) / 700);
      nodes.forEach((node, index) => {
        const drift = Math.sin(t * Math.PI) * (10 + index);
        node.setAttribute('transform', `${bases[index]} translate(${drift.toFixed(1)} 0)`);
      });
      if (t < 1) {
        raf = requestAnimationFrame(loop);
        return;
      }
      state = { ...state, playing: false, shown: 'after', phase: 1 };
      paint('run');
    };
    raf = requestAnimationFrame(loop);
  }

  stops.push(on(el, 'click', (event) => {
    const target = event.target.closest?.('[data-action]');
    if (!target || !el.contains(target)) return;
    const action = target.getAttribute('data-action');
    if (action === 'bump') {
      const id = target.getAttribute('data-id');
      const next = amountOf(state, id) + Number(target.getAttribute('data-delta'));
      state = {
        ...state,
        amounts: { ...state.amounts, [id]: Math.max(0, Math.min(12, next)) },
        shown: 'before',
        playing: false,
        message: '',
        tone: '',
      };
      paint(target.getAttribute('data-focus'));
    }
    if (action === 'run') {
      if (state.shown === 'after') {
        state = { ...state, shown: 'before', playing: false };
      } else if (reduced) {
        state = { ...state, shown: 'after', playing: false, phase: 0 };
      } else {
        state = { ...state, playing: true, shown: 'before' };
      }
      paint('run');
    }
    if (action === 'check') {
      const reaction = reactionById(state.reactionId);
      const result = gradeStoich(state.answer, reaction, state.amounts);
      const feedback = missFeedback(result.ok, result.success, result.hints, state.misses);
      state = {
        ...state,
        message: feedback.message,
        tone: feedback.tone,
        misses: feedback.misses,
        revealed: feedback.reveal,
        shown: feedback.ok || feedback.reveal ? 'after' : state.shown,
        playing: false,
      };
      paint('check');
    }
  }));

  stops.push(on(el, 'change', (event) => {
    const action = event.target.getAttribute?.('data-action');
    if (action === 'reaction') {
      const next = createStoich(event.target.value);
      state = { ...next, amounts: { ...next.amounts, ...state.amounts } };
      paint('reaction');
      return;
    }
    const kind = event.target.getAttribute?.('data-answer');
    if (kind === 'limiter') {
      state = { ...state, answer: { ...state.answer, limiter: event.target.value } };
    }
    if (kind === 'product' || kind === 'leftover') {
      const id = event.target.getAttribute('data-id');
      const bucket = kind === 'product' ? 'products' : 'leftover';
      state = {
        ...state,
        answer: { ...state.answer, [bucket]: { ...state.answer[bucket], [id]: event.target.value } },
      };
    }
  }));

  paint();
  return {
    getState: () => state,
    destroy() {
      alive = false;
      if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
      for (const stop of stops) stop();
      el.replaceChildren?.();
    },
  };
}

export { runReaction };
