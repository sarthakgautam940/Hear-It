/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

/* A new name retires older caches, which held pages and fonts this app no longer uses. */
const CACHE = "hearit-shell-v3";
const PAGES = ["/", "/people", "/history", "/settings"];
const ASSETS = [
  "/manifest.webmanifest",
  "/audio/level-processor.js",
  "/fonts/InterVariable.woff2",
  "/fonts/SourceSerif4-Variable.woff2",
  "/icons/favicon.svg",
  "/icons/icon-192.png",
];

sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // Each one on its own, so one missing file never blocks the install.
      await Promise.all([...PAGES, ...ASSETS].map((url) => cache.add(url).catch(() => undefined)));
      await sw.skipWaiting();
    }),
  );
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.origin === sw.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (
    url.origin === sw.location.origin &&
    (url.pathname.startsWith("/audio/") ||
      url.pathname.startsWith("/babble/") ||
      url.pathname.startsWith("/fonts/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.webmanifest")
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) void cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return (await cache.match(request)) ?? (await cache.match("/")) ?? Response.error();
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const fresh = await fetch(request);
  if (fresh.ok) void cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((fresh) => {
      if (fresh.ok || fresh.type === "opaque") void cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => undefined);
  if (hit) {
    void refresh;
    return hit;
  }
  return (await refresh) ?? Response.error();
}
