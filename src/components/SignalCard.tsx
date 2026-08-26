import React, { useEffect, useState } from "react";

interface SignalProps {
  signal: {
    id: string;
    symbol: string;
    type: "BUY" | "SELL";
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    status: "OPEN" | "ACTIVE" | "CLOSED";
    currentPrice?: number;
  };
  livePrices?: Record<string, number>; // Dynamic real-time broker feeds
}

export const SignalCard: React.FC<SignalProps> = ({ signal, livePrices }) => {
  // Normalize symbol (e.g. XAUUSD vs XAUUSD.m)
  const cleanSymbol = signal.symbol ? signal.symbol.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";

  // Extract live price dynamically from incoming state or websocket map
  const livePrice = 
    livePrices?.[signal.symbol] || 
    livePrices?.[cleanSymbol] || 
    signal.currentPrice || 
    signal.entryPrice;

  const isBuy = signal.type.toUpperCase() === "BUY";
  
  // Calculate Live PnL Pip Difference
  const pipsDifference = isBuy
    ? (livePrice - signal.entryPrice)
    : (signal.entryPrice - livePrice);

  const isProfit = pipsDifference >= 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-white mb-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-wide">{signal.symbol}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded font-semibold ${
              isBuy ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
            }`}
          >
            {signal.type}
          </span>
        </div>
        <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full border border-blue-500/20 font-medium animate-pulse">
          {signal.status}
        </span>
      </div>

      {/* Real-time Price Metric Section */}
      <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mb-3">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Entry Price</p>
          <p className="font-semibold text-sm text-slate-200">{signal.entryPrice.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Current / Real Price</p>
          <p className={`font-bold text-sm ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
            {livePrice ? livePrice.toFixed(2) : "Fetching..."}
          </p>
        </div>
      </div>

      {/* Target & Stop Loss Levels */}
      <div className="flex justify-between text-xs text-slate-400 px-1">
        <span>SL: <strong className="text-rose-400">{signal.stopLoss}</strong></span>
        <span>TP: <strong className="text-emerald-400">{signal.takeProfit}</strong></span>
        <span>P&L: <strong className={isProfit ? "text-emerald-400" : "text-rose-400"}>
          {pipsDifference > 0 ? `+${pipsDifference.toFixed(2)}` : pipsDifference.toFixed(2)}
        </strong></span>
      </div>
    </div>
  );
};

export default SignalCard;
