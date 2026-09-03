import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignalCard from "@/components/SignalCard";
import SEO from "@/components/SEO";
import { ExnessAffiliateBanner } from "@/components/ExnessAffiliateBanner";
import { ExnessPopup } from "@/components/ExnessPopup";
import {
  getWebsiteStructuredData,
  getOrganizationStructuredData,
} from "@/components/StructuredData";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  BarChart3,
  ChevronRight,
  Target,
  Clock,
  LineChart,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { TrialExpiredModal } from "@/components/TrialExpiredModal";

const Index = () => {
  const navigate = useNavigate();
  const { hasAccess, loading: accessLoading, trialExpired } = useSubscriptionAccess();
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);

  const [activeCategory, setActiveCategory] = useState("All");

  const { data: signals, isLoading } = useQuery({
    queryKey: ["latest-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!accessLoading && trialExpired && !hasAccess) {
      setShowTrialExpiredModal(true);
    }
  }, [accessLoading, trialExpired, hasAccess]);

  useEffect(() => {
    if (!accessLoading && !hasAccess && !trialExpired) {
      navigate("/premium", { replace: true });
    }
  }, [accessLoading, hasAccess, trialExpired, navigate]);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      getWebsiteStructuredData(),
      getOrganizationStructuredData(),
    ],
  };

  const filteredSignals = signals?.filter((signal) => {
    if (!activeCategory || activeCategory.toLowerCase() === "all") {
      return true;
    }
    const sigCat = (signal.category || "").trim().toLowerCase();
    const activeCat = activeCategory.trim().toLowerCase();
    
    return sigCat === activeCat;
  });

  const showLoading = accessLoading && !hasAccess;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-foreground transition-colors duration-300">
      <SEO
        title="TREND IS FRIEND - Live Trading Signals | Forex, Crypto, Commodities & Indices"
        description="Get real-time trading signals for Forex, Crypto, Commodities, and Indices."
        keywords="trading signals, forex signals, crypto signals, commodities trading, indices signals, live trading"
        url="https://yourdomain.com"
        structuredData={structuredData}
      />

      <Header
        signals={signals || []}
        activeCategory={activeCategory}
        onCategoryChange={(cat) => setActiveCategory(cat)}
      />

      <main className="flex-1">
        {showLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <section className="relative overflow-hidden px-4 pt-6 pb-5">
              <div className="pointer-events-none absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-primary/8 blur-[110px]" />
              <div className="pointer-events-none absolute top-10 left-0 h-64 w-64 rounded-full bg-blue-500/6 blur-[120px]" />

              <div className="relative mx-auto max-w-7xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight sm:text-5xl text-foreground">
                      LIVE{" "}
                      <span className="bg-gradient-to-r from-primary via-blue-500 to-violet-500 bg-clip-text text-transparent">
                        SIGNALS
                      </span>
                    </h1>

                    <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                      Real-time trading opportunities across all markets
                    </p>

                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        LIVE
                      </span>
                    </div>
                  </div>

                  <div className="hidden h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card/70 shadow-sm backdrop-blur-md sm:flex">
                    <LineChart className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>
            </section>

            <section className="px-4 pb-8">
              <div className="mx-auto max-w-7xl">
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                  <div className="group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-3.5 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-emerald-500/30 hover:shadow-md sm:flex-row sm:items-start sm:gap-3 sm:p-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 sm:h-11 sm:w-11">
                      <Target className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-lg font-black tracking-tight text-foreground sm:text-2xl">
                        85%+
                      </p>
                      <p className="text-[9px] font-medium text-muted-foreground sm:text-xs">
                        Win Rate
                      </p>
                    </div>
                  </div>

                  <div className="group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-3.5 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-blue-500/30 hover:shadow-md sm:flex-row sm:items-start sm:gap-3 sm:p-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 sm:h-11 sm:w-11">
                      <BarChart3 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-lg font-black tracking-tight text-foreground sm:text-2xl">
                        500+
                      </p>
                      <p className="text-[9px] font-medium text-muted-foreground sm:text-xs">
                        Signals/Month
                      </p>
                    </div>
                  </div>

                  <div className="group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-3.5 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-violet-500/30 hover:shadow-md sm:flex-row sm:items-start sm:gap-3 sm:p-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400 sm:h-11 sm:w-11">
                      <Clock className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-lg font-black tracking-tight text-foreground sm:text-2xl">
                        24/7
                      </p>
                      <p className="text-[9px] font-medium text-muted-foreground sm:text-xs">
                        Live Updates
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="px-4 pb-10">
              <div className="mx-auto max-w-7xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      <h2 className="text-lg font-extrabold uppercase tracking-wide text-foreground sm:text-xl">
                        {activeCategory === "All" ? "Live Signals" : `${activeCategory} Signals`}
                      </h2>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Showing available opportunities for {activeCategory}
                    </p>
                  </div>

                  <Link
                    to="/signals"
                    className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="rounded-2xl border border-border/60 bg-card/80 px-8 py-7 text-center shadow-sm backdrop-blur-md">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                      <p className="mt-3 text-xs font-medium text-muted-foreground">
                        Loading signals...
                      </p>
                    </div>
                  </div>
                ) : filteredSignals && filteredSignals.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredSignals.map((signal) => (
                      <SignalCard key={signal.id} signal={signal as any} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/60 bg-card/80 px-6 py-14 text-center shadow-sm backdrop-blur-md">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <BarChart3 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="mt-3 text-base font-bold text-foreground">
                      No signals found
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      There are currently no published signals available in "{activeCategory}".
                    </p>
                  </div>
                )}

                {signals && signals.length > 0 && (
                  <div className="mt-8">
                    <ExnessAffiliateBanner />
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <ExnessPopup />
      <Footer />

      <TrialExpiredModal 
        open={showTrialExpiredModal} 
        onOpenChange={(open) => {
          setShowTrialExpiredModal(open);
          if (!open) {
            navigate("/premium");
          }
        }}
      />
    </div>
  );
};

export default Index;
