import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { renderOrbitals } from '../js/builders/orbitals-view.js';
import { createOrbitals } from '../js/builders/orbitals.js';
import { createVsepr } from '../js/builders/vsepr.js';
import { renderVsepr as renderBuildVsepr } from '../js/builders/vsepr-view.js';
import { renderVsepr as renderLabVsepr, vseprInner } from '../js/lab/vsepr-view.js';
import { orbitalFallback } from '../js/three-d/fallback.js';
import { centroid, extents, march } from '../js/three-d/march.js';
import { edgeTable, triTable } from '../js/three-d/march-tables.js';
import {
  angleAt,
  bondLengths,
  hasMolecule,
  moleculeById,
  xyzText,
} from '../js/three-d/molecules.js';
import { lobeSummary, orbitalMesh, sampleOrbital } from '../js/three-d/orbitals.js';
import {
  MOL_SCRIPT,
  STYLE_HREF,
  THREE_SPECIFIER,
  dragPose,
  graphicsAvailable,
  initialPose,
  isRemoteUrl,
  loadDecision,
  pageUrl,
  pinchZoom,
  spinAllowed,
  turnPose,
} from '../js/three-d/policy.js';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('orbital signs follow the real hydrogen shapes', () => {
  assert.ok(sampleOrbital('1s', 0, 0, 0) > 0);
  assert.ok(sampleOrbital('1s', 3, 0, 0) > 0);
  assert.ok(sampleOrbital('2pz', 0, 0, 2) > 0);
  assert.ok(sampleOrbital('2pz', 0, 0, -2) < 0);
  assert.equal(sampleOrbital('2pz', 0, 0, 0), 0);
  assert.ok(sampleOrbital('2px', 2, 0, 0) > 0);
  assert.ok(sampleOrbital('2py', 0, -2, 0) < 0);
  assert.ok(sampleOrbital('2s', 0, 0, 0) > 0);
  assert.ok(sampleOrbital('2s', 6, 0, 0) < 0);
  assert.ok(sampleOrbital('3dxy', 2, 2, 0) > 0);
  assert.ok(sampleOrbital('3dxy', 2, -2, 0) < 0);
  assert.ok(sampleOrbital('3dz2', 0, 0, 3) > 0);
});

test('isosurfaces put p lobes on opposite sides and keep 1s as one phase', () => {
  const s = lobeSummary(orbitalMesh('1s', 12));
  assert.ok(s.positiveCount > 12);
  assert.equal(s.negativeCount, 0);
  const span = s.positiveExtent.max.map((value, index) => value - s.positiveExtent.min[index]);
  assert.ok(Math.max(...span) / Math.min(...span) < 1.45);

  const p = lobeSummary(orbitalMesh('2pz', 12));
  assert.ok(p.positive[2] > 0.4);
  assert.ok(p.negative[2] < -0.4);
  const px = lobeSummary(orbitalMesh('2px', 12));
  assert.ok(px.positive[0] > 0.4);
  assert.ok(px.negative[0] < -0.4);

  const radial = lobeSummary(orbitalMesh('2s', 14));
  assert.ok(radial.positiveCount > 12);
  assert.ok(radial.negativeCount > 12);
  const clover = lobeSummary(orbitalMesh('3dxy', 14));
  assert.ok(clover.positiveCount > 12);
  assert.ok(clover.negativeCount > 12);
});

test('marching cubes closes a sphere', () => {
  assert.equal(edgeTable.length, 256);
  assert.equal(triTable.length, 4096);
  const n = 12;
  const values = new Float32Array(n * n * n);
  const mid = (n - 1) / 2;
  for (let k = 0; k < n; k += 1) {
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        values[i + n * (j + n * k)] = 4 - Math.hypot(i - mid, j - mid, k - mid);
      }
    }
  }
  const mesh = march(values, [n, n, n], 0, [-mid, -mid, -mid], [1, 1, 1]);
  assert.ok(mesh.positions.length > 90);
  const box = extents(mesh.positions);
  const size = box.max.map((value, index) => value - box.min[index]);
  assert.ok(Math.max(...size) / Math.min(...size) < 1.35);
  const center = centroid(mesh.positions);
  assert.ok(Math.hypot(...center) < 0.6);
});

test('teaching molecules use VSEPR angles and typical bond lengths', () => {
  const water = moleculeById('H2O');
  assert.ok(Math.abs(angleAt(water.atoms[0], water.atoms[1], water.atoms[2]) - 104.5) < 0.2);
  assert.ok(Math.abs(bondLengths(water)[0] - 0.958) < 0.01);
  const methane = moleculeById('CH4');
  assert.ok(Math.abs(angleAt(methane.atoms[0], methane.atoms[1], methane.atoms[2]) - 109.47) < 0.2);
  assert.equal(bondLengths(methane).length, 4);
  const carbonDioxide = moleculeById('CO2');
  assert.ok(Math.abs(angleAt(carbonDioxide.atoms[0], carbonDioxide.atoms[1], carbonDioxide.atoms[2]) - 180) < 0.2);
  const sulfur = moleculeById('SF6');
  assert.ok(Math.abs(angleAt(sulfur.atoms[0], sulfur.atoms[1], sulfur.atoms[3]) - 90) < 0.2);
  assert.equal(xyzText(water).split('\n')[0], '3');
  assert.match(xyzText(water), /^O /m);
  assert.equal(hasMolecule('AX4'), false);
  assert.equal(hasMolecule('XeF4'), true);
  assert.equal(moleculeById('missing'), null);
});

