import { VSEPR_SHAPES, dragView, initialView, projectPoint, rotateView, shapeSpec, vseprById } from './chem.js';
import { escapeHtml, subDigits } from './html.js';
import { boot3d, shapeStage, shapeTools, viewMarker } from '../three-d/index.js';

boot3d();

const ATOM_INK = {
  H: '#1c2430',
  C: '#fffaf2',
  O: '#fffaf2',
  N: '#fffaf2',
  F: '#fffaf2',
  B: '#1c2430',
  S: '#1c2430',
  Xe: '#fffaf2',
  A: '#fffaf2',
  X: '#1c2430',
};

const ATOM_FILL = {
  H: '#f8fafc',
  C: '#334155',
  O: '#e11d48',
  N: '#2563eb',
  F: '#16a34a',
  B: '#fecdd3',
  S: '#eab308',
  Xe: '#0f766e',
  A: '#0f5c56',
  X: '#e7e5e4',
};

export function describeVsepr(shape, motion) {
  const frame = motion === 'still'
    ? 'The model is holding still. Arrow keys or a drag will turn it when motion is allowed; with reduced motion it stays on this frame and the arrow keys still turn it.'
    : 'The model is turning. Arrow keys or a drag take over the spin.';
  const lone = shape.lone
    ? ` ${shape.lone} lone pair${shape.lone === 1 ? '' : 's'} show as purple clouds and push the bonds closer.`
    : ' There are no lone pairs.';
  return `${subDigits(shape.label)} has ${shape.bonded} bonded atom${shape.bonded === 1 ? '' : 's'} and ${shape.lone} lone pair${shape.lone === 1 ? '' : 's'}, so ${shape.bonded + shape.lone} electron domains. Electron geometry is ${shape.eg}. The shape of the atoms is ${shape.mg}. The marked angle is ${shape.angle}°.${lone} ${frame}`;
}

export function renderVsepr(state, motion) {
  const shape = vseprById(state.id);
  const tabs = VSEPR_SHAPES.map((item) => {
    const on = item.id === shape.id;
    return `<button type="button" role="tab" data-action="shape" data-shape="${item.id}" data-focus="shape-${item.id}" aria-selected="${on ? 'true' : 'false'}" tabindex="${on ? '0' : '-1'}">${escapeHtml(subDigits(item.label))}</button>`;
  }).join('');
  return `
    <section class="lab-tool" data-tool="vsepr" data-motion="${motion}">
      <h2>VSEPR viewer</h2>
      <p id="lab-desc" class="lab-desc" aria-live="polite">${escapeHtml(describeVsepr(shape, motion))}</p>
      <div class="lab-tabs" role="tablist" aria-label="VSEPR shapes" data-shape-list>${tabs}</div>
      <div class="lab-split">
        <div class="mm-3d-stack" data-mm-stack="vsepr">
          ${vseprSvg(shape, state.view, motion)}
          ${shapeStage({ source: 'lab', shapeId: shape.id, yaw: state.view.yaw, pitch: state.view.pitch, spin: motion === 'run' ? 'on' : 'off' })}
        </div>
        <div class="lab-side">
          <p><b>Electron geometry:</b> ${escapeHtml(shape.eg)}</p>
          <p><b>Molecular shape:</b> ${escapeHtml(shape.mg)}</p>
          <p><b>Angle:</b> ${escapeHtml(shape.angle)}°</p>
          <button type="button" data-action="play" data-focus="play" data-play="vsepr" aria-pressed="${motion === 'still' ? 'false' : 'true'}" ${state.locked ? 'disabled' : ''}>${state.locked ? 'Still' : motion === 'still' ? 'Spin' : 'Hold still'}</button>
          <button type="button" data-action="reset-view" data-focus="reset-view">Reset view</button>
          ${shapeTools(shape.id)}
          <p class="lab-fine">Arrow keys turn the model. Home resets it. A finger drag works on a phone. Zoom in and Zoom out move the camera.</p>
        </div>
      </div>
    </section>
  `;
}

