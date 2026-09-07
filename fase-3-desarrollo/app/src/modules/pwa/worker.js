/* Generated as /sw.js by scripts/prepare-pwa.mjs. No private runtime cache. */
const CACHE_PREFIX = "pagato-public-";
const CACHE_NAME = CACHE_PREFIX + "__PWA_VERSION__";
const OFFLINE_URL = "/pwa/offline.html";
const PUBLIC_ASSETS = [
  OFFLINE_URL, "/pwa/offline.css", "/pwa/offline.js",
  "/pwa/manrope-latin.woff2", "/brand/pagato-mark.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      // Fetch everything before writing; a failed release leaves the old worker active.
      const responses = await Promise.all(PUBLIC_ASSETS.map(async (path) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20_000);
        try {
          const response = await fetch(new Request(new URL(path, self.location.origin), {
            credentials: "omit", cache: "no-store", redirect: "error", signal: controller.signal,
          }));
          if (!response.ok || response.type === "opaque" || response.redirected) throw new Error("Public asset unavailable");
          // Finish each small download before waiting for the batch, releasing its connection.
          return new Response(await response.arrayBuffer(), { status: response.status, headers: response.headers });
        } finally { clearTimeout(timeout); }
      }));
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(PUBLIC_ASSETS.map((path, i) => cache.put(path, responses[i])));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
    // Updates wait for an explicit user action, or all old tabs to close.
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "ACTIVATE_UPDATE" || !event.source?.id) return;
  event.waitUntil((async () => {
    const client = await self.clients.get(event.source.id);
    if (client?.type === "window" && new URL(client.url).origin === self.location.origin) await self.skipWaiting();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Exact, query-free public allowlist. Never write responses encountered at runtime.
  if (!url.search && PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith((async () => (await (await caches.open(CACHE_NAME)).match(url.pathname)) ?? fetch(request))());
    return;
  }
  // Do not turn API/RSC/Server Action failures into HTML or intercept authentication data.
  if (request.mode !== "navigate" || /^\/(api|_next)(\/|$)/.test(url.pathname)
      || request.headers.has("rsc") || request.headers.has("next-action") || url.searchParams.has("_rsc")) return;

  event.respondWith((async () => {
    try {
      return await fetch(new Request(request, { cache: "no-store" }));
    } catch {
      return (await (await caches.open(CACHE_NAME)).match(OFFLINE_URL))
        ?? new Response("Sin conexión. Revisa tu conexión y vuelve a intentarlo.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    }
  })());
});
