import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "./pages/NotFound";
import SignalsDashboard from "./pages/SignalsDashboard";
import XAUUSDSignals from "./pages/XAUUSDSignals";
import ForexSignals from "./pages/ForexSignals";
import IndexSignals from "./pages/IndexSignals";
import CommoditiesSignals from "./pages/CommoditiesSignals";
import IndicesSignals from "./pages/IndicesSignals";
import CryptoSignals from "./pages/CryptoSignals";
import DerivSignals from "./pages/DerivSignals";
import ChartAnalysis from "./pages/ChartAnalysis";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import About from "./pages/About";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Premium from "./pages/Premium";
import FreeTrial from "./pages/FreeTrial";
import Benefits from "./pages/Benefits";
import Settings from "./pages/Settings";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
