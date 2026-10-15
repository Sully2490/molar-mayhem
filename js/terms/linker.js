import { TERMS } from '../../content/terms/index.js';
import { escapeAttr } from './html.js';

const SKIP_TAGS = new Set([
  'a', 'button', 'script', 'style', 'svg', 'code', 'textarea', 'input', 'select', 'option',
]);

/**
 * @param {string} html Lesson or problem HTML. Text is already escaped.
 * @param {typeof TERMS} [terms]
 * @returns {string}
 */
export function linkTerms(html, terms = TERMS) {
  const source = String(html ?? '');
  const buckets = buildBuckets(terms);
  const linked = new Set();
  const skip = [];
  let out = '';
  let index = 0;
  while (index < source.length) {
    if (source[index] === '<') {
      const close = source.indexOf('>', index);
      const tag = close === -1 ? source.slice(index) : source.slice(index, close + 1);
      out += tag;
      updateSkip(skip, tag);
      index += tag.length;
      continue;
    }
    const next = source.indexOf('<', index);
    const end = next === -1 ? source.length : next;
    const slice = source.slice(index, end);
    out += skip.length > 0 ? slice : linkSlice(slice, buckets, linked);
    index = end;
  }
  return out;
}

/**
 * Escape plain text, then link the first occurrence of each term.
 * @param {string} text
 * @param {typeof TERMS} [terms]
 */
export function linkPlain(text, terms = TERMS) {
  return linkTerms(escapeText(text), terms);
}

function escapeText(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * @param {typeof TERMS} terms
 */
export function buildBuckets(terms) {
  /** @type {Map<string, Matcher[]>} */
  const buckets = new Map();
  for (const term of terms) {
    const phrases = [term.term, ...(term.aliases ?? [])];
    phrases.forEach((phrase, aliasIndex) => {
      if (typeof phrase !== 'string' || phrase.trim().length < 2) return;
      const formula = term.match === 'formula';
      const key = formula ? `=${phrase[0]}` : phrase[0].toLowerCase();
      const list = buckets.get(key) ?? [];
      list.push({
        id: term.id,
        phrase,
        formula,
        aliasIndex,
      });
      buckets.set(key, list);
    });
  }
  for (const list of buckets.values()) {
    list.sort((left, right) => (
      right.phrase.length - left.phrase.length
      || left.aliasIndex - right.aliasIndex
      || left.id.localeCompare(right.id)
    ));
  }
  return buckets;
}

/**
 * @param {string} slice
 * @param {Map<string, Matcher[]>} buckets
 * @param {Set<string>} linked
 */
function linkSlice(slice, buckets, linked) {
  let out = '';
  let index = 0;
  while (index < slice.length) {
    const hit = longestMatch(slice, index, buckets, linked);
    if (!hit) {
      out += slice[index];
      index += 1;
      continue;
    }
    const visible = slice.slice(index, index + hit.phrase.length);
    out += `<a class="term-link" href="#Terms/${encodeURIComponent(hit.id)}" data-term="${escapeAttr(hit.id)}">${visible}</a>`;
    linked.add(hit.id);
    index += hit.phrase.length;
  }
  return out;
}

function longestMatch(text, index, buckets, linked) {
  const ch = text[index];
  const lists = [];
  const wordList = buckets.get(ch.toLowerCase());
  const formulaList = buckets.get(`=${ch}`);
  if (wordList) lists.push(wordList);
  if (formulaList && formulaList !== wordList) lists.push(formulaList);
  let best = null;
  for (const list of lists) {
    for (const matcher of list) {
      if (linked.has(matcher.id)) continue;
      if (best && matcher.phrase.length < best.phrase.length) break;
      if (!sliceEquals(text, index, matcher)) continue;
      if (!bounded(text, index, matcher.phrase.length)) continue;
      if (!best || matcher.phrase.length > best.phrase.length) best = matcher;
    }
  }
  return best;
}

function sliceEquals(text, index, matcher) {
  const slice = text.slice(index, index + matcher.phrase.length);
  if (slice.length !== matcher.phrase.length) return false;
  return matcher.formula ? slice === matcher.phrase : slice.toLowerCase() === matcher.phrase.toLowerCase();
}

function bounded(text, index, length) {
  return !isWordChar(text[index - 1]) && !isWordChar(text[index + length]);
}

function isWordChar(ch) {
  if (!ch) return false;
  return /[0-9A-Za-z'’\-]/u.test(ch);
}

function updateSkip(skip, tag) {
  const name = tagName(tag);
  if (!name) return;
  const closing = /^<\s*\//.test(tag);
  const selfClosing = /\/>\s*$/.test(tag) || isVoid(name);
  if (closing) {
    const found = skip.lastIndexOf(name);
    if (found !== -1) skip.splice(found, 1);
    return;
  }
  if (selfClosing) return;
  if (SKIP_TAGS.has(name) || /\sdata-no-terms(?:\s|=|>)/.test(tag)) skip.push(name);
}

function tagName(tag) {
  const match = /^<\/?\s*([A-Za-z0-9]+)/.exec(tag);
  return match ? match[1].toLowerCase() : '';
}

function isVoid(name) {
  return name === 'br' || name === 'hr' || name === 'img' || name === 'wbr' || name === 'meta' || name === 'link';
}
