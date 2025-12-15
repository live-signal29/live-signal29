import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LivePriceData {
  price: number;
  timestamp: Date;
}

interface UseLivePricesReturn {
  prices: Record<string, LivePriceData>;
  isLoading: boolean;
  error: string | null;
}

// Parse entry price (handles ranges like "4280-4278" or single values)
export const parseEntryPrice = (entry: string): number => {
  if (!entry) return 0;
  
  // Remove any non-numeric characters except dots and dashes
  const cleaned = entry.replace(/[^\d.\-–]/g, '');
  
  // Check for range format (e.g., "4280-4278" or "4280–4278")
  const rangeParts = cleaned.split(/[-–]/);
  if (rangeParts.length >= 2) {
    // Return the average of the range
    const high = parseFloat(rangeParts[0]);
    const low = parseFloat(rangeParts[1]);
    if (!isNaN(high) && !isNaN(low)) {
      return (high + low) / 2;
    }
  }
  
  // Single value
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Calculate running P/L for a signal
export const calculateRunningPL = (
  currentPrice: number,
  entryPrice: number,
  signalType: 'Buy' | 'Sell',
  lotValue: number = 100 // Default lot value for XAU/USD (1 lot = $100 per pip)
): { value: number; formatted: string; isProfit: boolean } => {
  if (!currentPrice || !entryPrice) {
    return { value: 0, formatted: '$0', isProfit: true };
  }

  let pips: number;
  
  // For XAU/USD, 1 pip = 0.1 (or $0.10 per 0.01 lot)
  if (signalType === 'Buy') {
    pips = (currentPrice - entryPrice) * 10; // Convert to pips
  } else {
    pips = (entryPrice - currentPrice) * 10;
  }
  
  const plValue = pips * lotValue;
  const isProfit = plValue >= 0;
  const formatted = isProfit 
    ? `+$${Math.abs(plValue).toFixed(0)}`
    : `-$${Math.abs(plValue).toFixed(0)}`;
    
  return { value: plValue, formatted, isProfit };
};

// Check if TP/SL is hit
export const checkTPSLHit = (
  currentPrice: number,
  targetPrice: number,
  signalType: 'Buy' | 'Sell',
  isSL: boolean = false
): boolean => {
  if (!currentPrice || !targetPrice) return false;
  
  if (signalType === 'Buy') {
    if (isSL) {
      return currentPrice <= targetPrice; // SL hit if price goes below
    }
    return currentPrice >= targetPrice; // TP hit if price goes above
  } else {
    // Sell signal
    if (isSL) {
      return currentPrice >= targetPrice; // SL hit if price goes above
    }
    return currentPrice <= targetPrice; // TP hit if price goes below
  }
};

export const useLivePrices = (pairs: string[]): UseLivePricesReturn => {
  const [prices, setPrices] = useState<Record<string, LivePriceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchPrices = useCallback(async () => {
    if (pairs.length === 0) {
      setIsLoading(false);
      return;
    }
    
    try {
      // Use free forex API for live prices
      const newPrices: Record<string, LivePriceData> = {};
      
      for (const pair of pairs) {
        const cleanPair = pair.replace('/', '').toUpperCase();
        
        // XAU/USD (Gold) handling
        if (cleanPair.includes('XAU') || cleanPair.includes('GOLD')) {
          try {
            // Try multiple gold price sources
            const response = await fetch(
              'https://api.metals.live/v1/spot/gold',
              { signal: AbortSignal.timeout(5000) }
            );
            
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data) && data.length > 0 && data[0].price) {
                newPrices[pair] = {
                  price: parseFloat(data[0].price),
                  timestamp: new Date()
                };
              }
            }
          } catch (e) {
            // Fallback: try alternative API
            try {
              const fallbackResponse = await fetch(
                'https://www.goldapi.io/api/XAU/USD',
                { 
                  headers: { 'x-access-token': 'goldapi-demo' },
                  signal: AbortSignal.timeout(5000) 
                }
              );
              
              if (fallbackResponse.ok) {
                const data = await fallbackResponse.json();
                if (data.price) {
                  newPrices[pair] = {
                    price: data.price,
                    timestamp: new Date()
                  };
                }
              }
            } catch {
              console.log('Gold price fetch failed for', pair);
            }
          }
          continue;
        }
        
        // Regular forex pairs
        if (cleanPair.length >= 6) {
          const base = cleanPair.substring(0, 3);
          const quote = cleanPair.substring(3, 6);
          
          try {
            const response = await fetch(
              `https://api.exchangerate.host/live?access_key=demo&source=${base}&currencies=${quote}`,
              { signal: AbortSignal.timeout(5000) }
            );
            
            if (response.ok) {
              const data = await response.json();
              const key = `${base}${quote}`;
              if (data.quotes && data.quotes[key]) {
                newPrices[pair] = {
                  price: data.quotes[key],
                  timestamp: new Date()
                };
              }
            }
          } catch (e) {
            console.log(`Price fetch failed for ${pair}`);
          }
        }
      }
      
      if (Object.keys(newPrices).length > 0) {
        setPrices(prev => ({ ...prev, ...newPrices }));
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching live prices:', err);
      setError('Failed to fetch live prices');
    } finally {
      setIsLoading(false);
    }
  }, [pairs]);
  
  useEffect(() => {
    // Initial fetch
    fetchPrices();
    
    // Set up interval for updates (every 2 seconds)
    intervalRef.current = setInterval(fetchPrices, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrices]);
  
  return { prices, isLoading, error };
};

