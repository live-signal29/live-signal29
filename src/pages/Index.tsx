import { useState } from "react";
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
  Activity,
  Zap,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Target,
  Clock,
  ShieldCheck,
  LineChart,
} from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("All");

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

  const categories = ["All", "Gold", "Forex", "Crypto", "Indices", "Deriv"];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      getWebsiteStructuredData(),
      getOrganizationStructuredData(),
    ],
  };

  const filteredSignals = signals?.filter((signal) => {
    if (activeCategory === "All") return true;
    return signal.category?.toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#05070e] text-white selection:bg-purple-500 selection:text-white">

      <SEO
        title="TREND IS FRIEND - Live Trading Signals | Forex, Crypto, Commodities & Indices"
        description="Get real-time trading signals for Forex, Crypto, Commodities, and Indices."
        keywords="trading signals, forex signals, crypto signals, commodities trading, indices signals, live trading"
        url="https://yourdomain.com"
        structuredData={structuredData}
      />

      <Header />

      <main className="flex-1">

        {/* HERO SECTION WITH CANDLESTICK GRAPH BACKDROP */}
        <section className="relative overflow-hidden px-4 pt-6 pb-4">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-1/4 h-64 w-64 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
          <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

          <div className="relative mx-auto max-w-7xl">

            {/* Title & Subtitle */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                  LIVE{" "}
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                    SIGNALS
                  </span>
                </h1>

                <p className="mt-1 text-xs sm:text-sm font-medium text-slate-400">
                  Real-time trading opportunities across all markets
                </p>

                <div className="mt-2.5 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                </div>
              </div>

              {/* Decorative Chart Accent */}
              <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-xl">
                <LineChart className="h-8 w-8 text-amber-400" />
              </div>
            </div>

          </div>
        </section>

        {/* CATEGORY FILTER PILLS */}
        <section className="px-4 pb-6">
          <div className="mx-auto max-w-7xl overflow-x-auto no-scrollbar">
            <div className="flex min-w-max gap-2.5 pb-2">
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    type="button"
                    className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/30"
                        : "border border-white/[0.08] bg-[#0d111d] text-slate-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* STATS OVERVIEW BAR (Image Matching) */}
        <section className="px-4 pb-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">

              {/* Win Rate */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#0c0f18]/80 p-3.5 sm:p-5 backdrop-blur-md">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-lg sm:text-2xl font-black text-white">85%+</p>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400">Win Rate</p>
                </div>
              </div>

              {/* Signals Count */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#0c0f18]/80 p-3.5 sm:p-5 backdrop-blur-md">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-lg sm:text-2xl font-black text-white">500+</p>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400">Signals/Month</p>
                </div>
              </div>

              {/* Live Updates */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#0c0f18]/80 p-3.5 sm:p-5 backdrop-blur-md">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-lg sm:text-2xl font-black text-white">24/7</p>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400">Live Updates</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SIGNALS CARDS SECTION */}
        <section className="px-4 pb-10">
          <div className="mx-auto max-w-7xl">

            {/* Header Title */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-wide text-white uppercase">
                    Live Signals
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Latest published trading opportunities
                </p>
              </div>

              <Link
                to="/signals"
                className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Signals Content */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0f18] p-8 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-400" />
                  <p className="mt-3 text-xs text-slate-400">Loading live signals...</p>
                </div>
              </div>
            ) : filteredSignals && filteredSignals.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal as any} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0f18] px-6 py-14 text-center">
                <BarChart3 className="mx-auto h-10 w-10 text-slate-600" />
                <h3 className="mt-3 text-base font-bold text-white">No signals found</h3>
                <p className="mt-1 text-xs text-slate-400">
                  There are currently no signals available for "{activeCategory}".
                </p>
              </div>
            )}

            {/* Affiliate Banner */}
            {signals && signals.length > 0 && (
              <div className="mt-8">
                <ExnessAffiliateBanner />
              </div>
            )}

          </div>
        </section>

      </main>

      <ExnessPopup />
      <Footer />

    </div>
  );
};

export default Index;
