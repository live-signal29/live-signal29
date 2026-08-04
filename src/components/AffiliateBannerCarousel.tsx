import exnessLogo from "@/assets/exness-logo-real.png";
import xmLogo from "@/assets/xm-logo-real.png";

const XM_URL = "https://www.xmwebsite.net/referral?token=8dCpm56oL4T6QLUFfmxdSg";
const EXNESS_URL = "https://one.exnessonelink.com/a/vtkbbmje";

/** Side-by-side broker cards (XM = gold, Exness = green) — matches reference design. */
export const AffiliateBannerCarousel = () => {
  return (
    <div className="my-3 grid w-full grid-cols-2 gap-2">
      {/* XM */}
      <a
        href={XM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-0.5 rounded-[14px] border border-warning bg-card px-2.5 py-2 text-center shadow-[0_1px_3px_hsl(var(--foreground)/0.05)] transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-background p-0.5">
            <img src={xmLogo} alt="XM broker" className="h-full w-full object-contain" />
          </div>
          <span className="text-xs font-bold leading-none">
            🏆 <span className="text-warning">XM</span>
          </span>
        </div>
        <div className="text-[8px] leading-none text-muted-foreground">
          Min. <strong className="text-success">$5</strong> · Regulated
        </div>
        <span className="mt-0.5 inline-block rounded-full bg-gradient-to-br from-warning to-affiliate px-3 py-[3px] text-[10px] font-extrabold text-warning-foreground">
          ⚡ Trade
        </span>
      </a>

      {/* Exness */}
      <a
        href={EXNESS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-0.5 rounded-[14px] border border-success bg-card px-2.5 py-2 text-center shadow-[0_1px_3px_hsl(var(--foreground)/0.05)] transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-background p-0.5">
            <img src={exnessLogo} alt="Exness broker" className="h-full w-full object-contain" />
          </div>
          <span className="text-xs font-bold leading-none">
            🚀 <span className="text-success">Exness</span>
          </span>
        </div>
        <div className="text-[8px] leading-none text-muted-foreground">
          Min. <strong className="text-success">$10</strong> · IB Link
        </div>
        <span className="mt-0.5 inline-block rounded-full bg-gradient-to-br from-success to-success-deep px-3 py-[3px] text-[10px] font-extrabold text-success-foreground">
          🔗 IB Link
        </span>
      </a>
    </div>
  );
};

export default AffiliateBannerCarousel;
