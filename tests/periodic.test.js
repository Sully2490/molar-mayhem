import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ELEMENTS } from '../js/elements.js';
import { renderTray } from '../js/lab/tray-view.js';
import {
  HEAT_HIGH,
  HEAT_LOW,
  HEAT_MID,
  SCALE_HIGH,
  SCALE_LOW,
  TRENDS,
  cellPlacement,
  chipPredicate,
  formatDetail,
  getTrend,
  heatColor,
  mount,
  moveFocus,
  renderPeriodic,
  renderTable,
  scaleColor,
  trendRange,
} from '../js/periodic.js';

const bySymbol = (symbol) => ELEMENTS.find((element) => element.sym === symbol);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

function buttonTag(html, z) {
  const match = html.match(new RegExp(`<button\\b[^>]*\\bdata-z="${z}"[^>]*>`));
  assert.ok(match, `missing cell ${z}`);
  return match[0];
}

function sliceGrid(html, label) {
  const start = html.indexOf(`aria-label="${label}"`);
  assert.ok(start >= 0, label);
  const end = html.indexOf('role="grid"', start + 10);
  return html.slice(start, end === -1 ? undefined : end);
}

test('the tray lists elements 1 through 118 once', () => {
  assert.equal(ELEMENTS.length, 118);
  const numbers = ELEMENTS.map((element) => element.z);
  assert.deepEqual(numbers, [...Array(118)].map((_, index) => index + 1));
  const symbols = new Set(ELEMENTS.map((element) => element.sym));
  assert.equal(symbols.size, 118);
});

test('main-table cells do not share a period and group', () => {
  const seen = new Set();
  let lanthanides = 0;
  let actinides = 0;
  for (const element of ELEMENTS) {
    if (element.series === 'lanthanide') {
      lanthanides += 1;
      continue;
    }
    if (element.series === 'actinide') {
      actinides += 1;
      continue;
    }
    const key = `${element.period}-${element.group}`;
    assert.equal(seen.has(key), false, key);
    seen.add(key);
  }
  assert.equal(lanthanides, 15);
  assert.equal(actinides, 15);
  assert.equal(bySymbol('He').group, 18);
  assert.equal(bySymbol('La').series, 'lanthanide');
  assert.equal(bySymbol('La').fRow, 1);
  assert.equal(bySymbol('La').fCol, 1);
  assert.equal(bySymbol('Lr').fRow, 2);
  assert.equal(bySymbol('Lr').fCol, 15);
  assert.equal(bySymbol('Og').period, 7);
});

test('familiar periodic trends point the right way', () => {
  const li = bySymbol('Li');
  const na = bySymbol('Na');
  const k = bySymbol('K');
  const rb = bySymbol('Rb');
  const cs = bySymbol('Cs');
  assert.ok(cs.radius > rb.radius && rb.radius > k.radius && k.radius > na.radius && na.radius > li.radius);
  assert.ok(li.ie > na.ie && na.ie > k.ie && k.ie > cs.ie);
  assert.ok(bySymbol('F').en > bySymbol('O').en && bySymbol('O').en > bySymbol('N').en);
  assert.ok(bySymbol('F').radius < bySymbol('O').radius && bySymbol('O').radius < bySymbol('C').radius);
  assert.ok(bySymbol('N').ie > bySymbol('O').ie);
  assert.ok(bySymbol('Be').ie > bySymbol('B').ie);
  assert.equal(bySymbol('He').en, null);
  assert.equal(bySymbol('Ne').radius, null);
  assert.equal(bySymbol('He').radius, null);
  assert.equal(bySymbol('Kr').en, 3);
  assert.equal(bySymbol('Cm').radius, 176);
});

test('displayed trend values keep useful decimals', () => {
  assert.match(formatDetail(bySymbol('F'), getTrend('en')), /3\.98 Pauling/);
  assert.match(formatDetail(bySymbol('He'), getTrend('ie')), /2372\.3 kJ\/mol/);
  assert.match(formatDetail(bySymbol('Cs'), getTrend('radius')), /260 pm/);
  assert.match(formatDetail(bySymbol('Tc'), getTrend('mass')), /\(98\) u/);
  assert.match(formatDetail(bySymbol('F'), getTrend('category')), /Diatomic nonmetal/);
});

test('heat colors run from cool to warm', () => {
  assert.equal(heatColor(0, 0, 100).background, HEAT_LOW);
  assert.equal(heatColor(50, 0, 100).background, HEAT_MID);
  assert.equal(heatColor(100, 0, 100).background, HEAT_HIGH);
  assert.equal(heatColor(null, 0, 100), null);
  assert.notEqual(heatColor(10, 0, 100).background, heatColor(90, 0, 100).background);
});

test('the sequential scale leaves missing values blank', () => {
  assert.equal(scaleColor(0, 0, 100).background, SCALE_LOW);
  assert.equal(scaleColor(100, 0, 100).background, SCALE_HIGH);
  assert.equal(scaleColor(null, 0, 100), null);
  assert.notEqual(scaleColor(10, 0, 100).background, scaleColor(90, 0, 100).background);
});

