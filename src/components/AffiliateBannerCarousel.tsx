import exnessLogo from "@/assets/exness-logo-real.png";
import xmLogo from "@/assets/xm-logo-real.png";
import { ExternalLink } from "lucide-react";

const XM_URL = "https://www.xmwebsite.net/referral?token=8dCpm56oL4T6QLUFfmxdSg";
const EXNESS_URL = "https://one.exnessonelink.com/a/vtkbbmje";

/** Compact side-by-side broker cards (XM = gold, Exness = green). */
export const AffiliateBannerCarousel = () => {
  return (
    <div className="w-full my-2.5 grid grid-cols-2 gap-2">
      {/* XM - gold */}
      <a
        href={XM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group rounded-xl border border-warning/60 bg-warning/5 p-2 flex flex-col items-center gap-1 transition-all hover:border-warning"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-background p-0.5 flex items-center justify-center">
            <img src={xmLogo} alt="XM broker" className="w-full h-full object-contain" />
          </div>
          <span className="text-[11px] font-bold leading-none">🏆 XM</span>
        </div>
        <div className="text-[9px] text-muted-foreground leading-none">Min. $5 · Regulated</div>
        <span className="w-full inline-flex items-center justify-center gap-1 h-6 rounded-lg bg-warning text-warning-foreground text-[10px] font-bold">
          ⚡ Trade
          <ExternalLink className="h-2.5 w-2.5" />
        </span>
      </a>

      {/* Exness - green */}
      <a
        href={EXNESS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group rounded-xl border border-success/60 bg-success/5 p-2 flex flex-col items-center gap-1 transition-all hover:border-success"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-background p-0.5 flex items-center justify-center">
            <img src={exnessLogo} alt="Exness broker" className="w-full h-full object-contain" />
          </div>
          <span className="text-[11px] font-bold leading-none">🚀 Exness</span>
        </div>
        <div className="text-[9px] text-muted-foreground leading-none">Min. $10 · IB Link</div>
        <span className="w-full inline-flex items-center justify-center gap-1 h-6 rounded-lg bg-success text-success-foreground text-[10px] font-bold">
          🔗 IB Link
          <ExternalLink className="h-2.5 w-2.5" />
        </span>
      </a>
    </div>
  );
};

export default AffiliateBannerCarousel;
