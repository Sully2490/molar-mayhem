import { ELEMENTS } from './elements.js';

/** Pale blue → gold → orange. Low values are cool. High values are warm. */
export const HEAT_LOW = '#dbeafe';
export const HEAT_MID = '#fde68a';
export const HEAT_HIGH = '#c2410c';
const INK = '#1c2430';
const PAPER = '#fffaf2';

export const TRENDS = [
  {
    id: 'radius',
    key: 'radius',
    label: 'Atomic radius',
    unit: 'pm',
    blurb: 'How big the atom is.',
  },
  {
    id: 'ie',
    key: 'ie',
    label: 'Ionization energy',
    unit: 'kJ/mol',
    blurb: 'Energy needed to remove one electron.',
  },
  {
    id: 'en',
    key: 'en',
    label: 'Electronegativity',
    unit: 'Pauling',
    blurb: 'How strongly an atom pulls bonding electrons.',
  },
];

export function getTrend(trendId) {
  return TRENDS.find((trend) => trend.id === trendId) ?? TRENDS[0];
}

export function elementByZ(z) {
  return ELEMENTS.find((element) => element.z === z) ?? null;
}

/**
 * @param {number | null} value
 * @param {number} min
 * @param {number} max
 * @returns {{ background: string, color: string } | null}
 */
export function heatColor(value, min, max) {
  if (value == null || Number.isNaN(value)) return null;
  const span = max - min;
  const t = span === 0 ? 0.5 : Math.min(1, Math.max(0, (value - min) / span));
  const rgb = t < 0.5
    ? mix(hexToRgb(HEAT_LOW), hexToRgb(HEAT_MID), t / 0.5)
    : mix(hexToRgb(HEAT_MID), hexToRgb(HEAT_HIGH), (t - 0.5) / 0.5);
  const background = rgbToHex(rgb);
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  return { background, color: luminance > 0.62 ? INK : PAPER };
}

/**
 * @param {typeof ELEMENTS} elements
 * @param {'radius' | 'ie' | 'en'} key
 */
export function trendRange(elements, key) {
  const values = elements.map((element) => element[key]).filter((value) => value != null);
  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function formatNumber(value) {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function formatDetail(element, trend) {
  if (!element) return 'Tap an element to see its value.';
  const value = element[trend.key];
  const shown = value == null
    ? 'no standard value in this set'
    : `${formatNumber(value)} ${trend.unit}`;
  return `${element.name} (${element.sym}), atomic number ${element.z}. ${trend.label}: ${shown}.`;
}

/**
 * @param {string} trendId
 * @param {number | null} selectedZ
 */
export function renderTable(trendId, selectedZ = null) {
  const trend = getTrend(trendId);
  const range = trendRange(ELEMENTS, trend.key);
  const selected = selectedZ == null ? null : elementByZ(selectedZ);
  const buttons = TRENDS.map((item) => {
    const pressed = item.id === trend.id ? 'true' : 'false';
    return `<button type="button" class="trend" data-trend="${item.id}" aria-pressed="${pressed}">${escapeHtml(item.label)}</button>`;
  }).join('');

  const main = [];
  const fblock = [];
  main.push('<span class="marker" style="grid-row:6;grid-column:3">57–71</span>');
  main.push('<span class="marker" style="grid-row:7;grid-column:3">89–103</span>');

  for (const element of ELEMENTS) {
    const cell = renderCell(element, trend, range, element.z === selectedZ);
    if (element.series === 'main') main.push(cell);
    else fblock.push(cell);
  }

  return `
    <div class="trend-row" role="group" aria-label="Periodic trends">
      ${buttons}
    </div>
    <p class="trend-blurb">${escapeHtml(trend.blurb)} Warm colors are higher.</p>
    <p id="element-detail" class="detail" aria-live="polite">${escapeHtml(formatDetail(selected, trend))}</p>
    <div class="legend" aria-hidden="true">
      <span>Low</span>
      <span class="legend-bar"></span>
      <span>High</span>
    </div>
    <div class="table-scroll">
      <div class="ptable" role="group" aria-label="Main periodic table">${main.join('')}</div>
      <p class="f-caption">The two rows below are the lanthanides (57–71) and the actinides (89–103).</p>
      <div class="ptable fblock" role="group" aria-label="Lanthanides and actinides">${fblock.join('')}</div>
    </div>
    <p class="fine">Gray cells have no standard value in this set. Atomic radius uses the empirical radius in picometers.</p>
  `;
}

function renderCell(element, trend, range, selected) {
  const pos = position(element);
  const value = element[trend.key];
  const color = heatColor(value, range.min, range.max);
  const style = color
    ? `background:${color.background};color:${color.color}`
    : '';
  const valueText = value == null ? 'no value' : `${formatNumber(value)} ${trend.unit}`;
  const label = `${element.name}, atomic number ${element.z}, ${trend.label} ${valueText}`;
  return `<button type="button" class="el${color ? '' : ' is-empty'}" data-z="${element.z}" style="grid-row:${pos.row};grid-column:${pos.col};${style}" aria-pressed="${selected ? 'true' : 'false'}" aria-label="${escapeHtml(label)}"><span class="z">${element.z}</span><span class="sym">${escapeHtml(element.sym)}</span></button>`;
}

function position(element) {
  if (element.series === 'lanthanide') {
    return { row: 1, col: element.z - 56 };
  }
  if (element.series === 'actinide') {
    return { row: 2, col: element.z - 88 };
  }
  return { row: element.period, col: element.group };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(start, end, amount) {
  return start.map((channel, index) => Math.round(channel + (end[index] - channel) * amount));
}

function rgbToHex(rgb) {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
