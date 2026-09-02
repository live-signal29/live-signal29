import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// =========================================================
// HELPERS
// =========================================================

const normalizePair = (pair: string): string => {
  const p = String(pair || '').trim().toUpperCase();

  if (
    p.includes('XAU') ||
    p.includes('GOLD')
  ) {
    return 'XAU/USD (Gold)';
  }

  if (
    p.includes('XAG') ||
    p.includes('SILVER')
  ) {
    return 'XAG/USD (Silver)';
  }

  return String(pair || '').trim();
};

const getPriceFromResponse = (
  prices: Record<string, unknown>,
  requestedPair: string
): number => {
  if (!prices || typeof prices !== 'object') {
    return 0;
  }

  const normalized = normalizePair(requestedPair);

  const candidates = [
    requestedPair,
    normalized,

    // Gold aliases
    ...(normalized === 'XAU/USD (Gold)'
      ? [
          'XAU/USD',
          'XAUUSD',
          'XAU',
          'GOLD',
          'GOLD/USD',
          'XAU/USD (GOLD)',
        ]
      : []),

    // Silver aliases
    ...(normalized === 'XAG/USD (Silver)'
      ? [
          'XAG/USD',
          'XAGUSD',
          'XAG',
          'SILVER',
          'SILVER/USD',
          'XAG/USD (SILVER)',
        ]
      : []),
  ];

  for (const key of candidates) {
    const raw = prices[key];

    const numeric =
      typeof raw === 'number'
        ? raw
        : parseFloat(String(raw ?? ''));

    if (
      Number.isFinite(numeric) &&
      numeric > 0
    ) {
      return numeric;
    }
  }

  // Last fallback: case-insensitive key matching
  const wanted = candidates.map((x) =>
    String(x).trim().toUpperCase()
  );

  for (const [key, value] of Object.entries(prices)) {
    if (
      wanted.includes(
        String(key).trim().toUpperCase()
      )
    ) {
      const numeric =
        typeof value === 'number'
          ? value
          : parseFloat(String(value ?? ''));

      if (
        Number.isFinite(numeric) &&
        numeric > 0
      ) {
        return numeric;
      }
    }
  }

  return 0;
};

// =========================================================
// Parse entry price
// Handles:
// 4280
// 4280-4282
// 4280 – 4282
// =========================================================

export const parseEntryPrice = (
  entry: string
): number => {
  if (!entry) return 0;

  const cleaned = entry.replace(
    /[^\d.\-–]/g,
    ''
  );

  const parts = cleaned.split(/[-–]/);

  if (parts.length >= 2) {
    const first = parseFloat(parts[0]);
    const second = parseFloat(parts[1]);

    if (
      Number.isFinite(first) &&
      Number.isFinite(second)
    ) {
      return (first + second) / 2;
    }
  }

  return parseFloat(cleaned) || 0;
};

// =========================================================
// Calculate running P/L
// =========================================================

export const calculateRunningPL = (
  currentPrice: number,
  entryPrice: number,
  signalType: string,
  lotValue: number = 1
): {
  value: number;
  isProfit: boolean;
  formatted: string;
} => {
  if (
    !currentPrice ||
    !entryPrice
  ) {
    return {
      value: 0,
      isProfit: true,
      formatted: '$0',
    };
  }

  const isBuy =
    signalType?.toLowerCase() === 'buy';

  const pl = isBuy
    ? (currentPrice - entryPrice) * lotValue
    : (entryPrice - currentPrice) * lotValue;

  return {
    value: pl,
    isProfit: pl >= 0,
    formatted:
      pl >= 0
        ? `+$${Math.abs(pl).toFixed(0)}`
        : `-$${Math.abs(pl).toFixed(0)}`,
  };
};

// =========================================================
// Check TP / SL
// =========================================================

export const checkTPSLHit = (
  currentPrice: number,
  targetPrice: number,
  signalType: string,
  isSL: boolean = false
): boolean => {
  if (
    !currentPrice ||
    !targetPrice ||
    currentPrice <= 0 ||
    targetPrice <= 0
  ) {
    return false;
  }

  const isBuy =
    signalType?.toLowerCase() === 'buy';

  if (isSL) {
    return isBuy
      ? currentPrice <= targetPrice
      : currentPrice >= targetPrice;
  }

  return isBuy
    ? currentPrice >= targetPrice
    : currentPrice <= targetPrice;
};

// =========================================================
// LIVE PRICES HOOK
// =========================================================

