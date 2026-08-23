/* The Branch Farm — Production PWA Service Worker
 * Version: 2.0.0
 * Strategies:
 * - Navigation: Network-first → Cache → Offline fallback
 * - Static assets (_next/static, /media, /icons, /logo): Stale-while-revalidate
 * - Images (Cloudinary, Firebase Storage): Cache-first with network fallback
 * - API routes: Network-only (never cache POST, stale-while-revalidate for GET with short TTL)
 * - Everything else: Network-first
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `branch-farm-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `branch-farm-images-${CACHE_VERSION}`;
const PAGE_CACHE = `branch-farm-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// Core assets to precache on install — minimal app shell
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/",
  "/shop",
  "/logo.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-192x192.png",
  "/icons/maskable-512x512.png",
  "/apple-touch-icon.png",
  "/media/farm-hero.jpg",
];

const STATIC_PREFIXES = [
  "/_next/static/",
  "/media/",
  "/icons/",
  "/logo.png",
  "/favicon.ico",
  "/apple-touch-icon.png",
];

const IMAGE_HOSTS = [
  "res.cloudinary.com",
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        // Precache core assets, but don't fail install if some are missing
        await cache.addAll(
          PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }))
        );
      } catch (err) {
        // Try individually to be resilient
        await Promise.allSettled(
          PRECACHE_URLS.map(async (url) => {
            try {
              const res = await fetch(new Request(url, { cache: "reload" }));
              if (res.ok) await cache.put(url, res);
            } catch {
              /* ignore single precache failures */
            }
          })
        );
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("branch-farm-") &&
              ![STATIC_CACHE, IMAGE_CACHE, PAGE_CACHE].includes(key)
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
      // Notify clients that new SW is active
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.postMessage({ type: "SW_ACTIVATED", version: CACHE_VERSION });
      }
    })()
  );
});

function isStaticAsset(url) {
  return STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isImageHost(url) {
  return IMAGE_HOSTS.some((host) => url.hostname.includes(host));
}

function isImageRequest(request) {
  return (
    request.destination === "image" ||
    /\.(png|jpg|jpeg|webp|avif|gif|svg)$/i.test(new URL(request.url).pathname)
  );
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" &&
      request.headers.get("accept")?.includes("text/html"))
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle same-origin + allowed image hosts
  if (url.origin !== self.location.origin && !isImageHost(url)) return;

  // API requests — network only, never cache mutations, but allow short cache for GET
  if (isApiRequest(url)) {
    // Don't cache API at all for freshness, but provide network-first with no fallback
    // Except for GET /api/products and /api/videos which can be cached briefly
    if (
      url.pathname.startsWith("/api/products") ||
      url.pathname.startsWith("/api/videos") ||
      url.pathname.startsWith("/api/settings")
    ) {
      event.respondWith(networkFirstWithCacheFallback(request, IMAGE_CACHE, 60 * 5));
    }
    return;
  }

  // Navigation — network first, cache fallback, offline page
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          // Cache successful navigations
          if (networkResponse.ok) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Try cache
          const cached = await caches.match(request);
          if (cached) return cached;
          // Try offline page
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
          // Last resort: return cached root
          const root = await caches.match("/");
          if (root) return root;
          // Return offline response
          return new Response("Offline — The Branch Farm", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        }
      })()
    );
    return;
  }

  // Static assets — stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Images from external hosts or image requests — cache-first
  if (isImageHost(url) || isImageRequest(request)) {
    event.respondWith(cacheFirstWithNetworkFallback(request, IMAGE_CACHE));
    return;
  }

  // Default — network first with cache fallback
  event.respondWith(networkFirstWithCacheFallback(request, STATIC_CACHE));
});

// Strategies

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

async function cacheFirstWithNetworkFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Revalidate in background
    fetch(request)
      .then((res) => {
        if (res.ok) cache.put(request, res.clone());
      })
      .catch(() => {});
    return cached;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // If image fails, return placeholder if available
    return cached || Response.error();
  }
}

async function networkFirstWithCacheFallback(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone and add timestamp header for TTL if needed
      const cloned = networkResponse.clone();
      if (maxAgeSeconds) {
        const headers = new Headers(cloned.headers);
        headers.set("sw-cache-timestamp", Date.now().toString());
        const withTimestamp = new Response(await cloned.blob(), {
          status: cloned.status,
          statusText: cloned.statusText,
          headers,
        });
        cache.put(request, withTimestamp.clone());
        return withTimestamp;
      } else {
        cache.put(request, cloned);
      }
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      if (maxAgeSeconds) {
        const timestamp = cached.headers.get("sw-cache-timestamp");
        if (timestamp) {
          const age = (Date.now() - parseInt(timestamp, 10)) / 1000;
          if (age > maxAgeSeconds) {
            // Stale, but return anyway if offline
          }
        }
      }
      return cached;
    }
    return Response.error();
  }
}

// Message handling — allow client to trigger skipWaiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});

// Push notifications (future-ready)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "The Branch Farm", body: event.data.text() };
  }
  const title = data.title || "The Branch Farm";
  const options = {
    body: data.body || "New update from the farm",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          await client.focus();
          if (client.navigate) await client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});

// Background sync placeholder
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-orders") {
    event.waitUntil(
      // Future: sync pending orders from IndexedDB
      Promise.resolve()
    );
  }
});
