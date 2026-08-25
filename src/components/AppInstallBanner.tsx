import { useState, useEffect, useRef } from "react";
import { Download, X, Smartphone, Sparkles, ChevronRight, Store } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const AppInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manuallyDismissed = useRef(false);

  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=co.median.android.krkqyaz";

  useEffect(() => {
    const bannerDismissed = localStorage.getItem("appInstallBannerDismissed");
    if (!bannerDismissed) {
      showBannerWithAutoHide();
    }
  }, []);

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
    
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    
    autoHideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setShowBanner(false);
      }, 300);
    }, 12000);
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

  const handleOpenPlayStore = () => {
    window.open(PLAY_STORE_URL, "_blank");
  };

  if (!showBanner) return null;

  return (
    <>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600",
          "text-white border-b border-white/10 shadow-lg",
          "transition-all duration-500 ease-in-out",
          isVisible 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 -translate-y-full"
        )}
      >
        <div className="container mx-auto px-3 py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Icon + Text */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-sm animate-pulse" />
                <Store className="h-5 w-5 text-white relative z-10" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                    📱 Trend Is Friend
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-semibold uppercase tracking-wider">
                    <Sparkles className="h-2.5 w-2.5" />
                    New
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-white/80 truncate">
                  Get VIP signals on the go
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                onClick={handleOpenPlayStore}
                size="sm"
                className={cn(
                  "bg-white text-indigo-700 hover:bg-white/90",
                  "font-bold text-[10px] sm:text-xs h-7 sm:h-8 px-2.5 sm:px-4",
                  "rounded-full shadow-lg hover:shadow-xl",
                  "transition-all duration-300 hover:scale-105 active:scale-95",
                  "flex items-center gap-1 sm:gap-1.5"
                )}
              >
                <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>Get App</span>
                <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 hidden sm:block" />
              </Button>

              <button
                onClick={handleManualDismiss}
                className={cn(
                  "p-1 rounded-full",
                  "hover:bg-white/10 active:bg-white/20",
                  "transition-all duration-200",
                  "text-white/70 hover:text-white"
                )}
                aria-label="Close banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 w-full bg-white/10">
          <div
            className={cn(
              "h-full bg-white/60",
              isVisible
                ? "animate-[banner-progress_12s_linear_forwards]"
                : "w-0"
            )}
          />
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes banner-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </>
  );
};

export default AppInstallBanner;
