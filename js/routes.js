import { renderPrepPage } from './prep.js';

export const ROUTE_IDS = ['Home', 'Map', 'Learn', 'Drill', 'Prep', 'Cards'];

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
        <a class="route-card" href="#Drill"><strong>Drill</strong><span>Extra practice</span></a>
        <a class="route-card" href="#Prep"><strong>Prep</strong><span>Study plan and a practice final</span></a>
        <a class="route-card" href="#Cards"><strong>Cards</strong><span>Quick review</span></a>
      </div>
      <p><button type="button" class="table-btn" data-open-tray>Open the periodic table</button></p>
    `,
  },
  Map: {
    title: 'Map',
    body: `
      <p class="kicker">Coming soon</p>
      <h1>Map</h1>
      <p>The chapter map is not here yet. It will list chapters 1–9 so you can jump to a lesson.</p>
    `,
  },
  Learn: {
    title: 'Learn',
    body: `
      <p class="kicker">Coming soon</p>
      <h1>Learn</h1>
      <p>Lessons are not here yet. Each one will teach a topic from scratch, then show a worked example and a similar problem.</p>
    `,
  },
  Drill: {
    title: 'Drill',
    body: `
      <p class="kicker">Coming soon</p>
      <h1>Drill</h1>
      <p>Drills are not here yet. They will be short practice on the topics that are easy to miss.</p>
    `,
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
    body: `
      <p class="kicker">Coming soon</p>
      <h1>Cards</h1>
      <p>Cards are not here yet. They will be quick prompts you can flip through.</p>
    `,
  },
};

export function routeFromHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  if (!raw) return 'Home';
  const match = ROUTE_IDS.find((id) => id.toLowerCase() === raw.toLowerCase());
  return match ?? 'Home';
}

export function routeTitle(id) {
  return ROUTES[id]?.title ?? ROUTES.Home.title;
}

export function renderRoute(id) {
  if (id === 'Prep') return renderPrepPage([]);
  const route = ROUTES[id] ?? ROUTES.Home;
  const routeId = ROUTES[id] ? id : 'Home';
  return `<section class="page" data-route="${routeId}">${route.body}</section>`;
}
