"use client";

import { useEffect } from "react";

const CACHE_NAME = "bible-app-v1";
const BATCH_SIZE = 5;

export default function ServiceWorkerRegister() {
  useEffect(() => {
    async function setupOfflineSupport() {
      if (!("serviceWorker" in navigator) || !("caches" in window)) {
        return;
      }

      try {
        await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const response = await fetch("/chapter-manifest.json");

        if (!response.ok) {
          throw new Error("Could not load chapter manifest");
        }

        const chapters: string[] = await response.json();
        const cache = await caches.open(CACHE_NAME);

        let completed = 0;
        let failed = 0;

        for (let i = 0; i < chapters.length; i += BATCH_SIZE) {
          const batch = chapters.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async (route) => {
              const request = new Request(route, {
                headers: { Accept: "text/html" },
              });

              try {
                const cached = await cache.match(request);

                if (cached) {
                  completed++;
                  return;
                }

                const page = await fetch(request);

                if (!page.ok) {
                  throw new Error(`Failed: ${route}`);
                }

                await cache.put(request, page.clone());
                completed++;
              } catch {
                failed++;
                console.error(`Could not cache ${route}`);
              }
            }),
          );

          console.log(`Offline chapters: ${completed}/${chapters.length}`);
        }

        console.log(`Offline caching finished. Failed: ${failed}`);
      } catch (error) {
        console.error("Offline setup failed:", error);
      }
    }

    setupOfflineSupport();
  }, []);

  return null;
}
