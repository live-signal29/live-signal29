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
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    // Rotate broker every 8 seconds
    const rotateInterval = setInterval(() => {
      setCurrentBroker((prev) => (prev + 1) % brokers.length);
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearInterval(rotateInterval);
    };
  }, []);

  if (isClosed) return null;

  const broker = brokers[currentBroker];

  return (
    <div 
      className={`fixed bottom-24 right-3 z-50 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-card border border-primary/30 rounded-lg shadow-lg transition-all duration-300 p-2 max-w-[170px] relative">
        <button
          onClick={() => setIsClosed(true)}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow z-10"
          aria-label="Close"
        >
          <X className="w-2.5 h-2.5" />
        </button>
        
        <a 
          href={broker.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-background rounded-md p-1 flex items-center justify-center shadow-sm flex-shrink-0">
              <img 
                src={broker.logo} 
                alt={broker.name} 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-foreground leading-tight truncate">
                {broker.name}
              </p>
              <p className="text-[9px] text-muted-foreground leading-tight truncate">
                {broker.description}
              </p>
              <span className="text-[9px] font-semibold text-primary">Get Started →</span>
            </div>
          </div>
        </a>
        
        {/* Indicator dots */}
        <div className="flex justify-center gap-1 mt-1.5 pt-1.5 border-t border-border/50">
          {brokers.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentBroker ? 'bg-primary w-2.5' : 'bg-muted-foreground/30 w-1'
              }`}
            />
          ))}
        </div>
      </div>

    </div>
  );
};
