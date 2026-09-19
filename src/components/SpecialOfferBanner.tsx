import { useQuery } from "@tanstack/react-query";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

/**
 * Which pages a special offer is allowed to appear on.
 * Add new keys here as this banner gets dropped onto more pages,
 * and add a matching checkbox in SpecialOfferManagement.tsx.
 */
export type SpecialOfferPage = "premium" | "account" | "dashboard";

interface SpecialOfferBannerProps {
  /** The current page — used to filter which offers show here. */
  page: SpecialOfferPage;
  /**
   * Optional element id to smooth-scroll to when an offer has button text
   * but no button_link set. Pass this on pages that have something worth
   * scrolling to (e.g. a pricing section); omit it elsewhere.
   */
  scrollTargetId?: string;
  className?: string;
}

/**
 * Shows the active "Special Offer" carousel banner. An offer only shows on
 * a given page if its `show_pages` array is empty/null (meaning "show
 * everywhere", the old default) or explicitly includes this page.
 */
export const SpecialOfferBanner = ({
  page,
  scrollTargetId,
  className,
}: SpecialOfferBannerProps) => {
  const autoplayPlugin = Autoplay({
    delay: 3000,
    stopOnInteraction: true,
  });

  const { data: specialOffers } = useQuery({
    queryKey: ["special-offers-carousel"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_offers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return [];
      }

      return data || [];
    },
  });

  const offersForThisPage = (specialOffers || []).filter((offer: any) => {
    const pages: string[] = offer.show_pages || [];
    return pages.length === 0 || pages.includes(page);
  });

  if (offersForThisPage.length === 0) {
    return null;
  }

  return (
    <div className={className || "mb-8"}>
      <Carousel
        className="w-full max-w-5xl mx-auto"
        plugins={[autoplayPlugin]}
        opts={{ loop: true }}
      >
        <CarouselContent>
          {offersForThisPage.map((offer: any, index: number) => (
            <CarouselItem key={offer.id}>
              <div
                className={`relative min-h-[240px] md:min-h-[300px] rounded-2xl flex items-center justify-center overflow-hidden shadow-xl ${
                  index % 4 === 0
                    ? "bg-gradient-to-br from-green-500 via-teal-500 to-blue-600"
                    : index % 4 === 1
                    ? "bg-gradient-to-br from-purple-500 via-pink-500 to-red-600"
                    : index % 4 === 2
                    ? "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600"
                    : "bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-600"
                }`}
              >
                <div className="absolute inset-0 bg-black/10" />

                <div className="flex flex-col items-center text-center text-white px-6 py-8 md:py-10 relative z-10 gap-3 md:gap-4">
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                    🎁 SPECIAL OFFER
                  </Badge>

                  <h2 className="text-2xl md:text-5xl font-extrabold drop-shadow-lg leading-tight">
                    {offer.title}
                  </h2>

                  {offer.description && (
                    <p className="text-base md:text-xl font-medium text-white/90 max-w-2xl">
                      {offer.description}
                    </p>
                  )}

                  {offer.button_text && (
                    <button
                      onClick={() => {
                        if (offer.button_link) {
                          window.open(
                            offer.button_link,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        } else if (scrollTargetId) {
                          document
                            .getElementById(scrollTargetId)
                            ?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      className="mt-1 inline-flex items-center gap-2 rounded-full bg-white text-gray-900 font-semibold text-sm md:text-base px-6 py-2.5 md:px-7 md:py-3 shadow-lg shadow-black/20 transition-transform duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
                    >
                      {offer.button_text}
                      <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {offersForThisPage.length > 1 && (
          <>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default SpecialOfferBanner;
