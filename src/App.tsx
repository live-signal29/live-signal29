import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  useEffect,
  useState,
  useRef,
  Suspense,
} from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { OneSignalProvider } from "@/components/OneSignalProvider";
import AppLoader from "@/components/AppLoader";
import PlayBillingSync from "@/components/PlayBillingSync";
import NativeAppBehavior from "@/components/NativeAppBehavior";
import { NetworkQualityToast } from "@/components/NetworkQualityToast";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import BottomNavigation from "@/components/BottomNavigation";

// Lazy load all pages for better performance
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const SignalsDashboard = lazyWithRetry(() => import("./pages/SignalsDashboard"));
const XAUUSDSignals = lazyWithRetry(() => import("./pages/XAUUSDSignals"));
const ForexSignals = lazyWithRetry(() => import("./pages/ForexSignals"));
const CommoditiesSignals = lazyWithRetry(() => import("./pages/CommoditiesSignals"));
const CryptoSignals = lazyWithRetry(() => import("./pages/CryptoSignals"));
const DerivSignals = lazyWithRetry(() => import("./pages/DerivSignals"));
const ChartAnalysis = lazyWithRetry(() => import("./pages/ChartAnalysis"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const About = lazyWithRetry(() => import("./pages/About"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Signup = lazyWithRetry(() => import("./pages/Signup"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const Premium = lazyWithRetry(() => import("./pages/Premium"));
const FreeTrial = lazyWithRetry(() => import("./pages/FreeTrial"));
const Benefits = lazyWithRetry(() => import("./pages/Benefits"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Notifications = lazyWithRetry(() => import("./pages/Notifications"));
const PaymentSuccess = lazyWithRetry(() => import("./pages/PaymentSuccess"));
const CryptoDeposit = lazyWithRetry(() => import("./pages/CryptoDeposit"));
const SharedSignal = lazyWithRetry(() => import("./pages/SharedSignal"));
const AccountManagement = lazyWithRetry(() => import("./pages/AccountManagement"));
const Results = lazyWithRetry(() => import("./pages/Results"));
const EconomicCalendar = lazyWithRetry(() => import("./pages/EconomicCalendar"));
const Calculator = lazyWithRetry(() => import("./pages/Calculator"));
const Referrals = lazyWithRetry(() => import("./pages/Referrals"));
const PriceAlerts = lazyWithRetry(() => import("./pages/PriceAlerts"));
const TradeJournal = lazyWithRetry(() => import("./pages/TradeJournal"));
const AIChat = lazyWithRetry(() => import("./pages/AIChat"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const Academy = lazyWithRetry(() => import("./pages/Academy"));
const MarketBrief = lazyWithRetry(() => import("./pages/MarketBrief"));
const GiftPremium = lazyWithRetry(() => import("./pages/GiftPremium"));
const Portfolio = lazyWithRetry(() => import("./pages/Portfolio"));
const Backtesting = lazyWithRetry(() => import("./pages/Backtesting"));
const CompoundCalculator = lazyWithRetry(() => import("./pages/CompoundCalculator"));

const LoadingSpinner = AppLoader;

/* =========================================================
   GLOBAL PULL-TO-REFRESH
   ========================================================= */

// Pull-to-refresh only makes sense on screens showing live/refreshable
// data. Everywhere else (forms, dialogs, settings, checkout, etc.) it was
// firing a full page reload and wiping out whatever the user had typed.
const PULL_TO_REFRESH_PATHS = ["/", "/signals", "/profile"];

const PullToRefresh = () => {
  const location = useLocation();
  const enabled = PULL_TO_REFRESH_PATHS.includes(
    location.pathname.toLowerCase()
  );

  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);

  const MAX_PULL = 110;
  const REFRESH_THRESHOLD = 75;

  useEffect(() => {
    // Disabled on this route — don't attach any listeners at all, and
    // make sure nothing is left mid-pull from just before navigating away.
    if (!enabled) {
      pullingRef.current = false;
      setPullDistance(0);
      return;
    }

    const isExcludedTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;

      // Don't trigger page refresh while scrolling inside internal
      // scroll containers such as Notifications.
      const scrollContainer = target.closest(
        "[data-radix-scroll-area-viewport]"
      );

      if (scrollContainer instanceof HTMLElement) {
        return scrollContainer.scrollTop > 0;
      }

      // Don't interfere with form controls.
      if (
        target.closest(
          "input, textarea, select, button, [contenteditable='true']"
        )
      ) {
        return true;
      }

      // Don't interfere with any open dialog/sheet/alert (Radix gives all
      // of these role="dialog") — a modal sitting on top of an allowed
      // route (e.g. the MT5 Copier form on the Signals dashboard) should
      // never trigger a full-page reload and lose what's typed inside it.
      if (target.closest('[role="dialog"]')) {
        return true;
      }

      return false;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current) return;

      if (window.scrollY > 0) {
        pullingRef.current = false;
        return;
      }

      if (isExcludedTarget(event.target)) {
        pullingRef.current = false;
        return;
      }

      const touch = event.touches[0];

      if (!touch) return;

      startYRef.current = touch.clientY;
      pullingRef.current = true;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshingRef.current) return;

      if (window.scrollY > 0) {
        pullingRef.current = false;
        setPullDistance(0);
        return;
      }

      const touch = event.touches[0];

      if (!touch) return;

      const distance = touch.clientY - startYRef.current;

      // Only react to downward movement.
      if (distance <= 0) {
        setPullDistance(0);
        return;
      }

      // Stop the browser's native pull-to-refresh once the user
      // has actually started our custom pull gesture.
      event.preventDefault();

      const resistance = 0.55;
      const resistedDistance = Math.min(
        distance * resistance,
        MAX_PULL
      );

      setPullDistance(resistedDistance);
    };

    const handleTouchEnd = () => {
      if (!pullingRef.current || refreshingRef.current) return;

      pullingRef.current = false;

      if (pullDistance >= REFRESH_THRESHOLD) {
        refreshingRef.current = true;
        setPullDistance(MAX_PULL);

        // Small delay so the user can see the spinner before refresh.
        window.setTimeout(() => {
          window.location.reload();
        }, 450);

        return;
      }

      setPullDistance(0);
    };

    window.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });

    window.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    window.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });

    window.addEventListener("touchcancel", handleTouchEnd, {
      passive: true,
    });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [pullDistance, enabled]);

  const progress = Math.min(
    pullDistance / REFRESH_THRESHOLD,
    1
  );

  const visible = pullDistance > 2 || refreshingRef.current;

  return (
    <>
      <div
        className={`
          fixed left-1/2 top-0 z-[10000]
          -translate-x-1/2
          pointer-events-none
          transition-opacity duration-200
          ${visible ? "opacity-100" : "opacity-0"}
        `}
        style={{
          transform: `translateX(-50%) translateY(${Math.min(
            pullDistance - 20,
            60
          )}px)`,
        }}
      >
        <div
          className={`
            h-8 w-8 rounded-full
            border-[3px] border-muted border-t-primary
            ${refreshingRef.current ? "animate-spin" : ""}
          `}
          style={
            refreshingRef.current
              ? undefined
              : { transform: `rotate(${progress * 360}deg)` }
          }
        />
      </div>

      <style>{`
        html {
          overscroll-behavior-y: contain;
        }

        body {
          overscroll-behavior-y: contain;
        }

        @media (min-width: 768px) {
          html,
          body {
            overscroll-behavior-y: auto;
          }
        }
      `}</style>
    </>
  );
};

/* =========================================================
   BOTTOM NAVIGATION
   ========================================================= */

const NavigationWrapper = () => {
  const location = useLocation();

  const hideOnPaths = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/onboarding",
  ];

  if (hideOnPaths.includes(location.pathname.toLowerCase())) {
    return null;
  }

  return <BottomNavigation />;
};

/* =========================================================
   PROTECTED ROUTE
   ========================================================= */

const ProtectedRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const location = useLocation();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(
      ({ data: { session: s } }) => {
        if (!mounted) return;

        setSession(s);
        setLoading(false);
      }
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;

      setSession(s);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    const returnUrl = `${location.pathname}${location.search}`;

    return (
      <Navigate
        to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
        replace
      />
    );
  }

  return <>{children}</>;
};

/* =========================================================
   QUERY CLIENT
   ========================================================= */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: 2,
    },
  },
});

