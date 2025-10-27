import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Target } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 animate-pulse" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="flex justify-center gap-4 mb-6">
            <div className="p-4 rounded-full bg-primary/10 animate-float">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <div className="p-4 rounded-full bg-accent/10 animate-float" style={{animationDelay: "1s"}}>
              <BarChart3 className="h-8 w-8 text-accent" />
            </div>
            <div className="p-4 rounded-full bg-success/10 animate-float" style={{animationDelay: "2s"}}>
              <Target className="h-8 w-8 text-success" />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold">
            <span className="gradient-text">Premium Trading Signals</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Get accurate Gold, Forex, and Index trading signals with live chart analysis. 
            Join thousands of successful traders today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="btn-glow">
              Join VIP Signal Group
            </Button>
            <Button size="lg" variant="outline">
              View Latest Signals
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 rounded-lg bg-card/50 backdrop-blur border border-border/40">
              <h3 className="text-3xl font-bold text-primary mb-2">95%+</h3>
              <p className="text-muted-foreground">Success Rate</p>
            </div>
            <div className="p-6 rounded-lg bg-card/50 backdrop-blur border border-border/40">
              <h3 className="text-3xl font-bold text-accent mb-2">24/7</h3>
              <p className="text-muted-foreground">Live Support</p>
            </div>
            <div className="p-6 rounded-lg bg-card/50 backdrop-blur border border-border/40">
              <h3 className="text-3xl font-bold text-success mb-2">10k+</h3>
              <p className="text-muted-foreground">Active Traders</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
