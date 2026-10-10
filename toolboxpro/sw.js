'use strict';

/* ─────────────────────────────────────────
   Service Worker — Security-Hardened
   ─ Only caches same-origin GET requests
   ─ Skips opaque (cross-origin) responses
   ─ Validates status before caching
   ─ Falls back to offline page on error
───────────────────────────────────────── */

const CACHE_NAME = 'toolboxpro-v5';

/** Trusted, explicitly-listed assets to pre-cache on install. */
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css?v=2',
  '/app.js?v=2',
  '/manifest.json',
];

/**
 * Returns true only if the URL is safe to cache:
 *  - Same origin as the SW's scope
 *  - Uses http or https (not chrome-extension://, data:, etc.)
 */
function isCacheable(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.origin === self.location.origin &&
      (parsed.protocol === 'https:' || parsed.protocol === 'http:')
    );
  } catch (_) {
    return false;
  }
}

/**
 * Returns true if the network response is safe to store:
 *  - Must exist
 *  - Status exactly 200 (no redirects, no errors)
 *  - Must be "basic" (same-origin) — never "opaque" or "error"
 */
function isStorableResponse(response) {
  return (
    response &&
    response.status === 200 &&
    response.type === 'basic'
  );
}

/* ── Install: pre-cache known-good assets ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: delete every old cache version ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first, network fallback ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') return;

  // Only handle cacheable (same-origin) URLs
  if (!isCacheable(request.url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      // Serve from cache if available
      if (cached) return cached;

      // Otherwise fetch from network with strict security options
      return fetch(request, {
        credentials: 'same-origin', // never send cookies to unexpected origins
        redirect: 'error',          // block opaque cross-origin redirects
      })
        .then((response) => {
          // Only cache safe, successful, same-origin responses
          if (!isStorableResponse(response)) return response;

          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() =>
          // Network failed — return cached offline page if available
          caches.match('/index.html')
        );
    })
  );
});
