import './builders/index.js';
import { bindCards, renderCards } from './cards.js';
import { bindDrill, drillFromGenerated, weightedDrillItems } from './drills.js';
import { examHash, mountLane } from './exam/index.js';
import { generateFromSeed } from './generate.js';
import { bindGlossary, renderGlossary } from './glossary.js';
import { bindHome, renderHome } from './home/index.js';
import { bindLearn, isLessonTarget, loadLessons, renderLearn } from './learn.js';
import { bindMap, renderMap } from './map.js';
import { mount } from './periodic.js';
import { createRouteSync } from './route-sync.js';
import { bindPrep, loadFinalProblems, renderPrepPage } from './prep.js';
import { openLesson, readProgress, writeProgress } from './progress.js';
import { drillTargetFromHash, lessonIdFromHash, renderRoute, routeFromHash, routeTitle } from './routes.js';
import { bindGuided, renderGuided } from './steps/index.js';
import { applySyncHash, rememberNote, rememberPending } from './sync.js';
import { bindCompactNav } from './nav.js';
import {
  allFlashcards,
  bindRecall,
  bindTermsIndex,
  installTerms,
  linkTerms,
  recallDeckFromHash,
  renderRecallIndex,
  renderTermsIndex,
  termIdFromHash,
} from './terms/index.js';
import { bindUnitEntry, renderDrill } from './unit-entry.js';
import { mountVideos, videoHash } from './video/index.js';
import { templateById, templates, templatesForSection } from '../content/templates/index.js';

const view = document.querySelector('#view');
const navLinks = [...document.querySelectorAll('[data-nav]')];
const compactNav = bindCompactNav(document);
const tray = document.querySelector('#tray');
const backdrop = document.querySelector('#tray-backdrop');
const trayBody = document.querySelector('#tray-body');
const closeButton = document.querySelector('#close-tray');
const termsDialog = installTerms(document);

const DRILL_KEY = 'mm-drill';
const practiceSeed = 1 + Math.floor(Math.random() * 999983);

let tableApi = null;
let lastFocus = null;
let paintGeneration = 0;

function abandoned(generation, event) {
  return generation !== paintGeneration || event?.stale?.() === true;
}

function takeSyncHash() {
  const applied = applySyncHash(location.hash);
  if (!applied.handled) return false;
  const nextUrl = `${location.pathname}${location.search}#Map`;
  history.replaceState(null, '', nextUrl);
  if (applied.needsConfirm && applied.progress) rememberPending(applied.progress);
  rememberNote(applied.note);
  return false;
}

