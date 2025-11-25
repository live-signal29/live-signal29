import { useEffect, useRef } from "react";

interface AdBannerProps {
  className?: string;
}

const AdBanner = ({ className = "" }: AdBannerProps) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || isInitialized.current) return;

    // Set atOptions globally
    (window as any).atOptions = {
      'key': 'a53fa1b8f096290b04c59e353da8fd87',
      'format': 'iframe',
      'height': 50,
      'width': 320,
      'params': {}
    };

    // Create and append the ad script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '//www.highperformanceformat.com/a53fa1b8f096290b04c59e353da8fd87/invoke.js';
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
  }, []);

  return (
    <div 
      ref={adContainerRef}
      className={`flex justify-center items-center min-h-[60px] w-full ${className}`}
      aria-label="Advertisement"
    />
  );
};

export default AdBanner;
