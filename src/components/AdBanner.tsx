import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdBannerProps {
  className?: string;
  format?: 'banner' | 'leaderboard' | 'rectangle';
}

const adFormats = {
  banner: { width: 320, height: 50, key: 'a53fa1b8f096290b04c59e353da8fd87' },
  leaderboard: { width: 728, height: 90, key: 'a53fa1b8f096290b04c59e353da8fd87' },
  rectangle: { width: 300, height: 250, key: 'a53fa1b8f096290b04c59e353da8fd87' }
};

const AdBanner = ({ className = "", format = 'banner' }: AdBannerProps) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const isMobile = useIsMobile();

  // Use mobile banner on mobile, desktop format on desktop
  const activeFormat = isMobile ? 'banner' : format;
  const adConfig = adFormats[activeFormat];

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || isInitialized.current) return;

    // Set atOptions globally
    (window as any).atOptions = {
      'key': adConfig.key,
      'format': 'iframe',
      'height': adConfig.height,
      'width': adConfig.width,
      'params': {}
    };

    // Create and append the ad script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `//www.highperformanceformat.com/${adConfig.key}/invoke.js`;
    script.async = true;

    if (adContainerRef.current) {
      adContainerRef.current.appendChild(script);
      isInitialized.current = true;
    }

    return () => {
      // Cleanup if needed
      if (adContainerRef.current && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      isInitialized.current = false;
    };
  }, [adConfig.key, adConfig.height, adConfig.width]);

  return (
    <div 
      ref={adContainerRef}
      className={`flex justify-center items-center w-full ${className}`}
      style={{ minHeight: `${adConfig.height + 10}px` }}
      aria-label="Advertisement"
    />
  );
};

export default AdBanner;
