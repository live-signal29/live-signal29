import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "./ui/button";

const AppInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const bannerDismissed = localStorage.getItem("appInstallBannerDismissed");
    if (!bannerDismissed) {
      setShowBanner(true);
      // Trigger animation after mount
      setTimeout(() => setIsVisible(true), 100);
      
      // Auto-hide after 10 seconds
      const autoHideTimer = setTimeout(() => {
        handleDismiss();
      }, 10000);

      return () => clearTimeout(autoHideTimer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShowBanner(false);
      localStorage.setItem("appInstallBannerDismissed", "true");
    }, 300);
  };

  const handleDownload = () => {
    window.open("/live-signals_29.apk", "_blank");
    // Don't auto-dismiss on download, let user see it completed
  };

  if (!showBanner) return null;

  return (
    <div className={`bg-gradient-to-r from-primary/90 to-primary/70 text-white border-b border-primary/30 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
    }`}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-sm">
          <Download className="h-4 w-4 animate-bounce" />
          <span className="font-medium">📱 Install TREND IS FRIEND App</span>
          <Button
            onClick={handleDownload}
            size="sm"
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-transform font-semibold text-xs h-7 px-3 ml-2"
          >
            Download APK
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 hover:rotate-90 rounded-full transition-all duration-200 ml-1"
            aria-label="Close banner"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppInstallBanner;
