import { ELEMENTS } from './elements.js';

/** Pale blue → gold → orange. Kept for callers that still use heatColor. */
export const HEAT_LOW = '#dbeafe';
export const HEAT_MID = '#fde68a';
export const HEAT_HIGH = '#c2410c';

/** Sequential scale, low to high. Not a copied colormap file. */
export const SCALE_LOW = '#440154';
export const SCALE_HIGH = '#fde725';

const SCALE = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];

const INK = '#1c2430';
const PAPER = '#fffaf2';
const HATCH = 'background-color:#e7e5e4;background-image:repeating-linear-gradient(-45deg,transparent,transparent 3px,rgba(90,80,70,.35) 3px,rgba(90,80,70,.35) 4px);color:#1c2430';
const CELL_BOX = 'min-width:40px;min-height:40px;border:0;border-radius:5px;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;font:inherit;cursor:pointer';
const GRID_BOX = 'display:grid;grid-template-columns:repeat(18,minmax(40px,2.75rem));grid-auto-rows:minmax(40px,auto);gap:3px;width:max-content';

const CATEGORY_COLORS = {
  'alkali metal': '#e07a3d',
  'alkaline earth metal': '#e2b15a',
  'transition metal': '#d46a6a',
  'post-transition metal': '#7d9a78',
  metalloid: '#3d8f86',
  'diatomic nonmetal': '#4c8fd6',
  'polyatomic nonmetal': '#6aa8c9',
  'noble gas': '#8d78b8',
  lanthanide: '#d4a04a',
  actinide: '#c47b8a',
  unknown: '#c8c2b6',
};

const BLOCK_COLORS = { s: '#e07a3d', p: '#4c8fd6', d: '#d46a6a', f: '#d4a04a' };
const PHASE_COLORS = { solid: '#8a8175', liquid: '#4c8fd6', gas: '#e07a3d' };

const CATEGORY_LABELS = {
  'alkali metal': 'Alkali metal',
  'alkaline earth metal': 'Alkaline earth',
  'transition metal': 'Transition metal',
  'post-transition metal': 'Post-transition',
  metalloid: 'Metalloid',
  'diatomic nonmetal': 'Diatomic nonmetal',
  'polyatomic nonmetal': 'Polyatomic nonmetal',
  'noble gas': 'Noble gas',
  lanthanide: 'Lanthanide',
  actinide: 'Actinide',
  unknown: 'Unknown',
};

const MODE_ALIASES = {
  category: 'category',
  block: 'block',
  phase: 'phase',
  en: 'en',
  electronegativity: 'en',
  radius: 'radius',
  ie: 'ie',
  ie1: 'ie',
  ea: 'ea',
  mass: 'mass',
};

export const MODES = [
  {
    id: 'category',
    kind: 'category',
    label: 'Category',
    blurb: 'Each color is a family of elements.',
    key: null,
    unit: '',
  },
  {
    id: 'block',
    kind: 'block',
    label: 'Block',
    blurb: 'The block is the subshell that is filling: s, p, d, or f.',
    key: null,
    unit: '',
  },
  {
    id: 'phase',
    kind: 'phase',
    label: 'Phase',
    blurb: 'Solid, liquid, or gas near room conditions.',
    key: null,
    unit: '',
  },
  {
    id: 'radius',
    kind: 'heatmap',
    key: 'radius',
    label: 'Atomic radius',
    unit: 'pm',
    blurb: 'How big the atom is.',
    across: 'left',
    down: 'down',
  },
  {
    id: 'ie',
    kind: 'heatmap',
    key: 'ie',
    label: 'Ionization energy',
    unit: 'kJ/mol',
    blurb: 'Energy needed to remove one electron.',
    across: 'right',
    down: 'up',
  },
  {
    id: 'en',
    kind: 'heatmap',
    key: 'en',
    label: 'Electronegativity',
    unit: 'Pauling',
    blurb: 'How strongly an atom pulls bonding electrons.',
    across: 'right',
    down: 'up',
  },
  {
    id: 'ea',
    kind: 'heatmap',
    key: 'ea',
    label: 'Electron affinity',
    unit: 'kJ/mol',
    blurb: 'Energy to pull an electron off the 1− gas anion.',
    across: 'right',
    acrossText: 'Usually increases to the right',
    down: 'irregular',
  },
  {
    id: 'mass',
    kind: 'heatmap',
    key: 'mass',
    label: 'Atomic mass',
    unit: 'u',
    blurb: 'Average mass of the atoms. A number in parentheses is a mass number.',
    across: 'right',
    acrossText: 'Generally increases to the right',
    down: 'down',
  },
];

