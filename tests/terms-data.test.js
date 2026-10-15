import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { TERMS } from '../content/terms/index.js';
import { RECALL_DECKS } from '../content/terms/recall/index.js';
import { VISUAL_IDS, visualSvg } from '../js/terms/art.js';
import { allFlashcards, toFlashcards } from '../js/terms/cards.js';

const visuals = new Set(VISUAL_IDS);

async function lessonChapters() {
  const map = new Map();
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.json') && entry.name !== 'schema.json') {
        const data = JSON.parse(await readFile(full, 'utf8'));
        if (typeof data.id === 'string' && Number.isInteger(data.ch)) map.set(data.id, data.ch);
      }
    }
  }
  await walk(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'content'));
  return map;
}

test('the glossary has at least 300 terms across chapters 1–9', () => {
  assert.ok(TERMS.length >= 300);
  const counts = new Map();
  for (const term of TERMS) counts.set(term.chapter, (counts.get(term.chapter) ?? 0) + 1);
  for (let chapter = 1; chapter <= 9; chapter += 1) {
    assert.ok((counts.get(chapter) ?? 0) >= 25, `chapter ${chapter} is thin`);
  }
});

test('every term has the glossary shape, a real lesson, and original text', async () => {
  const lessons = await lessonChapters();
  const ids = new Set();
  const phrases = new Map();
  for (const term of TERMS) {
    assert.equal(typeof term.id, 'string');
    assert.match(term.id, /^[a-z0-9-]+$/);
    assert.equal(ids.has(term.id), false, term.id);
    ids.add(term.id);
    assert.equal(typeof term.term, 'string');
    assert.ok(term.term.length >= 2);
    for (const field of ['definition', 'example', 'use']) {
      assert.equal(typeof term[field], 'string');
      assert.ok(term[field].trim().length >= 20, `${term.id} ${field}`);
      assert.doesNotMatch(term[field], /https?:\/\//i);
      assert.doesNotMatch(term[field], /canvas|instructor/i);
    }
    assert.notEqual(term.definition, term.example);
    assert.notEqual(term.definition, term.use);
    assert.ok(Array.isArray(term.related) && term.related.length >= 1);
    assert.equal(lessons.get(term.lesson), term.chapter, term.id);
    if (term.visual) {
      assert.ok(visuals.has(term.visual), term.visual);
      assert.match(visualSvg(term.visual), /^<svg\b/);
      assert.match(visualSvg(term.visual), /aria-hidden="true"/);
    }
    const surfaces = [term.term, ...(term.aliases ?? [])];
    for (const phrase of surfaces) {
      assert.ok(phrase.trim().length >= 2, `${term.id} phrase`);
      const key = `${term.match === 'formula' ? '=' : ''}${phrase.toLowerCase()}`;
      const owner = phrases.get(key);
      if (owner && owner !== term.id) assert.fail(`${phrase} is used by ${owner} and ${term.id}`);
      phrases.set(key, term.id);
    }
    if (term.match) assert.ok(term.match === 'word' || term.match === 'formula');
  }
  for (const term of TERMS) {
    for (const related of term.related) assert.ok(ids.has(related), `${term.id} → ${related}`);
  }
});

test('diagrams are inline SVG, and many terms use one', () => {
  assert.ok(TERMS.filter((term) => term.visual).length >= 120);
  for (const id of VISUAL_IDS) {
    const svg = visualSvg(id);
    assert.match(svg, /<svg\b/);
    assert.doesNotMatch(svg, /<img\b|https?:/i);
  }
});

test('flashcard export includes every term for other lanes', () => {
  const cards = toFlashcards();
  assert.equal(cards.length, TERMS.length);
  assert.equal(cards[0].kind, 'term');
  assert.ok(cards.every((card) => card.front && card.back && card.chapter && card.lesson));
  const all = allFlashcards();
  assert.ok(all.length > TERMS.length);
  assert.ok(all.some((card) => card.kind === 'recall' && card.deck === 'strong-acids'));
});

test('recall decks cover the required lists', () => {
  const ids = RECALL_DECKS.map((deck) => deck.id);
  assert.deepEqual(ids, [
    'strong-acids',
    'strong-bases',
    'solubility-rules',
    'polyatomic-ions',
    'vsepr-shapes',
    'gas-laws',
  ]);
  for (const deck of RECALL_DECKS) {
    assert.equal(typeof deck.lesson, 'string');
    assert.ok(deck.cards.length >= 5);
    assert.equal(deck.cards[0].kind, 'list');
  }
});
