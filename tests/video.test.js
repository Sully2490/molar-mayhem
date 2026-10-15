import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { videos } from '../content/videos/catalog.js';
import {
  bindVideos,
  classifyYouTube,
  embedUrl,
  facadeHtml,
  parseStart,
  parseVideoUrl,
  playerHtml,
  publicVideosFromLinks,
  renderVideoPage,
  videoHash,
} from '../js/video/index.js';

test('a YouTube URL keeps the id and the start time', () => {
  assert.equal(parseStart('1m30s'), 90);
  assert.equal(parseStart('1h2m3s'), 3723);
  assert.equal(parseStart('90'), 90);
  const watch = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s');
  assert.deepEqual(watch, { id: 'dQw4w9WgXcQ', start: 90 });
  const short = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ?t=45');
  assert.deepEqual(short, { id: 'dQw4w9WgXcQ', start: 45 });
  const embed = parseVideoUrl('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=12');
  assert.deepEqual(embed, { id: 'dQw4w9WgXcQ', start: 12 });
});

test('course-site links and other hosts are dropped', () => {
  assert.equal(parseVideoUrl('https://school.instructure.com/courses/1/modules'), null);
  assert.equal(parseVideoUrl('https://canvas.example.edu/files/video'), null);
  assert.equal(parseVideoUrl('https://kaltura.example.edu/media/1'), null);
  assert.equal(parseVideoUrl('https://vimeo.com/123456'), null);
  assert.equal(parseVideoUrl('not a url'), null);
});

test('only a clearly public video is kept', async () => {
  const pages = new Map([
    ['abcdefghijk', { ok: true, text: async () => '{"isUnlisted":false}' }],
    ['bcdefghijkl', { ok: true, text: async () => '{"isUnlisted":true}' }],
    ['cdefghijklm', { ok: true, text: async () => 'no privacy flag' }],
  ]);
  const idFrom = (url) => {
    if (url.includes('oembed')) {
      const nested = decodeURIComponent(url.split('url=')[1] ?? '');
      return new URL(nested).searchParams.get('v');
    }
    return new URL(url).searchParams.get('v');
  };
  const fetchImpl = async (url) => {
    const id = idFrom(url);
    if (url.includes('oembed')) {
      if (id === 'defghijklmn') return { ok: false, status: 404, text: async () => '' };
      return { ok: true, text: async () => '{"title":"x"}' };
    }
    return pages.get(id) ?? { ok: false, status: 404, text: async () => '' };
  };
  assert.equal(await classifyYouTube('abcdefghijk', fetchImpl), 'public');
  assert.equal(await classifyYouTube('bcdefghijkl', fetchImpl), 'unlisted');
  assert.equal(await classifyYouTube('cdefghijklm', fetchImpl), 'unlisted-looking');
  assert.equal(await classifyYouTube('defghijklmn', fetchImpl), 'unavailable');

  const links = [
    'https://www.youtube.com/watch?v=abcdefghijk&t=30',
    'https://www.youtube.com/watch?v=bcdefghijkl',
    'https://school.instructure.com/watch?v=abcdefghijk',
    'https://youtu.be/defghijklmn',
  ];
  const kept = await publicVideosFromLinks(links, fetchImpl, (parsed) => ({
    chapter: 8,
    lessonId: '8.1-pressure',
    title: 'How a manometer shows pressure',
    description: 'The height difference is the pressure of the gas.',
  }));
  assert.equal(kept.length, 1);
  assert.deepEqual(kept[0], {
    youtubeId: 'abcdefghijk',
    start: 30,
    chapter: 8,
    lessonId: '8.1-pressure',
    title: 'How a manometer shows pressure',
    description: 'The height difference is the pressure of the gas.',
  });
});