/** The three heat maps the header tray started with. */
export const TRENDS = ['radius', 'ie', 'en'].map((id) => MODES.find((mode) => mode.id === id));

const ACROSS_COPY = {
  left: { glyph: '←', text: 'Increases to the left across a period' },
  right: { glyph: '→', text: 'Increases to the right across a period' },
};

const DOWN_COPY = {
  down: { glyph: '↓', text: 'Increases down a group' },
  up: { glyph: '↑', text: 'Increases up a group' },
  irregular: { glyph: '', text: 'No steady trend down a group' },
};

export function getTrend(trendId) {
  return MODES.find((mode) => mode.id === trendId) ?? TRENDS[0];
}

export function normalizeMode(mode) {
  if (typeof mode === 'string') return getTrend(MODE_ALIASES[mode] ?? mode);
  if (mode && typeof mode === 'object') {
    const raw = mode.property ?? mode.key ?? mode.id ?? mode.kind;
    return getTrend(MODE_ALIASES[raw] ?? raw);
  }
  return MODES[0];
}

export function elementByZ(z) {
  return ELEMENTS.find((element) => element.z === z) ?? null;
}

export function categoryKey(category) {
  return String(category).startsWith('unknown') ? 'unknown' : category;
}

export function categoryLabel(category) {
  const key = categoryKey(category);
  return CATEGORY_LABELS[key] ?? category;
}

/**
 * @param {number | null} value
 * @param {number} min
 * @param {number} max
 */
export function heatColor(value, min, max) {
  if (value == null || Number.isNaN(value)) return null;
  const span = max - min;
  const t = span === 0 ? 0.5 : Math.min(1, Math.max(0, (value - min) / span));
  const rgb = t < 0.5
    ? mix(hexToRgb(HEAT_LOW), hexToRgb(HEAT_MID), t / 0.5)
    : mix(hexToRgb(HEAT_MID), hexToRgb(HEAT_HIGH), (t - 0.5) / 0.5);
  return inkPair(rgb);
}

/**
 * Sequential heatmap color. Missing values return null so the cell can hatch.
 * @param {number | null} value
 */
export function scaleColor(value, min, max) {
  if (value == null || Number.isNaN(value)) return null;
  const span = max - min;
  const t = span === 0 ? 0.5 : Math.min(1, Math.max(0, (value - min) / span));
  const scaled = t * (SCALE.length - 1);
  const index = Math.min(SCALE.length - 2, Math.floor(scaled));
  const rgb = mix(SCALE[index], SCALE[index + 1], scaled - index);
  return inkPair(rgb);
}

