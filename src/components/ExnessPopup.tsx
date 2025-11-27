import { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import exnessLogo from "@/assets/exness-logo.png";

export const ExnessPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Show popup after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="bg-card border border-border rounded-lg shadow-2xl p-4 max-w-xs relative animate-in fade-in slide-in-from-bottom-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
            <img src={exnessLogo} alt="Exness" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <p className="text-xs text-yellow-500 font-semibold uppercase tracking-wide">Best Broker</p>
            <h4 className="text-sm font-bold text-foreground">Exness</h4>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Trusted by millions of traders worldwide. Low spreads & fast execution.
        </p>

        <a
          href="https://one.exnessonelink.com/a/vtkbbmje"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-sm py-2 rounded-md transition-colors"
        >
          Open Account
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};
