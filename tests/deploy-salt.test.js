/**
 * CI guard for the service-worker cache salt.
 *
 * On a pull request, fetch the base branch with enough history to find a
 * merge base, then compare:
 *   git diff --name-only origin/<base>...HEAD
 *
 * Fail with "Bump DEPLOY_SALT in sw.js" when that diff changes any file the
 * service worker can serve or cache and the same three-dot diff does not add
 * or remove a `const DEPLOY_SALT = ` line in sw.js.
 *
 * Exempt paths: tests/, docs/, *.md, .github/, and package files
 * (package.json and package-lock.json, any directory).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SALT_BUMP_MESSAGE = 'Bump DEPLOY_SALT in sw.js';
const SALT_LINE = /^[+-]const DEPLOY_SALT = /;
const PACKAGE_FILES = new Set(['package.json', 'package-lock.json']);
const checking = process.argv.includes('--check');

function isExemptPath(file) {
  const path = String(file).replaceAll('\\', '/').replace(/^\.\//, '').trim();
  if (path === 'tests' || path.startsWith('tests/')) return true;
  if (path === 'docs' || path.startsWith('docs/')) return true;
  if (path === '.github' || path.startsWith('.github/')) return true;
  if (path.endsWith('.md')) return true;
  const base = path.slice(path.lastIndexOf('/') + 1);
  return PACKAGE_FILES.has(base);
}

function deploySaltLineChanged(diffText) {
  return String(diffText).split('\n').some((line) => SALT_LINE.test(line.replace(/\r$/, '')));
}

function needsSaltBump(files, saltDiff) {
  const cached = files.filter((file) => !isExemptPath(file));
  return cached.length > 0 && !deploySaltLineChanged(saltDiff);
}

function isSafeBaseRef(baseRef) {
  return typeof baseRef === 'string'
    && /^[A-Za-z0-9._/-]+$/.test(baseRef)
    && !baseRef.includes('..')
    && !baseRef.startsWith('/')
    && !baseRef.endsWith('/');
}

function git(cwd, args, options = {}) {
  const result = spawnSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  if (options.inherit) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stdout.write(stderr);
  }
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((stderr || stdout).trim() || `git ${args.join(' ')} failed`);
  }
  return stdout;
}

function mergeBaseExists(cwd, left, right) {
  const result = spawnSync('git', ['merge-base', left, right], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0 && result.stdout.trim().length > 0;
}

function ensureBaseHistory(baseRef, options = {}) {
  if (!isSafeBaseRef(baseRef)) throw new Error(`Refusing base ref: ${baseRef}`);
  const cwd = options.cwd ?? process.cwd();
  const inherit = options.inherit === true;
  const remoteRef = `origin/${baseRef}`;
  const refspec = `+refs/heads/${baseRef}:refs/remotes/origin/${baseRef}`;
  const shallow = git(cwd, ['rev-parse', '--is-shallow-repository'], { inherit }).trim() === 'true';
  if (!shallow) {
    git(cwd, ['fetch', '--no-tags', 'origin', refspec], { inherit });
  } else {
    let depth = options.initialDepth ?? 50;
    let found = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      git(cwd, ['fetch', '--no-tags', `--deepen=${depth}`, 'origin'], { inherit });
      git(cwd, ['fetch', '--no-tags', `--depth=${depth}`, 'origin', refspec], { inherit });
      if (mergeBaseExists(cwd, remoteRef, 'HEAD')) {
        found = true;
        break;
      }
      depth *= 2;
    }
    if (!found) {
      try {
        git(cwd, ['fetch', '--no-tags', '--unshallow', 'origin'], { inherit });
      } catch {
        // The remote may already be complete, or it may not unshallow every ref.
      }
      git(cwd, ['fetch', '--no-tags', 'origin', refspec], { inherit });
    }
  }
  if (!mergeBaseExists(cwd, remoteRef, 'HEAD')) {
    throw new Error(`No merge base between ${remoteRef} and HEAD`);
  }
  return remoteRef;
}

function comparisonSpec(baseRev, headRev = 'HEAD') {
  return `${baseRev}...${headRev}`;
}

function readThreeDot(cwd, baseRev, headRev = 'HEAD') {
  const spec = comparisonSpec(baseRev, headRev);
  const names = git(cwd, ['diff', '--name-only', spec]);
  const saltDiff = git(cwd, ['diff', '-U0', spec, '--', 'sw.js']);
  return {
    spec,
    files: names.split('\n').map((line) => line.trim()).filter(Boolean),
    saltDiff,
  };
}

function runCheck() {
  const baseRef = process.env.BASE_REF || process.env.GITHUB_BASE_REF;
  if (!baseRef) throw new Error('Set BASE_REF to the pull request base branch');
  const remoteRef = ensureBaseHistory(baseRef, { inherit: true });
  const diff = readThreeDot(process.cwd(), remoteRef);
  console.log(`git diff --name-only ${diff.spec}`);
  if (!needsSaltBump(diff.files, diff.saltDiff)) return;
  const cached = diff.files.filter((file) => !isExemptPath(file)).sort();
  console.error(SALT_BUMP_MESSAGE);
  for (const file of cached) console.error(file);
  process.exit(1);
}

function commitAll(cwd, message) {
  git(cwd, ['add', '-A']);
  git(cwd, ['commit', '-m', message]);
}

function initRepo(cwd) {
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.email', 'dev@example.com']);
  git(cwd, ['config', 'user.name', 'Dev']);
}

function withRepo(fn) {
  const cwd = mkdtempSync(join(tmpdir(), 'deploy-salt-'));
  try {
    initRepo(cwd);
    fn(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function writeSalt(cwd, salt) {
  writeFileSync(join(cwd, 'sw.js'), `const DEPLOY_SALT = '${salt}';\n`);
}

function ghaMergeResult(mutate) {
  const src = mkdtempSync(join(tmpdir(), 'deploy-salt-src-'));
  const clone = mkdtempSync(join(tmpdir(), 'deploy-salt-cln-'));
  try {
    initRepo(src);
    writeSalt(src, 'a');
    mkdirSync(join(src, 'content', 'ch01'), { recursive: true });
    writeFileSync(join(src, 'content', 'ch01', 'a.json'), '{"n":1}\n');
    commitAll(src, 'base');
    for (let i = 0; i < 4; i += 1) {
      writeFileSync(join(src, 'log.txt'), `m${i}\n`, { flag: 'a' });
      commitAll(src, `main ${i}`);
    }
    git(src, ['checkout', '-b', 'feature']);
    mutate(src);
    commitAll(src, 'change');
    git(src, ['checkout', '-b', 'pr-merge', 'main']);
    git(src, ['merge', '--no-ff', 'feature', '-m', 'merge pr']);
    const merge = git(src, ['rev-parse', 'pr-merge']).trim();
    initRepo(clone);
    git(clone, ['remote', 'add', 'origin', `file://${src}`]);
    git(clone, ['fetch', '--no-tags', '--depth=1', 'origin', `+${merge}:refs/remotes/pull/1/merge`]);
    git(clone, ['checkout', '--detach', 'refs/remotes/pull/1/merge']);
    return spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--check'], {
      cwd: clone,
      env: { ...process.env, BASE_REF: 'main' },
      encoding: 'utf8',
    });
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(clone, { recursive: true, force: true });
  }
}

if (checking) {
  try {
    runCheck();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
} else {
  test('cached files require a DEPLOY_SALT line change', () => {
    const saltDiff = [
      "-const DEPLOY_SALT = '20261015f';",
      "+const DEPLOY_SALT = '20261015g';",
    ].join('\n');
    const cases = [
      { files: ['content/ch01/a.json'], saltDiff: '', bump: true },
      { files: ['js/app.js', 'css/styles.css', 'index.html'], saltDiff: '', bump: true },
      { files: ['sw.js'], saltDiff: '', bump: true },
      { files: ['content/ch01/a.json'], saltDiff, bump: false },
      { files: ['sw.js'], saltDiff, bump: false },
      { files: ['tests/deploy-salt.test.js'], saltDiff: '', bump: false },
      { files: ['docs/STATUS.md', 'docs/notes.txt'], saltDiff: '', bump: false },
      { files: ['README.md', 'content/ch01/readme.md'], saltDiff: '', bump: false },
      { files: ['.github/workflows/test.yml'], saltDiff: '', bump: false },
      { files: ['package.json', 'package-lock.json', 'js/pkg/package.json'], saltDiff: '', bump: false },
      { files: [], saltDiff: '', bump: false },
      { files: ['content/ch01/a.json', 'tests/a.test.js', 'README.md'], saltDiff: '', bump: true },
    ];
    for (const entry of cases) {
      assert.equal(needsSaltBump(entry.files, entry.saltDiff), entry.bump, entry.files.join(','));
    }
    assert.equal(SALT_BUMP_MESSAGE, 'Bump DEPLOY_SALT in sw.js');
  });

  test('only an added or removed DEPLOY_SALT assignment counts as a salt change', () => {
    assert.equal(deploySaltLineChanged(" const DEPLOY_SALT = 'x';"), false);
    assert.equal(deploySaltLineChanged('+// bump DEPLOY_SALT later'), false);
    assert.equal(deploySaltLineChanged("+const DEPLOY_SALT = '20261015g';"), true);
    assert.equal(deploySaltLineChanged("-const DEPLOY_SALT = '20261015f';"), true);
    assert.equal(comparisonSpec('origin/main'), 'origin/main...HEAD');
  });

  test('a base ref cannot climb out of the branch name', () => {
    assert.throws(() => ensureBaseHistory('../main'), /Refusing base ref/);
    assert.throws(() => ensureBaseHistory('main/../../etc'), /Refusing base ref/);
  });

  test('sw.js keeps one quoted DEPLOY_SALT assignment', () => {
    const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
    const lines = source.split('\n').filter((line) => line.startsWith('const DEPLOY_SALT = '));
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^const DEPLOY_SALT = '[^']+';$/);
  });

  test('the pull request workflow runs the salt guard against the base', () => {
    const workflow = readFileSync(new URL('../.github/workflows/test.yml', import.meta.url), 'utf8');
    assert.match(workflow, /if: github\.event_name == 'pull_request'/);
    assert.match(workflow, /BASE_REF: \$\{\{ github\.base_ref \}\}/);
    assert.match(workflow, /node tests\/deploy-salt\.test\.js --check/);
    assert.match(workflow, /git diff --name-only origin\/<base>\.\.\.HEAD/);
    assert.match(workflow, /Bump DEPLOY_SALT in sw\.js/);
  });

  test('a three-dot diff ignores tests, docs, markdown, workflows, and package files', () => {
    withRepo((cwd) => {
      writeSalt(cwd, 'a');
      commitAll(cwd, 'base');
      git(cwd, ['checkout', '-b', 'pr']);
      mkdirSync(join(cwd, 'tests'), { recursive: true });
      mkdirSync(join(cwd, 'docs'), { recursive: true });
      mkdirSync(join(cwd, '.github', 'workflows'), { recursive: true });
      writeFileSync(join(cwd, 'tests', 'a.test.js'), 'test\n');
      writeFileSync(join(cwd, 'docs', 'notes.txt'), 'notes\n');
      writeFileSync(join(cwd, 'README.md'), 'read\n');
      writeFileSync(join(cwd, '.github', 'workflows', 'test.yml'), 'name: Test\n');
      writeFileSync(join(cwd, 'package.json'), '{}\n');
      writeFileSync(join(cwd, 'package-lock.json'), '{}\n');
      commitAll(cwd, 'exempt');
      const diff = readThreeDot(cwd, 'main');
      assert.equal(diff.spec, 'main...HEAD');
      assert.equal(needsSaltBump(diff.files, diff.saltDiff), false);
      assert.ok(diff.files.includes('tests/a.test.js'));
      assert.ok(diff.files.includes('docs/notes.txt'));
      assert.ok(diff.files.includes('README.md'));
      assert.ok(diff.files.includes('.github/workflows/test.yml'));
      assert.ok(diff.files.includes('package.json'));
      assert.ok(diff.files.includes('package-lock.json'));
    });
  });

  test('editing sw.js without the DEPLOY_SALT line still requires a bump', () => {
    withRepo((cwd) => {
      writeSalt(cwd, 'a');
      commitAll(cwd, 'base');
      git(cwd, ['checkout', '-b', 'pr']);
      writeFileSync(join(cwd, 'sw.js'), "// note\nconst DEPLOY_SALT = 'a';\n");
      commitAll(cwd, 'comment');
      const diff = readThreeDot(cwd, 'main');
      assert.equal(needsSaltBump(diff.files, diff.saltDiff), true);
      assert.equal(deploySaltLineChanged(diff.saltDiff), false);
    });
  });

  test('a shallow feature tip deepens until the cached change is visible', () => {
    const src = mkdtempSync(join(tmpdir(), 'deploy-salt-src-'));
    const clone = mkdtempSync(join(tmpdir(), 'deploy-salt-cln-'));
    try {
      initRepo(src);
      writeSalt(src, 'a');
      mkdirSync(join(src, 'content', 'ch01'), { recursive: true });
      writeFileSync(join(src, 'content', 'ch01', 'a.json'), '{"n":1}\n');
      commitAll(src, 'base');
      git(src, ['checkout', '-b', 'feature']);
      writeFileSync(join(src, 'content', 'ch01', 'a.json'), '{"n":2}\n');
      commitAll(src, 'content');
      git(src, ['checkout', 'main']);
      for (let i = 0; i < 6; i += 1) {
        writeFileSync(join(src, 'log.txt'), `m${i}\n`, { flag: 'a' });
        commitAll(src, `main ${i}`);
      }
      const feature = git(src, ['rev-parse', 'feature']).trim();
      initRepo(clone);
      git(clone, ['remote', 'add', 'origin', `file://${src}`]);
      git(clone, ['fetch', '--no-tags', '--depth=1', 'origin', `+${feature}:refs/remotes/pull/1/merge`]);
      git(clone, ['checkout', '--detach', 'refs/remotes/pull/1/merge']);
      const remoteRef = ensureBaseHistory('main', { cwd: clone, initialDepth: 1 });
      const diff = readThreeDot(clone, remoteRef);
      assert.equal(diff.spec, 'origin/main...HEAD');
      assert.ok(diff.files.includes('content/ch01/a.json'));
      assert.equal(needsSaltBump(diff.files, diff.saltDiff), true);
    } finally {
      rmSync(src, { recursive: true, force: true });
      rmSync(clone, { recursive: true, force: true });
    }
  });

  test('a shallow pull request merge fails when cached content changed', () => {
    const result = ghaMergeResult((cwd) => {
      writeFileSync(join(cwd, 'content', 'ch01', 'a.json'), '{"n":2}\n');
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Bump DEPLOY_SALT in sw\.js\n/);
    assert.match(result.stderr, /^content\/ch01\/a\.json$/m);
  });

  test('a shallow pull request merge passes when the DEPLOY_SALT line changes', () => {
    const result = ghaMergeResult((cwd) => {
      writeFileSync(join(cwd, 'content', 'ch01', 'a.json'), '{"n":2}\n');
      writeSalt(cwd, 'b');
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr.includes(SALT_BUMP_MESSAGE), false);
  });

  test('a shallow pull request merge passes when only exempt files change', () => {
    const result = ghaMergeResult((cwd) => {
      mkdirSync(join(cwd, 'tests'), { recursive: true });
      mkdirSync(join(cwd, 'docs'), { recursive: true });
      mkdirSync(join(cwd, '.github'), { recursive: true });
      writeFileSync(join(cwd, 'tests', 'a.test.js'), 'test\n');
      writeFileSync(join(cwd, 'docs', 'notes.txt'), 'notes\n');
      writeFileSync(join(cwd, 'README.md'), 'read\n');
      writeFileSync(join(cwd, '.github', 'ci.yml'), 'name: Test\n');
      writeFileSync(join(cwd, 'package.json'), '{}\n');
      writeFileSync(join(cwd, 'package-lock.json'), '{}\n');
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr.includes(SALT_BUMP_MESSAGE), false);
  });
}
