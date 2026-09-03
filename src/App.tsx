import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, Suspense } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { OneSignalProvider } from "@/components/OneSignalProvider";
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

const LoadingSpinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-primary/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
    <p className="text-sm text-muted-foreground animate-pulse">Loading Live Data...</p>
  </div>
);

const NavigationWrapper = () => {
  const location = useLocation();
  const hideOnPaths = ["/login", "/signup", "/forgot-password", "/reset-password", "/onboarding"];
  
  if (hideOnPaths.includes(location.pathname.toLowerCase())) {
    return null;
  }
  
  return <BottomNavigation />;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
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
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  return <>{children}</>;
};

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <OneSignalProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" richColors closeButton />
        <OfflineIndicator />
        <BrowserRouter>
          <div className="has-bottom-nav">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public routes */}
                <Route path="/signal/:id" element={<SharedSignal />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/about" element={<About />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><SignalsDashboard /></ProtectedRoute>} />
                <Route path="/signals" element={<ProtectedRoute><SignalsDashboard /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/commodities-signals" element={<ProtectedRoute><CommoditiesSignals /></ProtectedRoute>} />
                <Route path="/xauusd-signals" element={<ProtectedRoute><XAUUSDSignals /></ProtectedRoute>} />
                <Route path="/forex-signals" element={<ProtectedRoute><ForexSignals /></ProtectedRoute>} />
                <Route path="/crypto-signals" element={<ProtectedRoute><CryptoSignals /></ProtectedRoute>} />
                <Route path="/deriv-signals" element={<ProtectedRoute><DerivSignals /></ProtectedRoute>} />
                <Route path="/chart-analysis" element={<ProtectedRoute><ChartAnalysis /></ProtectedRoute>} />
                <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
                <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
                <Route path="/free-trial" element={<ProtectedRoute><FreeTrial /></ProtectedRoute>} />
                <Route path="/benefits" element={<ProtectedRoute><Benefits /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
                <Route path="/crypto-deposit" element={<ProtectedRoute><CryptoDeposit /></ProtectedRoute>} />
                <Route path="/account-management" element={<ProtectedRoute><AccountManagement /></ProtectedRoute>} />
                <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
                <Route path="/economic-calendar" element={<ProtectedRoute><EconomicCalendar /></ProtectedRoute>} />
                <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
                <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
                <Route path="/price-alerts" element={<ProtectedRoute><PriceAlerts /></ProtectedRoute>} />
                <Route path="/trade-journal" element={<ProtectedRoute><TradeJournal /></ProtectedRoute>} />
                <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                <Route path="/academy" element={<ProtectedRoute><Academy /></ProtectedRoute>} />
                <Route path="/market-brief" element={<ProtectedRoute><MarketBrief /></ProtectedRoute>} />
                <Route path="/gift-premium" element={<ProtectedRoute><GiftPremium /></ProtectedRoute>} />
                <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
                <Route path="/backtesting" element={<ProtectedRoute><Backtesting /></ProtectedRoute>} />
                <Route path="/compound" element={<ProtectedRoute><CompoundCalculator /></ProtectedRoute>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <NavigationWrapper />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </OneSignalProvider>
  </QueryClientProvider>
);

export default App;
