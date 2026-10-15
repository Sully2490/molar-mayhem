import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterTerms, renderTermsIndex } from '../js/terms/index-page.js';
import {
  checkCard,
  deckById,
  markSelf,
  renderRecallIndex,
  renderRecallSession,
  revealAnswer,
  startRecall,
  submitAnswer,
} from '../js/terms/recall.js';
import { TERMS } from '../content/terms/index.js';

test('strong acids accept the six formulas in any order and reject HClO3', () => {
  const deck = deckById('strong-acids');
  const list = deck.cards[0];
  const good = checkCard(list, 'HClO4, H2SO4, HNO3, HI, HBr, and HCl');
  assert.equal(good.ok, true);
  const miss = checkCard(list, 'HCl, HBr, HI, HNO3, H2SO4, HClO4, HClO3');
  assert.equal(miss.ok, false);
  assert.ok(miss.hints[0].includes('HClO4'));
});

test('strong bases include the eight hydroxides and not Mg(OH)2', () => {
  const deck = deckById('strong-bases');
  const list = deck.cards[0];
  const good = checkCard(list, 'LiOH, NaOH, KOH, RbOH, CsOH, Ca(OH)2, Sr(OH)2, Ba(OH)2');
  assert.equal(good.ok, true);
  const magnesium = checkCard(list, 'LiOH, NaOH, KOH, RbOH, CsOH, Ca(OH)2, Sr(OH)2, Ba(OH)2, Mg(OH)2');
  assert.equal(magnesium.ok, false);
  assert.match(magnesium.hints[0], /Mg\(OH\)2|magnesium/i);
});

test('polyatomic charges, VSEPR angles, and gas laws check themselves', () => {
  const sulfate = deckById('polyatomic-ions').cards.find((card) => card.id === 'charge-so4');
  assert.equal(checkCard(sulfate, '2-').ok, true);
  assert.equal(checkCard(sulfate, '-2').ok, true);
  const tetrahedral = deckById('vsepr-shapes').cards.find((card) => card.id === 'a4');
  assert.equal(checkCard(tetrahedral, 'tetrahedral, 109.5°').ok, true);
  const boyle = deckById('gas-laws').cards.find((card) => card.id === 'boyle');
  assert.equal(checkCard(boyle, 'P₁V₁ = P₂V₂').ok, true);
  const ideal = deckById('gas-laws').cards.find((card) => card.id === 'ideal');
  assert.equal(checkCard(ideal, 'PV=nRT').ok, true);
});

test('a correct recall answer advances, and a miss waits for a self-check', () => {
  const session = startRecall(deckById('strong-acids'));
  const next = submitAnswer(session, 'hydrochloric acid, HBr, HI, nitric acid, H2SO4, HClO4');
  assert.equal(next.phase, 'ask');
  assert.equal(next.correct, 1);
  assert.equal(next.index, 1);
  const review = submitAnswer(next, 'not an acid');
  assert.equal(review.phase, 'review');
  assert.equal(review.pending.ok, false);
  const shown = revealAnswer(next);
  assert.equal(shown.phase, 'review');
  assert.match(renderRecallSession(shown), /I had it/);
  assert.match(renderRecallSession(shown), /I missed it/);
  const missed = markSelf(review, false);
  assert.equal(missed.missed, 1);
  assert.equal(missed.phase, 'ask');
  const claimed = markSelf(review, true);
  assert.equal(claimed.correct, 2);
});

test('the index renders search and a chapter filter', () => {
  const html = renderTermsIndex(TERMS, { query: '', chapter: 'all' });
  assert.match(html, /id="terms-q"/);
  assert.match(html, /type="search"/);
  assert.match(html, /aria-label="Filter by chapter"/);
  assert.match(html, /data-terms-chapter="8"/);
  assert.match(html, /href="#Terms\/recall"/);
  assert.match(html, /data-terms-export/);
  const chapter8 = filterTerms(TERMS, { chapter: 8, query: 'airbag' });
  assert.ok(chapter8.some((term) => term.id === 'ideal-gas-law'));
  const chapter1 = filterTerms(TERMS, { chapter: 1, query: 'airbag' });
  assert.ok(chapter1.length > 0);
  assert.ok(chapter1.every((term) => term.chapter === 1));
  assert.ok(!chapter1.some((term) => term.id === 'ideal-gas-law'));
});

test('recall index lists every deck', () => {
  const html = renderRecallIndex();
  assert.match(html, /Quick recall/);
  assert.match(html, /#Terms\/recall\/strong-acids/);
  assert.match(html, /#Terms\/recall\/solubility-rules/);
  assert.match(html, /#Terms\/recall\/polyatomic-ions/);
  assert.match(html, /#Terms\/recall\/vsepr-shapes/);
  assert.match(html, /#Terms\/recall\/gas-laws/);
  assert.match(html, /aria-live="polite"/);
});
