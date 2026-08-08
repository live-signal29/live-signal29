import exnessLogo from "@/assets/exness-logo.png";
import { ExternalLink } from "lucide-react";

export const ExnessAffiliateBanner = () => {
  return (
    <div className="w-full flex justify-center py-2">
      <a 
        href="https://one.exnessonelink.com/a/vtkbbmje" 
        target="_blank" 
        rel="noopener noreferrer"
        className="block group w-full max-w-[280px] sm:max-w-[300px]"
      >
        {/* Glowing Card Container - Hover pe scale aur shadow badhegi */}
        <div className="relative bg-[#11131f] border border-white/10 rounded-xl p-3.5 shadow-lg transition-all duration-300 hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] hover:border-white/20 hover:scale-[1.02]">
          
          <div className="flex items-center gap-3">
            
            {/* Logo with Rotation Effect */}
            <div className="w-10 h-10 shrink-0 bg-white rounded-lg p-1.5 flex items-center justify-center shadow-md transition-all duration-300 group-hover:rotate-[-5deg]">
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
                  Exness
                </h3>
                {/* Simple dot pulse, no custom animation needed */}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 leading-tight truncate">
                Trade with the world's best
              </p>
            </div>

            {/* Compact Button */}
            <div className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 rounded-full shadow-md transition-all duration-300 group-hover:bg-blue-500 group-hover:shadow-blue-500/30">
              <span className="text-[10px] font-semibold text-white">Open</span>
              <ExternalLink className="w-3 h-3 text-white transition-transform duration-300 group-hover:translate-x-0.5" />
            </div>
          </div>

        </div>
      </a>
    </div>
  );
};
