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
import SignalsSkeleton from "@/components/SignalsSkeleton";
import { useLivePricesFetch } from "@/hooks/useLivePrices";
import ChartLightbox from "@/components/ChartLightbox";
import { startOfDay, formatDistanceToNow } from "date-fns";
import { AffiliateBannerCarousel } from "@/components/AffiliateBannerCarousel";
import { ExnessPopup } from "@/components/ExnessPopup";
import HeadlineTicker from "@/components/HeadlineTicker";
import { ChartReactions } from "@/components/ChartReactions";
import { StreakStatsRow } from "@/components/StreakStatsRow";
import { LiveDashboardHeader } from "@/components/LiveDashboardHeader";

const SIGNALS_PER_PAGE = 20;

const CATEGORIES = [
  "COMMODITIES",
  "FOREX",
  "CRYPTO",
  "DERIV/BINARY",
  "MARKET IDEAS",
];

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

  // Mobile swipe gesture to switch categories
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
    {
      name: "Live Signals Dashboard",
      url: "https://yourdomain.com/signals-dashboard",
    },
  ]);

  // Infinite query for signals using RPC function
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
      try {
        const { data, error } = await supabase.rpc("get_signals_filtered", {
          p_main_category: mainCategory,
          p_sub_category: subCategory || "all",
          p_limit: SIGNALS_PER_PAGE,
          p_offset: pageParam * SIGNALS_PER_PAGE,
        });

        if (error) {
          console.error("RPC Error:", error);
          return { data: [], nextPage: undefined };
        }

        return {
          data: Array.isArray(data) ? data : [],
          nextPage:
            (data?.length || 0) === SIGNALS_PER_PAGE
              ? pageParam + 1
              : undefined,
        };
      } catch (err) {
        console.error("Query Exception:", err);
        return { data: [], nextPage: undefined };
      }
    },
    getNextPageParam: (lastPage) => lastPage?.nextPage,
    initialPageParam: 0,
    enabled: mainCategory !== "MARKET IDEAS",
    staleTime: 60000,
  });

  const allSignals =
    signalsData?.pages?.flatMap((page) => page?.data || []) || [];

  const signals =
    trialExpired && trialEndDate
      ? allSignals.filter(
          (signal) =>
            signal?.created_at && new Date(signal.created_at) <= trialEndDate
        )
      : allSignals;

  const openSignalPairs = (signals || [])
    .filter((s) => s && s.signal_status !== "CLOSE")
    .map((s) => s?.pair)
    .filter((pair): pair is string => Boolean(pair))
    .filter((pair, index, arr) => arr.indexOf(pair) === index);

  const { prices: livePrices = {} } = useLivePricesFetch(
    openSignalPairs,
    openSignalPairs.length > 0
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel("signals-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "signals",
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
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

  const { data: chartAnalysis = [], isLoading: isLoadingCharts } = useQuery({
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

      const merged = [
        ...(charts.data || []),
        ...(ideas.data || []),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return merged;
    },
    enabled: mainCategory === "MARKET IDEAS",
    staleTime: 120000,
  });

  const openLightbox = (index: number) => {
    setSelectedChartIndex(index);
    setLightboxOpen(true);
  };

  const handleCategoryChangeFromHeader = (catKey: string) => {
    setMainCategory(catKey);
    setSubCategory("all");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
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

      {/* Header with category change listener */}
      <Header
        activeCategory={mainCategory}
        onCategoryChange={handleCategoryChangeFromHeader}
      />

      <HeadlineTicker />

      <main className="flex-1">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">
          <TrialExpiredPopup
            open={showTrialExpiredPopup}
            onClose={() => setShowTrialExpiredPopup(false)}
          />

          <div className="mb-3">
            <LiveDashboardHeader />
          </div>

          {subscriptionStatus !== "premium" && (
            <div className="mb-4">
              <AdBanner />
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
                    const hasImage =
                      !!analysis?.image_url &&
                      String(analysis.image_url).trim() !== "";
                    const timeAgo = analysis?.created_at
                      ? formatDistanceToNow(new Date(analysis.created_at), {
                          addSuffix: true,
                        })
                      : "";

                    return (
                      <Card
                        key={analysis.id || index}
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
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
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
                          <p className="text-xs text-muted-foreground">
                            {timeAgo}
                          </p>
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

              {chartAnalysis && chartAnalysis.length > 0 && (
                <ChartLightbox
                  isOpen={lightboxOpen}
                  onClose={() => setLightboxOpen(false)}
                  charts={chartAnalysis}
                  initialIndex={selectedChartIndex}
                />
              )}

              {!isLoadingCharts &&
                (!chartAnalysis || chartAnalysis.length === 0) && (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground text-lg">
                      No chart analysis available
                    </p>
                  </div>
                )}
            </>
          )}

          {/* Signals View */}
          {mainCategory !== "MARKET IDEAS" && (
            <>
              {isLoading ? (
                <SignalsSkeleton />
              ) : (
                <div className="space-y-6">
                  {signals && signals.length > 0
                    ? (() => {
                        const groupedSignals: Record<
                          string,
                          typeof signals
                        > = {};

                        signals.forEach((signal) => {
                          if (!signal?.created_at) return;
                          const date = startOfDay(
                            new Date(signal.created_at)
                          ).toISOString();

                          if (!groupedSignals[date]) {
                            groupedSignals[date] = [];
                          }
                          groupedSignals[date].push(signal);
                        });

                        return Object.entries(groupedSignals).map(
                          ([date, daySignals]) => (
                            <div key={date} className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                                {daySignals.map((signal, i) => (
                                  <React.Fragment key={signal.id || i}>
                                    <SignalCardNew
                                      signal={signal as any}
                                      hasAccess={hasAccess}
                                      subscriptionStatus={subscriptionStatus}
                                      livePrice={
                                        signal?.pair && livePrices[signal.pair]
                                          ? parseFloat(livePrices[signal.pair])
                                          : undefined
                                      }
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
                          )
                        );
                      })()
                    : null}

                  <div ref={loadMoreRef} className="py-8 flex justify-center">
                    {isFetchingNextPage && (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    )}
                    {!hasNextPage && signals.length > 0 && (
                      <p className="text-muted-foreground text-sm">
                        All signals loaded
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!isLoading && (!signals || signals.length === 0) && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">
                    No signals found
                  </p>
                </div>
              )}
            </>
          )}

          <div className="mt-3">
            <StreakStatsRow />
          </div>

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
