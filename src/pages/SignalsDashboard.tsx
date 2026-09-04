import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignalCardNew from "@/components/SignalCardNew";
import AdBanner from "@/components/AdBanner";
import SEO from "@/components/SEO";
import { getBreadcrumbStructuredData } from "@/components/StructuredData";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Maximize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TrialExpiredPopup from "@/components/TrialExpiredPopup";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { cn } from "@/lib/utils";
import SignalsSkeleton from "@/components/SignalsSkeleton";
import { useLivePricesFetch } from "@/hooks/useLivePrices";
import ChartLightbox from "@/components/ChartLightbox";
import { startOfDay, format } from "date-fns";
import { AffiliateBannerCarousel } from "@/components/AffiliateBannerCarousel";
import { MT5CopierBanner } from "@/components/MT5CopierBanner";
import { CopierLeaderboard } from "@/components/CopierLeaderboard";
import { ExnessPopup } from "@/components/ExnessPopup";
import HeadlineTicker from "@/components/HeadlineTicker";
import { ChartReactions } from "@/components/ChartReactions";

const SIGNALS_PER_PAGE = 20;
const SIGNALS_REFRESH_MS = 5000;
const MARKET_IDEAS_REFRESH_MS = 30000;

const CATEGORIES = [
  "COMMODITIES",
  "FOREX",
  "CRYPTO",
  "DERIV/BINARY",
  "COPIER",
];

const normalizeSymbolKey = (symbolStr: string): string => {
  if (!symbolStr) return "";
  const upper = String(symbolStr).trim().toUpperCase().replace(/_/g, " ");
  const compact = upper.replace(/[^A-Z0-9]/g, "");

  if (compact.includes("XAUUSD") || compact.includes("GOLD")) return "XAUUSD";
  if (compact.includes("XAGUSD") || compact.includes("SILVER")) return "XAGUSD";

  if (compact.includes("EURUSD")) return "EURUSD";
  if (compact.includes("GBPUSD")) return "GBPUSD";
  if (compact.includes("USDJPY")) return "USDJPY";
  if (compact.includes("CHFJPY")) return "CHFJPY";
  if (compact.includes("CADJPY")) return "CADJPY";
  if (compact.includes("AUDUSD")) return "AUDUSD";
  if (compact.includes("NZDUSD")) return "NZDUSD";
  if (compact.includes("USDCAD")) return "USDCAD";
  if (compact.includes("USDCHF")) return "USDCHF";

  if (compact.includes("BTCUSD") || compact.includes("BITCOIN")) return "BTCUSD";
  if (compact.includes("ETHUSD") || compact.includes("ETHEREUM")) return "ETHUSD";
  if (compact.includes("XRPUSD")) return "XRPUSD";
  if (compact.includes("LTCUSD")) return "LTCUSD";
  if (compact.includes("ADAUSD")) return "ADAUSD";
  if (compact.includes("SOLUSD") || compact.includes("SOLANA")) return "SOLUSD";

  if (/BOOM\s*1000/.test(upper) || compact.includes("BOOM1000")) return "BOOM1000";
  if (/BOOM\s*500/.test(upper) || compact.includes("BOOM500")) return "BOOM500";
  if (/CRASH\s*1000/.test(upper) || compact.includes("CRASH1000")) return "CRASH1000";
  if (/CRASH\s*500/.test(upper) || compact.includes("CRASH500")) return "CRASH500";
  if (/VOL(?:ATILITY)?\s*100/.test(upper) || compact.includes("VOLATILITY100") || compact === "V100") return "VOL100";
  if (/VOL(?:ATILITY)?\s*75/.test(upper) || compact.includes("VOLATILITY75") || compact === "V75") return "VOL75";
  if (/VOL(?:ATILITY)?\s*50/.test(upper) || compact.includes("VOLATILITY50") || compact === "V50") return "VOL50";
  if (/VOL(?:ATILITY)?\s*25/.test(upper) || compact.includes("VOLATILITY25") || compact === "V25") return "VOL25";

  return compact;
};

const formatExactRealTime = (dateString: string | Date | null | undefined) => {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "hh:mm a");
  } catch {
    return "";
  }
};

