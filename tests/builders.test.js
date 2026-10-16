import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { equationHtml, equationText } from '../js/builders/html.js';
import { grade } from '../js/grade.js';
import { missFeedback } from '../js/builders/feedback.js';
import { prefersReducedMotion } from '../js/builders/motion.js';
import {
  BUILDERS,
  builderFromHash,
  loaderFor,
  renderShell,
} from '../js/builders/index.js';
import {
  LEWIS_CHALLENGES,
  auditLewis,
  availableElectrons,
  createLewis,
  electronsAround,
  formalCharge,
  gradeLewis,
  octetStatus,
  stateFromChallenge,
  usedElectrons,
} from '../js/builders/lewis.js';
import { renderLewis } from '../js/builders/lewis-view.js';
import {
  VSEPR_SHAPES,
  createVsepr,
  frameLayout,
  gradeVsepr,
  hybridizationFor,
  initialView,
  project,
  rotateView,
  shapeSpec,
} from '../js/builders/vsepr.js';
import { renderVsepr } from '../js/builders/vsepr-view.js';
import {
  GAS_R,
  challengeById as gasChallenge,
  createGas,
  equationText as gasEquationText,
  expectedFor,
  gasParticles,
  gasSides,
  gradeGas,
  pistonY,
  solveIdeal,
} from '../js/builders/gas.js';
import { renderGas } from '../js/builders/gas-view.js';
import {
  gradeCalorimeter,
  heat,
  mixTemperature,
  thermometerFill,
  challengeById as cupChallenge,
  createCalorimeter,
} from '../js/builders/calorimeter.js';
import { renderCalorimeter } from '../js/builders/calorimeter-view.js';
import {
  gradeStoich,
  layoutParticles,
  particleGroups,
  reactionById,
  runReaction,
  createStoich,
} from '../js/builders/stoich.js';
import { renderStoich } from '../js/builders/stoich-view.js';
import {
  addElectron,
  configurationText,
  createOrbitals,
  emptyDiagram,
  gradeConfig,
  gradeDiagram,
  groundOccupancy,
  hundViolation,
  moveBoxFocus,
  parseConfig,
} from '../js/builders/orbitals.js';
import { renderOrbitals } from '../js/builders/orbitals-view.js';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('a miss gets a hint, then the worked solution on the third miss', () => {
  const hints = ['count domains', 'shape ignores lone pairs', 'water is bent and sp3'];
  const first = missFeedback(false, 'yes', hints, 0);
  assert.equal(first.reveal, false);
  assert.equal(first.message, 'count domains');
  const second = missFeedback(false, 'yes', hints, first.misses);
  assert.equal(second.reveal, false);
  assert.equal(second.message, 'shape ignores lone pairs');
  const third = missFeedback(false, 'yes', hints, second.misses);
  assert.equal(third.reveal, true);
  assert.match(third.message, /water is bent/);
  const solved = missFeedback(true, 'yes', hints, 2);
  assert.equal(solved.ok, true);
  assert.equal(solved.message, 'yes');
});

test('Lewis challenges match octets, formal charge, and the valence count', () => {
  assert.equal(octetStatus('H', 2), 'ok');
  assert.equal(octetStatus('H', 4), 'over');
  assert.equal(octetStatus('B', 6), 'ok');
  assert.equal(octetStatus('O', 6), 'short');
  assert.equal(octetStatus('S', 12), 'ok');
  assert.equal(octetStatus('S', 14), 'over');
  for (const challenge of LEWIS_CHALLENGES) {
    const state = stateFromChallenge(challenge);
    const audit = auditLewis(state);
    assert.equal(audit.ok, true, challenge.id);
    assert.equal(audit.used, audit.available, challenge.id);
    assert.equal(audit.formalSum, challenge.charge, challenge.id);
    const graded = gradeLewis(state, challenge);
    assert.equal(graded.ok, true, challenge.id);
  }
  const water = stateFromChallenge(LEWIS_CHALLENGES.find((item) => item.id === 'H2O'));
  const oxygen = water.atoms.find((atom) => atom.symbol === 'O');
  assert.equal(formalCharge(water, oxygen), 0);
  assert.equal(electronsAround(water, oxygen), 8);
  assert.equal(availableElectrons(water), 8);
  assert.equal(usedElectrons(water), 8);
  water.lone[oxygen.id] = 0;
  const missed = gradeLewis(water);
  assert.equal(missed.ok, false);
  assert.match(missed.hints[0], /8|lone|electron/i);
  assert.match(missed.hints[2], /two lone pairs/i);
  const markup = renderLewis(createLewis('H2O'), 'still');
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /data-motion="still"/);
  assert.match(markup, /<button/);
  assert.match(markup, /Arrow keys/);
  assert.doesNotMatch(markup, /<animate/);
});

