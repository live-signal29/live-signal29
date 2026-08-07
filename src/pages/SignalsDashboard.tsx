import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignalCardNew from "@/components/SignalCardNew";
import AdBanner from "@/components/AdBanner";
import SEO from "@/components/SEO";
import { getBreadcrumbStructuredData } from "@/components/StructuredData";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Coins, Bitcoin, BarChart3, LineChart, Maximize2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TrialExpiredPopup from "@/components/TrialExpiredPopup";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { cn } from "@/lib/utils";
import SignalsSkeleton from "@/components/SignalsSkeleton";
import { useLivePricesFetch } from "@/hooks/useLivePrices";
import ChartLightbox from "@/components/ChartLightbox";
import { differenceInDays, startOfDay, formatDistanceToNow } from "date-fns";
import { AffiliateBannerCarousel } from "@/components/AffiliateBannerCarousel";
import { ExnessPopup } from "@/components/ExnessPopup";
import HeadlineTicker from "@/components/HeadlineTicker";
import { ChartReactions } from "@/components/ChartReactions";
import { StreakStatsRow } from "@/components/StreakStatsRow";
import { LiveDashboardHeader } from "@/components/LiveDashboardHeader";




const SIGNALS_PER_PAGE = 20;

const CATEGORIES = ["COMMODITIES", "FOREX", "CRYPTO", "DERIV/BINARY", "MARKET IDEAS"];

