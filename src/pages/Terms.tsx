import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto prose prose-invert">
            <h1 className="text-4xl font-bold mb-8 gradient-text">Terms & Conditions</h1>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using VIP Gold Signals, you accept and agree to be bound by the terms 
                and provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Use of Service</h2>
              <p className="text-muted-foreground">
                Our trading signals are provided for informational purposes only. They should not be 
                considered as financial advice. Trading involves risk, and you should only trade with 
                money you can afford to lose.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Risk Disclaimer</h2>
              <p className="text-muted-foreground">
                Trading forex, gold, and indices carries a high level of risk and may not be suitable 
                for all investors. Past performance is not indicative of future results. You should 
                carefully consider your investment objectives, level of experience, and risk appetite.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. No Guarantee</h2>
              <p className="text-muted-foreground">
                While we strive to provide accurate and timely signals, we make no guarantees regarding 
                the accuracy, completeness, or profitability of our signals. Results may vary.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. User Responsibilities</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account information and 
                for all activities that occur under your account. You agree to notify us immediately of 
                any unauthorized use of your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Modifications</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of our service 
                after changes constitutes acceptance of the modified terms.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
