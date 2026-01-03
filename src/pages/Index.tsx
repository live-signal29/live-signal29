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
import { Loader2 } from "lucide-react";

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
        
        <section className="container mx-auto px-2 sm:px-4 py-8 sm:py-16 max-w-7xl">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              <span className="gradient-text">Latest Signals</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Most recent trading signals across all categories</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
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
