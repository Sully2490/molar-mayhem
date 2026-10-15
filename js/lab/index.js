import {
  LAB_TOOLS,
  ORBITAL_TYPES,
  VSEPR_SHAPES,
  applyLewis,
  atomById,
  blankLewis,
  degreeOf,
  dragView,
  emission,
  maxLoneElectrons,
  moleculeById,
  moveSelection,
  photonFromWavelength,
  rotateView,
  standingPath,
  tablistMove,
  vseprById,
  waveColor,
  waveNodes,
  wavePath,
  wavelengthFromSpectrum,
} from './chem.js';
import { boxesAfterAdd, boxesAfterCheck, boxesAfterRemove, freshBoxes, moveBoxFocus, renderBoxes } from './boxes-view.js';
import { categoryFor, helpAfterCheck, practiceKey, practiceProblems, renderLabHelp } from './help.js';
import { describeIonic, renderIonic } from './ionic-view.js';
import { describeLewis, lewisAfterCheck, lewisAfterHint, lewisSvg, renderLewis } from './lewis-view.js';
import { prefersReducedMotion, readLabPrefs, shouldAnimate, writeLabPrefs } from './motion.js';
import {
  describeStanding,
  describeWave,
  renderLevels,
  renderOrbitals,
  renderStanding,
  renderWave,
} from './picture-view.js';
import { renderTray } from './tray-view.js';
import { describeVsepr, renderVsepr, vseprInner } from './vsepr-view.js';

export function initialLabState(tool = 'lewis') {
  return {
    tool,
    lewisMolecule: 'H2O',
    lewis: blankLewis(),
    wave: { lambda: 550, nodes: true, phase: 0, paused: false },
    standing: { n: 3, phase: 0, paused: false },
    levels: { upper: null, lines: [], last: null, focus: 3 },
    orbitals: { type: 'px' },
    boxes: freshBoxes(7),
    vsepr: { id: 'H2O', view: { yaw: 0.6, pitch: 0.35 }, paused: false },
    ionic: { cation: 'Ca', anion: 'NO3' },
    tray: { trend: 'radius', z: 11, arrows: true },
    help: { open: false, tries: {}, notes: {}, drafts: {} },
  };
}

export function toolFromHash(hash, prefs = {}) {
  const raw = String(hash ?? '').replace(/^#/, '');
  const sub = raw.split(/[/?]/)[1] ?? '';
  if (LAB_TOOLS.some((tool) => tool.id === sub)) return sub;
  if (LAB_TOOLS.some((tool) => tool.id === prefs.tool)) return prefs.tool;
  return 'lewis';
}

export function motionFor(state, reduced) {
  if (reduced) return 'still';
  if (state.tool === 'wave' && !state.wave.paused) return 'run';
  if (state.tool === 'standing' && !state.standing.paused) return 'run';
  if (state.tool === 'vsepr' && !state.vsepr.paused) return 'run';
  return 'still';
}

function renderTool(state, motion, reduced) {
  const locked = { locked: reduced };
  if (state.tool === 'lewis') return renderLewis(state.lewis, state.lewisMolecule);
  if (state.tool === 'wave') return renderWave({ ...state.wave, ...locked }, motion);
  if (state.tool === 'standing') return renderStanding({ ...state.standing, ...locked }, motion);
  if (state.tool === 'levels') return renderLevels(state.levels);
  if (state.tool === 'orbitals') return renderOrbitals(state.orbitals);
  if (state.tool === 'boxes') return renderBoxes(state.boxes);
  if (state.tool === 'vsepr') return renderVsepr({ ...state.vsepr, ...locked }, motion);
  if (state.tool === 'ionic') return renderIonic(state.ionic);
  return renderTray(state.tray);
}

export function renderLab(state, reduced = true) {
  const motion = motionFor(state, reduced);
  const tabs = LAB_TOOLS.map((tool) => {
    const on = tool.id === state.tool;
    return `<button type="button" class="lab-tab" role="tab" id="lab-tab-${tool.id}" data-action="tool" data-tool="${tool.id}" data-focus="tab-${tool.id}" aria-selected="${on ? 'true' : 'false'}" aria-controls="lab-panel" tabindex="${on ? '0' : '-1'}">${tool.label}</button>`;
  }).join('');
  return `
    <div class="lab">
      <h1>Lab</h1>
      <p>Each tool draws a picture and writes a sentence that says what you are looking at. The page is static. The only thing saved on this device is which tool you opened.</p>
      <p class="lab-cite">Light and orbitals: OpenStax Chemistry: Atoms First 2e §3.1–§3.4. Bonding pictures: §4.2–§4.6.</p>
      <div class="lab-tabs" role="tablist" aria-label="Lab tools">${tabs}</div>
      <div id="lab-panel" role="tabpanel" tabindex="0" aria-labelledby="lab-tab-${state.tool}">
        ${renderTool(state, motion, reduced)}
        ${renderLabHelp(state.tool, state.help)}
      </div>
    </div>
  `;
}

export function labShell() {
  return `<mm-lab><h1>Lab</h1><p>Turn on JavaScript to use the pictures. They run in the browser and do not ask you to sign in.</p></mm-lab>`;
}

function ensureCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-mm-lab]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/lab/lab.css';
  link.setAttribute('data-mm-lab', '');
  document.head.appendChild(link);
}

