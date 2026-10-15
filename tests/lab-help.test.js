import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LAB_TOOLS } from '../js/lab/chem.js';
import { grade } from '../js/grade.js';
import {
  ATTEMPTS,
  categoryFor,
  helpAfterCheck,
  labHelpCategories,
  practiceProblems,
  renderLabHelp,
  renderPracticeItem,
} from '../js/lab/help.js';
import { initialLabState, renderLab } from '../js/lab/index.js';
import {
  BALMER_VISIBLE,
  LABEL_GAP,
  SPECTRUM_LAYOUT,
  levelLabelLayout,
  renderSpectrumStrip,
  spectrumX,
  waveColor,
} from '../js/lab/picture-view.js';
import { validateLesson } from '../js/schema.js';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('lab help catalog is original, cites sections, and passes the lesson check', () => {
  const catalog = JSON.parse(read('content/lab-help.json'));
  assert.deepEqual(validateLesson(catalog), []);
  assert.equal(catalog.categories.length, LAB_TOOLS.length);
  const tools = new Set(catalog.categories.map((item) => item.tool));
  for (const tool of LAB_TOOLS) assert.equal(tools.has(tool.id), true, tool.id);
  const blob = JSON.stringify(catalog);
  assert.doesNotMatch(blob, /Study Guide|1045|Aktiv|canvas|instructor/i);
  assert.doesNotMatch(blob, /p\.\s*\d+|page\s+\d+/i);
  for (const category of catalog.categories) {
    assert.ok(category.steps.length >= 3, category.tool);
    assert.match(category.worked.q, /\S/);
    assert.match(category.worked.answer, /\S/);
    assert.ok(category.worked.steps.length >= 2, category.tool);
    assert.ok(category.practice.length >= 3, category.tool);
    assert.ok(category.openstax.length >= 1, category.tool);
    for (const ref of category.openstax) assert.match(ref, /^OpenStax AF2e §\d+\.\d+$/);
    const lesson = [...walkLessons()].find((item) => item.id === category.lessonId);
    assert.ok(lesson, category.lessonId);
    assert.match(lesson.openstax_section, /OpenStax AF2e §/);
  }
});

test('every lab tool renders a collapsed help panel with generated practice', () => {
  for (const tool of LAB_TOOLS) {
    const html = renderLab(initialLabState(tool.id), true);
    assert.match(html, new RegExp(`data-lab-help="${tool.id}"`));
    assert.match(html, /<details class="lab-help"/);
    assert.doesNotMatch(html, /<details class="lab-help"[^>]* open/);
    assert.match(html, /Tutor hint/);
    assert.match(html, /Worked example/);
    assert.match(html, /OpenStax Chemistry: Atoms First 2e §\d+\.\d+/);
    assert.match(html, new RegExp(`href="#Learn/${categoryFor(tool.id).lessonId}"`));
    const problems = practiceProblems(categoryFor(tool.id));
    assert.ok(problems.length >= 3, tool.id);
    const questions = new Set(problems.map((problem) => problem.q));
    assert.equal(questions.size, problems.length, tool.id);
    for (const problem of problems) {
      assert.match(problem.q, /\S/);
      assert.match(problem.a, /\S/);
      assert.ok(problem.hints.length >= 1);
      assert.equal(grade(problem.a, problem.check).ok, true, `${tool.id} ${problem.q}`);
    }
    assert.doesNotMatch(html, /Solution:/);
  }
});

test('a practice miss shows a hint, and the answer waits until the last try', () => {
  const category = categoryFor('orbitals');
  const problem = practiceProblems(category)[2];
  assert.equal(problem.a, 'sphere');
  const hidden = renderPracticeItem('orbitals', problem, {});
  assert.doesNotMatch(hidden, /sphere/);
  assert.doesNotMatch(hidden, /Solution:/);
  let help = { open: true, tries: {}, notes: {}, drafts: {} };
  help = helpAfterCheck(help, 'orbitals', problem.index, 'cube', problem);
  assert.match(help.notes[`${'orbitals'}:${problem.index}`].text, /Not yet/);
  assert.doesNotMatch(help.notes[`orbitals:${problem.index}`].text, /Solution:/);
  const hinted = renderLabHelp('orbitals', help);
  assert.match(hinted, /Not yet/);
  assert.doesNotMatch(hinted, /Solution:/);
  help = helpAfterCheck(help, 'orbitals', problem.index, 'box', problem);
  assert.equal(help.notes[`orbitals:${problem.index}`].done, false);
  help = helpAfterCheck(help, 'orbitals', problem.index, 'oval', problem);
  assert.equal(help.tries[`orbitals:${problem.index}`], ATTEMPTS);
  assert.match(help.notes[`orbitals:${problem.index}`].text, /Solution: sphere/);
  const revealed = renderLabHelp('orbitals', help);
  assert.match(revealed, /Solution: sphere/);
  assert.match(revealed, / open/);
  const stuck = helpAfterCheck(help, 'orbitals', problem.index, 'sphere', problem);
  assert.equal(stuck, help);
});

