import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, TrendingUp, Bell, Shield, HeadphonesIcon, Award } from "lucide-react";

const Benefits = () => {
  const benefits = [
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Professional Signals",
      description: "Get high-quality trading signals from experienced analysts with proven track records.",
    },
    {
      icon: <Bell className="h-8 w-8 text-primary" />,
      title: "Instant Notifications",
      description: "Receive real-time alerts on your device as soon as new signals are available.",
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Risk Management",
      description: "All signals include proper stop-loss levels to help manage your trading risks.",
    },
    {
      icon: <HeadphonesIcon className="h-8 w-8 text-primary" />,
      title: "24/7 Support",
      description: "Premium members get priority customer support available round the clock.",
    },
    {
      icon: <Award className="h-8 w-8 text-primary" />,
      title: "High Success Rate",
      description: "Our signals maintain a high success rate with transparent performance tracking.",
    },
    {
      icon: <Gift className="h-8 w-8 text-primary" />,
      title: "Special Offers",
      description: "Get exclusive access to special promotions, discounts, and bonus features.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Extra Benefits</h1>
            <p className="text-xl text-muted-foreground">
              Unlock premium features and take your trading to the next level
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mb-4">{benefit.icon}</div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-12 bg-gradient-to-r from-primary/10 to-primary/5 border-primary">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Join thousands of successful traders using TREND IS FRIEND
              </p>
              <a
                href="/premium"
                className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                View Premium Plans
              </a>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Benefits;