test('VSEPR covers every domain count, angle, and hybridization', () => {
  const families = new Set(VSEPR_SHAPES.map((shape) => `${shape.bonded}-${shape.lone}`));
  for (const id of ['2-0', '3-0', '2-1', '4-0', '3-1', '2-2', '5-0', '4-1', '3-2', '2-3', '6-0', '5-1', '4-2']) {
    assert.equal(families.has(id), true, id);
  }
  for (const shape of VSEPR_SHAPES) {
    assert.equal(shape.hybrid, hybridizationFor(shape.domains), shape.id);
    const spec = shapeSpec(shape);
    assert.equal(spec.atoms.length, shape.bonded, shape.id);
    assert.equal(spec.lonePairs.length, shape.lone, shape.id);
  }
  const water = VSEPR_SHAPES.find((shape) => shape.id === 'H2O');
  const frame = frameLayout(water, initialView(), 360, 300);
  assert.equal(frame.atoms.length, 2);
  assert.equal(frame.lonePairs.length, 2);
  const right = project([1, 0, 0], { yaw: 0, pitch: 0 }, 360, 300);
  assert.ok(right.x > 180);
  assert.deepEqual(rotateView(initialView(), 'Home'), initialView());
  assert.ok(rotateView(initialView(), 'ArrowLeft').yaw < initialView().yaw);
  const challenge = {
    eg: 'tetrahedral', mg: 'bent', angle: '<109.5', hybrid: 'sp3',
  };
  const good = gradeVsepr(challenge, { ...challenge, title: 'water', solution: 'Four domains.' });
  assert.equal(good.ok, true);
  const bad = gradeVsepr({ eg: 'linear', mg: 'bent', angle: '<109.5', hybrid: 'sp3' }, {
    title: 'water', eg: 'tetrahedral', mg: 'bent', angle: '<109.5', hybrid: 'sp3', solution: 'Four domains make it tetrahedral.',
  });
  assert.equal(bad.ok, false);
  assert.match(bad.hints[0], /electron geometry/);
  assert.match(bad.hints[2], /tetrahedral/);
  const markup = renderVsepr({ ...createVsepr(), locked: true }, 'still');
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /<canvas/);
  assert.match(markup, /data-motion="still"/);
  assert.match(markup, /Arrow keys/);
  assert.match(markup, /disabled/);
  assert.doesNotMatch(markup, /three\.js|webgl/i);
});

test('the gas piston solves PV = nRT and stays still when asked', () => {
  const stp = solveIdeal({ P: 1, V: 1, T: 273.15, n: 1, unknown: 'V' });
  assert.ok(Math.abs(stp - 22.414) < 0.01);
  assert.equal(GAS_R, 0.08206);
  const challenge = gasChallenge('find-volume');
  const expected = expectedFor(challenge);
  assert.ok(Math.abs(expected - 6.1545) < 0.01);
  assert.equal(gradeGas(expected, challenge).ok, true);
  assert.equal(gradeGas(expected + 2, challenge).ok, false);
  assert.match(gradeGas('', challenge).hints[0], /V = n R T \/ P/);
  const balanced = { P: 1, V: stp, T: 273.15, n: 1 };
  assert.equal(gasSides(balanced).balanced, true);
  assert.match(gasEquationText(balanced), /P V/);
  assert.ok(pistonY(40) < pistonY(1));
  const still = gasParticles(4, { left: 10, right: 100, top: 10, bottom: 80 }, 0);
  const again = gasParticles(4, { left: 10, right: 100, top: 10, bottom: 80 }, 0);
  assert.deepEqual(still, again);
  assert.notDeepEqual(still, gasParticles(4, { left: 10, right: 100, top: 10, bottom: 80 }, 1));
  const markup = renderGas(createGas(), 'still');
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /data-motion="still"/);
  assert.match(markup, /type="range"/);
  assert.match(markup, /Still frame/);
  assert.match(markup, /volume slider/i);
  const start = createGas().values;
  const right = start.n * GAS_R * start.T;
  assert.ok(Math.abs(start.P * start.V - right) / right < 0.01);
  assert.equal(start.V === 22.4 && start.T !== 273, false);
});

