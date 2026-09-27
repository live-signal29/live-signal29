import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { loadGoogleTranslate } from "./lib/googleTranslate";

loadGoogleTranslate();

// Splash-hide helper: called once React has painted, AND as a hard safety
// net after MAX_SPLASH_MS regardless of what happens — so a slow network
// shows the branded splash for longer, but the app can never get
// permanently stuck behind it (whichever call runs first wins; the rest
// are harmless no-ops since hide() on an already-hidden splash does nothing).
const MAX_SPLASH_MS = 20000;
let splashHidden = false;
const hideSplash = () => {
  if (splashHidden) return;
  splashHidden = true;
  import("@capacitor/splash-screen")
    .then(({ SplashScreen }) => SplashScreen.hide())
    .catch(() => {
      // Not running inside the native app, or the plugin isn't present — ignore.
    });
};

// Safety net: force the native splash to be visible from the very first
// JS tick, in case the native "show on launch" step is ever skipped for any
// reason. Harmless no-op outside the native app (web fallback implementation).
import("@capacitor/splash-screen")
  .then(({ SplashScreen }) => SplashScreen.show({ autoHide: false }))
  .catch(() => {});

// Hard ceiling: even if the app fails to load/render for any reason, never
// leave the user stuck behind the splash forever.
setTimeout(hideSplash, MAX_SPLASH_MS);

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Hides the native splash screen now that React has taken over from the
// static boot-splash in index.html. The double rAF waits for the browser
// to actually paint this first render.
requestAnimationFrame(() => {
  requestAnimationFrame(hideSplash);
});
