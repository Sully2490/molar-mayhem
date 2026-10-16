import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { bindLearn, chapterFolder, feedbackFor, labelFor, LESSON_FILES, loadLessons, renderLearn } from '../js/learn.js';
import { readProgress } from '../js/progress.js';
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
  assert.match(html, /<label class="answer-label" for="unit-[^"]+">Unit<\/label>/);
  assert.match(html, /inputmode="decimal"/);
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
  const right = feedbackFor({ ok: true }, 1, item);
  assert.equal(right.done, true);
  assert.equal(right.status, 'correct');
  assert.match(right.text, /^Correct\. Helium is only one kind of atom, so it is an element\./);
  const figs = feedbackFor({ ok: false, reason: 'sigfigs', hint: 'Check sig figs.' }, 3, item);
  assert.equal(figs.done, false);
  assert.equal(figs.status, 'sig');
  assert.match(figs.text, /Check sig figs/);
  assert.doesNotMatch(figs.text, /Solution:/);
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

test('Your turn keeps its answer inside a closed details block', () => {
  const lesson = readLesson('content/ch01/classify.json');
  const html = renderLearn([lesson], lesson.id);
  const worked = html.slice(html.indexOf('<h2>Worked example</h2>'), html.indexOf('<h2>Your turn</h2>'));
  const yourTurn = html.slice(html.indexOf('<h2>Your turn</h2>'), html.indexOf('<h2>Practice</h2>'));
  assert.match(worked, /<strong>Answer:<\/strong>/);
  assert.doesNotMatch(worked, /<details>/);
  assert.match(yourTurn, /<details>\s*<summary>Show answer<\/summary>[\s\S]*<strong>Answer:<\/strong>[\s\S]*<\/details>/);
  const beforeDetails = yourTurn.slice(0, yourTurn.indexOf('<details>'));
  assert.doesNotMatch(beforeDetails, /<strong>Answer:<\/strong>/);
});

