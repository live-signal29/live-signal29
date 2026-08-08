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
} from "lucide-react";
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
      getOrganizationStructuredData(),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070914] text-white">

      <SEO
        title="TREND IS FRIEND - Live Trading Signals | Forex, Crypto, Commodities & Indices"
        description="Get real-time trading signals for Forex, Crypto, Commodities, and Indices."
        keywords="trading signals, forex signals, crypto signals, commodities trading, indices signals, live trading"
        url="https://yourdomain.com"
        structuredData={structuredData}
      />

      <Header />

      <main className="flex-1">

        {/* HERO */}
        <section className="relative overflow-hidden px-4 pt-7 pb-5">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">

            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                  Professional Trading
                </p>

                <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">
                  Live{" "}
                  <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-pink-500 bg-clip-text text-transparent">
                    Signals
                  </span>
                </h1>

                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                  <span className="text-sm text-gray-400">
                    Real-time trading opportunities
                  </span>
                </div>
              </div>

              <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] sm:flex">
                <Activity className="h-7 w-7 text-cyan-400" />
              </div>
            </div>

            {/* LIVE MARKET PANEL */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#101426] to-[#080b18] p-5 shadow-2xl">

              <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-cyan-500/[0.05] to-transparent" />

              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
                    ● LIVE
                  </span>

                  <span className="text-xs text-gray-500">
                    Market monitoring
                  </span>
                </div>

                <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight sm:text-5xl">
                  Real-time trading
                  <br />
                  <span className="text-gray-400">
                    opportunities
                  </span>
                </h2>

                <p className="mt-3 max-w-md text-sm text-gray-500">
                  Follow the latest published signals and market setups from
                  your dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORY BAR */}
        <section className="px-4 pb-5">
          <div className="mx-auto max-w-7xl overflow-x-auto">
            <div className="flex min-w-max gap-3 pb-1">

              <button
                type="button"
                className="rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 px-7 py-3 font-bold text-black shadow-lg shadow-purple-500/20"
              >
                All
              </button>

              <button
                type="button"
                className="rounded-full border border-white/10 bg-[#111527] px-6 py-3 font-semibold text-gray-300"
              >
                Gold
              </button>

              <button
                type="button"
                className="rounded-full border border-white/10 bg-[#111527] px-6 py-3 font-semibold text-gray-300"
              >
                Forex
              </button>

              <button
                type="button"
                className="rounded-full border border-white/10 bg-[#111527] px-6 py-3 font-semibold text-gray-300"
              >
                Crypto
              </button>

              <button
                type="button"
                className="rounded-full border border-white/10 bg-[#111527] px-6 py-3 font-semibold text-gray-300"
              >
                Indices
              </button>

              <button
                type="button"
                className="rounded-full border border-white/10 bg-[#111527] px-6 py-3 font-semibold text-gray-300"
              >
                Deriv
              </button>

            </div>
          </div>
        </section>

        {/* REAL DATABASE STATUS */}
        <section className="px-4 pb-6">
          <div className="mx-auto max-w-7xl">

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

              <div className="rounded-3xl border border-white/10 bg-[#101426] p-5">
                <Activity className="mb-3 h-6 w-6 text-green-400" />

                <p className="text-2xl font-black">
                  {isLoading ? "..." : signals?.length ?? 0}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Published signals loaded
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#101426] p-5">
                <Zap className="mb-3 h-6 w-6 text-cyan-400" />

                <p className="text-lg font-black">
                  Live Data
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  From your existing signal database
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#101426] p-5">
                <Target className="mb-3 h-6 w-6 text-purple-400" />

                <p className="text-lg font-black">
                  Published
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Only published signals are displayed
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* SIGNALS */}
        <section className="px-4 pb-9">
          <div className="mx-auto max-w-7xl">

            <div className="mb-5 flex items-end justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />

                  <h2 className="text-2xl font-black">
                    Live Signals
                  </h2>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  Latest published trading opportunities
                </p>
              </div>

              <Link
                to="/signals"
                className="flex items-center gap-1 text-sm font-bold text-purple-400"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>

            </div>

            {isLoading ? (

              <div className="flex items-center justify-center py-20">
                <div className="rounded-3xl border border-white/10 bg-[#101426] p-8 text-center">

                  <Loader2 className="mx-auto h-9 w-9 animate-spin text-cyan-400" />

                  <p className="mt-4 text-sm text-gray-400">
                    Loading signals...
                  </p>

                </div>
              </div>

            ) : signals && signals.length > 0 ? (

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

                {signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-[#101426] shadow-xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/30"
                  >
                    <SignalCard signal={signal as any} />
                  </div>
                ))}

              </div>

            ) : (

              <div className="rounded-3xl border border-white/10 bg-[#101426] px-6 py-16 text-center">

                <BarChart3 className="mx-auto h-10 w-10 text-gray-600" />

                <h3 className="mt-4 text-lg font-bold">
                  No published signals
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  There are currently no published signals available.
                </p>

              </div>

            )}

            {signals && signals.length > 0 && (
              <div className="mt-6">
                <ExnessAffiliateBanner />
              </div>
            )}

          </div>
        </section>

        {/* FEATURES */}
        <section className="px-4 pb-10">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-3xl border border-white/10 bg-[#101426] p-5">
              <TrendingUp className="mb-4 h-6 w-6 text-green-400" />

              <h3 className="font-bold">
                Live Opportunities
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                View currently published trading setups.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#101426] p-5">
              <BarChart3 className="mb-4 h-6 w-6 text-cyan-400" />

              <h3 className="font-bold">
                Market Analysis
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Follow the analysis attached to your signals.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#101426] p-5">
              <Target className="mb-4 h-6 w-6 text-purple-400" />

              <h3 className="font-bold">
                Clear Setups
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Entry, targets and risk information remain inside each signal.
              </p>
            </div>

          </div>
        </section>

      </main>

      <ExnessPopup />
      <Footer />

    </div>
  );
};

export default Index;
