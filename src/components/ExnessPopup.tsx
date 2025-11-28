import { useState, useEffect } from "react";
import { X } from "lucide-react";
import exnessLogo from "@/assets/exness-logo.png";

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
    logo: null, // XM logo will use text
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
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-card border border-primary/30 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 p-3 max-w-[240px] relative animate-float">
        <button
          onClick={() => setIsClosed(true)}
          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-md z-10"
          aria-label="Close"
        >
          <X className="w-3 h-3" />
        </button>
        
        <a 
          href={broker.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
              {broker.logo ? (
                <img 
                  src={broker.logo} 
                  alt={broker.name} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-lg font-black text-green-600">{broker.name}</div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground mb-0.5">
                Best Broker: {broker.name}
              </p>
              <p className="text-[10px] text-muted-foreground mb-1.5">
                {broker.description}
              </p>
              <div className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary group-hover:text-primary/80 transition-colors">
                <span>Get Started →</span>
              </div>
            </div>
          </div>
        </a>
        
        {/* Indicator dots */}
        <div className="flex justify-center gap-1 mt-2 pt-2 border-t border-border/50">
          {brokers.map((_, idx) => (
            <div 
              key={idx}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                idx === currentBroker ? 'bg-primary w-3' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
