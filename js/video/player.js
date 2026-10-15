import { isVideoId } from './parse.js';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function embedUrl(video) {
  const id = video.youtubeId;
  const start = Number(video.start) > 0 ? `&start=${Math.floor(Number(video.start))}` : '';
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1${start}`;
}

/** Thumbnail and play button. No iframe and no player host. */
export function facadeHtml(video) {
  const title = escapeHtml(video.title || 'Chemistry video');
  const start = Number(video.start) > 0 ? Math.floor(Number(video.start)) : 0;
  const description = video.description
    ? `<p class="mm-video-desc">${escapeHtml(video.description)}</p>`
    : '';
  return `
    <article class="mm-video" data-youtube-id="${escapeHtml(video.youtubeId)}">
      <div class="mm-video-frame" data-video-frame>
        <button
          type="button"
          class="mm-video-facade"
          data-video-play
          data-youtube-id="${escapeHtml(video.youtubeId)}"
          data-start="${start}"
          data-title="${title}"
          aria-label="Play: ${title}"
        >
          <img
            class="mm-video-thumb"
            alt=""
            width="480"
            height="360"
            src="https://i.ytimg.com/vi/${escapeHtml(video.youtubeId)}/hqdefault.jpg"
          >
          <span class="mm-video-play" aria-hidden="true">Play</span>
        </button>
      </div>
      <h3 class="mm-video-title">${title}</h3>
      ${description}
    </article>
  `;
}

/** Player markup. Call this only after a tap. */
export function playerHtml(video) {
  const title = escapeHtml(video.title || 'Chemistry video');
  return `
    <iframe
      class="mm-video-iframe"
      src="${embedUrl(video)}"
      title="${title}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    ></iframe>
  `;
}

export function videoFromButton(button) {
  const youtubeId = button.getAttribute('data-youtube-id') ?? '';
  const start = Number(button.getAttribute('data-start') ?? 0);
  const title = button.getAttribute('data-title') ?? '';
  if (!isVideoId(youtubeId)) return null;
  return { youtubeId, start: Number.isFinite(start) ? start : 0, title };
}

/** Swap the facade for a nocookie iframe on tap. Nothing plays before that. */
export function bindVideos(root) {
  if (!root) return;
  root._mmVideoAbort?.abort();
  const abort = new AbortController();
  root._mmVideoAbort = abort;
  root.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-video-play]');
    if (!button || !root.contains(button)) return;
    const video = videoFromButton(button);
    const frame = button.closest('[data-video-frame]');
    if (!video || !frame) return;
    frame.innerHTML = playerHtml(video);
  }, { signal: abort.signal });
}
