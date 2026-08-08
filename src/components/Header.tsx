import { Bell, Menu } from "lucide-react";

export const HeaderSection = () => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#0a0c16]">
      {/* Left: Logo & Text */}
      <div className="flex items-center gap-2.5">
        {/* Placeholder for your logo image */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold text-lg shadow-lg">
          ↗
        </div>
        <div className="flex flex-col">
          <h1 className="text-[14px] font-extrabold tracking-tight text-white leading-tight">
            TREND IS FRIEND
          </h1>
          <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider leading-tight">
            Professional Trading Signals
          </p>
        </div>
      </div>

      {/* Right: Notification & Menu Buttons */}
      <div className="flex items-center gap-2">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300">
          <Bell className="h-4 w-4 text-white" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
            3
          </span>
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300">
          <Menu className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
};
