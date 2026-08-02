import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "chunk-reload-at";

/**
 * Lazy import that survives transient chunk-fetch failures
 * (dev-server restarts, new deploys, flaky networks).
 * Retries once, then forces a single page reload.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // one silent retry (cache-busted by the browser on failure)
      try {
        await new Promise((r) => setTimeout(r, 400));
        return await factory();
      } catch (err2) {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 10000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          // never resolves; page is reloading
          return await new Promise<{ default: T }>(() => {});
        }
        throw err2;
      }
    }
  });
}
