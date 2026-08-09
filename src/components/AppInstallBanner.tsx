import { useState, useEffect, useRef } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "./ui/button";

const AppInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manuallyDismissed = useRef(false);

  useEffect(() => {
    const bannerDismissed = localStorage.getItem("appInstallBannerDismissed");
    if (!bannerDismissed) {
      showBannerWithAutoHide();
    }
  }, []);

  // Scroll listener to show banner again after auto-hide
  useEffect(() => {
    const handleScroll = () => {
      const bannerDismissed = localStorage.getItem("appInstallBannerDismissed");
      if (!bannerDismissed && !showBanner && !manuallyDismissed.current) {
        showBannerWithAutoHide();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showBanner]);

  const showBannerWithAutoHide = () => {
    setShowBanner(true);
    setTimeout(() => setIsVisible(true), 100);
    
    // Clear existing timer if any
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    
    // Auto-hide after 10 seconds
    autoHideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setShowBanner(false);
      }, 300);
    }, 10000);
  };

  const handleManualDismiss = () => {
    manuallyDismissed.current = true;
    setIsVisible(false);
    setTimeout(() => {
      setShowBanner(false);
      localStorage.setItem("appInstallBannerDismissed", "true");
    }, 300);
    
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
  };

  const handleDownload = () => {
    window.open("/live-signals_29.apk", "_blank");
  };

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary/95 via-primary to-accent/90 text-primary-foreground border-b border-primary/20 shadow-md backdrop-blur-md transition-all duration-300 ease-in-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
      }`}
    >
      <div className="container mx-auto px-3 py-1.5">
        <div className="flex items-center justify-between sm:justify-center gap-2 text-xs">
          {/* App Title & Icon */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Smartphone className="h-3.5 w-3.5 text-accent-foreground shrink-0 animate-pulse" />
            <span className="font-semibold tracking-wide truncate">
              TREND IS FRIEND App
            </span>
          </div>

          {/* Action Area */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleDownload}
              size="sm"
              variant="secondary"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold text-[11px] h-6 px-2.5 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              <span>Download APK</span>
            </Button>

            <button
              onClick={handleManualDismiss}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/20 rounded-full transition-colors duration-200 text-primary-foreground/80 hover:text-primary-foreground"
              aria-label="Close banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppInstallBanner;
