import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { grade } from '../js/grade.js';
import { FINAL_EXAM } from '../js/final-exam.js';
import { renderPrep, renderSummary, scoreFinal } from '../js/prep.js';

test('the practice final covers chapters 1–9 and weights 5 and 7', () => {
  const counts = new Map();
  for (const item of FINAL_EXAM) counts.set(item.ch, (counts.get(item.ch) ?? 0) + 1);
  for (let ch = 1; ch <= 9; ch += 1) {
    assert.ok(counts.get(ch) >= 1, `chapter ${ch} has an item`);
  }
  for (const ch of [1, 2, 3, 4, 6, 8, 9]) {
    assert.ok(counts.get(5) > counts.get(ch), `chapter 5 outweighs chapter ${ch}`);
    assert.ok(counts.get(7) > counts.get(ch), `chapter 7 outweighs chapter ${ch}`);
  }
});

test('every key grades correct and a blank does not', () => {
  const ids = new Set();
  for (const item of FINAL_EXAM) {
    assert.equal(ids.has(item.id), false, item.id);
    ids.add(item.id);
    assert.equal(typeof item.q, 'string');
    assert.ok(item.q.length > 10, item.id);
    assert.ok(Array.isArray(item.steps) && item.steps.length >= 2, item.id);
    assert.equal(typeof item.a, 'string');
    assert.equal(grade(item.a, item.check).ok, true, item.id);
    assert.equal(grade('', item.check).ok, false, item.id);
  }
});

test('the methane sigma item is about single bonds', () => {
  const item = FINAL_EXAM.find((entry) => entry.id === 'f5-sigma-ch4');
  assert.equal(item.a, '4 sigma, 0 pi');
  assert.equal(/double bond/i.test(item.q), false);
});

test('HClO3 is a near miss on the strong-acid list', () => {
  const item = FINAL_EXAM.find((entry) => entry.id === 'f7-strong-set');
  const wrong = grade('HCl, HBr, HI, HNO3, H2SO4, HClO3', item.check);
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, 'nearMiss');
});

test('a perfect paper is all correct and a miss keeps its steps', () => {
  const responses = Object.fromEntries(FINAL_EXAM.map((item) => [item.id, item.a]));
  const rows = scoreFinal(FINAL_EXAM, responses);
  assert.equal(rows.every((row) => row.ok), true);
  const miss = { ...responses, 'f5-order': '3' };
  const mixed = scoreFinal(FINAL_EXAM, miss);
  const bond = mixed.find((row) => row.id === 'f5-order');
  assert.equal(bond.ok, false);
  assert.equal(bond.steps.length >= 2, true);
  const html = renderSummary(mixed);
  assert.match(html, /Corrections/);
  assert.match(html, /Bond order/);
  assert.match(html, /f5-order/);
});

test('the prep page is untimed and labels every answer', () => {
  const html = renderPrep();
  assert.match(html, /data-route="Prep"/);
  assert.match(html, /untimed/);
  assert.equal(/countdown|data-timer|minutes left/i.test(html), false);
  assert.equal((html.match(/class="answer-label"/g) ?? []).length, FINAL_EXAM.length);
  assert.match(html, /aria-live="polite"/);
  const source = readFileSync(new URL('../js/prep.js', import.meta.url), 'utf8');
  assert.equal(/setInterval|Date\.now\(/.test(source), false);
});