test('the periodic table renders an 18-column board with detached f rows', () => {
  const html = renderTable('en', 9);
  for (const trend of TRENDS) assert.match(html, new RegExp(trend.label));
  assert.match(html, /Electron affinity/);
  assert.match(html, /Atomic mass/);
  assert.match(html, /data-trend="en"[^>]*aria-pressed="true"/);
  assert.match(html, /§3\.5/);
  assert.match(html, /§3\.6/);
  assert.match(buttonTag(html, 9), /aria-pressed="true"/);
  assert.match(buttonTag(html, 9), /min-width:40px/);
  assert.match(html, /data-z="118"/);

  const main = sliceGrid(html, 'Main periodic table');
  const fblock = sliceGrid(html, 'Lanthanides and actinides');
  assert.match(main, /57–71/);
  assert.match(main, /89–103/);
  assert.equal(main.includes('data-z="57"'), false);
  assert.equal(main.includes('data-z="89"'), false);
  assert.match(buttonTag(fblock, 57), /grid-column:3/);
  assert.match(buttonTag(fblock, 71), /grid-column:17/);
  assert.match(buttonTag(fblock, 89), /grid-row:2;grid-column:3/);
  assert.equal(cellPlacement(bySymbol('He')).col, 18);
  assert.equal(cellPlacement(bySymbol('B')).col, 13);

  const radius = trendRange(ELEMENTS, 'radius');
  const fluorine = scaleColor(bySymbol('F').radius, radius.min, radius.max);
  const cesium = scaleColor(bySymbol('Cs').radius, radius.min, radius.max);
  assert.notEqual(fluorine.background, cesium.background);
  const radiusHtml = renderTable('radius');
  assert.match(buttonTag(radiusHtml, 55), new RegExp(`background:${cesium.background}`));
  assert.match(buttonTag(radiusHtml, 2), /is-missing/);
  assert.match(buttonTag(radiusHtml, 2), /repeating-linear-gradient/);
  assert.match(radiusHtml, /no value/);
  assert.match(radiusHtml, new RegExp(SCALE_HIGH));
  const mainRadius = sliceGrid(radiusHtml, 'Main periodic table');
  assert.equal(mainRadius.includes('mm-pt-across'), false);
  assert.match(radiusHtml, /data-across="left"/);
  assert.match(radiusHtml, /data-down="down"/);
  assert.match(radiusHtml, /Increases to the left across a period/);
});

