import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const EXNESS_LINK =
  "https://one.exnessonelink.com/intl/en/a/dy8mlu37tb";

const EXNESS_BANNER =
  "https://d3dpet1g0ty5ed.cloudfront.net/EN_EN_GOOGLE_C1_BB2_C2_T1_EXECUTION_FASTBULLS_T2_PERFORMANCE_D-3-13_STATIC_970x250.jpg";

const Hero = () => {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerClosed, setBannerClosed] = useState(false);

  useEffect(() => {
    if (bannerClosed) return;

    // First appearance after 4 seconds
    const firstShow = window.setTimeout(() => {
      setBannerVisible(true);
    }, 4000);

    // Hide after 8 seconds
    const firstHide = window.setTimeout(() => {
      setBannerVisible(false);
    }, 12000);

    return () => {
      window.clearTimeout(firstShow);
      window.clearTimeout(firstHide);
    };
  }, [bannerClosed]);

  useEffect(() => {
    if (bannerClosed) return;

    // Repeat automatically
    const interval = window.setInterval(() => {
      setBannerVisible(true);

      window.setTimeout(() => {
        setBannerVisible(false);
      }, 8000);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [bannerClosed]);

  return (
    <section className="relative overflow-hidden bg-background py-6 text-foreground transition-colors duration-300 sm:py-10">

      {/* Background Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-full max-w-7xl -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/5" />

      <div className="relative z-10 mx-auto max-w-5xl px-3 sm:px-4">

        {/* ================= EXNESS PROMO ================= */}
        <div
          className={`
            relative mx-auto mb-7 w-full max-w-[650px]
            overflow-hidden
            transition-all duration-700
            ease-[cubic-bezier(0.22,1,0.36,1)]
            ${
              bannerVisible && !bannerClosed
                ? "max-h-[90px] translate-y-0 opacity-100"
                : "max-h-0 -translate-y-4 opacity-0"
            }
          `}
        >
          <div
            className="
              relative overflow-hidden
              rounded-lg
              border
              border-slate-200/70
              bg-white
              p-1
              shadow-md
              shadow-black/10

              dark:border-slate-700/60
              dark:bg-slate-900
              dark:shadow-black/30
            "
          >
            <a
              href={EXNESS_LINK}
              target="_blank"
              rel="noopener noreferrer sponsored"
              aria-label="Visit Exness"
              className="group relative block overflow-hidden rounded-md"
            >
              <img
                src={EXNESS_BANNER}
                alt="Exness"
                width={970}
                height={250}
                className="
                  block
                  h-[58px]
                  w-full
                  object-cover
                  object-center
                  transition-transform
                  duration-500
                  group-hover:scale-[1.01]

                  sm:h-[64px]
                  md:h-[70px]
                "
              />

              {/* Shine */}
              <span
                className="
                  pointer-events-none
                  absolute
                  inset-y-0
                  -left-[60%]
                  w-[30%]
                  skew-x-[-20deg]
                  bg-gradient-to-r
                  from-transparent
                  via-white/25
                  to-transparent
                  transition-all
                  duration-1000
                  group-hover:left-[130%]
                "
              />
            </a>

            {/* Close */}
            <button
              type="button"
              aria-label="Close Exness banner"
              onClick={() => {
                setBannerVisible(false);
                setBannerClosed(true);
              }}
              className="
                absolute
                right-2
                top-2
                z-20
                flex
                h-6
                w-6
                items-center
                justify-center
                rounded-full
                bg-black/55
                text-white
                shadow-md
                backdrop-blur-md
                transition-all
                hover:scale-110
                hover:bg-black/75
                active:scale-95
              "
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Bottom Accent */}
            <div
              className="
                pointer-events-none
                absolute
                bottom-0
                left-0
                right-0
                h-px
                bg-gradient-to-r
                from-transparent
                via-emerald-400
                to-transparent
              "
            />
          </div>
        </div>

        {/* ================= HERO CONTENT ================= */}

        <div className="mx-auto max-w-3xl space-y-6 text-center">

          {/* Badge */}
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <span className="h-2 w-2 animate-ping rounded-full bg-amber-500" />
            Precision Trading Terminal
          </div>

          {/* Title */}
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              Premium Trading Signals
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
            Get accurate Gold, Forex, and Crypto signals with real-time target
            updates and automated risk management.
          </p>

          {/* Buttons */}
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">

            <Button
              size="lg"
              className="
                w-full
                bg-amber-500
                font-bold
                text-slate-950
                shadow-md
                shadow-amber-500/20
                hover:bg-amber-600
                sm:w-auto
              "
            >
              Join VIP Group
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="
                w-full
                border-slate-300
                font-semibold
                hover:bg-slate-100
                dark:border-slate-800
                dark:hover:bg-slate-800
                sm:w-auto
              "
            >
              View Signals
            </Button>

          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-3 pt-4 sm:gap-6">

            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800/60 dark:bg-slate-900/60">
              <h3 className="text-2xl font-black text-amber-500 sm:text-3xl">
                95%+
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
                Win Rate
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800/60 dark:bg-slate-900/60">
              <h3 className="text-2xl font-black text-blue-500 sm:text-3xl">
                24/7
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
                Alerts
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800/60 dark:bg-slate-900/60">
              <h3 className="text-2xl font-black text-emerald-500 sm:text-3xl">
                10k+
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
                Traders
              </p>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
