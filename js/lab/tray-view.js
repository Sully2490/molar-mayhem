import { ELEMENTS } from '../elements.js';
import { formatDetail, getTrend, heatColor, trendRange } from '../periodic.js';
import { TREND_ARROWS, moveSelection } from './chem.js';
import { escapeHtml } from './html.js';

const TREND_IDS = ['radius', 'ie', 'en'];

export function describeTray(state) {
  const trend = getTrend(state.trend);
  const element = ELEMENTS.find((item) => item.z === state.z);
  const detail = formatDetail(element, trend);
  const arrows = TREND_ARROWS[trend.id] ?? TREND_ARROWS.radius;
  const arrowText = state.arrows
    ? `Arrows on the table: ${arrows.map((arrow) => arrow.text).join(' ')}`
    : 'The trend arrows are hidden. The cells are still colored as a heat map, cool for low and warm for high.';
  return `Periodic table heat map for ${trend.label.toLowerCase()}. ${trend.blurb} ${detail} ${arrowText} The table stays still. Arrow keys move from element to element. A tap selects one.`;
}

function cellPosition(element) {
  if (element.series === 'lanthanide') return { row: 1, col: element.z - 56, block: 'f' };
  if (element.series === 'actinide') return { row: 2, col: element.z - 88, block: 'f' };
  return { row: element.period, col: element.group, block: 'main' };
}

function cellButton(element, trend, range, selected) {
  const pos = cellPosition(element);
  const value = element[trend.key];
  const color = heatColor(value, range.min, range.max);
  const style = color ? `background:${color.background};color:${color.color}` : '';
  const shown = value == null ? 'no value' : `${value} ${trend.unit}`;
  return `<button type="button" class="lab-el${color ? '' : ' is-empty'}" data-action="element-pick" data-z="${element.z}" data-focus="z-${element.z}" style="grid-row:${pos.row};grid-column:${pos.col};${style}" tabindex="${selected ? '0' : '-1'}" aria-pressed="${selected ? 'true' : 'false'}" aria-label="${escapeHtml(`${element.name}, atomic number ${element.z}, ${trend.label} ${shown}`)}"><span>${element.z}</span><b>${escapeHtml(element.sym)}</b></button>`;
}

function arrowSvg(trendId) {
  const radius = trendId === 'radius';
  const other = trendId === 'ie' || trendId === 'en';
  const parts = [];
  if (radius) {
    parts.push(arrow(780, 150, 220, 150, '#9a3412'));
    parts.push(label(240, 128, 'radius increases', '#9a3412'));
    parts.push(arrow(160, 180, 160, 390, '#9a3412'));
    parts.push(label(178, 400, 'down a group', '#9a3412'));
  }
  if (other) {
    const name = trendId === 'en' ? 'electronegativity increases' : 'ionization energy increases';
    parts.push(arrow(220, 250, 820, 250, '#0f5c56'));
    parts.push(label(240, 228, name, '#0f5c56'));
    parts.push(arrow(900, 390, 900, 120, '#0f5c56'));
    parts.push(label(760, 108, 'up a group', '#0f5c56'));
  }
  return `<svg class="lab-arrows" viewBox="0 0 1080 420" aria-hidden="true">${parts.join('')}</svg>`;
}

function label(x, y, text, color) {
  return `<text x="${x}" y="${y}" font-size="22" font-weight="700" fill="${color}" stroke="#fffaf2" stroke-width="5" paint-order="stroke">${text}</text>`;
}

function arrow(x1, y1, x2, y2, color) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 18;
  const p1 = [x2 - size * Math.cos(angle - 0.4), y2 - size * Math.sin(angle - 0.4)];
  const p2 = [x2 - size * Math.cos(angle + 0.4), y2 - size * Math.sin(angle + 0.4)];
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="8" stroke-linecap="round"/><polygon points="${x2},${y2} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}" fill="${color}"/>`;
}

export function renderTray(state) {
  const trend = getTrend(state.trend);
  const range = trendRange(ELEMENTS, trend.key);
  const buttons = TREND_IDS.map((id) => {
    const item = getTrend(id);
    const on = item.id === trend.id;
    return `<button type="button" data-action="trend" data-trend="${item.id}" data-focus="trend-${item.id}" aria-pressed="${on ? 'true' : 'false'}">${escapeHtml(item.label)}</button>`;
  }).join('');
  const main = ['<span class="lab-marker" style="grid-row:6;grid-column:3">57–71</span>', '<span class="lab-marker" style="grid-row:7;grid-column:3">89–103</span>'];
  const fblock = [];
  for (const element of ELEMENTS) {
    const button = cellButton(element, trend, range, element.z === state.z);
    if (element.series === 'main') main.push(button);
    else fblock.push(button);
  }
  return `
    <section class="lab-tool" data-tool="tray" data-motion="still">
      <h2>Periodic table</h2>
      <p id="lab-desc" class="lab-desc" aria-live="polite">${escapeHtml(describeTray(state))}</p>
      <div class="lab-controls">
        <div role="group" aria-label="Heat map">${buttons}</div>
        <button type="button" data-action="arrows" data-focus="arrows" aria-pressed="${state.arrows ? 'true' : 'false'}">Trend arrows</button>
      </div>
      <p class="lab-fine">Warm cells are higher. Gray cells have no standard value in this set.</p>
      <div class="lab-scroll">
        <div class="lab-frame" data-periodic tabindex="0" data-focus="periodic" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End">
          <div class="lab-ptable" role="grid" aria-label="Main periodic table">${main.join('')}</div>
          ${state.arrows ? arrowSvg(trend.id) : ''}
        </div>
        <p class="lab-fine">The two rows below are the lanthanides (57–71) and the actinides (89–103).</p>
        <div class="lab-ptable lab-fblock" role="grid" aria-label="Lanthanides and actinides">${fblock.join('')}</div>
      </div>
    </section>
  `;
}

export { moveSelection };
