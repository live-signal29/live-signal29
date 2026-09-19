import { useQuery } from "@tanstack/react-query";
import Autoplay from "embla-carousel-autoplay";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
                className={`relative h-48 md:h-64 rounded-xl flex items-center justify-center overflow-hidden ${
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

                <div className="text-center text-white p-6 relative z-10">
                  <Badge className="mb-4 bg-white/20 backdrop-blur-sm text-white border-white/30">
                    🎁 SPECIAL OFFER
                  </Badge>

                  <h2 className="text-3xl md:text-6xl font-extrabold mb-3 drop-shadow-lg">
                    {offer.title}
                  </h2>

                  {offer.description && (
                    <p className="text-lg md:text-2xl font-semibold mb-4">
                      {offer.description}
                    </p>
                  )}

                  {offer.button_text && (
                    <Button
                      size="lg"
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
                      className="bg-white text-black hover:bg-white/90 font-bold shadow-lg"
                    >
                      {offer.button_text}
                    </Button>
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