export const useLivePricesFetch = (
  pairs: string[],
  enabled: boolean = true
) => {
  const [prices, setPrices] =
    useState<Record<string, string>>({});

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const intervalRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const failedAttemptsRef =
    useRef(0);

  const retryAfterRef =
    useRef(0);

  // Stable pair list
  const pairsKey = pairs
    .map((pair) =>
      String(pair).trim()
    )
    .filter(Boolean)
    .join('\u0001');

  // =======================================================
  // FETCH
  // =======================================================

  const fetchPrices =
    useCallback(async () => {
      if (
        !enabled ||
        !pairsKey
      ) {
        return;
      }

      if (
        Date.now() <
        retryAfterRef.current
      ) {
        return;
      }

      const requestedPairs =
        pairsKey
          .split('\u0001')
          .map((pair) =>
            pair.trim()
          )
          .filter(Boolean);

      setLoading(true);
      setError(null);

      try {
        /*
         * IMPORTANT:
         *
         * Your Edge Function currently reads:
         *
         * url.searchParams.get("pairs")
         *
         * Supabase invoke body does NOT become
         * a URL query parameter.
         *
         * We therefore send the pairs in the body
         * AND the function should support body fallback.
         */

        const {
          data,
          error: invokeError,
        } =
          await supabase.functions.invoke(
            'fetch-live-prices',
            {
              body: {
                pairs: requestedPairs,
              },
            }
          );

        if (invokeError) {
          throw new Error(
            invokeError.message ||
              'Live price function failed'
          );
        }

        if (!data?.success) {
          throw new Error(
            data?.error ||
              'Live price service failed'
          );
        }

        const responsePrices =
          data?.prices;

        if (
          !responsePrices ||
          typeof responsePrices !==
            'object'
        ) {
          throw new Error(
            'Live price service returned no prices'
          );
        }

        const validPrices: Record<
          string,
          string
        > = {};

        // =================================================
        // MATCH EVERY REQUESTED PAIR
        // INCLUDING XAU/XAG ALIASES
        // =================================================

        for (
          const pair of requestedPairs
        ) {
          const numeric =
            getPriceFromResponse(
              responsePrices,
              pair
            );

          if (
            Number.isFinite(numeric) &&
            numeric > 0
          ) {
            /*
             * IMPORTANT:
             * Store using the ORIGINAL pair name
             * because UI components normally ask
             * for the original symbol.
             */
            validPrices[pair] =
              String(numeric);
          }
        }

        // =================================================
        // ALSO CREATE GOLD/SILVER ALIASES
        // =================================================

        const goldPrice =
          getPriceFromResponse(
            responsePrices,
            'XAU/USD (Gold)'
          );

        const silverPrice =
          getPriceFromResponse(
            responsePrices,
            'XAG/USD (Silver)'
          );

        if (
          Number.isFinite(goldPrice) &&
          goldPrice > 0
        ) {
          validPrices[
            'XAU/USD (Gold)'
          ] =
            String(goldPrice);

          validPrices[
            'XAU/USD'
          ] =
            String(goldPrice);

          validPrices[
            'XAUUSD'
          ] =
            String(goldPrice);
        }

        if (
          Number.isFinite(silverPrice) &&
          silverPrice > 0
        ) {
          validPrices[
            'XAG/USD (Silver)'
          ] =
            String(silverPrice);

          validPrices[
            'XAG/USD'
          ] =
            String(silverPrice);

          validPrices[
            'XAGUSD'
          ] =
            String(silverPrice);
        }

        if (
          Object.keys(validPrices)
            .length === 0
        ) {
          throw new Error(
            'No live prices returned'
          );
        }

        // =================================================
        // UPDATE STATE ONLY IF CHANGED
        // =================================================

        setPrices((previous) => {
          let changed = false;

          const next = {
            ...previous,
          };

          for (
            const [
              pair,
              value,
            ] of Object.entries(
              validPrices
            )) {
            if (
              next[pair] !== value
            ) {
              next[pair] = value;
              changed = true;
            }
          }

          return changed
            ? next
            : previous;
        });

        failedAttemptsRef.current = 0;
        retryAfterRef.current = 0;

      } catch (err) {
        failedAttemptsRef.current++;

        if (
          failedAttemptsRef.current >= 5
        ) {
          retryAfterRef.current =
            Date.now() + 30000;
        }

        if (
          failedAttemptsRef.current <= 2
        ) {
          console.error(
            'Error fetching live prices:',
            err
          );
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Network error'
        );
      } finally {
        setLoading(false);
      }
    }, [
      pairsKey,
      enabled,
    ]);

  // =======================================================
  // POLLING
  // =======================================================

  useEffect(() => {
    if (
      !enabled ||
      !pairsKey
    ) {
      return;
    }

    // Immediate fetch
    const initTimeout =
      setTimeout(
        fetchPrices,
        100
      );

    // Every 1 seconds
    intervalRef.current =
      setInterval(
        fetchPrices,
        1000
      );

    return () => {
      clearTimeout(
        initTimeout
      );

      if (
        intervalRef.current
      ) {
        clearInterval(
          intervalRef.current
        );

        intervalRef.current =
          null;
      }
    };
  }, [
    fetchPrices,
    enabled,
    pairsKey,
  ]);

  return {
    prices,
    loading,
    error,
    refetch: fetchPrices,
  };
};

