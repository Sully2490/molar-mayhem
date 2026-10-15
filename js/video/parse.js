const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
]);

const BLOCKED = /canvas|instructure|kaltura|panopto|mediacore|vimeo/i;
const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** Seconds from a YouTube t= or start= value. Blank or junk is 0. */
export function parseStart(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  if (!/^(\d+h)?(\d+m)?(\d+s)?$/.test(raw) || !/[hms]/.test(raw)) return 0;
  const hours = Number(raw.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(raw.match(/(\d+)m/)?.[1] ?? 0);
  const seconds = Number(raw.match(/(\d+)s/)?.[1] ?? 0);
  return (hours * 3600) + (minutes * 60) + seconds;
}

/**
 * Pull a video id and start time from a public YouTube URL.
 * Course-site hosts and every other site return null.
 * @returns {{ id: string, start: number } | null}
 */
export function parseVideoUrl(raw) {
  const text = String(raw ?? '').trim();
  if (!text || BLOCKED.test(text)) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return null;
  const id = videoIdFrom(host, url);
  if (!ID_PATTERN.test(id)) return null;
  const start = parseStart(url.searchParams.get('start') ?? url.searchParams.get('t') ?? '');
  return { id, start };
}

function videoIdFrom(host, url) {
  if (host === 'youtu.be') {
    return (url.pathname.split('/').filter(Boolean)[0] ?? '').slice(0, 11);
  }
  const parts = url.pathname.split('/').filter(Boolean);
  const marker = parts.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live' || part === 'v');
  if (marker >= 0) return (parts[marker + 1] ?? '').slice(0, 11);
  return (url.searchParams.get('v') ?? '').slice(0, 11);
}

export function isVideoId(value) {
  return ID_PATTERN.test(String(value ?? ''));
}
