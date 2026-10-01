'use client';
import { useEffect } from 'react';

const VERSION_KEY = 'ft_version';
const VERSION = '2026-10-01-1';

export default function CacheKiller() {
  useEffect(() => {
    (async () => {
      try {
        const stored = localStorage.getItem(VERSION_KEY);

        if (stored !== VERSION) {
          localStorage.setItem(VERSION_KEY, VERSION);

          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }

          sessionStorage.clear();

          if (stored === null) return;

          const url = new URL(window.location.href);
          url.searchParams.set('_v', Date.now().toString());
          window.location.replace(url.toString());
        }
      } catch {
        /* ignore */
      }
    })();

    function blockCacheAPI() {
      try {
        if (!('caches' in window)) return;
        const originalOpen = caches.open.bind(caches);
        (caches as any).open = async (name: string) => {
          if (name.includes('facetube')) {
            const c = await originalOpen(name);
            await caches.delete(name);
          }
          return originalOpen(name);
        };
      } catch {
        /* ignore */
      }
    }

    blockCacheAPI();
  }, []);

  return null;
}
