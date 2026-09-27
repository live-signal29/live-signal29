import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { loadGoogleTranslate } from "./lib/googleTranslate";

loadGoogleTranslate();

// Safety net: force the native splash to be visible from the very first
// JS tick, in case the native "show on launch" step is ever skipped for any
// reason. Harmless no-op outside the native app (web fallback implementation).
import("@capacitor/splash-screen")
  .then(({ SplashScreen }) => SplashScreen.show({ autoHide: false }))
  .catch(() => {});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Hides the native splash screen now that React has taken over from the
// static boot-splash in index.html (see capacitor.config.ts — launchAutoHide
// is off, so nothing hides it on a fixed timer while the network is slow).
// The double rAF waits for the browser to actually paint this first render.
// @capacitor/splash-screen ships a web implementation too, so this import
// and call are both safe no-ops outside the native app (e.g. on Vercel).
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => SplashScreen.hide())
      .catch(() => {
        // Not running inside the native app, or the plugin isn't present — ignore.
      });
  });
});