test('a model waits until it is on screen and stays flat without graphics', () => {
  assert.equal(loadDecision({ visible: false, graphics: true }), 'wait');
  assert.equal(loadDecision({ visible: true, graphics: false }), 'flat');
  assert.equal(loadDecision({ visible: true, graphics: true }), 'model');
  assert.equal(spinAllowed({ reduced: true, playing: true }), false);
  assert.equal(spinAllowed({ reduced: false, playing: false }), false);
  assert.equal(spinAllowed({ reduced: false, playing: true }), true);
  assert.equal(graphicsAvailable(null), false);
  assert.equal(graphicsAvailable({ getContext: () => null }), false);
  assert.equal(graphicsAvailable({ getContext: () => ({}) }), true);
  const home = turnPose({ yaw: 1, pitch: 1, zoom: 2 }, 'Home');
  assert.deepEqual(home, initialPose());
  assert.ok(turnPose(initialPose(), 'ArrowRight').yaw > initialPose().yaw);
  assert.ok(turnPose(initialPose(), '+').zoom > 1);
  assert.ok(dragPose(initialPose(), 10, 0).yaw > initialPose().yaw);
  assert.ok(pinchZoom(1, 10, 20) > 1);
  assert.equal(isRemoteUrl('vendor/three/three.module.js'), false);
  assert.equal(isRemoteUrl('https://example.com/three.module.js'), true);
  assert.equal(isRemoteUrl('//cdn.example/lib.js'), true);
  assert.throws(() => pageUrl('https://cdn.example/lib.js', 'https://sully2490.github.io/molar-mayhem/'));
  assert.equal(
    pageUrl(MOL_SCRIPT, 'https://sully2490.github.io/molar-mayhem/'),
    'https://sully2490.github.io/molar-mayhem/vendor/3dmol/3Dmol-min.js',
  );
  assert.equal(isRemoteUrl(THREE_SPECIFIER), false);
  assert.equal(isRemoteUrl(STYLE_HREF), false);
});

test('views keep the flat picture in the markup and name no remote library', () => {
  const orbitals = renderOrbitals(createOrbitals(8), 'still');
  assert.match(orbitals, /mm-3d-stage/);
  assert.match(orbitals, /data-kind="orbital"/);
  assert.match(orbitals, /class="b-box"/);
  assert.match(orbitals, /Zoom in/);
  assert.match(orbitals, /§3\.3/);
  assert.doesNotMatch(orbitals, /three\.js|webgl/i);
  const build = renderBuildVsepr({ ...createVsepr(), locked: true }, 'still');
  assert.match(build, /<canvas/);
  assert.match(build, /mm-3d-stage/);
  assert.match(build, /data-source="build"/);
  assert.match(build, /Ball and stick/);
  assert.match(build, /disabled/);
  assert.doesNotMatch(build, /three\.js|webgl/i);
  const lab = renderLabVsepr({ id: 'H2O', view: { yaw: 0.6, pitch: 0.35 }, locked: true }, 'still');
  assert.match(lab, /data-rotate/);
  assert.match(lab, /data-mm-view="0\.60000 0\.35000"/);
  assert.match(lab, /Still frame/);
  assert.match(lab, /aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home"/);
  assert.match(lab, /data-source="lab"/);
  assert.match(vseprInner({ center: 'O', outer: 'H', angle: '<109.5', bonded: 2, lone: 2 }, { yaw: 0.2, pitch: 0.1 }, 'still'), /data-mm-view/);
  const flatS = orbitalFallback('1s');
  const flatP = orbitalFallback('2pz');
  const flatD = orbitalFallback('3dxy');
  assert.match(flatS, /circle/);
  assert.match(flatP, /ellipse/);
  assert.notEqual(flatS, flatD);
  assert.doesNotMatch(`${flatS}${flatP}${flatD}`, /three\.js|webgl/i);
});

test('vendored libraries stay on the site and keep their licenses', () => {
  const threeLicense = read('vendor/three/LICENSE');
  const molLicense = read('vendor/3dmol/LICENSE');
  assert.match(threeLicense, /MIT License/);
  assert.match(threeLicense, /three\.js authors/);
  assert.match(molLicense, /BSD/);
  assert.match(molLicense, /Redistribution and use in source and binary forms/);
  assert.match(read('vendor/3dmol/3Dmol-min.js.LICENSE.txt'), /3dmol v2\.5\.5/);
  assert.match(read('vendor/three/three.module.js'), /SPDX-License-Identifier: MIT/);
  assert.match(read('vendor/three/three.module.js'), /REVISION = '170'/);
  assert.match(read('vendor/3dmol/3Dmol-min.js'), /3Dmol/);
  assert.doesNotMatch(read('vendor/three/three.module.js').slice(0, 80), /^import /);
  const source = readdirSync(new URL('../js/three-d/', import.meta.url))
    .filter((name) => name.endsWith('.js'))
    .map((name) => read(`js/three-d/${name}`))
    .join('\n');
  assert.doesNotMatch(source, /cdn\.|unpkg|jsdelivr|fetch\(|XMLHttpRequest/);
  const css = read('css/three-d/three-d.css');
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /max-width:\s*100%/);
  assert.match(read('sw.js'), /const DEPLOY_SALT = '20261015v3';/);
  assert.match(read('docs/v3/integration-D.md'), /vendor\/three\/three\.module\.js/);
  assert.match(read('docs/v3/integration-D.md'), /20261015v3d/);
});
