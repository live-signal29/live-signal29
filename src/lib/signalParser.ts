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

  // Try to extract symbol from first line
  const firstLine = lines[0] || '';
  const cleanFirstLine = firstLine.replace(/^[#@\s]+/, '');
  
  // Try to find symbol in first line
  const words = cleanFirstLine.split(/[\s,@]+/);
  for (const word of words) {
    const lowerWord = word.toLowerCase().replace(/[^a-z0-9\/]/g, '');
    if (symbolMappings[lowerWord]) {
      result.pair = symbolMappings[lowerWord];
      break;
    }
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

  // Extract Entry price from first line after Buy/Sell
  const firstLineMatch = firstLine.match(/(buy|sell)\s+(\d+\.?\d*)/i);
  if (firstLineMatch) {
    result.entry = firstLineMatch[2];
  } else {
    // Try patterns
    const entryPatterns = [
      /entry[:\s]*(\d+\.?\d*)/i,
      /enter[:\s]*(\d+\.?\d*)/i,
      /price[:\s]*(\d+\.?\d*)/i,
      /ep[:\s]*(\d+\.?\d*)/i,
      /@\s*(\d+\.?\d*)/i,
    ];
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
    const pricePattern = /[\d]+\.?\d*/g;
    const pricesInFirstLine = firstLine.match(pricePattern);
    if (pricesInFirstLine && pricesInFirstLine.length > 0) {
      result.entry = pricesInFirstLine[pricesInFirstLine.length - 1];
    }
  }

  // Extract SL
  const slPatterns = [
    /sl[:\s]*(\d+\.?\d*)/i,
    /stop\s*loss[:\s]*(\d+\.?\d*)/i,
    /stoploss[:\s]*(\d+\.?\d*)/i,
  ];
  for (const pattern of slPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      result.sl = match[1];
      break;
    }
  }

  // NEW: Collect ALL TP values - handles both "TP1 4560" and "TP 4560" formats
  const allTPValues: string[] = [];
  
  // First, try to find numbered TPs (TP1, TP2, etc.)
  const numberedTPRegex = /tp\s*([1-4])[:\s]*(\d+\.?\d*)/gi;
  let numberedMatch;
  const numberedTPs: { index: number; value: string }[] = [];
  
  while ((numberedMatch = numberedTPRegex.exec(fullText)) !== null) {
    const tpIndex = parseInt(numberedMatch[1]);
    numberedTPs.push({ index: tpIndex, value: numberedMatch[2] });
  }
  
  // If we found numbered TPs, use them
  if (numberedTPs.length > 0) {
    numberedTPs.sort((a, b) => a.index - b.index);
    numberedTPs.forEach(tp => allTPValues.push(tp.value));
  } else {
    // If no numbered TPs, look for generic "TP" followed by price
    // This handles: "TP 4560", "TP: 4560", "TP  4560"
    const genericTPRegex = /(?:^|\n|\s)tp[:\s]+(\d+\.?\d*)/gi;
    let genericMatch;
    
    while ((genericMatch = genericTPRegex.exec(fullText)) !== null) {
      allTPValues.push(genericMatch[1]);
    }
    
    // Also check for "take profit" variations
    const takeProfitRegex = /take\s*profit[:\s]*(\d+\.?\d*)/gi;
    while ((genericMatch = takeProfitRegex.exec(fullText)) !== null) {
      if (!allTPValues.includes(genericMatch[1])) {
        allTPValues.push(genericMatch[1]);
      }
    }
    
    // Also check for "target" variations
    const targetRegex = /target[:\s]*(\d+\.?\d*)/gi;
    while ((genericMatch = targetRegex.exec(fullText)) !== null) {
      if (!allTPValues.includes(genericMatch[1])) {
        allTPValues.push(genericMatch[1]);
      }
    }
  }

  // Assign TPs in order
  if (allTPValues.length > 0) result.tp1 = allTPValues[0];
  if (allTPValues.length > 1) result.tp2 = allTPValues[1];
  if (allTPValues.length > 2) result.tp3 = allTPValues[2];
  if (allTPValues.length > 3) result.tp4 = allTPValues[3];

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
