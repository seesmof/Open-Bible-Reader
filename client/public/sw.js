self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== location.origin) {
    return;
  }

  // Navigation: prefer downloaded pages.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // Ignore header differences when matching cached pages.
        const cached = await cache.match(request, {
          ignoreVary: true,
        });

        if (cached) return cached;

        // Also try matching by URL without query parameters.
        const pathRequest = new Request(url.origin + url.pathname);

        const cachedByPath = await cache.match(pathRequest, {
          ignoreVary: true,
        });

        if (cachedByPath) return cachedByPath;

        try {
          const response = await fetch(request);

          if (response.ok) {
            await cache.put(request, response.clone());
          }

          return response;
        } catch {
          return (
            (await cache.match("/offline.html")) ||
            new Response("Offline", { status: 503 })
          );
        }
      })(),
    );

    return;
  }

  // Static files and Bible references.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/references.json"
  ) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;

        const response = await fetch(request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;
      }),
    );

    return;
  }

  // Other requests.
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);

      return cached || new Response("Offline", { status: 503 });
    }),
  );
});
