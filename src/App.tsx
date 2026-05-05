import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense, useCallback, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { OneSignalProvider } from "@/components/OneSignalProvider";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { BottomNavigation } from "@/components/BottomNavigation";
// Lazy load all pages for better performance
const NotFound = lazy(() => import("./pages/NotFound"));
const SignalsDashboard = lazy(() => import("./pages/SignalsDashboard"));
const XAUUSDSignals = lazy(() => import("./pages/XAUUSDSignals"));
const ForexSignals = lazy(() => import("./pages/ForexSignals"));
const CommoditiesSignals = lazy(() => import("./pages/CommoditiesSignals"));
const CryptoSignals = lazy(() => import("./pages/CryptoSignals"));
const DerivSignals = lazy(() => import("./pages/DerivSignals"));
const ChartAnalysis = lazy(() => import("./pages/ChartAnalysis"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Premium = lazy(() => import("./pages/Premium"));
const FreeTrial = lazy(() => import("./pages/FreeTrial"));
const Benefits = lazy(() => import("./pages/Benefits"));
const Settings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const CryptoDeposit = lazy(() => import("./pages/CryptoDeposit"));
const SharedSignal = lazy(() => import("./pages/SharedSignal"));
const AccountManagement = lazy(() => import("./pages/AccountManagement"));
const Results = lazy(() => import("./pages/Results"));
const EconomicCalendar = lazy(() => import("./pages/EconomicCalendar"));
const Calculator = lazy(() => import("./pages/Calculator"));
const Referrals = lazy(() => import("./pages/Referrals"));

const LoadingSpinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-primary/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
    <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
  </div>
);

const clearAuthStorage = () => {
  try {
    // Remove only auth-related keys (don’t nuke all app storage)
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const authKey = projectId ? `sb-${projectId}-auth-token` : null;

    if (authKey) {
      localStorage.removeItem(authKey);
      sessionStorage.removeItem(authKey);
    }

    // Also remove any stray Supabase auth keys
    for (const storage of [localStorage, sessionStorage]) {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (!k) continue;
        if (k.startsWith("sb-") && k.endsWith("-auth-token")) keys.push(k);
      }
      keys.forEach((k) => storage.removeItem(k));
    }
  } catch {
    // ignore
  }
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);

  const verifyUserStillExists = useCallback(async (s: Session) => {
    const userId = s?.user?.id;
    if (!userId) return;

    // If their profile row is missing, treat as deleted user => force logout + redirect
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      await supabase.auth.signOut();
      clearAuthStorage();
      navigate('/login?reason=deleted', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    // Listener FIRST (best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      sessionRef.current = s as Session | null;
      setSession(s as Session | null);
      setLoading(false);

      if (s?.user) {
        setTimeout(() => {
          verifyUserStillExists(s as Session);
        }, 0);
      }
    });

    // THEN initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionRef.current = session as Session | null;
      setSession(session as Session | null);
      setLoading(false);

      if (session?.user) {
        setTimeout(() => {
          verifyUserStillExists(session as Session);
        }, 0);
      }
    });

    // Periodic verification (covers refresh / cached sessions)
    const interval = setInterval(() => {
      const s = sessionRef.current;
      if (s?.user) {
        verifyUserStillExists(s);
      }
    }, 30_000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [verifyUserStillExists]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
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
      staleTime: 1000 * 60, // 1 minute - better caching
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on component mount
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <OneSignalProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <BrowserRouter>
          <div className="has-bottom-nav">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public routes first */}
                <Route path="/signal/:id" element={<SharedSignal />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><SignalsDashboard /></ProtectedRoute>} />
                <Route path="/signals" element={<ProtectedRoute><SignalsDashboard /></ProtectedRoute>} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/commodities-signals" element={<ProtectedRoute><CommoditiesSignals /></ProtectedRoute>} />
                <Route path="/xauusd-signals" element={<ProtectedRoute><XAUUSDSignals /></ProtectedRoute>} />
                <Route path="/forex-signals" element={<ProtectedRoute><ForexSignals /></ProtectedRoute>} />
                <Route path="/crypto-signals" element={<ProtectedRoute><CryptoSignals /></ProtectedRoute>} />
                <Route path="/deriv-signals" element={<ProtectedRoute><DerivSignals /></ProtectedRoute>} />
                <Route path="/chart-analysis" element={<ProtectedRoute><ChartAnalysis /></ProtectedRoute>} />
                <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
                <Route path="/about" element={<About />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
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
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <BottomNavigation />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </OneSignalProvider>
  </QueryClientProvider>
);

export default App;
