import { isVideoId, parseVideoUrl } from './parse.js';

/**
 * Decide whether a YouTube id is safe to list.
 * Only `public` is kept. Missing, private, removed, unlisted, and
 * pages that do not clearly say the video is listed all drop out.
 * @param {string} id
 * @param {(url: string) => Promise<{ ok?: boolean, status?: number, text?: () => Promise<string> }>} fetchImpl
 * @returns {Promise<'public' | 'unavailable' | 'unlisted' | 'unlisted-looking' | 'invalid' | 'unknown'>}
 */
export async function classifyYouTube(id, fetchImpl) {
  if (!isVideoId(id)) return 'invalid';
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  let listed;
  let page;
  try {
    listed = await fetchImpl(oembedUrl);
    page = await fetchImpl(watchUrl);
  } catch {
    return 'unknown';
  }
  if (!listed?.ok || !page?.ok) return 'unavailable';
  let html = '';
  try {
    html = await page.text();
  } catch {
    return 'unknown';
  }
  if (/"isUnlisted"\s*:\s*true/.test(html)) return 'unlisted';
  if (!/"isUnlisted"\s*:\s*false/.test(html)) return 'unlisted-looking';
  return 'public';
}

/**
 * Keep public videos only. `links` are objects `{ url }` or URL strings.
 * `describe` writes the original title, description, chapter, and lesson.
 * Course-site links never reach the privacy check.
 */
export async function publicVideosFromLinks(links, fetchImpl, describe) {
  const kept = [];
  const seen = new Set();
  for (const link of links ?? []) {
    const url = typeof link === 'string' ? link : link?.url;
    const parsed = parseVideoUrl(url);
    if (!parsed) continue;
    const key = `${parsed.id}:${parsed.start}`;
    if (seen.has(key)) continue;
    const status = await classifyYouTube(parsed.id, fetchImpl);
    if (status !== 'public') continue;
    seen.add(key);
    const described = describe(parsed, link) ?? {};
    kept.push({
      youtubeId: parsed.id,
      start: parsed.start,
      chapter: described.chapter,
      lessonId: described.lessonId,
      title: described.title,
      description: described.description,
    });
  }
  return kept;
}
