import { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";

const EXNESS_LINK =
  "https://one.exnessonelink.com/intl/en/a/dy8mlu37tb";

const EXNESS_BANNER =
  "https://d3dpet1g0ty5ed.cloudfront.net/EN_EN_GOOGLE_C1_BB2_C2_T1_EXECUTION_FASTBULLS_T2_PERFORMANCE_D-3-13_STATIC_970x250.jpg";

const HeadlineTicker = () => {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (closed) return;

    // First appearance
    const firstShow = window.setTimeout(() => {
      setVisible(true);
    }, 3500);

    // First hide
    const firstHide = window.setTimeout(() => {
      setVisible(false);
    }, 11500);

    return () => {
      window.clearTimeout(firstShow);
      window.clearTimeout(firstHide);
    };
  }, [closed]);

  useEffect(() => {
    if (closed) return;

    // Repeat automatically
    const interval = window.setInterval(() => {
      setVisible(true);

      window.setTimeout(() => {
        setVisible(false);
      }, 8000);
    }, 14000);

    return () => {
      window.clearInterval(interval);
    };
  }, [closed]);

  if (closed) return null;

  return (
    <div
      className={`
        relative z-30 w-full overflow-hidden
        transition-all duration-700
        ease-[cubic-bezier(0.22,1,0.36,1)]
        ${
          visible
            ? "max-h-[320px] translate-y-0 opacity-100"
            : "max-h-0 -translate-y-3 opacity-0"
        }
      `}
    >
      <div
        className="
          relative mx-auto w-full
          max-w-[970px]
          px-1 py-1.5
          sm:px-2
          md:px-3
        "
      >
        {/* Main Banner */}
        <a
          href={EXNESS_LINK}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label="Visit Exness"
          className="
            group relative block
            w-full overflow-hidden
            rounded-md sm:rounded-lg
            border border-slate-200/70
            bg-white
            shadow-md shadow-black/10
            transition-all duration-300
            hover:shadow-xl hover:shadow-black/15

            dark:border-slate-700/60
            dark:bg-slate-900
            dark:shadow-black/30
          "
        >
          <img
            src={EXNESS_BANNER}
            alt="Exness"
            width={970}
            height={250}
            className="
              block
              h-auto
              w-full
              object-contain
              transition-transform
              duration-700
              group-hover:scale-[1.01]
            "
          />

          {/* Shine Animation */}
          <span
            className="
              pointer-events-none
              absolute inset-y-0
              -left-[80%]
              w-[35%]
              skew-x-[-20deg]
              bg-gradient-to-r
              from-transparent
              via-white/25
              to-transparent
              transition-all
              duration-1000
              group-hover:left-[140%]
            "
          />

          {/* Bottom Label */}
          <div
            className="
              pointer-events-none
              absolute bottom-1.5
              left-2
              flex items-center gap-1
              rounded-full
              border border-white/30
              bg-black/45
              px-2 py-0.5
              text-[8px]
              font-bold
              uppercase
              tracking-wider
              text-white
              backdrop-blur-md
              sm:bottom-2
              sm:left-3
              sm:px-2.5
              sm:text-[9px]
            "
          >
            <ExternalLink className="h-2.5 w-2.5" />
            Visit Exness
          </div>
        </a>

        {/* Close Button */}
        <button
          type="button"
          aria-label="Close Exness banner"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            setVisible(false);
            setClosed(true);
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

            border
            border-white/40
            bg-black/50
            text-white

            shadow-md
            backdrop-blur-md

            transition-all
            duration-200

            hover:scale-110
            hover:bg-black/75

            active:scale-95

            sm:right-4
            sm:top-3
            sm:h-7
            sm:w-7
          "
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  );
};

export default HeadlineTicker;