// Hook to auto-update TP/SL hits in database
export const useAutoTPSLUpdate = (
  signalId: string,
  currentPrice: number,
  signal: {
    type: 'Buy' | 'Sell';
    tp1: string;
    tp2?: string;
    tp3?: string;
    tp4?: string;
    sl: string;
    tp1_hit: boolean;
    tp2_hit: boolean;
    tp3_hit: boolean;
    tp4_hit: boolean;
    sl_hit?: boolean;
    signal_status?: string;
  }
) => {
  const lastUpdateRef = useRef<string>('');
  
  useEffect(() => {
    if (!currentPrice || signal.signal_status === 'CLOSE' || signal.sl_hit) {
      return;
    }
    
    const updateTPSL = async () => {
      const updates: Record<string, boolean | string> = {};
      
      // Check TP1
      if (!signal.tp1_hit && signal.tp1) {
        const tp1Price = parseEntryPrice(signal.tp1);
        if (checkTPSLHit(currentPrice, tp1Price, signal.type)) {
          updates.tp1_hit = true;
        }
      }
      
      // Check TP2
      if (!signal.tp2_hit && signal.tp2) {
        const tp2Price = parseEntryPrice(signal.tp2);
        if (checkTPSLHit(currentPrice, tp2Price, signal.type)) {
          updates.tp2_hit = true;
        }
      }
      
      // Check TP3
      if (!signal.tp3_hit && signal.tp3) {
        const tp3Price = parseEntryPrice(signal.tp3);
        if (checkTPSLHit(currentPrice, tp3Price, signal.type)) {
          updates.tp3_hit = true;
        }
      }
      
      // Check TP4
      if (!signal.tp4_hit && signal.tp4) {
        const tp4Price = parseEntryPrice(signal.tp4);
        if (checkTPSLHit(currentPrice, tp4Price, signal.type)) {
          updates.tp4_hit = true;
        }
      }
      
      // Check SL
      if (!signal.sl_hit && signal.sl) {
        const slPrice = parseEntryPrice(signal.sl);
        if (checkTPSLHit(currentPrice, slPrice, signal.type, true)) {
          updates.sl_hit = true;
          updates.signal_status = 'CLOSE';
        }
      }
      
      // Only update if there are changes and different from last update
      if (Object.keys(updates).length > 0) {
        const updateKey = JSON.stringify(updates);
        if (lastUpdateRef.current !== updateKey) {
          lastUpdateRef.current = updateKey;
          
          try {
            const { error } = await supabase
              .from('signals')
              .update(updates)
              .eq('id', signalId);
              
            if (error) {
              console.error('Failed to update TP/SL status:', error);
            }
          } catch (err) {
            console.error('Error updating signal:', err);
          }
        }
      }
    };
    
    updateTPSL();
  }, [currentPrice, signalId, signal]);
};
