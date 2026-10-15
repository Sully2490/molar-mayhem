/** Mastery ring drawn from lesson counts already stored in local progress. */

const RADIUS = 15.5;

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function ringGeometry(mastered, total) {
  const safeTotal = Number(total) > 0 ? Number(total) : 0;
  const safeMastered = Math.max(0, Math.min(Number(mastered) || 0, safeTotal));
  const ratio = safeTotal === 0 ? 0 : safeMastered / safeTotal;
  const circ = 2 * Math.PI * RADIUS;
  return {
    mastered: safeMastered,
    total: safeTotal,
    ratio,
    radius: RADIUS,
    dash: (ratio * circ).toFixed(2),
    gap: ((1 - ratio) * circ).toFixed(2),
  };
}

export function progressRingHtml(mastered, total) {
  const ring = ringGeometry(mastered, total);
  const label = ring.total === 0
    ? 'No lessons yet'
    : `${ring.mastered} of ${ring.total} lessons mastered`;
  return `<svg class="progress-ring" viewBox="0 0 36 36" role="img" aria-label="${escapeHtml(label)}">
    <circle class="progress-ring-track" cx="18" cy="18" r="${ring.radius}"></circle>
    <circle class="progress-ring-value" cx="18" cy="18" r="${ring.radius}" stroke-dasharray="${ring.dash} ${ring.gap}" transform="rotate(-90 18 18)"></circle>
  </svg>`;
}
