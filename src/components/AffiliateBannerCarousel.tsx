import exnessLogo from "@/assets/exness-logo-real.png";
import xmLogo from "@/assets/xm-logo-real.png";
import { ExternalLink, ShieldCheck } from "lucide-react";

const XM_URL = "https://www.xmwebsite.net/referral?token=8dCpm56oL4T6QLUFfmxdSg";
const EXNESS_URL = "https://one.exnessonelink.com/a/vtkbbmje";

/** Two recommended brokers shown side by side (XM = gold, Exness = green). */
export const AffiliateBannerCarousel = () => {
  return (
    <div className="w-full my-5 animate-fade-in">
      <p className="text-[11px] font-semibold text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        Recommended Brokers
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {/* XM - gold */}
        <a
          href={XM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border-2 border-warning/60 bg-warning/5 p-3 flex flex-col items-center gap-2 transition-all hover:border-warning hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-xl bg-background p-1.5 shadow-sm flex items-center justify-center">
            <img src={xmLogo} alt="XM broker" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold leading-tight">XM</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Multi-regulated</div>
          </div>
          <span className="w-full inline-flex items-center justify-center gap-1 h-8 rounded-xl bg-warning text-warning-foreground text-xs font-semibold transition-transform group-hover:scale-[1.02]">
            Trade
            <ExternalLink className="h-3 w-3" />
          </span>
        </a>

        {/* Exness - green */}
        <a
          href={EXNESS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border-2 border-success/60 bg-success/5 p-3 flex flex-col items-center gap-2 transition-all hover:border-success hover:shadow-md"
        >
          <div className="w-11 h-11 rounded-xl bg-background p-1.5 shadow-sm flex items-center justify-center">
            <img src={exnessLogo} alt="Exness broker" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold leading-tight">Exness</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Low spreads</div>
          </div>
          <span className="w-full inline-flex items-center justify-center gap-1 h-8 rounded-xl bg-success text-success-foreground text-xs font-semibold transition-transform group-hover:scale-[1.02]">
            IB Link
            <ExternalLink className="h-3 w-3" />
          </span>
        </a>
      </div>
    </div>
  );
};

export default AffiliateBannerCarousel;
