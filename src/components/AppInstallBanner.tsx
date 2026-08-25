import { Download, X, Smartphone } from "lucide-react";
import { Button } from "./ui/button";

const AppInstallBanner = () => {
  const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=co.median.android.krkqyaz";

  const handleDownload = () => {
    window.open(PLAY_STORE_URL, "_blank");
  };

  const handleClose = () => {
    const banner = document.getElementById("app-install-banner");

    if (banner) {
      banner.style.transform = "translateY(-100%)";
      banner.style.opacity = "0";

      setTimeout(() => {
        banner.style.display = "none";
      }, 300);
    }
  };

  return (
    <div
      id="app-install-banner"
      className="
        fixed
        top-0
        left-0
        right-0
        z-[999999]
        w-full
        bg-gradient-to-r
        from-primary
        via-primary
        to-accent
        text-primary-foreground
        border-b
        border-primary/20
        shadow-lg
        backdrop-blur-md
        transition-all
        duration-300
      "
    >
      <div className="w-full px-3 py-2">
        <div className="flex items-center justify-between gap-2">

          {/* App Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Smartphone
              className="h-4 w-4 shrink-0 animate-pulse"
            />

            <span className="font-semibold text-xs truncate">
              Live Signal Buy/Sell
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 shrink-0">

            <Button
              onClick={handleDownload}
              size="sm"
              className="
                bg-white
                text-primary
                hover:bg-white/90
                font-bold
                text-[11px]
                h-7
                px-3
                rounded-full
                shadow
                flex
                items-center
                gap-1
              "
            >
              <Download className="h-3 w-3" />
              Get App
            </Button>

            <button
              onClick={handleClose}
              className="
                p-1
                rounded-full
                hover:bg-black/10
                transition-colors
              "
              aria-label="Close banner"
            >
              <X className="h-4 w-4" />
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AppInstallBanner;
