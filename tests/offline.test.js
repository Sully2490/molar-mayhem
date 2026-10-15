import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { PRECACHE_PATHS } from '../js/offline/precache.js';
import {
  cacheNameFor,
  canStore,
  classifyRequest,
  isBlockedHost,
  isUnderScope,
  resolveSiteUrl,
} from '../js/offline/policy.js';
import { bindServiceWorker, onActivate, onFetch, onInstall, onMessage } from '../js/offline/worker.js';
import { SCOPE, UPDATE_PROMPT_TEXT, registerOffline, workerScriptUrl } from '../js/offline/register.js';

const SCOPE_URL = 'https://sully2490.github.io/molar-mayhem/';
const ORIGIN = 'https://sully2490.github.io';

test('a new deploy salt gets a new cache name and activate deletes only old site caches', async () => {
  const current = cacheNameFor('20261015f', PRECACHE_PATHS);
  const previous = cacheNameFor('20261014f', PRECACHE_PATHS);
  assert.notEqual(current, previous);
  assert.notEqual(cacheNameFor('20261015f', PRECACHE_PATHS), cacheNameFor('20261015f', [...PRECACHE_PATHS, 'content/extra.json']));
  assert.match(current, /^molar-mayhem-20261015f-[0-9a-f]+$/);

  const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const salt = source.match(/const DEPLOY_SALT = '([^']+)'/)[1];
  assert.equal(cacheNameFor(salt, PRECACHE_PATHS).startsWith(`molar-mayhem-${salt}-`), true);
  assert.notEqual(cacheNameFor(salt, PRECACHE_PATHS), previous);
  assert.match(source, /bindServiceWorker\(self, DEPLOY_SALT\)/);
  assert.doesNotMatch(source, /skipWaiting/);

  const caches = mockCaches();
  await caches.open(previous);
  await caches.open(current);
  await caches.open('pages-other-project');
  const worker = fakeWorker();
  const stale = await onActivate(worker, { caches, cacheName: current });
  assert.deepEqual(stale, [previous]);
  const names = await caches.keys();
  assert.ok(names.includes(current));
  assert.ok(names.includes('pages-other-project'));
  assert.equal(names.includes(previous), false);
  assert.equal(worker.claimed, true);
  assert.equal(worker.skipped, false);
});

test('install precaches site files under the Pages scope and does not skip waiting', async () => {
  const caches = mockCaches();
  const worker = fakeWorker();
  const paths = ['index.html', 'css/styles.css', 'content/ch01/sigfigs.json'];
  const urls = await onInstall(worker, {
    caches,
    paths,
    cacheName: cacheNameFor('deploy-a', paths),
    scope: SCOPE_URL,
  });
  assert.ok(urls.every((url) => url.startsWith(SCOPE_URL)));
  assert.equal(urls.includes(`${ORIGIN}/css/styles.css`), false);
  assert.equal(worker.skipped, false);
  assert.throws(() => resolveSiteUrl('/index.html', SCOPE_URL), /inside the site/);
  assert.throws(() => resolveSiteUrl('https://cdn.example.com/app.js', SCOPE_URL), /inside the site/);
});

