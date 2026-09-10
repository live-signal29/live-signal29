/**
 * Drives Google Website Translator programmatically so the whole site
 * (every page, including ones with no manual i18n keys) can be shown in
 * any of 20+ languages, with our own menu UI instead of Google's default
 * toolbar (which is hidden via CSS in index.css).
 */

export const SITE_LANG_KEY = "site_lang";

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

let scriptRequested = false;

/** Loads the Google Translate script once and wires up its init callback. */
export function loadGoogleTranslate() {
  if (scriptRequested || typeof window === "undefined") return;
  scriptRequested = true;

  // If a language was already picked on a previous visit, set the cookie
  // BEFORE the widget initializes so the page translates immediately on
  // load instead of flashing English first.
  const saved = localStorage.getItem(SITE_LANG_KEY);
  if (saved && saved !== "en") {
    document.cookie = `googtrans=/en/${saved}; path=/`;
  }

  window.googleTranslateElementInit = () => {
    if (!window.google?.translate?.TranslateElement) return;
    new window.google.translate.TranslateElement(
      { pageLanguage: "en", autoDisplay: false },
      "google_translate_element"
    );
  };

  const script = document.createElement("script");
  script.src =
    "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
}

/** Switches the visible site language. Pass "en" to restore the original text. */
export function setSiteLanguage(code: string) {
  localStorage.setItem(SITE_LANG_KEY, code);

  if (code === "en") {
    // Clearing the cookie + reload is the most reliable way to fully
    // restore the original English text everywhere.
    document.cookie = "googtrans=/en/en; path=/";
    window.location.reload();
    return;
  }

  const tryApply = (attemptsLeft: number) => {
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
      combo.value = code;
      combo.dispatchEvent(new Event("change"));
      return;
    }
    // Widget script can still be loading — keep retrying for ~6s.
    if (attemptsLeft > 0) setTimeout(() => tryApply(attemptsLeft - 1), 250);
  };
  tryApply(24);
}

export function getSavedLanguage(): string {
  return (typeof window !== "undefined" && localStorage.getItem(SITE_LANG_KEY)) || "en";
}

/** 20+ languages — codes match Google Translate's language codes. */
export const SITE_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ur", label: "اردو (Urdu)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "fa", label: "فارسی (Persian)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "es", label: "Español (Spanish)" },
  { code: "fr", label: "Français (French)" },
  { code: "de", label: "Deutsch (German)" },
  { code: "it", label: "Italiano (Italian)" },
  { code: "pt", label: "Português (Portuguese)" },
  { code: "ru", label: "Русский (Russian)" },
  { code: "uk", label: "Українська (Ukrainian)" },
  { code: "pl", label: "Polski (Polish)" },
  { code: "nl", label: "Nederlands (Dutch)" },
  { code: "tr", label: "Türkçe (Turkish)" },
  { code: "zh-CN", label: "中文 (Chinese)" },
  { code: "ja", label: "日本語 (Japanese)" },
  { code: "ko", label: "한국어 (Korean)" },
  { code: "vi", label: "Tiếng Việt (Vietnamese)" },
  { code: "th", label: "ไทย (Thai)" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu (Malay)" },
  { code: "fil", label: "Filipino" },
  { code: "sw", label: "Kiswahili (Swahili)" },
  { code: "ha", label: "Hausa" },
  { code: "am", label: "አማርኛ (Amharic)" },
  { code: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
];
