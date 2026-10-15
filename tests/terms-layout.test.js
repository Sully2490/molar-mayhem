import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { TERMS } from '../content/terms/index.js';
import {
  cardBlurb,
  filterTerms,
  groupTerms,
  jumpToLetter,
  letterOf,
  renderTermsIndex,
} from '../js/terms/index-page.js';

test('the glossary index is 374 cards grouped by chapter', () => {
  assert.equal(TERMS.length, 374);
  const html = renderTermsIndex(TERMS, { query: '', chapter: 'all' });
  assert.match(html, /class="terms-page"/);
  assert.match(html, /class="terms-head"/);
  assert.match(html, /<h1>Terms<\/h1>\s*<div class="terms-tools-slot" data-mm-tools-mount><\/div>/);
  assert.match(html, /aria-label="Filter by chapter"/);
  assert.match(html, /aria-label="Jump to a letter"/);
  assert.match(html, /id="terms-q"/);
  assert.match(html, /type="search"/);
  assert.match(html, /href="#Terms\/recall"/);
  assert.match(html, /data-terms-export/);
  assert.equal(html.includes('terms-index'), false);
  assert.equal((html.match(/class="term-tile"/g) || []).length, 374);
  for (let chapter = 1; chapter <= 9; chapter += 1) {
    assert.match(html, new RegExp(`data-terms-group="${chapter}"`));
    assert.match(html, new RegExp(`data-terms-chapter="${chapter}"`));
  }
  for (const entry of TERMS) {
    const needle = `data-term="${entry.id}"`;
    assert.equal(html.split(needle).length - 1, 1, entry.id);
  }
  const groups = groupTerms(TERMS);
  assert.deepEqual(groups.map((group) => group.chapter), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const tiled = groups.reduce((sum, group) => (
    sum + group.blocks.reduce((inner, block) => inner + block.terms.length, 0)
  ), 0);
  assert.equal(tiled, 374);
  assert.equal(groups[0].title, 'Essential ideas');
  assert.equal(letterOf(TERMS.find((entry) => entry.id === 'accuracy')), 'A');
});

test('chapter chips and the A–Z jump follow the active filter', () => {
  const html = renderTermsIndex(TERMS, { chapter: 4, query: '' });
  assert.match(html, /data-terms-chapter="4" aria-pressed="true"/);
  assert.match(html, /data-terms-chapter="all" aria-pressed="false"/);
  assert.match(html, /data-terms-group="4"/);
  assert.doesNotMatch(html, /data-terms-group="1"/);
  assert.match(html, /Chapter 4 <span>Bonding<\/span>/);
  assert.match(html, /aria-label="Chapter 4, Bonding"/);

  const letters = renderTermsIndex(TERMS);
  const absent = letters.match(/<button type="button" data-terms-letter="X"[^>]*>/)[0];
  const present = letters.match(/<button type="button" data-terms-letter="A"[^>]*>/)[0];
  assert.match(absent, / disabled>/);
  assert.doesNotMatch(present, / disabled[=>\s]/);
  assert.match(letters, /data-terms-letter="Z"[^>]* disabled>/);

  const gases = renderTermsIndex(TERMS, { query: 'ideal gas' });
  assert.match(gases, /data-term="ideal-gas-law"/);
  assert.match(gases, /data-terms-group="8"/);
  assert.doesNotMatch(gases, /data-term="accuracy"/);
  const onlyChapter = filterTerms(TERMS, { chapter: 1, query: 'ideal gas' });
  assert.ok(onlyChapter.every((entry) => entry.chapter === 1));
  assert.ok(!onlyChapter.some((entry) => entry.id === 'ideal-gas-law'));
});

test('card blurbs stay short and a letter jump moves to that block', () => {
  const long = 'One two three four five six seven eight nine ten '.repeat(8);
  const blurb = cardBlurb(long);
  assert.ok(blurb.length < 145);
  assert.ok(blurb.endsWith('…'));
  assert.equal(cardBlurb('Short definition here.'), 'Short definition here.');
  assert.equal(letterOf({ term: '  mole ' }), 'M');
  assert.equal(letterOf({ term: '' }), '#');

  const heading = {
    focused: false,
    focus() { this.focused = true; },
  };
  const block = {
    scroll: null,
    scrollIntoView(options) { this.scroll = options; },
    querySelector() { return heading; },
  };
  const button = {
    attrs: new Map([['data-terms-letter', 'M']]),
    setAttribute(name, value) { this.attrs.set(name, String(value)); },
    removeAttribute(name) { this.attrs.delete(name); },
    getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; },
  };
  const page = {
    querySelector(selector) {
      return selector === '[data-terms-anchor="M"]' ? block : null;
    },
    querySelectorAll() { return [button]; },
    ownerDocument: { defaultView: { matchMedia: () => ({ matches: true }) } },
  };
  assert.equal(jumpToLetter(page, 'M'), block);
  assert.deepEqual(block.scroll, { block: 'start', behavior: 'auto' });
  assert.equal(heading.focused, true);
  assert.equal(button.getAttribute('aria-current'), 'true');
  assert.equal(jumpToLetter(page, 'nope'), null);
});

test('terms layout stylesheet centers the page and keeps phone targets tappable', () => {
  const css = readFileSync(new URL('../css/terms/terms.css', import.meta.url), 'utf8');
  assert.match(css, /\.terms-page\s*\{[^}]*margin:\s*0 auto/s);
  assert.match(css, /\.term-tile\s*\{/);
  assert.match(css, /minmax\(15\.5rem,\s*1fr\)/);
  assert.match(css, /@media \(max-width:\s*599px\)/);
  assert.match(css, /\.terms-az button\s*\{[^}]*min-height:\s*44px/s);
  assert.equal(css.includes('.terms-index'), false);
});
