import { ExternalLink } from "lucide-react";

export const ExnessBanner = () => {
  return (
    <div className="mb-6 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20 rounded-lg overflow-hidden">
      <a 
        href="https://one.exnessonelink.com/a/vtkbbmje" 
        target="_blank" 
        rel="noopener noreferrer"
        className="block p-4 sm:p-6 hover:bg-yellow-500/5 transition-colors group"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <span className="text-xs sm:text-sm font-semibold text-yellow-500 uppercase tracking-wide">
                Affiliate Partner
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 group-hover:text-yellow-500 transition-colors">
              Trade with Exness - World's Leading Broker
            </h3>
            <p className="text-sm text-muted-foreground">
              Low spreads, instant execution, and 24/7 support. Start trading now!
            </p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-md transition-all group-hover:scale-105">
            <span className="text-sm sm:text-base">Open Account</span>
            <ExternalLink className="h-4 w-4" />
          </div>
        </div>
      </a>
    </div>
  );
};
