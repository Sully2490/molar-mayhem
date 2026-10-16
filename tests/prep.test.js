import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { grade } from '../js/grade.js';
import {
  PREP_COUNT,
  expandFinalIndex,
  loadFinalProblems,
  renderPrepPage,
  renderSummary,
  scoreFinal,
  selectPrep,
} from '../js/prep.js';

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
    'content/final/practice-final.json': JSON.stringify(['one.json', 'two.json']),
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
    const error = new Error('Missing content/final/practice-final.json');
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

test('prep draws 10 untimed questions and favors missed ids for a fixed seed', () => {
  const problems = Array.from({ length: 30 }, (_, index) => problem(`p${String(index).padStart(2, '0')}`, {
    ch: (index % 9) + 1,
  }));
  const weak = ['p00', 'p01'];
  const progress = { missed: weak };
  const first = selectPrep(problems, progress, { seed: 7 });
  const second = selectPrep(problems, progress, { seed: 7 });
  assert.equal(first.length, PREP_COUNT);
  assert.deepEqual(first.map((item) => item.id), second.map((item) => item.id));
  assert.notDeepEqual(first.map((item) => item.id), problems.map((item) => item.id));

  const counts = new Map();
  for (let trial = 0; trial < 200; trial += 1) {
    const drawn = selectPrep(problems, progress, { seed: 1000 + trial });
    assert.equal(drawn.length, 10);
    for (const item of drawn) counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  }
  const weakRate = weak.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0) / weak.length;
  const others = problems.map((item) => item.id).filter((id) => !weak.includes(id));
  const otherRate = others.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0) / others.length;
  assert.ok(weakRate > otherRate, `weak ${weakRate}, other ${otherRate}`);

  const html = renderPrepPage(problems, '', { progress, seed: 7 });
  assert.match(html, /data-route="Prep"/);
  assert.match(html, /untimed/);
  assert.equal(/name="timed"|data-timer|countdown/i.test(html), false);
  const ids = [...html.matchAll(/data-qid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 10);
  assert.deepEqual(ids, first.map((item) => item.id));
});

test('prep problem ids are not the full practice final', async () => {
  const finalPath = new URL('../content/final/practice-final.json', import.meta.url);
  const problems = await loadFinalProblems(async (url) => {
    assert.equal(url, 'content/final/practice-final.json');
    return readFile(finalPath, 'utf8');
  });
  const html = renderPrepPage(problems, '', { seed: 3, progress: { missed: ['final-l20'] } });
  const ids = [...html.matchAll(/data-qid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, PREP_COUNT);
  assert.notDeepEqual(ids, problems.map((item) => item.id));
  assert.match(html, /untimed/);
  assert.equal(/name="timed"/.test(html), false);
});

test('published practice-final.json keys all grade correct', async () => {
  const finalPath = new URL('../content/final/practice-final.json', import.meta.url);
  await access(finalPath);
  const problems = await loadFinalProblems(async (url) => {
    assert.equal(url, 'content/final/practice-final.json');
    return readFile(finalPath, 'utf8');
  });
  assert.ok(problems.length >= 60);
  for (const item of problems) {
    assert.equal(grade(item.a, item.check).ok, true, item.id);
  }
});

test('loader reads files written in a folder', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mm-final-'));
  try {
    await writeFile(path.join(dir, 'practice-final.json'), '["item.json"]');
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
