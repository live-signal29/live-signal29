import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { loadGoogleTranslate } from "./lib/googleTranslate";
import { tryTelegramDeepLogin } from "./lib/telegramDeepLogin";
import { restoreSession, startSessionBackup } from "./lib/sessionPersistence";

loadGoogleTranslate();

// Splash-hide helper: called once React has painted, with a hard safety net.
// The native launch splash is configured to auto-hide quickly; this helper is
// only a safe fallback and never re-opens the native splash.
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

// Hard ceiling: even if the app fails to load/render for any reason, never
// leave the user stuck behind the splash forever.
setTimeout(hideSplash, MAX_SPLASH_MS);

const start = () => {
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
};

// Opened from the bot's "Get Premium" button? Sign the user in first (no-op for every other visit).
// Then bring back the saved login if the phone/WebView wiped the main session storage, so the user stays
// logged in until they press Logout themselves.
startSessionBackup();
tryTelegramDeepLogin()
  .catch(() => {})
  .then(() => restoreSession())
  .catch(() => {})
  .finally(start);
