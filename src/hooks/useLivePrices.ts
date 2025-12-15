import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  if (!currentPrice || !entryPrice) return { value: 0, isProfit: true, formatted: '$0' };
  const isBuy = signalType?.toLowerCase() === 'buy';
  const pl = isBuy 
    ? (currentPrice - entryPrice) * lotValue
    : (entryPrice - currentPrice) * lotValue;
  
  return {
    value: pl,
    isProfit: pl >= 0,
    formatted: pl >= 0 ? `+$${Math.abs(pl).toFixed(0)}` : `-$${Math.abs(pl).toFixed(0)}`
  };
};

// Check if TP/SL is hit
export const checkTPSLHit = (
  currentPrice: number,
  targetPrice: number,
  signalType: string,
  isSL: boolean = false
): boolean => {
  if (!currentPrice || !targetPrice) return false;
  const isBuy = signalType?.toLowerCase() === 'buy';
  
  if (isSL) {
    return isBuy ? currentPrice <= targetPrice : currentPrice >= targetPrice;
  }
  return isBuy ? currentPrice >= targetPrice : currentPrice <= targetPrice;
};

// Hook to fetch live prices via edge function (avoids CORS issues)
export const useLivePricesFetch = (pairs: string[], enabled: boolean = true) => {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchPrices = useCallback(async () => {
    if (!enabled || pairs.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Call edge function to fetch prices (server-side, no CORS)
      const { data, error: fnError } = await supabase.functions.invoke('fetch-live-prices', {
        body: null,
      });
      
      if (fnError) {
        console.error('Edge function error:', fnError);
        setError('Failed to fetch prices');
        return;
      }
      
      if (data?.prices) {
        setPrices(data.prices);
      }
    } catch (err) {
      console.error('Error fetching live prices:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [pairs, enabled]);
  
  useEffect(() => {
    if (!enabled) return;
    
    // Initial fetch
    fetchPrices();
    
    // Poll every 2 seconds for real-time updates
    intervalRef.current = setInterval(fetchPrices, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrices, enabled]);
  
  return { prices, loading, error, refetch: fetchPrices };
};

// Hook to auto-update TP/SL status
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
  const lastUpdateRef = useRef<string>('');
  
  useEffect(() => {
    if (!currentPrice || slHit) return;
    
    const priceNum = parseFloat(currentPrice);
    if (!priceNum) return;
    
    const updates: Record<string, any> = {};
    
    // Check TP1
    if (!tp1Hit && tp1) {
      const tp1Price = parseEntryPrice(tp1);
      if (checkTPSLHit(priceNum, tp1Price, signalType, false)) {
        updates.tp1_hit = true;
      }
    }
    
    // Check TP2
    if (!tp2Hit && tp2) {
      const tp2Price = parseEntryPrice(tp2);
      if (checkTPSLHit(priceNum, tp2Price, signalType, false)) {
        updates.tp2_hit = true;
      }
    }
    
    // Check TP3
    if (!tp3Hit && tp3) {
      const tp3Price = parseEntryPrice(tp3);
      if (checkTPSLHit(priceNum, tp3Price, signalType, false)) {
        updates.tp3_hit = true;
      }
    }
    
    // Check TP4
    if (!tp4Hit && tp4) {
      const tp4Price = parseEntryPrice(tp4);
      if (checkTPSLHit(priceNum, tp4Price, signalType, false)) {
        updates.tp4_hit = true;
      }
    }
    
    // Check SL
    if (!slHit && sl) {
      const slPrice = parseEntryPrice(sl);
      if (checkTPSLHit(priceNum, slPrice, signalType, true)) {
        updates.sl_hit = true;
        updates.signal_status = 'CLOSE';
      }
    }
    
    // Update database if there are changes
    if (Object.keys(updates).length > 0) {
      const updateKey = JSON.stringify(updates);
      if (lastUpdateRef.current !== updateKey) {
        lastUpdateRef.current = updateKey;
        
        supabase
          .from('signals')
          .update(updates)
          .eq('id', signalId)
          .then(({ error }) => {
            if (error) {
              console.error('Error updating signal:', error);
            }
          });
      }
    }
  }, [currentPrice, signalId, signalType, tp1, tp2, tp3, tp4, sl, tp1Hit, tp2Hit, tp3Hit, tp4Hit, slHit]);
};
