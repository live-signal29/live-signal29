import { useEffect, useRef, useState } from "react";

interface AdBannerProps {
  className?: string;
}

const AdBanner = ({ className = "" }: AdBannerProps) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useRef(`ad-${Math.random().toString(36).substr(2, 9)}`);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount and window resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !adContainerRef.current) return;

    const container = adContainerRef.current;
    
    // Clear any existing content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Create a unique container for this ad instance
    const adDiv = document.createElement('div');
    adDiv.id = uniqueId.current;
    container.appendChild(adDiv);

    // Responsive ad dimensions
    const adConfig = isMobile 
      ? { width: 300, height: 250 } // Mobile: 300x250 rectangle
      : { width: 468, height: 60 }; // Desktop: 468x60 banner

    // Create and append the ad script with responsive options
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = `
      atOptions = {
        'key': 'a53fa1b8f096290b04c59e353da8fd87',
        'format': 'iframe',
        'height': ${adConfig.height},
        'width': ${adConfig.width},
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
  }, [isMobile]);

  return (
    <div 
      className={`w-full bg-muted/30 rounded-lg border border-border/50 overflow-hidden ${className}`}
      aria-label="Advertisement"
    >
      <div className="text-[10px] text-muted-foreground text-center py-1 border-b border-border/30">
        Advertisement
      </div>
      <div 
        ref={adContainerRef}
        className="flex justify-center items-center p-2"
        style={{
          minHeight: isMobile ? '260px' : '70px',
          width: '100%'
        }}
      />
    </div>
  );
};

export default AdBanner;
