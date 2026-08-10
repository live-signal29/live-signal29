import { useEffect, useState } from "react";
import { X } from "lucide-react";

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
    }, 4000);

    // First hide
    const firstHide = window.setTimeout(() => {
      setVisible(false);
    }, 10000);

    return () => {
      window.clearTimeout(firstShow);
      window.clearTimeout(firstHide);
    };
  }, [closed]);

  useEffect(() => {
    if (closed) return;

    // Repeat every 14 seconds
    const interval = window.setInterval(() => {
      setVisible(true);

      window.setTimeout(() => {
        setVisible(false);
      }, 6000);
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
            ? "max-h-[86px] translate-y-0 opacity-100"
            : "max-h-0 -translate-y-2 opacity-0"
        }
      `}
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[620px]
          px-2
          py-1.5
          sm:max-w-[700px]
          sm:px-3
        "
      >
        <div
          className="
            relative
            overflow-hidden
            rounded-md
            border
            border-slate-200/70
            bg-white
            shadow-md
            shadow-black/10

            dark:border-slate-700/60
            dark:bg-slate-900
            dark:shadow-black/30
          "
        >
          {/* Clickable Banner */}
          <a
            href={EXNESS_LINK}
            target="_blank"
            rel="noopener noreferrer sponsored"
            aria-label="Exness"
            className="block"
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

                sm:h-[64px]
                md:h-[70px]

                transition-transform
                duration-500
                hover:scale-[1.01]
              "
            />
          </a>

          {/* Close */}
          <button
            type="button"
            aria-label="Close Exness banner"
            onClick={() => {
              setVisible(false);
              setClosed(true);
            }}
            className="
              absolute
              right-1.5
              top-1.5
              z-10
              flex
              h-5
              w-5
              items-center
              justify-center
              rounded-full

              bg-black/55
              text-white

              backdrop-blur-md
              shadow-sm

              transition-all
              duration-200

              hover:scale-110
              hover:bg-black/75

              active:scale-95

              sm:right-2
              sm:top-2
              sm:h-6
              sm:w-6
            "
          >
            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </button>

          {/* Small bottom glow */}
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
              via-emerald-400/70
              to-transparent
            "
          />
        </div>
      </div>
    </div>
  );
};

export default HeadlineTicker;