test('coffee-cup calorimetry uses q = mcΔT', () => {
  const water = cupChallenge('equal-water').parts;
  assert.equal(mixTemperature(water), 60);
  const gained = heat(water[1], 60);
  const lost = heat(water[0], 60);
  assert.equal(gained, 40 * 4.184 * 30);
  assert.ok(Math.abs(gained + lost) < 1e-6);
  assert.equal(gradeCalorimeter(60, cupChallenge('equal-water')).ok, true);
  assert.equal(gradeCalorimeter(40, cupChallenge('equal-water')).ok, false);
  assert.match(gradeCalorimeter(40, cupChallenge('equal-water')).hints[0], /q = m c/);
  const metal = cupChallenge('metal').parts;
  const expected = (100 * 4.184 * 25 + 20 * 0.45 * 100) / (100 * 4.184 + 20 * 0.45);
  assert.ok(Math.abs(mixTemperature(metal) - expected) < 1e-9);
  assert.equal(thermometerFill(50), 0.5);
  assert.equal(thermometerFill(-10), 0);
  const markup = renderCalorimeter(createCalorimeter(), 'still');
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /data-motion="still"/);
  assert.match(markup, /q = m c/);
  assert.match(markup, /type="range"/);
  assert.match(markup, /Still/);
});

test('limiting reactant leaves the excess and makes the right product', () => {
  const water = reactionById('water');
  const once = runReaction(water, { H2: 4, O2: 1 });
  assert.deepEqual(once.limiters, ['O2']);
  assert.equal(once.products.H2O, 2);
  assert.equal(once.leftover.H2, 2);
  assert.equal(once.leftover.O2, 0);
  const both = runReaction(water, { H2: 4, O2: 2 });
  assert.deepEqual(both.limiters, ['H2', 'O2']);
  assert.equal(both.products.H2O, 4);
  const ammonia = reactionById('ammonia');
  const made = runReaction(ammonia, { N2: 2, H2: 3 });
  assert.deepEqual(made.limiters, ['H2']);
  assert.equal(made.products.NH3, 2);
  assert.equal(made.leftover.N2, 1);
  const answer = {
    limiter: 'O2',
    products: { H2O: 2 },
    leftover: { H2: 2, O2: 0 },
  };
  assert.equal(gradeStoich(answer, water, { H2: 4, O2: 1 }).ok, true);
  assert.equal(gradeStoich({ limiter: 'H2', products: { H2O: 2 }, leftover: { H2: 2, O2: 0 } }, water, { H2: 4, O2: 1 }).ok, false);
  assert.equal(gradeStoich({ limiter: 'O2', products: {}, leftover: {} }, water, { H2: 4, O2: 1 }).ok, false);
  const groups = particleGroups(water, { H2: 4, O2: 1 }, 'after');
  const dots = layoutParticles(groups, 320, 180);
  assert.ok(dots.length > 0);
  assert.ok(dots.every((dot) => dot.x > 8 && dot.x < 312));
  const markup = renderStoich(createStoich(), 'still');
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /data-motion="still"/);
  assert.match(markup, /Still/);
  assert.match(markup, /aria-label="Add one/);
  assert.equal(equationText('2 H2 + O2 → 2 H2O'), '2 H₂ + O₂ → 2 H₂O');
  const waterHtml = equationHtml('2 H2 + O2 → 2 H2O');
  for (const term of waterHtml.split(/ \+ | → /)) {
    assert.equal(subscriptFollowsLetter(term), true, term);
  }
  for (const id of ['water', 'ammonia', 'combustion']) {
    const view = renderStoich(createStoich(id), 'still');
    const equation = view.match(/<p class="b-equation">([\s\S]*?)<\/p>/)[1];
    assert.doesNotMatch(equation, /^<sub>/, id);
    for (const term of equation.split(/ \+ | → /)) {
      assert.equal(subscriptFollowsLetter(term), true, `${id}: ${term}`);
    }
  }
});