test('HTML is network-first with an offline fallback and static files are cache-first', async () => {
  const scope = SCOPE_URL;
  const cacheName = 'molar-mayhem-strategy';
  const caches = mockCaches();
  const cache = await caches.open(cacheName);
  const page = `${SCOPE_URL}`;
  const indexUrl = `${SCOPE_URL}index.html`;
  const cssUrl = `${SCOPE_URL}css/styles.css`;
  await cache.put(indexUrl, basic(indexUrl, 'cached-shell'));
  await cache.put(cssUrl, basic(cssUrl, 'cached-css'));

  const html = { url: page, method: 'GET', mode: 'navigate', destination: 'document' };
  assert.equal(classifyRequest(html, scope), 'network-first');
  assert.equal(classifyRequest({ url: `${SCOPE_URL}index.html`, method: 'GET' }, scope), 'network-first');
  assert.equal(classifyRequest({ url: cssUrl, method: 'GET' }, scope), 'cache-first');
  assert.equal(classifyRequest({ url: `${SCOPE_URL}content/ch01/sigfigs.json`, method: 'GET' }, scope), 'cache-first');
  assert.equal(classifyRequest({ url: `${SCOPE_URL}sw.js`, method: 'GET' }, scope), 'bypass');

  let fetches = 0;
  const fresh = basic(page, 'fresh-shell');
  const online = await onFetch(html, fakeWorker(), {
    scope,
    cacheName,
    caches,
    fetch: async () => {
      fetches += 1;
      return fresh;
    },
  });
  assert.equal(fetches, 1);
  assert.equal(online, fresh);

  const offlineCaches = mockCaches();
  const offlineCache = await offlineCaches.open(cacheName);
  await offlineCache.put(indexUrl, basic(indexUrl, 'cached-shell'));
  const offline = await onFetch(html, fakeWorker(), {
    scope,
    cacheName,
    caches: offlineCaches,
    fetch: async () => { throw new Error('offline'); },
  });
  assert.equal(offline.body, 'cached-shell');

  fetches = 0;
  const styled = await onFetch({ url: cssUrl, method: 'GET' }, fakeWorker(), {
    scope,
    cacheName,
    caches,
    fetch: async () => { fetches += 1; throw new Error('should use the cache'); },
  });
  assert.equal(fetches, 0);
  assert.equal(styled.body, 'cached-css');
});

test('YouTube, Canvas, and every other origin are never cached', async () => {
  const scope = SCOPE_URL;
  const foreign = [
    'https://www.youtube.com/embed/abc',
    'https://youtu.be/abc',
    'https://www.youtube-nocookie.com/embed/abc',
    'https://canvas.instructure.com/courses/1',
    'https://fiu.instructure.com/courses/9/files',
    'https://canvas.example.edu/files/1',
    'https://cdn.example.com/lib.js',
    'https://sully2490.github.io/other-repo/app.js',
  ];
  for (const url of foreign) {
    assert.equal(classifyRequest({ url, method: 'GET' }, scope), 'bypass', url);
    assert.equal(isUnderScope(url, scope), false, url);
  }
  assert.equal(isBlockedHost('www.youtube.com'), true);
  assert.equal(isBlockedHost('canvas.instructure.com'), true);
  assert.equal(isBlockedHost('sully2490.github.io'), false);
  assert.equal(canStore(basic('https://www.youtube.com/watch?v=abc', 'video'), scope), false);
  assert.equal(canStore({ ok: true, type: 'opaque', url: `${SCOPE_URL}css/styles.css` }, scope), false);
  assert.equal(canStore({ ok: true, type: 'cors', url: `${SCOPE_URL}css/styles.css` }, scope), false);
  assert.equal(canStore(basic(`${SCOPE_URL}css/styles.css`, 'ok'), scope), true);

  const caches = mockCaches();
  const redirected = basic('https://www.youtube.com/watch?v=abc', 'redirected');
  const response = await onFetch({ url: `${SCOPE_URL}go`, method: 'GET', mode: 'navigate' }, fakeWorker(), {
    scope,
    cacheName: 'molar-mayhem-foreign',
    caches,
    fetch: async () => redirected,
  });
  assert.equal(response, redirected);
  assert.deepEqual(caches.stats.puts, []);

  for (const url of foreign) {
    const before = caches.stats.opens;
    const seen = await onFetch({ url, method: 'GET' }, fakeWorker(), {
      scope,
      cacheName: 'molar-mayhem-foreign',
      caches,
      fetch: async () => basic(url, 'foreign'),
    });
    assert.equal(seen.url, url);
    assert.equal(caches.stats.opens, before);
  }
  assert.deepEqual(caches.stats.puts, []);
});

