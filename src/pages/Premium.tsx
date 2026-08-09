import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
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
  const [selectedCategory, setSelectedCategory] = useState("COMMODITY");

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  const [selectedCrypto, setSelectedCrypto] = useState("USDT_TRC20");

  const [transactionId, setTransactionId] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  const [planCarouselApi, setPlanCarouselApi] =
    useState<CarouselApi>();
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);

  // Track carousel slide changes
  useEffect(() => {
    if (!planCarouselApi) return;

    const onSelect = () => {
      setCurrentPlanIndex(planCarouselApi.selectedScrollSnap());
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

  const autoplayPlugin = Autoplay({
    delay: 3000,
    stopOnInteraction: true,
  });

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

  // Fixed wallet addresses
  const cryptoAddresses: Record<string, string> = {
    USDT_TRC20: "TEeeH4G5uKcW41UXkLC7DDq9da8DPr7vH3",
    BTC: "1MFC63PWiPGWG1Z852t7oJ3pX8hGZYtPAU",
    BNB: "0xf499d2ba461aaaad0a2f74c4fcfc16fc4fcaf365",
    ETH: "0xf499d2ba461aaaad0a2f74c4fcfc16fc4fcaf365",
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

  // Fetch active special offers for carousel
  const { data: specialOffers } = useQuery({
    queryKey: ["special-offers-carousel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_offers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", {
          ascending: false,
        });

      if (error) return [];

      return data || [];
    },
  });

  // Fetch first active special offer for countdown
  const { data: activeOffer } = useQuery({
    queryKey: ["active-special-offer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_offers")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) return null;

      return data;
    },
  });

  // Fetch active coupons for banner display
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

      if (error) return [];

      const validCoupons = data.filter((coupon) => {
        if (!coupon.expiry_date) return true;

        return new Date(coupon.expiry_date) > new Date();
      });

      return validCoupons;
    },
  });

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

  const applyCoupon = async () => {
    const upperCode = couponCode.toUpperCase().trim();

    if (!upperCode) {
      toast.error("Please enter a coupon code");
      return;
    }

    setValidatingCoupon(true);

    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", upperCode)
        .eq("is_active", true)
        .single();

      if (error || !coupon) {
        toast.error("Invalid or expired coupon code");
        return;
      }

      if (
        coupon.expiry_date &&
        new Date(coupon.expiry_date) < new Date()
      ) {
        toast.error("This coupon has expired");
        return;
      }

      if (
        coupon.usage_limit &&
        coupon.usage_count >= coupon.usage_limit
      ) {
        toast.error("This coupon has reached its usage limit");
        return;
      }

      setAppliedCoupon(coupon);

      toast.success(
        `Coupon applied! ${
          coupon.discount_type === "percentage"
            ? coupon.discount_value + "%"
            : "$" + coupon.discount_value
        } discount`
      );
    } catch (error: any) {
      toast.error("Failed to validate coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const calculateFinalPrice = (
    basePrice: number,
    planName: string
  ) => {
    if (!appliedCoupon) return basePrice;

    if (
      appliedCoupon.applicable_plans &&
      appliedCoupon.applicable_plans.length > 0
    ) {
      if (
        !appliedCoupon.applicable_plans.includes(planName)
      ) {
        return basePrice;
      }
    }

    if (
      appliedCoupon.discount_type === "percentage"
    ) {
      return (
        basePrice -
        (basePrice *
          appliedCoupon.discount_value) /
          100
      );
    }

    return Math.max(
      0,
      basePrice - appliedCoupon.discount_value
    );
  };

  const handleSelectPlan = async (plan: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login first");
      return;
    }

    const finalPrice = calculateFinalPrice(
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied!");
    } catch {
      toast.error("Failed to copy address");
    }
  };

  // Submit payment for verification
  const handleSubmitPayment = async () => {
    const txId = transactionId.trim();

    if (!txId) {
      toast.error("Please enter your transaction ID");
      return;
    }

    if (txId.length < 6) {
      toast.error("Please enter a valid transaction ID");
      return;
    }

    if (!paymentDetails) {
      toast.error("Payment details are missing");
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

      const { error } = await supabase
        .from("payment_submissions")
        .insert({
          user_id: user.id,
          plan_name: paymentDetails.plan.name,
          category: selectedCategory,
          duration: paymentDetails.plan.duration,
          amount: paymentDetails.finalPrice,
          cryptocurrency: selectedCrypto,
          wallet_address:
            cryptoAddresses[selectedCrypto],
          transaction_id: txId,
          coupon_code:
            appliedCoupon?.code || null,
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
      <SEO
        title="Premium Trading Signals Plans - TREND IS FRIEND"
        description="Choose from flexible monthly, quarterly, half-yearly, and yearly premium plans. Get unlimited trading signals for Forex, Crypto, Commodities, and Indices with up to 50% off annual plans."
        keywords="premium trading signals, subscription plans, forex signals subscription, crypto signals premium, trading signals pricing, annual trading plans"
        url="https://yourdomain.com/premium"
        structuredData={structuredData}
      />

      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">

        {/* Banner Carousel */}
        <div className="mb-8">
          <Carousel
            className="w-full max-w-5xl mx-auto"
            plugins={[autoplayPlugin]}
            opts={{ loop: true }}
          >
            <CarouselContent>

              {/* Happy New Year Banner */}
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center overflow-hidden">

                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>

                  <div className="text-center text-white p-6 relative z-10">
                    <h2 className="text-4xl md:text-6xl font-bold mb-3 drop-shadow-lg animate-pulse">
                      HAPPY NEW YEAR 🎊
                    </h2>

                    <p className="text-xl md:text-3xl font-semibold drop-shadow-md">
                      2026 Special Offer
                    </p>
                  </div>
                </div>
              </CarouselItem>

              {/* Limited Time Offer */}
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500 rounded-xl flex items-center justify-center overflow-hidden">

                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/30"></div>

                  <div className="text-center text-white p-6 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">
                      LIMITED TIME OFFER
                    </h2>

                    <p className="text-5xl md:text-7xl font-bold text-yellow-300 mb-3 drop-shadow-lg animate-bounce">
                      UP TO 50% OFF
                    </p>

                    <p className="text-xl md:text-3xl font-semibold drop-shadow-md">
                      TAKE PREMIUM NOW!
                    </p>
                  </div>
                </div>
              </CarouselItem>

              {/* Dynamic Special Offers */}
              {specialOffers &&
                specialOffers.map((offer, index) => (
                  <CarouselItem key={offer.id}>
                    <div
                      className={`relative h-48 md:h-64 rounded-xl flex items-center justify-center overflow-hidden group ${
                        index % 4 === 0
                          ? "bg-gradient-to-br from-green-500 via-teal-500 to-blue-600"
                          : index % 4 === 1
                          ? "bg-gradient-to-br from-purple-500 via-pink-500 to-red-600"
                          : index % 4 === 2
                          ? "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600"
                          : "bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-600"
                      } shadow-2xl hover:shadow-3xl transition-all duration-300`}
                    >

                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20 animate-pulse"></div>

                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"></div>

                      <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      <div className="absolute top-4 left-4 w-2 h-2 bg-white/40 rounded-full animate-[float_3s_ease-in-out_infinite]"></div>

                      <div className="absolute top-8 right-8 w-3 h-3 bg-white/30 rounded-full animate-[float_4s_ease-in-out_infinite_0.5s]"></div>

                      <div className="absolute bottom-6 left-12 w-2 h-2 bg-white/50 rounded-full animate-[float_5s_ease-in-out_infinite_1s]"></div>

                      <div className="absolute bottom-10 right-16 w-2 h-2 bg-white/40 rounded-full animate-[float_3.5s_ease-in-out_infinite_1.5s]"></div>

                      <div className="absolute top-1/4 left-1/4 text-white/60 animate-[spin_4s_linear_infinite]">
                        ✨
                      </div>

                      <div className="absolute top-1/3 right-1/4 text-white/50 animate-[spin_5s_linear_infinite_reverse]">
                        ⭐
                      </div>

                      <div className="absolute bottom-1/4 left-1/3 text-white/40 animate-[spin_6s_linear_infinite]">
                        💫
                      </div>

                      <div className="text-center text-white p-6 relative z-10 transform group-hover:scale-105 transition-transform duration-300">

                        <div className="mb-4">
                          <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs px-3 py-1 animate-bounce">
                            🎁 SPECIAL OFFER
                          </Badge>
                        </div>

                        <h2 className="text-3xl md:text-6xl font-extrabold mb-3 drop-shadow-2xl animate-fade-in bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent">
                          {offer.title}
                        </h2>

                        {offer.description && (
                          <p className="text-lg md:text-2xl font-semibold drop-shadow-lg animate-fade-in backdrop-blur-sm bg-black/20 rounded-lg px-4 py-2 inline-block">
                            {offer.description}
                          </p>
                        )}

                        <div className="mt-4 flex justify-center gap-2">
                          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-ping animation-delay-200"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-ping animation-delay-400"></div>
                        </div>
                      </div>

                      <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-white/30 rounded-tl-xl"></div>
                      <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-white/30 rounded-tr-xl"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-white/30 rounded-bl-xl"></div>
                      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-white/30 rounded-br-xl"></div>
                    </div>
                  </CarouselItem>
                ))}
            </CarouselContent>

            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>

        {/* Active Coupons Banner */}
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
                  {activeCoupons.map((coupon) => (
                    <CarouselItem key={coupon.id}>
                      <Card className="border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-background to-primary/5 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                            <div className="flex items-center gap-4 flex-1">
                              <div className="bg-primary/20 p-3 rounded-full animate-pulse">
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
                                  <span className="font-bold text-success">
                                    {coupon.discount_type ===
                                    "percentage"
                                      ? `${coupon.discount_value}% OFF`
                                      : `$${coupon.discount_value} OFF`}
                                  </span>
                                </p>

                                {coupon.expiry_date && (
                                  <p className="text-xs text-muted-foreground/70 mt-1">
                                    Valid until{" "}
                                    {new Date(
                                      coupon.expiry_date
                                    ).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>

                            <Button
                              onClick={() => {
                                setCouponCode(coupon.code);
                                applyCoupon();
                              }}
                              className="bg-primary hover:bg-primary/90 font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap"
                            >
                              Apply Now
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {activeCoupons.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            </div>
          )}

        {/* Countdown */}
        {activeOffer && (
          <CountdownTimer
            endDate={new Date(activeOffer.end_date)}
            title={activeOffer.title}
            description={
              activeOffer.description || undefined
            }
          />
        )}

        {/* Coupon Section */}
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
                    disabled={validatingCoupon}
                  />
                </div>

                <Button
                  onClick={applyCoupon}
                  disabled={validatingCoupon}
                  className="sm:mt-8 bg-primary hover:bg-primary/90 font-semibold"
                >
                  {validatingCoupon
                    ? "Validating..."
                    : "Apply Coupon"}
                </Button>
              </div>

              {appliedCoupon && (
                <Alert className="mt-4 border-success bg-success/10">
                  <Check className="h-4 w-4 text-success" />

                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-success font-semibold">
                      ✓ Coupon "{appliedCoupon.code}" applied!
                      {appliedCoupon.discount_type ===
                      "percentage"
                        ? ` ${appliedCoupon.discount_value}% `
                        : ` $${appliedCoupon.discount_value} `}
                      discount
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setAppliedCoupon(null)
                      }
                      className="h-7 text-xs text-success hover:text-success"
                    >
                      Remove
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Selector */}
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
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat}
                      value={cat}
                      className="text-lg"
                    >
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Plans */}
        <div className="max-w-7xl mx-auto">
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

              {plans.map((plan, index) => {
                const originalPrice = plan.payOnly;

                const finalPrice =
                  calculateFinalPrice(
                    originalPrice,
                    plan.name
                  );

                const savings =
                  originalPrice - finalPrice;

                const isPlanApplicable =
                  !appliedCoupon ||
                  !appliedCoupon.applicable_plans ||
                  appliedCoupon.applicable_plans.length === 0 ||
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
                        transition-all duration-500 ease-out
                        hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20
                        animate-fade-in
                        w-full max-w-[340px] sm:max-w-none min-h-[420px]
                        ${
                          plan.popular
                            ? "border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background shadow-xl shadow-primary/10 ring-1 ring-primary/30"
                            : "border-border/40 hover:border-primary/30 bg-gradient-to-br from-background to-muted/20"
                        }
                      `}
                      style={{
                        animationDelay: `${index * 100}ms`,
                      }}
                      onClick={() =>
                        handleSelectPlan(plan)
                      }
                    >

                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                      {plan.popular && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm px-4 py-1 shadow-lg animate-pulse">
                            ⭐ Popular
                          </Badge>
                        </div>
                      )}

                      {plan.discount && (
                        <div className="absolute top-3 right-3 z-10">
                          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg animate-pulse">
                            {plan.discount}
                          </div>
                        </div>
                      )}

                      <CardHeader className="text-center pb-4 pt-6 px-5 relative z-10">

                        <CardTitle className="text-lg font-bold mb-3 group-hover:text-primary transition-colors">
                          {plan.name}
                        </CardTitle>

                        <div className="space-y-2">
                          <div className="relative inline-block">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/50 blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />

                            <p className="relative text-4xl md:text-5xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              ${plan.pricePerMonth}
                            </p>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            /month • {plan.duration}
                          </p>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 px-5 pb-5 relative z-10">

                        <div className="space-y-2.5 p-4 rounded-xl bg-muted/30 border border-border/30">

                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              Original
                            </span>

                            <span className="line-through text-muted-foreground">
                              ${plan.totalPrice}
                            </span>
                          </div>

                          {appliedCoupon &&
                          isPlanApplicable ? (
                            <>
                              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                              <div className="flex justify-between items-center">
                                <span className="font-bold text-base">
                                  Final
                                </span>

                                <span className="text-2xl font-black bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                                  ${finalPrice.toFixed(0)}
                                </span>
                              </div>

                              <div className="bg-emerald-500/10 rounded-lg px-3 py-1.5 border border-emerald-500/20">
                                <p className="text-emerald-500 text-center font-bold text-sm">
                                  💰 Save $
                                  {savings.toFixed(0)}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                              <div className="flex justify-between items-center">
                                <span className="font-bold text-base">
                                  Pay
                                </span>

                                <span className="text-2xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                  ${originalPrice}
                                </span>
                              </div>
                            </>
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
                            .map((feature, idx) => (
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
                            ))}
                        </div>

                        <Button
                          className="
                            w-full h-12 font-bold text-base
                            bg-gradient-to-r from-primary to-primary/80
                            hover:from-primary/90 hover:to-primary/70
                            shadow-md hover:shadow-lg hover:shadow-primary/30
                            transition-all duration-300
                            relative overflow-hidden
                          "
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPlan(plan);
                          }}
                        >
                          <span className="relative z-10">
                            SELECT PLAN
                          </span>

                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </Button>

                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}

            </CarouselContent>

            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>

          {/* Mobile dots */}
          <div className="flex justify-center gap-2 mt-4 sm:hidden">
            {plans.map((_, index) => (
              <button
                key={index}
                onClick={() =>
                  planCarouselApi?.scrollTo(index)
                }
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  currentPlanIndex === index
                    ? "bg-primary scale-125"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to plan ${index + 1}`}
              />
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-2 sm:hidden">
            ← Swipe to see more plans →
          </p>
        </div>

        {/* Affiliate Banner */}
        <div className="max-w-5xl mx-auto">
          <AffiliateBannerCarousel />
        </div>

        {/* =====================================================
            PROFESSIONAL PAYMENT DIALOG
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

            {/* Header */}
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

            {/* PAYMENT FORM */}
            {paymentDetails &&
              !paymentSubmitted && (
                <div className="p-5 space-y-4">

                  {/* Order Summary */}
                  <div className="rounded-xl border bg-muted/30 p-4">

                    <div className="flex items-center justify-between mb-3">

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Selected Plan
                        </p>

                        <p className="font-bold text-base">
                          {paymentDetails.plan.name} Premium
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
                          {paymentDetails.plan.duration}
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
                        {appliedCoupon.code} applied
                      </div>
                    )}
                  </div>

                  {/* STEP 1 */}
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
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* STEP 2 */}
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
                              (o) =>
                                o.value ===
                                selectedCrypto
                            )?.label
                          }
                        </span>{" "}
                        to the address above.
                      </p>
                    </div>
                  </div>

                  {/* STEP 3 */}
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
                      value={transactionId}
                      onChange={(e) =>
                        setTransactionId(
                          e.target.value.trimStart()
                        )
                      }
                      className="h-11 rounded-xl font-mono text-sm"
                      disabled={submittingPayment}
                    />

                    <p className="text-xs text-muted-foreground">
                      After sending the payment, paste
                      the transaction ID here.
                    </p>
                  </div>

                  {/* Security Notice */}
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

                  {/* Submit Button */}
                  <Button
                    type="button"
                    onClick={handleSubmitPayment}
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

            {/* PAYMENT SUBMITTED SUCCESS STATE */}
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
                      {paymentDetails?.plan.name}
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
                    setShowPaymentDialog(false);
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
