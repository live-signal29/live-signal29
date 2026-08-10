import React, { useState, useEffect, useCallback, useRef } from "react";
// 1. keepPreviousData import karein
import { useQuery, useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignalCardNew from "@/components/SignalCardNew";
// ... baqi imports same rhenge

// ... code ...

  // Infinite query update:
  const {
    data: signalsData,
    isLoading,
    isFetching, // isFetching check kr skte hain halka loading indicator dikhane ke liye
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
    // 2. THIS FIXES THE LOADING SPINNER ON TAB SWITCH:
    placeholderData: keepPreviousData,
  });

// ... baqi component code ...