test('the facade has a thumbnail and no player until play', () => {
  const video = {
    youtubeId: 'abcdefghijk',
    start: 75,
    title: 'Count hybrid orbitals',
    description: 'Two groups use sp hybrids.',
  };
  const facade = facadeHtml(video);
  assert.match(facade, /mm-video-facade/);
  assert.match(facade, /aria-label="Play: Count hybrid orbitals"/);
  assert.match(facade, /i\.ytimg\.com\/vi\/abcdefghijk\/hqdefault\.jpg/);
  assert.doesNotMatch(facade, /<iframe/);
  assert.doesNotMatch(facade, /youtube-nocookie/);
  assert.doesNotMatch(facade, /youtube\.com\/embed/);
  const player = playerHtml(video);
  assert.match(player, /<iframe/);
  assert.match(player, /title="Count hybrid orbitals"/);
  assert.equal(
    embedUrl(video),
    'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&start=75',
  );
  assert.match(player, /youtube-nocookie\.com\/embed\/abcdefghijk\?autoplay=1&start=75/);
});

test('a tap is what inserts the iframe', () => {
  const video = {
    youtubeId: 'abcdefghijk',
    start: 0,
    title: 'Sigma and pi bonds',
    description: 'End-to-end overlap is sigma.',
  };
  const iframe = {
    focused: false,
    focus() {
      this.focused = true;
    },
  };
  const frame = {
    innerHTML: '',
    querySelector(selector) {
      return selector === 'iframe' ? iframe : null;
    },
  };
  const button = {
    attrs: {
      'data-youtube-id': video.youtubeId,
      'data-start': '0',
      'data-title': video.title,
    },
    getAttribute(name) {
      return this.attrs[name];
    },
    closest(selector) {
      return selector === '[data-video-frame]' ? frame : null;
    },
  };
  const root = {
    listeners: {},
    contains() {
      return true;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    _mmVideoAbort: null,
  };
  globalThis.AbortController = globalThis.AbortController;
  bindVideos(root);
  root.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-video-play]' ? button : null;
      },
    },
  });
  assert.match(frame.innerHTML, /youtube-nocookie\.com\/embed\/abcdefghijk/);
  assert.match(frame.innerHTML, /title="Sigma and pi bonds"/);
  assert.doesNotMatch(frame.innerHTML, /start=/);
  assert.equal(iframe.focused, true);
});

test('the published catalog stores ids only and is public-only', () => {
  const source = readFileSync(new URL('../content/videos/catalog.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /https?:\/\//);
  assert.doesNotMatch(source, /canvas/i);
  assert.doesNotMatch(source, /instructure/i);
  assert.ok(Array.isArray(videos));
  for (const video of videos) {
    assert.match(video.youtubeId, /^[A-Za-z0-9_-]{11}$/);
    assert.equal(Number.isInteger(video.start) && video.start >= 0, true);
    assert.equal(video.url, undefined);
    assert.equal(typeof video.title, 'string');
    assert.equal(typeof video.description, 'string');
    assert.equal(typeof video.lessonId, 'string');
    assert.equal(Number.isInteger(video.chapter), true);
  }
  const html = renderVideoPage(videos);
  assert.match(html, /data-videos-empty/);
  assert.doesNotMatch(html, /<iframe/);
  assert.equal(videoHash('#Videos/8')?.chapter, 8);
  assert.equal(videoHash('#Learn'), null);
  const grouped = renderVideoPage([{
    youtubeId: 'abcdefghijk',
    start: 0,
    chapter: 5,
    lessonId: 'ch5-hybridization',
    title: 'Name the hybrid set',
    description: 'Count groups on one atom.',
  }], {
    lessons: [{ id: 'ch5-hybridization', guide_line: 'Count electron groups, then name the hybrid set.' }],
  });
  assert.match(grouped, /Chapter 5/);
  assert.match(grouped, /#Learn\/ch5-hybridization/);
  assert.match(grouped, /Name the hybrid set/);
  assert.doesNotMatch(grouped, /<iframe/);
});
