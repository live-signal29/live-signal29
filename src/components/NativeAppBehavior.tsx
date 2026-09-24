import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { openExternal } from "@/lib/openExternal";

// Hostnames that ARE this app. A link to one of these must stay inside the
// app (router navigation) — never go out to a browser.
const OWN_HOSTS = ["livesignals29.online", "live-signal29.vercel.app"];

const isOwnHost = (host: string) =>
  OWN_HOSTS.some((h) => host === h || host.endsWith("." + h));

/**
 * Android app only (does nothing in a normal browser). Renders nothing.
 *
 * 1. BACK button: MainActivity asks window.__appBack() first. We go back
 *    one screen; on the first screen of the session we go to the home
 *    screen; only when already on home (nothing left) do we return false
 *    and Android closes the app.
 * 2. LINKS: every <a href> / window.open to another website opens through
 *    NativeBrowser (in-app Custom Tab) instead of throwing the user into
 *    the phone's browser. Links to our own domains stay in the app.
 */
const NativeAppBehavior = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  // ---------- BACK button ----------
  useEffect(() => {
    if (!window.NativeBrowser) return;

    window.__appBack = () => {
      const idx = (window.history.state && window.history.state.idx) ?? 0;
      if (idx > 0) {
        navigate(-1);
        return true;
      }
      if (pathRef.current !== "/") {
        navigate("/", { replace: true });
        return true;
      }
      return false;
    };

    return () => {
      delete window.__appBack;
    };
  }, [navigate]);

  // ---------- outbound links ----------
  useEffect(() => {
    if (!window.NativeBrowser) return;

    const originalOpen = window.open.bind(window);

    window.open = ((url?: string | URL, target?: string, features?: string) => {
      const href = url ? String(url) : "";
      if (/^https?:\/\//i.test(href)) {
        try {
          const u = new URL(href);
          if (isOwnHost(u.hostname)) {
            navigate(u.pathname + u.search + u.hash);
          } else {
            openExternal(href);
          }
          return null;
        } catch {
          /* fall through */
        }
      }
      return originalOpen(url as string, target, features);
    }) as typeof window.open;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!anchor || anchor.hasAttribute("download")) return;

      let u: URL;
      try {
        u = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (u.protocol !== "http:" && u.protocol !== "https:") return; // tel:, mailto:, tg: ...
      if (u.origin === window.location.origin) return; // normal in-app link

      e.preventDefault();
      if (isOwnHost(u.hostname)) {
        navigate(u.pathname + u.search + u.hash);
      } else {
        openExternal(u.href);
      }
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.open = originalOpen;
    };
  }, [navigate]);

  return null;
};

export default NativeAppBehavior;
