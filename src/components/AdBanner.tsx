import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { isNativeApp, showBanner, removeBanner } from "@/lib/admob";

// Banner is shown ONLY on these screens, only to logged-in non-premium users.
// Never on login / signup / premium / payment / settings / admin pages.
const AD_PATHS = [
  "/",
  "/signals",
  "/xauusd-signals",
  "/forex-signals",
  "/crypto-signals",
  "/commodities-signals",
  "/deriv-signals",
  "/market-brief",
  "/results",
  "/economic-calendar",
];

const AdBanner = () => {
  const { pathname } = useLocation();
  const { isPremium, loading } = useSubscriptionAccess();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) =>
      setLoggedIn(!!s)
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const wantAd =
    isNativeApp() &&
    loggedIn &&
    !loading &&
    !isPremium &&
    AD_PATHS.includes(pathname.toLowerCase());

  useEffect(() => {
    if (!wantAd) return;
    showBanner();
    return () => {
      removeBanner();
    };
  }, [wantAd]);

  return null;
};

export default AdBanner;