function finish(id) {
  document.title = id === 'Home' ? 'Molar Mayhem' : `${routeTitle(id)} — Molar Mayhem`;
  for (const link of navLinks) {
    if (link.getAttribute('data-nav') === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  compactNav.syncRoute(id);
}

function cssAttr(value) {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : String(value).replace(/"/g, '');
}

function mountGuided(root, lessons, lessonId) {
  const shown = (lessons ?? []).filter((lesson) => !lessonId || lesson.id === lessonId);
  for (const lesson of shown) {
    for (const problem of lesson.problems ?? []) {
      if (!Array.isArray(problem.guided) || problem.guided.length === 0) continue;
      const current = root.querySelector(`form[data-problem="${cssAttr(problem.id)}"]`);
      if (!current || current.classList.contains('mm-guided')) continue;
      current.outerHTML = linkTerms(renderGuided(problem));
      const next = root.querySelector(`form.mm-guided[data-problem="${cssAttr(problem.id)}"]`);
      const form = bindGuided(next, problem);
      form?.addEventListener('submit', (event) => event.stopPropagation());
    }
  }
}

function readDrillMemory() {
  try {
    const raw = JSON.parse(localStorage.getItem(DRILL_KEY) || 'null');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    if (!Number.isInteger(raw.seed) || raw.seed <= 0) return null;
    if (raw.templateId != null && typeof raw.templateId !== 'string') return null;
    return { templateId: raw.templateId || '', seed: raw.seed };
  } catch {
    return null;
  }
}

function writeDrillMemory(entry) {
  try {
    localStorage.setItem(DRILL_KEY, JSON.stringify(entry));
  } catch {
    /* private mode can refuse storage */
  }
}

function drillItemsFor(hash) {
  const target = drillTargetFromHash(hash);
  const saved = readDrillMemory();
  const seed = target.seed || saved?.seed || practiceSeed;
  const templateId = target.templateId || (!target.seed && saved?.templateId) || '';
  writeDrillMemory({ templateId, seed });
  const items = [];
  if (templateId) {
    try {
      const spec = templateById(templateId);
      items.push(drillFromGenerated(generateFromSeed(spec, seed), spec));
    } catch {
      /* an unknown id falls through to the weighted queue */
    }
  }
  for (const item of weightedDrillItems(templates, seed, items.length ? 5 : 6)) {
    if (!items.some((have) => have.id === item.id)) items.push(item);
  }
  return items;
}

function attachPractice(root, lessons) {
  for (const lesson of lessons ?? []) {
    const specs = templatesForSection(lesson.openstax_section);
    if (!specs.length) continue;
    const label = root.querySelector(`[data-mastery="${cssAttr(lesson.id)}"]`);
    const row = label?.closest('li');
    if (!row || row.querySelector('[data-practice]')) continue;
    const spec = specs[practiceSeed % specs.length];
    const seed = practiceSeed;
    const href = `#Drill/${encodeURIComponent(spec.id)}/${seed}`;
    row.insertAdjacentHTML('beforeend', `<a data-practice href="${href}">Practice</a>`);
  }
}

function paintTerms() {
  const deck = recallDeckFromHash(location.hash);
  if (deck !== null) {
    view.innerHTML = renderRecallIndex();
    const api = bindRecall(view);
    if (deck) api.openDeck(deck);
    return;
  }
  view.innerHTML = renderTermsIndex();
  bindTermsIndex(view, termsDialog);
  const termId = termIdFromHash(location.hash);
  if (termId) termsDialog.open(termId);
}

async function paintRoute(event) {
  if (event?.stale?.()) return;
  if (takeSyncHash()) return;
  const generation = ++paintGeneration;
  const hash = location.hash;

  if (videoHash(hash)) {
    const lessons = await loadLessons();
    if (abandoned(generation, event)) return;
    mountVideos(view, hash, { lessons });
    finish('Videos');
    return;
  }

  if (examHash(hash)) {
    const mounted = await mountLane(view, hash);
    if (abandoned(generation, event)) return;
    if (mounted) {
      finish(examHash(hash));
      return;
    }
  }

  const id = routeFromHash(hash);
  if (id === 'Learn') {
    const lessonId = lessonIdFromHash(hash);
    if (lessonId && isLessonTarget(lessonId)) writeProgress(openLesson(readProgress(), lessonId));
    const lessons = await loadLessons();
    if (abandoned(generation, event)) return;
    view.innerHTML = linkTerms(renderLearn(lessons, lessonId, readProgress()));
    bindLearn(view, lessons);
    mountGuided(view, lessons, lessonId);
  } else if (id === 'Drill') {
    const items = drillItemsFor(hash);
    view.innerHTML = renderDrill(items[0] ?? null);
    bindUnitEntry(view);
    bindDrill(view, undefined, items);
  } else if (id === 'Map') {
    const lessons = await loadLessons();
    if (abandoned(generation, event)) return;
    view.innerHTML = renderMap(lessons, readProgress());
    attachPractice(view, lessons);
    bindMap(view);
  } else if (id === 'Cards') {
    const deck = allFlashcards();
    view.innerHTML = renderCards(deck);
    bindCards(view, deck);
  } else if (id === 'Terms') {
    paintTerms();
  } else if (id === 'Prep') {
    if (abandoned(generation, event)) return;
    view.innerHTML = renderRoute(id);
    bindPrep(view);
    loadFinalProblems()
      .then((problems) => {
        if (abandoned(generation, event) || routeFromHash(location.hash) !== 'Prep') return;
        view.innerHTML = renderPrepPage(problems);
        bindPrep(view);
      })
      .catch((error) => {
        if (abandoned(generation, event) || routeFromHash(location.hash) !== 'Prep') return;
        view.innerHTML = renderPrepPage([], error.message);
      });
  } else if (id === 'Home') {
    const lessons = await loadLessons();
    if (abandoned(generation, event)) return;
    view.innerHTML = renderHome(lessons, readProgress(), { glossaryHtml: renderGlossary() });
    bindHome(view);
    bindGlossary(view);
  } else {
    view.innerHTML = renderRoute(id);
  }
  if (abandoned(generation, event)) return;
  finish(id);
}

function ensureTable() {
  if (tableApi) return tableApi;
  tableApi = mount(trayBody, {
    size: 'full',
    mode: { kind: 'heatmap', property: 'radius' },
    skin: 'header',
  });
  return tableApi;
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
  ensureTable();
  trayBody.querySelector('[data-mm-mode="radius"]')?.focus();
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
  if (event.target.closest('[data-open-tray]')) openTray();
});

closeButton.addEventListener('click', closeTray);
backdrop.addEventListener('click', closeTray);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeTray();
});
const routeSync = createRouteSync({
  getHash: () => location.hash,
  onRoute(event) {
    paintRoute(event);
  },
});
routeSync.start();
routeSync.publish(location.hash, 'start', true);
