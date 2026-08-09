import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Target, ArrowUpRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative py-6 sm:py-10 overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Background Subtle Glows for Light/Dark */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-48 bg-amber-500/10 dark:bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="container mx-auto px-3 sm:px-4 relative z-10 max-w-5xl">
        
        {/* ================= TOP FEATURED LIVE TICKER CARD ================= */}
        <div className="w-full p-4 sm:p-5 mb-8 rounded-2xl transition-all duration-300
          /* Light Mode Styling */
          bg-white border border-slate-200/80 shadow-md shadow-slate-200/50 text-slate-900
          /* Dark Mode Styling */
          dark:bg-slate-900/90 dark:border-slate-800 dark:text-white dark:shadow-none
          backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3">
            
            {/* Left: Gold Asset Badge & Details */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-amber-950 bg-gradient-to-br from-amber-300 to-amber-500 shadow-sm shrink-0">
                Au
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg tracking-tight">XAUUSD</h3>
                  <span className="flex items-center gap-1 text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gold / USD</p>
              </div>
            </div>

            {/* Center: Embedded Mini Sparkline Chart */}
            <div className="hidden sm:block w-28 sm:w-36 h-10 shrink-0">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 25 Q 15 10, 30 20 T 60 8 T 85 12 T 100 3 L 100 30 L 0 30 Z"
                  fill="url(#chartGradient)"
                />
                <path
                  d="M 0 25 Q 15 10, 30 20 T 60 8 T 85 12 T 100 3"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Right: Live Price & Growth Indicator */}
            <div className="text-right">
              <div className="text-lg sm:text-2xl font-black tracking-tight font-mono">
                4,399.70
              </div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +0.00%
              </div>
            </div>

          </div>
        </div>
        {/* ================= END TICKER CARD ================= */}

        {/* HERO TITLE & DETAILS */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Precision Trading Terminal
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              Premium Trading Signals
            </span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Get accurate Gold, Forex, and Crypto signals with real-time target updates and automated risk management.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
            <Button size="lg" className="w-full sm:w-auto font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20">
              Join VIP Group
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
              View Signals
            </Button>
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-8 pt-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
              <h3 className="text-2xl sm:text-3xl font-black text-amber-500">95%+</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Win Rate</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
              <h3 className="text-2xl sm:text-3xl font-black text-blue-500">24/7</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Alerts</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-500">10k+</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Traders</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