const SignalsDashboard = () => {
  const { hasAccess, loading: accessLoading, subscriptionStatus, trialExpired, trialEndDate } = useSubscriptionAccess();
  const [mainCategory, setMainCategory] = useState("COMMODITIES");
  const [subCategory, setSubCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "closed">("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedChartIndex, setSelectedChartIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [showTrialExpiredPopup, setShowTrialExpiredPopup] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Swipe gesture to change categories on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Only trigger if horizontal swipe is dominant and > 80px
    if (Math.abs(deltaX) > 80 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const currentIndex = CATEGORIES.indexOf(mainCategory);
      if (deltaX < 0 && currentIndex < CATEGORIES.length - 1) {
        // Swipe left → next category
        setMainCategory(CATEGORIES[currentIndex + 1]);
        setSubCategory("all");
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe right → previous category
        setMainCategory(CATEGORIES[currentIndex - 1]);
        setSubCategory("all");
      }
    }
  }, [mainCategory]);

  // Show trial expired popup every time dashboard opens for expired trial users
  useEffect(() => {
    if (trialExpired && subscriptionStatus === 'free_trial') {
      setShowTrialExpiredPopup(true);
    }
  }, [trialExpired, subscriptionStatus]);

  const breadcrumbData = getBreadcrumbStructuredData([
    { name: "Home", url: "https://yourdomain.com" },
    { name: "Live Signals Dashboard", url: "https://yourdomain.com/signals-dashboard" }
  ]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "FOREX": return <TrendingUp className="h-4 w-4" />;
      case "COMMODITIES": return <Coins className="h-4 w-4" />;
      case "CRYPTO": return <Bitcoin className="h-4 w-4" />;
      case "DERIV/BINARY": return <BarChart3 className="h-4 w-4" />;
      case "MARKET IDEAS": return <LineChart className="h-4 w-4" />;
      default: return null;
    }
  };

  const subCategoryOptions: Record<string, string[]> = {
    FOREX: ["EUR/USD", "GBP/USD", "USD/JPY", "CHF/JPY", "CAD/JPY", "AUD/USD", "NZD/USD", "USD/CAD", "USD/CHF"],
    COMMODITIES: ["XAU/USD (Gold)", "XAG/USD (Silver)", "Oil - Crude", "Oil - Brent", "Natural Gas", "US30", "NASDAQ", "S&P500", "DAX", "FTSE100", "Nikkei"],
    CRYPTO: ["BTC/USD", "ETH/USD", "XRP/USD", "LTC/USD", "ADA/USD", "SOL/USD"],
    "DERIV/BINARY": ["BOOM 1000", "BOOM 500", "CRASH 1000", "CRASH 500", "VOL 75", "VOL 100"],
  };

  // Infinite query for signals using secure RPC function
  const {
    data: signalsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ["signals-infinite", mainCategory, subCategory],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_signals_filtered', {
        p_main_category: mainCategory,
        p_sub_category: subCategory || 'all',
        p_limit: SIGNALS_PER_PAGE,
        p_offset: pageParam * SIGNALS_PER_PAGE
      });

      if (error) throw error;
      return { data: data || [], nextPage: (data?.length || 0) === SIGNALS_PER_PAGE ? pageParam + 1 : undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: mainCategory !== "MARKET IDEAS",
    staleTime: 60000,
  });

  // Filter signals for expired trial users - only show signals created during trial period
  const allSignals = signalsData?.pages.flatMap(page => page.data) || [];
  const signals = trialExpired && trialEndDate 
    ? allSignals.filter(signal => new Date(signal.created_at) <= trialEndDate)
    : allSignals;
  
  // Extract unique pairs for OPEN signals to fetch live prices
  const openSignalPairs = signals
    .filter(s => s.signal_status !== 'CLOSE')
    .map(s => s.pair)
    .filter((pair, index, arr) => arr.indexOf(pair) === index);
  
  // Fetch live prices for open signals
  const { prices: livePrices } = useLivePricesFetch(openSignalPairs, openSignalPairs.length > 0);

  // Setup realtime subscription for instant updates (deferred for performance)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel('signals-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'signals',
          },
          () => {
            refetch();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [refetch]);

  // Infinite scroll observer
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

  const { data: chartAnalysis, isLoading: isLoadingCharts } = useQuery({
    queryKey: ["chart-analysis-and-ideas"],
    queryFn: async () => {
      const [charts, ideas] = await Promise.all([
        supabase
          .from("chart_analysis")
          .select("*")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("market_ideas")
          .select("*")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (charts.error) throw charts.error;
      if (ideas.error) throw ideas.error;
      const merged = [
        ...(charts.data || []),
        ...(ideas.data || []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return merged;
    },
    enabled: mainCategory === "MARKET IDEAS",
    staleTime: 120000,
  });

  const openLightbox = (index: number) => {
    setSelectedChartIndex(index);
    setLightboxOpen(true);
  };

  const handleCategoryChange = (category: string) => {
    setMainCategory(category);
    setSubCategory("all");
  };

  // Removed blocking loading screen - show content immediately

  return (
    <div 
      className="min-h-screen flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <SEO
        title="Live Signals Dashboard - Real-time Trading Signals"
        description="Access real-time trading signals for Forex, Crypto, Commodities, and Indices. Get instant notifications, professional analysis, and high-accuracy signals."
        keywords="live signals dashboard, trading signals, forex signals live, crypto signals real-time, commodities trading, indices signals"
        url="https://yourdomain.com/signals-dashboard"
        structuredData={breadcrumbData}
      />
      <Header />
      
      {/* Headline Ticker - below header */}
      <HeadlineTicker />
      
      <main className="flex-1">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">
          {/* Trial Expired Popup - shows every time for expired trial users */}
          <TrialExpiredPopup 
            open={showTrialExpiredPopup} 
            onClose={() => setShowTrialExpiredPopup(false)} 
          />

          {/* Compact live gold banner + real-time stats */}
          <div className="mb-3">
            <LiveDashboardHeader />
          </div>





          {/* Top Ad Banner - Only for non-premium users */}
          {subscriptionStatus !== 'premium' && (
            <div className="mb-4">
              <AdBanner />
            </div>
          )}

          {/* Main Dashboard Content - always accessible */}
          <>

           {/* Main Category Tabs — 3D glowing pills */}
          <div className="mb-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {[
                { key: "COMMODITIES", label: "Gold" },
                { key: "FOREX", label: "Forex" },
                { key: "CRYPTO", label: "Crypto" },
                { key: "DERIV/BINARY", label: "Deriv" },
                { key: "MARKET IDEAS", label: "Ideas" },
              ].map((category, i) => {
                const isActive = mainCategory === category.key;
                const signalCount =
                  isActive && mainCategory !== "MARKET IDEAS" ? signals?.length : undefined;
                const isGold = category.key === "COMMODITIES";
                return (
                  <button
                    key={category.key}
                    onClick={() => handleCategoryChange(category.key)}
                    className={cn(
                      "animate-rise-in flex-shrink-0 rounded-full border px-4 py-1.5 text-[11.5px] font-bold whitespace-nowrap",
                      "transition-all duration-200 active:scale-95",
                      i === 1 && "stagger-1",
                      i === 2 && "stagger-2",
                      i === 3 && "stagger-3",
                      i === 4 && "stagger-4",
                      isActive
                        ? isGold
                          ? "border-transparent text-warning-foreground bg-gradient-to-br from-warning to-affiliate shadow-[0_6px_18px_-6px_hsl(var(--affiliate)/0.7),0_0_18px_hsl(var(--affiliate)/0.45)]"
                          : "border-transparent text-primary-foreground bg-gradient-to-br from-primary via-primary-glow to-accent shadow-[0_6px_18px_-6px_hsl(var(--glow-primary)/0.8),0_0_18px_hsl(var(--glow-primary)/0.45)]"
                        : "border-border/70 bg-muted/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                    )}
                  >
                    {category.label}
                    {signalCount !== undefined && signalCount > 0 && ` ${signalCount}`}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Status filter — Active / Pending / Closed */}
          {mainCategory !== "MARKET IDEAS" && (
            <div className="mb-3 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {(() => {
                const lifecycle = (s: any) => (s.signal_status || s.status || "open").toLowerCase();
                const list: any[] = signals || [];
                const counts = {
                  all: list.length,
                  active: list.filter((s) => lifecycle(s) === "open").length,
                  pending: list.filter((s) => lifecycle(s) === "pending").length,
                  closed: list.filter((s) => lifecycle(s) === "close").length,
                };
                const tabs = [
                  { key: "all" as const, label: "All", dot: "bg-primary" },
                  { key: "active" as const, label: "Active", dot: "bg-success" },
                  { key: "pending" as const, label: "Pending", dot: "bg-warning" },
                  { key: "closed" as const, label: "Closed", dot: "bg-muted-foreground" },
                ];
                return tabs.map((t) => {
                  const on = statusFilter === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setStatusFilter(t.key)}
                      className={cn(
                        "flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95",
                        on
                          ? t.key === "active"
                            ? "border-success/60 bg-success/15 text-success shadow-[0_0_16px_-4px_hsl(var(--success)/0.6)]"
                            : t.key === "pending"
                            ? "border-warning/60 bg-warning/15 text-warning"
                            : t.key === "closed"
                            ? "border-border bg-muted text-foreground"
                            : "border-primary/60 bg-primary/15 text-primary shadow-[0_0_16px_-4px_hsl(var(--glow-primary)/0.7)]"
                          : "border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          t.dot,
                          t.key === "active" && "animate-pulse"
                        )}
                      />
                      {t.label}
                      <span className="tabular-nums opacity-70">{counts[t.key]}</span>
                    </button>
                  );
                });
              })()}
            </div>
          )}


          {/* Market Ideas View */}
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
                    const timeAgo = formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true });

                    return (
                      <Card
                        key={analysis.id}
                        className="group overflow-hidden hover:shadow-xl transition-all duration-300"
                      >
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
                          {analysis.title && (
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {analysis.title}
                            </CardTitle>
                          )}
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </CardHeader>

                        {analysis.description && (
                          <CardContent className="pt-0 pb-2">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {analysis.description}
                            </p>
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

              {/* Chart Lightbox */}
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

          {/* Signals View with Day Separators */}
          {mainCategory !== "MARKET IDEAS" && (
            <>
              {isLoading ? (
                <SignalsSkeleton />
              ) : (
                <div className="space-y-6">
                  {signals && signals.length > 0 && (() => {
                    const lifecycle = (s: any) =>
                      (s.signal_status || s.status || "open").toLowerCase();
                    const filteredSignals =
                      statusFilter === "all"
                        ? signals
                        : signals.filter((s: any) =>
                            statusFilter === "active"
                              ? lifecycle(s) === "open"
                              : statusFilter === "pending"
                              ? lifecycle(s) === "pending"
                              : lifecycle(s) === "close"
                          );

                    if (filteredSignals.length === 0) {
                      return (
                        <div className="text-center py-20">
                          <p className="text-muted-foreground text-lg">
                            No {statusFilter === "all" ? "" : statusFilter} signals found
                          </p>
                        </div>
                      );
                    }


                    const groupedSignals: { [key: string]: typeof filteredSignals } = {};
                    filteredSignals.forEach((signal) => {
                      const date = startOfDay(new Date(signal.created_at)).toISOString();
                      if (!groupedSignals[date]) {
                        groupedSignals[date] = [];
                      }
                      groupedSignals[date].push(signal);
                    });

                    const dateEntries = Object.entries(groupedSignals);
                    
                    return dateEntries.map(([date, daySignals]) => (
                      <div key={date}>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                            {daySignals.map((signal, i) => (
                              <React.Fragment key={signal.id}>
                                <SignalCardNew
                                  signal={signal as any}
                                  hasAccess={hasAccess}
                                  subscriptionStatus={subscriptionStatus}
                                  livePrice={livePrices[signal.pair] ? parseFloat(livePrices[signal.pair]) : undefined}
                                />
                                {(i + 1) % 3 === 0 && (
                                  <div className="md:col-span-2">
                                    <AffiliateBannerCarousel />
                                  </div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>
                    ));

                  })()}
                  
                  {/* Infinite scroll loader */}
                  <div ref={loadMoreRef} className="py-8 flex justify-center">
                    {isFetchingNextPage && (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    )}
                    {!hasNextPage && signals.length > 0 && (
                      <p className="text-muted-foreground text-sm">All signals loaded</p>
                    )}
                  </div>
                </div>
              )}

              {!isLoading && signals?.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">No signals found</p>
                </div>
              )}
            </>
          )}

          {/* Streak + next signal + today pips */}
          <div className="mt-3">
            <StreakStatsRow />
          </div>



          {/* Bottom Ad Banner - Only for non-premium users */}
          {subscriptionStatus !== 'premium' && (
            <div className="mt-6">
              <AdBanner />
            </div>
          )}
          </>
        
        </div>
      </main>

      <ExnessPopup />
      <Footer />
    </div>
  );
};

export default SignalsDashboard;
