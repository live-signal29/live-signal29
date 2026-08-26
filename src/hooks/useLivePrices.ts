import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Retry helper for VPN/proxy compatibility
const fetchWithRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
};

// Parse entry price (handles ranges like "4280-4282" or single values)
export const parseEntryPrice = (entry: string): number => {
  if (!entry) return 0;

  const cleaned = entry.replace(/[^\d.\-–]/g, '');
  const parts = cleaned.split(/[-–]/);

  if (parts.length >= 2) {
    return (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
  }

  return parseFloat(cleaned) || 0;
};

// Calculate running P/L
export const calculateRunningPL = (
  currentPrice: number,
  entryPrice: number,
  signalType: string,
  lotValue: number = 1
): { value: number; isProfit: boolean; formatted: string } => {
  if (!currentPrice || !entryPrice) {
    return {
      value: 0,
      isProfit: true,
      formatted: '$0'
    };
  }

  const isBuy = signalType?.toLowerCase() === 'buy';

  const pl = isBuy
    ? (currentPrice - entryPrice) * lotValue
    : (entryPrice - currentPrice) * lotValue;

  return {
    value: pl,
    isProfit: pl >= 0,
    formatted:
      pl >= 0
        ? `+$${Math.abs(pl).toFixed(0)}`
        : `-$${Math.abs(pl).toFixed(0)}`
  };
};

// Check if TP/SL is hit
// BUY: TP hit when price >= TP, SL hit when price <= SL
// SELL: TP hit when price <= TP, SL hit when price >= SL
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

  const isBuy = signalType?.toLowerCase() === 'buy';

  if (isSL) {
    if (isBuy) {
      return currentPrice <= targetPrice;
    } else {
      return currentPrice >= targetPrice;
    }
  }

  if (isBuy) {
    return currentPrice >= targetPrice;
  } else {
    return currentPrice <= targetPrice;
  }
};

// Hook to fetch live prices via edge function
export const useLivePricesFetch = (
  pairs: string[],
  enabled: boolean = true
) => {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failedAttemptsRef = useRef(0);
  const retryAfterRef = useRef(0);

  /*
   * IMPORTANT:
   * `pairs` can be recreated on every render.
   * Using the array directly in useEffect causes the polling
   * interval to restart repeatedly.
   *
   * Convert the pairs into one stable string key instead.
   */
  const pairsKey = pairs
    .map((pair) => String(pair).trim())
    .filter(Boolean)
    .join('\u0001');

  const fetchPrices = useCallback(async () => {
    if (!enabled || !pairsKey) return;

    if (Date.now() < retryAfterRef.current) return;

    const requestedPairs = pairsKey
      .split('\u0001')
      .map((pair) => pair.trim())
      .filter(Boolean);

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } =
        await supabase.functions.invoke(
          'fetch-live-prices',
          {
            body: {
              pairs: requestedPairs
            }
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
            'MT5 live price service failed'
        );
      }

      const nextPrices = data?.prices;

      if (
        !nextPrices ||
        typeof nextPrices !== 'object'
      ) {
        throw new Error(
          'MT5 returned no prices'
        );
      }

      const validPrices: Record<string, string> = {};

      for (const pair of requestedPairs) {
        const raw = nextPrices[pair];

        const numeric =
          typeof raw === 'number'
            ? raw
            : parseFloat(
                String(raw ?? '')
              );

        if (
          Number.isFinite(numeric) &&
          numeric > 0
        ) {
          validPrices[pair] = String(raw);
        }
      }

      if (
        Object.keys(validPrices).length === 0
      ) {
        throw new Error(
          'MT5 returned no live prices for the requested pairs'
        );
      }

      setPrices((prev) => {
        let changed = false;

        const next = {
          ...prev
        };

        for (const [
          pair,
          value
        ] of Object.entries(validPrices)) {
          if (next[pair] !== value) {
            next[pair] = value;
            changed = true;
          }
        }

        return changed ? next : prev;
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
  }, [pairsKey, enabled]);

  useEffect(() => {
    if (!enabled || !pairsKey) return;

    // Fetch immediately after mount/pair change.
    const initTimeout = setTimeout(
      fetchPrices,
      250
    );

    /*
     * Real 3-second polling.
     * Stable pairsKey prevents the interval
     * from restarting on every render.
     */
    intervalRef.current =
      setInterval(
        fetchPrices,
        3000
      );

    return () => {
      clearTimeout(initTimeout);

      if (intervalRef.current) {
        clearInterval(
          intervalRef.current
        );

        intervalRef.current = null;
      }
    };
  }, [
    fetchPrices,
    enabled,
    pairsKey
  ]);

  return {
    prices,
    loading,
    error,
    refetch: fetchPrices
  };
};

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
    if (!currentPrice || slHit) return;

    const priceNum =
      parseFloat(currentPrice);

    if (!priceNum) return;

    const updates: Record<
      string,
      any
    > = {};

    // Check TP1
    if (!tp1Hit && tp1) {
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

    // Check TP2
    if (!tp2Hit && tp2) {
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

    // Check TP3
    if (!tp3Hit && tp3) {
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

    // Check TP4
    if (!tp4Hit && tp4) {
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

    /*
     * SL:
     * Only trigger if no TP has been hit.
     */
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

    // Update database if there are changes
    if (
      Object.keys(updates).length > 0
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
          .then(({ error }) => {
            if (error) {
              console.error(
                'Error updating signal:',
                error
              );
            }
          });
      }
    }
  }, [
    currentPrice,
    signalId,
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
    slHit
  ]);
};