function subscriptFollowsLetter(term) {
  const letter = term.search(/[A-Za-z]/);
  const sub = term.indexOf('<sub>');
  return letter >= 0 && (sub === -1 || sub > letter);
}

test('equation coefficients stay full size after +, at the start, and after every arrow', () => {
  const arrows = [
    ['2 H2 + O2 → 2 H2O', '2 H₂ + O₂ → 2 H₂O', '2 H<sub>2</sub> + O<sub>2</sub> → 2 H<sub>2</sub>O'],
    ['2 H2 + O2 -> 2 H2O', '2 H₂ + O₂ → 2 H₂O', '2 H<sub>2</sub> + O<sub>2</sub> → 2 H<sub>2</sub>O'],
    ['N2 + 3 H2 ⇌ 2 NH3', 'N₂ + 3 H₂ ⇌ 2 NH₃', 'N<sub>2</sub> + 3 H<sub>2</sub> ⇌ 2 NH<sub>3</sub>'],
    ['N2 + 3 H2 = 2 NH3', 'N₂ + 3 H₂ ⇌ 2 NH₃', 'N<sub>2</sub> + 3 H<sub>2</sub> ⇌ 2 NH<sub>3</sub>'],
  ];
  for (const [raw, text, html] of arrows) {
    assert.equal(equationText(raw), text);
    assert.equal(equationHtml(raw), html);
    for (const term of html.split(/\s*(?:-&gt;|→|⇌|\+|=)\s*/)) {
      assert.equal(subscriptFollowsLetter(term), true, `${raw}: ${term}`);
    }
  }
});

test('equationText turns -> into an arrow', () => {
  assert.equal(equationText('2 H2 + O2 -> 2 H2O'), '2 H₂ + O₂ → 2 H₂O');
  assert.equal(equationText('A -> B'), 'A → B');
  assert.equal(equationHtml('2 H2 + O2 -> 2 H2O'), '2 H<sub>2</sub> + O<sub>2</sub> → 2 H<sub>2</sub>O');
  assert.equal(equationText('N2 + 3 H2 = 2 NH3'), 'N₂ + 3 H₂ ⇌ 2 NH₃');
});

test('a typed -> answer is still accepted', () => {
  const check = {
    kind: 'exact',
    text: '2 KClO3 -> 2 KCl + 3 O2',
    case: 'sensitive',
  };
  assert.equal(grade('2 KClO3 -> 2 KCl + 3 O2', check).ok, true);
  assert.equal(equationText(check.text).includes('->'), false);
});

test('a number after a hydrate dot stays full size', () => {
  assert.equal(equationText('CuSO4·5H2O'), 'CuSO₄·5H₂O');
  assert.equal(equationHtml('CuSO4·5H2O'), 'CuSO<sub>4</sub>·5H<sub>2</sub>O');
  assert.equal(equationText('CuSO4.5H2O'), 'CuSO₄.5H₂O');
  assert.equal(equationHtml('CuSO4.5H2O'), 'CuSO<sub>4</sub>.5H<sub>2</sub>O');
  assert.equal(equationText('CuSO4*5H2O'), 'CuSO₄*5H₂O');
  assert.equal(equationHtml('CuSO4*5H2O'), 'CuSO<sub>4</sub>*5H<sub>2</sub>O');
  assert.equal(equationText('2 CuSO4·5H2O'), '2 CuSO₄·5H₂O');
});

