import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { cardAction, renderCards } from '../js/cards.js';
import { DRILL_ITEMS, nextQueue, renderDrillQueue } from '../js/drills.js';
import { grade } from '../js/grade.js';
import { renderGlossary } from '../js/glossary.js';
import { ATTEMPTS } from '../js/learn.js';
import { renderMap } from '../js/map.js';
import {
  awardXp,
  emptyProgress,
  masterLesson,
  noteDay,
  openLesson,
  previousDay,
  readProgress,
  reviewCard,
  writeProgress,
} from '../js/progress.js';
import { applySyncHash, codeFromHash, exportCode, importCode } from '../js/sync.js';

function memory() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test('streak grows on the next UTC day and resets after a gap', () => {
  assert.equal(previousDay('2026-10-16'), '2026-10-15');
  let progress = noteDay(emptyProgress(), '2026-10-15');
  assert.equal(progress.streak, 1);
  progress = noteDay(progress, '2026-10-15');
  assert.equal(progress.streak, 1);
  progress = noteDay(progress, '2026-10-16');
  assert.equal(progress.streak, 2);
  progress = noteDay(progress, '2026-10-18');
  assert.equal(progress.streak, 1);
});

test('lessons, mastery, and cards save XP in localStorage', () => {
  const store = memory();
  let progress = openLesson(emptyProgress(), 'ch01-classify', '2026-10-15');
  assert.equal(progress.lessons['ch01-classify'], 'practicing');
  const mastered = masterLesson(progress, 'ch01-classify', '2026-10-15');
  assert.equal(mastered.awarded, 25);
  assert.equal(mastered.celebrate, true);
  assert.match(mastered.toast, /Mastered\. \+25 XP\. Streak 1\./);
  const again = masterLesson(mastered.progress, 'ch01-classify', '2026-10-15');
  assert.equal(again.awarded, 0);
  assert.equal(again.progress.xp, 25);
  assert.equal(openLesson(again.progress, 'ch01-classify', '2026-10-15').lessons['ch01-classify'], 'mastered');
  const card = reviewCard(again.progress, 'card-mole', '2026-10-15');
  assert.equal(card.awarded, 5);
  assert.equal(reviewCard(card.progress, 'card-mole', '2026-10-15').awarded, 0);
  const drilled = awardXp(card.progress, 10, '2026-10-15');
  writeProgress(drilled, store);
  assert.equal(readProgress(store).xp, 40);
  assert.equal(ATTEMPTS, 3);
});

test('a sync code round-trips and a #sync= link imports locally', () => {
  const progress = masterLesson(emptyProgress(), 'lesson-a', '2026-10-15').progress;
  const code = exportCode(progress);
  assert.match(code, /^mm1\.[A-Za-z0-9_-]+$/);
  const imported = importCode(code);
  assert.equal(imported.ok, true);
  assert.equal(imported.progress.xp, 25);
  assert.equal(imported.progress.lessons['lesson-a'], 'mastered');
  assert.equal(importCode(`#sync=${code}`).progress.xp, 25);
  assert.equal(codeFromHash('#Map?sync=abc%2B'), 'abc+');
  assert.equal(codeFromHash('#Home'), '');
  const store = memory();
  const applied = applySyncHash(`#sync=${encodeURIComponent(code)}`, store);
  assert.equal(applied.handled, true);
  assert.equal(applied.nextHash, '#Map');
  assert.equal(readProgress(store).xp, 25);
  assert.equal(importCode('nope').ok, false);
  const source = readFileSync(new URL('../js/sync.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\(|WebSocket|password|login/i);
});

test('the map, cards, glossary, and drill queue are labeled and keyboard ready', () => {
  const map = renderMap(
    [{ id: 'lesson-a', ch: 1, guide_line: 'Count protons' }],
    { xp: 25, streak: 2, lessons: { 'lesson-a': 'practicing' } },
  );
  assert.match(map, /Skip ahead any time\. A later lesson stays open\./);
  assert.match(map, /href="#Learn\/lesson-a"/);
  assert.match(map, /data-master="lesson-a"/);
  assert.match(map, /Practicing/);
  assert.match(map, /for="sync-code"/);
  assert.match(map, /aria-live="polite"/);
  assert.doesNotMatch(map, /disabled/);
  const cards = renderCards();
  assert.match(cards, /data-card-flip/);
  assert.match(cards, /Previous/);
  assert.match(cards, /Next/);
  assert.equal(cardAction('ArrowRight'), 'next');
  assert.equal(cardAction('ArrowLeft'), 'prev');
  assert.equal(cardAction(' '), 'flip');
  const glossary = renderGlossary();
  assert.match(glossary, /role="dialog"/);
  assert.match(glossary, /aria-modal="true"/);
  assert.match(glossary, /data-term="mole"/);
  const queue = renderDrillQueue({ id: 'drill-water', q: 'Write the formula for water.' });
  assert.match(queue, /data-drill="drill-water"/);
  assert.match(queue, /for="drill-drill-water"/);
  assert.match(queue, /Your answer/);
  for (const item of DRILL_ITEMS) assert.equal(grade(item.a, item.check).ok, true, item.id);
  assert.deepEqual(nextQueue(['a', 'b', 'c'], 'a', true), ['b', 'c']);
  assert.deepEqual(nextQueue(['a', 'b'], 'a', false), ['b', 'a']);
  const css = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.term-btn,[\s\S]*min-height: 44px/);
  assert.match(css, /\.confetti-bit \{ animation: none; display: none; \}/);
});
