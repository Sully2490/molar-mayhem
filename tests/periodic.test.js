import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ELEMENTS } from '../js/elements.js';
import {
  HEAT_HIGH,
  HEAT_LOW,
  HEAT_MID,
  TRENDS,
  formatDetail,
  getTrend,
  heatColor,
  renderTable,
  trendRange,
} from '../js/periodic.js';

const bySymbol = (symbol) => ELEMENTS.find((element) => element.sym === symbol);

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
});

test('displayed trend values keep useful decimals', () => {
  assert.match(formatDetail(bySymbol('F'), getTrend('en')), /3\.98 Pauling/);
  assert.match(formatDetail(bySymbol('He'), getTrend('ie')), /2372\.3 kJ\/mol/);
  assert.match(formatDetail(bySymbol('Cs'), getTrend('radius')), /260 pm/);
});

test('heat colors run from cool to warm', () => {
  assert.equal(heatColor(0, 0, 100).background, HEAT_LOW);
  assert.equal(heatColor(50, 0, 100).background, HEAT_MID);
  assert.equal(heatColor(100, 0, 100).background, HEAT_HIGH);
  assert.equal(heatColor(null, 0, 100), null);
  assert.notEqual(heatColor(10, 0, 100).background, heatColor(90, 0, 100).background);
});

test('the periodic table renders a trend heat map', () => {
  const html = renderTable('en', 9);
  for (const trend of TRENDS) assert.match(html, new RegExp(trend.label));
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /data-trend="en"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-trend="en"/);
  assert.match(html, /data-z="9"/);
  assert.match(html, /data-z="118"/);
  assert.match(html, /Low/);
  assert.match(html, /High/);
  assert.match(html, new RegExp(HEAT_HIGH));

  const radius = trendRange(ELEMENTS, 'radius');
  const fluorine = heatColor(bySymbol('F').radius, radius.min, radius.max);
  const cesium = heatColor(bySymbol('Cs').radius, radius.min, radius.max);
  assert.notEqual(fluorine.background, cesium.background);
  const radiusHtml = renderTable('radius');
  assert.match(radiusHtml, new RegExp(`data-z="55"[^>]*background:${cesium.background}`));
  assert.match(radiusHtml, /class="el is-empty"[^>]*data-z="2"/);
});
