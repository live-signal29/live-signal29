// Signal text parser utility

export interface ParsedSignal {
  pair: string;
  type: "Buy" | "Sell";
  entry: string;
  sl: string;
  tp1: string;
  tp2?: string;
  tp3?: string;
  tp4?: string;
  isValid: boolean;
  error?: string;
}

// Common symbol mappings
const symbolMappings: Record<string, string> = {
  'gold': 'XAU/USD (Gold)',
  'xauusd': 'XAU/USD (Gold)',
  'xau/usd': 'XAU/USD (Gold)',
  'silver': 'XAG/USD (Silver)',
  'xagusd': 'XAG/USD (Silver)',
  'xag/usd': 'XAG/USD (Silver)',
  'eurusd': 'EUR/USD',
  'eur/usd': 'EUR/USD',
  'gbpusd': 'GBP/USD',
  'gbp/usd': 'GBP/USD',
  'usdjpy': 'USD/JPY',
  'usd/jpy': 'USD/JPY',
  'btcusd': 'BTC/USD',
  'btc/usd': 'BTC/USD',
  'btc': 'BTC/USD',
  'ethusd': 'ETH/USD',
  'eth/usd': 'ETH/USD',
  'eth': 'ETH/USD',
  'audusd': 'AUD/USD',
  'aud/usd': 'AUD/USD',
  'nzdusd': 'NZD/USD',
  'nzd/usd': 'NZD/USD',
  'usdcad': 'USD/CAD',
  'usd/cad': 'USD/CAD',
  'usdchf': 'USD/CHF',
  'usd/chf': 'USD/CHF',
  'chfjpy': 'CHF/JPY',
  'chf/jpy': 'CHF/JPY',
  'cadjpy': 'CAD/JPY',
  'cad/jpy': 'CAD/JPY',
  'oil': 'Oil - Crude',
  'crude': 'Oil - Crude',
  'brent': 'Oil - Brent',
  'us30': 'US30',
  'nasdaq': 'NASDAQ',
  'nas100': 'NASDAQ',
  'spx500': 'S&P500',
  'sp500': 'S&P500',
  's&p500': 'S&P500',
  'boom1000': 'BOOM 1000',
  'boom500': 'BOOM 500',
  'crash1000': 'CRASH 1000',
  'crash500': 'CRASH 500',
  'v75': 'VOL 75',
  'vol75': 'VOL 75',
  'v100': 'VOL 100',
  'vol100': 'VOL 100',
};

// Get category from symbol
export const getCategoryFromSymbol = (symbol: string): string => {
  const lowerSymbol = symbol.toLowerCase();
  
  // COMMODITIES
  if (lowerSymbol.includes('xau') || lowerSymbol.includes('gold') || 
      lowerSymbol.includes('xag') || lowerSymbol.includes('silver') ||
      lowerSymbol.includes('oil') || lowerSymbol.includes('crude') || 
      lowerSymbol.includes('brent') || lowerSymbol.includes('gas') ||
      lowerSymbol.includes('us30') || lowerSymbol.includes('nasdaq') ||
      lowerSymbol.includes('spx') || lowerSymbol.includes('s&p') ||
      lowerSymbol.includes('dax') || lowerSymbol.includes('ftse') ||
      lowerSymbol.includes('nikkei')) {
    return 'COMMODITIES';
  }
  
  // CRYPTO
  if (lowerSymbol.includes('btc') || lowerSymbol.includes('eth') ||
      lowerSymbol.includes('xrp') || lowerSymbol.includes('ltc') ||
      lowerSymbol.includes('ada') || lowerSymbol.includes('sol') ||
      lowerSymbol.includes('doge') || lowerSymbol.includes('bnb')) {
    return 'CRYPTO';
  }
  
  // DERIV/BINARY
  if (lowerSymbol.includes('boom') || lowerSymbol.includes('crash') ||
      lowerSymbol.includes('vol') || lowerSymbol.includes('v75') ||
      lowerSymbol.includes('v100')) {
    return 'DERIV/BINARY';
  }
  
  // Default to FOREX
  return 'FOREX';
};

