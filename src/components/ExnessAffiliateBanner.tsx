import exnessLogo from "@/assets/exness-logo.png";
import { ExternalLink, Sparkles } from "lucide-react";

export const ExnessAffiliateBanner = () => {
  return (
    <div className="w-full flex justify-center py-3 animate-slide-up">
      <a 
        href="https://one.exnessonelink.com/a/vtkbbmje" 
        target="_blank" 
        rel="noopener noreferrer"
        className="block group w-full max-w-[300px] sm:max-w-[320px]"
      >
        {/* Glowing Card Container */}
        <div className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] border border-white/10 rounded-2xl p-4 shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] group-hover:border-white/20 group-hover:scale-[1.02]">
          
          {/* Top Glow Effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            
            {/* Logo with 3D Rotation Effect */}
            <div className="w-12 h-12 shrink-0 bg-white rounded-xl p-2 flex items-center justify-center shadow-lg group-hover:rotate-[-5deg] group-hover:scale-105 transition-all duration-500">
              <img 
                src={exnessLogo} 
                alt="Exness" 
                className="w-full h-full object-contain"
              />
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="text-[13px] font-bold text-white tracking-tight truncate">
                  Trade with Exness
                </h3>
                <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-blue-200/70 leading-tight truncate">
                Low spreads, fast execution
              </p>
            </div>

            {/* Stylish Button */}
            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-md group-hover:shadow-blue-500/30 transition-all duration-300 group-hover:scale-105">
              <span className="text-[10px] font-semibold text-white">Open</span>
              <ExternalLink className="w-3 h-3 text-white group-hover:translate-x-0.5 transition-transform duration-300" />
            </div>
          </div>

          {/* Animated Bottom Border Line */}
          <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center" />
        </div>
      </a>
    </div>
  );
};
