import { useEffect, useState } from "react";
import exnessLogo from "@/assets/exness-logo-real.png";
import xmLogo from "@/assets/xm-logo-real.png";
import { ExternalLink } from "lucide-react";

const affiliates = [
  {
    name: "Exness",
    url: "https://one.exnessonelink.com/a/vtkbbmje",
    logo: exnessLogo,
    title: "Trade with Exness - Our Recommended Broker",
    description: "Low spreads, fast execution & trusted worldwide",
    colorClass: "from-primary/10 to-accent/10 border-primary/20 hover:border-primary/40 hover:shadow-primary/20"
  },
  {
    name: "XM",
    url: "https://www.xmwebsite.net/referral?token=8dCpm56oL4T6QLUFfmxdSg",
    logo: xmLogo,
    title: "Trade with XM - Global Trusted Broker",
    description: "Multi-regulated, award-winning platform",
    colorClass: "from-secondary/10 to-accent/10 border-secondary/20 hover:border-secondary/40 hover:shadow-secondary/20"
  }
];

export const AffiliateBannerCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % affiliates.length);
    }, 5000); // Auto-slide every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const currentAffiliate = affiliates[currentIndex];

  return (
    <div className="w-full py-4 px-3 sm:px-4 my-6 animate-fade-in">
      <a 
        href={currentAffiliate.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block group"
      >
        <div className={`bg-gradient-to-r ${currentAffiliate.colorClass} border rounded-lg p-4 sm:p-6 transition-all duration-500 hover:shadow-lg animate-float`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-lg p-2 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <img 
                  src={currentAffiliate.logo} 
                  alt={currentAffiliate.name} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                  {currentAffiliate.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {currentAffiliate.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm sm:text-base group-hover:bg-primary/90 transition-all duration-300 group-hover:scale-105">
              <span>Open Account</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
          
          {/* Indicator dots */}
          <div className="flex justify-center gap-2 mt-4 pt-3 border-t border-border/30">
            {affiliates.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex 
                    ? 'bg-primary w-8' 
                    : 'bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to ${affiliates[idx].name} slide`}
              />
            ))}
          </div>
        </div>
      </a>
    </div>
  );
};
