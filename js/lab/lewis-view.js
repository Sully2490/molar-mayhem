import {
  LEWIS_ELEMENTS,
  MOLECULES,
  applyLewis,
  atomById,
  auditLewis,
  bondsOf,
  chargeLabel,
  childAtoms,
  degreeOf,
  electronsAround,
  electronsUsed,
  formalChargeOf,
  hintFor,
  layoutLewis,
  maxLoneElectrons,
  moleculeById,
  referenceFor,
  totalValence,
} from './chem.js';
import { escapeHtml, subDigits, supDigits } from './html.js';

export function displayFormula(molecule) {
  const body = subDigits(molecule.formula);
  if (!molecule.charge) return body;
  const size = Math.abs(molecule.charge);
  const mark = molecule.charge < 0 ? '⁻' : '⁺';
  return `${body}${size === 1 ? mark : supDigits(size) + mark}`;
}

export function chargeText(value) {
  if (value == null) return 'unknown';
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}

export function describeLewis(state, molecule) {
  const used = electronsUsed(state);
  const total = totalValence(molecule);
  const sentences = [
    `Lewis drawing of ${molecule.name} (${displayFormula(molecule)}).`,
    `${used} of ${total} valence electrons are placed.`,
  ];
  const selected = state.selected;
  if (selected?.kind === 'atom') {
    const atom = atomById(state, selected.id);
    if (atom) {
      sentences.push(atom.el
        ? `${atom.el} is selected. It has ${degreeOf(state, atom.id)} bond${degreeOf(state, atom.id) === 1 ? '' : 's'} and ${atom.lp} lone pair${atom.lp === 1 ? '' : 's'}.`
        : 'An empty atom is selected. Choose an element for it.');
    }
  } else if (selected?.kind === 'bond') {
    sentences.push(`A bond is selected. Its order is ${state.orders[selected.id] ?? 1} (1 single, 2 double, 3 triple).`);
  }
  const labeled = state.atoms.filter((atom) => atom.el);
  if (labeled.length && state.showFormalCharge) {
    const bits = labeled.map((atom) => `${atom.el} ${chargeText(formalChargeOf(state, atom))}`);
    sentences.push(`Formal charges on the drawing: ${bits.join(', ')}.`);
  } else {
    sentences.push('Formal-charge badges are off.');
  }
  if (state.showElectrons && labeled.length) {
    const bits = labeled.map((atom) => `${atom.el} ${electronsAround(state, atom)}`);
    sentences.push(`Electron counts: ${bits.join(', ')}.`);
  }
  if (state.message) sentences.push(state.message);
  sentences.push('The picture stays still. Tab reaches every control. Arrow keys change the sliders. A tap does the same thing as a click.');
  return sentences.join(' ');
}

function successText(molecule) {
  const reference = referenceFor(molecule);
  const geo = molecule.geo;
  const where = geo.about ? ` around ${geo.about}` : '';
  const forms = reference && reference.count > 1
    ? ` ${reference.count} drawings are equivalent.`
    : '';
  const polarity = geo.pol ? ` The molecule is ${geo.pol}.` : '';
  const note = molecule.note ? ` ${molecule.note}` : '';
  return `Matched.${forms} Electron geometry${where}: ${geo.eg}. Shape: ${geo.mg}. Angle: ${geo.ang}°.${polarity}${note}`;
}

export function lewisAfterCheck(state, molecule) {
  const result = auditLewis(state, molecule);
  if (result.stage === 'ok') {
    return applyLewis(state, { type: 'note', message: successText(molecule), tone: 'ok', badIds: [] });
  }
  return applyLewis(state, { type: 'note', message: result.messages[0], tone: 'bad', badIds: result.badIds });
}

export function lewisAfterHint(state, molecule) {
  const result = auditLewis(state, molecule);
  return applyLewis(state, {
    type: 'note',
    message: hintFor(result.stage, state, molecule),
    tone: 'hint',
    badIds: result.badIds,
  });
}

