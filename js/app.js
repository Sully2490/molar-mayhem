import { bindLearn, loadLessons, renderLearn } from './learn.js';
import { lessonIdFromHash, renderRoute, routeFromHash, routeTitle } from './routes.js';
import { renderTable } from './periodic.js';
import { bindUnitEntry, renderDrill } from './unit-entry.js';

const view = document.querySelector('#view');
const navLinks = [...document.querySelectorAll('[data-nav]')];
const tray = document.querySelector('#tray');
const backdrop = document.querySelector('#tray-backdrop');
const trayBody = document.querySelector('#tray-body');
const closeButton = document.querySelector('#close-tray');

let trendId = 'radius';
let selectedZ = null;
let lastFocus = null;
let paintGeneration = 0;

async function paintRoute() {
  const generation = ++paintGeneration;
  const id = routeFromHash(location.hash);
  if (id === 'Learn') {
    const lessons = await loadLessons();
    if (generation !== paintGeneration) return;
    view.innerHTML = renderLearn(lessons, lessonIdFromHash(location.hash));
    bindLearn(view, lessons);
  } else if (id === 'Drill') {
    if (generation !== paintGeneration) return;
    view.innerHTML = renderDrill();
    bindUnitEntry(view);
  } else {
    view.innerHTML = renderRoute(id);
  }
  if (generation !== paintGeneration) return;
  document.title = id === 'Home' ? 'Molar Mayhem' : `${routeTitle(id)} — Molar Mayhem`;
  for (const link of navLinks) {
    if (link.getAttribute('data-nav') === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function paintTable(focusSelector) {
  trayBody.innerHTML = renderTable(trendId, selectedZ);
  if (focusSelector) trayBody.querySelector(focusSelector)?.focus();
}

function setPageBehindInert(inert) {
  for (const el of document.querySelectorAll('header, main, footer, .skip')) {
    el.inert = inert;
  }
}

function openTray() {
  if (!tray.hidden) return;
  lastFocus = document.activeElement;
  backdrop.hidden = false;
  tray.hidden = false;
  document.body.classList.add('tray-open');
  setPageBehindInert(true);
  paintTable(`[data-trend="${trendId}"]`);
}

function closeTray() {
  if (tray.hidden) return;
  tray.hidden = true;
  backdrop.hidden = true;
  document.body.classList.remove('tray-open');
  setPageBehindInert(false);
  if (lastFocus instanceof HTMLElement) lastFocus.focus();
}

document.body.addEventListener('click', (event) => {
  if (event.target.closest('[data-open-tray]')) {
    openTray();
    return;
  }
  if (tray.hidden) return;
  const trendButton = event.target.closest('[data-trend]');
  if (trendButton) {
    trendId = trendButton.getAttribute('data-trend');
    paintTable(`[data-trend="${trendId}"]`);
    return;
  }
  const cell = event.target.closest('[data-z]');
  if (cell) {
    selectedZ = Number(cell.getAttribute('data-z'));
    paintTable(`[data-z="${selectedZ}"]`);
  }
});

closeButton.addEventListener('click', closeTray);
backdrop.addEventListener('click', closeTray);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeTray();
});
window.addEventListener('hashchange', paintRoute);
paintRoute();
