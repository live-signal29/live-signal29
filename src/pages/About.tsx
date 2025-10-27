import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { TrendingUp, Target, Award, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">
                <span className="gradient-text">About VIP Gold Signals</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Your trusted partner in trading success
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <Card className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Expert Analysis</h3>
                      <p className="text-muted-foreground">
                        Our team of professional traders provides real-time market analysis 
                        and trading signals with proven accuracy.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-accent/10">
                      <Target className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">High Accuracy</h3>
                      <p className="text-muted-foreground">
                        We maintain a 95%+ success rate across all our trading signals, 
                        consistently delivering profitable opportunities.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-success/10">
                      <Award className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Proven Results</h3>
                      <p className="text-muted-foreground">
                        Track record of successful trades with transparent results 
                        and detailed performance metrics.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-warning/10">
                      <Users className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Community Support</h3>
                      <p className="text-muted-foreground">
                        Join over 10,000 active traders in our community with 24/7 
                        support and educational resources.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Our Mission</h2>
              <p className="text-muted-foreground mb-6">
                At VIP Gold Signals, our mission is to empower traders of all levels with 
                accurate, timely, and profitable trading signals. We believe that everyone 
                deserves access to professional-grade market analysis and trading insights.
              </p>

              <h2 className="text-2xl font-semibold mb-4 text-foreground">What We Offer</h2>
              <ul className="text-muted-foreground space-y-2 mb-6">
                <li>Real-time Gold (XAUUSD) trading signals</li>
                <li>Major Forex currency pair signals</li>
                <li>Global index trading opportunities</li>
                <li>Professional chart analysis and setups</li>
                <li>Entry, take profit, and stop loss levels</li>
                <li>Live market updates and insights</li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 text-foreground">Why Choose Us</h2>
              <p className="text-muted-foreground mb-6">
                We stand out through our commitment to transparency, accuracy, and education. 
                Every signal is carefully analyzed by our expert team, and we provide detailed 
                explanations to help you understand the market dynamics behind each trade.
              </p>

              <p className="text-muted-foreground">
                Join VIP Gold Signals today and start your journey towards consistent trading success!
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
