import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-card/50 backdrop-blur mt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Copyright © 2025 VIP Gold Signals
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
