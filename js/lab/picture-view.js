import {
  ORBITAL_TYPES,
  bohrEnergyEv,
  emission,
  orbitalBlurb,
  orbitalLabel,
  photonFromWavelength,
  standingPath,
  waveColor,
  waveNodes,
  wavePath,
  waveRegion,
  wavelengthFromSpectrum,
} from './chem.js';
import { escapeHtml, sci } from './html.js';

export function describeWave(state, motion) {
  const photon = photonFromWavelength(state.lambda);
  const nodes = state.nodes ? 'Nodes, the dots on the center line, are showing.' : 'Nodes are hidden.';
  const frame = motion === 'still'
    ? 'The wave is holding still on one frame.'
    : 'The wave is moving.';
  return `A light wave with wavelength ${state.lambda} nm. That is ${waveRegion(state.lambda)} light. Frequency is ${sci(photon.frequency)} hertz. One photon carries ${sci(photon.energy)} joules. ${nodes} ${frame} Left and right arrows change the wavelength. You can also drag across the color bar.`;
}

export function renderWave(state, motion) {
  const photon = photonFromWavelength(state.lambda);
  const path = wavePath(state.lambda, motion === 'still' ? 0 : state.phase);
  const nodes = state.nodes ? waveNodes(state.lambda, motion === 'still' ? 0 : state.phase) : [];
  const nodeMarks = nodes.map((x) => `<circle cx="${x.toFixed(1)}" cy="80" r="4" fill="#1c2430"/>`).join('');
  const pixels = Math.max(state.lambda / 5, 8);
  const marker = ((state.lambda - 100) / 900) * 600;
  const playLabel = motion === 'still' ? 'Play' : 'Pause';
  const pressed = motion === 'still' ? 'false' : 'true';
  return `
    <section class="lab-tool" data-tool="wave" data-motion="${motion}">
      <h2>Electromagnetic wave</h2>
      <p id="lab-desc" class="lab-desc" aria-live="polite">${escapeHtml(describeWave({ ...state, phase: motion === 'still' ? 0 : state.phase }, motion))}</p>
      <div class="lab-controls">
        <label for="wave-lambda">Wavelength <b>${state.lambda}</b> nm</label>
        <input id="wave-lambda" type="range" min="100" max="1000" step="1" value="${state.lambda}" data-action="lambda" data-focus="lambda" aria-valuemin="100" aria-valuemax="1000" aria-valuenow="${state.lambda}" aria-valuetext="${state.lambda} nanometers, ${waveRegion(state.lambda)}">
        <label class="lab-check"><input type="checkbox" data-action="nodes" data-focus="nodes" ${state.nodes ? 'checked' : ''}> Show nodes</label>
        <button type="button" data-action="play" data-focus="play" data-play="wave" aria-pressed="${pressed}" ${state.locked ? 'disabled' : ''}>${state.locked ? 'Still' : playLabel}</button>
      </div>
      <svg class="lab-svg" data-wave viewBox="0 0 600 170" role="img" aria-label="Sine wave at ${state.lambda} nanometers" aria-describedby="lab-desc">
        <line x1="0" y1="80" x2="600" y2="80" stroke="#ddd4c3"/>
        <path data-path d="${path}" fill="none" stroke="${photon.color}" stroke-width="4"/>
        <g data-nodes>${nodeMarks}</g>
        <line x1="20" y1="150" x2="${20 + pixels}" y2="150" stroke="#0f5c56" stroke-width="2"/>
        <text x="${28 + pixels}" y="154" font-size="13" fill="#0f5c56">λ = ${state.lambda} nm</text>
      </svg>
      <svg class="lab-spectrum" data-spectrum tabindex="0" role="slider" aria-label="Wavelength color bar" aria-valuemin="100" aria-valuemax="1000" aria-valuenow="${state.lambda}" aria-valuetext="${state.lambda} nanometers" data-focus="spectrum" aria-keyshortcuts="ArrowLeft ArrowRight">
        <rect x="0" y="8" width="600" height="22" rx="8" fill="#efe6d6"/>
        <rect x="186.7" y="8" width="246.6" height="22" fill="url(#lab-vis)"/>
        <text x="8" y="24" font-size="12">UV</text>
        <text x="560" y="24" font-size="12">IR</text>
        <polygon points="${marker - 7},36 ${marker + 7},36 ${marker},24" fill="#1c2430"/>
        <defs><linearGradient id="lab-vis"><stop offset="0" stop-color="#6d28d9"/><stop offset="0.25" stop-color="#2563eb"/><stop offset="0.5" stop-color="#16a34a"/><stop offset="0.75" stop-color="#eab308"/><stop offset="1" stop-color="#dc2626"/></linearGradient></defs>
      </svg>
      <p class="lab-readout">ν = ${sci(photon.frequency)} Hz · E = ${sci(photon.energy)} J · ${waveRegion(state.lambda)}</p>
    </section>
  `;
}

