import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkContent } from '../scripts/check-content.js';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);

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

test('in-scope manifest ids must be mapped, and coverage stores ids only', async () => {
  const contentDir = await mkdtemp(path.join(tmpdir(), 'mm-content-'));
  const sourcesDir = await mkdtemp(path.join(tmpdir(), 'mm-sources-'));
  const secretName = 'lecture-slides-do-not-copy.pdf';
  try {
    await writeFile(path.join(contentDir, 'coverage.json'), JSON.stringify({
      mappings: [{ manifest_id: 'ch5-hybrid', lesson_ids: ['c5-hybrid'] }],
    }));
    await writeFile(path.join(sourcesDir, 'manifest.json'), JSON.stringify({
      entries: [
        { id: 'ch5-hybrid', chapter: 5, status: 'in-scope', file: secretName },
        { id: 'ch9-later', chapter: 9, status: 'out-of-scope', file: secretName },
      ],
    }));
    await checkContent({
      contentDir,
      repoRoot,
      env: { MM_SOURCES: sourcesDir },
      log: silentLog(),
    });

    await writeFile(path.join(sourcesDir, 'manifest.json'), JSON.stringify({
      entries: [{ id: 'ch7-yield', chapter: 7, status: 'required', file: secretName }],
    }));
    await assert.rejects(
      () => checkContent({ contentDir, repoRoot, env: { MM_SOURCES: sourcesDir }, log: silentLog() }),
      (error) => {
        assert.match(error.message, /ch7-yield/);
        assert.doesNotMatch(error.message, new RegExp(secretName));
        return true;
      },
    );

    await writeFile(path.join(contentDir, 'coverage.json'), JSON.stringify({
      mappings: [{ manifest_id: 'ch5-hybrid', lesson_ids: ['c5-hybrid'], file: secretName }],
    }));
    await assert.rejects(
      () => checkContent({ contentDir, repoRoot, env: { MM_SOURCES: sourcesDir }, log: silentLog() }),
      /only manifest ids and lesson ids/,
    );
  } finally {
    await rm(contentDir, { recursive: true, force: true });
    await rm(sourcesDir, { recursive: true, force: true });
  }
});

test('MM_SOURCES inside the repo is rejected', async () => {
  const contentDir = await mkdtemp(path.join(tmpdir(), 'mm-content-'));
  try {
    await writeFile(path.join(contentDir, 'coverage.json'), '{"mappings":[]}\n');
    await assert.rejects(
      () => checkContent({
        contentDir,
        repoRoot,
        env: { MM_SOURCES: repoRoot },
        log: silentLog(),
      }),
      /outside the repo/,
    );
  } finally {
    await rm(contentDir, { recursive: true, force: true });
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
