import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setRetryCount(0);
    };

    const handleOffline = () => {
      setIsOnline(false);
      startAutoRetry();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const startAutoRetry = () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    
    const retry = async () => {
      try {
        // Try to fetch a small resource to check connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch('/favicon.svg', { 
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setIsOnline(true);
        setIsRetrying(false);
        setRetryCount(0);
      } catch {
        setRetryCount(prev => prev + 1);
        // Exponential backoff: 2s, 4s, 8s, max 30s
        const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
        setTimeout(retry, delay);
      }
    };

    setTimeout(retry, 2000);
  };

  const handleManualRetry = () => {
    setRetryCount(0);
    startAutoRetry();
  };

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-destructive/95 backdrop-blur-sm text-destructive-foreground rounded-lg shadow-lg p-4 flex items-center gap-3">
        <div className="flex-shrink-0">
          <WifiOff className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">You're offline</p>
          <p className="text-xs opacity-80">
            {isRetrying 
              ? `Retrying connection... (${retryCount})` 
              : 'Check your internet connection'}
          </p>
        </div>
        <button
          onClick={handleManualRetry}
          className={cn(
            "flex-shrink-0 p-2 rounded-full hover:bg-white/10 transition-colors",
            isRetrying && "animate-spin"
          )}
          disabled={isRetrying}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