export function lewisSvg(state, moleculeId) {
  const molecule = moleculeById(moleculeId);
  const { positions, loneSlots } = layoutLewis(state);
  const selected = state.selected;
  const atom = selected?.kind === 'atom' ? atomById(state, selected.id) : null;
  const parts = [];
  for (const item of state.atoms) {
    if (item.parent < 0) continue;
    const [x1, y1] = positions[item.parent];
    const [x2, y2] = positions[item.id];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * 5;
    const ny = dx / length * 5;
    const sx = dx / length * 22;
    const sy = dy / length * 22;
    const order = state.orders[item.id] ?? 1;
    const offsets = order === 1 ? [0] : order === 2 ? [-1, 1] : [-1.7, 0, 1.7];
    const on = selected?.kind === 'bond' && selected.id === item.id;
    const lines = offsets.map((offset) => `<line x1="${x1 + sx + nx * offset}" y1="${y1 + sy + ny * offset}" x2="${x2 - sx + nx * offset}" y2="${y2 - sy + ny * offset}" stroke="${on ? '#9a3412' : '#1c2430'}" stroke-width="3" stroke-linecap="round"/>`).join('');
    parts.push(`<g data-action="select" data-kind="bond" data-id="${item.id}" data-focus="bond-${item.id}" role="button" tabindex="0" aria-label="Bond order ${order}" aria-pressed="${on ? 'true' : 'false'}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="28"/>${lines}</g>`);
  }
  for (const item of state.atoms) {
    const [x, y] = positions[item.id];
    const on = selected?.kind === 'atom' && selected.id === item.id;
    const bad = state.badIds?.includes(item.id);
    for (const angle of loneSlots[item.id] ?? []) {
      const radians = angle * Math.PI / 180;
      const cx = x + 30 * Math.cos(radians);
      const cy = y + 30 * Math.sin(radians);
      const px = -Math.sin(radians) * 6;
      const py = Math.cos(radians) * 6;
      const fill = on ? '#9a3412' : '#0f5c56';
      parts.push(`<circle cx="${cx + px}" cy="${cy + py}" r="3.4" fill="${fill}"/><circle cx="${cx - px}" cy="${cy - py}" r="3.4" fill="${fill}"/>`);
    }
    const label = item.el ? `${item.el}, ${degreeOf(state, item.id)} bonds, ${item.lp} lone pairs` : 'Empty atom';
    parts.push(`<g data-action="select" data-kind="atom" data-id="${item.id}" data-focus="atom-${item.id}" role="button" tabindex="0" aria-label="${escapeHtml(label)}" aria-pressed="${on ? 'true' : 'false'}"><circle cx="${x}" cy="${y}" r="22" fill="${item.el ? (bad ? '#fee2e2' : '#fffaf2') : '#1c2430'}" stroke="${on || bad ? '#9a3412' : '#0f5c56'}" stroke-width="${on ? 4 : 2}"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-size="18" font-weight="700" fill="${item.el ? '#1c2430' : '#fffaf2'}">${item.el ?? ''}</text>`);
    if (state.showFormalCharge && item.el) {
      const formal = formalChargeOf(state, item);
      const bg = formal > 0 ? '#9a3412' : formal < 0 ? '#1d4ed8' : '#5d675f';
      parts.push(`<circle cx="${x + 20}" cy="${y - 18}" r="11" fill="${bg}"/><text x="${x + 20}" y="${y - 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#fffaf2">${chargeText(formal)}</text>`);
    }
    if (state.showElectrons && item.el) {
      parts.push(`<text x="${x}" y="${y + 38}" text-anchor="middle" font-size="12" fill="#0f5c56">${electronsAround(state, item)} e</text>`);
    }
    parts.push('</g>');
  }
  if (molecule.charge) {
    parts.push(`<text x="12" y="24" font-size="14" font-weight="700" fill="#0f5c56">charge ${escapeHtml(chargeLabel(molecule.charge))}</text>`);
  }
  return `<svg class="lab-lewis" viewBox="0 0 600 430" role="group" aria-label="Lewis structure" aria-describedby="lab-desc" data-touch="draw"><rect x="1" y="1" width="598" height="428" rx="16" fill="#fffaf2" stroke="#ddd4c3"/>${parts.join('')}</svg>`;
}

