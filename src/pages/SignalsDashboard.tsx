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
import { ExnessPopup } from "@/components/ExnessPopup";
import HeadlineTicker from "@/components/HeadlineTicker";
import { ChartReactions } from "@/components/ChartReactions";
import { StreakStatsRow } from "@/components/StreakStatsRow";

const SIGNALS_PER_PAGE = 20;

const CATEGORIES = [
  "COMMODITIES",
  "FOREX",
  "CRYPTO",
  "DERIV/BINARY",
  "MARKET IDEAS",
];

// Helper: Ticker clean function to ensure "XAU/USD (Gold)" maps correctly to "XAUUSD" for WebSockets
const normalizeSymbolKey = (symbolStr: string): string => {
  if (!symbolStr) return "";

  // Normalize the signal name to ONE canonical key.
  // IMPORTANT: Deriv symbols must keep their numeric suffix.
  // The old code used only the first space-separated word, so:
  // BOOM 500 -> BOOM
  // BOOM 1000 -> BOOM
  // VOL 50 -> VOL
  // VOL 75 -> VOL
  // This caused different Deriv pairs to share the same live price.
  const upper = String(symbolStr)
    .trim()
    .toUpperCase()
    .replace(/_/g, " ");

  const compact = upper.replace(/[^A-Z0-9]/g, "");

  // Forex / Commodities
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

  // Crypto
  if (compact.includes("BTCUSD") || compact.includes("BITCOIN")) return "BTCUSD";
  if (compact.includes("ETHUSD") || compact.includes("ETHEREUM")) return "ETHUSD";
  if (compact.includes("XRPUSD")) return "XRPUSD";
  if (compact.includes("LTCUSD")) return "LTCUSD";
  if (compact.includes("ADAUSD")) return "ADAUSD";
  if (compact.includes("SOLUSD") || compact.includes("SOLANA")) return "SOLUSD";

  // Deriv / Synthetic Indices.
  // Keep the number so every pair gets its own price key.
  if (/BOOM\s*1000/.test(upper) || compact.includes("BOOM1000")) return "BOOM1000";
  if (/BOOM\s*500/.test(upper) || compact.includes("BOOM500")) return "BOOM500";
  if (/CRASH\s*1000/.test(upper) || compact.includes("CRASH1000")) return "CRASH1000";
  if (/CRASH\s*500/.test(upper) || compact.includes("CRASH500")) return "CRASH500";
  if (/VOL(?:ATILITY)?\s*100/.test(upper) || compact.includes("VOLATILITY100") || compact === "V100") return "VOL100";
  if (/VOL(?:ATILITY)?\s*75/.test(upper) || compact.includes("VOLATILITY75") || compact === "V75") return "VOL75";
  if (/VOL(?:ATILITY)?\s*50/.test(upper) || compact.includes("VOLATILITY50") || compact === "V50") return "VOL50";
  if (/VOL(?:ATILITY)?\s*25/.test(upper) || compact.includes("VOLATILITY25") || compact === "V25") return "VOL25";

  // Generic fallback: remove separators, but DO NOT throw away
  // everything after the first space.
  return compact;
};

