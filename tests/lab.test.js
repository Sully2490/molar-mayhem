import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { ELEMENTS } from '../js/elements.js';
import {
  LAB_TOOLS,
  TREND_ARROWS,
  addBoxElectron,
  auditLewis,
  diagramMatches,
  emission,
  emptyDiagram,
  groundMap,
  ionicFormula,
  ionById,
  CATIONS,
  ANIONS,
  moleculeById,
  moveSelection,
  photonFromWavelength,
  referenceFor,
  rotateView,
  shapeSpec,
  standingPath,
  stateFromSolution,
  tablistMove,
  totalValence,
  vseprById,
  wavePath,
  waveRegion,
  wavelengthFromSpectrum,
} from '../js/lab/chem.js';
import { describeLewis, lewisAfterCheck, renderLewis } from '../js/lab/lewis-view.js';
import { initialLabState, motionFor, renderLab, toolFromHash } from '../js/lab/index.js';
import { prefersReducedMotion, readLabPrefs, writeLabPrefs } from '../js/lab/motion.js';
import { renderRoute, routeFromHash } from '../js/routes.js';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('the lab route is reachable and the other routes stay put', () => {
  assert.equal(routeFromHash('#Lab'), 'Lab');
  assert.equal(routeFromHash('#Lab/vsepr'), 'Lab');
  assert.equal(routeFromHash('#lab/wave'), 'Lab');
  assert.equal(routeFromHash('#learn'), 'Learn');
  assert.equal(routeFromHash('#Nope'), 'Home');
  const html = renderRoute('Lab');
  assert.match(html, /data-route="Lab"/);
  assert.match(html, /<mm-lab>/);
  assert.match(html, /<h1>Lab<\/h1>/);
  assert.doesNotMatch(html, /Coming soon/);
  const home = renderRoute('Home');
  assert.match(home, /href="#Lab"/);
  assert.match(read('index.html'), /href="#Lab"/);
  assert.match(read('index.html'), /css\/lab\/lab\.css/);
});

test('every tool renders a still description, keyboard controls, and a touch target', () => {
  const css = read('css/lab/lab.css');
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  for (const tool of LAB_TOOLS) {
    const state = initialLabState(tool.id);
    const html = renderLab(state, true);
    assert.equal(motionFor(state, true), 'still');
    assert.match(html, new RegExp(`data-tool="${tool.id}"`));
    assert.match(html, /data-motion="still"/);
    assert.match(html, /id="lab-desc"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /<button/);
    assert.doesNotMatch(html, /<animate/);
    const text = html.match(/id="lab-desc"[^>]*>([^<]+)/)[1];
    assert.ok(text.length > 40, tool.id);
  }
  const running = initialLabState('wave');
  assert.equal(motionFor(running, false), 'run');
});

test('lab copy is original and stays on this device', () => {
  const files = readdirSync(new URL('../js/lab/', import.meta.url));
  const source = files.map((file) => read(`js/lab/${file}`)).join('\n') + read('css/lab/lab.css');
  assert.doesNotMatch(source, /Study Guide|1045|Spectra Bench|Aktiv/i);
  assert.match(source, /mm-lab/);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|cookie|indexedDB/i);
  const memory = new Map();
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  };
  writeLabPrefs(storage, { tool: 'orbitals' });
  assert.deepEqual([...memory.keys()], ['mm-lab']);
  assert.equal(readLabPrefs(storage).tool, 'orbitals');
  assert.equal(toolFromHash('#Lab', { tool: 'orbitals' }), 'orbitals');
  assert.equal(toolFromHash('#Lab/ionic', { tool: 'orbitals' }), 'ionic');
  assert.equal(prefersReducedMotion(null), true);
  assert.equal(prefersReducedMotion(() => ({ matches: false })), false);
});

test('Lewis formal charges and the reference structures agree', () => {
  assert.equal(totalValence(moleculeById('H2O')), 8);
  assert.equal(totalValence(moleculeById('SO4')), 32);
  assert.equal(totalValence(moleculeById('NO3')), 24);
  for (const id of ['H2O', 'CO2', 'BF3', 'SO4', 'NO3', 'XeF4', 'C2H4']) {
    const molecule = moleculeById(id);
    const reference = referenceFor(molecule);
    assert.ok(reference, id);
    assert.equal(auditLewis(stateFromSolution(molecule, reference), molecule).stage, 'ok', id);
  }
  assert.equal(referenceFor(moleculeById('SO4')).magnitude, 2);
  assert.equal(referenceFor(moleculeById('SO4')).count, 6);
  assert.equal(referenceFor(moleculeById('NO3')).count, 3);
  const water = moleculeById('H2O');
  const solved = stateFromSolution(water);
  const oxygen = solved.atoms.find((atom) => atom.el === 'O');
  assert.equal(oxygen.lp, 2);
  const checked = lewisAfterCheck(solved, water);
  assert.match(checked.message, /bent/);
  assert.match(describeLewis(checked, water), /Formal charges/);
  assert.match(describeLewis(checked, water), /oxygen 0|O 0/);
  const markup = renderLewis(solved, 'H2O');
  assert.match(markup, /type="range"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /data-motion="still"/);
  assert.match(markup, /Element picker/);
  const bare = stateFromSolution(water);
  bare.atoms.find((atom) => atom.el === 'O').lp = 0;
  assert.equal(auditLewis(bare, water).stage, 'octet');
});

