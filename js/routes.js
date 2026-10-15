import { builderShell } from './builders/index.js';
import { renderCards } from './cards.js';
import { renderGlossary } from './glossary.js';
import { labShell } from './lab/index.js';
import { renderMap } from './map.js';
import { renderPrepPage } from './prep.js';
import { emptyProgress } from './progress.js';
import { renderDrill } from './unit-entry.js';

export const ROUTE_IDS = [
  'Home', 'Map', 'Learn', 'Lab', 'Build', 'Drill', 'Prep', 'Cards',
  'Terms', 'Videos', 'Exam3', 'Weak', 'Final',
];

const ROUTES = {
  Home: {
    title: 'Molar Mayhem',
    body: `
      <h1>Molar Mayhem</h1>
      <p>Free practice for the first semester of general chemistry, chapters 1–9.</p>
      <p>Each topic starts from scratch, then a worked example, then a similar problem. A hint comes first. The full solution shows up after the last try.</p>
      <div class="route-grid">
        <a class="route-card" href="#Map"><strong>Map</strong><span>Chapters in order</span></a>
        <a class="route-card" href="#Learn"><strong>Learn</strong><span>Short lessons</span></a>
        <a class="route-card" href="#Lab"><strong>Lab</strong><span>Pictures you can move</span></a>
        <a class="route-card" href="#Build"><strong>Build</strong><span>Bonding, gases, and heat</span></a>
        <a class="route-card" href="#Drill"><strong>Drill</strong><span>Extra practice</span></a>
        <a class="route-card" href="#Cards"><strong>Cards</strong><span>Glossary review</span></a>
        <a class="route-card" href="#Terms"><strong>Terms</strong><span>Glossary and quick recall</span></a>
        <a class="route-card" href="#Videos"><strong>Videos</strong><span>Public clips</span></a>
        <a class="route-card" href="#Exam3"><strong>Exam 3</strong><span>Chapters 5 and 7</span></a>
        <a class="route-card" href="#Weak"><strong>Weak spots</strong><span>Lessons still open</span></a>
        <a class="route-card" href="#Prep"><strong>Prep</strong><span>Study plan and a practice final</span></a>
        <a class="route-card" href="#Final"><strong>Final</strong><span>Timed practice final</span></a>
      </div>
      <p><button type="button" class="table-btn" data-open-tray>Open the periodic table</button></p>
      ${renderGlossary()}
    `,
  },
  Map: {
    title: 'Map',
    body: '',
  },
  Learn: {
    title: 'Learn',
    body: `
      <p class="kicker">Chapters 1–9</p>
      <h1>Learn</h1>
      <p>Lessons load from the chapter folders.</p>
    `,
  },
  Drill: {
    title: 'Drill',
    body: '',
  },
  Prep: {
    title: 'Prep',
    body: `
      <p class="kicker">Coming soon</p>
      <h1>Prep</h1>
      <p>Exam prep is not here yet. It will hold a study plan and a practice final.</p>
    `,
  },
  Cards: {
    title: 'Cards',
    body: '',
  },
  Lab: {
    title: 'Lab',
    body: labShell(),
  },
  Build: {
    title: 'Builders',
    body: builderShell(),
  },
  Terms: {
    title: 'Terms',
    body: '',
  },
  Videos: {
    title: 'Videos',
    body: '',
  },
  Exam3: {
    title: 'Exam 3',
    body: '',
  },
  Weak: {
    title: 'Weak spots',
    body: '',
  },
  Final: {
    title: 'Practice final',
    body: '',
  },
};

export function drillTargetFromHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  const parts = raw.split('/');
  if (parts[0]?.toLowerCase() !== 'drill') return { templateId: '', seed: 0 };
  let templateId = '';
  try {
    templateId = parts[1] ? decodeURIComponent(parts[1]) : '';
  } catch {
    templateId = '';
  }
  const seed = Number(parts[2]);
  return { templateId, seed: Number.isInteger(seed) && seed > 0 ? seed : 0 };
}

export function routeFromHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  if (!raw) return 'Home';
  const head = raw.split(/[/?]/)[0];
  const match = ROUTE_IDS.find((id) => id.toLowerCase() === head.toLowerCase());
  return match ?? 'Home';
}

export function lessonIdFromHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  const parts = raw.split('/');
  if (parts[0]?.toLowerCase() !== 'learn') return '';
  return decodeURIComponent(parts[1] ?? '');
}

export function routeTitle(id) {
  return ROUTES[id]?.title ?? ROUTES.Home.title;
}

export function renderRoute(id) {
  if (id === 'Prep') return renderPrepPage([]);
  if (id === 'Drill') return renderDrill();
  if (id === 'Map') return renderMap([], emptyProgress());
  if (id === 'Cards') return renderCards();
  const route = ROUTES[id] ?? ROUTES.Home;
  const routeId = ROUTES[id] ? id : 'Home';
  return `<section class="page" data-route="${routeId}">${route.body}</section>`;
}
