import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, Send, MessageCircle, Phone } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-2">
                <span className="gradient-text">Contact Us</span>
              </h1>
              <p className="text-muted-foreground">Get in touch with our support team</p>
            </div>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Send us a message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Name</label>
                    <Input placeholder="Your name" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
                    <Input type="email" placeholder="your.email@example.com" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Subject</label>
                    <Input placeholder="How can we help?" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Message</label>
                    <Textarea 
                      placeholder="Tell us more about your inquiry..." 
                      rows={6}
                    />
                  </div>

                  <Button className="w-full btn-glow">
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-8 space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                  <Mail className="h-5 w-5" />
                  <span>mybusiness309@gmail.com</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="https://t.me/gx_support9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                >
                  <MessageCircle className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">Telegram</div>
                    <div className="text-sm text-muted-foreground">@gx_support9</div>
                  </div>
                </a>

                <a
                  href="https://wa.me/923093958600"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                >
                  <Phone className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">WhatsApp</div>
                    <div className="text-sm text-muted-foreground">+92 309 3958600</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