// Formats time to Real Time 12-Hour format (e.g. 05:02 PM)
const formatExactRealTime = (dateString: string | Date | null | undefined) => {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "hh:mm a");
  } catch (error) {
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

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setMainCategory(category);
    setSubCategory("all");
  };

  // Swipe gesture to change categories on mobile
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

  // Trial expired popup
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

  // Infinite query for signals
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
    enabled: mainCategory !== "MARKET IDEAS",
    staleTime: 0, // Stale time set to 0 for instant live updates
  });

  const allSignals = signalsData?.pages.flatMap((page) => page.data) || [];
  const signals = trialExpired && trialEndDate
    ? allSignals.filter((signal) => new Date(signal.created_at) <= trialEndDate)
    : allSignals;

  // Count open/active signals per category
  const getActiveSignalsCount = (category: string) => {
    if (category === "MARKET IDEAS") return 0;
    return signals?.filter(
      (signal) => signal.main_category === category && signal.signal_status !== "CLOSE"
    ).length || 0;
  };

  // Normalize open signal pairs to ensure API/WebSocket match
  const openSignalPairs = signals
    .filter((signal) => signal.signal_status !== "CLOSE")
    .map((signal) => normalizeSymbolKey(signal.pair))
    .filter((pair, index, arr) => arr.indexOf(pair) === index);

  const { prices: livePrices } = useLivePricesFetch(openSignalPairs, openSignalPairs.length > 0);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("signals-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Chart analysis + market ideas
  const { data: chartAnalysis, isLoading: isLoadingCharts } = useQuery({
    queryKey: ["chart-analysis-and-ideas"],
    queryFn: async () => {
      const [charts, ideas] = await Promise.all([
        supabase.from("chart_analysis").select("*").eq("published", true).order("created_at", { ascending: false }).limit(30),
        supabase.from("market_ideas").select("*").eq("published", true).order("created_at", { ascending: false }).limit(30),
      ]);
      if (charts.error) throw charts.error;
      if (ideas.error) throw ideas.error;
      const merged = [...(charts.data || []), ...(ideas.data || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return merged;
    },
    enabled: mainCategory === "MARKET IDEAS",
    staleTime: 60000,
  });

  const openLightbox = (index: number) => {
    setSelectedChartIndex(index);
    setLightboxOpen(true);
  };

  // Category tabs config
  const categoryTabs = [
    { key: "COMMODITIES", label: "Gold" },
    { key: "FOREX", label: "Forex" },
    { key: "CRYPTO", label: "Crypto" },
    { key: "DERIV/BINARY", label: "Deriv" },
    { key: "MARKET IDEAS", label: "Ideas" },
  ];

  return (
    <div className="min-h-screen flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <SEO
        title="Live Signals Dashboard - Real-time Trading Signals"
        description="Access real-time trading signals for Forex, Crypto, Commodities, and Indices."
        keywords="live signals dashboard, trading signals, forex signals live, crypto signals real-time"
        url="https://yourdomain.com/signals-dashboard"
        structuredData={breadcrumbData}
      />

      <Header />

      <HeadlineTicker />

      <main className="flex-1">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">

          <TrialExpiredPopup open={showTrialExpiredPopup} onClose={() => setShowTrialExpiredPopup(false)} />

          {/* Category Tabs */}
          <div className="mb-4">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {categoryTabs.map((tab) => {
                const isActive = mainCategory === tab.key;
                const activeCount = getActiveSignalsCount(tab.key);
                const hasActiveSignals = activeCount > 0;

                return (
                  <button
                    key={tab.key}
                    onClick={() => handleCategoryChange(tab.key)}
                    className={cn(
                      "relative flex items-center gap-1.5 px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-200",
                      "border-2",
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>{tab.label}</span>

                    {hasActiveSignals && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                      </span>
                    )}

                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top Ad */}
          {subscriptionStatus !== "premium" && (
            <div className="mb-4">
              <AdBanner />
            </div>
          )}

          {/* Subcategory Filter */}
          {mainCategory !== "MARKET IDEAS" && subCategoryOptions[mainCategory] && (
            <div className="mb-4">
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full sm:w-[200px] rounded-md border border-border/70 bg-muted/60 px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Pairs</option>
                {subCategoryOptions[mainCategory].map((pair) => (
                  <option key={pair} value={pair}>
                    {pair}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Market Ideas */}
          {mainCategory === "MARKET IDEAS" && (
            <>
              {isLoadingCharts ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {chartAnalysis?.map((analysis, index) => {
                    const hasImage = !!analysis.image_url && String(analysis.image_url).trim() !== "";
                    const displayTime = formatExactRealTime(analysis.created_at);

                    return (
                      <Card key={analysis.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
                        {hasImage && (
                          <div
                            className="relative aspect-video w-full overflow-hidden bg-muted cursor-pointer"
                            onClick={() => openLightbox(index)}
                          >
                            <img
                              src={analysis.image_url}
                              alt={analysis.title || "Trading idea chart"}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/15 transition-colors duration-300 flex items-center justify-center">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/90 hover:bg-background"
                              >
                                <Maximize2 className="h-5 w-5 text-foreground" />
                              </Button>
                            </div>
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          {analysis.title && <CardTitle className="text-lg group-hover:text-primary transition-colors">{analysis.title}</CardTitle>}
                          <p className="text-xs text-muted-foreground">{displayTime}</p>
                        </CardHeader>
                        {analysis.description && (
                          <CardContent className="pt-0 pb-2">
                            <p className="text-sm text-muted-foreground line-clamp-2">{analysis.description}</p>
                          </CardContent>
                        )}
                        <CardContent className="pt-2 border-t border-border/50">
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
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">No chart analysis available</p>
                </div>
              )}
            </>
          )}

          {/* Signals */}
          {mainCategory !== "MARKET IDEAS" && (
            <>
              {isLoading ? (
                <SignalsSkeleton />
              ) : (
                <div className="space-y-6">
                  {signals && signals.length > 0 ? (
                    (() => {
                      const groupedSignals: { [key: string]: typeof signals } = {};
                      signals.forEach((signal) => {
                        const date = startOfDay(new Date(signal.created_at)).toISOString();
                        if (!groupedSignals[date]) groupedSignals[date] = [];
                        groupedSignals[date].push(signal);
                      });

                      return Object.entries(groupedSignals).map(([date, daySignals]) => (
                        <div key={date}>
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                              {daySignals.map((signal, i) => {
                                const key = normalizeSymbolKey(signal.pair);
                                const currentLivePrice = livePrices[key] ? parseFloat(livePrices[key]) : undefined;

                                return (
                                  <React.Fragment key={signal.id}>
                                    <SignalCardNew
                                      signal={signal as any}
                                      hasAccess={hasAccess}
                                      subscriptionStatus={subscriptionStatus}
                                      livePrice={currentLivePrice}
                                    />
                                    {(i + 1) % 3 === 0 && (
                                      <div className="md:col-span-2">
                                        <AffiliateBannerCarousel />
                                      </div>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    <div className="text-center py-20">
                      <p className="text-muted-foreground text-lg">No signals found</p>
                    </div>
                  )}
                  <div ref={loadMoreRef} className="py-8 flex justify-center">
                    {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                    {!hasNextPage && signals.length > 0 && (
                      <p className="text-muted-foreground text-sm">All signals loaded</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Stats */}
          <div className="mt-3">
            <StreakStatsRow />
          </div>

          {/* Bottom Ad */}
          {subscriptionStatus !== "premium" && (
            <div className="mt-6">
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