test('a sig-fig miss in Learn does not spend a try', () => {
  const problem = {
    id: 'sig-demo',
    q: 'What is the molarity?',
    a: '0.1200 M',
    why: 'Divide moles by liters. The quotient uses four figures.',
    hints: ['Divide the moles by the liters.', 'Count four figures in the molarity.'],
    check: { kind: 'numeric', value: 0.12, sigFigs: 4, unit: 'M' },
  };
  const lesson = { id: 'demo', problems: [problem] };
  const input = { value: '0.12', disabled: false };
  const unit = { value: 'M', disabled: false };
  const live = { dataset: {}, textContent: '' };
  const form = {
    closest(selector) {
      return selector === '[data-problem]' ? form : null;
    },
    getAttribute(name) {
      return name === 'data-problem' ? problem.id : null;
    },
    querySelector(selector) {
      if (selector === 'input[name="answer"]' || selector === 'input') return input;
      if (selector === 'input[name="unit"]') return unit;
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
  const submit = () => listeners[0]({ target: form, preventDefault() {} });
  submit();
  submit();
  submit();
  assert.match(live.textContent, /Check sig figs/);
  assert.equal(input.disabled, false);
  assert.equal(unit.disabled, false);
  assert.doesNotMatch(live.textContent, /Solution:/);
  input.value = '9';
  submit();
  assert.match(live.textContent, /Divide the moles by the liters/);
  assert.doesNotMatch(live.textContent, /Count four figures/);
  assert.equal(input.disabled, false);
  input.value = '8';
  submit();
  assert.match(live.textContent, /Count four figures/);
  input.value = '7';
  submit();
  assert.match(live.textContent, /Solution: 0\.1200 M/);
  assert.equal(input.disabled, true);
  const fresh = { value: '0.1200', disabled: false };
  const freshUnit = { value: 'M', disabled: false };
  const freshLive = { dataset: {}, textContent: '' };
  const freshForm = {
    closest(selector) {
      return selector === '[data-problem]' ? freshForm : null;
    },
    getAttribute(name) {
      return name === 'data-problem' ? problem.id : null;
    },
    querySelector(selector) {
      if (selector === 'input[name="answer"]' || selector === 'input') return fresh;
      if (selector === 'input[name="unit"]') return freshUnit;
      if (selector === '.feedback') return freshLive;
      return null;
    },
  };
  const again = {
    dataset: {},
    addEventListener(_type, handler) {
      handler({ target: freshForm, preventDefault() {} });
    },
  };
  bindLearn(again, [lesson]);
  assert.match(freshLive.textContent, /^Correct\. Divide moles by liters\./);
  assert.doesNotMatch(freshLive.textContent, /four figures/);
  assert.equal(fresh.disabled, true);
});

test('Learn saves a miss and leaves a sig-fig warning uncounted', () => {
  const problem = {
    id: 'sig-demo',
    q: 'What is the molarity?',
    a: '0.1200 M',
    why: 'Divide moles by liters.',
    hints: ['Divide the moles by the liters.'],
    check: { kind: 'numeric', value: 0.12, sigFigs: 4, unit: 'M' },
    topic: 'molarity',
  };
  const data = new Map();
  const storage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
  const input = { value: '0.12', disabled: false };
  const unit = { value: 'M', disabled: false };
  const live = { dataset: {}, textContent: '' };
  const form = {
    closest(selector) {
      return selector === '[data-problem]' ? form : null;
    },
    getAttribute(name) {
      return name === 'data-problem' ? problem.id : null;
    },
    querySelector(selector) {
      if (selector === 'input[name="answer"]' || selector === 'input') return input;
      if (selector === 'input[name="unit"]') return unit;
      if (selector === '.feedback') return live;
      return null;
    },
  };
  const root = {
    dataset: {},
    addEventListener(_type, handler) {
      root.submit = handler;
    },
  };
  bindLearn(root, [{ id: 'demo', problems: [problem] }], storage);
  root.submit({ target: form, preventDefault() {} });
  assert.equal(readProgress(storage).misses[problem.id], undefined);
  assert.equal(readProgress(storage).missesByTopic.molarity, undefined);
  input.value = '9';
  root.submit({ target: form, preventDefault() {} });
  root.submit({ target: form, preventDefault() {} });
  assert.equal(readProgress(storage).misses[problem.id], 2);
  assert.equal(readProgress(storage).missesByTopic.molarity, 2);
  input.value = '0.1200';
  root.submit({ target: form, preventDefault() {} });
  assert.equal(readProgress(storage).misses[problem.id], 2);
  assert.equal(readProgress(storage).missesByTopic.molarity, 2);
});

test('lesson links stay on the Learn route', () => {
  assert.equal(lessonIdFromHash('#Learn/ch01-classify'), 'ch01-classify');
  assert.equal(lessonIdFromHash('#learn/ch01-classify'), 'ch01-classify');
  assert.equal(lessonIdFromHash('#Map'), '');
  assert.equal(lessonIdFromHash(''), '');
});

test('Learn opens on chapter tiles with short titles and a continue card', () => {
  const lesson = readLesson('content/ch01/classify.json');
  const html = renderLearn([lesson], '', { lessons: {} });
  assert.match(html, /data-learn-view="modules"/);
  assert.match(html, /data-learn-continue/);
  assert.match(html, /data-module="1"/);
  assert.match(html, /Essential Ideas/);
  assert.match(html, /States and mixtures/);
  assert.match(html, /class="progress-ring"/);
  assert.match(html, /data-mastered="0"/);
  assert.match(html, /data-total="1"/);
  assert.doesNotMatch(html, /<a[^>]*>Sort a sample by state/);
  assert.doesNotMatch(html, /aria-disabled|data-locked|is-locked/);
});

test('a mastered lesson fills that chapter ring', () => {
  const lesson = readLesson('content/ch01/classify.json');
  const html = renderLearn([lesson], '', { lessons: { [lesson.id]: 'mastered' } });
  assert.match(html, /data-module="1"[^>]*data-mastered="1"[^>]*data-total="1"/);
  assert.match(html, /data-continue-kind="done"/);
  assert.match(html, /1 of 1 lessons mastered/);
});

test('a chapter opens seven unlocked items in order', () => {
  const lesson = readLesson('content/ch01/classify.json');
  const html = renderLearn([lesson], 'mod-1', { lessons: { [lesson.id]: 'practicing' } });
  assert.match(html, /data-learn-view="chapter"/);
  assert.match(html, /data-item="overview"[\s\S]*data-item="lesson"[\s\S]*data-item="examples"[\s\S]*data-item="practice"[\s\S]*data-item="quiz"[\s\S]*data-item="videos"[\s\S]*data-item="terms"/);
  assert.match(html, /Open browsing/);
  assert.match(html, /href="#Learn\/mod-1-quiz"/);
  assert.doesNotMatch(html, /aria-disabled|data-locked|is-locked/);
  const modules = renderLearn([lesson], '', { lessons: { [lesson.id]: 'practicing' } });
  assert.match(modules, /data-continue-kind="continue"/);
  assert.match(modules, new RegExp(`data-continue-lesson="${lesson.id}"`));
});

test('quiz, practice, videos, and terms items stay open', () => {
  const lesson = readLesson('content/ch01/classify.json');
  const quiz = renderLearn([lesson], 'mod-1-quiz', { lessons: {} });
  assert.match(quiz, /aria-current="page"/);
  assert.match(quiz, new RegExp(`data-problem="${lesson.problems[0].id}"`));
  assert.match(quiz, /Nothing is locked/);
  const practice = renderLearn([lesson], 'mod-1-practice', { lessons: {} });
  assert.match(practice, new RegExp(`data-problem="${lesson.problems[0].id}"`));
  const videos = renderLearn([lesson], 'mod-1-videos', { lessons: {} });
  assert.match(videos, /No public video is listed/);
  assert.match(videos, /href="#Videos\/1"/);
  const terms = renderLearn([lesson], 'mod-1-terms', { lessons: {} });
  assert.match(terms, /class="term-pills"/);
  assert.match(terms, /href="#Terms\//);
  const examples = renderLearn([lesson], 'mod-1-examples', { lessons: {} });
  assert.match(examples, /Worked examples/);
  assert.match(examples, /<strong>Answer:<\/strong>/);
});

test('lessons inside a chapter follow the OpenStax section number', () => {
  const html = renderLearn([
    { id: 'ch01-classify', ch: 1, openstax_section: 'OpenStax AF2e §1.2', guide_line: 'Later.' },
    { id: 'ch01-context', ch: 1, openstax_section: 'OpenStax AF2e §1.1', guide_line: 'Earlier.' },
  ], 'mod-1-lesson', { lessons: {} });
  const earlier = html.indexOf('Hypothesis, law, theory');
  const later = html.indexOf('States and mixtures');
  assert.ok(earlier >= 0 && later > earlier);
});

test('module hashes are not lesson targets', async () => {
  const { isLessonTarget, parseLearnToken } = await import('../js/learn.js');
  assert.equal(isLessonTarget('mod-1'), false);
  assert.equal(isLessonTarget('mod-3-quiz'), false);
  assert.equal(isLessonTarget(''), false);
  assert.equal(isLessonTarget('ch01-classify'), true);
  assert.equal(parseLearnToken('mod-9-terms').item, 'terms');
  assert.equal(parseLearnToken('mod-0').kind, 'missing');
});

test('number boxes get a phone keypad only when no minus or exponent is needed', async () => {
  const { keypadFor } = await import('../js/learn.js');
  assert.equal(keypadFor({ check: { kind: 'numeric', value: 59.41 } }), ' inputmode="decimal"');
  assert.equal(keypadFor({ check: { kind: 'numeric', value: -29.67 } }), '');
  assert.equal(keypadFor({ check: { kind: 'numeric', value: 4.307e-19 } }), '');
  assert.equal(keypadFor({ check: { kind: 'exact', text: 'sp3' } }), '');
});