test('the wave, standing wave, and hydrogen photon numbers', () => {
  const green = photonFromWavelength(550);
  assert.equal(green.region, 'visible');
  assert.ok(green.frequency > 5.4e14 && green.frequency < 5.5e14);
  assert.equal(waveRegion(200), 'ultraviolet');
  assert.equal(waveRegion(900), 'infrared');
  assert.match(wavePath(550, 0), /^M0,/);
  assert.equal(wavelengthFromSpectrum(0, 600), 100);
  assert.equal(wavelengthFromSpectrum(600, 600), 1000);
  const string = standingPath(3);
  assert.equal(string.nodeCount, 4);
  assert.equal(string.nodes.length, 4);
  const balmer = emission(3, 2);
  assert.ok(Math.abs(balmer.lambdaNm - 656.3) < 1);
  assert.equal(balmer.series, 'Balmer');
  const lyman = emission(2, 1);
  assert.ok(Math.abs(lyman.lambdaNm - 121.6) < 1);
  assert.equal(lyman.region, 'ultraviolet');
  const levels = renderLab(initialLabState('levels'), true);
  assert.match(levels, /data-n="1"/);
  assert.match(levels, /data-n="6"/);
  assert.match(levels, /data-motion="still"/);
});

test('orbital boxes enforce Pauli and Hund, including Cr and Cu', () => {
  assert.deepEqual(groundMap(24), { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '4s': 1, '3d': 5 });
  assert.equal(groundMap(29)['4s'], 1);
  assert.equal(groundMap(29)['3d'], 10);
  let boxes = emptyDiagram(7);
  for (const [subshell, index] of [['1s', 0], ['1s', 0], ['2s', 0], ['2s', 0], ['2p', 0], ['2p', 1], ['2p', 2]]) {
    const step = addBoxElectron(boxes, subshell, index);
    assert.equal(step.error, null);
    boxes = step.boxes;
  }
  assert.equal(diagramMatches(boxes, 7), true);
  assert.equal(addBoxElectron({ '2p': [1, 0, 0] }, '2p', 0).error, 'hund');
  assert.equal(addBoxElectron({ '1s': [2] }, '1s', 0).error, 'pauli');
  const html = renderLab(initialLabState('boxes'), true);
  assert.match(html, /Enter or a tap adds/);
  assert.match(html, /Backspace/);
  assert.match(html, /Chromium|Copper|nitrogen/i);
});

test('the VSEPR model counts domains and rotates from the keyboard', () => {
  const water = shapeSpec(vseprById('H2O'));
  assert.equal(water.atoms.length, 2);
  assert.equal(water.lonePairs.length, 2);
  assert.equal(water.domains, 4);
  const methane = shapeSpec(vseprById('CH4'));
  assert.equal(methane.atoms.length, 4);
  assert.equal(methane.lonePairs.length, 0);
  const view = rotateView({ yaw: 0.6, pitch: 0.35 }, 'ArrowRight');
  assert.ok(view.yaw > 0.6);
  assert.deepEqual(rotateView(view, 'Home'), { yaw: 0.6, pitch: 0.35 });
  assert.equal(rotateView(view, 'Enter'), null);
  const html = renderLab(initialLabState('vsepr'), true);
  assert.match(html, /data-rotate/);
  assert.match(html, /aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home"/);
  assert.match(html, /Still frame/);
  assert.match(html, /bent/);
});

test('ionic formulas balance charges and use parentheses only when needed', () => {
  const nitrate = ionicFormula(ionById(CATIONS, 'Ca'), ionById(ANIONS, 'NO3'));
  assert.equal(nitrate.formula, 'Ca(NO3)2');
  assert.equal(nitrate.parentheses, true);
  const oxide = ionicFormula(ionById(CATIONS, 'Al'), ionById(ANIONS, 'O'));
  assert.equal(oxide.formula, 'Al2O3');
  assert.equal(oxide.parentheses, false);
  assert.equal(ionicFormula(ionById(CATIONS, 'NH4'), ionById(ANIONS, 'Cl')).formula, 'NH4Cl');
  assert.equal(ionicFormula(ionById(CATIONS, 'Hg2'), ionById(ANIONS, 'Cl')).formula, 'Hg2Cl2');
  const html = renderLab(initialLabState('ionic'), true);
  assert.match(html, /Ca\(NO3\)2|Ca\(NO₃\)₂|NO₃/);
  assert.match(html, /data-action="cation"/);
  assert.match(html, /data-action="anion"/);
  assert.match(html, /data-motion="still"/);
});

test('the periodic heat map keeps trend arrows and keyboard moves', () => {
  assert.deepEqual(TREND_ARROWS.radius.map((arrow) => arrow.direction), ['left', 'down']);
  assert.deepEqual(TREND_ARROWS.ie.map((arrow) => arrow.direction), ['right', 'up']);
  assert.deepEqual(TREND_ARROWS.en.map((arrow) => arrow.direction), ['right', 'up']);
  assert.equal(moveSelection(3, 'ArrowRight'), 4);
  assert.equal(moveSelection(3, 'ArrowDown'), 11);
  assert.equal(moveSelection(9, 'ArrowRight'), 10);
  assert.equal(moveSelection(2, 'ArrowLeft'), 1);
  const html = renderLab(initialLabState('tray'), true);
  assert.match(html, /data-trend="radius"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-trend="radius"/);
  assert.match(html, /Atomic radius increases to the left/);
  assert.match(html, /class="lab-arrows"/);
  assert.match(html, /data-z="11"/);
  assert.match(html, /data-z="118"/);
  assert.equal(ELEMENTS.length, 118);
  const hidden = renderLab({ ...initialLabState('tray'), tray: { trend: 'en', z: 9, arrows: false } }, true);
  assert.match(hidden, /trend arrows are hidden/i);
  assert.match(hidden, /Electronegativity/);
  assert.doesNotMatch(hidden, /class="lab-arrows"/);
  assert.equal(tablistMove(['lewis', 'wave'], 'lewis', 'ArrowRight'), 'wave');
  assert.equal(tablistMove(['lewis', 'wave'], 'lewis', 'End'), 'wave');
});
