import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { grade } from '../js/grade.js';
import { expandFinalIndex, loadFinalProblems, renderPrepPage, renderSummary, scoreFinal } from '../js/prep.js';

function problem(id, overrides = {}) {
  return {
    id,
    ch: 1,
    q: `Question ${id}`,
    a: '4',
    why: `Worked solution for ${id}.`,
    hints: ['A hint'],
    check: { kind: 'numeric', value: 4, unit: null },
    ...overrides,
  };
}

test('a file index loads every problem and each key grades correct', async () => {
  const files = {
    'content/final/index.json': JSON.stringify(['one.json', 'two.json']),
    'content/final/one.json': JSON.stringify(problem('one', { ch: 5, a: '4' })),
    'content/final/two.json': JSON.stringify({
      problems: [problem('two', {
        ch: 7,
        q: 'Name the shape.',
        a: 'bent',
        why: 'Two bonds and two lone pairs make the shape bent.',
        check: { kind: 'exact', text: 'bent', case: 'insensitive' },
      })],
    }),
  };
  const problems = await loadFinalProblems(async (url) => {
    if (!(url in files)) {
      const error = new Error(`Missing ${url}`);
      error.status = 404;
      throw error;
    }
    return files[url];
  });
  assert.deepEqual(problems.map((item) => item.id), ['one', 'two']);
  const responses = Object.fromEntries(problems.map((item) => [item.id, item.a]));
  const rows = scoreFinal(problems, responses);
  assert.equal(rows.every((row) => row.ok), true);
  for (const item of problems) {
    assert.equal(grade(item.a, item.check).ok, true, item.id);
    assert.equal(grade('', item.check).ok, false, item.id);
  }
  const html = renderSummary(scoreFinal(problems, { one: '9', two: 'bent' }));
  assert.match(html, /Worked solution for one/);
  assert.match(html, /Key:/);
  assert.match(html, /data-result="one"/);
  assert.match(html, /1 of 2/);
});

test('inline problems and a problems list are accepted', async () => {
  const inline = await expandFinalIndex([problem('inline')], async () => {
    throw new Error('no file fetch');
  });
  assert.equal(inline.length, 1);
  const wrapped = await expandFinalIndex({ problems: [problem('wrapped')] }, async () => {
    throw new Error('no file fetch');
  });
  assert.equal(wrapped[0].id, 'wrapped');
});

test('a missing final folder yields no questions', async () => {
  const problems = await loadFinalProblems(async () => {
    const error = new Error('Missing content/final/index.json');
    error.status = 404;
    throw error;
  });
  assert.deepEqual(problems, []);
});

test('a problem that breaks the schema is rejected', async () => {
  await assert.rejects(
    () => expandFinalIndex([{ q: 'Missing the check' }], async () => ''),
    /content\/final problem/,
  );
});

test('the prep page is untimed and labels every loaded answer', () => {
  const problems = [problem('one', { ch: 5 }), problem('two', { ch: 7 })];
  const html = renderPrepPage(problems);
  assert.match(html, /data-route="Prep"/);
  assert.match(html, /untimed/);
  assert.equal(/countdown|data-timer|minutes left/i.test(html), false);
  assert.equal((html.match(/class="answer-label"/g) ?? []).length, 2);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Chapter 5/);
  assert.match(html, /Chapter 7/);
  const empty = renderPrepPage([]);
  assert.match(empty, /No practice-final questions are published yet/);
  assert.equal(/class="answer-label"/.test(empty), false);
});

test('published content/final keys all grade correct', async () => {
  const indexPath = new URL('../content/final/index.json', import.meta.url);
  try {
    await access(indexPath);
  } catch {
    return;
  }
  const dir = path.dirname(indexPath.pathname);
  const problems = await loadFinalProblems(async (url) => {
    const name = url.replace(/^content\/final\//, '');
    return readFile(path.join(dir, name), 'utf8');
  });
  assert.ok(problems.length > 0);
  for (const item of problems) {
    assert.equal(grade(item.a, item.check).ok, true, item.id);
  }
});

test('loader reads files written in a folder', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mm-final-'));
  try {
    await writeFile(path.join(dir, 'index.json'), '["item.json"]');
    await writeFile(path.join(dir, 'item.json'), `${JSON.stringify(problem('disk'))}\n`);
    const problems = await loadFinalProblems(async (url) => {
      const name = url.replace(/^content\/final\//, '');
      try {
        return await readFile(path.join(dir, name), 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') throw error;
        throw error;
      }
    });
    assert.equal(grade(problems[0].a, problems[0].check).ok, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
