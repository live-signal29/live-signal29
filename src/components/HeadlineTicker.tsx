export const LiveSignalBanner = () => {
  return (
    <div className="relative mx-4 mt-2 overflow-hidden rounded-[20px] border border-white/5 bg-[#0e101c] p-5 shadow-xl">
      
      {/* Left: Text Content */}
      <div className="relative z-10 flex flex-col gap-2 max-w-[55%]">
        <h2 className="text-[28px] font-black leading-tight tracking-tight">
          <span className="text-white">LIVE </span>
          <span className="text-yellow-500">SIGNALS</span>
        </h2>
        <p className="text-[13px] text-slate-300 leading-snug">
          Real-time trading opportunities across all markets
        </p>
        <div className="mt-1 flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Right: Chart Image (Replace src with your chart image) */}
      <div className="absolute right-0 top-0 h-full w-[55%]">
        <img 
          src="/path-to-your-chart-image.png" 
          alt="Live Chart" 
          className="h-full w-full object-cover object-right opacity-80"
        />
        {/* Dark gradient fade so text is readable over the chart */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e101c] via-[#0e101c]/50 to-transparent" />
      </div>
    </div>
  );
};