test('orbital filling enforces Aufbau, Hund, and the chromium exception', () => {
  assert.equal(groundOccupancy(6)['2p'], 2);
  assert.equal(groundOccupancy(8)['2p'], 4);
  assert.equal(groundOccupancy(24)['4s'], 1);
  assert.equal(groundOccupancy(24)['3d'], 5);
  assert.equal(groundOccupancy(29)['4s'], 1);
  assert.equal(groundOccupancy(29)['3d'], 10);
  assert.match(configurationText(8), /2p4/);
  const carbon = emptyDiagram(6);
  let boxes = carbon;
  for (const subshell of ['1s', '2s']) {
    boxes = addElectron(boxes, subshell, 0).boxes;
    boxes = addElectron(boxes, subshell, 0).boxes;
  }
  boxes = addElectron(boxes, '2p', 0).boxes;
  const paired = addElectron(boxes, '2p', 0);
  assert.equal(paired.error, 'hund');
  boxes = addElectron(boxes, '2p', 1).boxes;
  assert.equal(hundViolation(boxes), false);
  assert.equal(gradeDiagram(boxes, 6).ok, true);
  const hydrogen = addElectron(emptyDiagram(1), '1s', 0).boxes;
  assert.equal(addElectron(addElectron(hydrogen, '1s', 0).boxes, '1s', 0).error, 'pauli');
  assert.equal(gradeConfig('1s2 2s2 2p4', 8).ok, true);
  assert.equal(gradeConfig('1s² 2s² 2p⁴', 8).ok, true);
  assert.equal(gradeConfig('[He] 2s2 2p4', 8).ok, true);
  assert.equal(gradeConfig('[Ne] 3s2', 12).ok, true);
  const wrongCarbon = gradeConfig('1s2 2s2 2p3', 6);
  assert.equal(wrongCarbon.ok, false);
  assert.match(wrongCarbon.hints[0], /2p/);
  const chromium = gradeConfig('1s2 2s2 2p6 3s2 3p6 4s2 3d4', 24);
  assert.equal(chromium.ok, false);
  assert.match(chromium.hints.join(' '), /Chromium/);
  assert.equal(gradeConfig(configurationText(24), 24).ok, true);
  const focus = moveBoxFocus(emptyDiagram(8), { subshell: '1s', index: 0 }, 'ArrowRight');
  assert.deepEqual(focus, { subshell: '2s', index: 0 });
  const markup = renderOrbitals(createOrbitals(8), 'still');
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /data-motion="still"/);
  assert.match(markup, /class="b-box"/);
  assert.match(markup, /Arrow keys/);
  assert.match(markup, /Backspace/);
});

test('builders lazy-load, stay on the device, and fit a narrow screen', () => {
  const index = read('js/builders/index.js');
  assert.match(index, /import\('\.\/lewis-view\.js'\)/);
  assert.match(index, /import\('\.\/vsepr-view\.js'\)/);
  assert.doesNotMatch(index, /from '\.\/lewis-view\.js'/);
  assert.doesNotMatch(index, /from '\.\/gas-view\.js'/);
  assert.equal(builderFromHash('#Build/gas'), 'gas');
  assert.equal(builderFromHash('#build/VSEPR'), 'vsepr');
  assert.equal(builderFromHash('#Learn'), '');
  assert.equal(BUILDERS.length, 6);
  assert.equal(typeof loaderFor('calorimeter'), 'function');
  assert.equal(loaderFor('nope'), null);
  const shell = renderShell('');
  assert.match(shell, /role="tablist"/);
  assert.match(shell, /data-builder-open="orbitals"/);
  const css = read('css/builders/builders.css');
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /flex-wrap:\s*wrap/);
  assert.match(css, /max-width:\s*100%/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /touch-action:\s*none/);
  const files = readdirSync(new URL('../js/builders/', import.meta.url));
  const source = files.map((file) => read(`js/builders/${file}`)).join('\n') + css;
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|three\.js|cdn\.|Study Guide|1045|Aktiv/i);
  assert.equal(prefersReducedMotion(null), true);
  assert.equal(prefersReducedMotion(() => ({ matches: false })), false);
  assert.match(read('docs/lanes/D.md'), /mount\(el, opts\)/);
  assert.match(read('docs/lanes/D.md'), /#Build\/lewis/);
});
