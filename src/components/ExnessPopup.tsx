import { useState, useEffect } from "react";
import { X } from "lucide-react";
import exnessLogo from "@/assets/exness-logo-real.png";
import xmLogo from "@/assets/xm-logo-real.png";

const brokers = [
  {
    name: "Exness",
    url: "https://one.exnessonelink.com/a/vtkbbmje",
    logo: exnessLogo,
    description: "Open Account Today",
  },
  {
    name: "XM",
    url: "https://www.xmwebsite.net/referral?token=8dCpm56oL4T6QLUFfmxdSg",
    logo: xmLogo,
    description: "Start Trading Now",
  }
];

export const ExnessPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [currentBroker, setCurrentBroker] = useState(0);

  useEffect(() => {
    if (isClosed) return;

    // 1. Phase: Show popup after 3 seconds
    const showTimer = setTimeout(() => {
      setIsVisible(true);

      // 2. Phase: Rotate broker every 6 seconds while visible
      const rotateInterval = setInterval(() => {
        setCurrentBroker((prev) => (prev + 1) % brokers.length);
      }, 6000);

      // 3. Phase: Auto-hide after 8 seconds of being visible
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        
        // 4. Phase: Reset and Show again after 30 seconds of hiding
        const reShowTimer = setTimeout(() => {
          setIsVisible(true);
        }, 30000);

        return () => clearTimeout(reShowTimer);
      }, 8000);

      return () => {
        clearInterval(rotateInterval);
        clearTimeout(hideTimer);
      };
    }, 3000);

    return () => clearTimeout(showTimer);
  }, [isClosed]);

  if (isClosed) return null;

  const broker = brokers[currentBroker];

  return (
    <div 
      className={`fixed bottom-20 right-3 z-50 transition-all duration-700 ease-in-out ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      {/* SMALLER CARD */}
      <div className="bg-card border border-primary/30 rounded-lg shadow-lg transition-all duration-300 p-1.5 pl-2 max-w-[155px] relative">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={() => setIsClosed(true)}
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow z-10"
          aria-label="Close"
        >
          <X className="w-2.5 h-2.5" />
        </button>
        
        {/* LINK */}
        <a 
          href={broker.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="flex items-center gap-1.5">
            {/* SMALLER LOGO */}
            <div className="w-6 h-6 bg-background rounded-md p-1 flex items-center justify-center shadow-sm flex-shrink-0">
              <img 
                src={broker.logo} 
                alt={broker.name} 
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* SMALLER TEXT */}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-foreground leading-tight truncate">
                {broker.name}
              </p>
              <p className="text-[8px] text-muted-foreground leading-tight truncate">
                {broker.description}
              </p>
              <span className="text-[8px] font-semibold text-primary opacity-80 group-hover:opacity-100 transition-opacity">
                Get Started →
              </span>
            </div>
          </div>
        </a>
        
        {/* INDICATOR DOTS (Smaller) */}
        <div className="flex justify-center gap-0.5 mt-1 pt-1 border-t border-border/30">
          {brokers.map((_, idx) => (
            <div 
              key={idx}
              className={`h-[3px] rounded-full transition-all duration-300 ${
                idx === currentBroker ? 'bg-primary w-2' : 'bg-muted-foreground/30 w-1'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
