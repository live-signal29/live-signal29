import { useEffect, useRef } from "react";

interface AdBannerProps {
  className?: string;
}

const AdBanner = ({ className = "" }: AdBannerProps) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useRef(`ad-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !adContainerRef.current) return;

    const container = adContainerRef.current;
    
    // Create a unique container for this ad instance
    const adDiv = document.createElement('div');
    adDiv.id = uniqueId.current;
    container.appendChild(adDiv);

    // Create and append the ad script with unique options
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = `
      atOptions = {
        'key': 'a53fa1b8f096290b04c59e353da8fd87',
        'format': 'iframe',
        'height': 50,
        'width': 320,
        'params': {}
      };
    `;
    container.appendChild(script);

    // Add the invoke script
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = '//www.highperformanceformat.com/a53fa1b8f096290b04c59e353da8fd87/invoke.js';
    invokeScript.async = true;
    container.appendChild(invokeScript);

    return () => {
      // Cleanup
      if (container && container.parentNode) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
  }, []);

  return (
    <div 
      ref={adContainerRef}
      className={`flex justify-center items-center min-h-[60px] w-full overflow-hidden ${className}`}
      aria-label="Advertisement"
    />
  );
};

export default AdBanner;