export const parseSignalText = (text: string): ParsedSignal => {
  const result: ParsedSignal = {
    pair: '',
    type: 'Buy',
    entry: '',
    sl: '',
    tp1: '',
    isValid: false,
  };

  if (!text || text.trim().length === 0) {
    result.error = 'Empty signal text';
    return result;
  }

  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fullText = text.toLowerCase();

  // Detect Buy/Sell type
  if (fullText.includes('buy') || fullText.includes('long')) {
    result.type = 'Buy';
  } else if (fullText.includes('sell') || fullText.includes('short')) {
    result.type = 'Sell';
  }

  // Regex patterns for price extraction
  const pricePattern = /[\d]+\.?\d*/g;
  const entryPatterns = [
    /entry[:\s]*(\d+\.?\d*)/i,
    /enter[:\s]*(\d+\.?\d*)/i,
    /price[:\s]*(\d+\.?\d*)/i,
    /ep[:\s]*(\d+\.?\d*)/i,
    /@\s*(\d+\.?\d*)/i,
  ];
  
  const slPatterns = [
    /sl[:\s]*(\d+\.?\d*)/i,
    /stop\s*loss[:\s]*(\d+\.?\d*)/i,
    /stoploss[:\s]*(\d+\.?\d*)/i,
  ];
  
  const tpPatterns = [
    /tp\s*1[:\s]*(\d+\.?\d*)/i,
    /tp1[:\s]*(\d+\.?\d*)/i,
    /take\s*profit\s*1[:\s]*(\d+\.?\d*)/i,
    /target\s*1[:\s]*(\d+\.?\d*)/i,
  ];
  
  const tp2Patterns = [
    /tp\s*2[:\s]*(\d+\.?\d*)/i,
    /tp2[:\s]*(\d+\.?\d*)/i,
    /take\s*profit\s*2[:\s]*(\d+\.?\d*)/i,
    /target\s*2[:\s]*(\d+\.?\d*)/i,
  ];
  
  const tp3Patterns = [
    /tp\s*3[:\s]*(\d+\.?\d*)/i,
    /tp3[:\s]*(\d+\.?\d*)/i,
    /take\s*profit\s*3[:\s]*(\d+\.?\d*)/i,
    /target\s*3[:\s]*(\d+\.?\d*)/i,
  ];

  const tp4Patterns = [
    /tp\s*4[:\s]*(\d+\.?\d*)/i,
    /tp4[:\s]*(\d+\.?\d*)/i,
    /take\s*profit\s*4[:\s]*(\d+\.?\d*)/i,
    /target\s*4[:\s]*(\d+\.?\d*)/i,
  ];

  // Try to extract symbol from first line
  // Common formats: "#Gold BUY 4467", "XAUUSD BUY", "Gold Buy @ 2650"
  const firstLine = lines[0] || '';
  
  // Remove common prefixes like #, @
  const cleanFirstLine = firstLine.replace(/^[#@\s]+/, '');
  
  // Try to find symbol in first line
  const words = cleanFirstLine.split(/[\s,@]+/);
  for (const word of words) {
    const lowerWord = word.toLowerCase().replace(/[^a-z0-9\/]/g, '');
    if (symbolMappings[lowerWord]) {
      result.pair = symbolMappings[lowerWord];
      break;
    }
    // Check if it looks like a forex pair
    if (/^[a-z]{6}$/i.test(lowerWord) || /^[a-z]{3}\/[a-z]{3}$/i.test(word)) {
      result.pair = word.toUpperCase();
      break;
    }
  }

  // If no symbol found, try to extract from the whole text
  if (!result.pair) {
    for (const [key, value] of Object.entries(symbolMappings)) {
      if (fullText.includes(key)) {
        result.pair = value;
        break;
      }
    }
  }

  // Extract Entry price
  // First try to find in first line after Buy/Sell
  const firstLineMatch = firstLine.match(/(buy|sell)\s+(\d+\.?\d*)/i);
  if (firstLineMatch) {
    result.entry = firstLineMatch[2];
  } else {
    // Try patterns
    for (const pattern of entryPatterns) {
      const match = fullText.match(pattern);
      if (match) {
        result.entry = match[1];
        break;
      }
    }
  }

  // If still no entry, try to find price in first line
  if (!result.entry) {
    const pricesInFirstLine = firstLine.match(pricePattern);
    if (pricesInFirstLine && pricesInFirstLine.length > 0) {
      // Get the last price in first line (usually entry comes after symbol)
      result.entry = pricesInFirstLine[pricesInFirstLine.length - 1];
    }
  }

  // Extract SL
  for (const pattern of slPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      result.sl = match[1];
      break;
    }
  }

  // Extract TPs
  for (const pattern of tpPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      result.tp1 = match[1];
      break;
    }
  }

  // If no TP1 found, look for generic TP pattern
  if (!result.tp1) {
    const tpGenericMatch = fullText.match(/tp[:\s]*(\d+\.?\d*)/i);
    if (tpGenericMatch) {
      result.tp1 = tpGenericMatch[1];
    }
  }

  for (const pattern of tp2Patterns) {
    const match = fullText.match(pattern);
    if (match) {
      result.tp2 = match[1];
      break;
    }
  }

  for (const pattern of tp3Patterns) {
    const match = fullText.match(pattern);
    if (match) {
      result.tp3 = match[1];
      break;
    }
  }

  for (const pattern of tp4Patterns) {
    const match = fullText.match(pattern);
    if (match) {
      result.tp4 = match[1];
      break;
    }
  }

  // Validate that we have minimum required fields
  if (result.entry && result.sl && result.tp1) {
    result.isValid = true;
  } else {
    const missing = [];
    if (!result.entry) missing.push('Entry');
    if (!result.sl) missing.push('SL');
    if (!result.tp1) missing.push('TP1');
    result.error = `Missing: ${missing.join(', ')}`;
  }

  return result;
};
