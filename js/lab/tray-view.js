import { ELEMENTS } from '../elements.js';
import { formatDetail, getTrend, renderPeriodic } from '../periodic.js';
import { TREND_ARROWS, moveSelection } from './chem.js';
import { escapeHtml } from './html.js';

export function describeTray(state) {
  const trend = getTrend(state.trend);
  const element = ELEMENTS.find((item) => item.z === state.z);
  const detail = formatDetail(element, trend);
  const arrows = TREND_ARROWS[trend.id] ?? TREND_ARROWS.radius;
  let arrowText = 'Trend arrows are for the number heat maps.';
  if (trend.kind === 'heatmap' && state.arrows) {
    arrowText = `Arrows sit in the margins, not on the cells. ${arrows.map((arrow) => arrow.text).join(' ')}`;
  } else if (trend.kind === 'heatmap') {
    arrowText = 'The trend arrows are hidden. The cells stay colored as a heat map. Dark purple is lower and yellow is higher.';
  }
  const lead = trend.kind === 'heatmap'
    ? `Periodic table heat map for ${trend.label.toLowerCase()}.`
    : `Periodic table colored by ${trend.label.toLowerCase()}.`;
  return `${lead} ${trend.blurb} ${detail} ${arrowText} The table stays still. Arrow keys move from element to element. A tap selects one.`;
}

export function renderTray(state) {
  const trend = getTrend(state.trend);
  const arrowsOn = Boolean(state.arrows) && trend.kind === 'heatmap';
  const board = renderPeriodic({
    mode: state.trend,
    selectedZ: state.z,
    size: 'full',
    arrows: arrowsOn,
    skin: 'lab',
    toolbarExtra: `<button type="button" data-action="arrows" data-focus="arrows" aria-pressed="${state.arrows ? 'true' : 'false'}">Trend arrows</button>`,
  });
  return `
    <section class="lab-tool" data-tool="tray" data-motion="still">
      <h2>Periodic table</h2>
      <p id="lab-desc" class="lab-desc" aria-live="polite">${escapeHtml(describeTray(state))}</p>
      ${board}
    </section>
  `;
}

export { moveSelection };