export function trendRange(elements, key) {
  const values = elements.map((element) => element[key]).filter((value) => value != null);
  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function formatNumber(value) {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function formatMass(value, bracket) {
  if (value == null || Number.isNaN(Number(value))) return '';
  const rounded = Math.round(Number(value) * 1000) / 1000;
  const text = String(rounded);
  return bracket ? `(${text})` : text;
}

export function formatDetail(element, trend) {
  if (!element) return 'Tap an element to see its value.';
  if (!trend?.key) {
    const extra = trend?.kind === 'block'
      ? `${element.block} block`
      : trend?.kind === 'phase'
        ? element.phase
        : categoryLabel(element.category);
    return `${element.name} (${element.sym}), atomic number ${element.z}. ${trend?.label ?? 'Category'}: ${extra}.`;
  }
  const value = element[trend.key];
  const shown = value == null
    ? 'no standard value in this set'
    : `${shownValue(element, trend)} ${trend.unit}`.trim();
  return `${element.name} (${element.sym}), atomic number ${element.z}. ${trend.label}: ${shown}.`;
}

/**
 * Cell slot on the 18-column board. f-block rows use rows 8 and 9 so arrow
 * keys can step from the main table into the detached rows.
 */
export function gridPosition(element) {
  if (element.series === 'lanthanide') return { row: 8, col: element.z - 54 };
  if (element.series === 'actinide') return { row: 9, col: element.z - 86 };
  return { row: element.period, col: element.group };
}

/** Placement inside the drawn grid (f-block is its own 18-column grid). */
export function cellPlacement(element) {
  if (element.series === 'lanthanide') return { row: 1, col: element.z - 54, grid: 'f' };
  if (element.series === 'actinide') return { row: 2, col: element.z - 86, grid: 'f' };
  return { row: element.period, col: element.group, grid: 'main' };
}

export function moveFocus(currentZ, key, elements = ELEMENTS, filter = null) {
  const cells = elements.filter((element) => !filter || filter(element)).map((element) => ({
    z: element.z,
    ...gridPosition(element),
  }));
  if (cells.length === 0) return null;
  const current = cells.find((cell) => cell.z === currentZ) ?? cells[0];
  if (key === 'Home') return cells.reduce((best, cell) => (cell.z < best.z ? cell : best)).z;
  if (key === 'End') return cells.reduce((best, cell) => (cell.z > best.z ? cell : best)).z;
  if (key === 'ArrowRight') return nearest(cells, current, (cell) => cell.row === current.row && cell.col > current.col, (a, b) => a.col - b.col);
  if (key === 'ArrowLeft') return nearest(cells, current, (cell) => cell.row === current.row && cell.col < current.col, (a, b) => b.col - a.col);
  if (key === 'ArrowDown') return nearest(cells, current, (cell) => cell.col === current.col && cell.row > current.row, (a, b) => a.row - b.row);
  if (key === 'ArrowUp') return nearest(cells, current, (cell) => cell.col === current.col && cell.row < current.row, (a, b) => b.row - a.row);
  return current.z;
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   size?: 'full' | 'compact' | 'highlight',
 *   mode?: string | { kind?: string, property?: string, id?: string },
 *   selectedZ?: number | null,
 *   highlight?: number[],
 *   filter?: ((element: import('./elements.js').ElementRecord) => boolean) | null,
 *   onSelect?: (element: import('./elements.js').ElementRecord) => void,
 *   arrows?: boolean,
 *   skin?: 'header' | 'lab',
 * }} [options]
 */
export function mount(root, options = {}) {
  const state = {
    size: options.size ?? 'full',
    mode: normalizeMode(options.mode ?? 'category'),
    selectedZ: options.selectedZ ?? null,
    highlight: new Set(options.highlight ?? []),
    filter: options.filter ?? null,
    chip: null,
    arrows: options.arrows !== false,
    skin: options.skin ?? 'header',
    toolbarExtra: options.toolbarExtra ?? '',
  };
  let onSelect = options.onSelect ?? null;

  function passes(element) {
    if (state.filter && !state.filter(element)) return false;
    return chipPredicate(state.mode, state.chip)(element);
  }

  function paint(focusSelector) {
    root.innerHTML = renderPeriodic({
      ...state,
      filter: passes,
      highlight: [...state.highlight],
      chip: state.chip,
    });
    if (focusSelector) root.querySelector?.(focusSelector)?.focus?.();
  }

  function choose(z) {
    state.selectedZ = z;
    const element = elementByZ(z);
    if (element) onSelect?.(element);
    paint(`[data-z="${z}"]`);
  }

  function onClick(event) {
    const modeButton = event.target.closest?.('[data-mm-mode]');
    if (modeButton && inside(root, modeButton)) {
      state.mode = normalizeMode(modeButton.getAttribute('data-mm-mode'));
      state.chip = null;
      paint(`[data-mm-mode="${state.mode.id}"]`);
      return;
    }
    const chip = event.target.closest?.('[data-mm-chip]');
    if (chip && inside(root, chip)) {
      const name = chip.getAttribute('data-mm-chip');
      state.chip = state.chip === name ? null : name;
      paint(`[data-mm-chip="${name}"]`);
      return;
    }
    const cell = event.target.closest?.('[data-z]');
    if (cell && inside(root, cell) && !cell.classList?.contains('is-filtered')) {
      choose(Number(cell.getAttribute('data-z')));
    }
  }

  function onKey(event) {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    const cell = event.target.closest?.('[data-z]');
    if (!cell || !inside(root, cell)) return;
    event.preventDefault?.();
    const next = moveFocus(Number(cell.getAttribute('data-z')), event.key, ELEMENTS, passes);
    if (next != null) choose(next);
  }

  if (root.dataset) root.dataset.mmBound = 'mount';
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  paint();

  return {
    onSelect(fn) { onSelect = fn; },
    highlight(zs) {
      state.highlight = new Set(zs ?? []);
      paint(state.selectedZ == null ? undefined : `[data-z="${state.selectedZ}"]`);
    },
    filter(pred) {
      state.filter = pred ?? null;
      paint(state.selectedZ == null ? undefined : `[data-z="${state.selectedZ}"]`);
    },
    setMode(mode) {
      state.mode = normalizeMode(mode);
      state.chip = null;
      paint(`[data-mm-mode="${state.mode.id}"]`);
    },
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKey);
      root.innerHTML = '';
    },
  };
}