/* =========================================================
   APP
   ========================================================= */

const App = () => (
  <QueryClientProvider client={queryClient}>
    <OneSignalProvider>
      <TooltipProvider>
        <Toaster />

        <Sonner
          position="top-center"
          richColors
          closeButton
        />

        <NetworkQualityToast />
        <OfflineIndicator />
        <PlayBillingSync />

        <BrowserRouter>
          {/* Android app: BACK button + in-app links */}
          <NativeAppBehavior />

          {/* Global pull-to-refresh */}
          <PullToRefresh />

          <div className="has-bottom-nav">
            <ErrorBoundary label="Something went wrong loading this page.">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>

                  {/* ================= PUBLIC ROUTES ================= */}

                  <Route
                    path="/signal/:id"
                    element={<SharedSignal />}
                  />

                  <Route
                    path="/login"
                    element={<Login />}
                  />

                  <Route
                    path="/signup"
                    element={<Signup />}
                  />

                  <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                  />

                  <Route
                    path="/reset-password"
                    element={<ResetPassword />}
                  />

                  {/* ================= PROTECTED ROUTES ================= */}

                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <SignalsDashboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/signals"
                    element={
                      <ProtectedRoute>
                        <SignalsDashboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/onboarding"
                    element={<Onboarding />}
                  />

                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/commodities-signals"
                    element={
                      <ProtectedRoute>
                        <CommoditiesSignals />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/xauusd-signals"
                    element={
                      <ProtectedRoute>
                        <XAUUSDSignals />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/forex-signals"
                    element={
                      <ProtectedRoute>
                        <ForexSignals />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/crypto-signals"
                    element={
                      <ProtectedRoute>
                        <CryptoSignals />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/deriv-signals"
                    element={
                      <ProtectedRoute>
                        <DerivSignals />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/chart-analysis"
                    element={
                      <ProtectedRoute>
                        <ChartAnalysis />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/contact"
                    element={
                      <ProtectedRoute>
                        <Contact />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/about"
                    element={<About />}
                  />

                  <Route
                    path="/terms"
                    element={<Terms />}
                  />

                  <Route
                    path="/privacy"
                    element={<Privacy />}
                  />

                  <Route
                    path="/admin/login"
                    element={<AdminLogin />}
                  />

                  <Route
                    path="/admin/dashboard"
                    element={<AdminDashboard />}
                  />

                  <Route
                    path="/premium"
                    element={
                      <ProtectedRoute>
                        <Premium />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/free-trial"
                    element={
                      <ProtectedRoute>
                        <FreeTrial />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/benefits"
                    element={
                      <ProtectedRoute>
                        <Benefits />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <Notifications />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/payment-success"
                    element={
                      <ProtectedRoute>
                        <PaymentSuccess />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/crypto-deposit"
                    element={
                      <ProtectedRoute>
                        <CryptoDeposit />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/account-management"
                    element={
                      <ProtectedRoute>
                        <AccountManagement />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/results"
                    element={
                      <ProtectedRoute>
                        <Results />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/economic-calendar"
                    element={
                      <ProtectedRoute>
                        <EconomicCalendar />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/calculator"
                    element={
                      <ProtectedRoute>
                        <Calculator />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/referrals"
                    element={
                      <ProtectedRoute>
                        <Referrals />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/price-alerts"
                    element={
                      <ProtectedRoute>
                        <PriceAlerts />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/trade-journal"
                    element={
                      <ProtectedRoute>
                        <TradeJournal />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/ai-chat"
                    element={
                      <ProtectedRoute>
                        <AIChat />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/leaderboard"
                    element={
                      <ProtectedRoute>
                        <Leaderboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/academy"
                    element={
                      <ProtectedRoute>
                        <Academy />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/market-brief"
                    element={
                      <ProtectedRoute>
                        <MarketBrief />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/gift-premium"
                    element={
                      <ProtectedRoute>
                        <GiftPremium />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/portfolio"
                    element={
                      <ProtectedRoute>
                        <Portfolio />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/backtesting"
                    element={
                      <ProtectedRoute>
                        <Backtesting />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/compound"
                    element={
                      <ProtectedRoute>
                        <CompoundCalculator />
                      </ProtectedRoute>
                    }
                  />

                  {/* ================= 404 ================= */}

                  <Route
                    path="*"
                    element={<NotFound />}
                  />

                </Routes>
              </Suspense>
            </ErrorBoundary>

            <NavigationWrapper />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </OneSignalProvider>
  </QueryClientProvider>
);

export default App;
