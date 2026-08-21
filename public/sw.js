/* The Branch Farm — minimal offline cache for static assets only.
 * HTML and API routes are never cached, so pages always stay fresh. */
const CACHE = "branch-farm-static-v1";
const STATIC_PREFIXES = ["/media/", "/logo.png", "/_next/static/"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isStatic = STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

  if (!isStatic) return;

  // Stale-while-revalidate for images and static assets.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
