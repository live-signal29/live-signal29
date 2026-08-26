import React, { useEffect, useState } from "react";

interface SignalProps {
  signal: {
    id: string;
    symbol: string;
    type: string;
    entry: number | string;
    stopLoss: number | string;
    tp1: number | string;
    tp2?: number | string;
    tp3?: number | string;
    status: string;
    current?: number | string;
    time?: string;
  };
}

// Custom Clean Symbol Helper (e.g., "XAUUSD (Gold)" -> "XAUUSD")
const cleanSymbolKey = (str: string) => {
  if (!str) return "";
  return str.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
};

export const SignalCard: React.FC<SignalProps> = ({ signal }) => {
  const [livePrice, setLivePrice] = useState<number>(
    Number(signal.current || signal.entry || 0)
  );
  const [isPriceUp, setIsPriceUp] = useState<boolean | null>(null);

  useEffect(() => {
    const activeSymbol = cleanSymbolKey(signal.symbol);

    // MetaAPI / Custom Price Stream WebSocket Relay URL
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://your-api-domain.com/ws";
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ action: "subscribe", symbol: activeSymbol }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (cleanSymbolKey(data.symbol) === activeSymbol && data.price) {
          const newPrice = Number(data.price);
          setLivePrice((prev) => {
            if (newPrice !== prev) {
              setIsPriceUp(newPrice > prev);
            }
            return newPrice;
          });
        }
      } catch (err) {
        console.error("WS Parse Error:", err);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [signal.symbol]);

  const entryVal = Number(signal.entry || 0);
  const currentVal = livePrice || entryVal;
  const isBuy = String(signal.type).toUpperCase() === "BUY";
  const isProfit = isBuy ? currentVal >= entryVal : currentVal <= entryVal;

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800 text-base">{signal.symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              signal.status === "OPEN"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-500"
            }`}
          >
            • {signal.status}
          </span>
        </div>
      </div>

      {/* Price Grid */}
      <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 mb-3 border border-slate-100">
        <div>
          <p className="text-[10px] text-gray-400 font-semibold uppercase">ENTRY</p>
          <p className="font-bold text-gray-700 text-base">{entryVal.toFixed(2)}</p>
        </div>

        <div>
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">CURRENT</p>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <p
            className={`font-bold text-base transition-colors duration-300 ${
              isPriceUp === true
                ? "text-emerald-500"
                : isPriceUp === false
                ? "text-rose-500"
                : isProfit
                ? "text-emerald-500"
                : "text-rose-500"
            }`}
          >
            {currentVal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Levels */}
      <div className="grid grid-cols-4 text-center text-[11px]">
        <div>
          <span className="text-gray-400 block">SL</span>
          <span className="font-bold text-rose-500">{signal.stopLoss}</span>
        </div>
        <div>
          <span className="text-gray-400 block">TP 1</span>
          <span className="font-bold text-blue-500">{signal.tp1}</span>
        </div>
        <div>
          <span className="text-gray-400 block">TP 2</span>
          <span className="font-bold text-blue-500">{signal.tp2 || "-"}</span>
        </div>
        <div>
          <span className="text-gray-400 block">TP 3</span>
          <span className="font-bold text-blue-500">{signal.tp3 || "-"}</span>
        </div>
      </div>
    </div>
  );
};

export default SignalCard;
