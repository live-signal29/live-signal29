import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MT5CopierBanner } from "@/components/MT5CopierBanner";
import { SpecialOfferBanner } from "@/components/SpecialOfferBanner";
import SEO from "@/components/SEO";

import {
  getProductStructuredData,
  getBreadcrumbStructuredData,
} from "@/components/StructuredData";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

import {
  Check,
  Tag,
  Copy,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import Autoplay from "embla-carousel-autoplay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AffiliateBannerCarousel } from "@/components/AffiliateBannerCarousel";

const Premium = () => {
  const [selectedCategory, setSelectedCategory] =
    useState("COMMODITY");

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] =
    useState<any>(null);

  const [validatingCoupon, setValidatingCoupon] =
    useState(false);

  const [showPaymentDialog, setShowPaymentDialog] =
    useState(false);

  const [paymentDetails, setPaymentDetails] =
    useState<any>(null);

  const [selectedCrypto, setSelectedCrypto] =
    useState("USDT_TRC20");

  const [transactionId, setTransactionId] =
    useState("");

  const [submittingPayment, setSubmittingPayment] =
    useState(false);

  const [paymentSubmitted, setPaymentSubmitted] =
    useState(false);

  const [planCarouselApi, setPlanCarouselApi] =
    useState<CarouselApi>();

  const [currentPlanIndex, setCurrentPlanIndex] =
    useState(0);

  /* =====================================================
     JUMP STRAIGHT TO PLANS
     Callers (e.g. the Unlock popup's "Go Premium" button)
     navigate to /premium#plans-section instead of just
     /premium, so people land on the plan cards instead of
     the top of the page. A short delay lets the coupon
     banner / carousel above finish rendering first so the
     scroll offset is correct.
  ====================================================== */

  const location = useLocation();

  useEffect(() => {
    if (location.hash !== "#plans-section") return;

    const timer = setTimeout(() => {
      document
        .getElementById("plans-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);

    return () => clearTimeout(timer);
  }, [location.hash]);

  /* =====================================================
     PLAN CAROUSEL
  ====================================================== */

  useEffect(() => {
    if (!planCarouselApi) return;

    const onSelect = () => {
      setCurrentPlanIndex(
        planCarouselApi.selectedScrollSnap()
      );
    };

    planCarouselApi.on("select", onSelect);
    onSelect();

    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      setTimeout(() => {
        planCarouselApi.scrollTo(1, false);
      }, 100);
    }

    return () => {
      planCarouselApi.off("select", onSelect);
    };
  }, [planCarouselApi]);

  /* =====================================================
     SEO
  ====================================================== */

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      getProductStructuredData(
        "Premium Trading Signals",
        180,
        "USD"
      ),
      getBreadcrumbStructuredData([
        {
          name: "Home",
          url: "https://yourdomain.com",
        },
        {
          name: "Premium Plans",
          url: "https://yourdomain.com/premium",
        },
      ]),
    ],
  };

  /* =====================================================
     CRYPTO PAYMENT
  ====================================================== */

  const cryptoAddresses: Record<string, string> = {
    USDT_TRC20:
      "TEeeH4G5uKcW41UXkLC7DDq9da8DPr7vH3",

    BTC:
      "1MFC63PWiPGWG1Z852t7oJ3pX8hGZYtPAU",

    BNB:
      "0xf499d2ba461aaaad0a2f74c4fcfc16fc4fcaf365",

    ETH:
      "0xf499d2ba461aaaad0a2f74c4fcfc16fc4fcaf365",
  };

  const cryptoOptions = [
    {
      value: "USDT_TRC20",
      label: "USDT (TRC20)",
    },
    {
      value: "BTC",
      label: "Bitcoin (BTC)",
    },
    {
      value: "BNB",
      label: "Binance Coin (BNB)",
    },
    {
      value: "ETH",
      label: "Ethereum (ETH)",
    },
  ];

  const categories = [
    "FOREX",
    "COMMODITY",
    "INDEX",
    "CRYPTO",
  ];

  /* =====================================================
     SPECIAL OFFERS are now rendered via the shared
     <SpecialOfferBanner /> component (see below), which does
     its own fetching so this banner can also be dropped onto
     other pages (Account Management, Signals Dashboard, etc.)
  ====================================================== */

  /* =====================================================
     ACTIVE COUPONS
  ====================================================== */

  const { data: activeCoupons } = useQuery({
    queryKey: ["active-coupons-banner"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("is_active", true)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        return [];
      }

      const validCoupons = (data || []).filter(
        (coupon) => {
          if (!coupon.expiry_date) return true;

          return (
            new Date(coupon.expiry_date) >
            new Date()
          );
        }
      );

      return validCoupons;
    },
  });

  /* =====================================================
     PLANS
  ====================================================== */

  const plans = [
    {
      name: "Monthly",
      duration: "month",
      pricePerMonth: 30,
      totalPrice: 30,
      payOnly: 30,
      discount: null,
      popular: false,
    },
    {
      name: "Quarterly",
      duration: "3 months",
      pricePerMonth: 25,
      totalPrice: 90,
      payOnly: 75,
      discount: "17% Off",
      popular: true,
    },
    {
      name: "Half-Yearly",
      duration: "6 months",
      pricePerMonth: 20,
      totalPrice: 180,
      payOnly: 120,
      discount: "33% Off",
      popular: false,
    },
    {
      name: "Yearly",
      duration: "12 months",
      pricePerMonth: 15,
      totalPrice: 360,
      payOnly: 180,
      discount: "50% Off",
      popular: false,
    },
  ];

  const features = [
    `All ${selectedCategory.toLowerCase()} signals`,
    "Daily 2-5 signals",
    "Instant notifications",
    "Ad-free signals",
    "Customer support",
  ];

  /* =====================================================
     COUPON
  ====================================================== */

  const applyCoupon = async (
    codeOverride?: string
  ) => {
    const upperCode = (
      codeOverride ?? couponCode
    )
      .toUpperCase()
      .trim();

    if (!upperCode) {
      toast.error("Please enter a coupon code");
      return;
    }

    setValidatingCoupon(true);

    try {
      const { data: coupon, error } =
        await supabase
          .from("coupons")
          .select("*")
          .eq("code", upperCode)
          .eq("is_active", true)
          .single();

      if (error || !coupon) {
        setAppliedCoupon(null);

        toast.error(
          "Invalid or expired coupon code"
        );

        return;
      }

      if (
        coupon.expiry_date &&
        new Date(coupon.expiry_date) <
          new Date()
      ) {
        setAppliedCoupon(null);

        toast.error(
          "This coupon has expired"
        );

        return;
      }

      if (
        coupon.usage_limit &&
        coupon.usage_count >=
          coupon.usage_limit
      ) {
        setAppliedCoupon(null);

        toast.error(
          "This coupon has reached its usage limit"
        );

        return;
      }

      setCouponCode(coupon.code);
      setAppliedCoupon(coupon);

      toast.success(
        `Coupon applied! ${
          coupon.discount_type ===
          "percentage"
            ? coupon.discount_value + "%"
            : "$" + coupon.discount_value
        } discount`
      );
    } catch (error) {
      console.error(
        "Coupon validation error:",
        error
      );

      toast.error(
        "Failed to validate coupon"
      );
    } finally {
      setValidatingCoupon(false);
    }
  };

  /* =====================================================
     FINAL PRICE
  ====================================================== */

  const calculateFinalPrice = (
    basePrice: number,
    planName: string
  ) => {
    if (!appliedCoupon) {
      return basePrice;
    }

    if (
      appliedCoupon.applicable_plans &&
      appliedCoupon.applicable_plans.length >
        0
    ) {
      if (
        !appliedCoupon.applicable_plans.includes(
          planName
        )
      ) {
        return basePrice;
      }
    }

    if (
      appliedCoupon.discount_type ===
      "percentage"
    ) {
      return Math.max(
        0,
        basePrice -
          (basePrice *
            Number(
              appliedCoupon.discount_value
            )) /
            100
      );
    }

    return Math.max(
      0,
      basePrice -
        Number(
          appliedCoupon.discount_value
        )
    );
  };

  /* =====================================================
     SELECT PLAN
  ====================================================== */

  const handleSelectPlan = async (
    plan: any
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login first");
      return;
    }

    const finalPrice =
      calculateFinalPrice(
        plan.payOnly,
        plan.name
      );

    setPaymentSubmitted(false);
    setTransactionId("");

    setPaymentDetails({
      plan,
      finalPrice,
      originalPrice: plan.payOnly,
    });

    setShowPaymentDialog(true);
  };

  /* =====================================================
     COPY WALLET
  ====================================================== */

  const copyToClipboard = async (
    text: string
  ) => {
    try {
      await navigator.clipboard.writeText(
        text
      );

      toast.success(
        "Wallet address copied!"
      );
    } catch {
      toast.error(
        "Failed to copy address"
      );
    }
  };

  /* =====================================================
     SUBMIT PAYMENT
  ====================================================== */

  const handleSubmitPayment = async () => {
    const txId =
      transactionId.trim();

    if (!txId) {
      toast.error(
        "Please enter your transaction ID"
      );
      return;
    }

    if (txId.length < 6) {
      toast.error(
        "Please enter a valid transaction ID"
      );
      return;
    }

    if (!paymentDetails) {
      toast.error(
        "Payment details are missing"
      );
      return;
    }

    setSubmittingPayment(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please login first");
        return;
      }

      const { error } =
        await supabase
          .from("payment_submissions")
          .insert({
            user_id: user.id,

            plan_name:
              paymentDetails.plan.name,

            category:
              selectedCategory,

            duration:
              paymentDetails.plan.duration,

            amount:
              paymentDetails.finalPrice,

            cryptocurrency:
              selectedCrypto,

            wallet_address:
              cryptoAddresses[
                selectedCrypto
              ],

            transaction_id: txId,

            coupon_code:
              appliedCoupon?.code ||
              null,

            status: "pending",
          });

      if (error) {
        throw error;
      }

      setPaymentSubmitted(true);

      toast.success(
        "Payment submitted successfully!"
      );
    } catch (error: any) {
      console.error(
        "Payment submission error:",
        error
      );

      toast.error(
        error?.message ||
          "Failed to submit payment. Please try again."
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* =====================================================
          SEO
      ====================================================== */}

      <SEO
        title="Premium Trading Signals Plans - TREND IS FRIEND"
        description="Choose from flexible monthly, quarterly, half-yearly, and yearly premium plans. Get premium trading signals for Forex, Crypto, Commodities, and Indices."
        keywords="premium trading signals, subscription plans, forex signals subscription, crypto signals premium, trading signals pricing"
        url="https://yourdomain.com/premium"
        structuredData={structuredData}
      />

      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">

        <MT5CopierBanner />

        {/* =====================================================
            SPECIAL OFFER
            Shared banner — admin controls per-offer which pages
            (Premium / Account / Dashboard) it appears on.
        ====================================================== */}

        <SpecialOfferBanner page="premium" scrollTargetId="plans-section" />

        {/* =====================================================
            COUPON BANNER
        ====================================================== */}

        {activeCoupons &&
          activeCoupons.length > 0 && (

            <div className="max-w-5xl mx-auto mb-8">

              <Carousel
                className="w-full"
                plugins={[
                  Autoplay({
                    delay: 4000,
                    stopOnInteraction: true,
                  }),
                ]}
                opts={{ loop: true }}
              >

                <CarouselContent>

                  {activeCoupons.map(
                    (coupon) => (

                      <CarouselItem
                        key={coupon.id}
                      >

                        <Card className="border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-background to-primary/5 shadow-lg">

                          <CardContent className="p-6">

                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                              <div className="flex items-center gap-4 flex-1">

                                <div className="bg-primary/20 p-3 rounded-full">
                                  <Tag className="h-6 w-6 text-primary" />
                                </div>

                                <div className="text-left">

                                  <h3 className="text-lg md:text-xl font-bold text-primary mb-1">
                                    🎉 New Discount Available!
                                  </h3>

                                  <p className="text-sm md:text-base text-muted-foreground">

                                    Use code{" "}

                                    <span className="font-mono font-bold text-primary text-lg px-2 py-0.5 bg-primary/10 rounded">
                                      {coupon.code}
                                    </span>{" "}

                                    for{" "}

                                    <span className="font-bold text-emerald-500">

                                      {coupon.discount_type ===
                                      "percentage"
                                        ? `${coupon.discount_value}% OFF`
                                        : `$${coupon.discount_value} OFF`}

                                    </span>

                                  </p>

                                  {coupon.expiry_date && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Valid until{" "}
                                      {new Date(
                                        coupon.expiry_date
                                      ).toLocaleDateString()}
                                    </p>
                                  )}

                                </div>

                              </div>

                              <Button
                                onClick={() =>
                                  applyCoupon(
                                    coupon.code
                                  )
                                }
                                disabled={
                                  validatingCoupon
                                }
                                className="bg-primary hover:bg-primary/90 font-semibold shadow-md whitespace-nowrap"
                              >
                                {validatingCoupon
                                  ? "Applying..."
                                  : "Apply Now"}
                              </Button>

                            </div>

                          </CardContent>

                        </Card>

                      </CarouselItem>
                    )
                  )}

                </CarouselContent>

                {activeCoupons.length >
                  1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}

              </Carousel>

            </div>
          )}

        {/* =====================================================
            COUPON INPUT
        ====================================================== */}

        <div className="max-w-4xl mx-auto mb-8">

          <Card className="border-primary/30 bg-primary/5">

            <CardContent className="pt-6">

              <div className="flex flex-col sm:flex-row gap-3">

                <div className="flex-1 space-y-2">

                  <Label
                    htmlFor="coupon"
                    className="flex items-center gap-2 text-base"
                  >
                    <Tag className="h-5 w-5 text-primary" />

                    Have a coupon code?
                  </Label>

                  <Input
                    id="coupon"
                    placeholder="Enter your coupon code"
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(
                        e.target.value.toUpperCase()
                      )
                    }
                    className="border-primary/30 text-lg"
                    disabled={
                      validatingCoupon
                    }
                  />

                </div>

                <Button
                  onClick={() =>
                    applyCoupon()
                  }
                  disabled={
                    validatingCoupon
                  }
                  className="sm:mt-8 bg-primary hover:bg-primary/90 font-semibold"
                >
                  {validatingCoupon
                    ? "Validating..."
                    : "Apply Coupon"}
                </Button>

              </div>

              {appliedCoupon && (

                <Alert className="mt-4 border-emerald-500 bg-emerald-500/10">

                  <Check className="h-4 w-4 text-emerald-500" />

                  <AlertDescription className="flex items-center justify-between">

                    <span className="text-emerald-500 font-semibold">

                      ✓ Coupon "
                      {appliedCoupon.code}"
                      applied!

                      {appliedCoupon.discount_type ===
                      "percentage"
                        ? ` ${appliedCoupon.discount_value}% `
                        : ` $${appliedCoupon.discount_value} `}

                      discount

                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAppliedCoupon(
                          null
                        );
                        setCouponCode("");
                      }}
                      className="h-7 text-xs text-emerald-500"
                    >
                      Remove
                    </Button>

                  </AlertDescription>

                </Alert>
              )}

            </CardContent>

          </Card>

        </div>

        {/* =====================================================
            CATEGORY
        ====================================================== */}

        <div className="max-w-4xl mx-auto mb-8">

          <Card>

            <CardHeader>

              <CardTitle className="text-xl">
                Choose Your Trading Category
              </CardTitle>

            </CardHeader>

            <CardContent>

              <Select
                value={selectedCategory}
                onValueChange={
                  setSelectedCategory
                }
              >

                <SelectTrigger className="w-full h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>

                  {categories.map(
                    (category) => (

                      <SelectItem
                        key={category}
                        value={category}
                        className="text-lg"
                      >
                        {category}
                      </SelectItem>

                    )
                  )}

                </SelectContent>

              </Select>

            </CardContent>

          </Card>

        </div>

        {/* =====================================================
            PRICING
        ====================================================== */}

        <div id="plans-section" className="max-w-7xl mx-auto">

          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 gradient-text">
            {selectedCategory} Premium Plans
          </h2>

          <Carousel
            className="w-full"
            opts={{
              align: "center",
              loop: true,
            }}
            setApi={setPlanCarouselApi}
          >

            <CarouselContent className="-ml-2 md:-ml-4">

              {plans.map(
                (plan) => {

                  const originalPrice =
                    plan.payOnly;

                  const finalPrice =
                    calculateFinalPrice(
                      originalPrice,
                      plan.name
                    );

                  const savings =
                    originalPrice -
                    finalPrice;

                  const isPlanApplicable =
                    !appliedCoupon ||
                    !appliedCoupon.applicable_plans ||
                    appliedCoupon
                      .applicable_plans
                      .length === 0 ||
                    appliedCoupon.applicable_plans.includes(
                      plan.name
                    );

                  return (

                    <CarouselItem
                      key={plan.name}
                      className="pl-3 md:pl-4 basis-[92%] sm:basis-1/2 lg:basis-1/4 flex justify-center"
                    >

                      <Card
                        className={`
                          relative overflow-hidden group cursor-pointer
                          transition-all duration-500
                          hover:scale-[1.02] hover:shadow-2xl
                          w-full max-w-[340px] sm:max-w-none min-h-[420px]
                          ${
                            plan.popular
                              ? "border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background shadow-xl ring-1 ring-primary/30"
                              : "border-border/40 hover:border-primary/30 bg-gradient-to-br from-background to-muted/20"
                          }
                        `}
                        onClick={() =>
                          handleSelectPlan(
                            plan
                          )
                        }
                      >

                        {plan.popular && (

                          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">

                            <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm px-4 py-1">
                              ⭐ Popular
                            </Badge>

                          </div>
                        )}

                        {plan.discount && (

                          <div className="absolute top-3 right-3 z-10">

                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                              {plan.discount}
                            </div>

                          </div>
                        )}

                        <CardHeader className="text-center pb-4 pt-8 px-5">

                          <CardTitle className="text-lg font-bold mb-3">
                            {plan.name}
                          </CardTitle>

                          <div className="space-y-2">

                            <p className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              ${plan.pricePerMonth}
                            </p>

                            <p className="text-sm text-muted-foreground">
                              /month • {plan.duration}
                            </p>

                          </div>

                        </CardHeader>

                        <CardContent className="space-y-4 px-5 pb-5">

                          <div className="space-y-2.5 p-4 rounded-xl bg-muted/30 border">

                            <div className="flex justify-between items-center text-sm">

                              <span className="text-muted-foreground">
                                Original
                              </span>

                              <span className="line-through text-muted-foreground">
                                ${plan.totalPrice}
                              </span>

                            </div>

                            <div className="h-px bg-border" />

                            {appliedCoupon &&
                            isPlanApplicable ? (

                              <>

                                <div className="flex justify-between items-center">

                                  <span className="font-bold text-base">
                                    Final
                                  </span>

                                  <span className="text-2xl font-black text-emerald-500">
                                    $
                                    {finalPrice.toFixed(
                                      0
                                    )}
                                  </span>

                                </div>

                                <div className="bg-emerald-500/10 rounded-lg px-3 py-1.5 border border-emerald-500/20">

                                  <p className="text-emerald-500 text-center font-bold text-sm">
                                    💰 Save $
                                    {savings.toFixed(
                                      0
                                    )}
                                  </p>

                                </div>

                              </>

                            ) : (

                              <div className="flex justify-between items-center">

                                <span className="font-bold text-base">
                                  Pay
                                </span>

                                <span className="text-2xl font-black text-primary">
                                  $
                                  {
                                    originalPrice
                                  }
                                </span>

                              </div>
                            )}

                            {appliedCoupon &&
                              !isPlanApplicable && (

                                <div className="bg-amber-500/10 rounded-lg px-3 py-1.5 border border-amber-500/20">

                                  <p className="text-amber-500 text-center text-sm flex items-center justify-center gap-1">

                                    <AlertCircle className="h-4 w-4" />

                                    Not applicable

                                  </p>

                                </div>
                              )}

                          </div>

                          <div className="space-y-2">

                            {features
                              .slice(0, 4)
                              .map(
                                (
                                  feature,
                                  idx
                                ) => (

                                  <div
                                    key={idx}
                                    className="flex items-start gap-2.5"
                                  >

                                    <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">

                                      <Check className="h-3 w-3 text-emerald-500" />

                                    </div>

                                    <span className="text-sm text-muted-foreground">
                                      {feature}
                                    </span>

                                  </div>
                                )
                              )}

                          </div>

                          <Button
                            className="w-full h-12 font-bold text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                            onClick={(event) => {
                              event.stopPropagation();

                              handleSelectPlan(
                                plan
                              );
                            }}
                          >
                            SELECT PLAN
                          </Button>

                        </CardContent>

                      </Card>

                    </CarouselItem>
                  );
                }
              )}

            </CarouselContent>

            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />

          </Carousel>

          {/* MOBILE DOTS */}

          <div className="flex justify-center gap-2 mt-4 sm:hidden">

            {plans.map(
              (_, index) => (

                <button
                  key={index}
                  onClick={() =>
                    planCarouselApi?.scrollTo(
                      index
                    )
                  }
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    currentPlanIndex ===
                    index
                      ? "bg-primary scale-125"
                      : "bg-muted-foreground/30"
                  }`}
                  aria-label={`Go to plan ${
                    index + 1
                  }`}
                />

              )
            )}

          </div>

          <p className="text-center text-xs text-muted-foreground mt-2 sm:hidden">
            ← Swipe to see more plans →
          </p>

        </div>

        {/* =====================================================
            AFFILIATE
        ====================================================== */}

        <div className="max-w-5xl mx-auto mt-8">

          <AffiliateBannerCarousel />

        </div>

        {/* =====================================================
            PAYMENT DIALOG
        ====================================================== */}

        <Dialog
          open={showPaymentDialog}
          onOpenChange={(open) => {

            setShowPaymentDialog(open);

            if (!open) {
              setTransactionId("");
              setPaymentSubmitted(false);
              setSubmittingPayment(false);
            }

          }}
        >

          <DialogContent className="max-w-lg w-[calc(100%-24px)] max-h-[92vh] overflow-y-auto rounded-2xl p-0">

            <div className="px-5 pt-5 pb-4 border-b bg-gradient-to-r from-primary/10 via-background to-primary/5">

              <DialogHeader>

                <DialogTitle className="text-xl font-bold flex items-center gap-2">

                  <ShieldCheck className="h-5 w-5 text-primary" />

                  Complete Payment

                </DialogTitle>

              </DialogHeader>

              <p className="text-sm text-muted-foreground mt-1">
                Secure your premium subscription
              </p>

            </div>

            {paymentDetails &&
              !paymentSubmitted && (

                <div className="p-5 space-y-4">

                  <div className="rounded-xl border bg-muted/30 p-4">

                    <div className="flex items-center justify-between mb-3">

                      <div>

                        <p className="text-xs text-muted-foreground">
                          Selected Plan
                        </p>

                        <p className="font-bold text-base">
                          {
                            paymentDetails
                              .plan.name
                          }{" "}
                          Premium
                        </p>

                      </div>

                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {selectedCategory}
                      </Badge>

                    </div>

                    <div className="flex items-end justify-between">

                      <div>

                        <p className="text-xs text-muted-foreground">
                          Duration
                        </p>

                        <p className="font-medium">
                          {
                            paymentDetails
                              .plan.duration
                          }
                        </p>

                      </div>

                      <div className="text-right">

                        {paymentDetails.originalPrice !==
                          paymentDetails.finalPrice && (

                          <p className="text-xs text-muted-foreground line-through">
                            $
                            {paymentDetails.originalPrice.toFixed(
                              2
                            )}
                          </p>
                        )}

                        <p className="text-2xl font-black text-primary">
                          $
                          {paymentDetails.finalPrice.toFixed(
                            2
                          )}
                        </p>

                      </div>

                    </div>

                    {appliedCoupon && (

                      <div className="mt-3 pt-3 border-t text-xs text-emerald-600 font-semibold flex items-center gap-1">

                        <Check className="h-3.5 w-3.5" />

                        Coupon{" "}
                        {appliedCoupon.code}{" "}
                        applied

                      </div>
                    )}

                  </div>

                  <div className="space-y-2">

                    <div className="flex items-center gap-2">

                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        1
                      </div>

                      <Label className="font-semibold">
                        Choose Payment Method
                      </Label>

                    </div>

                    <Select
                      value={selectedCrypto}
                      onValueChange={
                        setSelectedCrypto
                      }
                    >

                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>

                        {cryptoOptions.map(
                          (option) => (

                            <SelectItem
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {option.label}
                            </SelectItem>

                          )
                        )}

                      </SelectContent>

                    </Select>

                  </div>

                  <div className="space-y-2">

                    <div className="flex items-center gap-2">

                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        2
                      </div>

                      <Label className="font-semibold">
                        Send Payment
                      </Label>

                    </div>

                    <div className="rounded-xl border bg-muted/20 p-3">

                      <div className="flex gap-2">

                        <Input
                          value={
                            cryptoAddresses[
                              selectedCrypto
                            ]
                          }
                          readOnly
                          className="font-mono text-xs h-11 bg-background"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0 rounded-xl"
                          onClick={() =>
                            copyToClipboard(
                              cryptoAddresses[
                                selectedCrypto
                              ]
                            )
                          }
                        >

                          <Copy className="h-4 w-4" />

                        </Button>

                      </div>

                      <div className="flex items-center justify-between mt-3">

                        <span className="text-sm text-muted-foreground">
                          Amount to send
                        </span>

                        <span className="text-lg font-bold text-emerald-600">
                          $
                          {paymentDetails.finalPrice.toFixed(
                            2
                          )}
                        </span>

                      </div>

                      <p className="text-xs text-muted-foreground mt-2">

                        Send only{" "}

                        <span className="font-semibold">
                          {
                            cryptoOptions.find(
                              (option) =>
                                option.value ===
                                selectedCrypto
                            )?.label
                          }
                        </span>{" "}

                        to the address above.

                      </p>

                    </div>

                  </div>

                  <div className="space-y-2">

                    <div className="flex items-center gap-2">

                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        3
                      </div>

                      <Label
                        htmlFor="transaction-id"
                        className="font-semibold"
                      >
                        Transaction ID
                      </Label>

                    </div>

                    <Input
                      id="transaction-id"
                      placeholder="Paste your transaction / TxID"
                      value={
                        transactionId
                      }
                      onChange={(event) =>
                        setTransactionId(
                          event.target.value.trimStart()
                        )
                      }
                      className="h-11 rounded-xl font-mono text-sm"
                      disabled={
                        submittingPayment
                      }
                    />

                    <p className="text-xs text-muted-foreground">
                      After sending the payment, paste
                      the transaction ID here.
                    </p>

                  </div>

                  <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/10 p-3">

                    <div className="flex gap-2">

                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />

                      <div className="text-xs text-amber-700 dark:text-amber-400">

                        <p className="font-semibold mb-1">
                          Important
                        </p>

                        <p>
                          Double-check the wallet
                          address before sending.
                          Premium access will be
                          activated after payment
                          verification.
                        </p>

                      </div>

                    </div>

                  </div>

                  <Button
                    type="button"
                    onClick={
                      handleSubmitPayment
                    }
                    disabled={
                      submittingPayment ||
                      !transactionId.trim()
                    }
                    className="w-full h-12 rounded-xl font-bold text-base shadow-lg"
                  >

                    {submittingPayment ? (
                      <>

                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />

                        Submitting Payment...

                      </>
                    ) : (
                      <>

                        <CheckCircle2 className="h-5 w-5 mr-2" />

                        I've Sent Payment — Submit

                      </>
                    )}

                  </Button>

                  <p className="text-center text-[11px] text-muted-foreground">
                    Your payment will be manually
                    verified by our team.
                  </p>

                </div>
              )}

            {paymentSubmitted && (

              <div className="p-6 text-center">

                <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">

                  <CheckCircle2 className="h-9 w-9 text-emerald-500" />

                </div>

                <h3 className="text-xl font-bold mb-2">
                  Payment Submitted
                </h3>

                <p className="text-sm text-muted-foreground max-w-sm mx-auto">

                  Your transaction has been submitted
                  successfully. Our team will verify your
                  payment and activate your premium
                  subscription.

                </p>

                <div className="mt-5 rounded-xl border bg-muted/30 p-4 text-left">

                  <div className="flex justify-between text-sm mb-2">

                    <span className="text-muted-foreground">
                      Plan
                    </span>

                    <span className="font-semibold">
                      {
                        paymentDetails?.plan
                          .name
                      }
                    </span>

                  </div>

                  <div className="flex justify-between text-sm mb-2">

                    <span className="text-muted-foreground">
                      Amount
                    </span>

                    <span className="font-bold text-primary">
                      $
                      {paymentDetails?.finalPrice.toFixed(
                        2
                      )}
                    </span>

                  </div>

                  <div className="flex justify-between text-sm">

                    <span className="text-muted-foreground">
                      Status
                    </span>

                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      Pending Verification
                    </Badge>

                  </div>

                </div>

                <Button
                  className="w-full mt-5 h-11 rounded-xl"
                  onClick={() => {

                    setShowPaymentDialog(
                      false
                    );

                    setTransactionId("");
                    setPaymentSubmitted(false);

                  }}
                >
                  Done
                </Button>

                <p className="text-[11px] text-muted-foreground mt-3">
                  Please keep your transaction ID until
                  verification is complete.
                </p>

              </div>
            )}

          </DialogContent>

        </Dialog>

      </main>

      <Footer />

    </div>
  );
};

export default Premium;
