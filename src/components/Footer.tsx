import { Link } from "react-router-dom";
import { ShieldCheck, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md mt-16 mb-20 md:mb-6">
      <div className="container mx-auto px-4 py-8 space-y-6">
        
        {/* Top Section: Brand & Links */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          
          {/* Brand Info */}
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="font-extrabold text-base bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                Live Signals
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Institutional grade PAMM and automated copy trading solutions.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Link to="/about" className="hover:text-emerald-500 transition-colors">About Us</Link>
            <Link to="/terms" className="hover:text-emerald-500 transition-colors">Terms & Conditions</Link>
            <Link to="/privacy" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-emerald-500 transition-colors">Contact</Link>
          </div>

        </div>

        {/* Divider */}
        <div className="h-px w-full bg-slate-200/60 dark:bg-slate-800/80" />

        {/* Bottom Section: Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <p>
            Copyright © 2026 Live Signals. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Secure & Encrypted Platform</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
