import { videos as publishedVideos } from '../../content/videos/catalog.js';
import { bindVideos, facadeHtml } from './player.js';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function videoHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  const [head, rest] = raw.split('/');
  if (!head || head.toLowerCase() !== 'videos') return null;
  if (!rest) return { chapter: null };
  if (!/^\d+$/.test(rest)) return { chapter: null };
  return { chapter: Number(rest) };
}

export function videosForChapter(videos, chapter) {
  const list = Array.isArray(videos) ? videos : [];
  if (chapter == null) return list;
  return list.filter((video) => Number(video.chapter) === Number(chapter));
}

function lessonName(lessons, lessonId) {
  const lesson = (lessons ?? []).find((item) => item.id === lessonId);
  return lesson?.guide_line ?? '';
}

export function renderVideoPage(videos = publishedVideos, { chapter = null, lessons = [] } = {}) {
  const shown = videosForChapter(videos, chapter);
  const groups = new Map();
  for (const video of shown) {
    const key = Number(video.chapter) || 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(video);
  }
  const blocks = [...groups.keys()].sort((left, right) => left - right).map((key) => {
    const items = groups.get(key);
    const cards = items.map((video) => {
      const name = lessonName(lessons, video.lessonId);
      const lesson = name
        ? `<p class="mm-video-lesson"><a href="#Learn/${encodeURIComponent(video.lessonId)}">${escapeHtml(name)}</a></p>`
        : '';
      return `${facadeHtml(video)}${lesson}`;
    }).join('');
    const heading = key ? `Chapter ${key}` : 'Videos';
    return `<section class="mm-video-chapter"><h2>${heading}</h2>${cards}</section>`;
  }).join('');
  const body = blocks || '<p data-videos-empty>No public video is listed yet. Unlisted and course-site videos stay off this page.</p>';
  const filter = chapter ? `<p class="kicker">Chapter ${chapter}</p>` : '<p class="kicker">Chapters 1–9</p>';
  return `
    <section class="page mm-videos" data-route="Videos">
      ${filter}
      <h1>Videos</h1>
      <p>A picture stays on the page until you press Play. The player loads then.</p>
      ${body}
    </section>
  `;
}

export function ensureVideoCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-mm-video]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/video/video.css';
  link.setAttribute('data-mm-video', '');
  document.head.appendChild(link);
}

/**
 * Paint #Videos when the hash matches. Returns false for every other hash.
 * @param {HTMLElement} root
 */
export function mountVideos(root, hash, { videos = publishedVideos, lessons = [] } = {}) {
  const route = videoHash(hash);
  if (!route || !root) return false;
  ensureVideoCss();
  root.innerHTML = renderVideoPage(videos, { chapter: route.chapter, lessons });
  bindVideos(root);
  return true;
}