const SignalsDashboard = () => {
  const {
    hasAccess,
    subscriptionStatus,
    trialExpired,
    trialEndDate,
  } = useSubscriptionAccess();

  const [mainCategory, setMainCategory] = useState("COMMODITIES");
  const [subCategory, setSubCategory] = useState<string>("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedChartIndex, setSelectedChartIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [showTrialExpiredPopup, setShowTrialExpiredPopup] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleCategoryChange = (category: string) => {
    setMainCategory(category);
    setSubCategory("all");
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      touchStartX.current = null;
      touchStartY.current = null;

      if (Math.abs(deltaX) > 80 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        const currentIndex = CATEGORIES.indexOf(mainCategory);

        if (deltaX < 0 && currentIndex < CATEGORIES.length - 1) {
          setMainCategory(CATEGORIES[currentIndex + 1]);
          setSubCategory("all");
        } else if (deltaX > 0 && currentIndex > 0) {
          setMainCategory(CATEGORIES[currentIndex - 1]);
          setSubCategory("all");
        }
      }
    },
    [mainCategory]
  );

  useEffect(() => {
    if (trialExpired && subscriptionStatus === "free_trial") {
      setShowTrialExpiredPopup(true);
    }
  }, [trialExpired, subscriptionStatus]);

  const breadcrumbData = getBreadcrumbStructuredData([
    { name: "Home", url: "https://yourdomain.com" },
    { name: "Live Signals Dashboard", url: "https://yourdomain.com/signals-dashboard" },
  ]);

  const subCategoryOptions: Record<string, string[]> = {
    FOREX: ["EUR/USD", "GBP/USD", "USD/JPY", "CHF/JPY", "CAD/JPY", "AUD/USD", "NZD/USD", "USD/CAD", "USD/CHF"],
    COMMODITIES: ["XAU/USD (Gold)", "XAG/USD (Silver)", "Oil - Crude", "Oil - Brent", "Natural Gas", "US30", "NASDAQ", "S&P500", "DAX", "FTSE100", "Nikkei"],
    CRYPTO: ["BTC/USD", "ETH/USD", "XRP/USD", "LTC/USD", "ADA/USD", "SOL/USD"],
    "DERIV/BINARY": ["BOOM 1000", "BOOM 500", "CRASH 1000", "CRASH 500", "VOL 75", "VOL 100"],
  };

  const {
    data: signalsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["signals-infinite", mainCategory, subCategory],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc("get_signals_filtered", {
        p_main_category: mainCategory,
        p_sub_category: subCategory || "all",
        p_limit: SIGNALS_PER_PAGE,
        p_offset: pageParam * SIGNALS_PER_PAGE,
      });

      if (error) throw error;

      return {
        data: data || [],
        nextPage: (data?.length || 0) === SIGNALS_PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: mainCategory !== "MARKET IDEAS" && mainCategory !== "COPIER",
    refetchInterval: SIGNALS_REFRESH_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  const allSignals = signalsData?.pages.flatMap((page) => page.data) || [];

  const signals =
    trialExpired && trialEndDate
      ? allSignals.filter((signal) => new Date(signal.created_at) <= trialEndDate)
      : allSignals;

  const getActiveSignalsCount = (category: string) => {
    if (category === "MARKET IDEAS" || category === "COPIER") return 0;
    return (
      signals?.filter(
        (signal) => signal.main_category === category && signal.signal_status !== "CLOSE"
      ).length || 0
    );
  };

  const openSignalPairs = signals
    .filter((signal) => signal.signal_status !== "CLOSE")
    .map((signal) => normalizeSymbolKey(signal.pair))
    .filter(Boolean)
    .filter((pair, index, arr) => arr.indexOf(pair) === index);

  const { prices: livePrices } = useLivePricesFetch(
    openSignalPairs,
    openSignalPairs.length > 0
  );

  useEffect(() => {
    const channel = supabase
      .channel(`signals-dashboard-${mainCategory}-${subCategory}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, mainCategory, subCategory]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refetch]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: chartAnalysis, isLoading: isLoadingCharts } = useQuery({
    queryKey: ["chart-analysis-and-ideas"],
    queryFn: async () => {
      const [charts, ideas] = await Promise.all([
        supabase.from("chart_analysis").select("*").eq("published", true).order("created_at", { ascending: false }).limit(30),
        supabase.from("market_ideas").select("*").eq("published", true).order("created_at", { ascending: false }).limit(30),
      ]);

      if (charts.error) throw charts.error;
      if (ideas.error) throw ideas.error;

      return [...(charts.data || []), ...(ideas.data || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: mainCategory === "MARKET IDEAS",
    refetchInterval: MARKET_IDEAS_REFRESH_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  const openLightbox = (index: number) => {
    setSelectedChartIndex(index);
    setLightboxOpen(true);
  };

  const categoryTabs = [
    { key: "COMMODITIES", label: "Gold" },
    { key: "FOREX", label: "Forex" },
    { key: "CRYPTO", label: "Crypto" },
    { key: "DERIV/BINARY", label: "Deriv" },
    { key: "COPIER", label: "Copier" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col bg-[#070a0f] text-slate-100 font-sans selection:bg-[#00ffb3]/30 selection:text-[#00ffb3]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <SEO
        title="Live Signals Dashboard - Real-time Trading Signals"
        description="Access real-time trading signals for Forex, Crypto, Commodities, and Indices."
        keywords="live signals dashboard, trading signals, forex signals live, crypto signals real-time"
        url="https://yourdomain.com/signals-dashboard"
        structuredData={breadcrumbData}
      />

      <Header />
      <HeadlineTicker />

      <main className="flex-1 pb-12">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl space-y-4">
          <TrialExpiredPopup
            open={showTrialExpiredPopup}
            onClose={() => setShowTrialExpiredPopup(false)}
          />

          {/* NEON CATEGORY PILLS */}
          <div className="w-full overflow-x-auto scrollbar-hide py-1">
            <div className="flex gap-2 min-w-max">
              {categoryTabs.map((tab) => {
                const isActive = mainCategory === tab.key;
                const activeCount = getActiveSignalsCount(tab.key);
                const hasActiveSignals = activeCount > 0;

                return (
                  <button
                    key={tab.key}
                    onClick={() => handleCategoryChange(tab.key)}
                    className={cn(
                      "relative flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold rounded-2xl transition-all duration-300 border backdrop-blur-md",
                      isActive
                        ? "bg-[#062c21] text-[#00ffb3] border-[#00e599] shadow-[0_0_20px_rgba(0,229,153,0.35)]"
                        : "bg-[#0e1622]/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                    )}
                  >
                    <span>{tab.label}</span>
                    {hasActiveSignals && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffb3] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e599]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <MT5CopierBanner />

          <div key={mainCategory} className="animate-fade-slide-in space-y-4">
            {/* TOP AD */}
            {subscriptionStatus !== "premium" && (
              <div>
                <AdBanner />
              </div>
            )}

            {/* SUBCATEGORY SELECTOR */}
            {mainCategory !== "MARKET IDEAS" &&
              mainCategory !== "COPIER" &&
              subCategoryOptions[mainCategory] && (
                <div className="relative w-full sm:w-[220px]">
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-800 bg-[#0e1622] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 shadow-lg focus:outline-none focus:border-[#00e599]/60 transition-all cursor-pointer"
                  >
                    <option value="all">All Pairs</option>
                    {subCategoryOptions[mainCategory].map((pair) => (
                      <option key={pair} value={pair} className="bg-[#0e1622] text-slate-200">
                        {pair}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              )}

            {/* MARKET IDEAS */}
            {mainCategory === "MARKET IDEAS" && (
              <>
                {isLoadingCharts ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-[#00e599]" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chartAnalysis?.map((analysis, index) => {
                      const hasImage = !!analysis.image_url && String(analysis.image_url).trim() !== "";
                      const displayTime = formatExactRealTime(analysis.created_at);

                      return (
                        <Card
                          key={analysis.id}
                          className="group overflow-hidden rounded-2xl bg-[#0e1622] border border-slate-800 hover:border-[#00e599]/40 shadow-xl transition-all duration-300"
                        >
                          {hasImage && (
                            <div
                              className="relative aspect-video w-full overflow-hidden bg-slate-950 cursor-pointer"
                              onClick={() => openLightbox(index)}
                            >
                              <img
                                src={analysis.image_url}
                                alt={analysis.title || "Trading idea chart"}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="bg-[#0e1622] border border-slate-700 text-slate-100"
                                >
                                  <Maximize2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}

                          <CardHeader className="p-4 pb-2">
                            {analysis.title && (
                              <CardTitle className="text-base font-bold text-slate-100 group-hover:text-[#00e599] transition-colors">
                                {analysis.title}
                              </CardTitle>
                            )}
                            <p className="text-xs text-slate-400">{displayTime}</p>
                          </CardHeader>

                          {analysis.description && (
                            <CardContent className="px-4 pt-0 pb-3">
                              <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
                                {analysis.description}
                              </p>
                            </CardContent>
                          )}

                          <CardContent className="px-4 py-2.5 border-t border-slate-800/80 bg-[#070a0f]">
                            <ChartReactions chartId={analysis.id} />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {chartAnalysis && chartAnalysis.length > 0 && (
                  <ChartLightbox
                    isOpen={lightboxOpen}
                    onClose={() => setLightboxOpen(false)}
                    charts={chartAnalysis}
                    initialIndex={selectedChartIndex}
                  />
                )}

                {!isLoadingCharts && chartAnalysis?.length === 0 && (
                  <div className="text-center py-20 bg-[#0e1622]/60 rounded-2xl border border-slate-800">
                    <p className="text-slate-400 text-sm font-medium">No chart analysis available</p>
                  </div>
                )}
              </>
            )}

            {/* COPIER */}
            {mainCategory === "COPIER" && <CopierLeaderboard />}

            {/* SIGNALS LIST */}
            {mainCategory !== "MARKET IDEAS" && mainCategory !== "COPIER" && (
              <>
                {isLoading ? (
                  <SignalsSkeleton />
                ) : (
                  <div className="space-y-4">
                    {signals && signals.length > 0 ? (
                      (() => {
                        const groupedSignals: { [key: string]: typeof signals } = {};

                        signals.forEach((signal) => {
                          const date = startOfDay(new Date(signal.created_at)).toISOString();
                          if (!groupedSignals[date]) groupedSignals[date] = [];
                          groupedSignals[date].push(signal);
                        });

                        let globalSignalIndex = 0;

                        return Object.entries(groupedSignals).map(([date, daySignals]) => (
                          <div key={date}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                              {daySignals.map((signal) => {
                                const key = normalizeSymbolKey(signal.pair);
                                const currentLivePrice = livePrices[key]
                                  ? parseFloat(livePrices[key])
                                  : undefined;

                                globalSignalIndex += 1;
                                const showBanner = globalSignalIndex % 3 === 0;

                                return (
                                  <React.Fragment key={signal.id}>
                                    <SignalCardNew
                                      signal={signal as any}
                                      hasAccess={hasAccess}
                                      subscriptionStatus={subscriptionStatus}
                                      livePrice={currentLivePrice}
                                    />

                                    {showBanner && (
                                      <div className="md:col-span-2 my-1">
                                        <AffiliateBannerCarousel />
                                      </div>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()
                    ) : (
                      <div className="text-center py-20 bg-[#0e1622]/60 rounded-2xl border border-slate-800">
                        <p className="text-slate-400 text-sm font-medium">No signals found</p>
                      </div>
                    )}

                    <div ref={loadMoreRef} className="py-6 flex justify-center">
                      {isFetchingNextPage && (
                        <Loader2 className="h-6 w-6 animate-spin text-[#00e599]" />
                      )}

                      {!hasNextPage && signals.length > 0 && (
                        <p className="text-slate-500 text-xs font-medium">All signals loaded</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* BOTTOM AD */}
          {subscriptionStatus !== "premium" && (
            <div className="mt-4">
              <AdBanner />
            </div>
          )}
        </div>
      </main>

      <ExnessPopup />
      <Footer />
    </div>
  );
};

export default SignalsDashboard;
