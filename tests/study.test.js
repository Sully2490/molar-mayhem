import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { cardAction, cardsFromLessons, renderCards } from '../js/cards.js';
import { drillsFromLessons, nextQueue, renderDrillQueue } from '../js/drills.js';
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
  todayKey,
  writeProgress,
} from '../js/progress.js';
import {
  applySyncHash,
  codeFromHash,
  encodeSyncPayload,
  exportCode,
  importCode,
  isProgressShape,
  needsConfirm,
} from '../js/sync.js';

function memory() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test('streak grows on the next local day and resets after a gap', () => {
  assert.equal(previousDay('2026-10-16'), '2026-10-15');
  assert.equal(previousDay('2026-03-01'), '2026-02-28');
  assert.equal(previousDay('2024-03-01'), '2024-02-29');
  assert.equal(todayKey(new Date(2026, 9, 15, 23, 30, 0)), '2026-10-15');
  const source = readFileSync(new URL('../js/progress.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /toISOString|Date\.UTC|getUTC/);
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
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /history\.replaceState/);
});

test('a malformed #sync= link does not throw', () => {
  const store = memory();
  writeProgress(masterLesson(emptyProgress(), 'lesson-a', '2026-10-15').progress, store);
  const hash = '#sync=%E0%A4%A';
  assert.doesNotThrow(() => codeFromHash(hash));
  assert.equal(codeFromHash(hash), null);
  const applied = applySyncHash(hash, store);
  assert.equal(applied.handled, true);
  assert.equal(applied.ok, false);
  assert.equal(applied.note, 'That link could not be read.');
  assert.equal(importCode(hash).error, 'That link could not be read.');
  assert.equal(readProgress(store).xp, 25);
});

test('sync rejects a bad shape and asks before replacing XP', () => {
  assert.equal(isProgressShape(null), false);
  assert.equal(isProgressShape([]), false);
  assert.equal(isProgressShape('xp'), false);
  assert.equal(isProgressShape({ xp: '12' }), false);
  assert.equal(isProgressShape({ lessons: [] }), false);
  assert.equal(isProgressShape({ lessons: { a: 'done' } }), false);
  assert.equal(isProgressShape({ cards: { a: false } }), false);
  assert.equal(isProgressShape({}), true);
  for (const value of [null, [], { xp: '12' }, { streak: '1' }]) {
    const bad = importCode(encodeSyncPayload(value));
    assert.equal(bad.ok, false, JSON.stringify(value));
    assert.equal(bad.error, 'That code could not be read.');
  }
  const store = memory();
  writeProgress(masterLesson(emptyProgress(), 'lesson-a', '2026-10-15').progress, store);
  assert.equal(needsConfirm(readProgress(store)), true);
  const applied = applySyncHash(`#sync=${encodeURIComponent(exportCode(emptyProgress()))}`, store);
  assert.equal(applied.needsConfirm, true);
  assert.equal(applied.ok, true);
  assert.match(applied.note, /Confirm to import/);
  assert.equal(readProgress(store).xp, 25);
  assert.equal(readProgress(store).lessons['lesson-a'], 'mastered');
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
  assert.match(map, /data-import-dialog/);
  assert.match(map, /data-import-yes/);
  assert.match(map, /Keep mine/);
  assert.match(map, /aria-live="polite"/);
  assert.doesNotMatch(map, /disabled/);
  const sampleLessons = JSON.parse(readFileSync(new URL('../content/ch01/context.json', import.meta.url), 'utf8'));
  const cardsFromChapter = cardsFromLessons([sampleLessons]);
  assert.equal(cardsFromChapter[0].front, sampleLessons.similar_problem.q);
  assert.equal(cardsFromChapter[0].back, sampleLessons.similar_problem.answer);
  assert.equal(cardsFromLessons([{ id: 'ph', similar_problem: { q: 'What is the pH?', answer: '7' } }]).length, 0);
  const drills = drillsFromLessons([sampleLessons]);
  assert.equal(drills[0].id, sampleLessons.problems[0].id);
  assert.equal(grade(drills[0].a, drills[0].check).ok, true);
  const cards = renderCards(cardsFromChapter);
  assert.match(cards, /data-card-flip/);
  assert.doesNotMatch(cards, /neutral water/);
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
  const chapterLessons = [];
  for (let chapter = 1; chapter <= 9; chapter += 1) {
    const folder = `content/ch${String(chapter).padStart(2, '0')}`;
    for (const name of readdirSync(new URL(`../${folder}`, import.meta.url))) {
      if (!name.endsWith('.json')) continue;
      chapterLessons.push(JSON.parse(readFileSync(new URL(`../${folder}/${name}`, import.meta.url), 'utf8')));
    }
  }
  const fromChapters = drillsFromLessons(chapterLessons);
  assert.ok(fromChapters.length > 4);
  assert.ok(cardsFromLessons(chapterLessons).length > 8);
  assert.equal(fromChapters.some((item) => item.id === 'drill-na-protons'), false);
  const deckText = cardsFromLessons(chapterLessons).map((card) => `${card.front} ${card.back}`).join('\n');
  assert.doesNotMatch(deckText, /\bpH\b/);
  assert.deepEqual(nextQueue(['a', 'b', 'c'], 'a', true), ['b', 'c']);
  assert.deepEqual(nextQueue(['a', 'b', 'c'], 'a', false, 1), ['b', 'a', 'c', 'a']);
  assert.deepEqual(nextQueue(['a'], 'a', false, 2), ['a', 'a', 'a']);
  const css = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.term-btn,[\s\S]*min-height: 44px/);
  assert.match(css, /\.confetti-bit \{ animation: none; display: none; \}/);
});