test('a correct practice answer stops before the solution', () => {
  const problem = practiceProblems(categoryFor('ionic'))[1];
  assert.equal(problem.a, 'Al2O3');
  const help = helpAfterCheck({}, 'ionic', problem.index, 'Al2O3', problem);
  assert.equal(help.notes[`ionic:${problem.index}`].status, 'correct');
  assert.match(help.notes[`ionic:${problem.index}`].text, /Correct/);
  assert.doesNotMatch(renderLabHelp('ionic', help), /Solution:/);
});

test('hydrogen labels for n = 4, 5, 6, and infinity are separated by leader lines', () => {
  const rows = levelLabelLayout();
  const crowded = ['inf', '6', '5', '4'].map((key) => rows.find((row) => row.key === key));
  const labels = crowded.map((row) => row.labelY).sort((a, b) => a - b);
  for (let index = 1; index < labels.length; index += 1) {
    assert.ok(labels[index] - labels[index - 1] >= LABEL_GAP - 0.01);
  }
  const html = renderLab(initialLabState('levels'), true);
  for (const key of ['4', '5', '6', 'inf']) {
    assert.match(html, new RegExp(`data-leader="${key}"`));
    assert.match(html, new RegExp(`data-level-label="${key}"`));
  }
  const positions = [...html.matchAll(/data-level-label="(inf|\d)" data-line-y="([\d.]+)" data-label-y="([\d.]+)"/g)];
  assert.equal(positions.length, 7);
  const byKey = Object.fromEntries(positions.map((match) => [match[1], { line: Number(match[2]), label: Number(match[3]) }]));
  assert.ok(byKey['6'].line < byKey['4'].line);
  assert.ok(byKey['4'].line < byKey['1'].line);
  assert.ok(Math.abs(byKey['6'].label - byKey['5'].label) >= LABEL_GAP - 0.01);
  assert.ok(Math.abs(byKey.inf.label - byKey['6'].label) >= LABEL_GAP - 0.01);
});

test('the hydrogen strip colors the visible Balmer lines and shades UV and IR', () => {
  const html = renderSpectrumStrip([], '');
  assert.match(html, /data-band="uv"/);
  assert.match(html, /data-band="ir"/);
  assert.match(html, />UV</);
  assert.match(html, />Lyman</);
  assert.match(html, />IR</);
  assert.match(html, />Paschen</);
  assert.match(html, /id="h-vis"/);
  assert.match(html, /380/);
  assert.match(html, /750 nm/);
  for (const line of BALMER_VISIBLE) {
    const color = waveColor(line.lambda);
    const marker = html.match(new RegExp(`data-balmer="${line.lambda}"[^>]*fill="([^"]+)"`));
    assert.ok(marker, String(line.lambda));
    assert.equal(marker[1], color);
    assert.ok(spectrumX(line.lambda) > SPECTRUM_LAYOUT.visible.x);
    assert.ok(spectrumX(line.lambda) < SPECTRUM_LAYOUT.visible.x + SPECTRUM_LAYOUT.visible.width);
  }
  const violet = waveColor(410);
  const blue = waveColor(434);
  const teal = waveColor(486);
  const red = waveColor(656);
  assert.notEqual(violet, blue);
  assert.notEqual(blue, teal);
  assert.equal(red, 'rgb(255, 0, 0)');
  assert.ok(teal.includes(', 255)') || /rgb\(0, 2\d\d, 255\)/.test(teal));
  const marked = renderSpectrumStrip([{ lambdaNm: 121.6, nf: 1, color: '#667085' }], 'uv');
  assert.match(marked, /data-active-band="uv"/);
  assert.doesNotMatch(marked, /data-user-line/);
  const extra = renderSpectrumStrip([{ lambdaNm: 397, nf: 2, color: 'rgb(1, 2, 3)' }], 'visible');
  assert.match(extra, /data-user-line="397.0"/);
});

function walkLessons() {
  const files = [
    ['ch03-electromagnetic', 'content/ch03/3.1.json'],
    ['ch03-bohr', 'content/ch03/3.2.json'],
    ['ch03-quantum', 'content/ch03/3.3.json'],
    ['ch03-configurations', 'content/ch03/3.4.json'],
    ['ch03-periodic-trends', 'content/ch03/3.5.json'],
    ['ch04-ionic-bonding', 'content/ch04/4.1-ionic-bonding.json'],
    ['ch04-lewis-structures', 'content/ch04/4.4-lewis-structures.json'],
    ['ch04-shape-and-polarity', 'content/ch04/4.6-shape-and-polarity.json'],
  ];
  return files.map(([, file]) => JSON.parse(read(file)));
}
