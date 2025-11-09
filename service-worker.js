/* service-worker.js */
const CACHE_VERSION = "v4.0.2";
const PRECACHE = `precache-${CACHE_VERSION}`;
const RUNTIME = `runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./offline.html",
  "./manifest.webmanifest",
  "./about.html",
  "./meals.html",
  "./workouts.html",
  "./icons/icon-192.png",
  "./icons/icon-256.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png",
  // firebase compat
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore-compat.js",
  // chart
  "https://cdn.jsdelivr.net/npm/chart.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== PRECACHE && key !== RUNTIME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  // navigations
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await caches.match(req);
          return cached || caches.match("./offline.html");
        }
      })()
    );
    return;
  }

  // css/js
  if (req.destination === "style" || req.destination === "script") {
    event.respondWith(
      caches.match(req).then((cached) => {
        return (
          cached ||
          fetch(req).then((resp) =>
            caches.open(RUNTIME).then((cache) => {
              cache.put(req, resp.clone());
              return resp;
            })
          )
        );
      })
    );
    return;
  }

  // images
  if (req.destination === "image") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((resp) => {
            cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => null);
        return cached || network || caches.match("./offline.html");
      })()
    );
    return;
  }

  // default
  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch (err) {
        const cached = await caches.match(req);
        return cached || caches.match("./offline.html");
      }
    })()
  );
});
