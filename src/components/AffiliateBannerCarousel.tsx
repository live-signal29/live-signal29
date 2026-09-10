import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import exnessLogo from "@/assets/exness-logo-real.png";
import xmLogo from "@/assets/xm-logo-real.png";
import trendoLogo from "@/assets/trendo-logo.jpg";
import { openExternal } from "@/lib/openExternal";

const XM_URL = "https://www.xmwebsite.net/referral?token=8dCpm56oL4T6QLUFfmxdSg";
const EXNESS_URL = "https://one.exnessonelink.com/a/vtkbbmje";
const TRENDO_URL = "https://trendo.com/invite?market=googleplay&code=3317391";

type Broker = {
  name: string;
  url: string;
  /** Either an imported image path... */
  logo?: string;
  /** ...or a short text mark (used for Trendo Market — no logo file uploaded yet). */
  logoText?: string;
  emoji: string;
  minDeposit: string;
  ctaLabel: string;
  ctaEmoji: string;
  colorVar: "warning" | "success" | "primary";
};

const BROKERS: Broker[] = [
  {
    name: "XM",
    url: XM_URL,
    logo: xmLogo,
    emoji: "🏆",
    minDeposit: "$5",
    ctaLabel: "Trade",
    ctaEmoji: "⚡",
    colorVar: "warning",
  },
  {
    name: "Exness",
    url: EXNESS_URL,
    logo: exnessLogo,
    emoji: "🚀",
    minDeposit: "$10",
    ctaLabel: "IB Link",
    ctaEmoji: "🔗",
    colorVar: "success",
  },
  {
    name: "Trendo Market",
    url: TRENDO_URL,
    logo: trendoLogo,
    emoji: "📈",
    minDeposit: "$10",
    ctaLabel: "Join Now",
    ctaEmoji: "🔗",
    colorVar: "primary",
  },
];

const colorClasses: Record<Broker["colorVar"], { border: string; text: string; from: string; to: string; fg: string }> = {
  warning: {
    border: "border-warning",
    text: "text-warning",
    from: "from-warning",
    to: "to-affiliate",
    fg: "text-warning-foreground",
  },
  success: {
    border: "border-success",
    text: "text-success",
    from: "from-success",
    to: "to-success-deep",
    fg: "text-success-foreground",
  },
  primary: {
    border: "border-primary",
    text: "text-primary",
    from: "from-primary",
    to: "to-primary/70",
    fg: "text-primary-foreground",
  },
};

const BrokerCard = ({ broker }: { broker: Broker }) => {
  const c = colorClasses[broker.colorVar];
  return (
    <a
      href={broker.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        openExternal(broker.url);
      }}
      className={`flex flex-col items-center gap-0.5 rounded-[14px] border ${c.border} bg-card px-2.5 py-2 text-center shadow-[0_1px_3px_hsl(var(--foreground)/0.05)] transition-transform active:scale-[0.98]`}
    >
      <div className="flex items-center gap-1.5">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-background p-0.5">
          {broker.logo ? (
            <img src={broker.logo} alt={`${broker.name} broker`} className="h-full w-full object-contain" />
          ) : (
            <span className={`text-[8px] font-extrabold ${c.text}`}>{broker.logoText}</span>
          )}
        </div>
        <span className="text-xs font-bold leading-none">
          {broker.emoji} <span className={c.text}>{broker.name}</span>
        </span>
      </div>
      <div className="text-[8px] leading-none text-muted-foreground">
        Min. <strong className={c.text}>{broker.minDeposit}</strong> · Regulated
      </div>
      <span className={`mt-0.5 inline-block rounded-full bg-gradient-to-br ${c.from} ${c.to} px-3 py-[3px] text-[10px] font-extrabold ${c.fg}`}>
        {broker.ctaEmoji} {broker.ctaLabel}
      </span>
    </a>
  );
};

/**
 * Auto-sliding broker banner (swipeable, one card at a time with dot
 * indicators) — grows to fit any number of brokers without needing a
 * layout change. Add a new entry to BROKERS above to add another one.
 */
export const AffiliateBannerCarousel = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className="my-3 w-full">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
        plugins={[Autoplay({ delay: 3500, stopOnInteraction: true })]}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {BROKERS.map((broker) => (
            <CarouselItem key={broker.name} className="basis-1/2 pl-2">
              <BrokerCard broker={broker} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="mt-1.5 flex justify-center gap-1">
        {BROKERS.map((_, idx) => (
          <div
            key={idx}
            className={`h-[3px] rounded-full transition-all duration-300 ${
              idx === current ? "bg-primary w-3" : "bg-muted-foreground/30 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default AffiliateBannerCarousel;
