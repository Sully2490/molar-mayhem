import { orbitalById } from './orbitals.js';

function svg(body, label) {
  return `<svg class="mm-flat" viewBox="0 0 200 150" role="img" aria-label="${label}">
    <rect width="200" height="150" fill="#fffaf2" rx="12"></rect>
    ${body}
    <text x="100" y="138" text-anchor="middle" font-size="13" font-family="Georgia, serif" fill="#1c2430">${label}</text>
  </svg>`;
}

/** Flat picture used before a model loads, and when the browser cannot draw one. */
export function orbitalFallback(id) {
  const entry = orbitalById(id);
  if (entry.family === 's') {
    const ring = entry.id === '1s'
      ? ''
      : '<circle cx="100" cy="68" r="46" fill="none" stroke="#e11d48" stroke-width="8" opacity="0.85"></circle>';
    return svg(`<circle cx="100" cy="68" r="28" fill="#2563eb" opacity="0.9"></circle>${ring}`, entry.label);
  }
  if (entry.family === 'p') {
    const horizontal = entry.id.endsWith('x');
    const lobes = horizontal
      ? '<ellipse cx="62" cy="68" rx="28" ry="16" fill="#2563eb"></ellipse><ellipse cx="138" cy="68" rx="28" ry="16" fill="#e11d48"></ellipse>'
      : '<ellipse cx="100" cy="40" rx="16" ry="26" fill="#2563eb"></ellipse><ellipse cx="100" cy="98" rx="16" ry="26" fill="#e11d48"></ellipse>';
    return svg(lobes, entry.label);
  }
  if (entry.id === '3dz2') {
    return svg(
      '<ellipse cx="100" cy="36" rx="16" ry="22" fill="#2563eb"></ellipse><ellipse cx="100" cy="102" rx="16" ry="22" fill="#2563eb"></ellipse><ellipse cx="100" cy="68" rx="34" ry="10" fill="#e11d48"></ellipse>',
      entry.label,
    );
  }
  return svg(
    '<ellipse cx="70" cy="48" rx="22" ry="14" transform="rotate(-40 70 48)" fill="#2563eb"></ellipse><ellipse cx="130" cy="90" rx="22" ry="14" transform="rotate(-40 130 90)" fill="#2563eb"></ellipse><ellipse cx="130" cy="48" rx="22" ry="14" transform="rotate(40 130 48)" fill="#e11d48"></ellipse><ellipse cx="70" cy="90" rx="22" ry="14" transform="rotate(40 70 90)" fill="#e11d48"></ellipse>',
    entry.label,
  );
}

export function flatNote(kind) {
  if (kind === 'orbital') {
    return 'Flat picture of the orbital. Drag, arrow keys, and the zoom buttons run when a model is available.';
  }
  return 'Flat picture of the shape. Arrow keys still turn it.';
}
