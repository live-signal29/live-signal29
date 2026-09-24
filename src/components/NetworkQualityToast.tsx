import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const TOAST_ID = 'network-quality';

const getConn = (): any =>
  (navigator as any).connection || (navigator as any).webkitConnection || (navigator as any).mozConnection;

const isSlow = () => {
  const c = getConn();
  if (!c) return false;
  return (
    c.effectiveType === 'slow-2g' ||
    c.effectiveType === '2g' ||
    (typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 0.7) ||
    (typeof c.rtt === 'number' && c.rtt > 1500)
  );
};

const showSlow = (description: string) =>
  toast.warning('Slow network', { id: TOAST_ID, description, duration: 5000 });

// Shows "slow network" / "network normal" toasts. (Offline state is handled by OfflineIndicator.)
export const NetworkQualityToast = () => {
  const slowRef = useRef(false);

  useEffect(() => {
    // 1) The app itself took long to load -> the user was on a slow connection
    const loadSec = performance.now() / 1000;
    if (navigator.onLine && loadSec > 4) {
      showSlow(`App took ${loadSec.toFixed(1)}s to load. Some data may load slowly.`);
    } else if (navigator.onLine && isSlow()) {
      slowRef.current = true;
      showSlow('Loading may take a bit longer.');
    }

    // 2) Connection quality changes while using the app
    const onChange = () => {
      if (!navigator.onLine) return;
      const slow = isSlow();
      if (slow && !slowRef.current) {
        slowRef.current = true;
        showSlow('Loading may take a bit longer.');
      } else if (!slow && slowRef.current) {
        slowRef.current = false;
        toast.success('Network normal', { id: TOAST_ID, description: 'Connection is back to normal.', duration: 2500 });
      }
    };

    const conn = getConn();
    conn?.addEventListener?.('change', onChange);
    window.addEventListener('online', onChange);
    return () => {
      conn?.removeEventListener?.('change', onChange);
      window.removeEventListener('online', onChange);
    };
  }, []);

  return null;
};