test('category, block, and phase modes color cells without a fake number', () => {
  const category = renderPeriodic({ mode: 'category', size: 'compact' });
  assert.match(category, /mm-pt-compact/);
  assert.match(buttonTag(category, 11), /background:#e07a3d/);
  assert.match(category, /data-mm-chip="alkali metal"/);
  assert.equal(category.includes('data-across='), false);

  const block = renderPeriodic({ mode: { kind: 'block' }, selectedZ: 26 });
  assert.match(buttonTag(block, 26), /background:#d46a6a/);
  assert.match(block, /Iron \(Fe\), atomic number 26\. Block: d block\./);

  const phase = renderPeriodic({ mode: { kind: 'phase' } });
  assert.match(buttonTag(phase, 35), /background:#4c8fd6/);
  assert.match(buttonTag(phase, 26), /background:#8a8175/);
});

test('a family chip keeps that family and hides the rest', () => {
  const alkali = chipPredicate(getTrend('category'), 'alkali metal');
  assert.equal(alkali(bySymbol('Na')), true);
  assert.equal(alkali(bySymbol('F')), false);
  const html = renderPeriodic({
    mode: 'category',
    chip: 'alkali metal',
    filter: alkali,
  });
  assert.match(html, /data-mm-chip="alkali metal"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(buttonTag(html, 11), /is-filtered/);
  assert.match(buttonTag(html, 9), /is-filtered/);
  assert.match(buttonTag(html, 9), /visibility:hidden/);
  const marked = renderPeriodic({
    mode: 'category',
    size: 'highlight',
    highlight: [9, 17],
  });
  assert.match(marked, /Highlighted: F, Cl/);
  assert.match(buttonTag(marked, 9), /opacity:1/);
  assert.match(buttonTag(marked, 8), /opacity:0\.22/);
});

test('highlight, filter, and arrow keys stay on the shared grid', () => {
  const html = renderPeriodic({
    mode: { kind: 'heatmap', property: 'ie1' },
    size: 'highlight',
    highlight: [9, 17],
    filter: (element) => element.z !== 10,
  });
  assert.match(html, /mm-pt-highlight/);
  assert.match(buttonTag(html, 9), /is-hot/);
  assert.match(buttonTag(html, 17), /is-hot/);
  assert.match(buttonTag(html, 11), /is-dim/);
  assert.match(buttonTag(html, 10), /is-filtered/);
  assert.match(buttonTag(html, 10), /visibility:hidden/);

  assert.equal(moveFocus(2, 'ArrowLeft'), 1);
  assert.equal(moveFocus(1, 'ArrowLeft'), 1);
  assert.equal(moveFocus(4, 'ArrowRight'), 5);
  assert.equal(moveFocus(3, 'ArrowDown'), 11);
  assert.equal(moveFocus(39, 'ArrowDown'), 57);
  assert.equal(moveFocus(57, 'ArrowDown'), 89);
  assert.equal(moveFocus(57, 'ArrowUp'), 39);
  assert.equal(moveFocus(118, 'End'), 118);
  assert.equal(moveFocus(8, 'Home'), 1);
  assert.equal(moveFocus(1, 'ArrowRight', ELEMENTS, (element) => element.z !== 2), 1);
});

test('mount selects, highlights, filters, and moves with the keyboard', () => {
  const root = mockRoot();
  const picked = [];
  const api = mount(root, {
    size: 'compact',
    mode: { kind: 'category' },
    onSelect(element) { picked.push(element.z); },
  });
  assert.match(root.innerHTML, /data-size="compact"/);
  root.listeners.click({ target: cellTarget({ 'data-z': '8' }) });
  assert.deepEqual(picked, [8]);
  assert.match(buttonTag(root.innerHTML, 8), /aria-pressed="true"/);

  api.highlight([8, 16]);
  assert.match(buttonTag(root.innerHTML, 8), /is-hot/);
  assert.match(buttonTag(root.innerHTML, 1), /is-dim/);

  api.filter((element) => element.block === 'p');
  assert.match(buttonTag(root.innerHTML, 1), /is-filtered/);
  assert.match(buttonTag(root.innerHTML, 8), /is-hot/);

  api.filter(null);
  api.setMode({ kind: 'heatmap', property: 'ea' });
  assert.match(root.innerHTML, /data-trend="ea"[^>]*aria-pressed="true"/);
  assert.match(root.innerHTML, /data-down="irregular"/);

  root.listeners.keydown({
    key: 'ArrowLeft',
    preventDefault() {},
    target: cellTarget({ 'data-z': '2' }),
  });
  assert.deepEqual(picked.at(-1), 1);

  api.onSelect((element) => picked.push(element.sym));
  root.listeners.click({ target: cellTarget({ 'data-mm-chip': 'alkali metal' }) });
  assert.doesNotMatch(buttonTag(root.innerHTML, 11), /is-filtered/);
  assert.match(buttonTag(root.innerHTML, 8), /is-filtered/);

  api.destroy();
  assert.equal(root.innerHTML, '');
  assert.equal(root.listeners.click, undefined);
});

test('the lab tray uses the shared board and keeps arrows in the margins', () => {
  const html = renderTray({ trend: 'radius', z: 11, arrows: true });
  assert.match(html, /data-trend="radius"[^>]*aria-pressed="true"/);
  assert.match(html, /Atomic radius increases to the left/);
  assert.match(html, /class="lab-arrows"/);
  assert.match(html, /data-z="11"/);
  assert.match(html, /data-z="118"/);
  assert.match(html, /data-action="element-pick"/);
  const main = sliceGrid(html, 'Main periodic table');
  assert.equal(main.includes('lab-arrows'), false);
  const hidden = renderTray({ trend: 'en', z: 9, arrows: false });
  assert.match(hidden, /trend arrows are hidden/i);
  assert.match(hidden, /Electronegativity/);
  assert.equal(hidden.includes('lab-arrows'), false);
});

test('the stylesheet gives the board 40px targets and a phone scroll', () => {
  const css = read('css/periodic/periodic.css');
  assert.match(css, /minmax\(40px, 2\.75rem\)/);
  assert.match(css, /\.mm-pt-cell\s*\{[^}]*min-width:\s*40px/);
  assert.match(css, /\.mm-pt-cell\s*\{[^}]*min-height:\s*40px/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /@media \(max-width: 599px\)/);
  assert.match(css, /repeating-linear-gradient/);
  assert.match(css, /\.mm-pt-across/);
  assert.match(css, /\.mm-pt-down/);
  const attribution = read('data/ATTRIBUTION.md');
  assert.match(attribution, /Bowserinator\/Periodic-Table-JSON/);
  assert.match(attribution, /§3\.5/);
  assert.equal(attribution.includes('discovered_by'), false);
});

function mockRoot() {
  const root = {
    innerHTML: '',
    listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    removeEventListener(type) { delete this.listeners[type]; },
    querySelector() { return { focus() {} }; },
    contains() { return true; },
  };
  return root;
}

function cellTarget(attrs) {
  return {
    getAttribute(name) { return attrs[name] ?? null; },
    classList: { contains() { return false; } },
    closest(selector) {
      if (selector.includes('data-z') && attrs['data-z']) return this;
      if (selector.includes('data-mm-mode') && attrs['data-mm-mode']) return this;
      if (selector.includes('data-mm-chip') && attrs['data-mm-chip']) return this;
      return null;
    },
  };
}
