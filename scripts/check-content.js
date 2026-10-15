import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultContentDir = path.join(root, 'content');

const IN_SCOPE = new Set(['in-scope', 'in scope', 'required', 'active']);

/**
 * Parse content JSON, then compare $MM_SOURCES/manifest.json with content/coverage.json.
 * The manifest stays outside the repo. Coverage stores ids only.
 * When MM_SOURCES is unset, skip the manifest with a warning so CI can pass.
 */
export async function checkContent({
  contentDir = defaultContentDir,
  repoRoot = root,
  env = process.env,
  log = console,
} = {}) {
  let names = [];
  try {
    const entries = await readdir(contentDir);
    names = entries.filter((name) => name.endsWith('.json')).sort();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  for (const name of names) {
    const text = await readFile(path.join(contentDir, name), 'utf8');
    try {
      JSON.parse(text);
    } catch {
      throw new Error(`content/${name} is not valid JSON`);
    }
    log.log(`check:content: parsed content/${name}`);
  }

  if (!env.MM_SOURCES) {
    log.warn('check:content: MM_SOURCES is unset; skipping the coverage manifest.');
    log.log('check:content: ok');
    return;
  }

  const sourcesDir = path.resolve(env.MM_SOURCES);
  assertOutsideRepo(sourcesDir, repoRoot);
  const manifest = JSON.parse(await readFile(path.join(sourcesDir, 'manifest.json'), 'utf8'));
  const coverage = JSON.parse(await readFile(path.join(contentDir, 'coverage.json'), 'utf8'));
  const mappings = readCoverage(coverage);
  const entries = Array.isArray(manifest.entries) ? manifest.entries : manifest;

  for (const entry of entries) {
    if (!IN_SCOPE.has(String(entry.status ?? '').trim().toLowerCase())) continue;
    const id = String(entry.id ?? '');
    if (!id) throw new Error('An in-scope manifest entry is missing an id');
    const lessons = mappings.get(id);
    if (!lessons || lessons.length === 0) {
      throw new Error(`In-scope manifest id ${id} is not mapped in content/coverage.json`);
    }
  }
  log.log('check:content: ok');
}

export function readCoverage(coverage) {
  if (!coverage || !Array.isArray(coverage.mappings)) {
    throw new Error('content/coverage.json needs a mappings list');
  }
  const mappings = new Map();
  for (const mapping of coverage.mappings) {
    const keys = Object.keys(mapping);
    if (keys.some((key) => key !== 'manifest_id' && key !== 'lesson_ids')) {
      throw new Error('content/coverage.json may contain only manifest ids and lesson ids');
    }
    const manifestId = String(mapping.manifest_id ?? '');
    const lessonIds = mapping.lesson_ids;
    if (!manifestId || !Array.isArray(lessonIds) || lessonIds.length === 0) {
      throw new Error('Each coverage mapping needs a manifest id and at least one lesson id');
    }
    for (const lessonId of lessonIds) {
      if (typeof lessonId !== 'string' || /[\\/]|\.(pdf|docx|pptx|txt)$/i.test(lessonId)) {
        throw new Error('content/coverage.json may contain only manifest ids and lesson ids');
      }
    }
    mappings.set(manifestId, lessonIds);
  }
  return mappings;
}

function assertOutsideRepo(target, repoRoot) {
  const repo = path.resolve(repoRoot);
  const resolved = path.resolve(target);
  if (resolved === repo || resolved.startsWith(`${repo}${path.sep}`)) {
    throw new Error('MM_SOURCES must stay outside the repo');
  }
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  checkContent().catch((error) => {
    console.error(`check:content: ${error.message}`);
    process.exitCode = 1;
  });
}
