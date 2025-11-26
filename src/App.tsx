import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";

// Lazy load all pages for better performance
const NotFound = lazy(() => import("./pages/NotFound"));
const SignalsDashboard = lazy(() => import("./pages/SignalsDashboard"));
const XAUUSDSignals = lazy(() => import("./pages/XAUUSDSignals"));
const ForexSignals = lazy(() => import("./pages/ForexSignals"));
const IndexSignals = lazy(() => import("./pages/IndexSignals"));
const CommoditiesSignals = lazy(() => import("./pages/CommoditiesSignals"));
const IndicesSignals = lazy(() => import("./pages/IndicesSignals"));
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
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const CryptoDeposit = lazy(() => import("./pages/CryptoDeposit"));
const SharedSignal = lazy(() => import("./pages/SharedSignal"));

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><SignalsDashboard /></ProtectedRoute>} />
            <Route path="/signals" element={<ProtectedRoute><SignalsDashboard /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/commodities-signals" element={<ProtectedRoute><CommoditiesSignals /></ProtectedRoute>} />
            <Route path="/xauusd-signals" element={<ProtectedRoute><XAUUSDSignals /></ProtectedRoute>} />
            <Route path="/forex-signals" element={<ProtectedRoute><ForexSignals /></ProtectedRoute>} />
            <Route path="/indices-signals" element={<ProtectedRoute><IndicesSignals /></ProtectedRoute>} />
            <Route path="/index-signals" element={<ProtectedRoute><IndexSignals /></ProtectedRoute>} />
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
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
            <Route path="/crypto-deposit" element={<ProtectedRoute><CryptoDeposit /></ProtectedRoute>} />
            <Route path="/signal/:id" element={<SharedSignal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
