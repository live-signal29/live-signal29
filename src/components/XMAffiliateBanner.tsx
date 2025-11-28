import { ExternalLink } from "lucide-react";

export const XMAffiliateBanner = () => {
  return (
    <div className="w-full py-4 px-3 sm:px-4 my-6 animate-fade-in animation-delay-200">
      <a 
        href="https://www.xmwebsite.net/referral?token=8dCpm56oL4T6QLUFfmxdSg" 
        target="_blank" 
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="bg-gradient-to-r from-secondary/10 to-accent/10 border border-secondary/20 rounded-lg p-4 sm:p-6 hover:border-secondary/40 transition-all duration-500 hover:shadow-lg hover:shadow-secondary/20 animate-float animation-delay-400">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-lg p-2 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <div className="text-2xl sm:text-3xl font-black text-green-600">XM</div>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                  Trade with XM - Global Trusted Broker
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Multi-regulated, award-winning platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold text-sm sm:text-base group-hover:bg-secondary/90 transition-all duration-300 group-hover:scale-105">
              <span>Open Account</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};
