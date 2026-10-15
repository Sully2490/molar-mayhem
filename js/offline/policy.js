export const CACHE_PREFIX = 'molar-mayhem-';

const STATIC_EXTENSIONS = [
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.webmanifest',
  '.png',
  '.svg',
  '.ico',
  '.webp',
  '.gif',
  '.jpg',
  '.jpeg',
  '.woff',
  '.woff2',
];

const BLOCKED_HOST = [
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtube-nocookie\.com$/i,
  /^youtu\.be$/i,
  /(^|\.)instructure\.com$/i,
  /(^|\.)canvaslms\.com$/i,
];

/** A new salt or a new precache list produces a new cache name. */
export function cacheNameFor(salt, paths) {
  const body = `${salt}\n${[...paths].sort().join('\n')}`;
  return `${CACHE_PREFIX}${salt}-${fnv1a(body)}`;
}

export function cachesToDelete(names, current) {
  return names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== current);
}

export function fnv1a(text) {
  let hash = 0x811c9dc5;
  const source = String(text);
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function isBlockedHost(hostname) {
  const host = String(hostname ?? '').toLowerCase().replace(/\.$/, '');
  if (!host) return false;
  if (BLOCKED_HOST.some((pattern) => pattern.test(host))) return true;
  return host.split('.').includes('canvas');
}

/**
 * True only for this site's own files under the service worker scope.
 * Other projects on the same GitHub Pages origin, and every other origin, are out.
 */
export function isUnderScope(url, scope) {
  let parsed;
  let scopeUrl;
  try {
    scopeUrl = new URL(scope);
    parsed = new URL(url, scopeUrl);
  } catch {
    return false;
  }
  if (parsed.origin !== scopeUrl.origin) return false;
  if (isBlockedHost(parsed.hostname)) return false;
  const scopePath = scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : `${scopeUrl.pathname}/`;
  return parsed.pathname === scopePath.slice(0, -1) || parsed.pathname.startsWith(scopePath);
}

export function isStaticAsset(pathname) {
  const path = String(pathname).toLowerCase();
  return STATIC_EXTENSIONS.some((extension) => path.endsWith(extension));
}

export function isHtmlRequest(request) {
  if (request?.mode === 'navigate' || request?.destination === 'document') return true;
  try {
    const pathname = new URL(request.url).pathname;
    return pathname.endsWith('.html') || pathname.endsWith('/');
  } catch {
    return false;
  }
}

/**
 * HTML is network-first. Static site files may be cache-first.
 * Cross-origin requests, YouTube, Canvas, and the worker script itself are bypassed.
 * @returns {'bypass' | 'network-first' | 'cache-first'}
 */
export function classifyRequest(request, scope) {
  if (!request || (request.method && request.method !== 'GET')) return 'bypass';
  if (!request.url || !isUnderScope(request.url, scope)) return 'bypass';
  let pathname = '';
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    return 'bypass';
  }
  if (pathname.endsWith('/sw.js')) return 'bypass';
  if (isStaticAsset(pathname) && !pathname.endsWith('.html')) return 'cache-first';
  if (isHtmlRequest(request)) return 'network-first';
  return 'network-first';
}

/** Store only successful same-origin basic responses that belong to this site. */
export function canStore(response, scope) {
  if (!response || response.ok !== true) return false;
  if (response.type !== 'basic') return false;
  if (!response.url || !isUnderScope(response.url, scope)) return false;
  try {
    if (new URL(response.url).pathname.endsWith('/sw.js')) return false;
  } catch {
    return false;
  }
  return true;
}

export function resolveSiteUrl(path, scope) {
  if (typeof path !== 'string' || path.startsWith('/') || path.includes('://') || path.startsWith('//')) {
    throw new Error(`Precache path must stay inside the site: ${path}`);
  }
  return new URL(path, scope).href;
}