export function renderTable(trendId, selectedZ = null) {
  return renderPeriodic({
    mode: trendId,
    selectedZ,
    size: 'full',
    arrows: true,
    skin: 'header',
  });
}

export function renderPeriodic(options = {}) {
  const mode = normalizeMode(options.mode ?? 'category');
  const size = options.size ?? 'full';
  const skin = skinFlags(options.skin ?? 'header');
  const selectedZ = options.selectedZ ?? null;
  const selected = selectedZ == null ? null : elementByZ(selectedZ);
  const highlight = new Set(options.highlight ?? []);
  const filter = options.filter ?? null;
  const showArrows = options.arrows !== false && mode.kind === 'heatmap';
  const range = mode.key ? trendRange(ELEMENTS, mode.key) : null;
  const buttons = MODES.map((item) => modeButton(item, item.id === mode.id, skin)).join('');
  const main = [
    marker(skin, 6, 3, '57–71'),
    marker(skin, 7, 3, '89–103'),
  ];
  const fblock = [];
  for (const element of ELEMENTS) {
    const cell = renderCell(element, mode, range, {
      selected: element.z === selectedZ,
      hot: highlight.has(element.z),
      dim: highlight.size > 0 && !highlight.has(element.z),
      filtered: filter ? !filter(element) : false,
      skin,
    });
    if (element.series === 'main') main.push(cell);
    else fblock.push(cell);
  }
  const legend = mode.kind === 'heatmap' ? heatLegend(mode, range) : familyLegend(mode, options.chip ?? null);
  const arrows = showArrows ? marginArrows(mode, skin) : { across: '', down: '' };
  const layoutStyle = 'display:grid;grid-template-columns:auto max-content;grid-template-rows:auto auto;column-gap:0.35rem;width:max-content';
  const frame = skin.frame
    ? `<div class="lab-frame" data-periodic tabindex="0" data-focus="periodic" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End">`
    : '';
  const frameEnd = skin.frame ? '</div>' : '';
  return `
    <div class="mm-pt mm-pt-${size}${highlight.size ? ' is-highlighting' : ''}" data-mm-periodic data-size="${size}">
      <div class="${skin.controls}" role="group" aria-label="Color the table by">${buttons}${options.toolbarExtra ?? ''}</div>
      <p class="trend-blurb mm-pt-blurb">${escapeHtml(mode.blurb)}${mode.kind === 'heatmap' ? ' Dark purple is lower. Yellow is higher.' : ''}</p>
      <p class="detail mm-pt-detail" aria-live="polite">${escapeHtml(formatDetail(selected, mode))}</p>
      <p class="mm-pt-more">${selected ? escapeHtml(detailExtra(selected)) : 'Arrow keys move from element to element.'}</p>
      ${highlightLine(highlight)}
      ${legend}
      <div class="${skin.scroll}">
        <div class="mm-pt-layout" style="${layoutStyle}">
          ${arrows.across}
          ${arrows.down}
          <div class="mm-pt-stack" style="grid-column:2;grid-row:2">
            ${frame}
            <div class="${skin.main}" role="grid" aria-label="Main periodic table" data-grid="main" style="${GRID_BOX}">${main.join('')}</div>
            ${frameEnd}
          </div>
        </div>
        <p class="${skin.caption}" style="${showArrows ? 'margin-left:calc(2.5rem + 0.35rem)' : ''}">The two rows below are the lanthanides (57–71) and the actinides (89–103).</p>
        <div class="${skin.fblock}" role="grid" aria-label="Lanthanides and actinides" data-grid="f" style="${GRID_BOX};${showArrows ? 'margin-left:calc(2.5rem + 0.35rem)' : ''}">${fblock.join('')}</div>
      </div>
      <p class="fine mm-pt-cite">Trends follow OpenStax Chemistry: Atoms First 2e §3.5. The table layout follows §3.6.</p>
    </div>
  `;
}

