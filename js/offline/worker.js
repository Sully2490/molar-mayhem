import { PRECACHE_PATHS } from './precache.js';
import { cacheNameFor, cachesToDelete, canStore, classifyRequest, resolveSiteUrl } from './policy.js';

export function bindServiceWorker(worker, salt, deps = {}) {
  const paths = deps.paths ?? PRECACHE_PATHS;
  const cacheName = cacheNameFor(salt, paths);
  const shared = { ...deps, cacheName, paths, salt };
  worker.addEventListener('install', (event) => {
    event.waitUntil(onInstall(worker, shared));
  });
  worker.addEventListener('activate', (event) => {
    event.waitUntil(onActivate(worker, shared));
  });
  worker.addEventListener('fetch', (event) => {
    event.respondWith(onFetch(event.request, worker, shared));
  });
  worker.addEventListener('message', (event) => {
    onMessage(event, worker);
  });
  return { cacheName, salt };
}

export async function onInstall(worker, deps = {}) {
  const cacheStore = deps.caches ?? globalThis.caches;
  const paths = deps.paths ?? PRECACHE_PATHS;
  const scope = deps.scope ?? worker.registration.scope;
  const cache = await cacheStore.open(deps.cacheName);
  const urls = paths.map((path) => resolveSiteUrl(path, scope));
  await cache.addAll(urls);
  return urls;
}

export async function onActivate(worker, deps = {}) {
  const cacheStore = deps.caches ?? globalThis.caches;
  const names = await cacheStore.keys();
  const stale = cachesToDelete(names, deps.cacheName);
  await Promise.all(stale.map((name) => cacheStore.delete(name)));
  if (typeof worker.clients?.claim === 'function') await worker.clients.claim();
  return stale;
}

export async function onFetch(request, worker, deps = {}) {
  const scope = deps.scope ?? worker.registration.scope;
  const cacheStore = deps.caches ?? globalThis.caches;
  const fetchImpl = deps.fetch ?? globalThis.fetch.bind(globalThis);
  const action = classifyRequest(request, scope);
  if (action === 'bypass') return fetchImpl(request);
  const tools = { cacheStore, fetchImpl, scope, cacheName: deps.cacheName };
  if (action === 'cache-first') return cacheFirst(request, tools);
  return networkFirst(request, tools);
}

/** The page asks for this after the student taps the refresh prompt. Install never calls it. */
export function onMessage(event, worker) {
  if (event?.data?.type === 'SKIP_WAITING') worker.skipWaiting();
}

async function networkFirst(request, { cacheStore, fetchImpl, scope, cacheName }) {
  const cache = await cacheStore.open(cacheName);
  try {
    const response = await fetchImpl(request);
    if (canStore(response, scope)) await cache.put(request, cloneResponse(response));
    return response;
  } catch {
    const cached = await cache.match(request) || await cache.match(new URL('index.html', scope).href);
    if (cached) return cached;
    return offlineResponse();
  }
}

async function cacheFirst(request, { cacheStore, fetchImpl, scope, cacheName }) {
  const cache = await cacheStore.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetchImpl(request);
    if (canStore(response, scope)) await cache.put(request, cloneResponse(response));
    return response;
  } catch {
    return offlineResponse();
  }
}

function cloneResponse(response) {
  return typeof response?.clone === 'function' ? response.clone() : response;
}

function offlineResponse() {
  return new Response('Offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
