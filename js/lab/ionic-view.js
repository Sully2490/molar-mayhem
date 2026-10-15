import { ANIONS, CATIONS, ionById, ionicFormula } from './chem.js';
import { escapeHtml, subDigits, supDigits } from './html.js';

function prettyFormula(formula) {
  return subDigits(formula);
}

function ionLabel(ion) {
  const mark = ion.charge > 0 ? '⁺' : '⁻';
  const size = ion.charge === 1 ? '' : supDigits(ion.charge);
  return `${subDigits(ion.formula)}${size}${mark} ${ion.name}`;
}

export function describeIonic(cationId, anionId) {
  const cation = ionById(CATIONS, cationId);
  const anion = ionById(ANIONS, anionId);
  const result = ionicFormula(cation, anion);
  const paren = result.parentheses
    ? 'Parentheses are there because a polyatomic ion is used more than once.'
    : 'No parentheses: a polyatomic ion is not repeated.';
  return `${result.cationCount} ${cation.name} ion${result.cationCount === 1 ? '' : 's'} (${cation.charge}+) and ${result.anionCount} ${anion.name} ion${result.anionCount === 1 ? '' : 's'} (${anion.charge}−) cancel to zero. The formula on the screen is ${prettyFormula(result.formula)}, ${result.name}. ${paren} The picture stays still. The two menus work by keyboard, tap, or mouse.`;
}

export function renderIonic(state) {
  const cation = ionById(CATIONS, state.cation);
  const anion = ionById(ANIONS, state.anion);
  const result = ionicFormula(cation, anion);
  const cationOptions = CATIONS.map((ion) => `<option value="${ion.id}" ${ion.id === cation.id ? 'selected' : ''}>${escapeHtml(ionLabel(ion))}</option>`).join('');
  const anionOptions = ANIONS.map((ion) => `<option value="${ion.id}" ${ion.id === anion.id ? 'selected' : ''}>${escapeHtml(ionLabel(ion))}</option>`).join('');
  const chips = (count, label, tone) => Array.from({ length: count }, () => `<span class="lab-chip" data-tone="${tone}">${escapeHtml(label)}</span>`).join('');
  return `
    <section class="lab-tool" data-tool="ionic" data-motion="still">
      <h2>Ionic formula builder</h2>
      <p id="lab-desc" class="lab-desc" aria-live="polite">${escapeHtml(describeIonic(state.cation, state.anion))}</p>
      <div class="lab-controls">
        <label>Cation
          <select data-action="cation" data-focus="cation">${cationOptions}</select>
        </label>
        <label>Anion
          <select data-action="anion" data-focus="anion">${anionOptions}</select>
        </label>
      </div>
      <div class="lab-formula" aria-hidden="true">
        <div class="lab-ion">${chips(result.cationCount, ionLabel(cation), 'pos')}<p>+${cation.charge * result.cationCount}</p></div>
        <span class="lab-plus">+</span>
        <div class="lab-ion">${chips(result.anionCount, ionLabel(anion), 'neg')}<p>−${anion.charge * result.anionCount}</p></div>
        <span class="lab-plus">=</span>
        <p class="lab-formula-out">${escapeHtml(prettyFormula(result.formula))}</p>
      </div>
      <p class="lab-readout">${escapeHtml(result.name)}</p>
    </section>
  `;
}
