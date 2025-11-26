import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "./ui/button";

const AppInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const bannerDismissed = localStorage.getItem("appInstallBannerDismissed");
    if (!bannerDismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("appInstallBannerDismissed", "true");
  };

  const handleDownload = () => {
    window.open("/live-signals_29.apk", "_blank");
  };

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-primary/90 to-primary/70 text-white px-4 py-3 relative">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Download className="h-5 w-5 animate-bounce" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Install TREND IS FRIEND App</p>
            <p className="text-xs opacity-90">Get faster access and better experience</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownload}
            size="sm"
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90 font-semibold"
          >
            Download APK
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppInstallBanner;