export function vseprInner(shape, view, motion) {
  const spec = shapeSpec(shape);
  const width = 360;
  const height = 300;
  const origin = projectPoint([0, 0, 0], view, width, height);
  const items = [];
  spec.atoms.forEach((vector, index) => {
    const point = projectPoint(vector, view, width, height);
    items.push({ z: (origin.z + point.z) / 2, html: `<line x1="${origin.x.toFixed(1)}" y1="${origin.y.toFixed(1)}" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" stroke="#94a3b8" stroke-width="7" stroke-linecap="round"/>` });
    const symbol = index === 0 || shape.outer ? shape.outer : 'X';
    const ink = ATOM_INK[symbol] ?? '#1c2430';
    const fill = ATOM_FILL[symbol] ?? '#e7e5e4';
    items.push({
      z: point.z,
      html: `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${(16 * point.scale).toFixed(1)}" fill="${fill}" stroke="#1c2430"/><text x="${point.x.toFixed(1)}" y="${(point.y + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${ink}">${symbol}</text>`,
    });
  });
  spec.lonePairs.forEach((vector) => {
    const point = projectPoint(vector.map((value) => value * 0.72), view, width, height);
    items.push({
      z: point.z,
      html: `<ellipse cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" rx="22" ry="14" fill="#c4b5fd" opacity="0.85"/><circle cx="${(point.x - 4).toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.4" fill="#5b21b6"/><circle cx="${(point.x + 4).toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.4" fill="#5b21b6"/>`,
    });
  });
  items.push({
    z: origin.z,
    html: `<circle cx="${origin.x.toFixed(1)}" cy="${origin.y.toFixed(1)}" r="18" fill="${ATOM_FILL[shape.center] ?? '#0f5c56'}" stroke="#1c2430"/><text x="${origin.x.toFixed(1)}" y="${(origin.y + 5).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="700" fill="${ATOM_INK[shape.center] ?? '#fffaf2'}">${shape.center}</text>`,
  });
  if (spec.atoms.length >= 2) {
    const first = spec.atoms[0];
    const second = spec.atoms[Math.min(2, spec.atoms.length - 1)];
    let arc = '';
    for (let step = 0; step <= 16; step += 1) {
      const mix = step / 16;
      const vector = first.map((value, index) => value * (1 - mix) + second[index] * mix);
      const length = Math.hypot(...vector) || 1;
      const point = projectPoint(vector.map((value) => value / length * 0.42), view, width, height);
      arc += `${step ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    }
    const mid = projectPoint(first.map((value, index) => (value + second[index]) * 0.34), view, width, height);
    items.push({ z: 3, html: `<path d="${arc}" fill="none" stroke="#9a3412" stroke-width="2.5"/><text x="${mid.x.toFixed(1)}" y="${mid.y.toFixed(1)}" font-size="13" font-weight="700" fill="#9a3412">${escapeHtml(shape.angle)}°</text>` });
  }
  items.sort((a, b) => a.z - b.z);
  items.push({ z: -10, html: viewMarker(view) });
  const frame = motion === 'still' ? 'Still frame.' : 'Spinning.';
  return `${items.map((item) => item.html).join('')}<text x="12" y="288" font-size="12" fill="#5d675f">${frame} Drag or use arrow keys.</text>`;
}

export function vseprSvg(shape, view, motion) {
  const frame = motion === 'still' ? 'Still frame.' : 'Spinning.';
  return `<svg class="lab-rotate" data-rotate tabindex="0" data-focus="viewer" viewBox="0 0 360 300" role="application" aria-label="3D ${escapeHtml(shape.mg)} model. ${frame} Arrow keys rotate. Home resets." aria-describedby="lab-desc" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home">${vseprInner(shape, view, motion)}</svg>`;
}

export { dragView, initialView, rotateView, shapeSpec };
