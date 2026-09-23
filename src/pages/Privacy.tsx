import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto prose prose-invert">
            <h1 className="text-4xl font-bold mb-8 gradient-text">Privacy Policy</h1>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide directly to us, including your name, email address, 
                and any other information you choose to provide when using our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use the information we collect to provide, maintain, and improve our services, to 
                communicate with you, and to send you trading signals and updates.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell, trade, or otherwise transfer your personal information to third parties. 
                We may share information with trusted partners who assist us in operating our website 
                and conducting our business, as long as they agree to keep this information confidential.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate security measures to protect your personal information. However, 
                no method of transmission over the internet or electronic storage is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Cookies</h2>
              <p className="text-muted-foreground">
                We use cookies to enhance your experience on our website. You can choose to disable 
                cookies through your browser settings, but this may affect some features of our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Your Rights</h2>
              <p className="text-muted-foreground">
                You have the right to access, update, or delete your personal information at any time. 
                Contact us if you wish to exercise these rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this privacy policy from time to time. We will notify you of any changes 
                by posting the new policy on this page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us at 
                mybusiness903@gmail.com
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
