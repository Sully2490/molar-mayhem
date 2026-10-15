import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultContentDir = path.join(root, 'content');

/**
 * Parse any content/*.json files. The coverage manifest check arrives in F01.
 * When MM_SOURCES is unset (as in CI), skip that check with a warning.
 */
export async function checkContent({
  contentDir = defaultContentDir,
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
  }
  log.log('check:content: ok');
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  checkContent().catch((error) => {
    console.error(`check:content: ${error.message}`);
    process.exitCode = 1;
  });
}
