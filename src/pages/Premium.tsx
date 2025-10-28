import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BrokerAccountButton } from "@/components/BrokerAccountButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Premium = () => {
  const [selectedCategory, setSelectedCategory] = useState("COMMODITY");

  const categories = ["FOREX", "COMMODITY", "INDEX", "CRYPTO"];

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Carousel Section */}
        <div className="mb-8">
          <Carousel className="w-full max-w-4xl mx-auto">
            <CarouselContent>
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                  <div className="text-center text-white p-6">
                    <h2 className="text-3xl md:text-5xl font-bold mb-2">HAPPY DIWALI</h2>
                    <p className="text-xl md:text-2xl">FESTIVAL OF LIGHTS</p>
                  </div>
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <div className="text-center text-white p-6">
                    <h2 className="text-2xl md:text-4xl font-bold mb-2">DIWALI OFFER</h2>
                    <p className="text-4xl md:text-6xl font-bold text-yellow-300 mb-2">65% OFF</p>
                    <p className="text-xl md:text-2xl font-semibold">TAKE PREMIUM NOW</p>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>

        {/* Category Selector */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Plans */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            {selectedCategory} Pricing Plans
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.popular ? 'border-primary border-2' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-primary">${plan.pricePerMonth}</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2 py-4 border-t border-b">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Actual Price:</span>
                      <span className="line-through">${plan.totalPrice}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Pay Only:</span>
                      <span className="text-primary text-lg">${plan.payOnly}</span>
                    </div>
                    {plan.discount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Discount:</span>
                        <Badge variant="secondary">{plan.discount}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{plan.duration} validity</span>
                    </div>
                  </div>

                  <Button className="w-full" size="lg">
                    SELECT
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <BrokerAccountButton />
      <Footer />
    </div>
  );
};

export default Premium;
