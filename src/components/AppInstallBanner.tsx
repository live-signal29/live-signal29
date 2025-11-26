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
    <div className="bg-gradient-to-r from-primary/90 to-primary/70 text-white border-b border-primary/30">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-sm">
          <Download className="h-4 w-4" />
          <span className="font-medium">📱 Install TREND IS FRIEND App</span>
          <Button
            onClick={handleDownload}
            size="sm"
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90 font-semibold text-xs h-7 px-3 ml-2"
          >
            Download APK
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors ml-1"
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