test('registerOffline uses scope /molar-mayhem/ and waits for a tap before refresh', async () => {
  assert.equal(SCOPE, '/molar-mayhem/');
  assert.equal(workerScriptUrl(ORIGIN), `${SCOPE_URL}sw.js`);
  const doc = createDoc();
  const waiting = { messages: [], postMessage(data) { this.messages.push(data); } };
  const registration = {
    waiting: null,
    installing: null,
    listeners: new Map(),
    addEventListener(type, fn) {
      const list = this.listeners.get(type) ?? [];
      list.push(fn);
      this.listeners.set(type, list);
    },
  };
  const serviceWorker = {
    controller: null,
    listeners: new Map(),
    addEventListener(type, fn) {
      const list = this.listeners.get(type) ?? [];
      list.push(fn);
      this.listeners.set(type, list);
    },
    register(url, options) {
      this.registered = { url, options };
      return Promise.resolve(registration);
    },
  };
  const nav = { serviceWorker };
  const quiet = await registerOffline({ navigator: nav, document: doc, origin: ORIGIN });
  assert.equal(quiet, registration);
  assert.deepEqual(serviceWorker.registered.options, { scope: '/molar-mayhem/', type: 'module' });
  assert.equal(serviceWorker.registered.url, `${SCOPE_URL}sw.js`);
  assert.equal(doc.querySelector('[data-mm-update]'), null);

  serviceWorker.controller = {};
  registration.waiting = waiting;
  await registerOffline({ navigator: nav, document: doc, origin: ORIGIN });
  const button = doc.querySelector('[data-mm-update]').querySelector('button');
  assert.equal(button.textContent, UPDATE_PROMPT_TEXT);
  assert.equal(UPDATE_PROMPT_TEXT, 'New version, tap to refresh');
  assert.equal(waiting.messages.length, 0);
  button.dispatchEvent({ type: 'click' });
  assert.deepEqual(waiting.messages, [{ type: 'SKIP_WAITING' }]);
  assert.equal(doc.reloads, 0);
  for (const fn of serviceWorker.listeners.get('controllerchange') ?? []) fn();
  assert.equal(doc.reloads, 1);

  const worker = fakeWorker();
  onMessage({ data: { type: 'PING' } }, worker);
  assert.equal(worker.skipped, false);
  onMessage({ data: { type: 'SKIP_WAITING' } }, worker);
  assert.equal(worker.skipped, true);

  const bound = fakeWorker();
  const caches = mockCaches();
  bindServiceWorker(bound, 'deploy-b', { caches, paths: ['index.html'] });
  let installDone;
  await bound.dispatch('install', { waitUntil(promise) { installDone = promise; } });
  await installDone;
  assert.equal(bound.skipped, false);
});

test('precache paths are same-origin site files and the manifest can be installed', () => {
  // Lane G adds content/lab-help.json. See docs/v3/integration-E.md.
  const pendingPrecache = new Set(['content/lab-help.json']);
  const content = walk('content').filter((path) => path.endsWith('.json') && !pendingPrecache.has(path));
  for (const path of content) assert.ok(PRECACHE_PATHS.includes(path), path);
  for (const path of PRECACHE_PATHS) {
    assert.equal(path.startsWith('/'), false, path);
    assert.equal(path.includes('://'), false, path);
    assert.equal(/youtube|canvas|instructure/i.test(path), false, path);
    statSync(new URL(`../${path}`, import.meta.url));
  }
  for (const shell of ['index.html', 'css/styles.css', 'js/app.js', 'manifest.webmanifest', 'sw.js']) {
    if (shell !== 'sw.js') assert.ok(PRECACHE_PATHS.includes(shell), shell);
  }
  assert.equal(PRECACHE_PATHS.includes('sw.js'), false);

  const manifest = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.name, 'Molar Mayhem');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  const sizes = new Map(manifest.icons.map((icon) => [icon.sizes, icon]));
  assert.equal(pngSize(readFileSync(new URL(`../${sizes.get('192x192').src}`, import.meta.url))).width, 192);
  assert.equal(pngSize(readFileSync(new URL(`../${sizes.get('512x512').src}`, import.meta.url))).width, 512);
  const maskable = manifest.icons.find((icon) => icon.purpose === 'maskable');
  assert.equal(pngSize(readFileSync(new URL(`../${maskable.src}`, import.meta.url))).width, 512);
});

