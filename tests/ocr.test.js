import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { ocrToSources } from '../scripts/ocr.js';

const repoRoot = '/workspace';

test('OCR text is written only under MM_SOURCES', async () => {
  const sourcesDir = await mkdtemp(path.join(tmpdir(), 'mm-sources-'));
  try {
    const outPath = await ocrToSources({
      inputPath: 'page.png',
      sourcesDir,
      repoRoot,
      run: async () => 'sodium chloride',
    });
    assert.equal(outPath.startsWith(sourcesDir), true);
    assert.equal(outPath.includes(`${path.sep}workspace${path.sep}`), false);
    assert.equal(await readFile(outPath, 'utf8'), 'sodium chloride\n');
  } finally {
    await rm(sourcesDir, { recursive: true, force: true });
  }
});

test('OCR refuses to write inside the repo', async () => {
  await assert.rejects(
    () => ocrToSources({
      inputPath: 'page.png',
      sourcesDir: repoRoot,
      repoRoot,
      run: async () => 'nope',
    }),
    /outside the repo/,
  );
});

test('OCR does nothing when MM_SOURCES is unset', async () => {
  await assert.rejects(
    () => ocrToSources({ inputPath: 'page.png', sourcesDir: '', repoRoot, run: async () => 'nope' }),
    /MM_SOURCES/,
  );
});
