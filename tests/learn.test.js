import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { bindLearn, chapterFolder, feedbackFor, labelFor, LESSON_FILES, loadLessons, renderLearn } from '../js/learn.js';
import { lessonIdFromHash } from '../js/routes.js';

const readLesson = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

test('LESSON_FILES matches every lesson json in content/chNN', () => {
  const onDisk = [];
  for (let chapter = 1; chapter <= 9; chapter += 1) {
    const folder = chapterFolder(chapter);
    const names = readdirSync(new URL(`../${folder}/`, import.meta.url))
      .filter((name) => name.endsWith('.json') && name !== 'index.json' && name !== 'schema.json');
    for (const name of names) onDisk.push(`${folder}/${name}`);
  }
  assert.deepEqual([...LESSON_FILES].sort(), onDisk.sort());
});

test('loadLessons uses the file list when index.json is missing', async () => {
  const fetched = [];
  const lessons = await loadLessons(async (url) => {
    fetched.push(url);
    if (String(url).endsWith('/index.json')) return { ok: false, json: async () => null };
    const lesson = readLesson(url);
    return { ok: true, json: async () => lesson };
  });
  assert.ok(fetched.includes('content/ch01/index.json'));
  assert.ok(fetched.includes('content/ch01/classify.json'));
  assert.equal(lessons.length, LESSON_FILES.length);
  assert.equal(lessons[0].ch, 1);
  assert.ok(lessons.some((lesson) => lesson.id === 'ch01-classify'));
});

test('a lesson renders a labeled answer box and the similar-problem hint', () => {
  const lesson = readLesson('content/ch01/classify.json');
  const html = renderLearn([lesson], lesson.id);
  assert.match(html, /class="answer-label"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-describedby="live-/);
  assert.match(html, /Your answer/);
  assert.match(html, /<strong>Hint:<\/strong>/);
  assert.match(html, /<strong>Answer:<\/strong>/);
  assert.match(html, /Your answer \(g\)/);
  assert.equal(labelFor({ check: { unit: 'g' } }), 'Your answer (g)');
  assert.equal(labelFor({ check: {} }), 'Your answer');
});

test('a wrong answer gets a hint, then the solution on the third miss', () => {
  const lesson = readLesson('content/ch01/classify.json');
  const item = lesson.problems[0];
  const first = feedbackFor({ ok: false, reason: 'exact' }, 1, item);
  assert.equal(first.done, false);
  assert.equal(first.status, 'miss');
  assert.match(first.text, /Not yet/);
  assert.match(first.text, new RegExp(item.hints[0].slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const near = feedbackFor({ ok: false, reason: 'nearMiss', hint: 'Close.' }, 1, item);
  assert.equal(near.status, 'near');
  assert.equal(near.text, 'Close.');
  const last = feedbackFor({ ok: false, reason: 'exact' }, 3, item);
  assert.equal(last.done, true);
  assert.equal(last.status, 'solution');
  assert.match(last.text, new RegExp(`Solution: ${item.a}`));
  const right = feedbackFor({ ok: true, hint: 'Check the significant figures.' }, 1, item);
  assert.equal(right.status, 'correct');
  assert.match(right.text, /significant figures/);
});

test('binding Learn twice does not spend three tries on one submit', () => {
  const lesson = readLesson('content/ch01/classify.json');
  const problem = lesson.problems[0];
  const input = { value: 'not-the-answer', disabled: false };
  const live = { dataset: {}, textContent: '' };
  const form = {
    closest(selector) {
      return selector === '[data-problem]' ? form : null;
    },
    getAttribute(name) {
      return name === 'data-problem' ? problem.id : null;
    },
    querySelector(selector) {
      if (selector === 'input') return input;
      if (selector === '.feedback') return live;
      return null;
    },
  };
  const listeners = [];
  const root = {
    dataset: {},
    addEventListener(_type, handler) {
      listeners.push(handler);
    },
  };
  bindLearn(root, [lesson]);
  bindLearn(root, [lesson]);
  assert.equal(listeners.length, 1);
  listeners[0]({
    target: form,
    preventDefault() {},
  });
  assert.equal(live.dataset.status, 'miss');
  assert.equal(input.disabled, false);
  assert.doesNotMatch(live.textContent, /Solution:/);
});

test('lesson links stay on the Learn route', () => {
  assert.equal(lessonIdFromHash('#Learn/ch01-classify'), 'ch01-classify');
  assert.equal(lessonIdFromHash('#learn/ch01-classify'), 'ch01-classify');
  assert.equal(lessonIdFromHash('#Map'), '');
  assert.equal(lessonIdFromHash(''), '');
});