function basic(url, body) {
  return { ok: true, type: 'basic', url, body, clone() { return { ...this }; } };
}

function fakeWorker() {
  const listeners = new Map();
  const worker = {
    skipped: false,
    claimed: false,
    registration: { scope: SCOPE_URL },
    location: { origin: ORIGIN },
    listeners,
    addEventListener(type, fn) {
      const list = listeners.get(type) ?? [];
      list.push(fn);
      listeners.set(type, list);
    },
    async dispatch(type, event) {
      for (const fn of listeners.get(type) ?? []) await fn(event);
    },
    skipWaiting() { worker.skipped = true; },
  };
  worker.clients = { claim: async () => { worker.claimed = true; } };
  return worker;
}

function mockCaches() {
  const stores = new Map();
  const stats = { opens: 0, puts: [] };
  return {
    stats,
    async open(name) {
      stats.opens += 1;
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(urls) {
          for (const url of urls) store.set(url, { url, precached: true });
        },
        async put(request, response) {
          const key = typeof request === 'string' ? request : request.url;
          stats.puts.push(key);
          store.set(key, response);
        },
        async match(request) {
          const key = typeof request === 'string' ? request : request.url;
          return store.get(key);
        },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(new URL(`../${dir}`, import.meta.url))) {
    const path = `${dir}/${name}`;
    if (statSync(new URL(`../${path}`, import.meta.url)).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function pngSize(buffer) {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function createDoc() {
  const doc = {
    reloads: 0,
    children: [],
    location: { origin: ORIGIN, reload() { doc.reloads += 1; } },
  };
  doc.createElement = (tag) => make(tag, doc);
  doc.body = make('body', doc);
  doc.children.push(doc.body);
  doc.querySelector = (selector) => queryAll(doc, selector)[0] ?? null;
  doc.querySelectorAll = (selector) => queryAll(doc, selector);
  return doc;
}

function make(tag, doc) {
  const el = {
    tagName: String(tag).toUpperCase(),
    children: [],
    attributes: new Map(),
    listeners: new Map(),
    dataset: {},
    textContent: '',
    type: '',
  };
  el.setAttribute = (name, value) => el.attributes.set(name, String(value));
  el.getAttribute = (name) => (el.attributes.has(name) ? el.attributes.get(name) : null);
  el.append = (...nodes) => { for (const node of nodes) el.children.push(node); };
  el.addEventListener = (type, fn) => {
    const list = el.listeners.get(type) ?? [];
    list.push(fn);
    el.listeners.set(type, list);
  };
  el.dispatchEvent = (event) => {
    for (const fn of el.listeners.get(event.type) ?? []) fn(event);
  };
  el.querySelector = (selector) => queryAll(el, selector)[0] ?? null;
  return el;
}

function queryAll(node, selector) {
  const found = [];
  const walk = (current) => {
    for (const child of current.children ?? []) {
      if (matches(child, selector)) found.push(child);
      walk(child);
    }
  };
  walk(node);
  return found;
}

function matches(el, selector) {
  if (!el?.tagName) return false;
  const attr = /^([a-z0-9-]*)\[([^\]=]+)(?:="([^"]*)")?\]$/i.exec(selector);
  if (attr) {
    const [, tag, name, value] = attr;
    if (tag && el.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    const actual = el.getAttribute(name);
    if (value == null) return actual != null;
    return actual === value;
  }
  if (/^[a-z0-9-]+$/i.test(selector)) return el.tagName.toLowerCase() === selector.toLowerCase();
  return false;
}
