import { useState, useEffect } from "react";
import { X } from "lucide-react";
import exnessLogo from "@/assets/exness-logo.png";

export const ExnessPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (isClosed) return null;

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-card border border-primary/30 rounded-lg shadow-lg hover:shadow-xl transition-shadow p-4 max-w-[280px] relative">
        <button
          onClick={() => setIsClosed(true)}
          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        
        <a 
          href="https://one.exnessonelink.com/a/vtkbbmje" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-white rounded-lg p-2 flex items-center justify-center shadow-sm flex-shrink-0">
              <img 
                src={exnessLogo} 
                alt="Exness" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-1">
                Best Broker: Exness
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Open Account Today
              </p>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                <span>Get Started →</span>
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};
