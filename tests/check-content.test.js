import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkContent } from '../scripts/check-content.js';

function silentLog() {
  return { log() {}, warn() {}, lines: [] };
}

test('check:content parses JSON and skips a missing manifest', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mm-content-'));
  const warnings = [];
  const logs = [];
  try {
    await writeFile(path.join(dir, 'sample.json'), '{"ok":true}\n');
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

test('a missing content directory is fine', async () => {
  const logs = [];
  await checkContent({
    contentDir: path.join(tmpdir(), 'mm-missing-content-dir'),
    env: { MM_SOURCES: '' },
    log: { log: (line) => logs.push(line), warn() {} },
  });
  assert.match(logs.join('\n'), /check:content: ok/);
});