export function renderLewis(state, moleculeId) {
  const molecule = moleculeById(moleculeId);
  const selected = state.selected;
  const atom = selected?.kind === 'atom' ? atomById(state, selected.id) : null;
  const options = MOLECULES.map((item) => `<option value="${item.id}" ${item.id === molecule.id ? 'selected' : ''}>${escapeHtml(displayFormula(item))} ${escapeHtml(item.name)}</option>`).join('');
  const palette = LEWIS_ELEMENTS.map((symbol) => `<button type="button" class="lab-key" data-action="element" data-el="${symbol}" data-focus="el-${symbol}" ${atom ? '' : 'disabled'}>${symbol}</button>`).join('');
  const degree = atom ? degreeOf(state, atom.id) : 1;
  const loneMax = atom ? maxLoneElectrons(state, atom) : 0;
  const bondOrder = selected?.kind === 'bond' ? (state.orders[selected.id] ?? 1) : 1;
  return `
    <section class="lab-tool" data-tool="lewis" data-motion="still">
      <h2>Lewis builder</h2>
      <p id="lab-desc" class="lab-desc" aria-live="polite">${escapeHtml(describeLewis(state, molecule))}</p>
      <div class="lab-controls">
        <label>Molecule
          <select data-action="molecule" data-focus="molecule">${options}</select>
        </label>
        <button type="button" data-action="toggle" data-flag="showFormalCharge" data-focus="fc" aria-pressed="${state.showFormalCharge ? 'true' : 'false'}">Formal charges</button>
        <button type="button" data-action="toggle" data-flag="showElectrons" data-focus="electrons" aria-pressed="${state.showElectrons ? 'true' : 'false'}">Electron counts</button>
        <button type="button" data-action="check" data-focus="check">Check</button>
        <button type="button" data-action="hint" data-focus="hint">Hint</button>
        <button type="button" data-action="undo" data-focus="undo">Undo</button>
        <button type="button" data-action="reset" data-focus="reset">Reset</button>
      </div>
      <div class="lab-stage">
        ${lewisSvg(state, moleculeId)}
        <div class="lab-side">
          <label>Bonds on the selected atom <b data-readout="degree">${degree}</b>
            <input type="range" min="1" max="6" step="1" value="${degree}" data-action="degree" data-focus="degree" ${atom ? '' : 'disabled'} aria-valuetext="${degree} bonds">
          </label>
          <label>Lone-pair electrons on the selected atom <b data-readout="lone">${atom ? atom.lp * 2 : 0}</b>
            <input type="range" min="0" max="${loneMax}" step="2" value="${atom ? atom.lp * 2 : 0}" data-action="lone" data-focus="lone" ${atom ? '' : 'disabled'}>
          </label>
          <label>Bond order of the selected bond <b data-readout="order">${bondOrder}</b>
            <input type="range" min="1" max="3" step="1" value="${bondOrder}" data-action="order" data-focus="order" ${selected?.kind === 'bond' ? '' : 'disabled'}>
          </label>
          <p class="lab-fine">Elements</p>
          <div class="lab-palette" role="group" aria-label="Element picker">${palette}</div>
          <p class="lab-msg" data-tone="${escapeHtml(state.messageTone || '')}" role="status">${escapeHtml(state.message || 'Select an atom (it outlines in rust), set how many atoms bond to it, then give each atom an element.')}</p>
        </div>
      </div>
    </section>
  `;
}

export function lewisSelectionLabel(state) {
  if (state.selected?.kind !== 'atom') return '';
  const atom = atomById(state, state.selected.id);
  return atom?.el ?? 'empty';
}

export { childAtoms, bondsOf };
