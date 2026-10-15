import { ensureHomeCss } from './css.js';
import { moduleGridHtml } from './modules.js';
import { NAV_GROUPS } from './nav-groups.js';
import { chapterByNumber, shortTitle } from './chapters.js';
import { readProgress, startHere } from '../progress.js';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function startCopy(pick) {
  if (pick.kind === 'weak') {
    return 'You started this lesson and it is not mastered yet. It is the earliest one still open.';
  }
  if (pick.kind === 'next') {
    return 'This is the next lesson that is not mastered yet.';
  }
  if (pick.kind === 'done') {
    return 'Every lesson is mastered. A drill is ready when you want more practice.';
  }
  return 'Open chapter 1 and start from the first lesson.';
}

function startCard(lessons, progress) {
  const pick = startHere(lessons, progress);
  if (pick.kind === 'done') {
    return `<article class="home-start" data-start-here data-start-kind="done">
      <p class="kicker">Start here</p>
      <h2>You are caught up</h2>
      <p>${startCopy(pick)}</p>
      <a class="home-start-link" href="#Drill">Go to Drill</a>
    </article>`;
  }
  if (pick.kind === 'empty' || !pick.lesson) {
    return `<article class="home-start" data-start-here data-start-kind="empty">
      <p class="kicker">Start here</p>
      <h2>Essential Ideas</h2>
      <p>${startCopy(pick)}</p>
      <a class="home-start-link" href="#Learn/mod-1">Open chapter 1</a>
    </article>`;
  }
  const chapter = chapterByNumber(pick.lesson.ch);
  const chapterName = chapter ? chapter.title : `Chapter ${pick.lesson.ch}`;
  const href = `#Learn/${encodeURIComponent(pick.lesson.id)}`;
  const alt = pick.alt
    ? `<p class="home-start-alt"><a href="#Learn/${encodeURIComponent(pick.alt.id)}">Or start the next new lesson: ${escapeHtml(shortTitle(pick.alt))}</a></p>`
    : '';
  const style = chapter ? ` style="--accent:${chapter.accent};--wash:${chapter.wash}"` : '';
  return `<article class="home-start" data-start-here data-start-kind="${pick.kind}" data-start-lesson="${escapeHtml(pick.lesson.id)}"${style}>
    <p class="kicker">Start here</p>
    <h2>${escapeHtml(shortTitle(pick.lesson))}</h2>
    <p class="home-start-where">Chapter ${escapeHtml(pick.lesson.ch)} · ${escapeHtml(chapterName)}</p>
    <p>${startCopy(pick)}</p>
    ${alt}
    <a class="home-start-link" href="${href}">${pick.kind === 'weak' ? 'Work this weak spot' : 'Open this lesson'}</a>
  </article>`;
}

function tile(item) {
  const body = `<strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.blurb)}</span>`;
  if (item.kind === 'action') {
    return `<button type="button" class="home-tile" data-home-tile="${escapeHtml(item.id)}" data-open-tray>${body}</button>`;
  }
  return `<a class="home-tile" data-home-tile="${escapeHtml(item.id)}" href="${escapeHtml(item.href)}">${body}</a>`;
}

function groupsHtml() {
  return NAV_GROUPS.map((group) => `
    <section class="home-group" data-home-group="${escapeHtml(group.id)}">
      <h2>${escapeHtml(group.label)}</h2>
      <p>${escapeHtml(group.blurb)}</p>
      <div class="home-group-grid">${group.items.map(tile).join('')}</div>
    </section>
  `).join('');
}

export function renderHome(lessons = [], progress = undefined, options = {}) {
  ensureHomeCss();
  const saved = progress === undefined ? readProgress() : progress;
  const glossary = options.glossaryHtml
    ? `<div data-home-glossary>${options.glossaryHtml}</div>`
    : '<div data-home-glossary></div>';
  return `<section class="page home-page" data-route="Home">
    <p class="kicker">Chapters 1–9</p>
    <h1>Molar Mayhem</h1>
    <p>Free practice for the first semester of general chemistry. Each topic starts from scratch, then a worked example, then a similar problem.</p>
    ${startCard(lessons, saved)}
    <h2 class="home-chapter-heading">Chapters</h2>
    ${moduleGridHtml(lessons, saved)}
    <h2 class="home-places-heading">Where to go</h2>
    ${groupsHtml()}
    ${glossary}
  </section>`;
}

export function bindHome(root) {
  ensureHomeCss();
  return root;
}
