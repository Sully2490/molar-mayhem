import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { linkPlain, linkTerms } from '../js/terms/linker.js';

test('the first occurrence of each term becomes one link', () => {
  const html = '<p>Density is mass over volume. Density shows up again.</p>';
  const linked = linkTerms(html);
  assert.equal(linked.match(/data-term="density"/g)?.length, 1);
  assert.match(linked, /<a class="term-link" href="#Terms\/density" data-term="density">Density<\/a>/);
  assert.match(linked, /data-term="mass"/);
  assert.match(linked, /data-term="volume"/);
  assert.match(linked, /again\.<\/p>$/);
});

test('a longer phrase wins, and a later shorter word can still link', () => {
  const linked = linkTerms('<p>The ideal gas law describes a gas.</p>');
  assert.match(linked, /data-term="ideal-gas-law">ideal gas law<\/a> describes a <a[^>]*data-term="gas">gas<\/a>/);
  assert.equal(linked.match(/data-term="gas"/g)?.length, 1);
});

test('a term does not match inside a longer word', () => {
  const linked = linkTerms('<p>A molecule is not a mole by itself.</p>');
  assert.match(linked, /data-term="molecule"/);
  assert.match(linked, /data-term="mole"/);
  assert.doesNotMatch(linked, /data-term="mole">mole<\/a>cule/);
});

test('links are not added inside tags, attributes, or existing links', () => {
  const html = '<p title="density">The mass is 2 g.</p><a href="#x">density</a><button>volume</button>';
  const linked = linkTerms(html);
  assert.match(linked, /title="density"/);
  assert.doesNotMatch(linked, /title="<a/);
  assert.match(linked, /data-term="mass"/);
  assert.match(linked, /<a href="#x">density<\/a>/);
  assert.match(linked, /<button>volume<\/button>/);
  assert.equal(linked.match(/data-term="density"/g)?.length ?? 0, 0);
});

test('linking twice does not nest anchors', () => {
  const once = linkTerms('<p>Heat leaves an exothermic reaction.</p>');
  const twice = linkTerms(once);
  assert.equal(twice, once);
  assert.equal(twice.match(/<a /g)?.length, once.match(/<a /g)?.length);
});

test('plain text is escaped before it is linked', () => {
  const linked = linkPlain('density <script>');
  assert.match(linked, /data-term="density"/);
  assert.match(linked, /&lt;script&gt;/);
  assert.doesNotMatch(linked, /<script>/);
});

test('a real lesson sentence links element and atom once each', () => {
  const lesson = JSON.parse(readFileSync(new URL('../content/ch01/classify.json', import.meta.url), 'utf8'));
  const html = `<p>${lesson.steps.join('</p><p>')}</p>`;
  const linked = linkTerms(html);
  assert.equal(linked.match(/data-term="element"/g)?.length, 1);
  assert.equal(linked.match(/data-term="atom"/g)?.length, 1);
  assert.match(linked, /data-term="compound"/);
});
