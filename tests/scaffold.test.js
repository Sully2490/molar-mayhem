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
  for (const route of ['Map', 'Drill', 'Prep', 'Cards']) {
    const html = renderRoute(route);
    assert.match(html, new RegExp(`data-route="${route}"`));
    assert.match(html, new RegExp(`<h1>${route}</h1>`));
    assert.match(html, /Coming soon/);
  }
  const learn = renderRoute('Learn');
  assert.match(learn, /data-route="Learn"/);
  assert.match(learn, /<h1>Learn<\/h1>/);
  assert.doesNotMatch(learn, /Coming soon/);
  assert.equal(routeFromHash('#Map'), 'Map');
  assert.equal(routeFromHash('#learn'), 'Learn');
  assert.equal(routeFromHash('#Learn/ch1-physical'), 'Learn');
  assert.equal(routeFromHash(''), 'Home');
  assert.equal(routeFromHash('#Nope'), 'Home');
  const home = renderRoute('Home');
  assert.match(home, /<h1>Molar Mayhem<\/h1>/);
  assert.match(home, /data-route="Home"/);
  assert.doesNotMatch(home, /Coming soon/);
});

test('GitHub Actions runs npm test', () => {
  const workflow = read('.github/workflows/test.yml');
  assert.match(workflow, /npm test/);
  assert.match(workflow, /actions\/checkout@v4/);
  assert.match(workflow, /actions\/setup-node@v4/);
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
