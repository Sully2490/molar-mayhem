import { readdir, readFile } from 'node:fs/promises';
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
    if (!SKIP.has(path.basename(name))) {
      const errors = validateLesson(data);
      if (errors.length > 0) {
        throw new Error(`content/${name} does not match the lesson schema (${errors[0]})`);
      }
    }
    log.log(`check:content: parsed content/${name}`);
  }

  if (!env.MM_SOURCES) {
    log.warn('check:content: MM_SOURCES is unset; skipping the coverage manifest.');
  }
  log.log('check:content: ok');
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
