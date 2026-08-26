import { lazy, type ComponentType } from "react";

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      console.error("Lazy page load failed:", error);

      // Retry once
      await new Promise((resolve) => setTimeout(resolve, 800));

      try {
        return await factory();
      } catch (retryError) {
        console.error("Lazy page retry failed:", retryError);

        // Do NOT create an infinite reload loop.
        throw retryError;
      }
    }
  });
}