// =========================================================
// AUTO TP / SL UPDATE
// =========================================================

export const useAutoTPSLUpdate = (
  signalId: string,
  pair: string,
  signalType: string,
  tp1: string | null,
  tp2: string | null,
  tp3: string | null,
  tp4: string | null,
  sl: string | null,
  currentPrice: string | null,
  tp1Hit: boolean,
  tp2Hit: boolean,
  tp3Hit: boolean,
  tp4Hit: boolean,
  slHit: boolean
) => {
  const lastUpdateRef =
    useRef<string>('');

  useEffect(() => {
    if (
      !currentPrice ||
      slHit
    ) {
      return;
    }

    const priceNum =
      parseFloat(currentPrice);

    if (
      !Number.isFinite(priceNum) ||
      priceNum <= 0
    ) {
      return;
    }

    const updates: Record<
      string,
      any
    > = {};

    // TP1
    if (
      !tp1Hit &&
      tp1
    ) {
      const tp1Price =
        parseEntryPrice(tp1);

      if (
        checkTPSLHit(
          priceNum,
          tp1Price,
          signalType,
          false
        )
      ) {
        updates.tp1_hit = true;
      }
    }

    // TP2
    if (
      !tp2Hit &&
      tp2
    ) {
      const tp2Price =
        parseEntryPrice(tp2);

      if (
        checkTPSLHit(
          priceNum,
          tp2Price,
          signalType,
          false
        )
      ) {
        updates.tp2_hit = true;
      }
    }

    // TP3
    if (
      !tp3Hit &&
      tp3
    ) {
      const tp3Price =
        parseEntryPrice(tp3);

      if (
        checkTPSLHit(
          priceNum,
          tp3Price,
          signalType,
          false
        )
      ) {
        updates.tp3_hit = true;
      }
    }

    // TP4
    if (
      !tp4Hit &&
      tp4
    ) {
      const tp4Price =
        parseEntryPrice(tp4);

      if (
        checkTPSLHit(
          priceNum,
          tp4Price,
          signalType,
          false
        )
      ) {
        updates.tp4_hit = true;
      }
    }

    // =====================================================
    // SL
    // =====================================================

    const anyTPHit =
      tp1Hit ||
      tp2Hit ||
      tp3Hit ||
      tp4Hit ||
      updates.tp1_hit ||
      updates.tp2_hit ||
      updates.tp3_hit ||
      updates.tp4_hit;

    if (
      !slHit &&
      sl &&
      !anyTPHit
    ) {
      const slPrice =
        parseEntryPrice(sl);

      if (
        checkTPSLHit(
          priceNum,
          slPrice,
          signalType,
          true
        )
      ) {
        updates.sl_hit = true;
        updates.signal_status =
          'CLOSE';
      }
    }

    // =====================================================
    // DATABASE UPDATE
    // =====================================================

    if (
      Object.keys(updates)
        .length > 0
    ) {
      const updateKey =
        JSON.stringify(updates);

      if (
        lastUpdateRef.current !==
        updateKey
      ) {
        lastUpdateRef.current =
          updateKey;

        supabase
          .from('signals')
          .update(updates)
          .eq(
            'id',
            signalId
          )
          .then(
            ({ error }) => {
              if (error) {
                console.error(
                  'Error updating signal:',
                  error
                );
              }
            }
          );
      }
    }
  }, [
    currentPrice,
    signalId,
    pair,
    signalType,
    tp1,
    tp2,
    tp3,
    tp4,
    sl,
    tp1Hit,
    tp2Hit,
    tp3Hit,
    tp4Hit,
    slHit,
  ]);
};
