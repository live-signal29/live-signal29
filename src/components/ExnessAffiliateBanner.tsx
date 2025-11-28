import exnessLogo from "@/assets/exness-logo.png";
import { ExternalLink } from "lucide-react";

export const ExnessAffiliateBanner = () => {
  return (
    <div className="w-full py-4 px-3 sm:px-4 my-6">
      <a 
        href="https://one.exnessonelink.com/a/vtkbbmje" 
        target="_blank" 
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4 sm:p-6 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-lg p-2 flex items-center justify-center shadow-md">
                <img 
                  src={exnessLogo} 
                  alt="Exness" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                  Trade with Exness - Our Recommended Broker
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Low spreads, fast execution & trusted worldwide
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm sm:text-base group-hover:bg-primary/90 transition-colors">
              <span>Open Account</span>
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};
