import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  useEffect,
  useState,
  Suspense,
  useCallback,
  useRef,
  Component,
  type ReactNode,
  type ErrorInfo,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { OneSignalProvider } from "@/components/OneSignalProvider";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import BottomNavigation from "@/components/BottomNavigation";

/* =========================================================
   LAZY PAGES
========================================================= */

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
const CompoundCalculator = lazyWithRetry(
  () => import("./pages/CompoundCalculator")
);

/* =========================================================
   LOADING SCREEN
========================================================= */

const LoadingSpinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-primary/20 rounded-full" />

      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <p className="text-sm text-muted-foreground animate-pulse">
      Loading Live Data...
    </p>
  </div>
);

/* =========================================================
   APP ERROR BOUNDARY
========================================================= */

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("APP ERROR:", error);
    console.error(
      "APP COMPONENT STACK:",
      info.componentStack
    );
  }

  handleReload = () => {
    try {
      sessionStorage.removeItem("chunk-reload-at");
    } catch {
      // Ignore storage errors
    }

    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center space-y-5">
            <div className="text-5xl">
              ⚠️
            </div>

            <h1 className="text-xl font-bold">
              Something went wrong
            </h1>

            <p className="text-sm text-muted-foreground">
              The app could not load correctly.
              Please reload the application.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
              >
                Reload App
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full px-5 py-3 rounded-xl border border-border text-foreground font-semibold"
              >
                Go Home
              </button>
            </div>

            {this.state.error?.message && (
              <div className="mt-4 p-3 rounded-lg bg-muted text-left">
                <p className="text-xs text-muted-foreground break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* =========================================================
   AUTH STORAGE CLEANUP
========================================================= */

const clearAuthStorage = () => {
  try {
    const projectId =
      import.meta.env.VITE_SUPABASE_PROJECT_ID;

    const authKey = projectId
      ? `sb-${projectId}-auth-token`
      : null;

    if (authKey) {
      localStorage.removeItem(authKey);
      sessionStorage.removeItem(authKey);
    }

    for (const storage of [
      localStorage,
      sessionStorage,
    ]) {
      const keys: string[] = [];

      for (
        let i = 0;
        i < storage.length;
        i++
      ) {
        const key = storage.key(i);

        if (!key) continue;

        if (
          key.startsWith("sb-") &&
          key.endsWith("-auth-token")
        ) {
          keys.push(key);
        }
      }

      keys.forEach((key) => {
        storage.removeItem(key);
      });
    }
  } catch (error) {
    console.error(
      "Auth storage cleanup failed:",
      error
    );
  }
};

/* =========================================================
   NAVIGATION
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

  if (
    hideOnPaths.includes(
      location.pathname.toLowerCase()
    )
  ) {
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
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  const sessionRef =
    useRef<Session | null>(null);

  const verifyUserStillExists =
    useCallback(
      async (currentSession: Session) => {
        const userId =
          currentSession?.user?.id;

        if (!userId) return;

        try {
          const { data, error } =
            await supabase
              .from("profiles")
              .select("id")
              .eq("id", userId)
              .maybeSingle();

          if (!error && data === null) {
            await supabase.auth.signOut();

            clearAuthStorage();

            navigate(
              "/login?reason=deleted",
              {
                replace: true,
              }
            );
          }
        } catch (error) {
          console.error(
            "User verification failed:",
            error
          );
        }
      },
      [navigate]
    );

  useEffect(() => {
    let mounted = true;

    const loadSession =
      async () => {
        try {
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();

          if (!mounted) return;

          sessionRef.current =
            currentSession;

          setSession(
            currentSession
          );

          setLoading(false);

          if (currentSession?.user) {
            await verifyUserStillExists(
              currentSession
            );
          }
        } catch (error) {
          console.error(
            "Get session error:",
            error
          );

          if (mounted) {
            setSession(null);
            setLoading(false);
          }
        }
      };

    loadSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, currentSession) => {
          if (!mounted) return;

          sessionRef.current =
            currentSession;

          setSession(
            currentSession
          );

          setLoading(false);
        }
      );

    const interval =
      setInterval(() => {
        const currentSession =
          sessionRef.current;

        if (currentSession?.user) {
          verifyUserStillExists(
            currentSession
          );
        }
      }, 120_000);

    return () => {
      mounted = false;

      subscription.unsubscribe();

      clearInterval(interval);
    };
  }, [verifyUserStillExists]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    const returnUrl =
      `${location.pathname}${location.search}`;

    return (
      <Navigate
        to={`/login?returnUrl=${encodeURIComponent(
          returnUrl
        )}`}
        replace
      />
    );
  }

  return <>{children}</>;
};

/* =========================================================
   QUERY CLIENT
========================================================= */

const queryClient =
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,

        gcTime:
          1000 * 60 * 5,

        refetchOnWindowFocus: true,

        refetchOnMount: true,

        retry: 2,
      },
    },
  });

/* =========================================================
   APP
========================================================= */

const App = () => {
  return (
    <QueryClientProvider
      client={queryClient}
    >
      <OneSignalProvider>
        <TooltipProvider>
          <Toaster />

          <Sonner
            position="top-center"
            richColors
            closeButton
          />

          <OfflineIndicator />

          <BrowserRouter>
            <div className="has-bottom-nav">
              <AppErrorBoundary>
                <Suspense
                  fallback={
                    <LoadingSpinner />
                  }
                >
                  <Routes>

                    {/* =================================================
                        PUBLIC ROUTES
                    ================================================= */}

                    <Route
                      path="/signal/:id"
                      element={
                        <SharedSignal />
                      }
                    />

                    <Route
                      path="/login"
                      element={
                        <Login />
                      }
                    />

                    <Route
                      path="/signup"
                      element={
                        <Signup />
                      }
                    />

                    <Route
                      path="/forgot-password"
                      element={
                        <ForgotPassword />
                      }
                    />

                    <Route
                      path="/reset-password"
                      element={
                        <ResetPassword />
                      }
                    />

                    <Route
                      path="/onboarding"
                      element={
                        <Onboarding />
                      }
                    />

                    {/* =================================================
                        MAIN / SIGNALS
                    ================================================= */}

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

                    {/* =================================================
                        PROFILE
                    ================================================= */}

                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />

                    {/* =================================================
                        SIGNAL PAGES
                    ================================================= */}

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

                    {/* =================================================
                        GENERAL
                    ================================================= */}

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

                    {/* =================================================
                        ADMIN
                    ================================================= */}

                    <Route
                      path="/admin/login"
                      element={
                        <AdminLogin />
                      }
                    />

                    <Route
                      path="/admin/dashboard"
                      element={
                        <AdminDashboard />
                      }
                    />

                    {/* =================================================
                        PREMIUM
                    ================================================= */}

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

                    {/* =================================================
                        USER
                    ================================================= */}

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

                    {/* =================================================
                        PAYMENT
                    ================================================= */}

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

                    {/* =================================================
                        ACCOUNT
                    ================================================= */}

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

                    {/* =================================================
                        TOOLS
                    ================================================= */}

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

                    {/* =================================================
                        COMMUNITY / EDUCATION
                    ================================================= */}

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

                    {/* =================================================
                        PREMIUM FEATURES
                    ================================================= */}

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

                    {/* =================================================
                        404
                    ================================================= */}

                    <Route
                      path="*"
                      element={
                        <NotFound />
                      }
                    />

                  </Routes>
                </Suspense>
              </AppErrorBoundary>

              <NavigationWrapper />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </OneSignalProvider>
    </QueryClientProvider>
  );
};

export default App;