export function chipPredicate(mode, chip) {
  return (element) => {
    if (!chip) return true;
    if (mode.kind === 'block') return element.block === chip;
    if (mode.kind === 'phase') return element.phase === chip;
    return categoryKey(element.category) === chip;
  };
}

function highlightLine(highlight) {
  if (!highlight.size) return '';
  const names = [...highlight]
    .map((z) => elementByZ(z))
    .filter(Boolean)
    .map((element) => element.sym);
  return `<p class="mm-pt-hotline">Highlighted: ${escapeHtml(names.join(', '))}. Other cells are faded.</p>`;
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('click', onDocumentChip);
}

function onDocumentChip(event) {
  const chip = event.target.closest?.('[data-mm-chip]');
  const root = chip?.closest?.('[data-mm-periodic]');
  if (!root || root.dataset?.mmBound === 'mount') return;
  const name = chip.getAttribute('data-mm-chip');
  const current = root.querySelector('[data-mm-chip][aria-pressed="true"]')?.getAttribute('data-mm-chip');
  const next = current === name ? null : name;
  const modeId = root.querySelector('[data-mm-mode][aria-pressed="true"]')?.getAttribute('data-mm-mode') ?? 'category';
  const mode = normalizeMode(modeId);
  const selected = root.querySelector('[data-z][aria-pressed="true"]')?.getAttribute('data-z');
  const skin = root.querySelector('.lab-el') ? 'lab' : 'header';
  const arrowsOn = !root.querySelector('[data-action="arrows"][aria-pressed="false"]');
  root.outerHTML = renderPeriodic({
    mode,
    selectedZ: selected ? Number(selected) : null,
    size: root.getAttribute('data-size') || 'full',
    skin,
    chip: next,
    filter: chipPredicate(mode, next),
    arrows: arrowsOn && mode.kind === 'heatmap',
  });
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function shownValue(element, mode) {
  if (mode.key === 'mass') return formatMass(element.mass, element.massBracket);
  return formatNumber(element[mode.key]);
}

function detailExtra(element) {
  const mass = element.mass == null
    ? 'no standard mass'
    : `${formatMass(element.mass, element.massBracket)} u`;
  return `${categoryLabel(element.category)}. ${element.block} block. ${element.phase}. Mass ${mass}. ${element.config}.`;
}

function modeButton(mode, pressed, skin) {
  const action = skin.action
    ? ` data-action="trend" data-focus="trend-${mode.id}"`
    : '';
  return `<button type="button" class="${skin.mode}" data-trend="${mode.id}" data-mm-mode="${mode.id}" aria-pressed="${pressed ? 'true' : 'false'}"${action}>${escapeHtml(mode.label)}</button>`;
}

function marker(skin, row, col, text) {
  return `<span class="${skin.marker}" style="grid-row:${row};grid-column:${col};min-width:40px;min-height:40px" aria-hidden="true">${text}</span>`;
}

function renderCell(element, mode, range, flags) {
  const pos = cellPlacement(element);
  const paint = cellPaint(element, mode, range);
  const classes = [
    flags.skin.cell,
    paint.missing ? 'is-empty is-missing' : '',
    flags.hot ? 'is-hot' : '',
    flags.dim ? 'is-dim' : '',
    flags.filtered ? 'is-filtered' : '',
  ].filter(Boolean).join(' ');
  const style = [
    `grid-row:${pos.row}`,
    `grid-column:${pos.col}`,
    CELL_BOX,
    paint.style,
    flags.dim ? 'opacity:0.22' : '',
    flags.hot ? 'opacity:1;outline:3px solid #9a3412;outline-offset:1px;box-shadow:inset 0 0 0 3px #9a3412' : '',
    flags.filtered ? 'visibility:hidden' : '',
  ].filter(Boolean).join(';');
  const valueText = propertyText(element, mode);
  const label = `${element.name}, ${element.sym}, atomic number ${element.z}, ${valueText}`;
  const action = flags.skin.action
    ? ` data-action="element-pick" data-focus="z-${element.z}"`
    : '';
  const tab = flags.selected && !flags.filtered ? '0' : '-1';
  return `<button type="button" class="${classes}" data-z="${element.z}" style="${style}" tabindex="${tab}" aria-pressed="${flags.selected ? 'true' : 'false'}" aria-label="${escapeHtml(label)}"${flags.filtered ? ' aria-hidden="true"' : ''}${action}><span class="z">${element.z}</span><span class="sym">${escapeHtml(element.sym)}</span></button>`;
}

function propertyText(element, mode) {
  if (mode.kind === 'category') return categoryLabel(element.category);
  if (mode.kind === 'block') return `${element.block} block`;
  if (mode.kind === 'phase') return element.phase;
  const value = element[mode.key];
  if (value == null) return `${mode.label} no value`;
  return `${mode.label} ${shownValue(element, mode)} ${mode.unit}`;
}

function cellPaint(element, mode, range) {
  if (mode.kind === 'heatmap') {
    const color = scaleColor(element[mode.key], range.min, range.max);
    if (!color) return { missing: true, style: HATCH };
    return { missing: false, style: `background:${color.background};color:${color.color}` };
  }
  const hex = mode.kind === 'block'
    ? BLOCK_COLORS[element.block]
    : mode.kind === 'phase'
      ? PHASE_COLORS[element.phase] ?? CATEGORY_COLORS.unknown
      : CATEGORY_COLORS[categoryKey(element.category)] ?? CATEGORY_COLORS.unknown;
  return { missing: false, style: `background:${hex};color:${inkFor(hex)}` };
}

function heatLegend(mode, range) {
  const low = formatNumber(range.min);
  const high = formatNumber(range.max);
  return `
    <div class="legend mm-pt-legend">
      <span>Low ${escapeHtml(low)} ${escapeHtml(mode.unit)}</span>
      <span class="legend-bar mm-pt-bar" style="background:linear-gradient(90deg,${SCALE_LOW},${SCALE_HIGH})"></span>
      <span>High ${escapeHtml(high)} ${escapeHtml(mode.unit)}</span>
      <span class="mm-pt-hatch-key" style="${HATCH}"></span>
      <span>no value</span>
    </div>
  `;
}

function familyLegend(mode, chip) {
  const chips = legendEntries(mode).map((entry) => (
    `<button type="button" class="mm-pt-chip" data-mm-chip="${escapeHtml(entry.id)}" aria-pressed="${chip === entry.id ? 'true' : 'false'}" style="background:${entry.color};color:${inkFor(entry.color)};min-height:40px">${escapeHtml(entry.label)}</button>`
  )).join('');
  return `<div class="mm-pt-chips" role="group" aria-label="${escapeHtml(mode.label)} colors">${chips}</div>`;
}

function legendEntries(mode) {
  if (mode.kind === 'block') {
    return ['s', 'p', 'd', 'f'].map((id) => ({ id, label: `${id} block`, color: BLOCK_COLORS[id] }));
  }
  if (mode.kind === 'phase') {
    return ['solid', 'liquid', 'gas'].map((id) => ({ id, label: id, color: PHASE_COLORS[id] }));
  }
  return Object.entries(CATEGORY_LABELS).map(([id, label]) => ({
    id,
    label,
    color: CATEGORY_COLORS[id],
  }));
}

function marginArrows(mode, skin) {
  const acrossCopy = ACROSS_COPY[mode.across] ?? ACROSS_COPY.right;
  const downCopy = DOWN_COPY[mode.down] ?? DOWN_COPY.down;
  const acrossText = mode.acrossText ?? acrossCopy.text;
  const staticBox = 'position:static;inset:auto;height:auto;pointer-events:none';
  const arrowBody = `<span aria-hidden="true">${acrossCopy.glyph}</span><span>${escapeHtml(acrossText)}</span>`;
  const across = skin.arrow
    ? `<div class="mm-pt-across" data-across="${mode.across}" style="grid-column:2;grid-row:1;display:flex;align-items:center;gap:0.4rem"><div class="${skin.arrow}" style="display:flex;align-items:center;gap:0.4rem;${staticBox}">${arrowBody}</div></div>`
    : `<div class="mm-pt-across" data-across="${mode.across}" style="grid-column:2;grid-row:1;display:flex;align-items:center;gap:0.4rem;${staticBox}">${arrowBody}</div>`;
  return {
    across,
    down: `<div class="mm-pt-down" data-down="${mode.down}" style="grid-column:1;grid-row:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.35rem;width:2.5rem;${staticBox}"><span aria-hidden="true">${downCopy.glyph}</span><span style="writing-mode:vertical-rl;transform:rotate(180deg)">${escapeHtml(downCopy.text)}</span></div>`,
  };
}

function skinFlags(skin) {
  if (skin === 'lab') {
    return {
      cell: 'lab-el mm-pt-cell',
      main: 'lab-ptable mm-pt-main',
      fblock: 'lab-ptable lab-fblock mm-pt-fblock',
      marker: 'lab-marker mm-pt-marker',
      scroll: 'lab-scroll table-scroll mm-pt-scroll',
      controls: 'lab-controls mm-pt-modes',
      mode: 'mm-pt-mode',
      caption: 'lab-fine f-caption mm-pt-caption',
      arrow: 'lab-arrows',
      action: true,
      frame: true,
    };
  }
  return {
    cell: 'el mm-pt-cell',
    main: 'ptable mm-pt-main',
    fblock: 'ptable fblock mm-pt-fblock',
    marker: 'marker mm-pt-marker',
    scroll: 'table-scroll mm-pt-scroll',
    controls: 'trend-row mm-pt-modes',
    mode: 'trend mm-pt-mode',
    caption: 'f-caption mm-pt-caption',
    arrow: '',
    action: false,
    frame: false,
  };
}

function nearest(cells, current, pred, compare) {
  const choices = cells.filter(pred).sort(compare);
  return (choices[0] ?? current).z;
}

function inside(root, node) {
  if (!node) return false;
  if (typeof root.contains === 'function') return root.contains(node);
  return true;
}

function inkPair(rgb) {
  const background = rgbToHex(rgb);
  return { background, color: inkFor(background) };
}

function inkFor(hex) {
  const rgb = hexToRgb(hex);
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  return luminance > 0.62 ? INK : PAPER;
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
