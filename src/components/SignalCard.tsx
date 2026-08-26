import React from "react";

interface SignalCardProps {
  signal: {
    id: string;
    symbol: string;
    type: string;
    entry_price: number;
    current_price?: number;
    stop_loss: number;
    tp1: number;
    tp2?: number;
    tp3?: number;
    status: string;
  };
}

export const SignalCard: React.FC<SignalCardProps> = ({ signal }) => {
  const entryVal = Number(signal.entry_price || 0);
  const currentVal = Number(signal.current_price ?? entryVal);
  const isBuy = String(signal.type).toUpperCase() === "BUY";
  const isProfit = isBuy ? currentVal >= entryVal : currentVal <= entryVal;

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-gray-800 text-base">{signal.symbol}</span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          signal.status === "OPEN" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
        }`}>
          • {signal.status}
        </span>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 mb-3 border border-slate-100">
        <div>
          <p className="text-[10px] text-gray-400 font-semibold uppercase">ENTRY</p>
          <p className="font-bold text-gray-700 text-base">{entryVal.toFixed(2)}</p>
        </div>

        <div>
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">CURRENT</p>
            {signal.status === "OPEN" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            )}
          </div>
          <p className={`font-bold text-base ${isProfit ? "text-emerald-500" : "text-rose-500"}`}>
            {currentVal.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 text-center text-[11px]">
        <div>
          <span className="text-gray-400 block">STOP LOSS</span>
          <span className="font-bold text-rose-500">{signal.stop_loss}</span>
        </div>
        <div>
          <span className="text-gray-400 block">TARGET 1</span>
          <span className="font-bold text-blue-500">{signal.tp1}</span>
        </div>
        <div>
          <span className="text-gray-400 block">TARGET 2</span>
          <span className="font-bold text-blue-500">{signal.tp2 || "-"}</span>
        </div>
        <div>
          <span className="text-gray-400 block">TARGET 3</span>
          <span className="font-bold text-blue-500">{signal.tp3 || "-"}</span>
        </div>
      </div>
    </div>
  );
};

export default SignalCard;