export function describeStanding(state, motion) {
  const nodes = state.n + 1;
  const frame = motion === 'still'
    ? 'Both pictures are holding still.'
    : 'Both pictures are moving.';
  return `${state.n} half-wave${state.n === 1 ? '' : 's'} fit on the string, so there are ${nodes} nodes, counting both fixed ends. The loop on the right closes after ${state.n} wavelength${state.n === 1 ? '' : 's'}, which is why only certain energies fit. ${frame} Arrow keys change n. Drag is not needed.`;
}

export function renderStanding(state, motion) {
  const phase = motion === 'still' ? 0 : state.phase;
  const amplitude = 55 * Math.cos(phase);
  const string = standingPath(state.n, amplitude);
  const ring = circleWave(state.n, phase);
  const dots = string.nodes.map((x) => `<circle cx="${x}" cy="80" r="5" fill="#9a3412"/>`).join('');
  return `
    <section class="lab-tool" data-tool="standing" data-motion="${motion}">
      <h2>Standing waves</h2>
      <p id="lab-desc" class="lab-desc" aria-live="polite">${escapeHtml(describeStanding(state, motion))}</p>
      <div class="lab-controls">
        <label for="stand-n">Half-waves n <b>${state.n}</b></label>
        <input id="stand-n" type="range" min="1" max="6" step="1" value="${state.n}" data-action="half" data-focus="half" aria-valuetext="${state.n} half-waves, ${state.n + 1} nodes">
        <button type="button" data-action="play" data-focus="play" data-play="standing" aria-pressed="${motion === 'still' ? 'false' : 'true'}" ${state.locked ? 'disabled' : ''}>${state.locked ? 'Still' : motion === 'still' ? 'Play' : 'Pause'}</button>
      </div>
      <div class="lab-split">
        <svg class="lab-svg" data-standing viewBox="0 0 360 170" role="img" aria-label="String with ${state.n + 1} nodes" aria-describedby="lab-desc">
          <path d="${string.lower}" fill="none" stroke="#ddd4c3" stroke-dasharray="4 4"/>
          <path data-string d="${string.upper}" fill="none" stroke="#0f5c56" stroke-width="3.5"/>
          <g data-stand-nodes>${dots}</g>
          <text x="12" y="160" font-size="14">${state.n + 1} nodes</text>
        </svg>
        <svg class="lab-svg lab-loop" data-loop viewBox="0 0 200 200" role="img" aria-label="Electron wave around a nucleus, n = ${state.n}">
          <circle cx="100" cy="100" r="60" fill="none" stroke="#ddd4c3" stroke-dasharray="3 3"/>
          <circle cx="100" cy="100" r="8" fill="#9a3412"/>
          <path data-loop-path d="${ring}" fill="none" stroke="#0f5c56" stroke-width="3"/>
        </svg>
      </div>
    </section>
  `;
}

