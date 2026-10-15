import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ROUTE_IDS } from '../js/routes.js';
import { renderMap } from '../js/map.js';
import {
  NAV_GROUP_NOTE,
  NAV_GROUPS,
  groupForRoute,
  navItems,
  renderHome,
} from '../js/home/index.js';
import {
  chapterStats,
  continueTarget,
  startHere,
} from '../js/progress.js';
import { ringGeometry } from '../js/home/ring.js';

const lesson = (id, ch) => ({ id, ch, guide_line: `${id} objective` });

test('start here prefers a practicing lesson, then the next new one', () => {
  const lessons = [lesson('a', 1), lesson('b', 2), lesson('c', 3)];
  const fresh = startHere(lessons, { lessons: {} });
  assert.equal(fresh.kind, 'next');
  assert.equal(fresh.lesson.id, 'a');
  const weak = startHere(lessons, { lessons: { b: 'practicing' } });
  assert.equal(weak.kind, 'weak');
  assert.equal(weak.lesson.id, 'b');
  assert.equal(weak.alt.id, 'a');
  const done = startHere(lessons, { lessons: { a: 'mastered', b: 'mastered', c: 'mastered' } });
  assert.equal(done.kind, 'done');
  assert.equal(done.lesson, null);
  assert.equal(startHere([], {}).kind, 'empty');
  const cont = continueTarget(lessons, { lessons: { a: 'practicing', c: 'practicing' } });
  assert.equal(cont.kind, 'continue');
  assert.equal(cont.lesson.id, 'c');
  const stats = chapterStats({ lessons: { a: 'mastered', b: 'practicing' } }, ['a', 'b', 'c']);
  assert.deepEqual(
    { total: stats.total, mastered: stats.mastered, practicing: stats.practicing, notStarted: stats.notStarted },
    { total: 3, mastered: 1, practicing: 1, notStarted: 1 },
  );
  const ring = ringGeometry(1, 2);
  assert.equal(ring.ratio, 0.5);
  assert.ok(Number(ring.dash) > 0);
});

test('home leads with Start here and groups the old equal tiles', () => {
  const lessons = [lesson('ch01-classify', 1), lesson('ch2-structure', 2)];
  const html = renderHome(lessons, { lessons: { 'ch2-structure': 'practicing' } });
  assert.match(html, /data-route="Home"/);
  assert.match(html, /data-start-here/);
  assert.match(html, /data-start-kind="weak"/);
  assert.match(html, /data-start-lesson="ch2-structure"/);
  assert.match(html, /Protons and neutrons/);
  assert.match(html, /data-home-group="study"/);
  assert.match(html, /data-home-group="practice"/);
  assert.match(html, /data-home-group="exam"/);
  assert.match(html, /data-home-group="tools"/);
  assert.match(html, /data-module="1"/);
  assert.match(html, /data-module="9"/);
  assert.doesNotMatch(html, /class="route-grid"/);
  assert.doesNotMatch(html, /class="route-card"/);
  assert.equal((html.match(/data-home-group="/g) ?? []).length, 4);
});

test('nav groups cover Study, Practice, Exam, and Tools', () => {
  assert.deepEqual(NAV_GROUPS.map((group) => group.label), ['Study', 'Practice', 'Exam', 'Tools']);
  const ids = navItems().map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  const routes = ids.filter((id) => id !== 'periodic');
  for (const id of ROUTE_IDS) {
    if (id === 'Home') assert.equal(groupForRoute(id), null);
    else assert.ok(routes.includes(id), id);
  }
  assert.equal(groupForRoute('Exam3').id, 'exam');
  assert.equal(groupForRoute('Lab').id, 'practice');
  assert.match(NAV_GROUP_NOTE, /Lane G/);
  const periodic = navItems().find((item) => item.id === 'periodic');
  assert.equal(periodic.kind, 'action');
  assert.equal(periodic.action, 'open-tray');
});

test('the map uses chapter headers and short titles', () => {
  const sample = JSON.parse(readFileSync(new URL('../content/ch01/classify.json', import.meta.url), 'utf8'));
  const html = renderMap([sample], { xp: 0, streak: 0, lessons: { [sample.id]: 'practicing' } });
  assert.match(html, /data-route="Map"/);
  assert.match(html, /<h2><span class="map-ch-num"[^>]*>1<\/span> Essential Ideas<\/h2>/);
  assert.match(html, /<a href="#Learn\/ch01-classify">States and mixtures<\/a>/);
  assert.match(html, /Practicing/);
  assert.match(html, /data-master="ch01-classify"/);
  assert.doesNotMatch(html, /<a href="#Learn\/ch01-classify">Sort a sample/);
  assert.match(html, /Skip ahead any time/);
});

test('module and home styles keep a ring, a tile, and 44px targets', () => {
  const learn = readFileSync(new URL('../css/learn/learn.css', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../css/home/home.css', import.meta.url), 'utf8');
  assert.match(learn, /\.module-tile/);
  assert.match(learn, /\.progress-ring/);
  assert.match(learn, /prefers-reduced-motion/);
  assert.match(learn, /min-height:\s*44px/);
  assert.match(home, /\.home-start/);
  assert.match(home, /data-home-group="study"/);
  assert.match(home, /min-height:\s*44px/);
});
