import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Local OCR only. Do not add a paid OCR service unless the owner asks for it.

/**
 * Write OCR text under $MM_SOURCES/ocr. Never write into the repo.
 * @param {{ inputPath: string, sourcesDir?: string, repoRoot?: string, run?: (inputPath: string) => Promise<string> }} options
 */
export async function ocrToSources({
  inputPath,
  sourcesDir = process.env.MM_SOURCES,
  repoRoot = root,
  run = runTesseract,
}) {
  if (!sourcesDir) throw new Error('Set MM_SOURCES to a directory outside the repo.');
  const sources = path.resolve(sourcesDir);
  assertOutsideRepo(sources, repoRoot);
  const base = path.basename(inputPath, path.extname(inputPath)).replace(/[^\w.-]+/g, '-');
  const outPath = path.join(sources, 'ocr', `${base}.txt`);
  assertOutsideRepo(outPath, repoRoot);
  const text = await run(inputPath);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, text.endsWith('\n') ? text : `${text}\n`);
  return outPath;
}

export function runTesseract(inputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('tesseract', [inputPath, 'stdout'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('tesseract is not installed. Use that local program, not a paid OCR service.'));
        return;
      }
      reject(error);
    });
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `tesseract exited ${code}`));
      else resolve(stdout);
    });
  });
}

function assertOutsideRepo(target, repoRoot) {
  const repo = path.resolve(repoRoot);
  const resolved = path.resolve(target);
  if (resolved === repo || resolved.startsWith(`${repo}${path.sep}`)) {
    throw new Error('OCR output must stay outside the repo');
  }
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node scripts/ocr.js <image-or-pdf>');
    process.exitCode = 1;
  } else {
    ocrToSources({ inputPath }).then(
      (outPath) => console.log(`ocr: wrote ${outPath}`),
      (error) => {
        console.error(`ocr: ${error.message}`);
        process.exitCode = 1;
      },
    );
  }
}
