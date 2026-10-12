import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { isNativeApp, showBanner, removeBanner } from "@/lib/admob";

// Banner is shown ONLY on these screens, only to logged-in users (premium too while SHOW_ADS_TO_PREMIUM is on).
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

// TEMPORARY (AdMob review): also show the banner to premium users so the app
// sends real ad requests and AdMob can finish "Getting ready".
// Set to false once the app status in AdMob becomes "Ready".
const SHOW_ADS_TO_PREMIUM = true;

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
    (!isPremium || SHOW_ADS_TO_PREMIUM) &&
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
