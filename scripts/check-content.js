import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateLesson } from '../js/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultContentDir = path.join(root, 'content');
const SKIP = new Set(['schema.json', 'coverage.json']);

/**
 * Validate lesson JSON under content/, including chapter folders.
 * schema.json and coverage.json are parsed only. The coverage manifest
 * check arrives in F01. When MM_SOURCES is unset (as in CI), skip it.
 */
export async function checkContent({
  contentDir = defaultContentDir,
  env = process.env,
  log = console,
} = {}) {
  let files = [];
  try {
    files = await listJson(contentDir);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  for (const name of files) {
    const text = await readFile(path.join(contentDir, name), 'utf8');
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`content/${name} is not valid JSON`);
    }
    const base = path.basename(name);
    if (!SKIP.has(base) && base !== 'index.json') {
      const errors = validateLesson(data);
      if (errors.length > 0) {
        throw new Error(`content/${name} does not match the lesson schema (${errors[0]})`);
      }
    }
    log.log(`check:content: parsed content/${name}`);
  }

  if (path.resolve(contentDir) === path.resolve(defaultContentDir)) {
    await verifyFetchedPaths(root);
  }

  if (!env.MM_SOURCES) {
    log.warn('check:content: MM_SOURCES is unset; skipping the coverage manifest.');
  }
  log.log('check:content: ok');
}

function chapterIndexPath(chapter) {
  return `content/ch${String(chapter).padStart(2, '0')}/index.json`;
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Every path the page fetches for chapter lists and the glossary index
 * has to be a real file. A listed name has to be a JSON file in that folder.
 */
export async function verifyFetchedPaths(repoRoot) {
  const missing = [];
  for (let chapter = 1; chapter <= 9; chapter += 1) {
    const rel = chapterIndexPath(chapter);
    const full = path.join(repoRoot, rel);
    let listed;
    try {
      listed = JSON.parse(await readFile(full, 'utf8'));
    } catch {
      missing.push(rel);
      continue;
    }
    if (!Array.isArray(listed) || listed.length === 0) {
      missing.push(`${rel} (expected a list of lesson files)`);
      continue;
    }
    const folder = path.dirname(full);
    for (const name of listed) {
      if (typeof name !== 'string' || !name.endsWith('.json') || name.includes('..') || name.includes('/') || name.includes('\\')) {
        missing.push(`${rel} → ${String(name)}`);
        continue;
      }
      if (!await exists(path.join(folder, name))) missing.push(`${path.posix.join(path.posix.dirname(rel), name)}`);
    }
  }
  const termsRel = 'content/terms/index.json';
  try {
    const terms = JSON.parse(await readFile(path.join(repoRoot, termsRel), 'utf8'));
    if (Array.isArray(terms)) {
      for (const name of terms) {
        if (typeof name !== 'string' || !name.endsWith('.json') || name.includes('..') || name.includes('/')) {
          missing.push(`${termsRel} → ${String(name)}`);
          continue;
        }
        if (!await exists(path.join(repoRoot, 'content/terms', name))) missing.push(`content/terms/${name}`);
      }
    } else if (!terms || typeof terms !== 'object' || !Array.isArray(terms.terms) || terms.terms.length === 0) {
      missing.push(`${termsRel} (expected glossary terms)`);
    }
  } catch {
    missing.push(termsRel);
  }
  if (missing.length > 0) throw new Error(`missing fetched path: ${missing[0]}`);
  return missing;
}

async function listJson(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listJson(path.join(dir, entry.name), rel));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(rel);
    }
  }
  return files;
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  checkContent().catch((error) => {
    console.error(`check:content: ${error.message}`);
    process.exitCode = 1;
  });
}