function circleWave(n, phase) {
  let path = '';
  for (let angle = 0; angle <= 360; angle += 3) {
    const radius = 60 + 14 * Math.sin((n * angle * Math.PI) / 180) * Math.cos(phase);
    const radians = (angle * Math.PI) / 180;
    const x = 100 + radius * Math.cos(radians);
    const y = 100 + radius * Math.sin(radians);
    path += `${angle ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return `${path}Z`;
}

export function describeLevels(state) {
  if (state.last) {
    const line = state.last;
    return `The electron dropped from n = ${line.ni} to n = ${line.nf}. The gap is ${sci(line.energy)} joules, so the photon is ${line.lambdaNm.toFixed(1)} nm (${line.region}, ${line.series}). The arrow on the diagram is that drop. The black strip collects visible lines. This diagram stays still. Choose a level with Enter, Space, or a tap.`;
  }
  if (state.upper) {
    return `n = ${state.upper} is selected, at ${bohrEnergyEv(state.upper).toFixed(2)} eV. Choose a lower level to drop the electron and give off a photon. The diagram is still.`;
  }
  return 'Hydrogen energy levels from n = 1 up to n = 6. Energy is more negative when n is small. Pick a high level, then a lower one. The diagram stays still. Arrow keys move between levels. Enter, Space, or a tap chooses one.';
}

export function renderLevels(state) {
  const yOf = (n) => 36 + 250 * (1 - (bohrEnergyEv(n) + 13.6) / 13.6);
  const levels = [1, 2, 3, 4, 5, 6].map((n) => {
    const y = yOf(n);
    const on = state.upper === n;
    const tab = n === state.focus ? '0' : '-1';
    return `<g data-action="level" data-n="${n}" data-focus="level-${n}" role="button" tabindex="${tab}" aria-pressed="${on ? 'true' : 'false'}" aria-label="Level n = ${n}, ${bohrEnergyEv(n).toFixed(2)} electronvolts"><rect x="40" y="${y - 16}" width="250" height="32" fill="transparent"/><line x1="70" x2="280" y1="${y}" y2="${y}" stroke="${on ? '#9a3412' : '#1c2430'}" stroke-width="${on ? 4 : 2}"/><text x="292" y="${y + 4}" font-size="13">n = ${n} (${bohrEnergyEv(n).toFixed(2)} eV)</text></g>`;
  }).join('');
  let arrow = '';
  if (state.last) {
    const line = state.last;
    const y1 = yOf(line.ni);
    const y2 = yOf(line.nf);
    arrow = `<line x1="150" y1="${y1}" x2="150" y2="${y2}" stroke="${line.color}" stroke-width="4" marker-end="url(#lab-arrow)"/><text x="160" y="${(y1 + y2) / 2}" font-size="13" fill="${line.color}">${line.lambdaNm.toFixed(0)} nm</text>`;
  }
  const strips = state.lines
    .filter((line) => line.lambdaNm >= 380 && line.lambdaNm <= 750)
    .map((line) => `<rect x="${((line.lambdaNm - 380) / 370) * 400}" y="0" width="3" height="36" fill="${line.color}"/>`)
    .join('');
  return `
    <section class="lab-tool" data-tool="levels" data-motion="still">
      <h2>Hydrogen energy levels</h2>
      <p id="lab-desc" class="lab-desc" aria-live="polite">${escapeHtml(describeLevels(state))}</p>
      <div class="lab-split">
        <svg class="lab-svg" viewBox="0 0 460 320" role="group" aria-label="Hydrogen levels" aria-describedby="lab-desc" data-level-list>
          <defs><marker id="lab-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#9a3412"/></marker></defs>
          ${levels}
          <line x1="70" x2="280" y1="${yOf(99)}" y2="${yOf(99)}" stroke="#5d675f" stroke-dasharray="4 3"/>
          <text x="292" y="${yOf(99) + 4}" font-size="12" fill="#5d675f">n = ∞ (0 eV)</text>
          ${arrow}
        </svg>
        <div class="lab-side">
          <p class="lab-fine">Visible lines land on the strip. Ultraviolet and infrared jumps are named in the sentence above.</p>
          <svg class="lab-spectrum" viewBox="0 0 400 36" role="img" aria-label="Visible emission lines collected so far">
            <rect width="400" height="36" rx="6" fill="#1c2430"/>
            ${strips}
          </svg>
          <button type="button" data-action="clear-lines" data-focus="clear-lines">Clear the strip</button>
        </div>
      </div>
    </section>
  `;
}

export function describeOrbital(type) {
  return `${orbitalLabel(type)} orbital. ${orbitalBlurb(type)} The drawing is a still picture, with the two shades marking opposite phase. Arrow keys move through the shapes. f orbitals are left out.`;
}

export function orbitalSvg(type, size = 260) {
  const center = size / 2;
  const radius = size * 0.36;
  const axes = { x: [-0.55, 0.42], y: [1, 0], z: [0, -1] };
  const project = (vector) => [center + radius * vector[0], center + radius * vector[1]];
  const lobe = (vector, tone) => {
    const length = Math.hypot(...vector) || 1;
    const angle = Math.atan2(vector[1], vector[0]) * 180 / Math.PI;
    const cx = center + radius * vector[0] * 0.55;
    const cy = center + radius * vector[1] * 0.55;
    return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(radius * 0.55 * Math.max(length, 0.6)).toFixed(1)}" ry="${(radius * 0.24).toFixed(1)}" transform="rotate(${angle.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="${tone === 'a' ? '#0f5c56' : '#c2410c'}" opacity="0.9"/>`;
  };
  const axisLines = ['x', 'y', 'z'].map((key) => {
    const end = project(axes[key]);
    const start = project([-axes[key][0], -axes[key][1]]);
    return `<line x1="${start[0].toFixed(1)}" y1="${start[1].toFixed(1)}" x2="${end[0].toFixed(1)}" y2="${end[1].toFixed(1)}" stroke="#cfc4b0" stroke-dasharray="3 3"/><text x="${(end[0] + 4).toFixed(1)}" y="${(end[1] + 4).toFixed(1)}" font-size="12" fill="#5d675f">${key}</text>`;
  }).join('');
  const neg = (vector) => [-vector[0], -vector[1]];
  const unitSum = (a, b) => {
    const sum = [a[0] + b[0], a[1] + b[1]];
    const length = Math.hypot(...sum) || 1;
    return [sum[0] / length * 0.95, sum[1] / length * 0.95];
  };
  let body = '';
  if (type === 's') body = `<circle cx="${center}" cy="${center}" r="${(radius * 0.62).toFixed(1)}" fill="#0f5c56"/>`;
  else if (type[0] === 'p') {
    const vector = axes[type[1]];
    body = lobe(vector, 'a') + lobe(neg(vector), 'b');
  } else if (type === 'dz2') {
    body = `${lobe(axes.z, 'a')}${lobe(neg(axes.z), 'a')}<ellipse cx="${center}" cy="${center}" rx="${(radius * 0.48).toFixed(1)}" ry="${(radius * 0.16).toFixed(1)}" fill="none" stroke="#c2410c" stroke-width="${(radius * 0.12).toFixed(1)}"/>`;
  } else {
    let dirs;
    if (type === 'dx2y2') {
      dirs = [[axes.x, 'a'], [neg(axes.x), 'a'], [axes.y, 'b'], [neg(axes.y), 'b']];
    } else {
      const pair = type === 'dxy' ? [axes.x, axes.y] : type === 'dxz' ? [axes.x, axes.z] : [axes.y, axes.z];
      dirs = [
        [unitSum(pair[0], pair[1]), 'a'],
        [unitSum(neg(pair[0]), neg(pair[1])), 'a'],
        [unitSum(pair[0], neg(pair[1])), 'b'],
        [unitSum(neg(pair[0]), pair[1]), 'b'],
      ];
    }
    body = dirs.map(([vector, tone]) => lobe(vector, tone)).join('');
  }
  return `<svg class="lab-svg lab-orbital" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeHtml(orbitalLabel(type))} orbital picture" aria-describedby="lab-desc">${axisLines}${body}<circle cx="${center}" cy="${center}" r="3" fill="#1c2430"/><text x="10" y="22" font-size="16" font-weight="700">${escapeHtml(orbitalLabel(type))}</text></svg>`;
}

export function renderOrbitals(state) {
  const tabs = ORBITAL_TYPES.map((type) => {
    const on = type === state.type;
    return `<button type="button" role="tab" data-action="orbital" data-orbital="${type}" data-focus="orb-${type}" aria-selected="${on ? 'true' : 'false'}" tabindex="${on ? '0' : '-1'}">${escapeHtml(orbitalLabel(type))}</button>`;
  }).join('');
  return `
    <section class="lab-tool" data-tool="orbitals" data-motion="still">
      <h2>Orbital pictures</h2>
      <p id="lab-desc" class="lab-desc" aria-live="polite">${escapeHtml(describeOrbital(state.type))}</p>
      <div class="lab-tabs" role="tablist" aria-label="Orbital shapes" data-orbit-list>${tabs}</div>
      <div class="lab-split">
        ${orbitalSvg(state.type)}
        <p class="lab-fine">Teal and rust are opposite phases of the wave. The nucleus is the dark dot.</p>
      </div>
    </section>
  `;
}

export { wavelengthFromSpectrum, waveColor };
