import { orbitalFallback } from './fallback.js';
import { hasMolecule } from './molecules.js';
import { ORBITALS, orbitalById } from './orbitals.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function orbitalBlock(id, { reduced = false } = {}) {
  const entry = orbitalById(id);
  const options = ORBITALS.map((item) => (
    `<option value="${item.id}" ${item.id === entry.id ? 'selected' : ''}>${escapeHtml(item.label)}</option>`
  )).join('');
  return `
    <div class="mm-3d-stack" data-mm-stack="orbital">
      <label class="b-field">Orbital picture
        <select data-action="orbital-picture" data-focus="orbital-picture">${options}</select>
      </label>
      <mm-3d-stage data-kind="orbital" data-orbital="${entry.id}" data-yaw="0.6" data-pitch="0.35" data-zoom="1" data-spin="off" tabindex="0" role="application" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home Equal Minus" aria-label="Rotatable ${escapeHtml(entry.label)}. Blue and red are opposite phases. Arrow keys turn it. Home resets. Plus and minus zoom.">${orbitalFallback(entry.id)}</mm-3d-stage>
      <div class="mm-3d-tools">
        <button type="button" data-mm-zoom="in">Zoom in</button>
        <button type="button" data-mm-zoom="out">Zoom out</button>
        <button type="button" data-mm-reset>Reset view</button>
        <button type="button" data-mm-spin aria-pressed="false" ${reduced ? 'disabled' : ''}>${reduced ? 'Still' : 'Spin'}</button>
      </div>
      <p class="mm-3d-note">The surface is the orbital. Blue and red are opposite phases. OpenStax Chemistry: Atoms First 2e §3.3.</p>
    </div>
  `;
}

export function shapeStage({ source, shapeId, yaw, pitch, spin = 'off' }) {
  return `<mm-3d-stage data-kind="vsepr" data-source="${source}" data-shape="${escapeHtml(shapeId)}" data-yaw="${Number(yaw)}" data-pitch="${Number(pitch)}" data-spin="${spin}" aria-hidden="true"></mm-3d-stage>`;
}

export function shapeTools(shapeId) {
  const molecule = hasMolecule(shapeId)
    ? '<button type="button" data-mm-style="toggle" data-focus="ball" aria-pressed="false">Ball and stick</button>'
    : '';
  return `<div class="mm-3d-tools">${molecule}<button type="button" data-mm-zoom="in">Zoom in</button><button type="button" data-mm-zoom="out">Zoom out</button></div>`;
}

export function viewMarker(view) {
  const yaw = Number(view?.yaw ?? 0).toFixed(5);
  const pitch = Number(view?.pitch ?? 0).toFixed(5);
  return `<g data-mm-view="${yaw} ${pitch}"></g>`;
}
