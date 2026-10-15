import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
const rootUrl = new URL('../', import.meta.url);

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(new URL(dir, rootUrl))) {
    const rel = `${dir}${name}`;
    const stat = statSync(new URL(rel, rootUrl));
    if (stat.isDirectory()) sourceFiles(`${rel}/`, out);
    else if (name.endsWith('.js') || name.endsWith('.html')) out.push(rel);
  }
  return out;
}

function read(rel) {
  return readFileSync(new URL(rel, rootUrl), 'utf8');
}

function withoutKeypadFor(source) {
  return source.replace(/export function keypadFor\s*\([^)]*\)\s*\{[\s\S]*?\n\}/, '');
}

function expandConsts(source) {
  const consts = new Map();
  for (const match of source.matchAll(/const (\w+) = '([^']*)'/g)) {
    consts.set(match[1], match[2]);
  }
  return source.replace(/\$\{(\w+)\}/g, (_, name) => consts.get(name) ?? '');
}

test('inputmode="decimal" is produced only by keypadFor', () => {
  const files = [...sourceFiles('js/'), 'index.html'];
  const hits = [];
  for (const rel of files) {
    const source = withoutKeypadFor(read(rel));
    if (source.includes('inputmode="decimal"') || source.includes("inputmode='decimal'")) hits.push(rel);
  }
  assert.deepEqual(hits, []);
  const keypad = read('js/learn.js');
  assert.match(keypad, /export function keypadFor/);
  assert.match(keypad, /inputmode="decimal"/);
});

test('every answer input turns off autocapitalize and spellcheck', () => {
  const files = sourceFiles('js/');
  const misses = [];
  for (const rel of files) {
    const expanded = expandConsts(read(rel));
    const tags = expanded.match(/<(?:input|textarea)\b[^>]*>/gis) ?? [];
    for (const tag of tags) {
      const answer = /\bname="answer"/.test(tag) || /\bname="value"/.test(tag) || /\bdata-qid=/.test(tag);
      if (!answer) continue;
      if (!/autocapitalize="off"/.test(tag) || !/spellcheck="false"/.test(tag)) misses.push(`${rel}: ${tag}`);
    }
  }
  assert.deepEqual(misses, []);
});
