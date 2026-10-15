import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkContent } from '../scripts/check-content.js';

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
