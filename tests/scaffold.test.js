import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderRoute, routeFromHash } from '../js/routes.js';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('package.json exposes dev, test, and check:content', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts.dev, 'npx serve . -l 5173');
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.js');
  assert.equal(pkg.scripts['check:content'], 'node scripts/check-content.js');
  assert.equal(pkg.type, 'module');
});

test('index.html is a static Molar Mayhem page', () => {
  const html = read('index.html');
  assert.match(html, /<title>Molar Mayhem<\/title>/);
  assert.match(html, /href="css\/styles\.css"/);
  assert.match(html, /<script type="module" src="js\/app\.js"><\/script>/);
  for (const route of ['Map', 'Learn', 'Drill', 'Prep', 'Cards']) {
    assert.match(html, new RegExp(`href="#${route}"`));
  }
  assert.doesNotMatch(html, /webpack|vite|parcel|rollup/i);
});

test('hash routes render placeholders', () => {
  for (const route of ['Map', 'Learn', 'Drill', 'Prep', 'Cards']) {
    const html = renderRoute(route);
    assert.match(html, new RegExp(`data-route="${route}"`));
    assert.match(html, new RegExp(`<h1>${route}</h1>`));
    assert.match(html, /Coming soon/);
  }
  assert.equal(routeFromHash('#Map'), 'Map');
  assert.equal(routeFromHash('#learn'), 'Learn');
  assert.equal(routeFromHash(''), 'Home');
  assert.equal(routeFromHash('#Nope'), 'Home');
  const home = renderRoute('Home');
  assert.match(home, /<h1>Molar Mayhem<\/h1>/);
  assert.match(home, /data-route="Home"/);
  assert.doesNotMatch(home, /Coming soon/);
});

test('GitHub Actions runs npm test with a read-only checkout', () => {
  const workflow = read('.github/workflows/test.yml');
  assert.match(workflow, /npm test/);
  assert.match(workflow, /permissions:\n {2}contents: read/);
  assert.match(workflow, /push:\n {4}branches: \[main\]/);
  assert.match(workflow, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4/);
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4/);
});

test('element numbers stay readable and the table dialog marks the page inert', () => {
  const css = read('css/styles.css');
  assert.match(css, /\.el \.z \{ font-size: 0\.7rem; opacity: 1; \}/);
  const app = read('js/app.js');
  assert.match(app, /setPageBehindInert\(true\)/);
  assert.match(app, /setPageBehindInert\(false\)/);
  assert.match(app, /el\.inert = inert/);
});

test('check:content command exits 0 when MM_SOURCES is unset', () => {
  const result = spawnSync(process.execPath, ['scripts/check-content.js'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
    env: { ...process.env, MM_SOURCES: '' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(`${result.stdout}\n${result.stderr}`, /MM_SOURCES is unset/);
});

test('F00 and F03 are marked passing', () => {
  const list = JSON.parse(read('feature_list.json'));
  const passing = new Set(list.features.filter((feature) => feature.passing).map((feature) => feature.id));
  assert.deepEqual([...passing].sort(), ['F00', 'F03']);
});
