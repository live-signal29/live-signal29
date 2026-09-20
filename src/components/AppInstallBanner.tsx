import { X, Smartphone } from "lucide-react";

const AppInstallBanner = () => {
  const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=co.median.android.odrkwln";

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
      <div className="w-full px-3 py-1.5">
        <div className="flex items-center justify-between gap-2">

          {/* App Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Smartphone
              className="h-3.5 w-3.5 shrink-0 animate-pulse"
            />

            <span className="font-semibold text-[11px] truncate">
              Live Signal Buy/Sell
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">

            <button
              onClick={handleDownload}
              className="
                flex
                items-center
                gap-1.5
                bg-white
                text-slate-900
                hover:bg-white/95
                active:scale-[0.97]
                h-6.5
                pl-1.5
                pr-2.5
                py-1
                rounded-full
                shadow-sm
                ring-1
                ring-black/5
                transition-all
              "
            >
              <PlayStoreBadgeIcon className="h-3 w-3 shrink-0" />
              <span className="font-bold text-[10.5px] leading-none tracking-tight">
                Get App
              </span>
            </button>

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
              <X className="h-3.5 w-3.5" />
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

// Google Play's actual multi-color triangle mark — reads instantly as
// "this opens the Play Store" instead of a generic download arrow.
const PlayStoreBadgeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
    <path
      d="M99.617 8.057a19.777 19.777 0 0 0-13.462 19.075v457.744c0 8.987 5.404 16.436 13.462 19.075l281.303-247.947z"
      fill="#00d0ff"
    />
    <path
      d="M370.719 255.998L99.617 8.057c1.339-.633 2.828-1.048 4.371-1.221 4.048-.454 8.209.412 11.845 2.596l246.16 145.204z"
      fill="#00f076"
    />
    <path
      d="M361.993 357.362l-246.16 145.205c-3.636 2.184-7.797 3.049-11.845 2.596-1.543-.173-3.032-.588-4.371-1.221l271.102-247.943z"
      fill="#ff3a44"
    />
    <path
      d="M493.279 234.629c14.395 8.496 14.395 33.746 0 42.243l-59.083 34.868-71.477-55.741 71.477-55.741z"
      fill="#ffcf00"
    />
  </svg>
);

export default AppInstallBanner;
