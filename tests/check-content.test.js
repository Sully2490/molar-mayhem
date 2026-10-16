import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkContent, verifyFetchedPaths } from '../scripts/check-content.js';

const LESSON = {
  id: 'sample',
  ch: 1,
  openstax_section: 'OpenStax AF2e §1.1',
  guide_line: 'A short lesson.',
  steps: ['Start here.'],
  worked_example: { q: 'What is 1 + 1?', answer: '2' },
  similar_problem: { q: 'What is 2 + 2?', hint: 'Add the numbers.', answer: '4' },
  sources: ['OpenStax AF2e §1.1'],
};

function silentLog() {
  return { log() {}, warn() {}, lines: [] };
}

test('check:content parses JSON and skips a missing manifest', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mm-content-'));
  const warnings = [];
  const logs = [];
  try {
    await writeFile(path.join(dir, 'sample.json'), `${JSON.stringify(LESSON)}\n`);
    await mkdir(path.join(dir, 'ch01'));
    await writeFile(path.join(dir, 'ch01', 'nested.json'), `${JSON.stringify({ ...LESSON, id: 'nested' })}\n`);
    await writeFile(path.join(dir, 'schema.json'), '{"$id":"lesson"}\n');
    await checkContent({
      contentDir: dir,
      env: {},
      log: {
        log: (line) => logs.push(line),
        warn: (line) => warnings.push(line),
      },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  assert.match(logs.join('\n'), /parsed content\/sample\.json/);
  assert.match(logs.join('\n'), /parsed content\/ch01\/nested\.json/);
  assert.match(logs.join('\n'), /parsed content\/schema\.json/);
  assert.match(warnings.join('\n'), /MM_SOURCES is unset/);
  assert.match(logs.join('\n'), /check:content: ok/);
});

test('check:content rejects invalid JSON without printing the file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mm-content-'));
  const secret = 'do-not-echo-this-source-text';
  try {
    await writeFile(path.join(dir, 'broken.json'), `{${secret}`);
    await assert.rejects(
      () => checkContent({ contentDir: dir, env: { MM_SOURCES: '/outside' }, log: silentLog() }),
      (error) => {
        assert.match(error.message, /broken\.json is not valid JSON/);
        assert.doesNotMatch(error.message, new RegExp(secret));
        return true;
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('check:content rejects a lesson that misses the schema', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mm-content-'));
  const secret = 'do-not-echo-this-question';
  try {
    await mkdir(path.join(dir, 'ch02'));
    await writeFile(path.join(dir, 'ch02', 'partial.json'), JSON.stringify({ id: 'partial', q: secret }));
    await assert.rejects(
      () => checkContent({ contentDir: dir, env: { MM_SOURCES: '/outside' }, log: silentLog() }),
      (error) => {
        assert.match(error.message, /content\/ch02\/partial\.json does not match the lesson schema/);
        assert.match(error.message, /Missing ch/);
        assert.doesNotMatch(error.message, new RegExp(secret));
        return true;
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a missing content directory is fine', async () => {
  const logs = [];
  await checkContent({
    contentDir: path.join(tmpdir(), 'mm-missing-content-dir'),
    env: { MM_SOURCES: '' },
    log: { log: (line) => logs.push(line), warn() {} },
  });
  assert.match(logs.join('\n'), /check:content: ok/);
});

test('every chapter list and the glossary index is a real fetched path', async () => {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  await verifyFetchedPaths(repoRoot);
});

/**
 * Numbers a student could copy from the worked example.
 * Formula subscripts (H2, CH4) and orbital labels (1s2, 2p6) are not data.
 * Scientific-notation constants (k = 2.179e-18) are not the problem's inputs.
 */
function questionNumbers(text) {
  const stripped = String(text)
    .replace(/\d+[spdf]\d*/gi, ' ')
    .replace(/([A-Za-z])\d+/g, '$1 ');
  return [...stripped.matchAll(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g)]
    .map((match) => match[0])
    .filter((token) => !/[eE]/.test(token))
    .sort();
}

function normalizeQuestion(text) {
  return String(text)
    .toLowerCase()
    .replace(/smallest whole-number /g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sameNumberList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function practiceReusesWorkedExample(lesson) {
  const worked = lesson?.worked_example?.q;
  if (typeof worked !== 'string' || !Array.isArray(lesson.problems)) return [];
  const workedNumbers = questionNumbers(worked);
  const workedText = normalizeQuestion(worked);
  const hasDecimal = workedNumbers.some((token) => token.includes('.'));
  const hits = [];
  for (const problem of lesson.problems) {
    if (typeof problem?.q !== 'string') continue;
    const numbers = questionNumbers(problem.q);
    const sameNumbers = hasDecimal && sameNumberList(numbers, workedNumbers);
    const sameText = workedText.length > 0 && normalizeQuestion(problem.q) === workedText;
    if (sameNumbers || sameText) hits.push(problem.id || problem.q);
  }
  return hits;
}

test('practice that copies the worked example numbers or wording is rejected', () => {
  const copiedNumbers = {
    worked_example: { q: '25.00 mL of HCl is titrated with 18.40 mL of 0.1000 M NaOH.' },
    problems: [{ id: 'copy', q: 'Find the molarity. 25.00 mL of HCl meets 18.40 mL of 0.1000 M NaOH.' }],
  };
  assert.deepEqual(practiceReusesWorkedExample(copiedNumbers), ['copy']);

  const copiedWords = {
    worked_example: { q: 'Butter melts in a warm pan. Is that a physical change or a chemical change?' },
    problems: [{ id: 'words', q: 'Butter melts in a warm pan. Is that a physical change or a chemical change?' }],
  };
  assert.deepEqual(practiceReusesWorkedExample(copiedWords), ['words']);

  const filler = {
    worked_example: { q: 'Balance C2H6 + O2 -> CO2 + H2O. Give the coefficients in order, separated by commas.' },
    problems: [{ id: 'ethane', q: 'Balance C2H6 + O2 -> CO2 + H2O. Give the smallest whole-number coefficients in order, separated by commas.' }],
  };
  assert.deepEqual(practiceReusesWorkedExample(filler), ['ethane']);

  const different = {
    worked_example: { q: 'Use 4.000 g of H2. The equation is 2 H2 + O2 -> 2 H2O.' },
    problems: [{ id: 'new', q: 'Use 6.500 g of H2. The equation is 2 H2 + O2 -> 2 H2O.' }],
  };
  assert.deepEqual(practiceReusesWorkedExample(different), []);

  const formulaOnly = {
    worked_example: { q: 'What hybridization does C use in CH4?' },
    problems: [{ id: 'sf4', q: 'What hybridization does S use in SF4?' }],
  };
  assert.deepEqual(practiceReusesWorkedExample(formulaOnly), []);

  const sharedConstant = {
    worked_example: { q: 'A hydrogen electron falls from n = 3 to n = 2. Use k = 2.179e-18 J.' },
    problems: [{ id: 'he', q: 'What is the energy of the electron in He+ at n = 3? He+ has Z = 2. Use k = 2.179e-18 J.' }],
  };
  assert.deepEqual(practiceReusesWorkedExample(sharedConstant), []);
});

test('no chapter 1–7 practice problem repeats its worked example', async () => {
  const hits = [];
  for (let chapter = 1; chapter <= 7; chapter += 1) {
    const folder = `ch${String(chapter).padStart(2, '0')}`;
    const dir = new URL(`../content/${folder}/`, import.meta.url);
    const names = (await readdir(dir)).filter((name) => name.endsWith('.json') && name !== 'index.json');
    for (const name of names) {
      const lesson = JSON.parse(await readFile(new URL(name, dir), 'utf8'));
      const reused = practiceReusesWorkedExample(lesson);
      if (reused.length > 0) hits.push(`${folder}/${name}: ${reused.join(', ')}`);
    }
  }
  assert.deepEqual(hits, []);
});