export function installLab() {
  if (typeof HTMLElement === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get('mm-lab')) return;

  class LabBench extends HTMLElement {
    connectedCallback() {
      if (!this.bound) {
        this.onClick = this.onClick.bind(this);
        this.onInput = this.onInput.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onKey = this.onKey.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onToggle = this.onToggle.bind(this);
        this.addEventListener('click', this.onClick);
        this.addEventListener('toggle', this.onToggle, true);
        this.addEventListener('input', this.onInput);
        this.addEventListener('change', this.onChange);
        this.addEventListener('keydown', this.onKey);
        this.addEventListener('pointerdown', this.onPointerDown);
        this.addEventListener('pointermove', this.onPointerMove);
        this.addEventListener('pointerup', this.onPointerUp);
        this.addEventListener('pointercancel', this.onPointerUp);
        this.bound = true;
      }
      ensureCss();
      this.storage = window.localStorage;
      this.reduced = prefersReducedMotion(typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null);
      this.history = [];
      this.drag = null;
      const tool = toolFromHash(location.hash, readLabPrefs(this.storage));
      this.state = initialLabState(tool);
      this.paint();
    }

    disconnectedCallback() {
      if (this.raf) cancelAnimationFrame(this.raf);
    }

    motionName() {
      return motionFor(this.state, !shouldAnimate(this.reduced));
    }

    paint(focusId) {
      const active = focusId || document.activeElement?.getAttribute?.('data-focus');
      this.innerHTML = renderLab(this.state, this.reduced);
      if (active) this.querySelector(`[data-focus="${CSS.escape(active)}"]`)?.focus();
      this.kick();
    }

    kick() {
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.motionName() !== 'run') return;
      const step = () => {
        if (!this.isConnected || this.motionName() !== 'run') return;
        if (this.state.tool === 'wave') {
          this.state.wave.phase += 0.08;
          this.patchWave();
        } else if (this.state.tool === 'standing') {
          this.state.standing.phase += 0.08;
          this.patchStanding();
        } else if (this.state.tool === 'vsepr' && !this.drag) {
          this.state.vsepr.view = { ...this.state.vsepr.view, yaw: this.state.vsepr.view.yaw + 0.012 };
          this.patchVsepr();
        }
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }

    patchWave() {
      const phase = this.motionName() === 'still' ? 0 : this.state.wave.phase;
      this.querySelector('[data-path]')?.setAttribute('d', wavePath(this.state.wave.lambda, phase));
      const nodes = this.querySelector('[data-nodes]');
      if (nodes) {
        nodes.innerHTML = this.state.wave.nodes
          ? waveNodes(this.state.wave.lambda, phase).map((x) => `<circle cx="${x.toFixed(1)}" cy="80" r="4" fill="#1c2430"/>`).join('')
          : '';
      }
    }

    patchStanding() {
      const phase = this.motionName() === 'still' ? 0 : this.state.standing.phase;
      const string = standingPath(this.state.standing.n, 55 * Math.cos(phase));
      this.querySelector('[data-string]')?.setAttribute('d', string.upper);
      const nodes = this.querySelector('[data-stand-nodes]');
      if (nodes) nodes.innerHTML = string.nodes.map((x) => `<circle cx="${x}" cy="80" r="5" fill="#9a3412"/>`).join('');
      const count = this.querySelector('[data-standing] text');
      if (count) count.textContent = `${this.state.standing.n + 1} nodes`;
      const loop = this.querySelector('[data-loop-path]');
      if (!loop) return;
      let d = '';
      const n = this.state.standing.n;
      for (let angle = 0; angle <= 360; angle += 3) {
        const radius = 60 + 14 * Math.sin((n * angle * Math.PI) / 180) * Math.cos(phase);
        const radians = (angle * Math.PI) / 180;
        d += `${angle ? 'L' : 'M'}${(100 + radius * Math.cos(radians)).toFixed(1)},${(100 + radius * Math.sin(radians)).toFixed(1)}`;
      }
      loop.setAttribute('d', `${d}Z`);
    }

    syncPlay(which) {
      const play = this.querySelector(`[data-play="${which}"]`);
      if (!play || play.disabled) return;
      const running = this.motionName() === 'run';
      const label = which === 'vsepr' ? (running ? 'Hold still' : 'Spin') : (running ? 'Pause' : 'Play');
      play.textContent = label;
      play.setAttribute('aria-pressed', running ? 'true' : 'false');
    }

    patchVsepr() {
      const svg = this.querySelector('[data-rotate]');
      if (!svg) return;
      const shape = vseprById(this.state.vsepr.id);
      const motion = this.motionName();
      svg.innerHTML = vseprInner(shape, this.state.vsepr.view, motion);
      svg.setAttribute('aria-label', `3D ${shape.mg} model. ${motion === 'still' ? 'Still frame.' : 'Spinning.'} Arrow keys rotate. Home resets.`);
    }

    syncLewis() {
      const molecule = moleculeById(this.state.lewisMolecule);
      const desc = this.querySelector('#lab-desc');
      if (desc) desc.textContent = describeLewis(this.state.lewis, molecule);
      const message = this.querySelector('.lab-msg');
      if (message) {
        message.textContent = this.state.lewis.message || 'Select an atom (it outlines in rust), set how many atoms bond to it, then give each atom an element.';
        message.setAttribute('data-tone', this.state.lewis.messageTone || '');
      }
      const figure = this.querySelector('.lab-lewis');
      if (figure) figure.outerHTML = lewisSvg(this.state.lewis, this.state.lewisMolecule);
      const atom = this.state.lewis.selected?.kind === 'atom' ? atomById(this.state.lewis, this.state.lewis.selected.id) : null;
      const lone = this.querySelector('[data-focus="lone"]');
      const degree = this.querySelector('[data-focus="degree"]');
      if (lone && document.activeElement !== lone) {
        lone.max = String(atom ? maxLoneElectrons(this.state.lewis, atom) : 0);
        lone.value = String(atom ? atom.lp * 2 : 0);
        lone.disabled = !atom;
      }
      if (degree && document.activeElement !== degree) {
        degree.value = String(atom ? degreeOf(this.state.lewis, atom.id) : 1);
        degree.disabled = !atom;
      }
      const order = this.querySelector('[data-focus="order"]');
      const selectedBond = this.state.lewis.selected?.kind === 'bond';
      if (order && document.activeElement !== order) {
        order.value = String(selectedBond ? (this.state.lewis.orders[this.state.lewis.selected.id] ?? 1) : 1);
        order.disabled = !selectedBond;
      }
      const read = (name, input) => {
        const node = this.querySelector(`[data-readout="${name}"]`);
        if (node && input) node.textContent = input.value;
      };
      read('degree', degree);
      read('lone', lone);
      read('order', order);
    }

    rememberLewis() {
      this.history.push(JSON.stringify(this.state.lewis));
      if (this.history.length > 40) this.history.shift();
    }

    openTool(tool, focusId) {
      this.state.tool = tool;
      writeLabPrefs(this.storage, { tool });
      const url = new URL(location.href);
      url.hash = `Lab/${tool}`;
      history.replaceState(null, '', url);
      this.paint(focusId);
    }

    setLambda(value) {
      const lambda = Math.max(100, Math.min(1000, Math.round(value)));
      this.state.wave.lambda = lambda;
      const desc = this.querySelector('#lab-desc');
      if (desc) desc.textContent = describeWave(this.state.wave, this.motionName());
      const input = this.querySelector('[data-focus="lambda"]');
      if (input && document.activeElement !== input) input.value = String(lambda);
      if (input) input.setAttribute('aria-valuenow', String(lambda));
      const label = this.querySelector('label[for="wave-lambda"] b');
      if (label) label.textContent = String(lambda);
      const readout = this.querySelector('.lab-readout');
      if (readout) {
        const photon = photonFromWavelength(lambda);
        readout.textContent = `ν = ${photon.frequency.toExponential(2)} Hz · E = ${photon.energy.toExponential(2)} J · ${photon.region}`;
      }
      const marker = this.querySelector('.lab-spectrum polygon');
      if (marker) {
        const x = ((lambda - 100) / 900) * 600;
        marker.setAttribute('points', `${x - 7},36 ${x + 7},36 ${x},24`);
      }
      this.querySelector('[data-spectrum]')?.setAttribute('aria-valuenow', String(lambda));
      this.querySelector('[data-path]')?.setAttribute('stroke', waveColor(lambda));
      this.patchWave();
    }

    onClick(event) {
      const target = event.target.closest('[data-action]');
      if (!target || !this.contains(target)) return;
      const action = target.getAttribute('data-action');
      if (action === 'tool') {
        const tool = target.getAttribute('data-tool');
        if (LAB_TOOLS.some((item) => item.id === tool) && tool !== this.state.tool) this.openTool(tool, `tab-${tool}`);
        return;
      }
      if (action === 'toggle') {
        this.state.lewis = applyLewis(this.state.lewis, { type: 'toggle', flag: target.getAttribute('data-flag') });
        this.paint(target.getAttribute('data-focus'));
        return;
      }
      if (action === 'element') {
        if (this.state.lewis.selected?.kind !== 'atom') return;
        this.rememberLewis();
        this.state.lewis = applyLewis(this.state.lewis, {
          type: 'element',
          id: this.state.lewis.selected.id,
          el: target.getAttribute('data-el'),
        });
        this.paint(`el-${target.getAttribute('data-el')}`);
        return;
      }
      if (action === 'select') {
        this.state.lewis = applyLewis(this.state.lewis, {
          type: 'select',
          target: { kind: target.getAttribute('data-kind'), id: Number(target.getAttribute('data-id')) },
        });
        this.paint(target.getAttribute('data-focus'));
        return;
      }
      if (action === 'check') {
        this.state.lewis = lewisAfterCheck(this.state.lewis, moleculeById(this.state.lewisMolecule));
        this.paint('check');
        return;
      }
      if (action === 'hint') {
        this.state.lewis = lewisAfterHint(this.state.lewis, moleculeById(this.state.lewisMolecule));
        this.paint('hint');
        return;
      }
      if (action === 'undo') {
        const previous = this.history.pop();
        if (previous) this.state.lewis = JSON.parse(previous);
        this.paint('undo');
        return;
      }
      if (action === 'reset') {
        this.rememberLewis();
        this.state.lewis = blankLewis();
        this.paint('reset');
        return;
      }
      if (action === 'play') {
        if (this.reduced) return;
        const which = target.getAttribute('data-play');
        this.state[which].paused = !this.state[which].paused;
        this.paint('play');
        return;
      }
      if (action === 'level') {
        const n = Number(target.getAttribute('data-n'));
        const levels = this.state.levels;
        if (levels.upper == null || n >= levels.upper) this.state.levels = { ...levels, upper: n, focus: n, last: null };
        else {
          const line = emission(levels.upper, n);
          this.state.levels = { upper: null, focus: n, lines: [...levels.lines, line], last: line };
        }
        this.paint(`level-${n}`);
        return;
      }
      if (action === 'clear-lines') {
        this.state.levels = { ...this.state.levels, upper: null, lines: [], last: null };
        this.paint('clear-lines');
        return;
      }
      if (action === 'orbital') {
        this.state.orbitals = { type: target.getAttribute('data-orbital') };
        this.paint(`orb-${this.state.orbitals.type}`);
        return;
      }
      if (action === 'box') {
        const subshell = target.getAttribute('data-sub');
        const index = Number(target.getAttribute('data-index'));
        this.state.boxes = boxesAfterAdd(this.state.boxes, subshell, index);
        this.paint(`box-${subshell}-${index}`);
        return;
      }
      if (action === 'check-boxes') {
        this.state.boxes = boxesAfterCheck(this.state.boxes);
        this.paint('check-boxes');
        return;
      }
      if (action === 'reset-boxes') {
        this.state.boxes = freshBoxes(this.state.boxes.z);
        this.paint('reset-boxes');
        return;
      }
      if (action === 'shape') {
        this.state.vsepr = { ...this.state.vsepr, id: target.getAttribute('data-shape'), view: { yaw: 0.6, pitch: 0.35 } };
        this.paint(`shape-${this.state.vsepr.id}`);
        return;
      }
      if (action === 'reset-view') {
        this.state.vsepr = { ...this.state.vsepr, view: { yaw: 0.6, pitch: 0.35 }, paused: true };
        this.paint('reset-view');
        return;
      }
      if (action === 'trend') {
        this.state.tray = { ...this.state.tray, trend: target.getAttribute('data-trend') };
        this.paint(`trend-${this.state.tray.trend}`);
        return;
      }
      if (action === 'arrows') {
        this.state.tray = { ...this.state.tray, arrows: !this.state.tray.arrows };
        this.paint('arrows');
        return;
      }
      if (action === 'element-pick') {
        this.state.tray = { ...this.state.tray, z: Number(target.getAttribute('data-z')) };
        this.paint(`z-${this.state.tray.z}`);
        return;
      }
      if (action === 'help-check') {
        this.checkHelp(target.getAttribute('data-practice'));
      }
    }

    checkHelp(index) {
      const category = categoryFor(this.state.tool);
      if (!category) return;
      const problem = practiceProblems(category)[Number(index)];
      if (!problem) return;
      const key = practiceKey(this.state.tool, index);
      const typed = this.state.help?.drafts?.[key];
      const input = typed != null ? typed : (this.querySelector(`[data-help-input="${index}"]`)?.value ?? '');
      this.state.help = helpAfterCheck(this.state.help ?? {}, this.state.tool, index, input, problem);
      this.paint(`help-${index}`);
    }

    onToggle(event) {
      const details = event.target;
      if (!details?.classList?.contains('lab-help')) return;
      this.state.help = { ...(this.state.help ?? {}), open: Boolean(details.open) };
    }

    onInput(event) {
      if (event.target?.hasAttribute?.('data-help-input')) {
        const index = event.target.getAttribute('data-help-input');
        const key = practiceKey(this.state.tool, index);
        this.state.help = {
          ...(this.state.help ?? {}),
          drafts: { ...(this.state.help?.drafts ?? {}), [key]: event.target.value },
        };
        return;
      }
      const action = event.target.getAttribute?.('data-action');
      if (action === 'lambda') this.setLambda(Number(event.target.value));
      if (action === 'half') {
        this.state.standing.n = Number(event.target.value);
        const desc = this.querySelector('#lab-desc');
        if (desc) desc.textContent = describeStanding(this.state.standing, this.motionName());
        const label = this.querySelector('label[for="stand-n"] b');
        if (label) label.textContent = String(this.state.standing.n);
        this.patchStanding();
      }
      if ((action === 'degree' || action === 'lone' || action === 'order') && this.state.lewis.selected) {
        this.rememberLewis();
        if (action === 'degree') {
          this.state.lewis = applyLewis(this.state.lewis, {
            type: 'degree',
            id: this.state.lewis.selected.id,
            degree: Number(event.target.value),
          });
        } else if (action === 'lone') {
          this.state.lewis = applyLewis(this.state.lewis, {
            type: 'lonePairs',
            id: this.state.lewis.selected.id,
            pairs: Number(event.target.value) / 2,
          });
        } else if (this.state.lewis.selected.kind === 'bond') {
          this.state.lewis = applyLewis(this.state.lewis, {
            type: 'bondOrder',
            id: this.state.lewis.selected.id,
            order: Number(event.target.value),
          });
        }
        this.syncLewis();
      }
    }

    onChange(event) {
      const action = event.target.getAttribute?.('data-action');
      if (action === 'molecule') {
        this.history = [];
        this.state.lewisMolecule = event.target.value;
        this.state.lewis = blankLewis();
        this.paint('molecule');
      }
      if (action === 'nodes') {
        this.state.wave.nodes = event.target.checked;
        this.paint('nodes');
      }
      if (action === 'element-z') {
        this.state.boxes = freshBoxes(Number(event.target.value));
        this.paint('element-z');
      }
      if (action === 'cation' || action === 'anion') {
        this.state.ionic = { ...this.state.ionic, [action]: event.target.value };
        const desc = this.querySelector('#lab-desc');
        if (desc) desc.textContent = describeIonic(this.state.ionic.cation, this.state.ionic.anion);
        this.paint(action);
      }
    }

    onKey(event) {
      if (event.target?.hasAttribute?.('data-help-input') && event.key === 'Enter') {
        event.preventDefault();
        this.checkHelp(event.target.getAttribute('data-help-input'));
        return;
      }
      const tag = event.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if ((event.key === 'Enter' || event.key === ' ') && event.target.tagName === 'g') {
        const actionable = event.target.closest('[data-action]');
        if (actionable) {
          event.preventDefault();
          actionable.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return;
        }
      }
      if (event.target.closest('[data-spectrum]') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        this.setLambda(this.state.wave.lambda + (event.key === 'ArrowLeft' ? -10 : 10));
        return;
      }
      if (event.target.closest('[data-rotate]')) {
        const next = rotateView(this.state.vsepr.view, event.key);
        if (next) {
          event.preventDefault();
          this.state.vsepr.paused = true;
          this.state.vsepr.view = next;
          this.patchVsepr();
          this.syncPlay('vsepr');
          const desc = this.querySelector('#lab-desc');
          if (desc) desc.textContent = describeVsepr(vseprById(this.state.vsepr.id), 'still');
        }
        return;
      }
      const tab = event.target.closest('[role="tab"]');
      if (tab?.closest('.lab')?.parentElement && tab.closest('[role="tablist"]') === this.querySelector('.lab > .lab-tabs')) {
        const next = tablistMove(LAB_TOOLS.map((tool) => tool.id), this.state.tool, event.key);
        if (next) {
          event.preventDefault();
          this.openTool(next, `tab-${next}`);
        }
        return;
      }
      if (tab?.closest('[data-orbit-list]')) {
        const next = tablistMove(ORBITAL_TYPES, this.state.orbitals.type, event.key);
        if (next) {
          event.preventDefault();
          this.state.orbitals = { type: next };
          this.paint(`orb-${next}`);
        }
        return;
      }
      if (tab?.closest('[data-shape-list]')) {
        const next = tablistMove(VSEPR_SHAPES.map((shape) => shape.id), this.state.vsepr.id, event.key);
        if (next) {
          event.preventDefault();
          this.state.vsepr = { ...this.state.vsepr, id: next, view: { yaw: 0.6, pitch: 0.35 } };
          this.paint(`shape-${next}`);
        }
        return;
      }
      if (event.target.closest('[data-n]') && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        const next = tablistMove(['1', '2', '3', '4', '5', '6'], String(this.state.levels.focus), event.key);
        if (next) {
          event.preventDefault();
          this.state.levels = { ...this.state.levels, focus: Number(next) };
          this.paint(`level-${next}`);
        }
        return;
      }
      const box = event.target.closest('[data-action="box"]');
      if (box && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        this.state.boxes = boxesAfterRemove(this.state.boxes, box.getAttribute('data-sub'), Number(box.getAttribute('data-index')));
        this.paint(box.getAttribute('data-focus'));
        return;
      }
      if (box && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        const next = moveBoxFocus(this.state.boxes.boxes, this.state.boxes.focus ?? { subshell: '1s', index: 0 }, event.key);
        if (next) {
          event.preventDefault();
          this.state.boxes = { ...this.state.boxes, focus: next };
          this.paint(`box-${next.subshell}-${next.index}`);
        }
        return;
      }
      if (event.target.closest('[data-periodic], .lab-el') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const z = moveSelection(this.state.tray.z, event.key);
        this.state.tray = { ...this.state.tray, z };
        this.paint(`z-${z}`);
      }
    }

    onPointerDown(event) {
      const rotate = event.target.closest?.('[data-rotate]');
      if (rotate && this.contains(rotate)) {
        this.drag = { kind: 'rotate', x: event.clientX, y: event.clientY, pointer: event.pointerId };
        this.state.vsepr.paused = true;
        this.syncPlay('vsepr');
        rotate.setPointerCapture?.(event.pointerId);
        event.preventDefault();
        return;
      }
      const spectrum = event.target.closest?.('[data-spectrum]');
      if (spectrum && this.contains(spectrum)) {
        this.drag = { kind: 'spectrum', pointer: event.pointerId };
        spectrum.setPointerCapture?.(event.pointerId);
        this.readSpectrum(event, spectrum);
      }
    }

    onPointerMove(event) {
      if (!this.drag || event.pointerId !== this.drag.pointer) return;
      if (this.drag.kind === 'rotate') {
        const dx = event.clientX - this.drag.x;
        const dy = event.clientY - this.drag.y;
        this.drag.x = event.clientX;
        this.drag.y = event.clientY;
        this.state.vsepr.view = dragView(this.state.vsepr.view, dx, dy);
        this.patchVsepr();
        return;
      }
      const spectrum = this.querySelector('[data-spectrum]');
      if (this.drag.kind === 'spectrum' && spectrum) this.readSpectrum(event, spectrum);
    }

    onPointerUp() {
      this.drag = null;
    }

    readSpectrum(event, spectrum) {
      const rect = spectrum.getBoundingClientRect();
      this.setLambda(wavelengthFromSpectrum(event.clientX - rect.left, rect.width));
    }
  }

  customElements.define('mm-lab', LabBench);
}

installLab();
