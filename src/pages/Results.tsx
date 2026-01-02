import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar } from "lucide-react";
import SEO from "@/components/SEO";
import XAUUSDAccuracyStats from "@/components/XAUUSDAccuracyStats";

const Results = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Trading Results - XAUUSD Gold Signal Accuracy"
        description="View XAUUSD Gold commodity trading signal accuracy and performance results"
      />
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Page Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Signal Results</h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">XAUUSD Gold Performance</span>
            </div>
          </div>

          {/* XAUUSD Accuracy Stats - Only working section */}
          <XAUUSDAccuracyStats />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Results;
