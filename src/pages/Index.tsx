import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import SignalCard from "@/components/SignalCard";
import SEO from "@/components/SEO";
import { ExnessAffiliateBanner } from "@/components/ExnessAffiliateBanner";
import { ExnessPopup } from "@/components/ExnessPopup";
import { getWebsiteStructuredData, getOrganizationStructuredData } from "@/components/StructuredData";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, BarChart3, Target } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const { data: signals, isLoading } = useQuery({
    queryKey: ["latest-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    },
  });

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      getWebsiteStructuredData(),
      getOrganizationStructuredData()
    ]
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="TREND IS FRIEND - Live Trading Signals | Forex, Crypto, Commodities & Indices"
        description="Get real-time trading signals for Forex, Crypto, Commodities, and Indices. Professional analysis, high accuracy, instant notifications. Start your 5-day free trial today!"
        keywords="trading signals, forex signals, crypto signals, commodities trading, indices signals, live trading, buy sell signals, trading analysis, technical analysis, trading alerts"
        url="https://yourdomain.com"
        structuredData={structuredData}
      />
      <Header />
      
      <main className="flex-1">
        <Hero />
        
        {/* Quick Stats Section */}
        <section className="container mx-auto px-3 py-6 max-w-7xl">
          <div className="grid grid-cols-3 gap-3">
            <div className="stats-card items-center text-center">
              <TrendingUp className="h-5 w-5 text-success mb-1" />
              <p className="text-lg font-bold text-foreground">85%+</p>
              <p className="text-[10px] text-muted-foreground">Win Rate</p>
            </div>
            <div className="stats-card items-center text-center">
              <BarChart3 className="h-5 w-5 text-primary mb-1" />
              <p className="text-lg font-bold text-foreground">500+</p>
              <p className="text-[10px] text-muted-foreground">Signals/Month</p>
            </div>
            <div className="stats-card items-center text-center">
              <Target className="h-5 w-5 text-warning mb-1" />
              <p className="text-lg font-bold text-foreground">24/7</p>
              <p className="text-[10px] text-muted-foreground">Live Updates</p>
            </div>
          </div>
        </section>

        {/* Latest Signals Section */}
        <section className="container mx-auto px-3 pb-8 max-w-7xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-title">
                <span className="gradient-text">Latest Signals</span>
              </h2>
              <p className="text-caption">Recent trading opportunities</p>
            </div>
            <Link 
              to="/signals" 
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              View All →
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading signals...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {signals?.map((signal) => (
                  <SignalCard key={signal.id} signal={signal as any} />
                ))}
              </div>
              
              <ExnessAffiliateBanner />
            </>
          )}
        </section>
      </main>

      <ExnessPopup />
      <Footer />
    </div>
  );
};

export default Index;

