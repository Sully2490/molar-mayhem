import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PROGRESS_KEY } from '../js/progress.js';
import {
  examHash,
  freshSession,
  gradeExam3,
  lessonsForSection,
  renderExam3Page,
  renderReport,
  renderRun,
  renderSetup,
  renderSimulator,
  renderWeakSpots,
  scoreReport,
  selectExam3,
  startSession,
  submitSession,
  tickSession,
  weakLessons,
  weightForState,
} from '../js/exam/index.js';

function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
}

const exact = (id, lessonId, chapter, text) => ({
  id,
  lessonId,
  ch: chapter,
  q: `Question ${id}`,
  a: text,
  why: 'Because the count matches.',
  hints: ['Count the groups.'],
  check: { kind: 'exact', text, case: 'insensitive' },
  openstax_section: `OpenStax AF2e §${chapter}.1`,
});

test('practicing lessons weigh more than mastered lessons', () => {
  assert.equal(weightForState('practicing'), 5);
  assert.equal(weightForState(''), 2);
  assert.equal(weightForState('mastered'), 1);
  const items = [
    exact('p1', 'lesson-practice', 5, 'sp3'),
    exact('m1', 'lesson-mastered', 7, 'sp2'),
  ];
  const progress = { lessons: { 'lesson-practice': 'practicing', 'lesson-mastered': 'mastered' } };
  let practice = 0;
  let mastered = 0;
  for (let i = 0; i < 300; i += 1) {
    const [picked] = selectExam3(items, progress, { count: 1, random: Math.random });
    if (picked.lessonId === 'lesson-practice') practice += 1;
    else mastered += 1;
  }
  assert.ok(practice > mastered * 2, `practicing ${practice}, mastered ${mastered}`);
});

test('Exam 3 reads lesson progress and still mixes both chapters', () => {
  const lessons = [
    {
      id: 'a-bond',
      ch: 5,
      guide_line: 'Name the hybrid set.',
      openstax_section: 'OpenStax AF2e §5.2',
      problems: [exact('c5a', 'a-bond', 5, 'sp'), exact('c5b', 'a-bond', 5, 'sp2'), exact('c5c', 'a-bond', 5, 'sp3')],
    },
    {
      id: 'b-yield',
      ch: 7,
      guide_line: 'Find the limiting reactant.',
      openstax_section: 'OpenStax AF2e §7.4',
      problems: [exact('c7a', 'b-yield', 7, '12 g')],
    },
  ];
  const storage = memory({
    [PROGRESS_KEY]: JSON.stringify({
      xp: 10,
      streak: 1,
      lastDay: '2026-10-15',
      lessons: { 'a-bond': 'practicing', 'b-yield': 'mastered' },
      cards: {},
    }),
  });
  const html = renderExam3Page(lessons, storage, { count: 3, random: () => 0 });
  assert.match(html, /data-route="Exam3"/);
  assert.match(html, /data-lesson="a-bond"/);
  assert.match(html, /data-lesson="b-yield"/);
  assert.doesNotMatch(html, />sp</);
  assert.equal(examHash('#Exam3'), 'Exam3');
  assert.equal(examHash('#Final'), 'Final');
  assert.equal(examHash('#Weak'), 'Weak');
  assert.equal(examHash('#Learn'), '');
});

test('a miss on Exam 3 gets a hint before the solution', () => {
  const problem = exact('hyb', 'a-bond', 5, 'sp3');
  const first = gradeExam3(problem, 'sp', 1);
  assert.equal(first.done, false);
  assert.match(first.text, /Count the groups/);
  assert.equal(first.text.includes('sp3'), false);
  const last = gradeExam3(problem, 'sp', 3);
  assert.equal(last.done, true);
  assert.match(last.text, /Solution: sp3/);
});

test('weak spots list the lowest mastery first and link the lesson and drill', () => {
  const lessons = [
    { id: 'mastered-one', ch: 4, guide_line: 'Draw the Lewis structure.' },
    { id: 'practicing-one', ch: 7, guide_line: 'Find the percent yield.' },
    { id: 'fresh-one', ch: 5, guide_line: 'Count sigma and pi bonds.' },
    { id: 'fresh-early', ch: 1, guide_line: 'Count significant figures.' },
  ];
  const progress = {
    lessons: {
      'mastered-one': 'mastered',
      'practicing-one': 'practicing',
    },
  };
  const rows = weakLessons(lessons, progress);
  assert.deepEqual(rows.map((row) => row.lesson.id), ['fresh-early', 'fresh-one', 'practicing-one']);
  const storage = memory({
    [PROGRESS_KEY]: JSON.stringify({ ...progress, xp: 0, streak: 0, lastDay: '', cards: {} }),
  });
  const html = renderWeakSpots(lessons, storage);
  assert.match(html, /data-route="Weak"/);
  assert.match(html, /#Learn\/fresh-early/);
  assert.match(html, /#Learn\/fresh-one/);
  assert.match(html, /#Drill/);
  assert.doesNotMatch(html, /Draw the Lewis structure/);
  const early = html.indexOf('fresh-early');
  const practicing = html.indexOf('practicing-one');
  assert.ok(early < practicing);
});

test('the practice final stays untimed until submit, then reports weak sections', () => {
  const lessons = [readJson('content/ch08/8.1-pressure.json')];
  const finalFile = readJson('content/final/practice-final.json');
  const setup = renderSimulator(freshSession(finalFile.problems, lessons));
  assert.match(setup, /data-phase="setup"/);
  assert.match(setup, /Use a timer/);
  assert.match(renderSetup(freshSession([])), /name="timed"/);
  assert.doesNotMatch(renderSetup(freshSession([])), /checked/);
  assert.match(setup, /disabled/);

  const running = startSession(freshSession(finalFile.problems, lessons), { timed: false });
  assert.equal(running.timed, false);
  assert.equal(running.secondsLeft, null);
  const runHtml = renderRun(running);
  assert.match(runHtml, /No timer/);
  assert.doesNotMatch(runHtml, /1\.069 atm/);
  assert.doesNotMatch(runHtml, /Not yet/);
  assert.doesNotMatch(runHtml, /<iframe/);
  assert.equal(renderSimulator(running).includes('1.069 atm'), false);

  const done = submitSession(running, {});
  assert.equal(done.phase, 'report');
  assert.equal(done.report.earned, 0);
  assert.ok(done.report.possible > 0);
  assert.ok(done.report.chapters.some((row) => row.chapter === 8));
  const reportHtml = renderReport(done.report);
  assert.match(reportHtml, /data-chapter="8"/);
  assert.match(reportHtml, /data-weak-section="OpenStax AF2e §8\.1"/);
  assert.match(reportHtml, /#Learn\/8\.1-pressure/);
  assert.match(reportHtml, /#Drill/);
  assert.match(reportHtml, /data-bonus/);
  const pressure = lessonsForSection(lessons, 'OpenStax AF2e §8.1', 8);
  assert.equal(pressure[0].id, '8.1-pressure');
});

test('a correct answer scores its chapter and a miss links that section', () => {
  const lessons = [{
    id: '8.1-pressure',
    ch: 8,
    guide_line: 'Convert pressure units.',
    openstax_section: 'OpenStax AF2e §8.1',
  }];
  const problems = [
    {
      id: 'gas',
      ch: 8,
      points: 3,
      openstax_section: 'OpenStax AF2e §8.1',
      q: 'Convert the pressure.',
      a: '1 atm',
      why: 'Divide by 760.',
      hints: [],
      check: { kind: 'exact', text: '1 atm', case: 'insensitive' },
    },
    {
      id: 'bonus-bases',
      ch: 7,
      bonus: true,
      points: 10,
      openstax_section: 'OpenStax AF2e §7.2',
      q: 'List the strong bases.',
      a: 'NaOH',
      why: 'Sodium hydroxide is on the list.',
      hints: [],
      check: { kind: 'exact', text: 'NaOH', case: 'formula' },
    },
  ];
  const report = scoreReport(problems, { gas: '1 atm', 'bonus-bases': '' }, lessons);
  assert.equal(report.earned, 3);
  assert.equal(report.possible, 3);
  assert.equal(report.bonusEarned, 0);
  assert.equal(report.bonusPossible, 10);
  assert.equal(report.chapters[0].chapter, 8);
  assert.equal(report.weak.length, 1);
  assert.equal(report.weak[0].section, 'OpenStax AF2e §7.2');
  assert.equal(report.weak[0].lessons.length, 0);
});

test('the timer submits when it reaches zero and stays off by default', () => {
  const problem = exact('t1', 'lesson', 5, 'sp');
  const quiet = startSession(freshSession([problem], []), { timed: false, minutes: 10 });
  assert.equal(tickSession(quiet, 50).phase, 'run');
  const timed = startSession(freshSession([problem], []), { timed: true, minutes: 1 });
  assert.equal(timed.secondsLeft, 60);
  const later = tickSession(timed, 59);
  assert.equal(later.phase, 'run');
  assert.equal(later.secondsLeft, 1);
  const finished = tickSession({ ...later, answers: { t1: 'sp' } }, 1);
  assert.equal(finished.phase, 'report');
  assert.equal(finished.report.earned, 1);
  assert.equal(finished.report.possible, 1);
  assert.equal(finished.report.weak.length, 0);
});
